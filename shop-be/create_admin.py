import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'store.settings.development')
django.setup()

from django.contrib.auth import get_user_model
User = get_user_model()

if not User.objects.filter(username='admin').exists():
    User.objects.create_superuser('admin', 'admin@example.com', 'admin123')
    print('CREATED')
else:
    print('EXISTS')
