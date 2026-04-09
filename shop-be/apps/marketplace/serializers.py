from django.contrib.auth.models import User
from django.core.exceptions import ObjectDoesNotExist
from rest_framework import serializers

from .models import Listing, UserReport, Transaction, UserProfile, ReportEvidence, ListingImage
from apps.products.models import Product


# Xử lý ảnh bài đăng
class ListingImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ListingImage
        fields = ['id', 'image', 'uploaded_at']


# Chuyển đổi thông tin bài đăng để Admin duyệt
class ListingSerializer(serializers.ModelSerializer):
    seller_username = serializers.CharField(source='seller.username', read_only=True)
    images = ListingImageSerializer(many=True, read_only=True)
    preview_image = serializers.SerializerMethodField()

    class Meta:
        model = Listing
        fields = [
            'id', 'title', 'description', 'price', 'status', 
            'seller_username', 'reject_reason', 'images', 'preview_image', 'created_at'
        ]

    def get_preview_image(self, obj):
        # Fallback ảnh: lấy ảnh sản phẩm tương ứng khi Listing chưa có ListingImage
        product = Product.objects.filter(
            seller=obj.seller,
            name=obj.title
        ).order_by('-id').first()
        if product and product.image:
            return product.image
        return None


# Thông tin User - Gom cả số gậy (cảnh báo) và lý do khóa từ Profile vào cho dễ quản lý
class UserSerializer(serializers.ModelSerializer):
    is_blocked = serializers.SerializerMethodField()
    warning_count = serializers.SerializerMethodField()
    block_reason = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'is_active', 'is_blocked', 'date_joined', 'warning_count', 'block_reason']

    def get_is_blocked(self, obj):
        try:
            return obj.userprofile.is_blocked
        except ObjectDoesNotExist:
            return False

    def get_warning_count(self, obj):
        """
        Số cảnh cáo hiển thị = max(giá trị lưu trên UserProfile, số báo cáo RESOLVED).
        Tránh badge luôn 0 khi: chưa có profile, lỗi truy cập O2O, hoặc admin đổi trạng thái
        sang RESOLVED qua set_status (không đi qua resolve nên chưa +warning_count).
        """
        try:
            stored = obj.userprofile.warning_count
        except ObjectDoesNotExist:
            stored = 0
        resolved_n = getattr(obj, '_resolved_reports', None)
        if resolved_n is None:
            resolved_n = UserReport.objects.filter(target_user=obj, status='RESOLVED').count()
        return max(stored, resolved_n)

    def get_block_reason(self, obj):
        try:
            return obj.userprofile.block_reason
        except ObjectDoesNotExist:
            return None


# Xử lý ảnh bằng chứng trong báo cáo
class ReportEvidenceSerializer(serializers.ModelSerializer):
    class Meta:
        model = ReportEvidence
        fields = ['id', 'image', 'uploaded_at']

# Đổ dữ liệu tố cáo người dùng
class UserReportSerializer(serializers.ModelSerializer):
    reporter_username = serializers.CharField(source='reporter.username', read_only=True)
    target_username = serializers.CharField(source='target_user.username', read_only=True)
    reporter_id = serializers.IntegerField(source='reporter.id', read_only=True)
    target_id = serializers.IntegerField(source='target_user.id', read_only=True)
    evidences = ReportEvidenceSerializer(many=True, read_only=True)

    class Meta:
        model = UserReport
        fields = [
            'id', 'reporter_id', 'reporter_username', 'target_id', 'target_username', 
            'reason', 'admin_reply', 'status', 'evidences', 'created_at', 'updated_at'
        ]


# Gom nhóm số liệu tổng quan về phí sàn
class TransactionFeeSummarySerializer(serializers.Serializer):
    total_revenue = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_platform_fee = serializers.DecimalField(max_digits=12, decimal_places=2)
    total_transactions = serializers.IntegerField()


# Chi tiết từng giao dịch để hiện lên bảng hoặc xuất file Excel
class TransactionListSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    amount = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    platform_fee = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    created_at = serializers.DateTimeField(read_only=True)
    listing_title = serializers.CharField(source='listing.title', read_only=True)
    buyer_username = serializers.CharField(source='buyer.username', read_only=True)
    seller_username = serializers.CharField(source='seller.username', read_only=True)

