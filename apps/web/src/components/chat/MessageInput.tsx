import { useState, useRef, useEffect, type KeyboardEvent, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '../../lib/utils';

interface MessageInputProps {
  onSend: (content: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function MessageInput({
  onSend,
  disabled = false,
  placeholder,
}: MessageInputProps) {
  const { t } = useTranslation();
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const defaultPlaceholder = placeholder || t('chat.placeholder');

  // Focus input on mount and when it becomes enabled
  useEffect(() => {
    if (!disabled) {
      inputRef.current?.focus();
    }
  }, [disabled]);

  const handleSubmit = (e?: FormEvent) => {
    e?.preventDefault();
    const trimmed = value.trim();
    if (trimmed && !disabled) {
      onSend(trimmed);
      setValue('');
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    // Submit on Enter
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="p-4 bg-transparent"
    >
      <div className="flex items-center gap-3">
        <div className="flex-1 relative">
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={defaultPlaceholder}
            disabled={disabled}
            className={cn(
              'w-full rounded-full border border-border bg-white px-5 py-3',
              'text-sm placeholder:text-muted-foreground',
              'focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary',
              'disabled:cursor-not-allowed disabled:opacity-50',
              'h-12'
            )}
          />
        </div>
        <button
          type="submit"
          disabled={disabled || !value.trim()}
          className={cn(
            'inline-flex items-center justify-center rounded-full',
            'bg-primary text-primary-foreground',
            'h-12 w-12 shrink-0',
            'hover:bg-primary/90',
            'focus:outline-none focus:ring-2 focus:ring-primary/30 focus:ring-offset-2',
            'disabled:pointer-events-none disabled:opacity-50',
            'transition-colors shadow-md'
          )}
          aria-label={t('chat.sendMessage')}
        >
          <SendIcon className="h-5 w-5" />
        </button>
      </div>
    </form>
  );
}

function SendIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
    </svg>
  );
}
