from django.urls import path
from .views import ActiveSaleProductListAPIView, SaleProductCreateUpdateAPIView, DeleteSaleProductAPIView, SaleProductByProductIdAPIView

app_name = 'saleproduct'

urlpatterns = [
    path('sale-products/', ActiveSaleProductListAPIView.as_view(), name='sale-product-list'),
    path('sale-products/manage/', SaleProductCreateUpdateAPIView.as_view(), name='sale-product-manage'),
    path('sale-products/<int:product_id>/delete/', DeleteSaleProductAPIView.as_view(), name='sale-product-delete'),
    path('sale-products/product/<int:product_id>/', SaleProductByProductIdAPIView.as_view(), name='sale-product-by-product'),
]