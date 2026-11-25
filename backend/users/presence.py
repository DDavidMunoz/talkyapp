from datetime import timedelta

from django.utils import timezone


ONLINE_WINDOW = timedelta(seconds=45)


def is_user_online(user):
    return bool(user.last_seen and user.last_seen >= timezone.now() - ONLINE_WINDOW)
