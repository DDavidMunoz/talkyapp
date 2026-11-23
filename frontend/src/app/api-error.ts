import { HttpErrorResponse } from '@angular/common/http';

export function apiErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof HttpErrorResponse)) {
    return fallback;
  }

  if (error.status === 0) {
    return 'No se pudo conectar con TalkyApp. Comprueba que el servidor esté activo e inténtalo de nuevo.';
  }
  if (error.status >= 500) {
    return 'El servidor de TalkyApp no está disponible en este momento. Inténtalo de nuevo más tarde.';
  }

  const body: unknown = error.error;
  if (typeof body === 'string' && body.trim() && !body.trimStart().startsWith('<')) {
    return translateApiMessage(body);
  }

  if (body && typeof body === 'object') {
    const values = Object.values(body);
    for (const value of values) {
      if (typeof value === 'string' && value.trim()) {
        return translateApiMessage(value);
      }
      if (Array.isArray(value) && typeof value[0] === 'string') {
        return translateApiMessage(value[0]);
      }
    }
  }

  return fallback;
}

function translateApiMessage(message: string): string {
  const normalized = message.trim().toLowerCase();
  if (normalized === 'wrong username or password') {
    return 'El usuario o correo y la contraseña no coinciden.';
  }
  if (normalized === 'inactive account') {
    return 'Esta cuenta está desactivada.';
  }
  return message;
}
