from django.urls import path, include
from apps.orders.views import VNPayReturnView
from apps.marketplace.user_report_api import CreateUserReportView

urlpatterns = [
    path('users/', include('apps.users.urls')),
    path('products/', include('apps.products.urls')),
    path('cart/', include('apps.cart.urls')),
    path('orders/', include('apps.orders.urls')),
    path('vnpay/return/', VNPayReturnView.as_view(), name='vnpay-return'),
    path('reports/user/', CreateUserReportView.as_view(), name='user-report-create'),
    path('',include('apps.saleproduct.urls'))
] 