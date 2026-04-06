
from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/v1/', include('api.v1.urls')),
    path('api/reviews/', include('apps.reviews.urls')),
    path('api/admin/', include('apps.marketplace.urls')),
    path('chatbot/', include('chatbot.urls')),
]
