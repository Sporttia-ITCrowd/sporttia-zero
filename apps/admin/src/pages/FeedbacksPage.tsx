import { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, FeedbacksListResponse } from '../lib/api';

// Get native language name using Intl API
function getLanguageName(code: string): string {
  try {
    const displayNames = new Intl.DisplayNames([code], { type: 'language' });
    return displayNames.of(code) || code;
  } catch {
    return code;
  }
}

// Format timestamp
function formatTimestamp(timestamp: string): string {
  return new Date(timestamp).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Star rating display component
function StarRating({ rating }: { rating: number | null }) {
  if (rating === null) return <span className="text-gray-400 text-sm">-</span>;

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <svg
          key={star}
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          className={`w-4 h-4 ${star <= rating ? 'fill-yellow-400 text-yellow-400' : 'fill-gray-200 text-gray-200'}`}
        >
          <path d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
        </svg>
      ))}
    </div>
  );
}

// Feedback row component
function FeedbackRow({
  feedback,
}: {
  feedback: {
    id: string;
    message: string;
    conversationId: string | null;
    language: string | null;
    rating: number | null;
    createdAt: string;
  };
}) {
  return (
    <div className="border-b border-gray-200 last:border-b-0 px-6 py-4 hover:bg-gray-50">
      <div className="flex items-start gap-4">
        {/* Timestamp */}
        <div className="flex-shrink-0 w-40 text-sm text-gray-500">
          {formatTimestamp(feedback.createdAt)}
        </div>

        {/* Rating */}
        <div className="flex-shrink-0 w-24">
          <StarRating rating={feedback.rating} />
        </div>

        {/* Language badge */}
        <div className="flex-shrink-0 w-24">
          {feedback.language && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              {getLanguageName(feedback.language)}
            </span>
          )}
        </div>

        {/* Message */}
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-900 whitespace-pre-wrap">
            {feedback.message || <span className="text-gray-400 italic">No comment</span>}
          </p>
        </div>

        {/* Conversation link */}
        <div className="flex-shrink-0">
          {feedback.conversationId && (
            <Link
              to={`/conversations/${feedback.conversationId}`}
              className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
            >
              View conversation
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

export function FeedbacksPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState<FeedbacksListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get current page from URL
  const currentPage = Number(searchParams.get('page')) || 1;

  // Load feedbacks
  const loadFeedbacks = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await api.getFeedbacks({
        page: currentPage,
        limit: 20,
      });
      setData(result);
    } catch (err) {
      console.error('Failed to load feedbacks:', err);
      setError('Failed to load feedbacks');
    } finally {
      setLoading(false);
    }
  }, [currentPage]);

  useEffect(() => {
    loadFeedbacks();
  }, [loadFeedbacks]);

  // Handle page change
  const handlePageChange = (page: number) => {
    const newParams = new URLSearchParams(searchParams);
    if (page === 1) {
      newParams.delete('page');
    } else {
      newParams.set('page', String(page));
    }
    setSearchParams(newParams);
  };

  if (loading && !data) {
    return (
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-8" />
            <div className="bg-white shadow rounded-lg p-6">
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-16 bg-gray-200 rounded" />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{error}</p>
            <button
              onClick={loadFeedbacks}
              className="mt-2 text-sm text-red-600 hover:text-red-500 underline"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">User Feedback</h1>
              <p className="mt-1 text-sm text-gray-500">
                {data?.pagination.total ?? 0} feedback submissions
              </p>
            </div>
            {data?.stats && data.stats.totalRatings > 0 && (
              <div className="bg-white shadow rounded-lg px-6 py-4 text-center">
                <div className="flex items-center justify-center gap-2">
                  <span className="text-3xl font-bold text-gray-900">
                    {data.stats.averageRating?.toFixed(1) ?? '-'}
                  </span>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    className="w-8 h-8 fill-yellow-400 text-yellow-400"
                  >
                    <path d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                  </svg>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Average rating ({data.stats.totalRatings} ratings)
                </p>
              </div>
            )}
          </div>
        </div>

        {data && (
          <div className="bg-white shadow rounded-lg overflow-hidden">
            {data.feedbacks.length === 0 ? (
              <div className="text-center py-16">
                <svg
                  className="mx-auto h-12 w-12 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
                <h3 className="mt-4 text-lg font-medium text-gray-900">No feedback yet</h3>
                <p className="mt-2 text-sm text-gray-500">
                  User feedback submissions will appear here.
                </p>
              </div>
            ) : (
              <>
                {/* Table header */}
                <div className="px-6 py-3 bg-gray-50 border-b border-gray-200 flex items-center gap-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <div className="w-40">Date</div>
                  <div className="w-24">Rating</div>
                  <div className="w-24">Language</div>
                  <div className="flex-1">Message</div>
                  <div className="w-32"></div>
                </div>

                {/* Feedback rows */}
                <div className="divide-y divide-gray-200">
                  {data.feedbacks.map((feedback) => (
                    <FeedbackRow key={feedback.id} feedback={feedback} />
                  ))}
                </div>

                {/* Pagination */}
                {data.pagination.totalPages > 1 && (
                  <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
                    <div className="text-sm text-gray-500">
                      Showing {(data.pagination.page - 1) * data.pagination.limit + 1} to{' '}
                      {Math.min(
                        data.pagination.page * data.pagination.limit,
                        data.pagination.total
                      )}{' '}
                      of {data.pagination.total} feedbacks
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Previous
                      </button>
                      <span className="text-sm text-gray-600">
                        Page {data.pagination.page} of {data.pagination.totalPages}
                      </span>
                      <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage >= data.pagination.totalPages}
                        className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
