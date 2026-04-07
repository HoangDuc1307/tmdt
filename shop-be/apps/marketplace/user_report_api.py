"""API cho user đã đăng nhập gửi báo cáo → cùng bảng UserReport, admin xem tại /api/admin/reports/."""
from django.contrib.auth.models import User
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import JSONParser, MultiPartParser, FormParser

from .models import UserReport, ReportEvidence
from .serializers import UserReportSerializer

REPORT_CATEGORIES = {
    'fraud': 'Lừa đảo / không giao hàng',
    'wrong_item': 'Hàng không đúng mô tả',
    'harassment': 'Quấy rối / ngôn từ xấu',
    'spam': 'Spam / tài khoản ảo',
    'other': 'Khác',
}

MAX_EVIDENCE_FILES = 5


class CreateUserReportView(APIView):
    permission_classes = [IsAuthenticated]
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    def post(self, request):
        target_user_id = request.data.get('target_user_id')
        reason = (request.data.get('reason') or '').strip()
        category_key = (request.data.get('category') or 'other').strip()
        product_id = request.data.get('product_id')

        if target_user_id is None or target_user_id == '':
            return Response({'detail': 'Thiếu target_user_id'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            target_user_id = int(target_user_id)
        except (TypeError, ValueError):
            return Response({'detail': 'target_user_id không hợp lệ'}, status=status.HTTP_400_BAD_REQUEST)

        if len(reason) < 15:
            return Response(
                {'detail': 'Vui lòng mô tả chi tiết ít nhất 15 ký tự.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if request.user.id == target_user_id:
            return Response({'detail': 'Không thể báo cáo chính mình.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            target = User.objects.get(pk=target_user_id)
        except User.DoesNotExist:
            return Response({'detail': 'Người dùng không tồn tại.'}, status=status.HTTP_404_NOT_FOUND)

        if not target.is_active:
            return Response({'detail': 'Tài khoản này không khả dụng.'}, status=status.HTTP_400_BAD_REQUEST)

        category_label = REPORT_CATEGORIES.get(category_key, REPORT_CATEGORIES['other'])
        full_reason = f"[{category_label}]\n{reason}"

        if product_id not in (None, ''):
            try:
                pid = int(product_id)
                full_reason = f"[Sản phẩm #{pid}]\n{full_reason}"
            except (TypeError, ValueError):
                pass

        report = UserReport.objects.create(
            reporter=request.user,
            target_user=target,
            reason=full_reason,
        )

        images = request.FILES.getlist('images')
        if not images:
            images = request.FILES.getlist('evidence')

        for f in images[:MAX_EVIDENCE_FILES]:
            if f and getattr(f, 'content_type', '').startswith('image/'):
                ReportEvidence.objects.create(report=report, image=f)

        return Response(UserReportSerializer(report).data, status=status.HTTP_201_CREATED)
