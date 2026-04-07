from django.urls import path
from .views import LoyaltyAccountView, LoyaltyHistoryView

app_name = 'loyalty'

urlpatterns = [
    path('account/', LoyaltyAccountView.as_view(), name='loyalty-account'),
    path('history/', LoyaltyHistoryView.as_view(), name='loyalty-history'),
]
