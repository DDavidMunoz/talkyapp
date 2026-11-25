import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { apiErrorMessage } from './api-error';
import { PresenceService } from './presence.service';

export interface ConversationMember {
  user_id: string;
  username: string;
  avatar?: string | null;
  is_online?: boolean;
  role: string;
  joined_at: string;
  left_at: string | null;
}

export interface Conversation {
  id: string;
  type: 'direct' | 'group';
  name: string | null;
  members: ConversationMember[];
  updated_at: string;
  last_message?: ChatMessage | null;
}

export interface SearchUser {
  id: string;
  username: string;
  name: string;
  avatar: string | null;
  bio: string;
  last_seen: string | null;
  is_online: boolean;
}

export interface ChatMessage {
  id: string;
  conversation: string;
  sender_id: string;
  sender_username: string;
  content: string;
  file_name: string;
  file_content_type: string;
  file_url: string | null;
  created_at: string;
}

interface MessagePage {
  results: ChatMessage[];
  next_before: string | null;
}

function isReadState(value: unknown): value is Record<string, string> {
  return (
    !!value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Object.entries(value).every(
      ([conversationId, messageId]) =>
        conversationId.length > 0 && typeof messageId === 'string'
    )
  );
}

@Injectable({ providedIn: 'root' })
export class ConversationService {
  private readonly http = inject(HttpClient);
  private readonly presence = inject(PresenceService);
  readonly conversations = signal<Conversation[]>([]);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly readMessageIds = signal<Record<string, string>>({});
  private readStateKey = '';
  private loadRequest?: Promise<void>;

  async loadConversations(silent = false): Promise<void> {
    if (this.loadRequest) {
      return this.loadRequest;
    }
    if (!silent) {
      this.loading.set(true);
    }
    this.error.set('');
    this.loadRequest = (async () => {
      try {
        const conversations = await firstValueFrom(
          this.http.get<Conversation[]>('/api/conversations/', {
            withCredentials: true,
          })
        );
        this.conversations.set(conversations);
        this.presence.subscribeToConversations(
          conversations.map((conversation) => conversation.id)
        );
      } catch (error) {
        this.error.set(
          apiErrorMessage(error, 'No se pudieron cargar tus conversaciones.')
        );
      } finally {
        if (!silent) {
          this.loading.set(false);
        }
        this.loadRequest = undefined;
      }
    })();
    return this.loadRequest;
  }

  loadReadState(userId: string): void {
    const key = `talky:last-read:${userId}`;
    if (key === this.readStateKey) {
      return;
    }
    this.readStateKey = key;
    this.readMessageIds.set({});
    try {
      const saved = localStorage.getItem(key);
      if (!saved) {
        return;
      }
      const parsed: unknown = JSON.parse(saved);
      if (isReadState(parsed)) {
        this.readMessageIds.set(parsed);
      } else {
        console.warn('Ignoring invalid TalkyApp read state.');
        localStorage.removeItem(key);
      }
    } catch (error) {
      console.warn('Could not restore TalkyApp read state.', error);
    }
  }

  markRead(conversationId: string, messageId: string): void {
    const next = { ...this.readMessageIds(), [conversationId]: messageId };
    this.readMessageIds.set(next);
    if (!this.readStateKey) {
      return;
    }
    try {
      localStorage.setItem(this.readStateKey, JSON.stringify(next));
    } catch (error) {
      console.warn('Could not save TalkyApp read state.', error);
    }
  }

  isUnread(conversation: Conversation, currentUserId: string | undefined): boolean {
    const message = conversation.last_message;
    return !!message &&
      !!currentUserId &&
      message.sender_id !== currentUserId &&
      this.readMessageIds()[conversation.id] !== message.id;
  }

  addMessage(message: ChatMessage): void {
    this.conversations.update((current) => {
      const updated = current.map((conversation) =>
        conversation.id === message.conversation
          ? {
              ...conversation,
              updated_at: message.created_at,
              last_message: message,
            }
          : conversation
      );
      return updated.sort(
        (a, b) =>
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );
    });
  }

  lastMessagePreview(conversation: Conversation, currentUserId?: string): string {
    const message = conversation.last_message;
    if (!message) {
      return 'Aún no hay mensajes';
    }
    const preview = message.file_name
      ? `📎 ${message.file_name}`
      : message.content || 'Archivo adjunto';
    return message.sender_id === currentUserId
      ? `Tú: ${preview}`
      : preview;
  }

  async searchUsers(query: string): Promise<SearchUser[]> {
    return firstValueFrom(
      this.http.get<SearchUser[]>('/api/users/search/', {
        params: { q: query },
        withCredentials: true,
      })
    );
  }

  async startConversation(userId: string): Promise<Conversation> {
    const conversation = await firstValueFrom(
      this.http.post<Conversation>(
        '/api/conversations/',
        { user_id: userId },
        { withCredentials: true }
      )
    );
    const updatedConversations = [
      conversation,
      ...this.conversations().filter((item) => item.id !== conversation.id),
    ];
    this.conversations.set(updatedConversations);
    this.presence.subscribeToConversations(
      updatedConversations.map((item) => item.id)
    );
    return conversation;
  }

  async loadMessages(conversationId: string): Promise<ChatMessage[]> {
    const page = await firstValueFrom(
      this.http.get<MessagePage>(
        `/api/conversations/${conversationId}/messages/`,
        { params: { limit: '100' }, withCredentials: true }
      )
    );
    return page.results;
  }

  async loadConversation(conversationId: string): Promise<Conversation> {
    return firstValueFrom(
      this.http.get<Conversation>(`/api/conversations/${conversationId}/`, {
        withCredentials: true,
      })
    );
  }

  async deleteConversation(conversationId: string): Promise<void> {
    await firstValueFrom(
      this.http.delete<void>(`/api/conversations/${conversationId}/`, {
        withCredentials: true,
      })
    );
    const updatedConversations = this.conversations().filter(
      (conversation) => conversation.id !== conversationId
    );
    this.conversations.set(updatedConversations);
    this.presence.subscribeToConversations(
      updatedConversations.map((conversation) => conversation.id)
    );
    this.clearReadState(conversationId);
  }

  async clearChat(conversationId: string): Promise<void> {
    await firstValueFrom(
      this.http.post<void>(
        `/api/conversations/${conversationId}/clear/`,
        {},
        { withCredentials: true }
      )
    );
    this.conversations.update((current) =>
      current.map((conversation) =>
        conversation.id === conversationId
          ? { ...conversation, last_message: null }
          : conversation
      )
    );
    this.clearReadState(conversationId);
  }

  async sendMessage(
    conversationId: string,
    content: string,
    attachment?: File
  ): Promise<ChatMessage> {
    const body = new FormData();
    if (content) {
      body.append('content', content);
    }
    if (attachment) {
      body.append('attachment', attachment, attachment.name);
    }
    return firstValueFrom(
      this.http.post<ChatMessage>(
        `/api/conversations/${conversationId}/messages/`,
        body,
        { withCredentials: true }
      )
    );
  }

  attachmentUrl(conversationId: string, messageId: string): string {
    return `/api/conversations/${conversationId}/messages/${messageId}/file/`;
  }

  private clearReadState(conversationId: string): void {
    const next = { ...this.readMessageIds() };
    delete next[conversationId];
    this.readMessageIds.set(next);
    if (!this.readStateKey) {
      return;
    }
    try {
      localStorage.setItem(this.readStateKey, JSON.stringify(next));
    } catch (error) {
      console.warn('Could not save TalkyApp read state.', error);
    }
  }
}
