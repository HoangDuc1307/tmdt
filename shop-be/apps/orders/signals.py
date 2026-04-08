from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Order, Notification

@receiver(post_save, sender=Order)
def auto_create_notification(sender, instance, created, **kwargs):
    # Chúng ta chỉ tạo thông báo khi đơn hàng được cập nhật trạng thái (không phải lúc mới tạo)
    if created:
        return

    # Tìm tất cả seller của các sản phẩm trong order
    sellers = set()
    for item in instance.items.select_related('product__seller').all():
        if item.product and item.product.seller:
            sellers.add(item.product.seller)

    # 1. Khi Shipper nhấn "Nhận đơn" (Trạng thái 'shipped')
    if instance.status == 'shipped':
        Notification.objects.create(
            user=instance.user, # Thông báo gửi cho người mua
            content=f"Đơn hàng #{instance.id} của bạn đã được shipper tiếp nhận và đang được giao.",
            order=instance
        )
        for seller in sellers:
            Notification.objects.create(
                user=seller,
                content=f"Đơn hàng #{instance.id} của khách đã được shipper nhận và đang giao.",
                order=instance
            )

    # 2. Khi Shipper nhấn "Xác nhận hoàn thành" (Trạng thái 'delivered')
    elif instance.status == 'delivered':
        Notification.objects.create(
            user=instance.user, # Thông báo gửi cho người mua
            content=f"Đơn hàng #{instance.id} đã được giao thành công!",
            order=instance
        )
        for seller in sellers:
            Notification.objects.create(
                user=seller,
                content=f"Đơn hàng #{instance.id} đã được giao thành công. Vui lòng kiểm tra và xử lý thanh toán.",
                order=instance
            )

    # 3. Khi Người mua xác nhận đã nhận hàng (Trạng thái 'confirmed_received')
    elif instance.status == 'confirmed_received':
        for seller in sellers:
            Notification.objects.create(
                user=seller,
                content=f"Khách hàng đã xác nhận nhận được đơn hàng #{instance.id}. Giao dịch hoàn tất!",
                order=instance
            )
