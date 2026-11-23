from django.urls import path
from .views import *

urlpatterns = [
    path("", ConversationListCreateView.as_view(), name="conversation-list-create"),
    path("<uuid:conversation_id>/messages/", ConversationMessagesView.as_view(), name="conversation-messages"),
    path("<uuid:conversation_id>/messages/<uuid:pk>/file/", MessageAttachmentView.as_view(), name="message-attachment"),
    path("<uuid:pk>/", ConversationDetailView.as_view(), name="conversation-detail")
]
