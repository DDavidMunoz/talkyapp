from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import AsyncClient, TestCase, TransactionTestCase, override_settings
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
		Message.objects.create(
			conversation=self.conversation,
			sender=self.user,
			content="My earlier message"
		)
		latest_message = Message.objects.create(
			conversation=self.conversation,
			sender=self.other_user,
			content="A new message for you"
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
