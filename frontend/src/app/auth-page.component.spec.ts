import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { afterEach, describe, expect, it } from 'vitest';
import { AuthPageComponent } from './auth-page.component';
import { AuthService } from './auth.service';

describe('AuthPageComponent', () => {
  afterEach(() => {
    TestBed.inject(HttpTestingController).verify();
  });

  it('submits login without requiring the hidden registration fields', async () => {
    await TestBed.configureTestingModule({
      imports: [AuthPageComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: 'app', children: [] }]),
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(AuthPageComponent);
    fixture.detectChanges();

    const username = fixture.nativeElement.querySelector(
      '[formControlName="username"]'
    ) as HTMLInputElement;
    const password = fixture.nativeElement.querySelector(
      '[formControlName="password"]'
    ) as HTMLInputElement;
    username.value = 'testuser';
    username.dispatchEvent(new Event('input', { bubbles: true }));
    password.value = 'test-password-123';
    password.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
    fixture.nativeElement.querySelector('form').dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true })
    );

    const request = TestBed.inject(HttpTestingController).expectOne(
      '/api/users/login/'
    );
    expect(request.request.body).toEqual({
      username: 'testuser',
      password: 'test-password-123',
    });
    request.flush({
      message: 'Successfull login',
      user: {
        id: '00000000-0000-0000-0000-000000000001',
        username: 'testuser',
        email: 'test@example.com',
      },
    });
    await Promise.resolve();

    const profileRequest = TestBed.inject(HttpTestingController).expectOne(
      '/api/users/me/'
    );
    profileRequest.flush({
      id: '00000000-0000-0000-0000-000000000001',
      username: 'testuser',
      email: 'test@example.com',
      name: 'Test User',
      bio: '',
      avatar: '/media/avatars/test-user.png',
      last_seen: null,
    });
    await fixture.whenStable();

    expect(TestBed.inject(Router).url).toBe('/app');
    expect(TestBed.inject(AuthService).currentUser()?.avatar).toBe(
      '/media/avatars/test-user.png'
    );
  });
});
