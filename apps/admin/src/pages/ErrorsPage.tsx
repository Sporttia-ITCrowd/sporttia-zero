import { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, ErrorsListResponse, ErrorType } from '../lib/api';

// Error type labels and colors
const ERROR_TYPE_CONFIG: Record<
  ErrorType,
  { label: string; bgColor: string; textColor: string; description: string }
> = {
  sporttia_api_error: {
    label: 'Sporttia API',
    bgColor: 'bg-orange-100',
    textColor: 'text-orange-800',
    description: 'Errors from Sporttia API calls',
  },
  openai_api_error: {
    label: 'OpenAI API',
    bgColor: 'bg-purple-100',
    textColor: 'text-purple-800',
    description: 'Errors from OpenAI API calls',
  },
  email_failed: {
    label: 'Email',
    bgColor: 'bg-red-100',
    textColor: 'text-red-800',
    description: 'Failed email sends',
  },
  validation_error: {
    label: 'Validation',
    bgColor: 'bg-yellow-100',
    textColor: 'text-yellow-800',
    description: 'Data validation errors',
  },
  internal_error: {
    label: 'Internal',
    bgColor: 'bg-gray-100',
    textColor: 'text-gray-800',
    description: 'Internal system errors',
  },
};

// Date range options
const dateRangeOptions = [
  { label: 'Last 7 days', days: 7 },
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 90 days', days: 90 },
];

// Format timestamp
function formatTimestamp(timestamp: string): string {
  return new Date(timestamp).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Error type badge component
function ErrorTypeBadge({ type }: { type: ErrorType }) {
  const config = ERROR_TYPE_CONFIG[type];
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bgColor} ${config.textColor}`}
    >
      {config.label}
    </span>
  );
}

// Summary card component
function SummaryCard({
  type,
  count,
  isSelected,
  onClick,
}: {
  type: ErrorType;
  count: number;
  isSelected: boolean;
  onClick: () => void;
}) {
  const config = ERROR_TYPE_CONFIG[type];
  return (
    <button
      onClick={onClick}
      className={`bg-white overflow-hidden shadow rounded-lg p-4 text-left w-full transition-all ${
        isSelected ? 'ring-2 ring-blue-500' : 'hover:shadow-md'
      }`}
    >
      <div className="flex items-center justify-between">
        <span className={`text-sm font-medium ${config.textColor}`}>{config.label}</span>
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${config.bgColor} ${config.textColor}`}
        >
          {count}
        </span>
      </div>
      <p className="mt-1 text-xs text-gray-500">{config.description}</p>
    </button>
  );
}

