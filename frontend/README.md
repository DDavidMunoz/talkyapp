# TalkyApp frontend

Interfaz web de TalkyApp construida con Angular y Tailwind CSS. Incluye la página de bienvenida, registro e inicio de sesión, búsqueda de personas, chats directos con archivos, perfil y configuración de la cuenta.

## Desarrollo local

1. Inicia los servicios de datos desde `backend`:

   ```bash
   docker compose up -d
   ```

   Valkey comparte los eventos de chat entre las solicitudes HTTP y los procesos ASGI. El backend usa `redis://127.0.0.1:6379/0` por defecto; si Valkey está en otro host, define `REDIS_URL` en `backend/.env`.

2. Desde `backend`, permite el nombre/IP de la computadora que sirve Angular en `ALLOWED_HOSTS` dentro de `backend/.env`. Incluye los valores locales y reemplaza `192.168.1.50` con la IPv4 de esa computadora:

   ```bash
   ALLOWED_HOSTS=localhost,127.0.0.1,192.168.1.50
   ```

   Inicia Django con Daphne (ASGI es necesario para los WebSockets) y acepta conexiones en la red local:

   ```bash
   .\venv\Scripts\python.exe -m daphne -b 0.0.0.0 -p 8000 backend.asgi:application
   ```

3. Desde `frontend`, instala dependencias si aún no están instaladas e inicia Angular también en la red local:

   ```bash
   npm install
   npm start -- --host 0.0.0.0
   ```

   Abre `http://192.168.1.50:4200` en los dos equipos. El proxy de desarrollo reenvía `/api`, `/media` y `/ws` a Django en `http://127.0.0.1:8000`; Angular y Daphne deben ejecutarse en la misma computadora. Permite los puertos `4200` y `8000` en el firewall de esa computadora.

Las cookies `HttpOnly` se comparten por el mismo origen. Daphne acepta el `Origin` de la interfaz solo si el nombre/IP que se usa en el navegador también aparece en `ALLOWED_HOSTS`. No uses `runserver` para probar chat en tiempo real. En producción, sirve el frontend detrás de un proxy que enrute las solicitudes HTTP y WebSocket al backend ASGI.

## Validación

```bash
npm run build
npm test
```
