import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useChat } from '../../hooks/useChat';
import { MessageList } from './MessageList';
import { MessageInput } from './MessageInput';
import { InfoSidebar } from './InfoSidebar';
import { StarRatingPopup } from './StarRatingPopup';
import { cn } from '../../lib/utils';
import { api } from '../../lib/api';

// Storage key for tracking if feedback was already shown for a conversation
const FEEDBACK_SHOWN_KEY = 'sporttia_zero_feedback_shown';

// Environment indicator
const APP_ENV = import.meta.env.VITE_APP_ENV || 'pro';
const IS_PRE = APP_ENV === 'pre';

export function ChatContainer() {
  const { t } = useTranslation();
  const { messages, status, error, language, conversationId, sendMessage, clearError, resetConversation } = useChat();
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showRatingPopup, setShowRatingPopup] = useState(false);
  const [isConversationCompleted, setIsConversationCompleted] = useState(false);

  const isLoading = status === 'loading';
  const isSending = status === 'sending';
  const isInitializing = isLoading && messages.length === 0;

  // Detect when sports center creation is successful and show rating popup
  useEffect(() => {
    if (!conversationId || messages.length === 0) return;

    // Check if we already showed feedback for this conversation
    const shownConversations = JSON.parse(localStorage.getItem(FEEDBACK_SHOWN_KEY) || '[]');
    if (shownConversations.includes(conversationId)) return;

    // Look for a message with successful create_sports_center function call
    const hasSuccessfulCreation = messages.some((msg) => {
      if (msg.role !== 'assistant' || !msg.metadata) return false;
      const functionCalls = (msg.metadata as { functionCalls?: Array<{ name: string; result?: { success?: boolean } }> }).functionCalls;
      if (!functionCalls) return false;
      return functionCalls.some(
        (fc) => fc.name === 'create_sports_center' && fc.result?.success === true
      );
    });

    if (hasSuccessfulCreation) {
      // Small delay to let the user read the success message
      const timer = setTimeout(() => {
        setShowRatingPopup(true);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [messages, conversationId]);

  const handleRatingSubmit = async (rating: number, comment?: string) => {
    await api.submitFeedback(comment || '', conversationId, rating);
    // Mark this conversation as having shown feedback
    const shownConversations = JSON.parse(localStorage.getItem(FEEDBACK_SHOWN_KEY) || '[]');
    if (!shownConversations.includes(conversationId)) {
      shownConversations.push(conversationId);
      localStorage.setItem(FEEDBACK_SHOWN_KEY, JSON.stringify(shownConversations));
    }
  };

  const handleRatingClose = () => {
    setShowRatingPopup(false);
    setIsConversationCompleted(true);
    // Also mark as shown when skipped
    if (conversationId) {
      const shownConversations = JSON.parse(localStorage.getItem(FEEDBACK_SHOWN_KEY) || '[]');
      if (!shownConversations.includes(conversationId)) {
        shownConversations.push(conversationId);
        localStorage.setItem(FEEDBACK_SHOWN_KEY, JSON.stringify(shownConversations));
      }
    }
  };

  return (
    <div className="flex min-h-screen decorative-bg">
      {/* Main content wrapper */}
      <div className="flex-1 flex items-center justify-center p-4 lg:p-8">
        <div className="flex gap-6 w-full max-w-6xl items-start">
          {/* Chat Panel */}
          <div className="flex-1 flex flex-col chat-panel max-w-2xl h-[calc(100vh-4rem)] lg:h-[calc(100vh-8rem)]">
            {/* Pre-production banner */}
            {IS_PRE && (
              <div className="bg-amber-500 px-4 py-1 text-center">
                <span className="text-xs font-medium text-amber-950">
                  PRE-PRODUCTION ENVIRONMENT
                </span>
              </div>
            )}

            {/* Green Header */}
            <header className="bg-primary px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <LightningBoltIcon className="w-6 h-6 text-primary-foreground" />
                <h1 className="text-lg font-semibold text-primary-foreground">
                  Sporttia ZERO
                </h1>
              </div>
              <div className="flex items-center gap-3">
                <StatusIndicator status={status} t={t} />
                <button
                  onClick={() => setShowResetConfirm(true)}
                  disabled={isInitializing}
                  className="p-1.5 rounded-md text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title={t('header.newConversation')}
                >
                  <RefreshIcon className="w-5 h-5" />
                </button>
              </div>
            </header>

            {/* Reset Confirmation Dialog */}
            {showResetConfirm && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm mx-4">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {t('resetDialog.title')}
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    {t('resetDialog.description')}
                  </p>
                  <div className="flex justify-end gap-3">
                    <button
                      onClick={() => setShowResetConfirm(false)}
                      className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                    >
                      {t('resetDialog.cancel')}
                    </button>
                    <button
                      onClick={() => {
                        setShowResetConfirm(false);
                        resetConversation();
                      }}
                      className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-md transition-colors"
                    >
                      {t('resetDialog.confirm')}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Error banner */}
            {error && (
              <div className="bg-destructive/10 border-b border-destructive/20 px-4 py-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-destructive">{error}</p>
                  <button
                    onClick={clearError}
                    className="text-destructive hover:text-destructive/80 text-sm font-medium"
                  >
                    {t('error.dismiss')}
                  </button>
                </div>
              </div>
            )}

            {/* Messages area */}
            {isInitializing ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <LoadingSpinner />
                  <p className="text-sm text-muted-foreground mt-2">
                    {t('chat.initializing')}
                  </p>
                </div>
              </div>
            ) : (
              <MessageList messages={messages} isLoading={isSending} />
            )}

            {/* Input area */}
            <MessageInput
              onSend={sendMessage}
              disabled={isInitializing || isSending || isConversationCompleted}
              placeholder={
                isInitializing
                  ? t('chat.placeholderInitializing')
                  : isSending
                    ? t('chat.placeholderSending')
                    : isConversationCompleted
                      ? t('chat.placeholderCompleted')
                      : t('chat.placeholder')
              }
            />
          </div>

          {/* Info Sidebar - hidden on mobile */}
          <InfoSidebar language={language} conversationId={conversationId} />
        </div>
      </div>

      {/* Star Rating Popup */}
      <StarRatingPopup
        isOpen={showRatingPopup}
        onClose={handleRatingClose}
        onSubmit={handleRatingSubmit}
        language={language}
      />
    </div>
  );
}

function StatusIndicator({
  status,
  t,
}: {
  status: string;
  t: (key: string) => string;
}) {
  const getStatusConfig = () => {
    switch (status) {
      case 'loading':
        return { color: 'bg-yellow-300', labelKey: 'status.loading' };
      case 'sending':
        return { color: 'bg-blue-300', labelKey: 'status.sending' };
      case 'error':
        return { color: 'bg-red-400', labelKey: 'status.error' };
      default:
        return { color: 'bg-white', labelKey: 'status.connected' };
    }
  };

  const { color, labelKey } = getStatusConfig();

  return (
    <div className="flex items-center gap-2 text-xs text-primary-foreground/80">
      <span
        className={cn(
          'h-2 w-2 rounded-full',
          color,
          status === 'sending' && 'animate-pulse'
        )}
      />
      <span className="hidden sm:inline">{t(labelKey)}</span>
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
  );
}

function LightningBoltIcon({ className }: { className?: string }) {
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

function RefreshIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <path d="M8 16H3v5" />
    </svg>
  );
}
