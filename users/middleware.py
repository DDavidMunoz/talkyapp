from urllib.parse import parse_qsl
from channels.db import database_sync_to_async
from channels.middleware import BaseMiddleware
from django.contrib.auth.models import AnonymousUser
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.tokens import AccessToken

@database_sync_to_async
def get_user_from_cookie(token):
    try:
        access_token = AccessToken(token)
        user_id = access_token["user_id"]
        User = get_user_model()
        return User.objects.get(id=user_id)
    except Exception:
        return AnonymousUser()

class JWTAuthCookieMiddleware(BaseMiddleware):
    async def __call__(self, scope, receive, send):
        headers = dict(scope.get("headers", []))
        cookie_header = headers.get(b"cookie", b"").decode("utf-8")
        
        access_token = None
        if cookie_header:
            # Extraer el token de la cookie de la petición
            cookies = [c.strip() for c in cookie_header.split(";")]
            for cookie in cookies:
                if cookie.startswith("access_token="):
                    access_token = cookie.split("=", 1)[1]
                    break
        
        if access_token:
            scope["user"] = await get_user_from_cookie(access_token)
        else:
            scope["user"] = AnonymousUser()
            
        return await super().__call__(scope, receive, send)