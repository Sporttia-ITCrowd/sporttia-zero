import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Message } from './Message';
import type { Message as MessageType } from '../../lib/api';

interface MessageListProps {
  messages: MessageType[];
  isLoading?: boolean;
}

export function MessageList({ messages, isLoading }: MessageListProps) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const prevMessageCountRef = useRef(0);

  // Auto-scroll to bottom only when content overflows and new messages arrive
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const prevCount = prevMessageCountRef.current;
    const currentCount = messages.length;

    // Only scroll if content actually overflows
    const hasOverflow = container.scrollHeight > container.clientHeight;

    // Only scroll if messages were added after initial load and there's overflow
    if (hasOverflow && prevCount > 0 && currentCount > prevCount) {
      container.scrollTo({ top: container.scrollHeight, behavior: 'smooth' });
    }

    prevMessageCountRef.current = currentCount;
  }, [messages]);

  if (messages.length === 0 && !isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="text-center text-muted-foreground max-w-md">
          <p className="text-lg font-medium mb-3">{t('welcome.title')}</p>
          <p className="text-sm mb-4">{t('welcome.description')}</p>
          <ul className="text-sm text-left space-y-1 mb-4">
            <li>• {t('welcome.item1')}</li>
            <li>• {t('welcome.item2')}</li>
            <li>• {t('welcome.item3')}</li>
            <li>• {t('welcome.item4')}</li>
          </ul>
          <p className="text-sm italic">{t('welcome.cta')}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-y-auto p-4 space-y-4"
    >
      {messages.map((message) => (
        <Message key={message.id} message={message} />
      ))}

      {isLoading && <TypingIndicator />}
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
        <div className="flex space-x-1">
          <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:-0.3s]" />
          <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:-0.15s]" />
          <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce" />
        </div>
      </div>
    </div>
  );
}
