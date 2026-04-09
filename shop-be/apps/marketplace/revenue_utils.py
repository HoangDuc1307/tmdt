"""
Tổng hợp doanh thu / phí sàn: gộp marketplace.Transaction (admin listing) và Order đã thanh toán (shop).
"""
from __future__ import annotations

from datetime import date, timedelta
from decimal import Decimal
from typing import Any

from django.db.models import Count, Sum
from django.db.models.functions import TruncDate
from django.utils import timezone

from apps.orders.models import Order

from .models import Transaction, PlatformFeeConfig

PAID_ORDER_STATUSES = ('paid', 'shipped', 'delivered')


def _decimal(x: Any) -> Decimal:
    if x is None:
        return Decimal('0')
    if isinstance(x, Decimal):
        return x
    return Decimal(str(x))


def paid_orders_qs():
    return Order.objects.filter(status__in=PAID_ORDER_STATUSES)


def current_order_fee_rate() -> Decimal:
    """
    Tỉ lệ phí sàn hiện tại cho Order, dạng 0.x (vd 10% -> 0.10).
    Nếu chưa có config thì fallback 10%.
    """
    config = PlatformFeeConfig.objects.order_by('id').first()
    percent = _decimal(config.fee_percent) if config else Decimal('10')
    return (percent / Decimal('100')).quantize(Decimal('0.0001'))


def transaction_count_since(since_dt) -> int:
    """Số giao dịch marketplace + đơn đã thanh toán từ mốc since_dt."""
    return (
        Transaction.objects.filter(created_at__gte=since_dt).count()
        + paid_orders_qs().filter(created_at__gte=since_dt).count()
    )


def aggregate_marketplace_tx(
    start_date: date | None = None,
    since_dt=None,
):
    """since_dt: datetime filter created_at__gte (luồng export cũ)."""
    qs = Transaction.objects.all()
    if since_dt is not None:
        qs = qs.filter(created_at__gte=since_dt)
    elif start_date is not None:
        qs = qs.filter(created_at__date__gte=start_date)
    agg = qs.aggregate(
        revenue=Sum('amount'),
        fee=Sum('platform_fee'),
        n=Count('id'),
    )
    return (
        _decimal(agg['revenue']),
        _decimal(agg['fee']),
        int(agg['n'] or 0),
    )


def aggregate_orders(
    start_date: date | None = None,
    since_dt=None,
):
    qs = paid_orders_qs()
    if since_dt is not None:
        qs = qs.filter(created_at__gte=since_dt)
    elif start_date is not None:
        qs = qs.filter(created_at__date__gte=start_date)
    agg = qs.aggregate(revenue=Sum('total_price'), n=Count('id'))
    rev = _decimal(agg['revenue'])
    fee = (rev * current_order_fee_rate()).quantize(Decimal('0.01'))
    return rev, fee, int(agg['n'] or 0)


def combined_totals(start_date: date | None = None, since_dt=None):
    r1, f1, n1 = aggregate_marketplace_tx(start_date=start_date, since_dt=since_dt)
    r2, f2, n2 = aggregate_orders(start_date=start_date, since_dt=since_dt)
    return {
        'total_revenue': r1 + r2,
        'total_platform_fee': f1 + f2,
        'total_transactions': n1 + n2,
    }


def build_tx_day_map(start_date: date, include_orders: bool = True) -> dict[str, dict]:
    """Map ISO date -> {count, revenue, fee} (marketplace Tx + Order)."""
    tx_map: dict[str, dict] = {}
    txs_qs = (
        Transaction.objects.filter(created_at__date__gte=start_date)
        .annotate(d=TruncDate('created_at'))
        .values('d')
        .annotate(c=Count('id'), revenue=Sum('amount'), fee=Sum('platform_fee'))
    )
    for row in txs_qs:
        key = row['d'].isoformat()
        tx_map[key] = {
            'count': int(row['c'] or 0),
            'revenue': float(row['revenue'] or 0),
            'fee': float(row['fee'] or 0),
        }

    if include_orders:
        orders_qs = (
            paid_orders_qs()
            .filter(created_at__date__gte=start_date)
            .annotate(d=TruncDate('created_at'))
            .values('d')
            .annotate(c=Count('id'), revenue=Sum('total_price'))
        )
        rate = float(current_order_fee_rate())
        for row in orders_qs:
            key = row['d'].isoformat()
            rev = float(row['revenue'] or 0)
            fee = rev * rate
            cnt = int(row['c'] or 0)
            if key in tx_map:
                tx_map[key]['count'] += cnt
                tx_map[key]['revenue'] += rev
                tx_map[key]['fee'] += fee
            else:
                tx_map[key] = {'count': cnt, 'revenue': rev, 'fee': fee}
    return tx_map


def fee_statistics_payload(days: int) -> dict:
    today = timezone.localdate()
    start_date = today - timedelta(days=days - 1)

    all_c = combined_totals()
    last_c = combined_totals(start_date=start_date)

    rev_n = last_c['total_revenue']
    fee_n = last_c['total_platform_fee']

    cnt = int(all_c['total_transactions'] or 0)
    fee_total = all_c['total_platform_fee']
    avg_fee = (fee_total / Decimal(cnt)).quantize(Decimal('0.01')) if cnt else Decimal('0')

    def fnum(d: Decimal) -> float:
        return float(d.quantize(Decimal('0.01')))

    return {
        'total_revenue': fnum(all_c['total_revenue']),
        'total_platform_fee': fnum(all_c['total_platform_fee']),
        'total_transactions': cnt,
        'revenue_last_n_days': fnum(rev_n),
        'platform_fee_last_n_days': fnum(fee_n),
        'avg_fee_per_transaction': fnum(avg_fee),
        'days': days,
    }


def top_transactions_mixed(limit: int = 5) -> list[dict]:
    """Top theo platform_fee: gộp Transaction và Order (phí Order = 10% total_price)."""
    rows: list[tuple[Decimal, dict]] = []

    for t in Transaction.objects.select_related('listing', 'buyer', 'seller').order_by('-platform_fee')[:limit * 2]:
        fee = _decimal(t.platform_fee)
        rows.append(
            (
                fee,
                {
                    'id': t.id,
                    'amount': t.amount,
                    'platform_fee': t.platform_fee,
                    'created_at': t.created_at,
                    'listing_title': t.listing.title,
                    'buyer_username': t.buyer.username,
                    'seller_username': t.seller.username,
                },
            )
        )

    rate = current_order_fee_rate()
    for o in paid_orders_qs().select_related('user').order_by('-total_price')[: limit * 2]:
        rev = _decimal(o.total_price)
        fee = (rev * rate).quantize(Decimal('0.01'))
        rows.append(
            (
                fee,
                {
                    'id': o.id,
                    'amount': o.total_price,
                    'platform_fee': fee,
                    'created_at': o.created_at,
                    'listing_title': f'Đơn hàng #{o.id}',
                    'buyer_username': o.user.username,
                    'seller_username': '—',
                },
            )
        )

    rows.sort(key=lambda x: x[0], reverse=True)
    out = []
    for fee, d in rows[:limit]:
        out.append(
            {
                'id': d['id'],
                'amount': float(_decimal(d['amount'])),
                'platform_fee': float(_decimal(d['platform_fee'])),
                'created_at': d['created_at'],
                'listing_title': d['listing_title'],
                'buyer_username': d['buyer_username'],
                'seller_username': d['seller_username'],
            }
        )
    return out
