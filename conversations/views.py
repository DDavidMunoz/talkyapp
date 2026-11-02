from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from django.db import transaction
from django.shortcuts import get_object_or_404
from django.conf import settings
from django.contrib.auth import get_user_model

from .models import Conversation, ConversationMember
from .serializers import ConversationListSerializer, CreateDirectConversationSerializer, ConversationSerializer


class ConversationListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        conversations = Conversation.objects.filter(
            members__user = request.user
        ).prefetch_related("members__user").order_by("-updated_at").distinct()

        serializer = ConversationListSerializer(conversations, many=True)

        return Response(serializer.data)

    def post(self, request):
        serializer = CreateDirectConversationSerializer(
            data = request.data,
            context={"request": request}
        )

        serializer.is_valid(raise_exception=True)

        other_user_id = serializer.validated_data["user_id"]
        User = get_user_model()

        other_user = get_object_or_404(User, pk=other_user_id)

        conversation = (
            Conversation.objects
            .filter(
                type=Conversation.Type.DIRECT,
                members__user=request.user
            )
            .filter(
                members__user=other_user
            )
            .distinct()
            .first()
        )

        if conversation:
            return Response(ConversationSerializer(conversation).data, status=status.HTTP_200_OK)

        with transaction.atomic():
            conversation = Conversation.objects.create(type = Conversation.Type.DIRECT)

            ConversationMember.objects.bulk_create(
                [
                    ConversationMember(
                        conversation=conversation,
                        user=request.user,
                        role=ConversationMember.Role.MEMBER
                    ),
                    ConversationMember(
                        conversation=conversation,
                        user=other_user,
                        role=ConversationMember.Role.MEMBER
                    )
                ]
            )

        conversation = Conversation.objects.prefetch_related("members__user").get(pk=conversation.pk)

        return Response(
            ConversationSerializer(conversation).data,
            status = status.HTTP_201_CREATED
        )

class ConversationDetailView(APIView):
    permission_classes = [IsAuthenticated]

    def get_conversation(self, request, pk):
        return get_object_or_404(Conversation.objects.prefetch_related("members__user"), pk=pk, members__user=request.user)

    def get(self, request, pk):
        conversation = self.get_conversation(request, pk)
        serializer = ConversationSerializer(conversation)
        return Response(serializer.data)

    def delete(self, request, pk):
        conversation = self.get_conversation(request, pk)
        conversation.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
