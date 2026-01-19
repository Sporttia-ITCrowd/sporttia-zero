import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api, MetricsResponse } from '../lib/api';

// Format seconds to human-readable duration
function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes < 60) {
    return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}

// Format date for display
function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

// Date range options
const dateRangeOptions = [
  { label: 'Last 7 days', days: 7 },
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 90 days', days: 90 },
];

// Metric card component
function MetricCard({
  title,
  value,
  icon,
  iconBgColor,
  iconColor,
  subtitle,
  onClick,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  iconBgColor: string;
  iconColor: string;
  subtitle?: string;
  onClick?: () => void;
}) {
  return (
    <div
      className={`bg-white overflow-hidden shadow rounded-lg ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
      onClick={onClick}
    >
      <div className="p-5">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className={`w-12 h-12 ${iconBgColor} rounded-lg flex items-center justify-center`}>
              <span className={iconColor}>{icon}</span>
            </div>
          </div>
          <div className="ml-5 w-0 flex-1">
            <dl>
              <dt className="text-sm font-medium text-gray-500 truncate">{title}</dt>
              <dd className="text-lg font-semibold text-gray-900">{value}</dd>
              {subtitle && <dd className="text-xs text-gray-400">{subtitle}</dd>}
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}

// Rate card component
function RateCard({
  title,
  rate,
  count,
  color,
  onClick,
}: {
  title: string;
  rate: number;
  count: number;
  color: 'green' | 'yellow' | 'red';
  onClick?: () => void;
}) {
  const bgColors = {
    green: 'bg-green-100',
    yellow: 'bg-yellow-100',
    red: 'bg-red-100',
  };
  const textColors = {
    green: 'text-green-600',
    yellow: 'text-yellow-600',
    red: 'text-red-600',
  };
  const barColors = {
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    red: 'bg-red-500',
  };

  return (
    <div
      className={`bg-white overflow-hidden shadow rounded-lg ${onClick ? 'cursor-pointer hover:shadow-md transition-shadow' : ''}`}
      onClick={onClick}
    >
      <div className="p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-500">{title}</h3>
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${bgColors[color]} ${textColors[color]}`}>
            {count}
          </span>
        </div>
        <div className="mt-3">
          <div className="flex items-baseline">
            <span className={`text-2xl font-bold ${textColors[color]}`}>{rate}%</span>
          </div>
          <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
            <div
              className={`${barColors[color]} h-2 rounded-full transition-all duration-300`}
              style={{ width: `${Math.min(rate, 100)}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// Funnel component
function ConversionFunnel({
  started,
  emailCaptured,
  completed,
}: {
  started: number;
  emailCaptured: number;
  completed: number;
}) {
  const stages = [
    { label: 'Started', value: started, color: 'bg-blue-500' },
    { label: 'Email Captured', value: emailCaptured, color: 'bg-indigo-500' },
    { label: 'Completed', value: completed, color: 'bg-green-500' },
  ];

  const maxValue = Math.max(started, 1);

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Conversion Funnel</h3>
      <div className="space-y-4">
        {stages.map((stage, index) => {
          const percentage = ((stage.value / maxValue) * 100).toFixed(1);
          const conversionFromPrevious =
            index > 0 && stages[index - 1].value > 0
              ? ((stage.value / stages[index - 1].value) * 100).toFixed(1)
              : null;

          return (
            <div key={stage.label}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-gray-700">{stage.label}</span>
                <div className="text-right">
                  <span className="text-sm font-semibold text-gray-900">{stage.value}</span>
                  {conversionFromPrevious && (
                    <span className="ml-2 text-xs text-gray-500">
                      ({conversionFromPrevious}% conversion)
                    </span>
                  )}
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-6 relative overflow-hidden">
                <div
                  className={`${stage.color} h-6 rounded-full transition-all duration-500 flex items-center justify-end pr-2`}
                  style={{ width: `${percentage}%`, minWidth: stage.value > 0 ? '40px' : '0' }}
                >
                  {Number(percentage) > 10 && (
                    <span className="text-xs text-white font-medium">{percentage}%</span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Simple bar chart component
function DailyTrendsChart({
  data,
}: {
  data: { date: string; total: number; completed: number; errors: number }[];
}) {
  const maxValue = Math.max(...data.map((d) => d.total), 1);

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <h3 className="text-lg font-medium text-gray-900 mb-4">Daily Conversations</h3>
      {data.length === 0 ? (
        <div className="text-center py-8 text-gray-500">No data for selected period</div>
      ) : (
        <div className="overflow-x-auto">
          <div className="flex items-end gap-1 h-48 min-w-max">
            {data.map((day) => {
              const totalHeight = (day.total / maxValue) * 100;
              const completedHeight = (day.completed / maxValue) * 100;
              const errorHeight = (day.errors / maxValue) * 100;

              return (
                <div
                  key={day.date}
                  className="flex flex-col items-center flex-1 min-w-[40px] max-w-[60px]"
                >
                  <div className="relative w-full h-40 flex flex-col justify-end">
                    {/* Total bar (background) */}
                    <div
                      className="w-full bg-gray-200 rounded-t relative"
                      style={{ height: `${totalHeight}%`, minHeight: day.total > 0 ? '4px' : '0' }}
                    >
                      {/* Completed portion */}
                      <div
                        className="absolute bottom-0 left-0 right-0 bg-green-500 rounded-t"
                        style={{ height: `${(completedHeight / totalHeight) * 100}%` }}
                      />
                      {/* Error portion (stacked on top of completed) */}
                      {day.errors > 0 && (
                        <div
                          className="absolute left-0 right-0 bg-red-500"
                          style={{
                            bottom: `${(completedHeight / totalHeight) * 100}%`,
                            height: `${(errorHeight / totalHeight) * 100}%`,
                          }}
                        />
                      )}
                    </div>
                    {/* Value label */}
                    {day.total > 0 && (
                      <div className="absolute -top-5 left-0 right-0 text-center">
                        <span className="text-xs text-gray-600">{day.total}</span>
                      </div>
                    )}
                  </div>
                  <div className="mt-2 text-xs text-gray-500 transform -rotate-45 origin-top-left whitespace-nowrap">
                    {formatDate(day.date)}
                  </div>
                </div>
              );
            })}
          </div>
          {/* Legend */}
          <div className="flex items-center justify-center gap-6 mt-8 pt-4 border-t">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-gray-200 rounded" />
              <span className="text-xs text-gray-600">Other</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded" />
              <span className="text-xs text-gray-600">Completed</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded" />
              <span className="text-xs text-gray-600">Errors</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function DashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<MetricsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRange, setSelectedRange] = useState(30);

  const loadMetrics = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - selectedRange * 24 * 60 * 60 * 1000);

      const data = await api.getMetrics({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });
      setMetrics(data);
    } catch (err) {
      console.error('Failed to load metrics:', err);
      setError('Failed to load dashboard metrics');
    } finally {
      setLoading(false);
    }
  }, [selectedRange]);

  useEffect(() => {
    loadMetrics();
  }, [loadMetrics]);

  // Navigate to filtered conversations
  const navigateToConversations = (status?: string) => {
    const params = new URLSearchParams();
    if (status && status !== 'all') {
      params.set('status', status);
    }
    navigate(`/conversations${params.toString() ? `?${params.toString()}` : ''}`);
  };

  // Icons
  const ChatIcon = (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
      />
    </svg>
  );

  const CalendarIcon = (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
      />
    </svg>
  );

  const ClockIcon = (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  );

  const ChartIcon = (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
      />
    </svg>
  );

  if (loading && !metrics) {
    return (
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/4 mb-8" />
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="bg-white shadow rounded-lg p-5">
                  <div className="h-12 bg-gray-200 rounded w-1/3 mb-4" />
                  <div className="h-6 bg-gray-200 rounded w-1/2" />
                </div>
              ))}
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
              onClick={loadMetrics}
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
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="mt-1 text-sm text-gray-500">Welcome back, {user?.name || 'Admin'}!</p>
          </div>

          {/* Date range selector */}
          <div className="flex items-center gap-2">
            <label htmlFor="date-range" className="text-sm text-gray-500">
              Period:
            </label>
            <select
              id="date-range"
              value={selectedRange}
              onChange={(e) => setSelectedRange(Number(e.target.value))}
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

        {metrics && (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 mb-8">
              <MetricCard
                title="Conversations Today"
                value={metrics.totals.today}
                icon={ChatIcon}
                iconBgColor="bg-blue-100"
                iconColor="text-blue-600"
                onClick={() => navigateToConversations()}
              />
              <MetricCard
                title="This Week"
                value={metrics.totals.thisWeek}
                icon={CalendarIcon}
                iconBgColor="bg-indigo-100"
                iconColor="text-indigo-600"
                onClick={() => navigateToConversations()}
              />
              <MetricCard
                title="Active Now"
                value={metrics.byStatus.allTime.active}
                icon={ClockIcon}
                iconBgColor="bg-yellow-100"
                iconColor="text-yellow-600"
                onClick={() => navigateToConversations('active')}
              />
              <MetricCard
                title="All Time"
                value={metrics.totals.allTime}
                icon={ChartIcon}
                iconBgColor="bg-gray-100"
                iconColor="text-gray-600"
                onClick={() => navigateToConversations()}
              />
            </div>

            {/* Rate cards */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-3 mb-8">
              <RateCard
                title="Completion Rate"
                rate={metrics.rates.completion}
                count={metrics.byStatus.period.completed}
                color="green"
                onClick={() => navigateToConversations('completed')}
              />
              <RateCard
                title="Abandonment Rate"
                rate={metrics.rates.abandonment}
                count={metrics.byStatus.period.abandoned}
                color="yellow"
                onClick={() => navigateToConversations('abandoned')}
              />
              <RateCard
                title="Error Rate"
                rate={metrics.rates.error}
                count={metrics.byStatus.period.error}
                color="red"
                onClick={() => navigateToConversations('error')}
              />
            </div>

            {/* Average duration card */}
            {metrics.avgDurationSeconds > 0 && (
              <div className="mb-8">
                <div className="bg-white shadow rounded-lg p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                        <svg
                          className="w-6 h-6 text-purple-600"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                          />
                        </svg>
                      </div>
                    </div>
                    <div className="ml-5">
                      <h3 className="text-sm font-medium text-gray-500">
                        Average Conversation Duration
                      </h3>
                      <p className="text-2xl font-bold text-gray-900">
                        {formatDuration(metrics.avgDurationSeconds)}
                      </p>
                      <p className="text-xs text-gray-400">For completed conversations</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Funnel and Chart row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
              <ConversionFunnel
                started={metrics.funnel.started}
                emailCaptured={metrics.funnel.emailCaptured}
                completed={metrics.funnel.completed}
              />
              <DailyTrendsChart data={metrics.dailyTrends} />
            </div>

            {/* Quick stats table */}
            <div className="bg-white shadow rounded-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Status Breakdown</h3>
                <p className="text-sm text-gray-500">
                  Comparing selected period to all time
                </p>
              </div>
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Period
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      All Time
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {(['active', 'completed', 'abandoned', 'error'] as const).map((status) => (
                    <tr key={status} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            status === 'active'
                              ? 'bg-blue-100 text-blue-800'
                              : status === 'completed'
                                ? 'bg-green-100 text-green-800'
                                : status === 'abandoned'
                                  ? 'bg-gray-100 text-gray-800'
                                  : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {status.charAt(0).toUpperCase() + status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-900">
                        {metrics.byStatus.period[status]}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-gray-500">
                        {metrics.byStatus.allTime[status]}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                        <button
                          onClick={() => navigateToConversations(status)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          View →
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
