from rest_framework.response import Response
from rest_framework.views import APIView
from django.conf import settings
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework_simplejwt.exceptions import TokenError
from django.contrib.auth import get_user_model
from django.db.models import Q

from .serializers import ChangeEmailSerializer, ChangePasswordSerializer, ChangeUsernameSerializer, CookieTokenRefreshSerializer, LoginSerializer, RegisterSerializer, UserSerializer, UserSearchSerializer
# Create your views here.

def set_auth_cookies(response, refresh):
    access = refresh.access_token

    response.set_cookie(
        key="access_token",
        value=str(access),
        httponly=True,
        secure=not settings.DEBUG,
        samesite="Lax",
    )
    response.set_cookie(
        key="refresh_token",
        value=str(refresh),
        httponly=True,
        secure=not settings.DEBUG,
        samesite="Lax",
    )

class RefreshView(APIView):
    permission_classes=[AllowAny]
    authentication_classes=[]

    def post(self, request):
        refresh_token = request.COOKIES.get("refresh_token")
        if not refresh_token:
            return Response({
                "detail": "Refresh token not found"
            }, status = status.HTTP_401_UNAUTHORIZED)

        try:
           serializer = CookieTokenRefreshSerializer(data = {"refresh": refresh_token})
           serializer.is_valid(raise_exception=True)
        except TokenError:
            response = Response({
                "detail": "refresh token is invalid or blacklisted"
            }, status=status.HTTP_401_UNAUTHORIZED)
            response.delete_cookie(key="access_token", samesite="Lax")
            response.delete_cookie(key="refresh_token", samesite="Lax")
            return response

        response = Response({
            "message": "Token renewed correctly"
        }, status = status.HTTP_200_OK)

        response.set_cookie(
            key = "access_token",
            value = serializer.validated_data["access"],
            httponly=True,
            secure = not settings.DEBUG,
            samesite="Lax"
        )


        response.set_cookie(
            key = "refresh_token",
            value = serializer.validated_data["refresh"],
            httponly=True,
            secure = not settings.DEBUG,
            samesite="Lax"
        )


        return response

class RegisterView(APIView):
    permission_classes=[AllowAny]
    authentication_classes=[]
    def post(self, request):
        serializer = RegisterSerializer(data=request.data)

        serializer.is_valid(raise_exception=True)

        user = serializer.save()

        refresh = RefreshToken.for_user(user)

        response = Response(
            {
                "message": "User registered succesfully",
                "user": {
                    "id": str(user.id),
                    "username": user.username, 
                    "email": user.email
                }
            },
            status = status.HTTP_201_CREATED
        )

        set_auth_cookies(response, refresh)
        return response


class LoginView(APIView):
    permission_classes=[AllowAny]
    authentication_classes=[]
    def post(self, request):
        serializer = LoginSerializer(data=request.data)

        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]
        refresh = RefreshToken.for_user(user)
        response = Response(
            {
                "message": "Successfull login",
                "user": {
                    "id": str(user.id),
                    "username": user.username,
                    "email": user.email
                }
            }
        )

        set_auth_cookies(response, refresh)
        return response

class MeView(APIView):
    permission_classes = [IsAuthenticated]
    def get(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)

    def patch(self, request):
        serializer = UserSerializer(
            request.user,
            data = request.data,
            partial = True
        )

        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)

class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(
            data = request.data,
            context = {"request": request}
        )

        serializer.is_valid(raise_exception=True)

        serializer.save()

        return Response({
            "message": "Password changed successfully"
        })

class LogoutView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        refresh_token = request.COOKIES.get("refresh_token")

        if refresh_token:
            try:
                refresh = RefreshToken(refresh_token)
                refresh.blacklist()

            except TokenError:
                pass
        response = Response({"message": "Logout successful"}, status=status.HTTP_200_OK)

        response.delete_cookie(key="access_token", samesite="Lax")
        response.delete_cookie(key="refresh_token", samesite="Lax")
        return response

class ChangeUsernameView(APIView):
    permission_classes = [IsAuthenticated]
    def post(self, request):
        serializer = ChangeUsernameSerializer(data = request.data, context={"request": request})

        serializer.is_valid(raise_exception=True)

        user = serializer.save()

        return Response(UserSerializer(user).data, status=status.HTTP_200_OK)

class ChangeEmailView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ChangeEmailSerializer(data = request.data, context={"request": request})

        serializer.is_valid(raise_exception=True)

        user = serializer.save()

        return Response(UserSerializer(user).data, status=status.HTTP_200_OK)


class UserSearchView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        query = request.query_params.get("q", "").strip()
        if len(query) < 2:
            return Response({"detail": "Search query must contain at least 2 characters"}, status=status.HTTP_400_BAD_REQUEST)

        User = get_user_model()
        users = User.objects.filter(
            Q(username__icontains=query) | Q(name__icontains=query)
        ).exclude(pk=request.user.pk).order_by("username")[:20]
        return Response(UserSearchSerializer(
            users,
            many=True,
            context={"request": request}
        ).data)