// Error row component with expandable details
function ErrorRow({
  error,
  isExpanded,
  onToggle,
}: {
  error: {
    id: string;
    conversationId: string | null;
    errorType: ErrorType;
    message: string;
    details: Record<string, unknown> | null;
    timestamp: string;
  };
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="border-b border-gray-200 last:border-b-0">
      <div
        className="px-6 py-4 cursor-pointer hover:bg-gray-50 flex items-center gap-4"
        onClick={onToggle}
      >
        {/* Expand/collapse icon */}
        <button className="flex-shrink-0 text-gray-400 hover:text-gray-600">
          <svg
            className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>

        {/* Timestamp */}
        <div className="flex-shrink-0 w-32 text-sm text-gray-500">
          {formatTimestamp(error.timestamp)}
        </div>

        {/* Error type badge */}
        <div className="flex-shrink-0 w-28">
          <ErrorTypeBadge type={error.errorType} />
        </div>

        {/* Message */}
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-900 truncate">{error.message}</p>
        </div>

        {/* Conversation link */}
        {error.conversationId && (
          <Link
            to={`/conversations/${error.conversationId}`}
            onClick={(e) => e.stopPropagation()}
            className="flex-shrink-0 text-sm text-blue-600 hover:text-blue-800 hover:underline"
          >
            View conversation
          </Link>
        )}
      </div>

      {/* Expanded details */}
      {isExpanded && error.details && (
        <div className="px-6 pb-4 pl-16 bg-gray-50">
          <div className="rounded-lg bg-gray-900 p-4 overflow-x-auto">
            <pre className="text-xs text-gray-100 whitespace-pre-wrap break-words">
              {JSON.stringify(error.details, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

export function ErrorsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [data, setData] = useState<ErrorsListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Get filters from URL
  const selectedType = (searchParams.get('errorType') as ErrorType | 'all') || 'all';
  const selectedRange = Number(searchParams.get('days')) || 30;
  const currentPage = Number(searchParams.get('page')) || 1;

  // Load errors
  const loadErrors = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - selectedRange * 24 * 60 * 60 * 1000);

      const result = await api.getErrors({
        errorType: selectedType,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        page: currentPage,
        limit: 20,
      });
      setData(result);
    } catch (err) {
      console.error('Failed to load errors:', err);
      setError('Failed to load error log');
    } finally {
      setLoading(false);
    }
  }, [selectedType, selectedRange, currentPage]);

  useEffect(() => {
    loadErrors();
  }, [loadErrors]);

  // Update URL params
  const updateParams = (updates: Record<string, string | number | undefined>) => {
    const newParams = new URLSearchParams(searchParams);

    for (const [key, value] of Object.entries(updates)) {
      if (value === undefined || value === 'all' || (key === 'page' && value === 1)) {
        newParams.delete(key);
      } else {
        newParams.set(key, String(value));
      }
    }

    setSearchParams(newParams);
  };

  // Handle filter changes
  const handleTypeChange = (type: ErrorType | 'all') => {
    updateParams({ errorType: type === 'all' ? undefined : type, page: 1 });
  };

  const handleRangeChange = (days: number) => {
    updateParams({ days: days === 30 ? undefined : days, page: 1 });
  };

  const handlePageChange = (page: number) => {
    updateParams({ page: page === 1 ? undefined : page });
  };

  // Calculate total errors
  const totalErrors = data ? Object.values(data.summary).reduce((a, b) => a + b, 0) : 0;

  if (loading && !data) {
    return (
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-8" />
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 lg:grid-cols-5 mb-8">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="bg-white shadow rounded-lg p-4">
                  <div className="h-4 bg-gray-200 rounded w-1/2 mb-2" />
                  <div className="h-3 bg-gray-200 rounded w-3/4" />
                </div>
              ))}
            </div>
            <div className="bg-white shadow rounded-lg p-6">
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-12 bg-gray-200 rounded" />
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
              onClick={loadErrors}
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
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Error Log</h1>
            <p className="mt-1 text-sm text-gray-500">
              {totalErrors} errors in the selected period
            </p>
          </div>

          {/* Date range selector */}
          <div className="flex items-center gap-2">
            <label htmlFor="date-range" className="text-sm text-gray-500">
              Period:
            </label>
            <select
              id="date-range"
              value={selectedRange}
              onChange={(e) => handleRangeChange(Number(e.target.value))}
              className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
            >
              {dateRangeOptions.map((option) => (
                <option key={option.days} value={option.days}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {data && (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5 mb-8">
              {(Object.keys(ERROR_TYPE_CONFIG) as ErrorType[]).map((type) => (
                <SummaryCard
                  key={type}
                  type={type}
                  count={data.summary[type]}
                  isSelected={selectedType === type}
                  onClick={() => handleTypeChange(selectedType === type ? 'all' : type)}
                />
              ))}
            </div>

            {/* Filter indicator */}
            {selectedType !== 'all' && (
              <div className="mb-4 flex items-center gap-2">
                <span className="text-sm text-gray-500">Filtered by:</span>
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${ERROR_TYPE_CONFIG[selectedType].bgColor} ${ERROR_TYPE_CONFIG[selectedType].textColor}`}
                >
                  {ERROR_TYPE_CONFIG[selectedType].label}
                  <button
                    onClick={() => handleTypeChange('all')}
                    className="ml-1 hover:opacity-70"
                  >
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </button>
                </span>
              </div>
            )}

            {/* Error list */}
            <div className="bg-white shadow rounded-lg overflow-hidden">
              {data.errors.length === 0 ? (
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
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <h3 className="mt-4 text-lg font-medium text-gray-900">No errors found</h3>
                  <p className="mt-2 text-sm text-gray-500">
                    {selectedType !== 'all'
                      ? `No ${ERROR_TYPE_CONFIG[selectedType].label.toLowerCase()} errors in the selected period.`
                      : 'No errors recorded in the selected period.'}
                  </p>
                </div>
              ) : (
                <>
                  {/* Table header */}
                  <div className="px-6 py-3 bg-gray-50 border-b border-gray-200 flex items-center gap-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="w-5" /> {/* Icon space */}
                    <div className="w-32">Timestamp</div>
                    <div className="w-28">Type</div>
                    <div className="flex-1">Message</div>
                    <div className="w-32" /> {/* Link space */}
                  </div>

                  {/* Error rows */}
                  <div className="divide-y divide-gray-200">
                    {data.errors.map((err) => (
                      <ErrorRow
                        key={err.id}
                        error={err}
                        isExpanded={expandedId === err.id}
                        onToggle={() => setExpandedId(expandedId === err.id ? null : err.id)}
                      />
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
                        of {data.pagination.total} errors
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
          </>
        )}
      </div>
    </div>
  );
}
