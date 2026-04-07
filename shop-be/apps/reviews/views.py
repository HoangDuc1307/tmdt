from rest_framework import viewsets, permissions
from rest_framework.exceptions import ValidationError

from .models import ProductReview, SellerReview
from .serializers import ProductReviewSerializer, SellerReviewSerializer


class ProductReviewViewSet(viewsets.ModelViewSet):
    serializer_class = ProductReviewSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        qs = ProductReview.objects.select_related('product', 'user').order_by('-created_at')
        product_id = self.request.query_params.get('product_id')
        # Tránh GET list trả toàn bộ đánh giá hệ thống
        if self.action == 'list':
            if product_id:
                return qs.filter(product_id=product_id)
            return qs.none()
        if product_id:
            return qs.filter(product_id=product_id)
        return qs

    def perform_create(self, serializer):
        product = serializer.validated_data.get('product')
        if product is None:
            raise ValidationError({'product': 'Thiếu sản phẩm.'})
        if product.seller_id and product.seller_id == self.request.user.id:
            raise ValidationError({'detail': 'Bạn không thể đánh giá sản phẩm của chính mình.'})
        if ProductReview.objects.filter(product=product, user=self.request.user).exists():
            raise ValidationError({'detail': 'Bạn đã đánh giá sản phẩm này rồi.'})
        serializer.save(user=self.request.user)


class SellerReviewViewSet(viewsets.ModelViewSet):
    serializer_class = SellerReviewSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        qs = SellerReview.objects.select_related('seller', 'user').order_by('-created_at')
        seller_id = self.request.query_params.get('seller_id')
        if self.action == 'list':
            if seller_id:
                return qs.filter(seller_id=seller_id)
            return qs.none()
        if seller_id:
            return qs.filter(seller_id=seller_id)
        return qs

    def perform_create(self, serializer):
        seller = serializer.validated_data.get('seller')
        if seller is None:
            raise ValidationError({'seller': 'Thiếu người bán.'})
        if seller.id == self.request.user.id:
            raise ValidationError({'detail': 'Bạn không thể đánh giá chính mình.'})
        if SellerReview.objects.filter(seller=seller, user=self.request.user).exists():
            raise ValidationError({'detail': 'Bạn đã đánh giá người bán này rồi.'})
        serializer.save(user=self.request.user)
