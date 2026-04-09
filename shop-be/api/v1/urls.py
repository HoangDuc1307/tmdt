from django.urls import path, include
from apps.orders.views import VNPayReturnView, VNPayIPNView, MomoReturnView, MomoNotifyView
from apps.marketplace.user_report_api import CreateUserReportView

urlpatterns = [
    path('users/', include('apps.users.urls')),
    path('products/', include('apps.products.urls')),
    path('cart/', include('apps.cart.urls')),
    path('orders/', include('apps.orders.urls')),
    path('vnpay/return/', VNPayReturnView.as_view(), name='vnpay-return'),
    path('vnpay/ipn/', VNPayIPNView.as_view(), name='vnpay-ipn'),
    path('momo/return/', MomoReturnView.as_view(), name='momo-return'),
    path('momo/notify/', MomoNotifyView.as_view(), name='momo-notify'),
    path('reports/user/', CreateUserReportView.as_view(), name='user-report-create'),
    path('', include('apps.saleproduct.urls')),
    path('chat/', include('apps.chat.urls')),
] 