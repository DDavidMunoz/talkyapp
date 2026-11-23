import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from './auth.service';
import { ConversationService } from './conversation.service';
import { apiErrorMessage } from './api-error';

@Component({
  selector: 'app-workspace',
  imports: [RouterLink, RouterLinkActive, RouterOutlet],
  template: `
    <div class="min-h-screen bg-[#080914] text-white md:flex">
      <aside class="flex w-full flex-col border-b border-white/[0.07] bg-[#0d0f1d] md:min-h-screen md:w-[272px] md:shrink-0 md:border-b-0 md:border-r">
        <div class="flex items-center justify-between px-5 py-4 md:px-6 md:py-6">
          <a routerLink="/app/inbox" class="flex items-center gap-3 text-base font-bold tracking-tight">
            <span class="grid h-9 w-9 place-items-center rounded-xl bg-violet-600 shadow-lg shadow-violet-950/50">✦</span>
            Talky<span class="text-violet-300">App</span>
          </a>
          <div class="flex items-center gap-2 md:hidden">
            @if (auth.currentUser(); as user) {
              <a routerLink="/app/profile" [attr.aria-label]="'Perfil de ' + user.username" class="grid h-8 w-8 overflow-hidden place-items-center rounded-full bg-violet-500/20 text-xs font-semibold text-violet-200">
                @if (user.avatar) {
                  <img [src]="user.avatar" [alt]="user.name || user.username" class="h-full w-full object-cover">
                } @else {
                  {{ initial(user.name || user.username) }}
                }
              </a>
            }
            <button type="button" (click)="requestLogout()" aria-label="Cerrar sesión" class="rounded-lg p-2 text-slate-500 transition hover:bg-white/[0.06] hover:text-white">↪</button>
          </div>
        </div>

        <nav class="flex gap-1 overflow-x-auto px-3 pb-3 md:block md:space-y-1 md:px-3">
          <a routerLink="/app/inbox" routerLinkActive="bg-violet-500/10 text-violet-200" class="flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-400 transition hover:bg-white/[0.04] hover:text-white md:w-full">
            <span class="w-5 text-center text-base">▤</span><span>Conversaciones</span>
          </a>
          <a routerLink="/app/people" routerLinkActive="bg-violet-500/10 text-violet-200" class="flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-400 transition hover:bg-white/[0.04] hover:text-white md:w-full">
            <span class="w-5 text-center text-base">⌕</span><span>Buscar personas</span>
          </a>
          <div class="my-4 hidden h-px bg-white/[0.06] md:block"></div>
          <a routerLink="/app/profile" routerLinkActive="bg-violet-500/10 text-violet-200" class="flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-400 transition hover:bg-white/[0.04] hover:text-white md:w-full">
            <span class="w-5 text-center text-base">◎</span><span>Mi perfil</span>
          </a>
          <a routerLink="/app/settings" routerLinkActive="bg-violet-500/10 text-violet-200" class="flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-400 transition hover:bg-white/[0.04] hover:text-white md:w-full">
            <span class="w-5 text-center text-base">⚙</span><span>Configuración</span>
          </a>
        </nav>

        <div class="hidden min-h-0 flex-1 flex-col px-3 pt-7 md:flex">
          <div class="mb-3 flex items-center justify-between px-3">
            <p class="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-600">Tus conversaciones</p>
            <a routerLink="/app/people" aria-label="Iniciar conversación" class="grid h-6 w-6 place-items-center rounded-md text-slate-500 transition hover:bg-white/10 hover:text-white">＋</a>
          </div>
          <div class="min-h-0 flex-1 space-y-1 overflow-y-auto">
            @if (conversations.loading()) {
              <p class="px-3 py-3 text-xs text-slate-600">Cargando conversaciones…</p>
            } @else if (conversations.conversations().length === 0) {
              <div class="mx-2 rounded-xl border border-dashed border-white/[0.08] px-3 py-4">
                <p class="text-xs leading-5 text-slate-500">Tus chats aparecerán aquí.</p>
                <a routerLink="/app/people" class="mt-2 inline-flex text-xs font-semibold text-violet-300 hover:text-violet-200">Encuentra a alguien →</a>
              </div>
            } @else {
              @for (conversation of conversations.conversations(); track conversation.id) {
                <a [routerLink]="['/app/chat', conversation.id]" routerLinkActive="bg-violet-500/10 text-white" class="flex items-center gap-3 rounded-xl px-3 py-2.5 transition hover:bg-white/[0.04]">
                  @if (otherAvatar(conversation); as avatarUrl) {
                    <img [src]="avatarUrl" [alt]="otherMember(conversation)" class="h-9 w-9 shrink-0 rounded-full object-cover">
                  } @else {
                    <span class="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-violet-500/30 to-indigo-500/20 text-xs font-semibold text-violet-200">{{ initial(otherMember(conversation)) }}</span>
                  }
                  <span class="min-w-0 flex-1">
                    <span class="block truncate text-sm font-medium">{{ otherMember(conversation) }}</span>
                    <span class="block truncate text-[11px]" [class.text-slate-600]="!conversations.isUnread(conversation, auth.currentUser()?.id)" [class.text-slate-300]="conversations.isUnread(conversation, auth.currentUser()?.id)">{{ conversations.lastMessagePreview(conversation, auth.currentUser()?.id) }}</span>
                  </span>
                  @if (conversations.isUnread(conversation, auth.currentUser()?.id)) {
                    <span class="h-2 w-2 shrink-0 rounded-full bg-violet-400" aria-label="Mensaje sin leer"></span>
                  }
                </a>
              }
            }
          </div>
          @if (conversations.error()) {
            <p role="alert" class="mx-2 mb-2 text-xs leading-5 text-rose-300">{{ conversations.error() }}</p>
          }
        </div>

        <div class="hidden border-t border-white/[0.06] p-3 md:block">
          @if (auth.currentUser(); as user) {
            <div class="flex items-center gap-3 rounded-xl p-2">
              @if (user.avatar) {
                <img [src]="user.avatar" [alt]="user.name || user.username" class="h-9 w-9 shrink-0 rounded-full object-cover">
              } @else {
                <span class="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-violet-500/20 text-sm font-semibold text-violet-200">{{ initial(user.name || user.username) }}</span>
              }
              <div class="min-w-0 flex-1"><p class="truncate text-sm font-medium">{{ user.name || user.username }}</p><p class="truncate text-xs text-slate-600">&#64;{{ user.username }}</p></div>
              <button type="button" (click)="requestLogout()" aria-label="Cerrar sesión" class="rounded-lg p-2 text-slate-500 transition hover:bg-white/[0.06] hover:text-white">↪</button>
            </div>
          }
        </div>
      </aside>

      <main class="min-w-0 flex-1">
        @if (auth.sessionError()) {
          <div role="alert" class="border-b border-amber-400/20 bg-amber-400/[0.06] px-6 py-3 text-sm text-amber-200">{{ auth.sessionError() }}</div>
        }
        @if (logoutError()) {
          <div role="alert" class="border-b border-rose-400/20 bg-rose-400/[0.06] px-6 py-3 text-sm text-rose-200">{{ logoutError() }}</div>
        }
        <router-outlet />
      </main>
    </div>
    @if (confirmLogout()) {
      <div class="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4 backdrop-blur-sm" (click)="cancelLogout()">
        <section
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="logout-title"
          aria-describedby="logout-description"
          (click)="$event.stopPropagation()"
          (keydown.escape)="cancelLogout()"
          class="w-full max-w-sm rounded-2xl border border-white/10 bg-[#111323] p-6 shadow-2xl shadow-black/60"
        >
          <span class="grid h-11 w-11 place-items-center rounded-xl bg-rose-400/10 text-xl text-rose-300">↪</span>
          <h2 id="logout-title" class="mt-4 text-lg font-semibold">¿Cerrar sesión?</h2>
          <p id="logout-description" class="mt-2 text-sm leading-6 text-slate-400">Tendrás que volver a iniciar sesión para acceder a tus conversaciones.</p>
          @if (logoutError()) {
            <p role="alert" class="mt-4 rounded-lg border border-rose-400/20 bg-rose-400/[0.06] px-3 py-2 text-xs text-rose-200">{{ logoutError() }}</p>
          }
          <div class="mt-6 flex justify-end gap-3">
            <button #cancelLogoutButton type="button" (click)="cancelLogout()" [disabled]="loggingOut()" class="rounded-xl border border-white/10 px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-white/[0.05] disabled:opacity-50">Cancelar</button>
            <button type="button" (click)="logout()" [disabled]="loggingOut()" class="inline-flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-500 disabled:opacity-60">
              @if (loggingOut()) { <span class="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"></span> }
              {{ loggingOut() ? 'Cerrando…' : 'Cerrar sesión' }}
            </button>
          </div>
        </section>
      </div>
    }
  `,
})
export class WorkspaceComponent implements OnInit, OnDestroy {
  protected readonly auth = inject(AuthService);
  protected readonly conversations = inject(ConversationService);
  private readonly router = inject(Router);
  protected readonly logoutError = signal('');
  protected readonly confirmLogout = signal(false);
  protected readonly loggingOut = signal(false);
  @ViewChild('cancelLogoutButton') private cancelLogoutButton?: ElementRef<HTMLButtonElement>;
  private refreshTimer?: number;

