from rest_framework import serializers
from .models import LoyaltyAccount, PointTransaction


class PointTransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = PointTransaction
        fields = ['id', 'points', 'type', 'description', 'created_at']
        read_only_fields = ['id', 'created_at']


class LoyaltyAccountSerializer(serializers.ModelSerializer):
    tier_display = serializers.CharField(source='get_tier_display', read_only=True)
    next_tier_info = serializers.SerializerMethodField()

    class Meta:
        model = LoyaltyAccount
        fields = ['points', 'tier', 'tier_display', 'total_spent', 'updated_at', 'next_tier_info']

    def get_next_tier_info(self, obj):
        thresholds = {
            'bronze': {'next': 'silver', 'target': 5_000_000},
            'silver': {'next': 'gold', 'target': 20_000_000},
            'gold': {'next': 'platinum', 'target': 50_000_000},
            'platinum': {'next': None, 'target': None},
        }
        info = thresholds.get(obj.tier, {})
        target = info.get('target')
        if target:
            remaining = max(0, target - float(obj.total_spent))
            progress = min(100, int(float(obj.total_spent) / target * 100))
            return {'next_tier': info['next'], 'target': target, 'remaining': remaining, 'progress': progress}
        return {'next_tier': None, 'message': 'Bạn đã đạt hạng cao nhất!'}
