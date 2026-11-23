import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { firstValueFrom, catchError, of } from 'rxjs';
import { apiErrorMessage } from './api-error';

export interface User {
  id: string;
  username: string;
  email: string;
  name: string;
  bio: string;
  avatar: string | null;
  last_seen: string | null;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  readonly currentUser = signal<User | null>(null);
  readonly sessionError = signal('');
  private sessionRequest?: Promise<boolean>;

  restoreSession(): Promise<boolean> {
    if (this.currentUser()) {
      return Promise.resolve(true);
    }
    if (this.sessionRequest) {
      return this.sessionRequest;
    }

    this.sessionRequest = firstValueFrom(
      this.http.get<User>('/api/users/me/', { withCredentials: true }).pipe(
        catchError((error: unknown) => {
          if (error instanceof HttpErrorResponse && error.status === 401) {
            return of(null);
          }
          this.sessionError.set(
            apiErrorMessage(error, 'No se pudo comprobar tu sesión.')
          );
          return of(null);
        })
      )
    ).then((user) => {
      this.currentUser.set(user);
      return user !== null;
    });

    return this.sessionRequest;
  }

  async login(username: string, password: string): Promise<void> {
    await firstValueFrom(
      this.http.post(
        '/api/users/login/',
        { username, password },
        { withCredentials: true }
      )
    );
    await this.refreshProfile();
    this.sessionError.set('');
  }

  async register(data: {
    name: string;
    username: string;
    email: string;
    password: string;
  }): Promise<void> {
    await firstValueFrom(
      this.http.post('/api/users/register/', data, {
        withCredentials: true,
      })
    );
    await this.refreshProfile();
    this.sessionError.set('');
  }

  async updateProfile(
      data: Pick<User, 'name' | 'bio'> & { avatar?: File | null }
    ): Promise<void> {
      const body = new FormData();
      body.append('name', data.name);
      body.append('bio', data.bio);
      if (data.avatar) {
        body.append('avatar', data.avatar, data.avatar.name);
      }

      const user = await firstValueFrom(
        this.http.patch<User>('/api/users/me/', body, { withCredentials: true })
      );
      this.currentUser.set(user);
  }
  async refreshProfile(): Promise<User> {
    const user = await firstValueFrom(
      this.http.get<User>('/api/users/me/', { withCredentials: true })
    );
    this.currentUser.set(user);
    return user;
  }

  async changeUsername(username: string, current_password: string): Promise<void> {
    const user = await firstValueFrom(
      this.http.post<User>(
        '/api/users/change-username/',
        { username, current_password },
        { withCredentials: true }
      )
    );
    this.currentUser.set(user);
  }

  async changeEmail(email: string, current_password: string): Promise<void> {
    const user = await firstValueFrom(
      this.http.post<User>(
        '/api/users/change-email/',
        { email, current_password },
        { withCredentials: true }
      )
    );
    this.currentUser.set(user);
  }

  async changePassword(
    current_password: string,
    new_password: string
  ): Promise<void> {
    await firstValueFrom(
      this.http.post(
        '/api/users/change-password/',
        { current_password, new_password },
        { withCredentials: true }
      )
    );
  }

  async logout(): Promise<void> {
    await firstValueFrom(
      this.http.post('/api/users/logout/', {}, { withCredentials: true })
    );
    this.currentUser.set(null);
    this.sessionRequest = undefined;
  }
}

export const authGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return (await auth.restoreSession()) || router.createUrlTree(['/login']);
};
