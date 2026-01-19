import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  api,
  type ConversationSummary,
  type ConversationStatus,
  type ConversationsListParams,
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

// Format date for display
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

// Format date for input
function formatDateForInput(date: Date): string {
  return date.toISOString().split('T')[0];
}

export function ConversationsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // State
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters from URL params
  const [filters, setFilters] = useState<ConversationsListParams>({
    status: (searchParams.get('status') as ConversationStatus | 'all') || 'all',
    startDate: searchParams.get('startDate') || '',
    endDate: searchParams.get('endDate') || '',
    search: searchParams.get('search') || '',
    page: parseInt(searchParams.get('page') || '1', 10),
    limit: 20,
    sortBy: 'created_at',
    sortOrder: 'desc',
  });

  // Load conversations
  const loadConversations = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params: ConversationsListParams = {
        ...filters,
        startDate: filters.startDate || undefined,
        endDate: filters.endDate || undefined,
        search: filters.search || undefined,
      };

      const response = await api.getConversations(params);
      setConversations(response.conversations);
      setPagination(response.pagination);
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : 'Failed to load conversations. Please try again.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  // Load conversations on mount and when filters change
  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Update URL params when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.status && filters.status !== 'all') params.set('status', filters.status);
    if (filters.startDate) params.set('startDate', filters.startDate);
    if (filters.endDate) params.set('endDate', filters.endDate);
    if (filters.search) params.set('search', filters.search);
    if (filters.page && filters.page > 1) params.set('page', filters.page.toString());
    setSearchParams(params);
  }, [filters, setSearchParams]);

  // Handle filter changes
  const handleFilterChange = (key: keyof ConversationsListParams, value: string | number) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
      page: key === 'page' ? Number(value) : 1, // Reset to page 1 when changing other filters
    }));
  };

  // Handle row click
  const handleRowClick = (id: string) => {
    navigate(`/conversations/${id}`);
  };

  // Handle refresh
  const handleRefresh = () => {
    loadConversations();
  };

  // Clear filters
  const handleClearFilters = () => {
    setFilters({
      status: 'all',
      startDate: '',
      endDate: '',
      search: '',
      page: 1,
      limit: 20,
      sortBy: 'created_at',
      sortOrder: 'desc',
    });
  };

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Conversations</h1>
            <p className="mt-1 text-sm text-gray-500">
              View and manage all onboarding conversations
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            <svg
              className={`-ml-1 mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
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

        {/* Filters */}
        <div className="mb-6 bg-white shadow rounded-lg p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Status filter */}
            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700">
                Status
              </label>
              <select
                id="status"
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              >
                <option value="all">All</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
                <option value="abandoned">Abandoned</option>
                <option value="error">Error</option>
              </select>
            </div>

            {/* Start date */}
            <div>
              <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">
                From Date
              </label>
              <input
                type="date"
                id="startDate"
                value={filters.startDate}
                max={filters.endDate || formatDateForInput(new Date())}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
                className="mt-1 block w-full pl-3 pr-3 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              />
            </div>

            {/* End date */}
            <div>
              <label htmlFor="endDate" className="block text-sm font-medium text-gray-700">
                To Date
              </label>
              <input
                type="date"
                id="endDate"
                value={filters.endDate}
                min={filters.startDate || undefined}
                max={formatDateForInput(new Date())}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
                className="mt-1 block w-full pl-3 pr-3 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              />
            </div>

            {/* Search */}
            <div>
              <label htmlFor="search" className="block text-sm font-medium text-gray-700">
                Search
              </label>
              <input
                type="text"
                id="search"
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                placeholder="ID or admin email"
                className="mt-1 block w-full pl-3 pr-3 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
              />
            </div>

            {/* Clear filters */}
            <div className="flex items-end">
              <button
                onClick={handleClearFilters}
                className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <svg
                className="h-5 w-5 text-red-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="ml-3 text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* Table */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          {isLoading ? (
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
              <p className="mt-2 text-sm text-gray-500">Loading conversations...</p>
            </div>
          ) : conversations.length === 0 ? (
            <div className="text-center py-12">
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
              <h3 className="mt-2 text-sm font-medium text-gray-900">No conversations found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {filters.status !== 'all' || filters.search || filters.startDate || filters.endDate
                  ? 'Try adjusting your filters.'
                  : 'Conversations will appear here when users start chatting.'}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        ID
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Status
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Language
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Sports Center
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Created
                      </th>
                      <th
                        scope="col"
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        Updated
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {conversations.map((conversation) => (
                      <tr
                        key={conversation.id}
                        onClick={() => handleRowClick(conversation.id)}
                        className="hover:bg-gray-50 cursor-pointer transition-colors"
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {conversation.id.slice(0, 8)}...
                          </div>
                          {conversation.collectedData?.adminEmail && (
                            <div className="text-sm text-gray-500">
                              {conversation.collectedData.adminEmail}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <StatusBadge status={conversation.status} />
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-900 uppercase">
                            {conversation.language || '-'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {conversation.sportsCenter ? (
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {conversation.sportsCenter.name}
                              </div>
                              <div className="text-sm text-gray-500">
                                ID: {conversation.sportsCenter.sporttiaId}
                              </div>
                            </div>
                          ) : conversation.collectedData?.sportsCenterName ? (
                            <div className="text-sm text-gray-500 italic">
                              {conversation.collectedData.sportsCenterName} (pending)
                            </div>
                          ) : (
                            <span className="text-sm text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(conversation.createdAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(conversation.updatedAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                  <div className="flex-1 flex justify-between sm:hidden">
                    <button
                      onClick={() => handleFilterChange('page', Math.max(1, pagination.page - 1))}
                      disabled={pagination.page <= 1}
                      className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() =>
                        handleFilterChange('page', Math.min(pagination.totalPages, pagination.page + 1))
                      }
                      disabled={pagination.page >= pagination.totalPages}
                      className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                  <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-gray-700">
                        Showing{' '}
                        <span className="font-medium">
                          {(pagination.page - 1) * pagination.limit + 1}
                        </span>{' '}
                        to{' '}
                        <span className="font-medium">
                          {Math.min(pagination.page * pagination.limit, pagination.total)}
                        </span>{' '}
                        of <span className="font-medium">{pagination.total}</span> results
                      </p>
                    </div>
                    <div>
                      <nav
                        className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px"
                        aria-label="Pagination"
                      >
                        <button
                          onClick={() => handleFilterChange('page', Math.max(1, pagination.page - 1))}
                          disabled={pagination.page <= 1}
                          className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                        >
                          <span className="sr-only">Previous</span>
                          <svg
                            className="h-5 w-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15 19l-7-7 7-7"
                            />
                          </svg>
                        </button>
                        {/* Page numbers */}
                        {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                          let pageNum: number;
                          if (pagination.totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (pagination.page <= 3) {
                            pageNum = i + 1;
                          } else if (pagination.page >= pagination.totalPages - 2) {
                            pageNum = pagination.totalPages - 4 + i;
                          } else {
                            pageNum = pagination.page - 2 + i;
                          }
                          return (
                            <button
                              key={pageNum}
                              onClick={() => handleFilterChange('page', pageNum)}
                              className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                                pageNum === pagination.page
                                  ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                                  : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                              }`}
                            >
                              {pageNum}
                            </button>
                          );
                        })}
                        <button
                          onClick={() =>
                            handleFilterChange('page', Math.min(pagination.totalPages, pagination.page + 1))
                          }
                          disabled={pagination.page >= pagination.totalPages}
                          className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                        >
                          <span className="sr-only">Next</span>
                          <svg
                            className="h-5 w-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 5l7 7-7 7"
                            />
                          </svg>
                        </button>
                      </nav>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
