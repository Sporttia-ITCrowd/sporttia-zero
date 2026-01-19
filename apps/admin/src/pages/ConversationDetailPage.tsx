import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  api,
  type ConversationDetailResponse,
  type ConversationStatus,
  type MessageRole,
  type CollectedFacility,
  ApiError,
} from '../lib/api';

// Status badge component
function StatusBadge({ status }: { status: ConversationStatus }) {
  const styles: Record<ConversationStatus, string> = {
    active: 'bg-blue-100 text-blue-800',
    completed: 'bg-green-100 text-green-800',
    abandoned: 'bg-gray-100 text-gray-800',
    error: 'bg-red-100 text-red-800',
  };

  const labels: Record<ConversationStatus, string> = {
    active: 'Active',
    completed: 'Completed',
    abandoned: 'Abandoned',
    error: 'Error',
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}

// Email status badge
function EmailStatusBadge({ status }: { status: 'sent' | 'failed' | 'pending' | null }) {
  if (!status) return null;

  const styles = {
    sent: 'bg-green-100 text-green-800',
    failed: 'bg-red-100 text-red-800',
    pending: 'bg-yellow-100 text-yellow-800',
  };

  const labels = {
    sent: 'Email Sent',
    failed: 'Email Failed',
    pending: 'Email Pending',
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}

// Format date for display
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(date);
}

// Format time only
function formatTime(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

// Format weekdays
function formatWeekdays(days: number[]): string {
  const dayNames = ['', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  if (days.length === 7) return 'Every day';
  if (days.length === 5 && days.every((d) => d >= 1 && d <= 5)) return 'Mon-Fri';
  if (days.length === 2 && days.includes(6) && days.includes(7)) return 'Weekends';
  return days.map((d) => dayNames[d]).join(', ');
}

// Message bubble component
function MessageBubble({
  role,
  content,
  timestamp,
}: {
  role: MessageRole;
  content: string;
  timestamp: string;
}) {
  const isUser = role === 'user';
  const isSystem = role === 'system';

  if (isSystem) {
    return (
      <div className="flex justify-center my-2">
        <div className="bg-gray-100 text-gray-600 text-xs px-3 py-1 rounded-full max-w-md text-center">
          {content}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div
        className={`max-w-[80%] ${
          isUser ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-900'
        } rounded-lg px-4 py-2`}
      >
        <div className="text-sm whitespace-pre-wrap break-words">{content}</div>
        <div
          className={`text-xs mt-1 ${isUser ? 'text-blue-100' : 'text-gray-500'}`}
        >
          {formatTime(timestamp)}
        </div>
      </div>
    </div>
  );
}

// Facility card component
function FacilityCard({ facility, index }: { facility: CollectedFacility; index: number }) {
  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <h5 className="text-sm font-medium text-gray-900">
          {index + 1}. {facility.name}
        </h5>
        <span className="text-xs text-gray-500">{facility.sportName}</span>
      </div>
      <div className="space-y-1">
        {facility.schedules.map((schedule, sIndex) => (
          <div key={sIndex} className="text-xs text-gray-600 flex justify-between">
            <span>{formatWeekdays(schedule.weekdays)}</span>
            <span>
              {schedule.startTime} - {schedule.endTime} ({schedule.duration}min)
            </span>
            <span className="font-medium">{schedule.rate}€</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function ConversationDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [data, setData] = useState<ConversationDetailResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Load conversation detail
  const loadConversation = useCallback(async () => {
    if (!id) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await api.getConversation(id);
      setData(response);
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : 'Failed to load conversation. Please try again.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadConversation();
  }, [loadConversation]);

  // Copy ID to clipboard
  const handleCopyId = async () => {
    if (!id) return;
    try {
      await navigator.clipboard.writeText(id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = id;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (isLoading) {
    return (
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center py-12">
            <svg
              className="mx-auto h-8 w-8 text-gray-400 animate-spin"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <p className="mt-2 text-sm text-gray-500">Loading conversation...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <button
            onClick={() => navigate('/conversations')}
            className="mb-4 inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
          >
            <svg className="mr-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Conversations
          </button>
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <svg className="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
                <button
                  onClick={loadConversation}
                  className="mt-2 text-sm text-red-600 hover:text-red-500 underline"
                >
                  Try again
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { conversation, messages, collectedData, sportsCenter, emailStatus } = data;

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Back button */}
        <button
          onClick={() => navigate('/conversations')}
          className="mb-4 inline-flex items-center text-sm text-gray-500 hover:text-gray-700"
        >
          <svg className="mr-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Conversations
        </button>

        {/* Header */}
        <div className="mb-6 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">Conversation Details</h1>
              <StatusBadge status={conversation.status} />
              <EmailStatusBadge status={emailStatus} />
            </div>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-sm text-gray-500 font-mono">{conversation.id}</span>
              <button
                onClick={handleCopyId}
                className="inline-flex items-center text-xs text-gray-400 hover:text-gray-600"
                title="Copy conversation ID"
              >
                {copied ? (
                  <svg className="h-4 w-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                    />
                  </svg>
                )}
              </button>
            </div>
          </div>
          <button
            onClick={loadConversation}
            className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <svg className="mr-1.5 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Refresh
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left column - Messages */}
          <div className="lg:col-span-2">
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-3 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">
                  Messages ({messages.length})
                </h2>
              </div>
              <div className="p-4 max-h-[600px] overflow-y-auto">
                {messages.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">No messages yet</p>
                ) : (
                  messages.map((message) => (
                    <MessageBubble
                      key={message.id}
                      role={message.role}
                      content={message.content}
                      timestamp={message.timestamp}
                    />
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Right column - Metadata and collected data */}
          <div className="space-y-6">
            {/* Conversation Metadata */}
            <div className="bg-white shadow rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-900 mb-3">Conversation Info</h3>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-gray-500">Session ID</dt>
                  <dd className="text-gray-900 font-mono text-xs">{conversation.sessionId.slice(0, 12)}...</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Language</dt>
                  <dd className="text-gray-900 uppercase">{conversation.language || '-'}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Created</dt>
                  <dd className="text-gray-900">{formatDate(conversation.createdAt)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Updated</dt>
                  <dd className="text-gray-900">{formatDate(conversation.updatedAt)}</dd>
                </div>
              </dl>
            </div>

            {/* Sports Center Result */}
            {sportsCenter && (
              <div className="bg-white shadow rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
                  <svg className="h-4 w-4 text-green-500 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Sports Center Created
                </h3>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Sporttia ID</dt>
                    <dd className="text-gray-900 font-medium">{sportsCenter.sporttiaId}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Name</dt>
                    <dd className="text-gray-900">{sportsCenter.name}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">City</dt>
                    <dd className="text-gray-900">{sportsCenter.city}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Admin</dt>
                    <dd className="text-gray-900">{sportsCenter.adminName}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Email</dt>
                    <dd className="text-gray-900 text-xs">{sportsCenter.adminEmail}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Facilities</dt>
                    <dd className="text-gray-900">{sportsCenter.facilitiesCount}</dd>
                  </div>
                </dl>
              </div>
            )}

            {/* Collected Data */}
            {collectedData && (
              <div className="bg-white shadow rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-900 mb-3">Collected Data</h3>

                {/* Sports Center Info */}
                <div className="mb-4">
                  <h4 className="text-xs font-medium text-gray-500 uppercase mb-2">Sports Center</h4>
                  <dl className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Name</dt>
                      <dd className="text-gray-900">{collectedData.sportsCenterName || '-'}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-500">City</dt>
                      <dd className="text-gray-900">{collectedData.city || '-'}</dd>
                    </div>
                  </dl>
                </div>

                {/* Admin Info */}
                <div className="mb-4">
                  <h4 className="text-xs font-medium text-gray-500 uppercase mb-2">Administrator</h4>
                  <dl className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Name</dt>
                      <dd className="text-gray-900">{collectedData.adminName || '-'}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Email</dt>
                      <dd className="text-gray-900 text-xs">{collectedData.adminEmail || '-'}</dd>
                    </div>
                  </dl>
                </div>

                {/* Facilities */}
                {collectedData.facilities.length > 0 && (
                  <div className="mb-4">
                    <h4 className="text-xs font-medium text-gray-500 uppercase mb-2">
                      Facilities ({collectedData.facilities.length})
                    </h4>
                    <div className="space-y-2">
                      {collectedData.facilities.map((facility, index) => (
                        <FacilityCard key={index} facility={facility} index={index} />
                      ))}
                    </div>
                  </div>
                )}

                {/* Confirmation status */}
                <div className="flex items-center text-sm">
                  <span className="text-gray-500 mr-2">Confirmed:</span>
                  {collectedData.confirmed ? (
                    <span className="text-green-600 flex items-center">
                      <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Yes
                    </span>
                  ) : (
                    <span className="text-gray-400">No</span>
                  )}
                </div>
              </div>
            )}

            {/* Error Details */}
            {collectedData?.lastError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h3 className="text-sm font-medium text-red-800 mb-2 flex items-center">
                  <svg className="h-4 w-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  Last Error
                </h3>
                <dl className="space-y-1 text-sm">
                  <div>
                    <dt className="text-red-700 font-medium">{collectedData.lastError.code}</dt>
                    <dd className="text-red-600">{collectedData.lastError.message}</dd>
                  </div>
                  <div className="flex justify-between text-xs text-red-500">
                    <span>Retry count: {collectedData.lastError.retryCount}</span>
                    <span>{formatDate(collectedData.lastError.timestamp)}</span>
                  </div>
                </dl>
              </div>
            )}

            {/* Escalation Info */}
            {collectedData?.escalatedToHuman && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h3 className="text-sm font-medium text-yellow-800 mb-2 flex items-center">
                  <svg className="h-4 w-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                  Escalated to Human Support
                </h3>
                {collectedData.escalationReason && (
                  <p className="text-sm text-yellow-700">{collectedData.escalationReason}</p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
