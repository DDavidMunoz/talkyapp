from django.urls import path
from .views import *

urlpatterns = [
    path("search/", UserSearchView.as_view(), name="user-search"),
    path("register/", RegisterView.as_view(), name="register"),
    path("login/", LoginView.as_view(), name="login"),
    path("refresh/", RefreshView.as_view(), name="refresh"),
    path("me/", MeView.as_view(), name="me"),
    path("change-password/", ChangePasswordView.as_view(), name="change-password"),
    path("logout/", LogoutView.as_view(), name="logout"),
    path("change-email/", ChangeEmailView.as_view(), name="change-email"),
    path("change-username/", ChangeUsernameView.as_view(), name="change-username")
]
