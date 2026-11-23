import { Component, ElementRef, OnDestroy, OnInit, ViewChild, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { AuthService } from './auth.service';
import { apiErrorMessage } from './api-error';

@Component({
  selector: 'app-profile',
  imports: [ReactiveFormsModule],
  template: `
    <section class="mx-auto max-w-5xl px-5 py-8 sm:px-8 sm:py-10">
      <header class="mb-8">
        <p class="text-xs font-semibold uppercase tracking-[0.18em] text-violet-300">Tu cuenta</p>
        <h1 class="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Mi perfil</h1>
        <p class="mt-2 text-sm text-slate-500">Comparte un poco sobre ti y mantén tu información al día.</p>
      </header>

      @if (errorMessage()) {
        <div role="alert" class="mb-5 rounded-xl border border-rose-400/20 bg-rose-400/[0.06] px-4 py-3 text-sm text-rose-200">{{ errorMessage() }}</div>
      }
      @if (successMessage()) {
        <div role="status" class="mb-5 rounded-xl border border-emerald-400/20 bg-emerald-400/[0.06] px-4 py-3 text-sm text-emerald-200">{{ successMessage() }}</div>
      }

      <div class="grid gap-5 lg:grid-cols-[300px_1fr]">
        <aside class="rounded-2xl border border-white/[0.07] bg-[#0e1020] p-6">
          <div class="flex flex-col items-center text-center">
            <input
              #avatarInput
              type="file"
              accept="image/png,image/jpeg,image/webp"
              class="hidden"
              (change)="onAvatarSelected($event)"
            />

            <div class="relative">
              <button
                type="button"
                (click)="avatarInput.click()"
                class="group relative grid h-24 w-24 overflow-hidden rounded-full border-4 border-[#0e1020] bg-gradient-to-br from-violet-500/35 to-indigo-500/20 text-3xl font-bold text-violet-100 shadow-[0_0_0_1px_rgba(167,139,250,0.2)] transition hover:opacity-90"
                aria-label="Cambiar foto de perfil"
              >
                @if (currentAvatarUrl()) {
                  <img
                    [src]="currentAvatarUrl()"
                    alt="Foto de perfil"
                    class="h-full w-full object-cover"
                  />
                } @else {
                  <span class="grid h-full w-full place-items-center">
                    {{ initial(auth.currentUser()?.name || auth.currentUser()?.username || '') }}
                  </span>
                }
                <span class="absolute inset-0 flex items-center justify-center bg-black/55 text-[11px] font-medium text-white opacity-0 transition group-hover:opacity-100">
                  Cambiar
                </span>
              </button>

              <button
                type="button"
                (click)="avatarInput.click()"
                class="absolute bottom-0 right-0 grid h-7 w-7 place-items-center rounded-full border border-white/10 bg-violet-600 text-xs text-white shadow-md transition hover:bg-violet-500"
                title="Subir foto"
              >
                ✎
              </button>
            </div>

            @if (avatarFile()) {
              <button
                type="button"
                (click)="clearSelectedAvatar()"
                class="mt-2 text-xs text-slate-400 underline hover:text-slate-200"
              >
                Cancelar foto seleccionada
              </button>
            }

            <h2 class="mt-4 text-lg font-semibold">{{ form.controls.name.value || auth.currentUser()?.username }}</h2>
            <p class="mt-1 text-sm text-slate-500">&#64;{{ auth.currentUser()?.username }}</p>
            <p class="mt-4 w-full break-words text-sm leading-6 text-slate-400">{{ form.controls.bio.value || 'Aún no has añadido una descripción.' }}</p>
          </div>

          <div class="mt-6 border-t border-white/[0.06] pt-5">
            <p class="text-[10px] font-semibold uppercase tracking-[0.17em] text-slate-600">Correo electrónico</p>
            <p class="mt-2 break-all text-sm text-slate-300">{{ auth.currentUser()?.email }}</p>
          </div>
          <div class="mt-5 border-t border-white/[0.06] pt-5">
            <p class="text-[10px] font-semibold uppercase tracking-[0.17em] text-slate-600">En TalkyApp desde</p>
            <p class="mt-2 text-sm text-slate-300">Listo para conversar</p>
          </div>
        </aside>

        <div class="rounded-2xl border border-white/[0.07] bg-[#0e1020] p-5 sm:p-7">
          <div class="mb-6">
            <h2 class="text-lg font-semibold">Información personal</h2>
            <p class="mt-1 text-sm text-slate-500">Esta información ayuda a otras personas a conocerte.</p>
          </div>
          <form [formGroup]="form" (ngSubmit)="save()" class="space-y-5">
            <label class="block">
              <span class="mb-2 block text-sm font-medium text-slate-300">Nombre completo</span>
              <input formControlName="name" maxlength="100" autocomplete="name" placeholder="Tu nombre" class="w-full rounded-xl border border-white/10 bg-[#090b16] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-violet-400/50">
              @if (form.controls.name.touched && form.controls.name.invalid) { <span class="mt-1 block text-xs text-rose-300">El nombre es obligatorio (máximo 100 caracteres).</span> }
            </label>
            <label class="block">
              <span class="mb-2 flex items-center justify-between text-sm font-medium text-slate-300"><span>Descripción</span><span class="text-xs font-normal text-slate-600">{{ form.controls.bio.value.length }}/160</span></span>
              <textarea formControlName="bio" maxlength="160" rows="4" placeholder="Cuéntales algo sobre ti…" class="w-full resize-y rounded-xl border border-white/10 bg-[#090b16] px-4 py-3 text-sm leading-6 text-white outline-none transition placeholder:text-slate-600 focus:border-violet-400/50"></textarea>
            </label>
            <div class="rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3.5">
              <div class="flex items-start gap-3"><span class="text-violet-300">◎</span><div><p class="text-sm font-medium text-slate-300">Tu nombre de usuario</p><p class="mt-1 text-xs leading-5 text-slate-500">&#64;{{ auth.currentUser()?.username }} · Puedes cambiarlo en configuración.</p></div></div>
            </div>
            <div class="flex justify-end border-t border-white/[0.06] pt-5">
              <button type="submit" [disabled]="saving()" class="rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold transition hover:bg-violet-500 disabled:opacity-60">{{ saving() ? 'Guardando…' : 'Guardar cambios' }}</button>
            </div>
          </form>
        </div>
      </div>
    </section>
  `,
})
export class ProfileComponent implements OnInit, OnDestroy {
  protected readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder).nonNullable;
  @ViewChild('avatarInput') private avatarInput?: ElementRef<HTMLInputElement>;

  protected readonly saving = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly successMessage = signal('');
  protected readonly avatarFile = signal<File | null>(null);
  protected readonly avatarPreview = signal<string | null>(null);

  protected readonly form = this.fb.group({
    name: ['', [Validators.required, Validators.maxLength(100)]],
    bio: ['', [Validators.maxLength(160)]],
  });

  async ngOnInit(): Promise<void> {
    try {
      const user = await this.auth.refreshProfile();
      this.form.patchValue({ name: user.name, bio: user.bio });
    } catch (error) {
      this.errorMessage.set(apiErrorMessage(error, 'No se pudo cargar tu perfil.'));
    }
  }

  ngOnDestroy(): void {
    this.revokePreview();
  }

  protected currentAvatarUrl(): string | null {
    return this.avatarPreview() || this.auth.currentUser()?.avatar || null;
  }

  protected initial(value: string): string {
    return value.trim().charAt(0).toUpperCase() || '?';
  }

  protected onAvatarSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.errorMessage.set('');
    if (!file) {
      return;
    }
    if (!file.type.startsWith('image/')) {
      this.errorMessage.set('Selecciona un archivo de imagen válido (JPG, PNG o WebP).');
      input.value = '';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      this.errorMessage.set('La imagen no debe superar los 5 MB.');
      input.value = '';
      return;
    }

    this.revokePreview();
    this.avatarFile.set(file);
    this.avatarPreview.set(URL.createObjectURL(file));
  }

  protected clearSelectedAvatar(): void {
    this.revokePreview();
    this.avatarFile.set(null);
    if (this.avatarInput) {
      this.avatarInput.nativeElement.value = '';
    }
  }

  private revokePreview(): void {
    const url = this.avatarPreview();
    if (url) {
      URL.revokeObjectURL(url);
      this.avatarPreview.set(null);
    }
  }

  protected async save(): Promise<void> {
    this.successMessage.set('');
    this.errorMessage.set('');
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    try {
      await this.auth.updateProfile({
        ...this.form.getRawValue(),
        avatar: this.avatarFile(),
      });
      this.clearSelectedAvatar();
      this.successMessage.set('Tu perfil se actualizó correctamente.');
    } catch (error) {
      this.errorMessage.set(apiErrorMessage(error, 'No se pudieron guardar los cambios.'));
    } finally {
      this.saving.set(false);
    }
  }
}