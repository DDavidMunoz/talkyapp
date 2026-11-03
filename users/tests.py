from django.contrib.auth import get_user_model
from django.test import TestCase
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
