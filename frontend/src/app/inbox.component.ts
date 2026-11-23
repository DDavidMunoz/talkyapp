import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from './auth.service';
import { ConversationService } from './conversation.service';

@Component({
  selector: 'app-inbox',
  imports: [RouterLink],
  template: `
    <section class="mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-10">
      <header class="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p class="text-xs font-semibold uppercase tracking-[0.18em] text-violet-300">Tu espacio</p>
          <h1 class="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Conversaciones</h1>
          <p class="mt-2 text-sm text-slate-500">Continúa hablando o encuentra a alguien nuevo.</p>
        </div>
        <a routerLink="/app/people" class="inline-flex w-fit items-center gap-2 rounded-xl bg-violet-600 px-4 py-3 text-sm font-semibold shadow-lg shadow-violet-950/30 transition hover:bg-violet-500">
          <span class="text-lg leading-none">＋</span> Nueva conversación
        </a>
      </header>

      @if (conversations.error()) {
        <div role="alert" class="mt-5 rounded-xl border border-rose-400/20 bg-rose-400/[0.06] px-4 py-3 text-sm text-rose-200">{{ conversations.error() }}</div>
      }

      <div class="mt-8 grid gap-5 lg:grid-cols-[1fr_290px]">
        <div class="rounded-2xl border border-white/[0.07] bg-[#0e1020]">
          <div class="flex flex-col gap-3 border-b border-white/[0.06] px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div><h2 class="font-semibold">Tus chats</h2><p class="mt-1 text-xs text-slate-600">{{ conversations.conversations().length }} conversaciones</p></div>
            <label class="flex min-w-0 items-center gap-2 rounded-lg border border-white/[0.07] bg-[#090b16] px-3 sm:w-56">
              <span class="text-slate-500">⌕</span>
              <input [value]="search()" (input)="updateSearch($event)" type="search" placeholder="Buscar un chat" aria-label="Buscar conversaciones" class="min-w-0 flex-1 bg-transparent py-2 text-xs text-white outline-none placeholder:text-slate-600">
            </label>
          </div>

          @if (conversations.loading()) {
            <div class="space-y-3 p-5 sm:p-6">
              @for (item of [1, 2, 3]; track item) { <div class="h-[68px] animate-pulse rounded-xl bg-white/[0.035]"></div> }
            </div>
          } @else if (conversations.conversations().length === 0) {
            <div class="px-6 py-16 text-center">
              <span class="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-violet-500/10 text-2xl text-violet-300">◉</span>
              <h3 class="mt-5 text-lg font-semibold">Tu bandeja está lista</h3>
              <p class="mx-auto mt-2 max-w-sm text-sm leading-6 text-slate-500">Busca a alguien por su nombre o usuario y abre una conversación en un solo paso.</p>
              <a routerLink="/app/people" class="mt-6 inline-flex rounded-xl border border-violet-400/20 bg-violet-500/10 px-4 py-2.5 text-sm font-semibold text-violet-200 transition hover:bg-violet-500/15">Buscar personas</a>
            </div>
          } @else {
            @if (filteredConversations().length === 0) {
              <div class="px-6 py-12 text-center">
                <p class="text-sm font-medium text-slate-300">No hay chats que coincidan.</p>
                <button type="button" (click)="search.set('')" class="mt-2 text-xs font-semibold text-violet-300 hover:text-violet-200">Limpiar búsqueda</button>
              </div>
            } @else {
              <div class="divide-y divide-white/[0.045]">
                @for (conversation of filteredConversations(); track conversation.id) {
                  <a [routerLink]="['/app/chat', conversation.id]" class="flex items-center gap-4 px-5 py-4 transition hover:bg-white/[0.025] sm:px-6">
                    @if (otherAvatar(conversation); as avatarUrl) {
                      <img [src]="avatarUrl" [alt]="otherMember(conversation)" class="h-11 w-11 shrink-0 rounded-full object-cover">
                    } @else {
                      <span class="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-gradient-to-br from-violet-500/25 to-indigo-500/20 font-semibold text-violet-200">{{ initial(otherMember(conversation)) }}</span>
                    }
                    <span class="min-w-0 flex-1">
                      <span class="block truncate text-sm font-semibold text-slate-100">{{ otherMember(conversation) }}</span>
                      <span class="mt-1 block truncate text-xs" [class.text-slate-300]="conversations.isUnread(conversation, auth.currentUser()?.id)" [class.text-slate-500]="!conversations.isUnread(conversation, auth.currentUser()?.id)">{{ conversations.lastMessagePreview(conversation, auth.currentUser()?.id) }}</span>
                    </span>
                    <span class="flex shrink-0 flex-col items-end gap-1">
                      <span class="text-[10px]" [class.text-violet-300]="conversations.isUnread(conversation, auth.currentUser()?.id)" [class.text-slate-600]="!conversations.isUnread(conversation, auth.currentUser()?.id)">{{ dateLabel(conversation.last_message?.created_at || conversation.updated_at) }}</span>
                      @if (conversations.isUnread(conversation, auth.currentUser()?.id)) {
                        <span class="rounded-full bg-violet-600 px-2 py-0.5 text-[9px] font-bold text-white" aria-label="Mensaje sin leer">NUEVO</span>
                      }
                    </span>
                  </a>
                }
              </div>
            }
          }
        </div>

        <aside class="space-y-4">
          <div class="rounded-2xl border border-white/[0.07] bg-[#0e1020] p-5">
            <span class="grid h-10 w-10 place-items-center rounded-xl bg-violet-500/10 text-violet-300">⌕</span>
            <h2 class="mt-4 font-semibold">¿Primera vez por aquí?</h2>
            <p class="mt-2 text-sm leading-6 text-slate-500">Encuentra personas por nombre o nombre de usuario. No necesitas su número de teléfono.</p>
            <a routerLink="/app/people" class="mt-5 inline-flex text-sm font-semibold text-violet-300 hover:text-violet-200">Explorar personas →</a>
          </div>
          @if (auth.currentUser(); as user) {
            <div class="rounded-2xl border border-violet-400/10 bg-gradient-to-br from-violet-500/[0.09] to-indigo-500/[0.03] p-5">
              <p class="text-xs font-medium text-violet-200">Tu cuenta</p>
              <div class="mt-4 flex items-center gap-3">
                @if (user.avatar) {
                  <img [src]="user.avatar" [alt]="user.name || user.username" class="h-10 w-10 shrink-0 rounded-full object-cover">
                } @else {
                  <span class="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-violet-500/20 font-semibold text-violet-200">{{ initial(user.name || user.username) }}</span>
                }
                <div class="min-w-0"><p class="truncate text-sm font-semibold">{{ user.name || user.username }}</p><p class="truncate text-xs text-slate-500">&#64;{{ user.username }}</p></div>
              </div>
              <a routerLink="/app/profile" class="mt-4 inline-flex text-xs font-semibold text-violet-300 hover:text-violet-200">Ver mi perfil →</a>
            </div>
          }
        </aside>
      </div>
    </section>
  `,
})
export class InboxComponent {
  protected readonly conversations = inject(ConversationService);
  protected readonly auth = inject(AuthService);
  protected readonly search = signal('');
  protected readonly filteredConversations = computed(() => {
    const query = this.search().trim().toLowerCase();
    if (!query) {
      return this.conversations.conversations();
    }
    return this.conversations.conversations().filter((conversation) =>
      this.otherMember(conversation).toLowerCase().includes(query)
    );
  });

  protected updateSearch(event: Event): void {
    const target = event.target;
    if (target instanceof HTMLInputElement) {
      this.search.set(target.value);
    }
  }

  protected otherMember(conversation: { members: { user_id: string; username: string; avatar?: string | null }[] }): string {
    const currentId = this.auth.currentUser()?.id;
    return conversation.members.find((member) => member.user_id !== currentId)?.username ?? 'Conversación';
  }

  protected otherAvatar(conversation: { members: { user_id: string; avatar?: string | null }[] }): string | null {
    const currentId = this.auth.currentUser()?.id;
    return conversation.members.find((member) => member.user_id !== currentId)?.avatar ?? null;
  }

  protected initial(value: string): string {
    return value.trim().charAt(0).toUpperCase() || '?';
  }

  protected dateLabel(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return 'reciente';
    }
    const now = new Date();
    if (date.toDateString() === now.toDateString()) {
      return new Intl.DateTimeFormat('es', {
        hour: '2-digit',
        minute: '2-digit',
      }).format(date);
    }
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Ayer';
    }
    return new Intl.DateTimeFormat('es', {
      day: '2-digit',
      month: 'short',
    }).format(date);
  }
}