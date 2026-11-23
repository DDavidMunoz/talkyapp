from io import BytesIO
import tempfile

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from PIL import Image
from rest_framework.test import APIClient


class UserSearchTests(TestCase):
	def setUp(self):
		User = get_user_model()
		self.user = User.objects.create_user(
			username="current",
			email="current@example.com",
			password="test-password-123",
			name="Current User"
		)
		self.match = User.objects.create_user(
			username="talky_friend",
			email="friend@example.com",
			password="test-password-123",
			name="Friend"
		)
		self.client = APIClient()
		self.client.force_authenticate(self.user)

	def test_search_returns_matching_profiles_without_email(self):
		response = self.client.get("/api/users/search/?q=talky")

		self.assertEqual(response.status_code, 200)
		self.assertEqual(len(response.data), 1)
		self.assertEqual(str(response.data[0]["id"]), str(self.match.pk))
		self.assertNotIn("email", response.data[0])

	def test_search_returns_relative_avatar_url_for_clients_behind_a_proxy(self):
		self.match.avatar.name = "avatars/friend.png"
		self.match.save(update_fields=["avatar"])

		with override_settings(ALLOWED_HOSTS=["testserver", "127.0.0.1"]):
			response = self.client.get(
				"/api/users/search/?q=talky",
				HTTP_HOST="127.0.0.1:8000",
			)

		self.assertEqual(response.status_code, 200)
		self.assertEqual(response.data[0]["avatar"], "/media/avatars/friend.png")

	def test_search_requires_two_characters(self):
		response = self.client.get("/api/users/search/?q=t")

		self.assertEqual(response.status_code, 400)


class LoginTests(TestCase):
	def setUp(self):
		User = get_user_model()
		self.user = User.objects.create_user(
			username="talky_login_test",
			email="login-test@example.com",
			password="test-password-123",
			name="Login Test"
		)

	def test_login_accepts_username(self):
		client = APIClient()
		response = client.post(
			"/api/users/login/",
			{"username": self.user.username, "password": "test-password-123"},
			format="json"
		)

		self.assertEqual(response.status_code, 200)
		self.assertIn("access_token", response.cookies)
		self.assertTrue(response.cookies["access_token"]["httponly"])


	def test_login_accepts_email_case_insensitively(self):
		client = APIClient()
		response = client.post(
			"/api/users/login/",
			{"username": "LOGIN-TEST@EXAMPLE.COM", "password": "test-password-123"},
			format="json"
		)

		self.assertEqual(response.status_code, 200)
		self.assertIn("access_token", response.cookies)


class ProfileTests(TestCase):
	def setUp(self):
		User = get_user_model()
		self.user = User.objects.create_user(
			username="profile-user",
			email="profile@example.com",
			password="test-password-123",
			name="Profile User",
			avatar="avatars/old.png",
		)
		self.client = APIClient()
		self.client.force_authenticate(self.user)

	def test_profile_patch_saves_new_avatar_and_returns_relative_url(self):
		image_data = BytesIO()
		Image.new("RGB", (1, 1), color="red").save(image_data, format="PNG")
		avatar = SimpleUploadedFile(
			"new.png",
			image_data.getvalue(),
			content_type="image/png",
		)

		with tempfile.TemporaryDirectory() as media_root:
			with override_settings(MEDIA_ROOT=media_root):
				response = self.client.patch(
					"/api/users/me/",
					{"avatar": avatar},
					format="multipart",
				)

				self.assertEqual(response.status_code, 200)
				self.assertEqual(response.data["avatar"], "/media/avatars/new.png")
				self.user.refresh_from_db()
				self.assertEqual(self.user.avatar.name, "avatars/new.png")
				self.assertTrue(self.user.avatar.storage.exists(self.user.avatar.name))
