from http.cookies import CookieError, SimpleCookie

from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import AuthenticationFailed, InvalidToken


class CookieJWTAuthMiddleware:
    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        scope = dict(scope)
        scope["user"] = await self.get_user(scope)
        return await self.app(scope, receive, send)

    @database_sync_to_async
    def get_user(self, scope):
        cookie_header = next(
            (value.decode("latin1") for key, value in scope.get("headers", [])
             if key.lower() == b"cookie"),
            ""
        )
        cookies = SimpleCookie()
        try:
            cookies.load(cookie_header)
            token = cookies.get("access_token")
            if token is None:
                return AnonymousUser()
            authentication = JWTAuthentication()
            validated_token = authentication.get_validated_token(token.value)
            return authentication.get_user(validated_token)
        except (AuthenticationFailed, InvalidToken, CookieError):
            return AnonymousUser()