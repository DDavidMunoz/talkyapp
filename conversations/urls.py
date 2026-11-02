from django.urls import path
from .views import *

urlpatterns = [
    path("", ConversationListCreateView.as_view(), name="conversation-list-create"),
    path("<uuid:pk>/", ConversationDetailView.as_view(), name="conversation-detail")
]
