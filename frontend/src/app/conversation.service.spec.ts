import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { Conversation, ConversationService } from './conversation.service';

describe('ConversationService', () => {
  it('previews incoming messages and marks them unread until opened', () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const service = TestBed.inject(ConversationService);
    const conversation: Conversation = {
      id: 'conversation-1',
      type: 'direct',
      name: null,
      members: [],
      updated_at: '2026-11-02T15:00:00Z',
      last_message: {
        id: 'message-2',
        conversation: 'conversation-1',
        sender_id: 'other-user',
        sender_username: 'ana',
        content: 'Ya llegué',
        file_name: '',
        file_content_type: '',
        file_url: null,
        created_at: '2026-11-02T15:01:00Z',
      },
    };

    expect(service.lastMessagePreview(conversation, 'current-user')).toBe(
      'Ya llegué'
    );
    expect(service.isUnread(conversation, 'current-user')).toBe(true);

    service.markRead(conversation.id, conversation.last_message!.id);

    expect(service.isUnread(conversation, 'current-user')).toBe(false);
  });

  it('labels the current user only on messages they sent', () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    const service = TestBed.inject(ConversationService);
    const conversation: Conversation = {
      id: 'conversation-1',
      type: 'direct',
      name: null,
      members: [],
      updated_at: '2026-11-02T15:00:00Z',
      last_message: {
        id: 'message-1',
        conversation: 'conversation-1',
        sender_id: 'current-user',
        sender_username: 'yo',
        content: 'Hola',
        file_name: '',
        file_content_type: '',
        file_url: null,
        created_at: '2026-11-02T15:00:00Z',
      },
    };

    expect(service.lastMessagePreview(conversation, 'current-user')).toBe(
      'Tú: Hola'
    );
    expect(service.isUnread(conversation, 'current-user')).toBe(false);
  });
});
