from django.contrib.auth import get_user_model, authenticate
from rest_framework import serializers
from rest_framework_simplejwt.token_blacklist.models import OutstandingToken, BlacklistedToken

from rest_framework_simplejwt.serializers import TokenRefreshSerializer
User = get_user_model()

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(
        write_only = True,
        min_length = 8
    )

    class Meta:
        model = User
        fields = [
            "username",
            "email",
            "password",
            "name"
        ]

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)

class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(
        write_only=True,
        min_length=8
    )

    def validate(self, attrs):
        user = authenticate(
            username=attrs["username"],
            password=attrs["password"]
        )

        if user is None:
            raise serializers.ValidationError("Wrong username or password")

        if not user.is_active:
            raise serializers.ValidationError("Inactive account")

        attrs["user"] = user
        return attrs

class ChangePasswordSerializer(serializers.Serializer):
    current_password = serializers.CharField(write_only=True, min_length=8)
    new_password = serializers.CharField(write_only=True, min_length=8)

    def validate_current_password(self, value):
        user = self.context["request"].user
        if not user.check_password(value):
            raise serializers.ValidationError("Incorrect current password")
        return value

    def validate(self, attrs):
        if attrs["current_password"] == attrs["new_password"]:
            raise serializers.ValidationError("New password must be different")

        return attrs

    def save(self, **kwargs):
        user = self.context["request"].user
        user.set_password(self.validated_data["new_password"])
        user.save(update_fields=["password"])
        for token in OutstandingToken.objects.filter(user=user):
            BlacklistedToken.objects.get_or_create(token=token)
        return user


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "name",
            "avatar",
            "bio",
            "last_seen"
        ]

        read_only_fields = [
            "id",
            "username",
            "email",
            "last_seen"
        ]


class UserSearchSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "username", "name", "avatar", "bio", "last_seen"]
        read_only_fields = fields

class ChangeUsernameSerializer(serializers.Serializer):
    current_password = serializers.CharField(write_only=True, min_length=8)
    username = serializers.CharField(max_length=150)

    def validate_current_password(self, value):
        user = self.context["request"].user
        if not user.check_password(value):
            raise serializers.ValidationError("Incorrect current password")
        return value

    def validate_username(self, value):
        user = self.context["request"].user

        if value == user.username:
            raise serializers.ValidationError("New username must be different")

        if User.objects.filter(username=value).exclude(pk=user.pk).exists():
            raise serializers.ValidationError("This username is already in use")

        return value

    def save(self, **kwargs):
        user = self.context["request"].user
        user.username = self.validated_data["username"]
        user.save(update_fields=["username"])
        return user

class ChangeEmailSerializer(serializers.Serializer):
    current_password = serializers.CharField(write_only=True, min_length=8)
    email = serializers.EmailField()

    def validate_current_password(self, value):
        user = self.context["request"].user
        if not user.check_password(value):
            raise serializers.ValidationError("Incorrect current password")

        return value

    def validate_email(self, value):
        user = self.context["request"].user
        if value.lower() == user.email.lower():
            raise serializers.ValidationError("New email must be different")

        if User.objects.filter(email__iexact=value).exclude(pk=user.pk).exists():
            raise serializers.ValidationError("This email is already in use")
        return value

    def save(self, **kwargs):
        user = self.context["request"].user
        user.email = self.validated_data["email"]
        user.save(update_fields=["email"])
        return user

class CookieTokenRefreshSerializer(TokenRefreshSerializer):
    pass
