from datetime import timedelta

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import AsyncClient, TestCase, TransactionTestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient
from channels.testing import WebsocketCommunicator
from channels.db import database_sync_to_async
from rest_framework_simplejwt.tokens import AccessToken
import tempfile

from backend.asgi import application
from .models import Conversation, ConversationMember, Message


@override_settings(
	CHANNEL_LAYERS={
		"default": {"BACKEND": "channels.layers.InMemoryChannelLayer"}
	}
)
class ConversationMessageTests(TestCase):
	def setUp(self):
		User = get_user_model()
		self.user = User.objects.create_user(
			username="sender",
			email="sender@example.com",
			password="test-password-123",
			name="Sender"
		)
		self.other_user = User.objects.create_user(
			username="other",
			email="other@example.com",
			password="test-password-123",
			name="Other"
		)
		self.conversation = Conversation.objects.create()
		ConversationMember.objects.create(
			conversation=self.conversation,
			user=self.user
		)
		ConversationMember.objects.create(
			conversation=self.conversation,
			user=self.other_user
		)
		self.client = APIClient()
		self.client.force_authenticate(self.user)

	def test_send_message_persists_and_returns_history(self):
		url = f"/api/conversations/{self.conversation.pk}/messages/"
		response = self.client.post(url, {"content": "Hello"}, format="json")

		self.assertEqual(response.status_code, 201)
		self.assertEqual(Message.objects.count(), 1)
		history = self.client.get(url)
		self.assertEqual(history.status_code, 200)
		self.assertEqual(history.data["results"][0]["content"], "Hello")

	def test_conversation_list_includes_latest_message_preview(self):
		earlier_message = Message.objects.create(
			conversation=self.conversation,
			sender=self.user,
			content="My earlier message"
		)
		latest_message = Message.objects.create(
			conversation=self.conversation,
			sender=self.other_user,
			content="A new message for you"
		)
		Message.objects.filter(pk=latest_message.pk).update(
			created_at=earlier_message.created_at + timedelta(seconds=1)
		)

		response = self.client.get("/api/conversations/")

		self.assertEqual(response.status_code, 200)
		self.assertEqual(len(response.data), 1)
		self.assertEqual(
			response.data[0]["last_message"]["content"],
			"A new message for you"
		)
		self.assertEqual(
			str(response.data[0]["last_message"]["sender_id"]),
			str(self.other_user.pk)
		)
		self.assertEqual(
			str(response.data[0]["last_message"]["id"]),
			str(latest_message.pk)
		)

	def test_clearing_chat_hides_messages_only_for_current_user(self):
		Message.objects.create(
			conversation=self.conversation,
			sender=self.other_user,
			content="Visible only to the other member after clearing",
		)
		other_client = APIClient()
		other_client.force_authenticate(self.other_user)

		clear_response = self.client.post(
			f"/api/conversations/{self.conversation.pk}/clear/"
		)

		self.assertEqual(clear_response.status_code, 204)
		self.assertEqual(Message.objects.count(), 1)
		self.assertEqual(
			self.client.get(
				f"/api/conversations/{self.conversation.pk}/messages/"
			).data["results"],
			[],
		)
		other_history = other_client.get(
			f"/api/conversations/{self.conversation.pk}/messages/"
		)
		self.assertEqual(other_history.status_code, 200)
		self.assertEqual(
			other_history.data["results"][0]["content"],
			"Visible only to the other member after clearing",
		)

		self_list = self.client.get("/api/conversations/")
		other_list = other_client.get("/api/conversations/")
		self.assertIsNone(self_list.data[0]["last_message"])
		self.assertEqual(
			other_list.data[0]["last_message"]["content"],
			"Visible only to the other member after clearing",
		)

	def test_deleting_conversation_hides_it_only_for_current_user(self):
		Message.objects.create(
			conversation=self.conversation,
			sender=self.user,
			content="Conversation history",
		)
		other_client = APIClient()
		other_client.force_authenticate(self.other_user)

		delete_response = self.client.delete(
			f"/api/conversations/{self.conversation.pk}/"
		)

		self.assertEqual(delete_response.status_code, 204)
		self.assertEqual(self.client.get("/api/conversations/").data, [])
		self.assertEqual(len(other_client.get("/api/conversations/").data), 1)
		self.assertEqual(
			self.client.get(
				f"/api/conversations/{self.conversation.pk}/messages/"
			).status_code,
			404,
		)
		self.assertEqual(Message.objects.count(), 1)

		reopen_response = self.client.post(
			"/api/conversations/",
			{"user_id": str(self.other_user.pk)},
			format="json",
		)
		self.assertEqual(reopen_response.status_code, 200)
		self.assertEqual(str(reopen_response.data["id"]), str(self.conversation.pk))
		self.assertEqual(len(self.client.get("/api/conversations/").data), 1)
		self.assertEqual(
			self.client.get(
				f"/api/conversations/{self.conversation.pk}/messages/"
			).data["results"],
			[],
		)

	def test_conversation_responses_include_member_avatar_urls(self):
		self.other_user.last_seen = timezone.now()
		self.other_user.avatar.name = "avatars/other.png"
		self.other_user.save(update_fields=["avatar", "last_seen"])

		list_response = self.client.get("/api/conversations/")
		self.assertEqual(list_response.status_code, 200)
		list_member = next(
			member for member in list_response.data[0]["members"]
			if member["user_id"] == str(self.other_user.pk)
		)
		self.assertEqual(
			list_member["avatar"],
			"/media/avatars/other.png",
		)
		self.assertTrue(list_member["is_online"])

		detail_response = self.client.get(
			f"/api/conversations/{self.conversation.pk}/"
		)
		self.assertEqual(detail_response.status_code, 200)
		detail_member = next(
			member for member in detail_response.data["members"]
			if member["user_id"] == str(self.other_user.pk)
		)
		self.assertEqual(
			detail_member["avatar"],
			"/media/avatars/other.png",
		)

		new_user = get_user_model().objects.create_user(
			username="new-member",
			email="new-member@example.com",
			password="test-password-123",
			name="New Member",
			avatar="avatars/new-member.png",
		)
		create_response = self.client.post(
			"/api/conversations/",
			{"user_id": str(new_user.pk)},
			format="json",
		)
		self.assertEqual(create_response.status_code, 201)
		created_member = next(
			member for member in create_response.data["members"]
			if member["user_id"] == str(new_user.pk)
		)
		self.assertEqual(
			created_member["avatar"],
			"/media/avatars/new-member.png",
		)

	def test_non_member_cannot_read_messages(self):
		outsider = get_user_model().objects.create_user(
			username="outsider",
			email="outsider@example.com",
			password="test-password-123",
			name="Outsider"
		)
		self.client.force_authenticate(outsider)

		response = self.client.get(
			f"/api/conversations/{self.conversation.pk}/messages/"
		)

		self.assertEqual(response.status_code, 404)

	def test_attachment_is_saved_and_downloaded_only_by_members(self):
		url = f"/api/conversations/{self.conversation.pk}/messages/"
		with tempfile.TemporaryDirectory() as media_root:
			with override_settings(MEDIA_ROOT=media_root):
				response = self.client.post(
					url,
					{"attachment": SimpleUploadedFile("notes.txt", b"file contents")},
					format="multipart"
				)
				self.assertEqual(response.status_code, 201)
				file_url = response.data["file_url"]
				download = self.client.get(file_url)
				self.assertEqual(download.status_code, 200)
				self.assertEqual(b"".join(download.streaming_content), b"file contents")

				outsider = get_user_model().objects.create_user(
					username="file-outsider",
					email="file-outsider@example.com",
					password="test-password-123",
					name="File Outsider"
				)
				self.client.force_authenticate(outsider)
				denied = self.client.get(file_url)
				self.assertEqual(denied.status_code, 404)


