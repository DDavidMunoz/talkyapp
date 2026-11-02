from rest_framework import serializers
from .models import Conversation, ConversationMember


class ConversationMemberSerializer(serializers.ModelSerializer):
    user_id = serializers.UUIDField(source="user.id", read_only=True)
    username = serializers.CharField(source="user.username", read_only=True)

    class Meta:
        model = ConversationMember
        fields = [
            "user_id",
            "username",
            "role",
            "joined_at",
            "left_at",
        ]

        read_only_fields = [
            "user_id",
            "username",
            "joined_at"
        ]

class ConversationListSerializer(serializers.ModelSerializer):
    members = ConversationMemberSerializer(
        many=True,
        read_only=True
    )

    class Meta:
        model = Conversation
        fields = [
            "id",
            "type",
            "name",
            "members",
            "updated_at"
        ]

        read_only_fields = [
            "id",
            "members",
            "udpated_at"
        ]


class CreateDirectConversationSerializer(serializers.Serializer):
    user_id = serializers.UUIDField()

    def validate_user(self, value):
        request = self.context["request"]
        if value == request.user.id:
            raise serializers.ValidationError("You cannot create a conversation with yourself")

        try:
            user_model = request.user.__class__
            user_model.objects.get(pk=value)
        except user_model.DoesNotExist:
            raise serializers.ValidationError("User does not exist")

        return value

class ConversationSerializer(serializers.ModelSerializer):
    members = ConversationMemberSerializer(
        many=True,
        read_only=True
    )

    class Meta:
        model = Conversation
        fields = [
            "id",
            "type",
            "name",
            "members",
            "created_at",
            "updated_at"
        ]

        read_only_fields = [
            "id",
            "members",
            "created_at",
            "updated_at"
        ]
