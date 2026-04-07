from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from .models import Notification, NotificationPreference
from .serializers import NotificationSerializer, NotificationPreferenceSerializer


class NotificationListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        notifs = Notification.objects.filter(user=request.user)
        serializer = NotificationSerializer(notifs, many=True)
        unread_count = notifs.filter(is_read=False).count()
        return Response({'results': serializer.data, 'unread_count': unread_count})


class NotificationReadView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        try:
            notif = Notification.objects.get(pk=pk, user=request.user)
        except Notification.DoesNotExist:
            return Response({'error': 'Không tìm thấy thông báo.'}, status=status.HTTP_404_NOT_FOUND)
        notif.is_read = True
        notif.save()
        return Response({'message': 'Đã đánh dấu đã đọc.'})


class MarkAllReadView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        Notification.objects.filter(user=request.user, is_read=False).update(is_read=True)
        return Response({'message': 'Đã đánh dấu tất cả là đã đọc.'})


class NotificationPreferenceView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        prefs, _ = NotificationPreference.objects.get_or_create(user=request.user)
        serializer = NotificationPreferenceSerializer(prefs)
        return Response(serializer.data)

    def put(self, request):
        prefs, _ = NotificationPreference.objects.get_or_create(user=request.user)
        serializer = NotificationPreferenceSerializer(prefs, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
