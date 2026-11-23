import { Component, WritableSignal, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from './auth.service';
import { apiErrorMessage } from './api-error';

@Component({
  selector: 'app-settings',
  imports: [ReactiveFormsModule],
  template: `
    <section class="mx-auto max-w-4xl px-5 py-8 sm:px-8 sm:py-10">
      <header class="mb-8">
        <p class="text-xs font-semibold uppercase tracking-[0.18em] text-violet-300">Tu cuenta</p>
        <h1 class="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Configuración</h1>
        <p class="mt-2 text-sm text-slate-500">Administra tus datos de acceso y mantén tu cuenta segura.</p>
      </header>

      @if (errorMessage()) {
        <div role="alert" class="mb-5 rounded-xl border border-rose-400/20 bg-rose-400/[0.06] px-4 py-3 text-sm text-rose-200">{{ errorMessage() }}</div>
      }
      @if (successMessage()) {
        <div role="status" class="mb-5 rounded-xl border border-emerald-400/20 bg-emerald-400/[0.06] px-4 py-3 text-sm text-emerald-200">{{ successMessage() }}</div>
      }

      <div class="space-y-5">
        <section class="rounded-2xl border border-white/[0.07] bg-[#0e1020] p-5 sm:p-7">
          <div class="mb-5 flex items-start gap-3">
            <span class="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-violet-500/10 text-violet-300">＠</span>
            <div><h2 class="font-semibold">Nombre de usuario</h2><p class="mt-1 text-sm text-slate-500">Así te encuentran otras personas en TalkyApp.</p></div>
          </div>
          <form [formGroup]="usernameForm" (ngSubmit)="saveUsername()" class="grid gap-4 sm:grid-cols-2">
            <label class="block"><span class="mb-2 block text-xs font-medium text-slate-400">Nuevo nombre de usuario</span><input formControlName="username" autocomplete="username" class="w-full rounded-xl border border-white/10 bg-[#090b16] px-4 py-3 text-sm text-white outline-none focus:border-violet-400/50"></label>
            <label class="block"><span class="mb-2 block text-xs font-medium text-slate-400">Confirma con tu contraseña actual</span><input formControlName="current_password" type="password" autocomplete="current-password" class="w-full rounded-xl border border-white/10 bg-[#090b16] px-4 py-3 text-sm text-white outline-none focus:border-violet-400/50"></label>
            <div class="flex justify-end sm:col-span-2"><button type="submit" [disabled]="usernameSaving()" class="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-white/[0.05] disabled:opacity-50">{{ usernameSaving() ? 'Guardando…' : 'Actualizar usuario' }}</button></div>
          </form>
        </section>

        <section class="rounded-2xl border border-white/[0.07] bg-[#0e1020] p-5 sm:p-7">
          <div class="mb-5 flex items-start gap-3">
            <span class="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-indigo-500/10 text-indigo-300">✉</span>
            <div><h2 class="font-semibold">Correo electrónico</h2><p class="mt-1 text-sm text-slate-500">Actualiza el correo asociado a tu cuenta.</p></div>
          </div>
          <form [formGroup]="emailForm" (ngSubmit)="saveEmail()" class="grid gap-4 sm:grid-cols-2">
            <label class="block"><span class="mb-2 block text-xs font-medium text-slate-400">Nuevo correo electrónico</span><input formControlName="email" type="email" autocomplete="email" class="w-full rounded-xl border border-white/10 bg-[#090b16] px-4 py-3 text-sm text-white outline-none focus:border-violet-400/50"></label>
            <label class="block"><span class="mb-2 block text-xs font-medium text-slate-400">Confirma con tu contraseña actual</span><input formControlName="current_password" type="password" autocomplete="current-password" class="w-full rounded-xl border border-white/10 bg-[#090b16] px-4 py-3 text-sm text-white outline-none focus:border-violet-400/50"></label>
            <div class="flex justify-end sm:col-span-2"><button type="submit" [disabled]="emailSaving()" class="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-semibold text-slate-200 transition hover:bg-white/[0.05] disabled:opacity-50">{{ emailSaving() ? 'Guardando…' : 'Actualizar correo' }}</button></div>
          </form>
        </section>

        <section class="rounded-2xl border border-white/[0.07] bg-[#0e1020] p-5 sm:p-7">
          <div class="mb-5 flex items-start gap-3">
            <span class="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-500/10 text-emerald-300">⌑</span>
            <div><h2 class="font-semibold">Contraseña</h2><p class="mt-1 text-sm text-slate-500">Elige una contraseña segura de al menos 8 caracteres.</p></div>
          </div>
          <form [formGroup]="passwordForm" (ngSubmit)="savePassword()" class="grid gap-4 sm:grid-cols-2">
            <label class="block"><span class="mb-2 block text-xs font-medium text-slate-400">Contraseña actual</span><input formControlName="current_password" type="password" autocomplete="current-password" class="w-full rounded-xl border border-white/10 bg-[#090b16] px-4 py-3 text-sm text-white outline-none focus:border-violet-400/50"></label>
            <label class="block"><span class="mb-2 block text-xs font-medium text-slate-400">Nueva contraseña</span><input formControlName="new_password" type="password" autocomplete="new-password" class="w-full rounded-xl border border-white/10 bg-[#090b16] px-4 py-3 text-sm text-white outline-none focus:border-violet-400/50"></label>
            <div class="flex justify-end sm:col-span-2"><button type="submit" [disabled]="passwordSaving()" class="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold transition hover:bg-violet-500 disabled:opacity-50">{{ passwordSaving() ? 'Actualizando…' : 'Cambiar contraseña' }}</button></div>
          </form>
        </section>

        <div class="rounded-xl border border-white/[0.05] bg-white/[0.02] px-4 py-3.5">
          <p class="text-xs leading-5 text-slate-500">Para cambiar tu nombre visible o tu descripción, visita <a href="/app/profile" class="font-medium text-violet-300 hover:text-violet-200">Mi perfil</a>.</p>
        </div>
      </div>
    </section>
  `,
})
export class SettingsComponent {
  private readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder).nonNullable;
  protected readonly usernameSaving = signal(false);
  protected readonly emailSaving = signal(false);
  protected readonly passwordSaving = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly successMessage = signal('');
  protected readonly usernameForm = this.fb.group({
    username: [this.auth.currentUser()?.username ?? '', [Validators.required, Validators.maxLength(150)]],
    current_password: ['', [Validators.required, Validators.minLength(8)]],
  });
  protected readonly emailForm = this.fb.group({
    email: [this.auth.currentUser()?.email ?? '', [Validators.required, Validators.email]],
    current_password: ['', [Validators.required, Validators.minLength(8)]],
  });
  protected readonly passwordForm = this.fb.group({
    current_password: ['', [Validators.required, Validators.minLength(8)]],
    new_password: ['', [Validators.required, Validators.minLength(8)]],
  });

  protected async saveUsername(): Promise<void> {
    const form = this.usernameForm;
    if (form.invalid) {
      form.markAllAsTouched();
      return;
    }
    this.beginUpdate(this.usernameSaving);
    try {
      const { username, current_password } = form.getRawValue();
      await this.auth.changeUsername(username.trim(), current_password);
      form.controls.current_password.reset();
      this.successMessage.set('Tu nombre de usuario se actualizó correctamente.');
    } catch (error) {
      this.errorMessage.set(apiErrorMessage(error, 'No se pudo actualizar el nombre de usuario.'));
    } finally {
      this.usernameSaving.set(false);
    }
  }

  protected async saveEmail(): Promise<void> {
    const form = this.emailForm;
    if (form.invalid) {
      form.markAllAsTouched();
      return;
    }
    this.beginUpdate(this.emailSaving);
    try {
      const { email, current_password } = form.getRawValue();
      await this.auth.changeEmail(email.trim(), current_password);
      form.controls.current_password.reset();
      this.successMessage.set('Tu correo electrónico se actualizó correctamente.');
    } catch (error) {
      this.errorMessage.set(apiErrorMessage(error, 'No se pudo actualizar el correo electrónico.'));
    } finally {
      this.emailSaving.set(false);
    }
  }

  protected async savePassword(): Promise<void> {
    const form = this.passwordForm;
    if (form.invalid) {
      form.markAllAsTouched();
      return;
    }
    this.beginUpdate(this.passwordSaving);
    try {
      const { current_password, new_password } = form.getRawValue();
      await this.auth.changePassword(current_password, new_password);
      form.reset();
      this.successMessage.set('Tu contraseña se actualizó. Si vuelves a iniciar sesión, usa la nueva contraseña.');
    } catch (error) {
      this.errorMessage.set(apiErrorMessage(error, 'No se pudo cambiar la contraseña.'));
    } finally {
      this.passwordSaving.set(false);
    }
  }

  private beginUpdate(state: WritableSignal<boolean>): void {
    this.errorMessage.set('');
    this.successMessage.set('');
    state.set(true);
  }
}
