import logging
from uuid import UUID

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from django.db import transaction
from django.shortcuts import get_object_or_404
from django.contrib.auth import get_user_model
from django.http import FileResponse
from django.db.models import Prefetch, Q
from django.utils import timezone
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

from .models import Conversation, ConversationMember, Message
from .serializers import (
    ConversationListSerializer,
    CreateDirectConversationSerializer,
    ConversationSerializer,
    CreateMessageSerializer,
    MessageSerializer,
)

logger = logging.getLogger(__name__)


class ConversationListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        conversations = Conversation.objects.filter(
            members__user = request.user
        ).prefetch_related(
            "members__user",
            Prefetch(
                "messages",
                queryset=Message.objects.select_related("sender").order_by(
                    "-created_at",
                    "-id"
                )[:1],
                to_attr="latest_messages",
            ),
        ).order_by("-updated_at").distinct()

        serializer = ConversationListSerializer(
            conversations,
            many=True,
            context={"request": request},
        )

        return Response(serializer.data)

    def post(self, request):
        serializer = CreateDirectConversationSerializer(
            data = request.data,
            context={"request": request}
        )

        serializer.is_valid(raise_exception=True)

        other_user_id = serializer.validated_data["user_id"]
        User = get_user_model()

        other_user = get_object_or_404(User, pk=other_user_id)

        conversation = (
            Conversation.objects
            .filter(
                type=Conversation.Type.DIRECT,
                members__user=request.user
            )
            .filter(
                members__user=other_user
            )
            .distinct()
            .first()
        )

        if conversation:
            return Response(ConversationSerializer(conversation).data, status=status.HTTP_200_OK)

        with transaction.atomic():
            conversation = Conversation.objects.create(type = Conversation.Type.DIRECT)

            ConversationMember.objects.bulk_create(
                [
                    ConversationMember(
                        conversation=conversation,
                        user=request.user,
                        role=ConversationMember.Role.MEMBER
                    ),
                    ConversationMember(
                        conversation=conversation,
                        user=other_user,
                        role=ConversationMember.Role.MEMBER
                    )
                ]
            )

        conversation = Conversation.objects.prefetch_related("members__user").get(pk=conversation.pk)

        return Response(
            ConversationSerializer(conversation).data,
            status = status.HTTP_201_CREATED
        )

class ConversationDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get_conversation(self, request, pk):
        return get_object_or_404(Conversation.objects.prefetch_related("members__user"), pk=pk, members__user=request.user)

    def get(self, request, pk):
        conversation = self.get_conversation(request, pk)
        serializer = ConversationSerializer(conversation)
        return Response(serializer.data)

    def delete(self, request, pk):
        conversation = self.get_conversation(request, pk)
        conversation.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ConversationMessagesView(APIView):
    permission_classes = [IsAuthenticated]

    def get_conversation(self, request, conversation_id):
        conversations = Conversation.objects.filter(
            members__user=request.user,
            members__left_at__isnull=True
        )
        return get_object_or_404(conversations, pk=conversation_id)

    def get(self, request, conversation_id):
        conversation = self.get_conversation(request, conversation_id)
        try:
            limit = int(request.query_params.get("limit", 50))
        except ValueError:
            return Response({"detail": "limit must be an integer"}, status=400)
        if limit < 1:
            return Response({"detail": "limit must be positive"}, status=400)
        limit = min(limit, 100)

        messages = Message.objects.filter(conversation=conversation).select_related("sender")
        cursor = request.query_params.get("before")
        if cursor:
            try:
                cursor = UUID(cursor)
            except ValueError:
                return Response({"detail": "before must be a message UUID"}, status=400)
            cursor_message = get_object_or_404(
                Message.objects.filter(conversation=conversation),
                pk=cursor
            )
            messages = messages.filter(
                Q(created_at__lt=cursor_message.created_at)
                | Q(created_at=cursor_message.created_at, id__lt=cursor_message.id)
            )

        page = list(messages.order_by("-created_at", "-id")[:limit + 1])
        has_more = len(page) > limit
        page = page[:limit]
        next_before = str(page[-1].id) if has_more and page else None
        page.reverse()
        serializer = MessageSerializer(
            page,
            many=True,
            context={"request": request}
        )
        return Response({"results": serializer.data, "next_before": next_before})

    def post(self, request, conversation_id):
        conversation = self.get_conversation(request, conversation_id)
        serializer = CreateMessageSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        attachment = serializer.validated_data.get("attachment")
        message = Message.objects.create(
            conversation=conversation,
            sender=request.user,
            content=serializer.validated_data.get("content", ""),
            attachment=attachment,
            attachment_name=attachment.name if attachment else "",
            attachment_content_type=(
                getattr(attachment, "content_type", "") or ""
                if attachment else ""
            ),
        )
        Conversation.objects.filter(pk=conversation.pk).update(updated_at=timezone.now())

        message_data = MessageSerializer(
            message,
            context={"request": request}
        ).data

        # Convertimos los UUIDs a string para evitar errores de serialización JSON en el WebSocket
        if isinstance(message_data.get('id'), UUID):
            message_data['id'] = str(message_data['id'])
        if isinstance(message_data.get('conversation'), UUID):
            message_data['conversation'] = str(message_data['conversation'])
        if isinstance(message_data.get('sender_id'), UUID):
            message_data['sender_id'] = str(message_data['sender_id'])

        try:
            async_to_sync(get_channel_layer().group_send)(
                f"conversation_{conversation.pk}",
                {"type": "chat.message", "message": message_data}
            )
        except Exception:
            logger.exception("Message %s was saved but could not be broadcast", message.pk)

        return Response(message_data, status=status.HTTP_201_CREATED)


class MessageAttachmentView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, conversation_id, pk):
        conversation = get_object_or_404(
            Conversation.objects.filter(
                members__user=request.user,
                members__left_at__isnull=True
            ),
            pk=conversation_id
        )
        message = get_object_or_404(
            Message.objects.filter(conversation=conversation).exclude(attachment=""),
            pk=pk
        )
        response = FileResponse(
            message.attachment.open("rb"),
            as_attachment=True,
            filename=message.attachment_name or "attachment",
            content_type=message.attachment_content_type or "application/octet-stream"
        )
        response["Cache-Control"] = "private, no-store"
        response["X-Content-Type-Options"] = "nosniff"
        return response
