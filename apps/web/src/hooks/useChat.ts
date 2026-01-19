import { useState, useCallback, useEffect, useRef } from 'react';
import { api, type Message, ApiError } from '../lib/api';
import { getOrCreateSessionId, getBrowserLanguage } from '../lib/utils';

export type ChatStatus = 'idle' | 'loading' | 'sending' | 'error';

export interface UseChatReturn {
  messages: Message[];
  status: ChatStatus;
  error: string | null;
  conversationId: string | null;
  sendMessage: (content: string) => Promise<void>;
  clearError: () => void;
  resetConversation: () => Promise<void>;
}

const CONVERSATION_STORAGE_KEY = 'sporttia_zero_conversation_id';

export function useChat(): UseChatReturn {
  const [messages, setMessages] = useState<Message[]>([]);
  const [status, setStatus] = useState<ChatStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const initializingRef = useRef(false);
  const mountedRef = useRef(true);

  // Initialize or restore conversation on mount
  useEffect(() => {
    mountedRef.current = true;

    async function initConversation() {
      // Prevent double initialization in StrictMode
      if (initializingRef.current) return;
      initializingRef.current = true;

      setStatus('loading');
      setError(null);

      try {
        // Check for existing conversation
        const storedConversationId = localStorage.getItem(CONVERSATION_STORAGE_KEY);

        if (storedConversationId) {
          // Try to restore existing conversation
          try {
            const conversation = await api.getConversation(storedConversationId);
            if (!mountedRef.current) return;
            setConversationId(conversation.id);
            setMessages(conversation.messages);
            setStatus('idle');
            return;
          } catch (err) {
            // Conversation not found or expired, create new one
            localStorage.removeItem(CONVERSATION_STORAGE_KEY);
          }
        }

        if (!mountedRef.current) return;

        // Create new conversation with browser language
        const sessionId = getOrCreateSessionId();
        const language = getBrowserLanguage();
        const conversation = await api.createConversation(sessionId, language);
        if (!mountedRef.current) return;
        setConversationId(conversation.id);
        localStorage.setItem(CONVERSATION_STORAGE_KEY, conversation.id);
        setMessages([]);
        setStatus('idle');
      } catch (err) {
        if (!mountedRef.current) return;
        const errorMessage = err instanceof ApiError
          ? err.message
          : 'Failed to initialize chat. Please try again.';
        setError(errorMessage);
        setStatus('error');
      }
    }

    initConversation();

    return () => {
      mountedRef.current = false;
      initializingRef.current = false;
    };
  }, []);

  const sendMessage = useCallback(async (content: string) => {
    if (!conversationId || status === 'sending' || status === 'loading') return;

    const trimmedContent = content.trim();
    if (!trimmedContent) return;

    setStatus('sending');
    setError(null);

    // Optimistically add user message
    const tempUserMessage: Message = {
      id: `temp-${Date.now()}`,
      conversationId,
      role: 'user',
      content: trimmedContent,
      metadata: null,
      createdAt: new Date().toISOString(),
    };
    setMessages(prev => [...prev, tempUserMessage]);

    try {
      const response = await api.sendMessage(conversationId, trimmedContent);

      // Replace temp message with real one and add assistant response
      setMessages(prev => {
        const filtered = prev.filter(m => m.id !== tempUserMessage.id);
        const newMessages = [...filtered, response.message];
        if (response.assistantMessage) {
          newMessages.push(response.assistantMessage);
        }
        return newMessages;
      });

      setStatus('idle');
    } catch (err) {
      // Remove optimistic message on error
      setMessages(prev => prev.filter(m => m.id !== tempUserMessage.id));

      const errorMessage = err instanceof ApiError
        ? err.message
        : 'Failed to send message. Please try again.';
      setError(errorMessage);
      setStatus('error');
    }
  }, [conversationId, status]);

  const clearError = useCallback(() => {
    setError(null);
    if (status === 'error') {
      setStatus('idle');
    }
  }, [status]);

  const resetConversation = useCallback(async () => {
    setStatus('loading');
    setError(null);
    setMessages([]);
    setConversationId(null);

    // Clear stored conversation
    localStorage.removeItem(CONVERSATION_STORAGE_KEY);

    try {
      // Create new conversation with browser language
      const sessionId = getOrCreateSessionId();
      const language = getBrowserLanguage();
      const conversation = await api.createConversation(sessionId, language);
      setConversationId(conversation.id);
      localStorage.setItem(CONVERSATION_STORAGE_KEY, conversation.id);
      setStatus('idle');
    } catch (err) {
      const errorMessage = err instanceof ApiError
        ? err.message
        : 'Failed to start new conversation. Please try again.';
      setError(errorMessage);
      setStatus('error');
    }
  }, []);

  return {
    messages,
    status,
    error,
    conversationId,
    sendMessage,
    clearError,
    resetConversation,
  };
}
