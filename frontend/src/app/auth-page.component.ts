import { Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from './auth.service';
import { apiErrorMessage } from './api-error';

@Component({
  selector: 'app-auth-page',
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <main class="min-h-screen bg-[#080914] text-white">
      <div class="grid min-h-screen lg:grid-cols-[0.9fr_1.1fr]">
        <section class="relative hidden overflow-hidden border-r border-white/[0.06] bg-[#0b0d1a] p-12 lg:flex lg:flex-col lg:justify-between xl:p-16">
          <div class="absolute -left-40 top-1/4 h-96 w-96 rounded-full bg-violet-700/15 blur-[120px]"></div>
          <a routerLink="/" class="relative flex w-fit items-center gap-3 text-lg font-bold">
            <span class="grid h-10 w-10 place-items-center rounded-xl bg-violet-600 text-lg">✦</span>
            Talky<span class="text-violet-300">App</span>
          </a>
          <div class="relative max-w-lg">
            <p class="text-xs font-semibold uppercase tracking-[0.22em] text-violet-300">Tu espacio para conversar</p>
            <h1 class="mt-5 text-5xl font-bold leading-tight tracking-tight">Las mejores conversaciones empiezan con un hola.</h1>
            <p class="mt-5 max-w-md text-base leading-7 text-slate-400">Encuentra personas, comparte archivos y mantén la conversación en marcha.</p>
            <div class="mt-10 space-y-3">
              @for (item of highlights; track item.title) {
                <div class="flex items-center gap-4 rounded-xl border border-white/[0.06] bg-white/[0.025] p-4">
                  <span class="grid h-10 w-10 place-items-center rounded-lg bg-violet-500/10 text-violet-300">{{ item.icon }}</span>
                  <div><p class="text-sm font-semibold">{{ item.title }}</p><p class="mt-0.5 text-xs text-slate-500">{{ item.description }}</p></div>
                </div>
              }
            </div>
          </div>
          <p class="relative text-xs text-slate-600">TalkyApp · Mensajería simple para PC</p>
        </section>

        <section class="flex min-h-screen flex-col px-5 py-6 sm:px-10 lg:px-14 xl:px-24">
          <div class="flex items-center justify-between lg:justify-end">
            <a routerLink="/" class="flex items-center gap-2 font-bold lg:hidden"><span class="grid h-8 w-8 place-items-center rounded-lg bg-violet-600">✦</span>Talky<span class="text-violet-300">App</span></a>
            <a routerLink="/" class="text-sm text-slate-500 transition hover:text-white">← Volver al inicio</a>
          </div>
          <div class="mx-auto my-auto w-full max-w-md py-12">
            <div class="mb-8">
              <span class="grid h-12 w-12 place-items-center rounded-2xl bg-violet-500/10 text-2xl text-violet-300">{{ isRegister ? '✦' : '↗' }}</span>
              <h2 class="mt-6 text-3xl font-bold tracking-tight">{{ isRegister ? 'Crea tu cuenta' : 'Qué bueno verte' }}</h2>
              <p class="mt-2 text-sm leading-6 text-slate-400">{{ isRegister ? 'Únete a TalkyApp y empieza a conversar.' : 'Inicia sesión para continuar en TalkyApp.' }}</p>
            </div>

            @if (auth.sessionError()) {
              <div role="alert" class="mb-5 rounded-xl border border-amber-400/20 bg-amber-400/[0.07] px-4 py-3 text-sm text-amber-200">{{ auth.sessionError() }}</div>
            }
            @if (errorMessage()) {
              <div role="alert" class="mb-5 rounded-xl border border-rose-400/20 bg-rose-400/[0.07] px-4 py-3 text-sm text-rose-200">{{ errorMessage() }}</div>
            }

            <form [formGroup]="form" (ngSubmit)="submit()" class="space-y-4">
              @if (isRegister) {
                <label class="block">
                  <span class="mb-2 block text-sm font-medium text-slate-300">Nombre completo</span>
                  <input formControlName="name" autocomplete="name" placeholder="¿Cómo te llamas?" class="w-full rounded-xl border border-white/10 bg-[#101222] px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-violet-400/60 focus:ring-4 focus:ring-violet-500/10">
                  @if (form.controls.name.touched && form.controls.name.invalid) { <span class="mt-1 block text-xs text-rose-300">Escribe tu nombre.</span> }
                </label>
                <label class="block">
                  <span class="mb-2 block text-sm font-medium text-slate-300">Correo electrónico</span>
                  <input formControlName="email" type="email" autocomplete="email" placeholder="tu@correo.com" class="w-full rounded-xl border border-white/10 bg-[#101222] px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-violet-400/60 focus:ring-4 focus:ring-violet-500/10">
                  @if (form.controls.email.touched && form.controls.email.invalid) { <span class="mt-1 block text-xs text-rose-300">Escribe un correo válido.</span> }
                </label>
              }
              <label class="block">
                <span class="mb-2 block text-sm font-medium text-slate-300">{{ isRegister ? 'Nombre de usuario' : 'Usuario o correo electrónico' }}</span>
                <div class="flex items-center rounded-xl border border-white/10 bg-[#101222] px-4 transition focus-within:border-violet-400/60 focus-within:ring-4 focus-within:ring-violet-500/10">
                  @if (isRegister) { <span class="mr-2 text-slate-500">&#64;</span> }
                  <input formControlName="username" autocomplete="username" [attr.type]="!isRegister && form.controls.username.value.includes('@') ? 'email' : 'text'" [attr.inputmode]="!isRegister && form.controls.username.value.includes('@') ? 'email' : null" [placeholder]="isRegister ? 'tuusuario' : 'tuusuario@correo.com'" class="min-w-0 flex-1 bg-transparent py-3.5 text-sm text-white outline-none placeholder:text-slate-600">
                </div>
                @if (form.controls.username.touched && form.controls.username.invalid) { <span class="mt-1 block text-xs text-rose-300">El nombre de usuario es obligatorio.</span> }
              </label>
              <label class="block">
                <span class="mb-2 block text-sm font-medium text-slate-300">Contraseña</span>
                <input formControlName="password" type="password" [autocomplete]="isRegister ? 'new-password' : 'current-password'" placeholder="Mínimo 8 caracteres" class="w-full rounded-xl border border-white/10 bg-[#101222] px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-violet-400/60 focus:ring-4 focus:ring-violet-500/10">
                @if (form.controls.password.touched && form.controls.password.invalid) { <span class="mt-1 block text-xs text-rose-300">La contraseña debe tener al menos 8 caracteres.</span> }
              </label>
              @if (isRegister) {
                <label class="block">
                  <span class="mb-2 block text-sm font-medium text-slate-300">Confirma tu contraseña</span>
                  <input formControlName="confirmPassword" type="password" autocomplete="new-password" placeholder="Repite tu contraseña" class="w-full rounded-xl border border-white/10 bg-[#101222] px-4 py-3.5 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-violet-400/60 focus:ring-4 focus:ring-violet-500/10">
                  @if (form.controls.confirmPassword.touched && form.controls.confirmPassword.value !== form.controls.password.value) { <span class="mt-1 block text-xs text-rose-300">Las contraseñas no coinciden.</span> }
                </label>
                <p class="text-xs leading-5 text-slate-500">Tu cuenta se crea con tu nombre, usuario y correo. No necesitas un número de teléfono.</p>
              } @else {
                <p class="text-xs text-slate-500">Puedes usar tu nombre de usuario o correo electrónico.</p>
              }
              <button type="submit" [disabled]="loading()" class="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-3.5 text-sm font-semibold shadow-lg shadow-violet-950/40 transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-60">
                @if (loading()) { <span class="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"></span> }
                {{ loading() ? 'Un momento…' : (isRegister ? 'Crear cuenta' : 'Iniciar sesión') }}
              </button>
            </form>

            <p class="mt-7 text-center text-sm text-slate-500">
              {{ isRegister ? '¿Ya tienes una cuenta?' : '¿Todavía no tienes cuenta?' }}
              <a [routerLink]="isRegister ? '/login' : '/register'" class="ml-1 font-semibold text-violet-300 hover:text-violet-200">{{ isRegister ? 'Inicia sesión' : 'Regístrate' }}</a>
            </p>
          </div>
        </section>
      </div>
    </main>
  `,
})
export class AuthPageComponent {
  protected readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  protected readonly isRegister = this.route.snapshot.data['mode'] === 'register';
  protected readonly loading = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly highlights = [
    { icon: '◉', title: 'Conversaciones directas', description: 'Un chat para cada persona.' },
    { icon: '↗', title: 'Archivos en el chat', description: 'Comparte documentos con facilidad.' },
    { icon: 'ϟ', title: 'Mensajes en tiempo real', description: 'La conversación sigue su ritmo.' },
  ];
  protected readonly form = this.fb.group({
    name: [
      '',
      this.isRegister ? [Validators.required, Validators.maxLength(100)] : [],
    ],
    username: ['', [Validators.required, Validators.maxLength(150)]],
    email: [
      '',
      this.isRegister ? [Validators.required, Validators.email] : [],
    ],
    password: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: [''],
  });

  protected async submit(): Promise<void> {
    this.errorMessage.set('');
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    if (this.isRegister && value.password !== value.confirmPassword) {
      this.form.controls.confirmPassword.markAsTouched();
      this.errorMessage.set('Las contraseñas no coinciden.');
      return;
    }

    this.loading.set(true);
    try {
      if (this.isRegister) {
        await this.auth.register({
          name: value.name.trim(),
          username: value.username.trim(),
          email: value.email.trim(),
          password: value.password,
        });
      } else {
        await this.auth.login(value.username.trim(), value.password);
      }
      await this.router.navigateByUrl('/app');
    } catch (error) {
      this.errorMessage.set(
        apiErrorMessage(
          error,
          error instanceof HttpErrorResponse && error.status === 400
            ? this.isRegister
              ? 'Revisa los datos ingresados.'
              : 'No pudimos iniciar sesión. Revisa tu usuario o correo y tu contraseña.'
            : this.isRegister
              ? 'No se pudo crear tu cuenta.'
              : 'No se pudo iniciar sesión.'
        )
      );
    } finally {
      this.loading.set(false);
    }
  }
}
