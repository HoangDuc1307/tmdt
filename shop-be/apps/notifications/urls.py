from django.urls import path
from .views import (
    NotificationListView, NotificationReadView,
    MarkAllReadView, NotificationPreferenceView
)

app_name = 'notifications'

urlpatterns = [
    path('', NotificationListView.as_view(), name='notification-list'),
    path('<int:pk>/read/', NotificationReadView.as_view(), name='notification-read'),
    path('mark-all-read/', MarkAllReadView.as_view(), name='mark-all-read'),
    path('preferences/', NotificationPreferenceView.as_view(), name='notification-prefs'),
]
