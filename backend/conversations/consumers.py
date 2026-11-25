from uuid import UUID

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
        self.typing_group_name = f"typing_{self.conversation_id}"
        self.presence_groups = await self.get_presence_groups(
            self.conversation_id,
            user.pk,
        )
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.channel_layer.group_add(self.typing_group_name, self.channel_name)
        for presence_group in self.presence_groups:
            await self.channel_layer.group_add(presence_group, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        group_name = getattr(self, "group_name", None)
        if group_name:
            await self.channel_layer.group_discard(group_name, self.channel_name)
        typing_group_name = getattr(self, "typing_group_name", None)
        if typing_group_name:
            await self.channel_layer.group_discard(
                typing_group_name,
                self.channel_name,
            )
        for presence_group in getattr(self, "presence_groups", []):
            await self.channel_layer.group_discard(presence_group, self.channel_name)

    async def receive_json(self, content, **kwargs):
        if isinstance(content, dict) and content.get("type") == "typing":
            is_typing = content.get("is_typing")
            if not isinstance(is_typing, bool):
                await self.send_json({"type": "error", "detail": "Typing state must be a boolean"})
                return
            user = self.scope["user"]
            await self.channel_layer.group_send(
                self.typing_group_name,
                {
                    "type": "typing.update",
                    "conversation": str(self.conversation_id),
                    "user_id": str(user.pk),
                    "username": user.username,
                    "is_typing": is_typing,
                },
            )
            return

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

    async def typing_update(self, event):
        if event["user_id"] != str(self.scope["user"].pk):
            await self.send_json(
                {
                    "type": "typing",
                    "conversation": event["conversation"],
                    "user_id": event["user_id"],
                    "username": event["username"],
                    "is_typing": event["is_typing"],
                }
            )

    async def presence_update(self, event):
        await self.send_json(
            {
                "type": "presence",
                "user_id": event["user_id"],
                "is_online": event["is_online"],
                "last_seen": event["last_seen"],
            }
        )

    @database_sync_to_async
    def is_member(self, conversation_id, user_id):
        return ConversationMember.objects.filter(
            conversation_id=conversation_id,
            user_id=user_id,
            left_at__isnull=True
        ).exists()

    @database_sync_to_async
    def get_presence_groups(self, conversation_id, user_id):
        member_ids = ConversationMember.objects.filter(
            conversation_id=conversation_id,
            left_at__isnull=True,
        ).exclude(user_id=user_id).values_list("user_id", flat=True)
        return [f"presence_{member_id}" for member_id in member_ids]

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


class PresenceConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        user = self.scope.get("user")
        if not user or not user.is_authenticated:
            await self.close(code=4401)
            return

        self.user_id = str(user.pk)
        self.typing_groups = set()
        await self.accept()
        await self.broadcast_presence()

    async def receive_json(self, content, **kwargs):
        if not isinstance(content, dict):
            await self.send_json({"type": "error", "detail": "Invalid presence message"})
            return
        if content.get("type") == "subscribe":
            await self.subscribe_to_conversations(content.get("conversation_ids"))
            return
        if content.get("type") != "heartbeat":
            await self.send_json({"type": "error", "detail": "Heartbeat message is required"})
            return
        await self.broadcast_presence()

    async def disconnect(self, close_code):
        for group_name in self.typing_groups:
            await self.channel_layer.group_discard(group_name, self.channel_name)

    async def subscribe_to_conversations(self, conversation_ids):
        if (
            not isinstance(conversation_ids, list)
            or any(not isinstance(value, str) for value in conversation_ids)
        ):
            await self.send_json(
                {"type": "error", "detail": "Conversation IDs must be a list of strings"}
            )
            return

        try:
            conversation_ids = [str(UUID(value)) for value in conversation_ids]
        except ValueError:
            await self.send_json(
                {"type": "error", "detail": "Conversation IDs must be valid UUIDs"}
            )
            return

        group_names = await self.get_typing_groups(
            self.user_id,
            conversation_ids,
        )
        for group_name in self.typing_groups - group_names:
            await self.channel_layer.group_discard(group_name, self.channel_name)
        for group_name in group_names - self.typing_groups:
            await self.channel_layer.group_add(group_name, self.channel_name)
        self.typing_groups = group_names
        await self.send_json({"type": "subscribed"})

    async def typing_update(self, event):
        if event["user_id"] != self.user_id:
            await self.send_json(
                {
                    "type": "typing",
                    "conversation": event["conversation"],
                    "user_id": event["user_id"],
                    "username": event["username"],
                    "is_typing": event["is_typing"],
                }
            )

    @database_sync_to_async
    def get_typing_groups(self, user_id, conversation_ids):
        member_conversations = ConversationMember.objects.filter(
            user_id=user_id,
            conversation_id__in=conversation_ids,
            left_at__isnull=True,
        ).values_list("conversation_id", flat=True)
        return {f"typing_{conversation_id}" for conversation_id in member_conversations}

    async def broadcast_presence(self):
        last_seen = await self.touch_last_seen(self.user_id)
        await self.channel_layer.group_send(
            f"presence_{self.user_id}",
            {
                "type": "presence.update",
                "user_id": self.user_id,
                "is_online": True,
                "last_seen": last_seen,
            },
        )

    @database_sync_to_async
    def touch_last_seen(self, user_id):
        from django.contrib.auth import get_user_model

        timestamp = timezone.now()
        get_user_model().objects.filter(pk=user_id).update(last_seen=timestamp)
        return timestamp.isoformat()