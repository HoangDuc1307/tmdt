from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from .models import Address
from .serializers import AddressSerializer


class AddressListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        addresses = Address.objects.filter(user=request.user)
        serializer = AddressSerializer(addresses, many=True)
        return Response(serializer.data)

    def post(self, request):
        serializer = AddressSerializer(data=request.data)
        if serializer.is_valid():
            # Nếu là địa chỉ đầu tiên, tự động set default
            if not Address.objects.filter(user=request.user).exists():
                serializer.save(user=request.user, is_default=True)
            else:
                serializer.save(user=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class AddressDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get_object(self, pk, user):
        try:
            return Address.objects.get(pk=pk, user=user)
        except Address.DoesNotExist:
            return None

    def get(self, request, pk):
        addr = self.get_object(pk, request.user)
        if not addr:
            return Response({'error': 'Không tìm thấy địa chỉ.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(AddressSerializer(addr).data)

    def put(self, request, pk):
        addr = self.get_object(pk, request.user)
        if not addr:
            return Response({'error': 'Không tìm thấy địa chỉ.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = AddressSerializer(addr, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, pk):
        addr = self.get_object(pk, request.user)
        if not addr:
            return Response({'error': 'Không tìm thấy địa chỉ.'}, status=status.HTTP_404_NOT_FOUND)
        was_default = addr.is_default
        addr.delete()
        # Nếu xóa địa chỉ default, tự động set địa chỉ đầu tiên còn lại làm default
        if was_default:
            first = Address.objects.filter(user=request.user).first()
            if first:
                first.is_default = True
                first.save()
        return Response({'message': 'Xóa địa chỉ thành công.'}, status=status.HTTP_204_NO_CONTENT)


class SetDefaultAddressView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        try:
            addr = Address.objects.get(pk=pk, user=request.user)
        except Address.DoesNotExist:
            return Response({'error': 'Không tìm thấy địa chỉ.'}, status=status.HTTP_404_NOT_FOUND)
        addr.is_default = True
        addr.save()
        return Response({'message': 'Đã đặt làm địa chỉ mặc định.', 'id': addr.id})
