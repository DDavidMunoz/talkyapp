import {
  AfterViewInit,
  Component,
  DestroyRef,
  ElementRef,
  OnDestroy,
  ViewChild,
  inject,
  signal,
  computed,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from './auth.service';
import {
  ChatMessage,
  Conversation,
  ConversationService,
} from './conversation.service';
import { apiErrorMessage } from './api-error';

function isChatMessage(value: unknown): value is ChatMessage {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const message = value as Record<string, unknown>;
  return (
    typeof message['id'] === 'string' &&
    typeof message['conversation'] === 'string' &&
    typeof message['sender_id'] === 'string' &&
    typeof message['content'] === 'string' &&
    typeof message['created_at'] === 'string'
  );
}

@Component({
  selector: 'app-chat',
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <section class="flex h-[calc(100dvh-120px)] min-h-[480px] flex-col md:h-screen">
      <header class="flex items-center gap-3 border-b border-white/[0.07] px-4 py-4 sm:px-7">
        <a routerLink="/app/inbox" aria-label="Volver a conversaciones" class="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-slate-400 transition hover:bg-white/[0.06] hover:text-white md:hidden">←</a>
        @if (contactAvatar(); as avatarUrl) {
          <img [src]="avatarUrl" [alt]="contactName()" class="h-10 w-10 shrink-0 rounded-full object-cover">
        } @else {
          <span class="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-violet-500/30 to-indigo-500/20 font-semibold text-violet-200">{{ initial(contactName()) }}</span>
        }
        <div class="min-w-0 flex-1">
          <h1 class="truncate text-sm font-semibold">{{ contactName() }}</h1>
          <p class="mt-0.5 flex items-center gap-1.5 text-xs text-emerald-300">
            <span class="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
            En línea
          </p>
        </div>
        <span class="hidden rounded-lg border border-white/[0.07] px-3 py-2 text-xs text-slate-500 sm:inline-flex">Chat directo</span>
      </header>

      @if (errorMessage()) {
        <div role="alert" class="mx-4 mt-4 rounded-xl border border-rose-400/20 bg-rose-400/[0.06] px-4 py-3 text-sm text-rose-200 sm:mx-7">{{ errorMessage() }}</div>
      }

      <div #messageList class="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-7 sm:py-7">
        @if (loading()) {
          <div class="flex h-full flex-col items-center justify-center gap-3 text-sm text-slate-500">
            <span class="h-6 w-6 animate-spin rounded-full border-2 border-violet-400/20 border-t-violet-400"></span>
            Cargando conversación…
          </div>
        } @else if (messages().length === 0) {
          <div class="flex h-full flex-col items-center justify-center text-center">
            <span class="grid h-14 w-14 place-items-center rounded-2xl border border-white/[0.06] bg-white/[0.025] text-2xl text-violet-300">◉</span>
            <h2 class="mt-4 font-semibold">Di hola a {{ contactName() }}</h2>
            <p class="mt-2 max-w-xs text-sm leading-6 text-slate-500">Esta es una conversación nueva. Envía un mensaje o comparte un archivo para empezar.</p>
          </div>
        } @else {
          <div class="mx-auto flex max-w-3xl flex-col gap-4">
            <p class="mb-2 text-center text-[11px] text-slate-600">Esta conversación es entre tú y {{ contactName() }}.</p>
            @for (message of messages(); track message.id) {
              <article class="flex max-w-[88%] flex-col gap-1 sm:max-w-[75%]" [class.self-end]="message.sender_id === auth.currentUser()?.id" [class.self-start]="message.sender_id !== auth.currentUser()?.id">
                @if (message.sender_id !== auth.currentUser()?.id) {
                  <span class="px-1 text-[11px] font-medium text-violet-300">{{ message.sender_username }}</span>
                }
                <div [class]="message.sender_id === auth.currentUser()?.id ? 'rounded-2xl rounded-br-md bg-gradient-to-br from-violet-600 to-indigo-600 px-4 py-3 text-sm leading-6 text-white' : 'rounded-2xl rounded-bl-md border border-white/[0.06] bg-[#141729] px-4 py-3 text-sm leading-6 text-slate-200'">
                  @if (message.content) { <p class="whitespace-pre-wrap break-words">{{ message.content }}</p> }
                  @if (message.file_name) {
                    <a [href]="conversations.attachmentUrl(message.conversation, message.id)" [download]="message.file_name" class="mt-2 flex items-center gap-3 rounded-xl border border-white/10 bg-black/10 px-3 py-2.5 transition hover:bg-black/20">
                      <span class="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white/10 text-lg">↧</span>
                      <span class="min-w-0 flex-1"><span class="block max-w-[200px] truncate text-xs font-semibold">{{ message.file_name }}</span><span class="mt-0.5 block text-[10px] opacity-70">Descargar archivo</span></span>
                    </a>
                  }
                </div>
                <time class="px-1 text-[10px] text-slate-600" [class.text-right]="message.sender_id === auth.currentUser()?.id">{{ timeLabel(message.created_at) }}</time>
              </article>
            }
          </div>
        }
      </div>

      <div class="border-t border-white/[0.07] bg-[#0a0c18] px-3 py-3 sm:px-6 sm:py-4">
        @if (attachment(); as file) {
          <div class="mx-auto mb-2 flex max-w-3xl items-center gap-2 rounded-lg border border-violet-400/15 bg-violet-500/[0.06] px-3 py-2 text-xs text-violet-100">
            <span class="truncate flex-1">{{ file.name }} <span class="text-violet-300/60">· {{ sizeLabel(file.size) }}</span></span>
            <button type="button" (click)="removeAttachment()" class="rounded px-2 py-1 text-violet-200 hover:bg-white/10" aria-label="Quitar archivo">✕</button>
          </div>
        }
        <form [formGroup]="form" (ngSubmit)="send()" class="mx-auto flex max-w-3xl items-end gap-2 rounded-2xl border border-white/[0.08] bg-[#111323] p-2 focus-within:border-violet-400/30">
          <input #attachmentInput type="file" class="hidden" (change)="selectAttachment($event)">
          <button type="button" (click)="attachmentInput.click()" [disabled]="sending()" class="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-lg text-slate-500 transition hover:bg-white/[0.06] hover:text-violet-200 disabled:opacity-50" aria-label="Adjuntar archivo">＋</button>
          <textarea formControlName="content" rows="1" maxlength="10000" placeholder="Escribe un mensaje…" (keydown)="onMessageKeydown($event)" class="max-h-32 min-h-10 flex-1 resize-y bg-transparent px-1 py-2.5 text-sm text-white outline-none placeholder:text-slate-600"></textarea>
          <button type="submit" [disabled]="sending() || (!form.controls.content.value.trim() && !attachment())" class="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-violet-600 text-white shadow-lg shadow-violet-950/30 transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:bg-white/[0.06] disabled:text-slate-600 disabled:shadow-none" aria-label="Enviar mensaje">
            @if (sending()) { <span class="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"></span> } @else { <span class="text-sm">➤</span> }
          </button>
        </form>
        <p class="mx-auto mt-2 max-w-3xl px-1 text-[10px] text-slate-600">Puedes adjuntar archivos de hasta 25 MB. Pulsa Enter para enviar.</p>
      </div>
    </section>
  `,
})
export class ChatComponent implements AfterViewInit, OnDestroy {
  protected readonly auth = inject(AuthService);
  protected readonly conversations = inject(ConversationService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(FormBuilder).nonNullable;
  @ViewChild('messageList') private messageList?: ElementRef<HTMLDivElement>;
  @ViewChild('attachmentInput') private attachmentInput?: ElementRef<HTMLInputElement>;
  private readonly currentConversation = signal<Conversation | null>(null);
  protected readonly conversationId = signal('');
  protected readonly contactName = signal('Conversación');
  protected readonly contactAvatar = computed(() => {
    const id = this.conversationId();
    const currentId = this.auth.currentUser()?.id;
    const source =
      this.conversations.conversations().find((c) => c.id === id) ??
      this.currentConversation();
    return (
      source?.members.find((member) => member.user_id !== currentId)?.avatar ??
      null
    );
  });
  protected readonly messages = signal<ChatMessage[]>([]);
  protected readonly loading = signal(true);
  protected readonly sending = signal(false);
  protected readonly live = signal(false);
  protected readonly connectionState = signal<'connecting' | 'connected' | 'reconnecting'>('connecting');
  protected readonly connectionIssue = signal('');
  protected readonly errorMessage = signal('');
  protected readonly attachment = signal<File | null>(null);
  protected readonly form = this.fb.group({
    content: ['', [Validators.maxLength(10000)]],
  });
  private socket?: WebSocket;
  private reconnectTimer?: number;
  private reconnectAttempts = 0;

  constructor() {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const id = params.get('id');
      if (id) {
        void this.openConversation(id);
      }
    });
  }

  ngAfterViewInit(): void {
    this.scrollToBottom();
  }

  ngOnDestroy(): void {
    this.socket?.close();
    this.clearConnectionTimers();
  }

  private async openConversation(id: string): Promise<void> {
    this.clearConnectionTimers();
    this.socket?.close();
    this.socket = undefined;
    this.currentConversation.set(null);
    this.conversationId.set(id);
    this.messages.set([]);
    this.live.set(false);
    this.connectionState.set('connecting');
    this.loading.set(true);
    this.errorMessage.set('');
    this.connectionIssue.set('');
    this.reconnectAttempts = 0;
    try {
      const [conversation, messages] = await Promise.all([
        this.conversations.loadConversation(id),
        this.conversations.loadMessages(id),
      ]);
      if (id !== this.conversationId()) {
        return;
      }
      this.currentConversation.set(conversation);
      this.setContactName(conversation);
      this.messages.set(messages);
      const lastMessage = messages.at(-1);
      if (lastMessage) {
        this.conversations.markRead(id, lastMessage.id);
      }
      this.scrollToBottom();
      this.connectWebSocket(id);
    } catch (error) {
      if (id === this.conversationId()) {
        this.errorMessage.set(apiErrorMessage(error, 'No se pudo cargar esta conversación.'));
      }
    } finally {
      if (id === this.conversationId()) {
        this.loading.set(false);
      }
    }
  }

  private setContactName(conversation: Conversation): void {
    const currentId = this.auth.currentUser()?.id;
    this.contactName.set(
      conversation.members.find((member) => member.user_id !== currentId)?.username ??
        conversation.name ??
        'Conversación'
    );
  }

  private connectWebSocket(id: string): void {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname;

    let socket: WebSocket;
    try {
      socket = new WebSocket(
        `${protocol}//${host}:8000/ws/conversations/${id}/`
      );
    } catch (error) {
      this.connectionIssue.set('El navegador no pudo abrir el WebSocket del chat.');
      this.handleConnectionLoss(id);
      console.error('Could not open the TalkyApp chat WebSocket.', error);
      return;
    }
    this.socket = socket;
    socket.onopen = () => {
      if (this.socket === socket) {
        this.live.set(true);
        this.connectionState.set('connected');
        this.connectionIssue.set('');
        this.reconnectAttempts = 0;
        this.clearReconnectTimer();
        void this.reconcileMessages(id);
      }
    };
    socket.onmessage = (event: MessageEvent<string>) => {
      try {
        const payload: unknown = JSON.parse(event.data);
        if (isChatMessage(payload) && payload.conversation === this.conversationId()) {
          this.addMessage(payload);
          this.conversations.markRead(payload.conversation, payload.id);
        } else if (
          payload &&
          typeof payload === 'object' &&
          'type' in payload &&
          payload.type === 'error'
        ) {
          this.errorMessage.set('El servidor no pudo procesar un mensaje en tiempo real.');
        }
      } catch {
        this.errorMessage.set('Se recibió una actualización de chat no válida.');
      }
    };
    socket.onclose = (event: CloseEvent) => {
      if (this.socket === socket) {
        this.connectionIssue.set(
          event.code === 4401
            ? 'La sesión ya no es válida; vuelve a iniciar sesión.'
            : event.code === 4403
              ? 'Tu usuario no tiene acceso a esta conversación.'
              : 'No se pudo completar la conexión con el servidor WebSocket.'
        );
        this.handleConnectionLoss(id);
      }
    };
    socket.onerror = () => {
      if (this.socket === socket) {
        this.live.set(false);
        socket.close();
      }
    };
  }

  private handleConnectionLoss(id: string): void {
    if (id !== this.conversationId()) {
      return;
    }
    this.live.set(false);
    this.connectionState.set('reconnecting');
    this.scheduleReconnect(id);
  }

  private scheduleReconnect(id: string): void {
    this.clearReconnectTimer();
    const delay = Math.min(1000 * 2 ** this.reconnectAttempts, 15000);
    this.reconnectAttempts += 1;
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = undefined;
      if (id === this.conversationId() && !this.live()) {
        this.connectWebSocket(id);
      }
    }, delay);
  }

  private async reconcileMessages(id: string): Promise<void> {
    try {
      const fetched = await this.conversations.loadMessages(id);
      if (id !== this.conversationId()) {
        return;
      }
      const currentIds = new Set(this.messages().map((message) => message.id));
      const missingMessages = fetched.filter((message) => !currentIds.has(message.id));
      for (const message of missingMessages) {
        this.addMessage(message);
      }
      const latestMessage = fetched.at(-1);
      if (latestMessage) {
        this.conversations.markRead(id, latestMessage.id);
      }
      if (missingMessages.length > 0) {
        this.scrollToBottom();
      }
    } catch (error) {
      if (id === this.conversationId()) {
        console.error('Could not reconcile chat messages after WebSocket connection.', error);
      }
    }
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer !== undefined) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }
  }

  private clearConnectionTimers(): void {
    this.clearReconnectTimer();
  }

  protected async send(): Promise<void> {
    const content = this.form.controls.content.value;
    const file = this.attachment();
    const conversationId = this.conversationId();
    if ((!content.trim() && !file) || !conversationId || this.sending()) {
      return;
    }
    if (file && file.size > 25 * 1024 * 1024) {
      this.errorMessage.set('El archivo supera el límite de 25 MB.');
      return;
    }

    this.errorMessage.set('');
    this.sending.set(true);
    try {
      const message = await this.conversations.sendMessage(
        conversationId,
        content,
        file ?? undefined
      );
      this.addMessage(message);
      this.conversations.markRead(message.conversation, message.id);
      this.form.reset();
      this.attachment.set(null);
      if (this.attachmentInput) {
        this.attachmentInput.nativeElement.value = '';
      }
    } catch (error) {
      this.errorMessage.set(apiErrorMessage(error, 'No se pudo enviar el mensaje.'));
    } finally {
      this.sending.set(false);
    }
  }

  protected selectAttachment(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.errorMessage.set('');
    if (file && file.size > 25 * 1024 * 1024) {
      this.errorMessage.set('El archivo supera el límite de 25 MB.');
      input.value = '';
      this.attachment.set(null);
      return;
    }
    this.attachment.set(file);
  }

  protected removeAttachment(): void {
    this.attachment.set(null);
    if (this.attachmentInput) {
      this.attachmentInput.nativeElement.value = '';
    }
  }

  protected onMessageKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void this.send();
    }
  }

  protected initial(value: string): string {
    return value.trim().charAt(0).toUpperCase() || '?';
  }

  protected timeLabel(value: string): string {
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? ''
      : new Intl.DateTimeFormat('es', { hour: '2-digit', minute: '2-digit' }).format(date);
  }

  protected sizeLabel(bytes: number): string {
    return bytes < 1024 * 1024
      ? `${Math.max(1, Math.round(bytes / 1024))} KB`
      : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  private addMessage(message: ChatMessage): void {
    this.conversations.addMessage(message);
    this.messages.update((current) =>
      current.some((item) => item.id === message.id)
        ? current
        : [...current, message]
    );
    this.scrollToBottom();
  }

  private scrollToBottom(): void {
    requestAnimationFrame(() => {
      const element = this.messageList?.nativeElement;
      if (element) {
        element.scrollTop = element.scrollHeight;
      }
    });
  }
}