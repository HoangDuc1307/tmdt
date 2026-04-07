import os
import django
import sys

sys.path.append('d:\Thương mại điện tử\tmdt\shop-be')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from apps.products.serializers import ProductSerializer

data = {
    'name': 'Test',
    'description': 'test dev',
    'price': '100',
    'quantity': '',
    'image': '',
    'category_id': 1
}

serializer = ProductSerializer(data=data)
if not serializer.is_valid():
    print(serializer.errors)
else:
    print("VALID")
