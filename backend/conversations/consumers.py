from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncJsonWebsocketConsumer
from django.contrib.auth import get_user_model
from django.utils import timezone

from .models import Conversation, ConversationMember, Message


class ConversationConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        self.conversation_id = self.scope["url_route"]["kwargs"]["conversation_id"]
        user = self.scope.get("user")
        if not user or not user.is_authenticated:
            await self.close(code=4401)
            return
        if not await self.is_member(self.conversation_id, user.pk):
            await self.close(code=4403)
            return

        self.group_name = f"conversation_{self.conversation_id}"
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        group_name = getattr(self, "group_name", None)
        if group_name:
            await self.channel_layer.group_discard(group_name, self.channel_name)

    async def receive_json(self, content, **kwargs):
        text = content.get("content") if isinstance(content, dict) else None
        if not isinstance(text, str) or not text.strip():
            await self.send_json({"type": "error", "detail": "Message content is required"})
            return
        if len(text) > 10000:
            await self.send_json({"type": "error", "detail": "Message content is too long"})
            return

        user = self.scope["user"]
        message = await self.create_message(self.conversation_id, user.pk, text)
        if message is None:
            await self.close(code=4403)
            return
        await self.channel_layer.group_send(
            self.group_name,
            {"type": "chat.message", "message": message}
        )

    async def chat_message(self, event):
        await self.send_json(event["message"])

    @database_sync_to_async
    def is_member(self, conversation_id, user_id):
        return ConversationMember.objects.filter(
            conversation_id=conversation_id,
            user_id=user_id,
            left_at__isnull=True
        ).exists()

    @database_sync_to_async
    def create_message(self, conversation_id, user_id, content):
        if not ConversationMember.objects.filter(
            conversation_id=conversation_id,
            user_id=user_id,
            left_at__isnull=True
        ).exists():
            return None
        try:
            conversation = Conversation.objects.get(pk=conversation_id)
            user = get_user_model().objects.get(pk=user_id)
        except (Conversation.DoesNotExist, get_user_model().DoesNotExist):
            return None

        message = Message.objects.create(
            conversation=conversation,
            sender=user,
            content=content
        )
        Conversation.objects.filter(pk=conversation_id).update(updated_at=timezone.now())
        return {
            "id": str(message.pk),
            "conversation": str(conversation_id),
            "sender_id": str(user.pk),
            "sender_username": user.username,
            "content": message.content,
            "file_name": "",
            "file_content_type": "",
            "file_url": None,
            "created_at": message.created_at.isoformat(),
        }