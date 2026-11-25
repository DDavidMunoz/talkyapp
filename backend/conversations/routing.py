from django.urls import path

from .consumers import ConversationConsumer, PresenceConsumer


websocket_urlpatterns = [
    path("ws/conversations/<uuid:conversation_id>/", ConversationConsumer.as_asgi()),
    path("ws/presence/", PresenceConsumer.as_asgi()),
]