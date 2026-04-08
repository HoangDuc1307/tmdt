"""
Thống kê phí sàn (Fees) - Theo dõi doanh thu và các khoản phí thu được từ giao dịch.
"""
from datetime import timedelta
from decimal import Decimal, InvalidOperation
import csv
import io
import os
from openpyxl import Workbook
from openpyxl.styles import Font, Alignment

from django.db.models import Sum, Count, F, ExpressionWrapper, DecimalField, Value
from django.http import HttpResponse
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAdminUser
from rest_framework.response import Response

from ..models import Transaction, AdminReportSnapshot, AdminAuditLog, PlatformSetting
PLATFORM_FEE_KEY = 'platform_fee_percent'
DEFAULT_PLATFORM_FEE_PERCENT = Decimal('10')


def get_platform_fee_percent() -> Decimal:
    setting, _ = PlatformSetting.objects.get_or_create(
        key=PLATFORM_FEE_KEY,
        defaults={'value': str(DEFAULT_PLATFORM_FEE_PERCENT)},
    )
    try:
        value = Decimal(str(setting.value))
    except (InvalidOperation, TypeError):
        value = DEFAULT_PLATFORM_FEE_PERCENT
    if value < 0:
        value = Decimal('0')
    return value


def get_platform_fee_expression(percent: Decimal):
    return ExpressionWrapper(
        F('amount') * Value(percent) / Value(Decimal('100')),
        output_field=DecimalField(max_digits=20, decimal_places=2),
    )


@api_view(['GET', 'PUT'])
@permission_classes([IsAdminUser])
def fee_config(request):
    setting, _ = PlatformSetting.objects.get_or_create(
        key=PLATFORM_FEE_KEY,
        defaults={'value': str(DEFAULT_PLATFORM_FEE_PERCENT)},
    )

    if request.method == 'GET':
        return Response({'platform_fee_percent': str(get_platform_fee_percent())})

    raw_percent = request.data.get('platform_fee_percent')
    try:
        percent = Decimal(str(raw_percent))
    except (InvalidOperation, TypeError):
        return Response({'detail': 'Mức phí sàn không hợp lệ.'}, status=400)

    if percent < 0 or percent > 100:
        return Response({'detail': 'Mức phí sàn phải từ 0 đến 100 (%).'}, status=400)

    setting.value = str(percent)
    setting.save(update_fields=['value', 'updated_at'])

    AdminAuditLog.objects.create(
        admin=request.user,
        action='UPDATE_PLATFORM_FEE_PERCENT',
        details=f'Đã đổi mức phí sàn sang {percent}%',
        target_model='PlatformSetting',
        target_id=str(setting.id),
    )
    return Response({'platform_fee_percent': str(percent), 'message': 'Đã cập nhật mức phí sàn.'})


@api_view(['POST'])
@permission_classes([IsAdminUser])
def save_fees_report(request):
    """Lưu lại snapshot báo cáo phí sàn để làm dữ liệu đối soát sau này."""
    stats_data = request.data.get('stats') or {}
    timeseries_data = request.data.get('timeseries') or {}
    
    # Cất vào database
    snapshot = AdminReportSnapshot.objects.create(
        report_type='FEES',
        snapshot_data={'stats': stats_data, 'timeseries': timeseries_data},
        created_by=request.user,
    )

    # Note lại hành động của admin
    AdminAuditLog.objects.create(
        admin=request.user,
        action='SAVE_FEES_REPORT',
        details="Đã lưu snapshot báo cáo phí sàn.",
        target_model="AdminReportSnapshot",
        target_id=str(snapshot.id)
    )

    return Response({'status': 'saved', 'message': 'Đã lưu snapshot báo cáo phí sàn.'})


@api_view(['GET'])
@permission_classes([IsAdminUser])
def fee_statistics(request):
    """Lấy tổng hợp số liệu về doanh thu, phí sàn và số lượng giao dịch."""
    days = int(request.query_params.get('days', 7))
    if days < 1:
        days = 7
    if days > 90:
        days = 90

    today = timezone.localdate()
    start_date = today - timedelta(days=days - 1)

    fee_percent = get_platform_fee_percent()
    fee_expr = get_platform_fee_expression(fee_percent)

    # Tính toán tổng doanh thu và phí từ trước đến nay
    summary = Transaction.objects.aggregate(
        total_revenue=Sum('amount'),
        total_platform_fee=Sum(fee_expr),
        total_transactions=Count('id'),
    )
    # Tính riêng cho khoảng thời gian admin đang xem
    last_n = Transaction.objects.filter(created_at__date__gte=start_date).aggregate(
        rev=Sum('amount'),
        fee=Sum(fee_expr),
    )
    rev_n = float(last_n['rev'] or 0)
    fee_n = float(last_n['fee'] or 0)
    cnt = summary['total_transactions'] or 0
    fee_total = summary['total_platform_fee'] or 0
    avg_fee = float(fee_total / cnt) if cnt else 0

    data = {
        'total_revenue': summary['total_revenue'],
        'total_platform_fee': summary['total_platform_fee'],
        'total_transactions': summary['total_transactions'],
        'revenue_last_n_days': rev_n,
        'platform_fee_last_n_days': fee_n,
        'avg_fee_per_transaction': avg_fee,
        'days': days,
        'platform_fee_percent': str(fee_percent),
    }
    return Response(data)


