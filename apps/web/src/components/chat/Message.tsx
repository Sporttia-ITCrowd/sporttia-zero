import ReactMarkdown from 'react-markdown';
import { cn } from '../../lib/utils';
import type { Message as MessageType } from '../../lib/api';

interface MessageProps {
  message: MessageType;
}

export function Message({ message }: MessageProps) {
  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';

  return (
    <div
      className={cn(
        'flex w-full items-end gap-2',
        isUser ? 'justify-end' : 'justify-start'
      )}
    >
      {/* Lightning bolt icon for assistant messages */}
      {isAssistant && (
        <div className="flex-shrink-0 mb-1">
          <LightningIcon className="w-8 h-8 lightning-icon" />
        </div>
      )}

      <div
        className={cn(
          'max-w-[80%] rounded-2xl px-4 py-3 text-sm',
          isUser && 'bg-white border border-border text-foreground',
          isAssistant && 'bg-muted text-foreground shadow-sm',
          !isUser && !isAssistant && 'bg-secondary/10 text-secondary-foreground'
        )}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap break-words">{message.content}</p>
        ) : (
          <div className="prose prose-sm prose-slate max-w-none break-words">
            <ReactMarkdown
              components={{
                p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                ul: ({ children }) => <ul className="list-disc pl-4 mb-2 last:mb-0">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal pl-4 mb-2 last:mb-0">{children}</ol>,
                li: ({ children }) => <li className="mb-1">{children}</li>,
                strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                em: ({ children }) => <em className="italic">{children}</em>,
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}

function LightningIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path
        fillRule="evenodd"
        d="M14.615 1.595a.75.75 0 01.359.852L12.982 9.75h7.268a.75.75 0 01.548 1.262l-10.5 11.25a.75.75 0 01-1.272-.71l1.992-7.302H3.75a.75.75 0 01-.548-1.262l10.5-11.25a.75.75 0 01.913-.143z"
        clipRule="evenodd"
      />
    </svg>
  );
}