@override_settings(
	ALLOWED_HOSTS=["testserver"],
)
class ConversationWebSocketTests(TransactionTestCase):
	async def test_typing_state_is_broadcast_to_other_member(self):
		@database_sync_to_async
		def create_conversation():
			User = get_user_model()
			sender = User.objects.create_user(
				username="typing-sender",
				email="typing-sender@example.com",
				name="Typing Sender",
			)
			recipient = User.objects.create_user(
				username="typing-recipient",
				email="typing-recipient@example.com",
				name="Typing Recipient",
			)
			conversation = Conversation.objects.create()
			ConversationMember.objects.create(conversation=conversation, user=sender)
			ConversationMember.objects.create(conversation=conversation, user=recipient)
			return sender.pk, recipient.pk, conversation.pk

		sender_id, recipient_id, conversation_id = await create_conversation()
		sender = await database_sync_to_async(get_user_model().objects.get)(pk=sender_id)
		recipient = await database_sync_to_async(get_user_model().objects.get)(pk=recipient_id)
		sender_token = AccessToken.for_user(sender)
		recipient_token = AccessToken.for_user(recipient)
		sender_socket = WebsocketCommunicator(
			application,
			f"/ws/conversations/{conversation_id}/",
			headers=[
				(b"cookie", f"access_token={sender_token}".encode()),
				(b"origin", b"http://testserver"),
			],
		)
		recipient_socket = WebsocketCommunicator(
			application,
			f"/ws/conversations/{conversation_id}/",
			headers=[
				(b"cookie", f"access_token={recipient_token}".encode()),
				(b"origin", b"http://testserver"),
			],
		)
		presence_socket = WebsocketCommunicator(
			application,
			"/ws/presence/",
			headers=[
				(b"cookie", f"access_token={recipient_token}".encode()),
				(b"origin", b"http://testserver"),
			],
		)
		sender_connected, _ = await sender_socket.connect()
		recipient_connected, _ = await recipient_socket.connect()
		presence_connected, _ = await presence_socket.connect()
		self.assertTrue(sender_connected)
		self.assertTrue(recipient_connected)
		self.assertTrue(presence_connected)

		try:
			await presence_socket.send_json_to(
				{
					"type": "subscribe",
					"conversation_ids": [str(conversation_id)],
				}
			)
			subscription = await presence_socket.receive_json_from()
			self.assertEqual(subscription["type"], "subscribed")
			await sender_socket.send_json_to(
				{"type": "typing", "is_typing": True}
			)
			event = await recipient_socket.receive_json_from()
			self.assertEqual(event["type"], "typing")
			self.assertEqual(event["conversation"], str(conversation_id))
			self.assertEqual(event["user_id"], str(sender.pk))
			self.assertEqual(event["username"], "typing-sender")
			self.assertTrue(event["is_typing"])
			sidebar_event = await presence_socket.receive_json_from()
			self.assertEqual(sidebar_event["type"], "typing")
			self.assertEqual(sidebar_event["conversation"], str(conversation_id))
			self.assertTrue(sidebar_event["is_typing"])
		finally:
			await sender_socket.disconnect()
			await recipient_socket.disconnect()
			await presence_socket.disconnect()

	async def test_presence_heartbeat_updates_last_seen_and_notifies_conversation(self):
		@database_sync_to_async
		def create_conversation():
			User = get_user_model()
			observer = User.objects.create_user(
				username="presence-observer",
				email="presence-observer@example.com",
				name="Presence Observer",
			)
			user = User.objects.create_user(
				username="presence-user",
				email="presence-user@example.com",
				name="Presence User",
			)
			conversation = Conversation.objects.create()
			ConversationMember.objects.create(conversation=conversation, user=observer)
			ConversationMember.objects.create(conversation=conversation, user=user)
			return observer.pk, user.pk, conversation.pk

		observer_id, user_id, conversation_id = await create_conversation()
		observer = await database_sync_to_async(get_user_model().objects.get)(pk=observer_id)
		user = await database_sync_to_async(get_user_model().objects.get)(pk=user_id)
		observer_socket = WebsocketCommunicator(
			application,
			f"/ws/conversations/{conversation_id}/",
			headers=[
				(b"cookie", f"access_token={AccessToken.for_user(observer)}".encode()),
				(b"origin", b"http://testserver"),
			],
		)
		presence_socket = WebsocketCommunicator(
			application,
			"/ws/presence/",
			headers=[
				(b"cookie", f"access_token={AccessToken.for_user(user)}".encode()),
				(b"origin", b"http://testserver"),
			],
		)
		observer_connected, _ = await observer_socket.connect()
		presence_connected, _ = await presence_socket.connect()
		self.assertTrue(observer_connected)
		self.assertTrue(presence_connected)

		try:
			event = await observer_socket.receive_json_from()
			self.assertEqual(event["type"], "presence")
			self.assertEqual(event["user_id"], str(user.pk))
			self.assertTrue(event["is_online"])
			self.assertTrue(event["last_seen"])
		finally:
			await observer_socket.disconnect()
			await presence_socket.disconnect()

	async def test_http_message_is_broadcast_to_connected_chat(self):
		@database_sync_to_async
		def create_conversation():
			User = get_user_model()
			sender = User.objects.create_user(
				username="ws-sender",
				email="ws-sender@example.com",
				name="WebSocket Sender",
			)
			recipient = User.objects.create_user(
				username="ws-recipient",
				email="ws-recipient@example.com",
				name="WebSocket Recipient",
			)
			conversation = Conversation.objects.create()
			ConversationMember.objects.create(conversation=conversation, user=sender)
			ConversationMember.objects.create(conversation=conversation, user=recipient)
			return sender.pk, recipient.pk, conversation.pk

		sender_id, recipient_id, conversation_id = await create_conversation()
		sender = await database_sync_to_async(get_user_model().objects.get)(pk=sender_id)
		recipient = await database_sync_to_async(get_user_model().objects.get)(pk=recipient_id)

		token = AccessToken.for_user(recipient)
		communicator = WebsocketCommunicator(
			application,
			f"/ws/conversations/{conversation_id}/",
			headers=[
				(b"cookie", f"access_token={token}".encode()),
				(b"origin", b"http://testserver"),
			],
		)
		connected, connection_result = await communicator.connect()
		self.assertTrue(connected, f"WebSocket rejected: {connection_result!r}")

		try:
			client = AsyncClient()
			client.cookies["access_token"] = str(AccessToken.for_user(sender))
			response = await client.post(
				f"/api/conversations/{conversation_id}/messages/",
				{"content": "Instant message"},
			)
			self.assertEqual(response.status_code, 201)
			broadcast = await communicator.receive_json_from()
			self.assertEqual(broadcast["content"], "Instant message")
			self.assertEqual(broadcast["conversation"], str(conversation_id))
			self.assertEqual(broadcast["sender_id"], str(sender_id))
			self.assertEqual(broadcast["sender_username"], "ws-sender")
		finally:
			await communicator.disconnect()
