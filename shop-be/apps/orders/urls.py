from django.urls import path
from .views import (
    CheckoutView, PayOrderView, OrderListView, OrderDetailView,
    UpdateOrderInfoView, AllOrdersAdminView, AdminOrderDetailView,
    VNPayPaymentView, VNPayReturnView,
    SellerOrderListView, SellerOrderDetailView, SellerOrderStatusView,
)

app_name = 'orders'

urlpatterns = [
    path('checkout/', CheckoutView.as_view(), name='checkout'),
    path('seller/', SellerOrderListView.as_view(), name='seller-order-list'),
    path('seller/<int:pk>/status/', SellerOrderStatusView.as_view(), name='seller-order-status'),
    path('seller/<int:pk>/', SellerOrderDetailView.as_view(), name='seller-order-detail'),
    path('', OrderListView.as_view(), name='order-list'),
    path('<int:pk>/', OrderDetailView.as_view(), name='order-detail'),
    path('<int:order_id>/update-info/', UpdateOrderInfoView.as_view(), name='update-order-info'),
    path('<int:order_id>/pay/', PayOrderView.as_view(), name='pay-order'),
    path('<int:order_id>/vnpay/', VNPayPaymentView.as_view(), name='vnpay-payment'),
    path('admin/orders/', AllOrdersAdminView.as_view(), name='all-orders-admin'),
    path('admin/orders/<int:pk>/', AdminOrderDetailView.as_view(), name='admin-order-detail'),


] 