  ngOnInit(): void {
    const userId = this.auth.currentUser()?.id;
    if (userId) {
      this.conversations.loadReadState(userId);
    }
    void this.conversations.loadConversations();
    this.refreshTimer = window.setInterval(() => {
      if (document.visibilityState === 'visible') {
        void this.conversations.loadConversations(true);
      }
    }, 5000);
    document.addEventListener('visibilitychange', this.onVisibilityChange);
  }

  ngOnDestroy(): void {
    if (this.refreshTimer !== undefined) {
      window.clearInterval(this.refreshTimer);
    }
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
  }

  private readonly onVisibilityChange = (): void => {
    if (document.visibilityState === 'visible') {
      void this.conversations.loadConversations(true);
    }
  };

  protected requestLogout(): void {
    this.logoutError.set('');
    this.confirmLogout.set(true);
    requestAnimationFrame(() => this.cancelLogoutButton?.nativeElement.focus());
  }

  protected cancelLogout(): void {
    if (this.loggingOut()) {
      return;
    }
    this.confirmLogout.set(false);
    this.logoutError.set('');
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

  protected async logout(): Promise<void> {
    this.logoutError.set('');
    this.loggingOut.set(true);
    try {
      await this.auth.logout();
      this.confirmLogout.set(false);
      await this.router.navigateByUrl('/');
    } catch (error) {
      this.logoutError.set(apiErrorMessage(error, 'No se pudo cerrar la sesión.'));
    } finally {
      this.loggingOut.set(false);
    }
  }
}