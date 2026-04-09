from rest_framework import viewsets
from rest_framework.decorators import permission_classes, action
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny, IsAuthenticatedOrReadOnly, IsAdminUser
from rest_framework import filters
from django.db import models
from .models import Product,Category
from .serializers import ProductSerializer,CategorySerializer
from core.permissions import IsOwnerOrAdminOrReadOnly
from chatbot.chat_utils import prepare_knowledge_base_sync
from apps.marketplace.models import Listing

class ProductViewSet(viewsets.ModelViewSet):
    queryset = Product.objects.all().order_by('-id')
    serializer_class = ProductSerializer
    permission_classes = [IsAuthenticatedOrReadOnly, IsOwnerOrAdminOrReadOnly]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name']
    ordering_fields = ['id', 'price']

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user

        # Chi tiết sản phẩm (trang mua hàng): ai mua cũng xem được SP đã duyệt; seller xem thêm SP của mình (kể cả chưa duyệt).
        # List / sửa / xóa: staff xem tất cả; user thường chỉ thấy SP do mình tạo (quản lý shop).
        if self.action == 'retrieve':
            if user.is_authenticated and user.is_staff:
                pass
            elif user.is_authenticated:
                queryset = queryset.filter(
                    models.Q(is_approved=True) | models.Q(seller=user)
                )
            else:
                queryset = queryset.filter(is_approved=True)
        else:
            if not (user.is_authenticated and user.is_staff):
                if user.is_authenticated:
                    queryset = queryset.filter(seller=user)
                else:
                    queryset = queryset.none()

        category_id = self.request.query_params.get('category')
        if category_id:
            queryset = queryset.filter(category_id=category_id)
            
        status_param = self.request.query_params.get('is_approved')
        if status_param is not None and user.is_authenticated and user.is_staff:
            queryset = queryset.filter(is_approved=status_param.lower() in ['true', '1', 'yes'])
            
        return queryset
    
    def perform_create(self, serializer):
        user = self.request.user
        is_approved = user.is_staff
        instance = serializer.save(seller=user, is_approved=is_approved)
        # Sync sang marketplace listing để admin system có thể duyệt theo luồng /api/admin/listings/
        Listing.objects.create(
            seller=user,
            title=instance.name,
            description=instance.description,
            price=instance.price,
            status='APPROVED' if is_approved else 'PENDING',
        )
        prepare_knowledge_base_sync()
        return instance

    def perform_update(self, serializer):
        user = self.request.user
        if not user.is_staff and 'is_approved' in serializer.validated_data:
            serializer.validated_data.pop('is_approved')
        instance = serializer.save()
        # Đồng bộ listing gần nhất cùng seller + title để tránh lệch dữ liệu hiển thị duyệt bài
        listing = Listing.objects.filter(
            seller=instance.seller,
            title=instance.name
        ).order_by('-created_at').first()
        if listing:
            listing.description = instance.description
            listing.price = instance.price
            listing.save(update_fields=['description', 'price'])
        prepare_knowledge_base_sync()
        return instance

    def perform_destroy(self, instance):
        instance.delete()
        prepare_knowledge_base_sync()

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def my_products(self, request):
        products = Product.objects.filter(seller=request.user).order_by('-id')
        serializer = self.get_serializer(products, many=True)
        return Response(serializer.data)
        
    @action(detail=True, methods=['patch'], permission_classes=[IsAdminUser])
    def approve(self, request, pk=None):
        product = self.get_object()
        product.is_approved = True
        product.save()
        prepare_knowledge_base_sync()
        return Response({'status': 'Approved successfully'})

    


class ProductListAllView(APIView):
    permission_classes = [AllowAny]  # Allow any user to access this view
    
    def get(self, request):
        if request.user.is_authenticated and request.user.is_staff:
            products = Product.objects.all().order_by('-id')
        else:
            products = Product.objects.filter(is_approved=True).order_by('-id')
        serializer = ProductSerializer(products, many=True)
        return Response(serializer.data)


class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.all().order_by('-id')
    serializer_class = CategorySerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    pagination_class = None
    

class ProductsByCategoryView(APIView):
    permission_classes = [AllowAny]
    def get(self, request, category_id):
        products = Product.objects.filter(category_id=category_id, is_approved=True)
        serializer = ProductSerializer(products, many=True)
        return Response(serializer.data)


class RelatedProductsView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, product_id):
        try:
            product = Product.objects.get(id=product_id)
        except Product.DoesNotExist:
            return Response({'detail': 'Product not found.'}, status=404)
        related_products = Product.objects.filter(category=product.category, is_approved=True).exclude(id=product.id)
        serializer = ProductSerializer(related_products, many=True)
        return Response(serializer.data)
    