@api_view(['GET'])
@permission_classes([IsAdminUser])
def fee_top_transactions(request):
    """Show nhanh 5 giao dịch 'khủng' nhất (phí cao nhất)."""
    fee_percent = get_platform_fee_percent()
    fee_expr = get_platform_fee_expression(fee_percent)
    qs = Transaction.objects.select_related('listing', 'buyer').annotate(calc_fee=fee_expr).order_by('-calc_fee')[:5]
    data = [
        {
            'id': t.id,
            'listing_title': t.listing.title,
            'buyer_username': t.buyer.username,
            'amount': float(t.amount),
            'platform_fee': float(t.calc_fee or 0),
            'created_at': t.created_at,
        }
        for t in qs
    ]
    return Response(data)


@api_view(['GET'])
@permission_classes([IsAdminUser])
def export_fees_report_csv(request):
    """
    Xuất file Excel báo cáo phí sàn. Show cả tổng quan, chi tiết theo ngày và top giao dịch.
    """
    days = int(request.query_params.get('days', 7))
    if days < 1:
        days = 7
    if days > 90:
        days = 90

    now = timezone.now()
    since = now - timedelta(days=days)
    today = timezone.localdate()
    start_date = today - timedelta(days=days - 1)

    fee_percent = get_platform_fee_percent()
    fee_expr = get_platform_fee_expression(fee_percent)

    # Gom số liệu tổng quát
    summary = Transaction.objects.aggregate(
        total_revenue=Sum('amount'),
        total_platform_fee=Sum(fee_expr),
        total_transactions=Count('id'),
    )
    last_n = Transaction.objects.filter(created_at__gte=since).aggregate(
        rev=Sum('amount'),
        fee=Sum(fee_expr),
    )
    rev_n = float(last_n['rev'] or 0)
    fee_n = float(last_n['fee'] or 0)
    cnt = summary['total_transactions'] or 0
    fee_total = summary['total_platform_fee'] or 0
    avg_fee = float(fee_total / cnt) if cnt else 0

    # Gom số liệu theo từng ngày
    txs_qs = (
        Transaction.objects.filter(created_at__date__gte=start_date)
        .values('created_at')
        .annotate(revenue=Sum('amount'), fee=Sum(fee_expr))
    )
    labels = [(start_date + timedelta(days=i)).isoformat() for i in range(days)]
    tx_map = {
        row['created_at'].date().isoformat(): {
            'revenue': float(row['revenue'] or 0),
            'fee': float(row['fee'] or 0),
        }
        for row in txs_qs
    }

    # Gom list Top 5
    top_qs = Transaction.objects.select_related('listing', 'buyer').annotate(calc_fee=fee_expr).order_by('-calc_fee')[:5]

    filename = f"fees-report-{today.isoformat()}"
    
    # Khởi tạo file Excel bằng openpyxl
    wb = Workbook()
    ws = wb.active
    ws.title = "Fees Report"

    # Định dạng font cho tiêu đề
    title_font = Font(bold=True, size=14)
    header_font = Font(bold=True)

    # PHẦN 1: Bảng tổng quan (Summary)
    ws.append(['BÁO CÁO PHÍ SÀN'])
    ws['A1'].font = title_font
    ws.append(['Số ngày', days])
    ws.append(['Mức phí sàn hiện tại (%)', float(fee_percent)])
    ws.append([])
    ws.append(['Chỉ số', 'Giá trị'])
    # In đậm hàng header
    for cell in ws[4]:
        cell.font = header_font

    ws.append(['Tổng doanh thu', float(summary['total_revenue'] or 0)])
    ws.append(['Tổng phí sàn', float(summary['total_platform_fee'] or 0)])
    ws.append(['Tổng giao dịch', summary['total_transactions'] or 0])
    ws.append([f'Doanh thu {days} ngày gần nhất', rev_n])
    ws.append([f'Phí sàn {days} ngày gần nhất', fee_n])
    ws.append(['Phí trung bình mỗi giao dịch', avg_fee])

    # PHẦN 2: Dữ liệu chi tiết từng ngày (Timeseries)
    ws.append([])
    ws.append(['DỮ LIỆU THEO NGÀY'])
    ws.cell(row=ws.max_row, column=1).font = title_font
    ws.append(['Ngày', 'Doanh thu', 'Phí sàn'])
    for cell in ws[ws.max_row]:
        cell.font = header_font

    for label in labels:
        tx_data = tx_map.get(label, {})
        ws.append([
            label,
            tx_data.get('revenue', 0),
            tx_data.get('fee', 0),
        ])

    # PHẦN 3: Danh sách 5 giao dịch có phí sàn cao nhất
    ws.append([])
    ws.append(['TOP 5 GIAO DỊCH CÓ PHÍ CAO NHẤT'])
    ws.cell(row=ws.max_row, column=1).font = title_font
    ws.append(['ID', 'Bài đăng', 'Người mua', 'Số tiền', 'Phí sàn', 'Ngày'])
    for cell in ws[ws.max_row]:
        cell.font = header_font

    for row in top_qs:
        ws.append([
            row.id,
            row.listing.title,
            row.buyer.username,
            float(row.amount),
            float(row.calc_fee or 0),
            row.created_at,
        ])

    # Tự động chỉnh độ rộng cột nhìn cho đẹp
    for col in ws.columns:
        max_length = 0
        column = col[0].column_letter
        for cell in col:
            try:
                if len(str(cell.value)) > max_length:
                    max_length = len(str(cell.value))
            except:
                pass
        ws.column_dimensions[column].width = max_length + 2

    response = HttpResponse(
        content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )
    response['Content-Disposition'] = f'attachment; filename="{filename}.xlsx"'
    wb.save(response)
    
    return response
