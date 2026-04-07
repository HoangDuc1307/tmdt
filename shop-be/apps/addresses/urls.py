from django.urls import path
from .views import AddressListCreateView, AddressDetailView, SetDefaultAddressView

app_name = 'addresses'

urlpatterns = [
    path('', AddressListCreateView.as_view(), name='address-list'),
    path('<int:pk>/', AddressDetailView.as_view(), name='address-detail'),
    path('<int:pk>/set-default/', SetDefaultAddressView.as_view(), name='set-default'),
]
