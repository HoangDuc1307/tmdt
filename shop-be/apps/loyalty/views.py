from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import LoyaltyAccount, PointTransaction
from .serializers import LoyaltyAccountSerializer, PointTransactionSerializer


class LoyaltyAccountView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        account, _ = LoyaltyAccount.objects.get_or_create(user=request.user)
        serializer = LoyaltyAccountSerializer(account)
        return Response(serializer.data)


class LoyaltyHistoryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        try:
            account = LoyaltyAccount.objects.get(user=request.user)
        except LoyaltyAccount.DoesNotExist:
            return Response({'results': [], 'total': 0})
        transactions = PointTransaction.objects.filter(account=account)
        serializer = PointTransactionSerializer(transactions, many=True)
        return Response({'results': serializer.data, 'total': transactions.count()})
