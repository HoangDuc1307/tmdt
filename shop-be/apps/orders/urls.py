from django.urls import path
from . import views # Cách này giúp gọi views.TenClass ngắn gọn và không bị sót

app_name = 'orders'

urlpatterns = [
    # --- Khách hàng & Admin ---
    path('checkout/', views.CheckoutView.as_view(), name='checkout'),
    path('', views.OrderListView.as_view(), name='order-list'),
    path('<int:pk>/', views.OrderDetailView.as_view(), name='order-detail'),
    path('<int:order_id>/update-info/', views.UpdateOrderInfoView.as_view(), name='update-order-info'),
    path('<int:order_id>/pay/', views.PayOrderView.as_view(), name='pay-order'),
    path('<int:order_id>/vnpay/', views.VNPayPaymentView.as_view(), name='vnpay-payment'),
    path('admin/orders/', views.AllOrdersAdminView.as_view(), name='all-orders-admin'),
    path('admin/orders/<int:pk>/', views.AdminOrderDetailView.as_view(), name='admin-order-detail'),

    # --- ĐƯỜNG DẪN MỚI CHO SHIPPER ---
    # 1. Lấy danh sách đơn hàng đang chờ (status='paid')
    path('shipper/available/', views.ShipperOrderListView.as_view(), name='shipper-available-orders'),
    
    # 2. Shipper bấm nhận đơn
    path('shipper/accept/<int:order_id>/', views.ShipperAcceptOrderView.as_view(), name='shipper-accept-order'),
    
    # 3. Shipper hoàn thành giao hàng
    path('shipper/complete/<int:order_id>/', views.ShipperCompleteOrderView.as_view(), name='shipper-complete-order'),
]