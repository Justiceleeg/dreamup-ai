import Link from 'next/link';
import TestForm from './components/test-form';

interface TestRun {
  gameId: string;
  timestamp: string;
  gameUrl: string;
  testId: string;
  screenshotCount: number;
  hasConsoleLogs: boolean;
  totalDuration?: number;
  testStartTime: number;
}

async function getTests(): Promise<TestRun[]> {
  try {
    // During SSR on Railway, use internal port 8080
    // In production browser requests, use public domain
    // In development, use localhost:3000
    const isServer = typeof window === 'undefined';
    const isDev = process.env.NODE_ENV === 'development';
    
    let baseUrl: string;
    if (isServer) {
      // Server-side: use localhost on Railway's internal port
      baseUrl = isDev ? 'http://localhost:3000' : 'http://localhost:8080';
    } else {
      // Client-side: use current origin
      baseUrl = '';
    }
    
    const res = await fetch(`${baseUrl}/api/tests`, {
      cache: 'no-store',
    });

    if (!res.ok) {
      console.error('Failed to fetch tests:', res.status, res.statusText);
      return [];
    }

    const data = await res.json();
    return data.tests || [];
  } catch (error) {
    console.error('Error fetching tests:', error);
    return [];
  }
}

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDuration(ms?: number): string {
  if (!ms) return 'N/A';
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds}s`;
}

function getStatusBadgeClass(status: string): string {
  // This is a placeholder - you might want to add status to the API response
  return 'bg-gray-100 text-gray-800';
}

export default async function Home() {
  const tests = await getTests();

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-black dark:text-zinc-50 mb-2">
            DreamUp QA Test Results
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400">
            View test results and screenshots from game QA tests
          </p>
        </div>

        <TestForm />

        {tests.length === 0 ? (
          <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-8 text-center">
            <p className="text-zinc-600 dark:text-zinc-400">
              No test results found. Run the QA agent to generate test results.
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {tests.map((test) => {
              // Convert ISO timestamp to directory format (YYYY-MM-DDTHH-MM-SS)
              // The directory name format matches what EvidenceCapture generates
              const date = new Date(test.timestamp);
              const timestampPath = date.toISOString().replace(/[:.]/g, '-').substring(0, 19);
              const testUrl = `/test/${test.gameId}/${timestampPath}`;

              return (
                <Link
                  key={`${test.gameId}-${test.timestamp}`}
                  href={testUrl}
                  className="block bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6 hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h2 className="text-xl font-semibold text-black dark:text-zinc-50 mb-2">
                        {test.gameUrl}
                      </h2>
                      <div className="flex flex-wrap gap-4 text-sm text-zinc-600 dark:text-zinc-400">
                        <span>Game ID: {test.gameId}</span>
                        <span>•</span>
                        <span>{formatTimestamp(test.timestamp)}</span>
                        <span>•</span>
                        <span>{test.screenshotCount} screenshots</span>
                        {test.hasConsoleLogs && (
                          <>
                            <span>•</span>
                            <span>Console logs</span>
                          </>
                        )}
                        {test.totalDuration && (
                          <>
                            <span>•</span>
                            <span>Duration: {formatDuration(test.totalDuration)}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="ml-4">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                        View Details →
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
