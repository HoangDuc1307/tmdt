# chat/urls.py
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import MessageViewSet  # Đảm bảo bạn đã viết ViewSet này

router = DefaultRouter()
router.register(r'messages', MessageViewSet, basename='messages')

urlpatterns = [
    path('', include(router.urls)),
]