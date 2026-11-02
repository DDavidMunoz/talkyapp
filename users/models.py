from django.db import models
from django.contrib.auth.models import AbstractUser
import uuid

# Create your models here.

class User(AbstractUser):
    id = models.UUIDField(
        primary_key=True,
        default=uuid.uuid4,
        editable=False
    )

    email = models.EmailField(
        unique=True
    )

    avatar = models.ImageField(
        upload_to="avatars/",
        null=True,
        blank=True,
    )

    bio = models.CharField(
        max_length=160,
        blank=True
    )

    last_seen = models.DateTimeField(
        null=True,
        blank=True
    )

    created_at = models.DateTimeField(
        auto_now_add=True
    )

    name = models.CharField(max_length=100)
    first_name = None
    last_name = None

