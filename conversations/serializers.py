from rest_framework import serializers
from django.urls import reverse
from .models import Conversation, ConversationMember, Message


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


class MessageSerializer(serializers.ModelSerializer):
    sender_id = serializers.UUIDField(source="sender.id", read_only=True)
    sender_username = serializers.CharField(source="sender.username", read_only=True)
    file_name = serializers.CharField(source="attachment_name", read_only=True)
    file_content_type = serializers.CharField(
        source="attachment_content_type",
        read_only=True
    )
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = [
            "id",
            "conversation",
            "sender_id",
            "sender_username",
            "content",
            "file_name",
            "file_content_type",
            "file_url",
            "created_at",
        ]
        read_only_fields = fields

    def get_file_url(self, obj):
        if not obj.attachment:
            return None
        
        # Obtenemos el request del contexto del serializador
        request = self.context.get('request')
        file_url = obj.attachment.url
        
        if request is not None:
            return request.build_absolute_uri(file_url)
        return file_url


class CreateMessageSerializer(serializers.Serializer):
    content = serializers.CharField(
        required=False,
        allow_blank=True,
        max_length=10000,
        trim_whitespace=False
    )
    attachment = serializers.FileField(required=False, allow_empty_file=False)

    def validate_attachment(self, value):
        if value.size > 25 * 1024 * 1024:
            raise serializers.ValidationError("Files cannot exceed 25 MB")
        return value

    def validate(self, attrs):
        if not attrs.get("content", "").strip() and not attrs.get("attachment"):
            raise serializers.ValidationError("A message needs text or an attachment")
        return attrs
