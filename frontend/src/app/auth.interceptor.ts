import { HttpClient, HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, catchError, filter, finalize, switchMap, take, throwError } from 'rxjs';
import { AuthService } from './auth.service';

let refreshing = false;
const refreshResult = new BehaviorSubject<boolean | null>(null);

export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const http = inject(HttpClient);

  // 1. Clonar la petición para agregar las credenciales (cookies)
  const authRequest = request.clone({
    withCredentials: true
  });

  // 2. Pasar authRequest en lugar de request
  return next(authRequest).pipe(
    catchError((error: unknown) => {
      if (
        !(error instanceof HttpErrorResponse) ||
        error.status !== 401 ||
        /\/(login|register|refresh|logout)\/?$/.test(request.url)
      ) {
        return throwError(() => error);
      }

      if (refreshing) {
        return refreshResult.pipe(
          filter((result): result is boolean => result !== null),
          take(1),
          switchMap((refreshed) =>
            refreshed ? next(authRequest) : throwError(() => error)
          )
        );
      }

      refreshing = true;
      refreshResult.next(null);
      
      return http
        .post('/api/users/refresh/', {}, { withCredentials: true })
        .pipe(
          switchMap(() => {
            refreshResult.next(true);
            return next(authRequest); // Reintentar con la petición clonada
          }),
          catchError((refreshError: unknown) => {
            refreshResult.next(false);
            auth.currentUser.set(null);
            auth.sessionError.set('Tu sesión expiró. Inicia sesión para continuar.');
            void router.navigateByUrl('/login');
            return throwError(() => refreshError);
          }),
          finalize(() => {
            refreshing = false;
          })
        );
    })
  ); // <-- Aquí faltaba el cierre correcto del pipe general
};