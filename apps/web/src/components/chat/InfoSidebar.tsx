import { useState } from 'react';
import { api } from '../../lib/api';
import { APP_VERSION } from '../../lib/constants';

interface InfoCardProps {
  icon: React.ReactNode;
  children: React.ReactNode;
}

function InfoCard({ icon, children }: InfoCardProps) {
  return (
    <div className="info-card flex gap-4">
      <div className="flex-shrink-0 text-primary">{icon}</div>
      <div className="text-sm text-foreground leading-relaxed">{children}</div>
    </div>
  );
}

// Get native language name using Intl API
function getLanguageName(code: string): string {
  try {
    const displayNames = new Intl.DisplayNames([code], { type: 'language' });
    return displayNames.of(code) || code;
  } catch {
    return code;
  }
}

interface InfoSidebarProps {
  language?: string | null;
  conversationId?: string | null;
}

export function InfoSidebar({ language, conversationId }: InfoSidebarProps) {
  const languageName = language ? getLanguageName(language) : null;
  const [feedbackText, setFeedbackText] = useState('');
  const [feedbackStatus, setFeedbackStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');

  const handleSubmitFeedback = async () => {
    if (!feedbackText.trim() || feedbackStatus === 'sending') return;

    setFeedbackStatus('sending');
    try {
      await api.submitFeedback(feedbackText.trim(), conversationId);
      setFeedbackStatus('sent');
      setFeedbackText('');
      // Reset status after 3 seconds
      setTimeout(() => setFeedbackStatus('idle'), 3000);
    } catch {
      setFeedbackStatus('error');
      // Reset status after 3 seconds
      setTimeout(() => setFeedbackStatus('idle'), 3000);
    }
  };

  return (
    <div className="hidden lg:flex flex-col gap-4 w-full max-w-md">
      {/* Info Card */}
      <InfoCard icon={<InfoIcon className="w-6 h-6" />}>
        <p>
          This assistant allows you to create a basic sports center. Keep in mind that
          Sporttia has many more modules to manage members, card payments, activities,
          tournaments, etc.
        </p>
      </InfoCard>

      {/* Sales Contact Card */}
      <InfoCard icon={<PersonIcon className="w-6 h-6" />}>
        <p>
          If you prefer to contact a sales representative, you can write to us at{' '}
          <a
            href="mailto:sales@sporttia.com"
            className="text-primary hover:underline font-medium"
          >
            sales@sporttia.com
          </a>
          .
        </p>
      </InfoCard>

      {/* Language indicator */}
      {languageName && (
        <InfoCard icon={<LanguageIcon className="w-6 h-6" />}>
          <p>
            <span className="text-muted-foreground">Language:</span>{' '}
            <span className="font-medium">{languageName}</span>
          </p>
        </InfoCard>
      )}

      {/* Feedback Card */}
      <div className="info-card">
        <div className="flex gap-4 mb-3">
          <div className="flex-shrink-0 text-primary">
            <FeedbackIcon className="w-6 h-6" />
          </div>
          <p className="text-sm text-foreground leading-relaxed">
            Share your feedback about this assistant:
          </p>
        </div>
        <div className="space-y-2">
          <textarea
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
            placeholder="Write your feedback here..."
            className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
            rows={3}
            maxLength={2000}
            disabled={feedbackStatus === 'sending'}
          />
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {feedbackText.length}/2000
            </span>
            <button
              onClick={handleSubmitFeedback}
              disabled={!feedbackText.trim() || feedbackStatus === 'sending'}
              className="px-4 py-1.5 text-sm font-medium text-white bg-primary rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {feedbackStatus === 'sending' ? 'Sending...' : 'Send'}
            </button>
          </div>
          {feedbackStatus === 'sent' && (
            <p className="text-xs text-green-600">Thank you for your feedback!</p>
          )}
          {feedbackStatus === 'error' && (
            <p className="text-xs text-red-600">Failed to send feedback. Please try again.</p>
          )}
        </div>
      </div>

      {/* Version */}
      <div className="mt-auto pt-4 text-center">
        <span className="text-[10px] text-muted-foreground/50">v{APP_VERSION}</span>
      </div>
    </div>
  );
}

function InfoIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path
        fillRule="evenodd"
        d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm8.706-1.442c1.146-.573 2.437.463 2.126 1.706l-.709 2.836.042-.02a.75.75 0 01.67 1.34l-.04.022c-1.147.573-2.438-.463-2.127-1.706l.71-2.836-.042.02a.75.75 0 11-.671-1.34l.041-.022zM12 9a.75.75 0 100-1.5.75.75 0 000 1.5z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function PersonIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path
        fillRule="evenodd"
        d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function LanguageIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path
        fillRule="evenodd"
        d="M9 2.25a.75.75 0 01.75.75v1.506a49.38 49.38 0 015.343.371.75.75 0 11-.186 1.489c-.66-.083-1.323-.151-1.99-.206a18.67 18.67 0 01-2.969 6.323c.317.384.65.753.998 1.107a.75.75 0 11-1.07 1.052A18.902 18.902 0 019 13.687a18.823 18.823 0 01-5.656 4.482.75.75 0 11-.688-1.333 17.323 17.323 0 005.396-4.353A18.72 18.72 0 015.89 8.598a.75.75 0 011.388-.568A17.21 17.21 0 009 11.224a17.17 17.17 0 002.391-5.165 48.038 48.038 0 00-8.298.307.75.75 0 01-.186-1.489 49.159 49.159 0 015.343-.371V3A.75.75 0 019 2.25zM15.75 9a.75.75 0 01.68.433l5.25 11.25a.75.75 0 01-1.36.634l-1.198-2.567h-6.744l-1.198 2.567a.75.75 0 01-1.36-.634l5.25-11.25A.75.75 0 0115.75 9zm-2.672 8.25h5.344l-2.672-5.726-2.672 5.726z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function FeedbackIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
    >
      <path
        fillRule="evenodd"
        d="M4.848 2.771A49.144 49.144 0 0112 2.25c2.43 0 4.817.178 7.152.52 1.978.292 3.348 2.024 3.348 3.97v6.02c0 1.946-1.37 3.678-3.348 3.97a48.901 48.901 0 01-3.476.383.39.39 0 00-.297.17l-2.755 4.133a.75.75 0 01-1.248 0l-2.755-4.133a.39.39 0 00-.297-.17 48.9 48.9 0 01-3.476-.384c-1.978-.29-3.348-2.024-3.348-3.97V6.741c0-1.946 1.37-3.68 3.348-3.97zM6.75 8.25a.75.75 0 01.75-.75h9a.75.75 0 010 1.5h-9a.75.75 0 01-.75-.75zm.75 2.25a.75.75 0 000 1.5H12a.75.75 0 000-1.5H7.5z"
        clipRule="evenodd"
      />
    </svg>
  );
}
