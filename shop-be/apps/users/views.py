from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser, AllowAny
from rest_framework import status
from django.contrib.auth.models import User
from django.contrib.auth.tokens import default_token_generator
from django.core.exceptions import ObjectDoesNotExist
from django.core.mail import send_mail
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.conf import settings
from rest_framework.authtoken.models import Token
from .models import UserProfile
from .serializers import UserSerializer, UserProfileSerializer
from rest_framework_simplejwt.views import TokenObtainPairView
from .serializers import CustomTokenObtainPairSerializer
import os


class RegisterView(APIView):
    permission_classes = [AllowAny]
    
    def post(self, request):
        username = request.data.get('username')
        password = request.data.get('password')
        email = request.data.get('email')
        
        if not username or not password:
            return Response({'error': 'Vui lòng nhập username và password'}, status=status.HTTP_400_BAD_REQUEST)
        
        if User.objects.filter(username=username).exists():
            return Response({'error': 'Username đã tồn tại'}, status=status.HTTP_400_BAD_REQUEST)
        
        if User.objects.filter(email=email).exists():
            return Response({'error': 'email da ton tai'}, status=status.HTTP_400_BAD_REQUEST)
        
        user = User(username=username, email=email)
        user.set_password(password)
        user.save()
        
        return Response({'message': 'Đăng ký thành công'}, status=status.HTTP_201_CREATED)


class LoginView(APIView):
    permission_classes = [AllowAny]
    
    def post(self, request):
        username = request.data.get('username')
        password = request.data.get('password')

        if not username or not password:
            return Response({"error": "Vui lòng nhập username và password"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(username=username)
        except ObjectDoesNotExist:
            return Response({"error": "Username không tồn tại"}, status=status.HTTP_400_BAD_REQUEST)
        
        if user.check_password(password):
            # Tạo hoặc lấy token cho user
            token, created = Token.objects.get_or_create(user=user)
            
            return Response({
                "message": "Đăng nhập thành công",
                "token": token.key,
                "user": {
                    "id": user.id,
                    "username": user.username,
                    "email": user.email,
                    "is_admin": user.is_staff
                }
            }, status=status.HTTP_200_OK)
        
        return Response({"error": "Mật khẩu không đúng"}, status=status.HTTP_400_BAD_REQUEST)


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        try:
            # Xóa token của user hiện tại
            request.user.auth_token.delete()
            return Response({"message": "Đăng xuất thành công"}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": "Có lỗi xảy ra khi đăng xuất"}, status=status.HTTP_400_BAD_REQUEST)


class CreateAdminView(APIView):
    permission_classes = [AllowAny]
    
    def post(self, request):
        username = request.data.get('username')
        password = request.data.get('password')
        email = request.data.get('email')
        
        if not username or not password:
            return Response({'error': 'Vui lòng nhập username và password'}, status=status.HTTP_400_BAD_REQUEST)
        
        if User.objects.filter(username=username).exists():
            return Response({'error': 'Username đã tồn tại'}, status=status.HTTP_400_BAD_REQUEST)
        
        if email and User.objects.filter(email=email).exists():
            return Response({'error': 'Email đã tồn tại'}, status=status.HTTP_400_BAD_REQUEST)

        user = User(username=username, email=email, is_staff=True, is_superuser=True)
        user.set_password(password)
        user.save()
        
        # Tạo token cho admin
        token, created = Token.objects.get_or_create(user=user)
        
        return Response({
            'message': 'Tạo admin thành công',
            'token': token.key,
            'user': {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'is_staff': user.is_staff
            }
        }, status=status.HTTP_201_CREATED)


class MyProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        profile, created = UserProfile.objects.get_or_create(user=request.user)
        serializer = UserProfileSerializer(profile)
        return Response(serializer.data)

    def post(self, request):
        if hasattr(request.user, 'profile'):
            return Response({'detail': 'Profile đã tồn tại. Dùng PUT để cập nhật.'}, status=400)

        serializer = UserProfileSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(user=request.user)
            return Response(serializer.data, status=201)
        return Response(serializer.errors, status=400)

    def put(self, request):
        profile, _ = UserProfile.objects.get_or_create(user=request.user)
        serializer = UserProfileSerializer(profile, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response({"errors": serializer.errors}, status=status.HTTP_400_BAD_REQUEST)


class AllUsersAdminView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        users = User.objects.all()
        serializer = UserSerializer(users, many=True)
        return Response(serializer.data)


class AllUserProfilesAdminView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        profiles = UserProfile.objects.all()
        serializer = UserProfileSerializer(profiles, many=True)
        return Response(serializer.data) 


class LogoutAndBlacklistRefreshTokenForUserView(APIView):
    def post(self, request):
        try:
            refresh_token = request.data["refresh"]
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response(status=status.HTTP_205_RESET_CONTENT)
        except Exception as e:
            return Response(status=status.HTTP_400_BAD_REQUEST) 


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer 


class ForgotPasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = (request.data.get('email') or '').strip()
        if not email:
            return Response({'error': 'Vui lòng nhập email'}, status=status.HTTP_400_BAD_REQUEST)

        # Luôn trả về message thành công để tránh lộ thông tin tài khoản có tồn tại hay không
        success_payload = {
            'message': 'Nếu email tồn tại trong hệ thống, chúng tôi đã gửi hướng dẫn đặt lại mật khẩu.'
        }

        user = User.objects.filter(email__iexact=email).first()
        if not user:
            return Response(success_payload, status=status.HTTP_200_OK)

        uid = urlsafe_base64_encode(force_bytes(user.pk))
        token = default_token_generator.make_token(user)
        frontend_base = os.getenv('FRONTEND_URL', 'http://localhost:4200').rstrip('/')
        reset_link = f'{frontend_base}/reset-password?uid={uid}&token={token}'

        subject = 'Dat lai mat khau'
        message = (
            f'Xin chao {user.username},\n\n'
            f'Ban vua yeu cau dat lai mat khau.\n'
            f'Hay truy cap link sau de dat lai mat khau:\n{reset_link}\n\n'
            'Neu ban khong yeu cau, hay bo qua email nay.'
        )
        send_mail(subject, message, settings.DEFAULT_FROM_EMAIL, [user.email], fail_silently=False)
        return Response(success_payload, status=status.HTTP_200_OK)


class ResetPasswordView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        uid = request.data.get('uid')
        token = request.data.get('token')
        new_password = request.data.get('new_password')
        confirm_password = request.data.get('confirm_password')

        if not uid or not token:
            return Response({'error': 'Thiếu thông tin xác thực reset password'}, status=status.HTTP_400_BAD_REQUEST)
        if not new_password:
            return Response({'error': 'Vui lòng nhập mật khẩu mới'}, status=status.HTTP_400_BAD_REQUEST)
        if len(new_password) < 6:
            return Response({'error': 'Mật khẩu phải có ít nhất 6 ký tự'}, status=status.HTTP_400_BAD_REQUEST)
        if confirm_password is not None and new_password != confirm_password:
            return Response({'error': 'Mật khẩu xác nhận không khớp'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user_id = force_str(urlsafe_base64_decode(uid))
            user = User.objects.get(pk=user_id)
        except Exception:
            return Response({'error': 'Link đặt lại mật khẩu không hợp lệ'}, status=status.HTTP_400_BAD_REQUEST)

        if not default_token_generator.check_token(user, token):
            return Response({'error': 'Link đặt lại mật khẩu đã hết hạn hoặc không hợp lệ'}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(new_password)
        user.save(update_fields=['password'])
        return Response({'message': 'Đặt lại mật khẩu thành công'}, status=status.HTTP_200_OK)