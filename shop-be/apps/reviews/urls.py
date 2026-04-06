from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ProductReviewViewSet, SellerReviewViewSet

router = DefaultRouter()
router.register('product', ProductReviewViewSet, basename='product-reviews')
router.register('seller', SellerReviewViewSet, basename='seller-reviews')

urlpatterns = [
    path('', include(router.urls)),
]
