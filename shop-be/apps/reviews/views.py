from rest_framework import viewsets, permissions
from .models import ProductReview, SellerReview
from .serializers import ProductReviewSerializer, SellerReviewSerializer

class ProductReviewViewSet(viewsets.ModelViewSet):
    queryset = ProductReview.objects.all()
    serializer_class = ProductReviewSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        product_id = self.request.query_params.get('product_id')
        if product_id:
            return self.queryset.filter(product_id=product_id)
        return self.queryset

    def perform_create(self, serializer):
        # Tự động gán người đánh giá là người dùng hiện tại
        serializer.save(user=self.request.user)

class SellerReviewViewSet(viewsets.ModelViewSet):
    queryset = SellerReview.objects.all()
    serializer_class = SellerReviewSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get_queryset(self):
        seller_id = self.request.query_params.get('seller_id')
        if seller_id:
            return self.queryset.filter(seller_id=seller_id)
        return self.queryset

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
