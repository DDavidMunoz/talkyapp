import { Injectable, signal } from '@angular/core';

const ONLINE_TIMEOUT_MS = 45_000;
const HEARTBEAT_INTERVAL_MS = 15_000;
const TYPING_TIMEOUT_MS = 5_000;

@Injectable({ providedIn: 'root' })
export class PresenceService {
  readonly onlineUsers = signal<Record<string, boolean>>({});
  readonly typingByConversation = signal<Record<string, string[]>>({});
  private readonly onlineTimers = new Map<string, number>();
  private readonly typingTimers = new Map<string, number>();
  private conversationIds: string[] = [];
  private socket?: WebSocket;
  private heartbeatTimer?: number;
  private reconnectTimer?: number;
  private reconnectAttempts = 0;
  private active = false;

  connect(): void {
    if (this.active) {
      return;
    }
    this.active = true;
    this.connectSocket();
  }

  disconnect(): void {
    this.active = false;
    this.clearHeartbeatTimer();
    this.clearReconnectTimer();
    const socket = this.socket;
    this.socket = undefined;
    socket?.close();
  }

  isOnline(userId: string): boolean {
    return this.onlineUsers()[userId] ?? false;
  }

  setOnline(userId: string, isOnline: boolean): void {
    const existingTimer = this.onlineTimers.get(userId);
    if (existingTimer !== undefined) {
      window.clearTimeout(existingTimer);
      this.onlineTimers.delete(userId);
    }

    this.onlineUsers.update((current) => ({ ...current, [userId]: isOnline }));
    if (isOnline) {
      this.onlineTimers.set(
        userId,
        window.setTimeout(() => {
          this.onlineTimers.delete(userId);
          this.onlineUsers.update((current) => ({ ...current, [userId]: false }));
        }, ONLINE_TIMEOUT_MS)
      );
    }
  }

  setTyping(conversationId: string, userId: string, isTyping: boolean): void {
    const timerKey = `${conversationId}:${userId}`;
    const existingTimer = this.typingTimers.get(timerKey);
    if (existingTimer !== undefined) {
      window.clearTimeout(existingTimer);
      this.typingTimers.delete(timerKey);
    }

    this.typingByConversation.update((current) => {
      const users = new Set(current[conversationId] ?? []);
      if (isTyping) {
        users.add(userId);
      } else {
        users.delete(userId);
      }

      const next = { ...current };
      if (users.size > 0) {
        next[conversationId] = [...users];
      } else {
        delete next[conversationId];
      }
      return next;
    });
    if (isTyping) {
      this.typingTimers.set(
        timerKey,
        window.setTimeout(
          () => this.setTyping(conversationId, userId, false),
          TYPING_TIMEOUT_MS
        )
      );
    }
  }

  clearTyping(conversationId: string): void {
    for (const [timerKey, timer] of this.typingTimers) {
      if (timerKey.startsWith(`${conversationId}:`)) {
        window.clearTimeout(timer);
        this.typingTimers.delete(timerKey);
      }
    }
    this.typingByConversation.update((current) => {
      if (!current[conversationId]) {
        return current;
      }
      const next = { ...current };
      delete next[conversationId];
      return next;
    });
  }

  isTyping(conversationId: string): boolean {
    return (this.typingByConversation()[conversationId]?.length ?? 0) > 0;
  }

  subscribeToConversations(conversationIds: string[]): void {
    const nextConversationIds = [...new Set(conversationIds)];
    if (
      nextConversationIds.length === this.conversationIds.length &&
      nextConversationIds.every((id, index) => id === this.conversationIds[index])
    ) {
      return;
    }
    this.conversationIds = nextConversationIds;
    this.sendSubscriptions();
  }

  private connectSocket(): void {
    if (!this.active) {
      return;
    }
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    let socket: WebSocket;
    try {
      socket = new WebSocket(
        `${protocol}//${window.location.hostname}:8000/ws/presence/`
      );
    } catch (error) {
      console.error('Could not open the TalkyApp presence WebSocket.', error);
      this.scheduleReconnect();
      return;
    }
    this.socket = socket;

    socket.onopen = () => {
      if (this.socket !== socket) {
        return;
      }
      this.reconnectAttempts = 0;
      this.clearReconnectTimer();
      this.clearHeartbeatTimer();
      this.sendSubscriptions();
      this.heartbeatTimer = window.setInterval(() => {
        if (socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ type: 'heartbeat' }));
        }
      }, HEARTBEAT_INTERVAL_MS);
    };

    socket.onmessage = (event: MessageEvent<string>) => {
      try {
        const payload: unknown = JSON.parse(event.data);
        if (
          payload &&
          typeof payload === 'object' &&
          'type' in payload &&
          payload.type === 'typing' &&
          'conversation' in payload &&
          typeof payload.conversation === 'string' &&
          'user_id' in payload &&
          typeof payload.user_id === 'string' &&
          'is_typing' in payload &&
          typeof payload.is_typing === 'boolean'
        ) {
          this.setTyping(
            payload.conversation,
            payload.user_id,
            payload.is_typing
          );
        }
      } catch (error) {
        console.error('Could not read a TalkyApp presence update.', error);
      }
    };

    socket.onclose = () => {
      if (this.socket !== socket) {
        return;
      }
      this.socket = undefined;
      this.clearHeartbeatTimer();
      this.scheduleReconnect();
    };

    socket.onerror = () => socket.close();
  }

  private scheduleReconnect(): void {
    if (!this.active || this.reconnectTimer !== undefined) {
      return;
    }
    const delay = Math.min(1000 * 2 ** this.reconnectAttempts, 15_000);
    this.reconnectAttempts += 1;
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = undefined;
      this.connectSocket();
    }, delay);
  }

  private sendSubscriptions(): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(
        JSON.stringify({
          type: 'subscribe',
          conversation_ids: this.conversationIds,
        })
      );
    }
  }

  private clearHeartbeatTimer(): void {
    if (this.heartbeatTimer !== undefined) {
      window.clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = undefined;
    }
  }

  private clearReconnectTimer(): void {
    if (this.reconnectTimer !== undefined) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }
  }
}
