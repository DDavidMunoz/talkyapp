import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ConversationService, SearchUser } from './conversation.service';
import { apiErrorMessage } from './api-error';

@Component({
  selector: 'app-people',
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <section class="mx-auto max-w-5xl px-5 py-8 sm:px-8 sm:py-10">
      <div class="mb-7">
        <p class="text-xs font-semibold uppercase tracking-[0.18em] text-violet-300">Personas</p>
        <h1 class="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Encuentra a alguien</h1>
        <p class="mt-2 max-w-xl text-sm leading-6 text-slate-500">Busca por nombre o nombre de usuario. Cuando encuentres a esa persona, abre un chat directo con un solo botón.</p>
      </div>

      <form [formGroup]="form" (ngSubmit)="search()" class="rounded-2xl border border-white/[0.07] bg-[#0e1020] p-4 sm:p-5">
        <label for="people-query" class="mb-2 block text-sm font-medium text-slate-300">Buscar personas</label>
        <div class="flex flex-col gap-3 sm:flex-row">
          <div class="flex min-w-0 flex-1 items-center gap-3 rounded-xl border border-white/10 bg-[#090b16] px-4 focus-within:border-violet-400/50">
            <span class="text-lg text-slate-500">⌕</span>
            <input id="people-query" formControlName="query" autocomplete="off" placeholder="Prueba con un nombre o &#64;usuario" class="min-w-0 flex-1 bg-transparent py-3.5 text-sm text-white outline-none placeholder:text-slate-600">
          </div>
          <button type="submit" [disabled]="loading()" class="inline-flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold transition hover:bg-violet-500 disabled:opacity-60">
            {{ loading() ? 'Buscando…' : 'Buscar' }}
          </button>
        </div>
        <p class="mt-2 text-xs text-slate-600">Escribe al menos 2 caracteres.</p>
      </form>

      @if (errorMessage()) {
        <div role="alert" class="mt-5 rounded-xl border border-rose-400/20 bg-rose-400/[0.06] px-4 py-3 text-sm text-rose-200">{{ errorMessage() }}</div>
      }

      <div class="mt-7">
        @if (hasSearched() && !loading() && results().length > 0) {
          <div class="mb-3 flex items-center justify-between"><h2 class="font-semibold">Resultados</h2><span class="text-xs text-slate-600">{{ results().length }} personas</span></div>
          <div class="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0e1020]">
            @for (person of results(); track person.id) {
              <article class="flex items-center gap-4 border-b border-white/[0.05] px-4 py-4 last:border-b-0 sm:px-5">
                @if (person.avatar) {
                  <img [src]="person.avatar" [alt]="person.name || person.username" class="h-11 w-11 shrink-0 rounded-full object-cover">
                } @else {
                  <span class="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-gradient-to-br from-violet-500/30 to-indigo-500/20 font-semibold text-violet-200">{{ initial(person.name || person.username) }}</span>
                }
                <div class="min-w-0 flex-1">
                  <p class="truncate text-sm font-semibold">{{ person.name || person.username }}</p>
                  <p class="mt-0.5 truncate text-xs text-slate-500">&#64;{{ person.username }}{{ person.last_seen ? ' · ' + lastSeen(person.last_seen) : '' }}</p>
                  @if (person.bio) { <p class="mt-1 truncate text-xs text-slate-400">{{ person.bio }}</p> }
                </div>
                <button type="button" (click)="message(person)" [disabled]="busyUserId() === person.id" class="shrink-0 rounded-xl border border-violet-400/20 bg-violet-500/10 px-3 py-2.5 text-xs font-semibold text-violet-200 transition hover:bg-violet-500/20 disabled:opacity-60 sm:px-4">
                  {{ busyUserId() === person.id ? 'Abriendo…' : 'Mensaje' }}
                </button>
              </article>
            }
          </div>
        } @else if (hasSearched() && !loading()) {
          <div class="rounded-2xl border border-dashed border-white/10 px-6 py-14 text-center">
            <span class="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-white/[0.04] text-xl text-slate-500">⌕</span>
            <h2 class="mt-4 font-semibold">No encontramos coincidencias</h2>
            <p class="mt-2 text-sm text-slate-500">Prueba con otro nombre o nombre de usuario.</p>
          </div>
        } @else if (!hasSearched()) {
          <div class="rounded-2xl border border-white/[0.06] bg-white/[0.02] px-6 py-14 text-center">
            <span class="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-violet-500/10 text-xl text-violet-300">◎</span>
            <h2 class="mt-4 font-semibold">Cada chat empieza con una persona</h2>
            <p class="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">Busca por nombre o &#64;usuario. Tu número de teléfono no es necesario.</p>
          </div>
        }
      </div>
      <a routerLink="/app/inbox" class="mt-6 inline-flex text-sm text-slate-500 transition hover:text-white">← Volver a conversaciones</a>
    </section>
  `,
})
export class PeopleComponent {
  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly router = inject(Router);
  private readonly conversations = inject(ConversationService);
  protected readonly form = this.fb.group({
    query: ['', [Validators.minLength(2)]],
  });
  protected readonly results = signal<SearchUser[]>([]);
  protected readonly loading = signal(false);
  protected readonly hasSearched = signal(false);
  protected readonly errorMessage = signal('');
  protected readonly busyUserId = signal('');

  protected async search(): Promise<void> {
    const query = this.form.controls.query.value.trim().replace(/^@/, '');
    this.errorMessage.set('');
    if (query.length < 2) {
      this.form.controls.query.markAsTouched();
      this.errorMessage.set('Escribe al menos 2 caracteres para buscar.');
      return;
    }
    this.loading.set(true);
    this.hasSearched.set(true);
    try {
      this.results.set(await this.conversations.searchUsers(query));
    } catch (error) {
      this.errorMessage.set(apiErrorMessage(error, 'No se pudo completar la búsqueda.'));
      this.results.set([]);
    } finally {
      this.loading.set(false);
    }
  }

  protected async message(person: SearchUser): Promise<void> {
    this.errorMessage.set('');
    this.busyUserId.set(person.id);
    try {
      const conversation = await this.conversations.startConversation(person.id);
      await this.router.navigate(['/app/chat', conversation.id]);
    } catch (error) {
      this.errorMessage.set(apiErrorMessage(error, 'No se pudo iniciar la conversación.'));
    } finally {
      this.busyUserId.set('');
    }
  }

  protected initial(value: string): string {
    return value.trim().charAt(0).toUpperCase() || '?';
  }

  protected lastSeen(value: string): string {
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? 'última vez recientemente'
      : `visto ${new Intl.DateTimeFormat('es', { dateStyle: 'medium' }).format(date)}`;
  }
}
