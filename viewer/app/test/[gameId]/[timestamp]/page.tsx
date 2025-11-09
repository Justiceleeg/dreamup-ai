import Link from 'next/link';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import JsonViewer from '../../../components/json-viewer';

interface Screenshot {
  filename: string;
  timestamp: number;
  url: string;
  description: string;
  index: number;
}

interface TestManifest {
  gameId: string;
  testId: string;
  timestamp: string;
  gameUrl: string;
  screenshots: Screenshot[];
  consoleLogs: Array<{
    level: string;
    message: string;
    timestamp: number;
    args?: string[];
  }>;
  testStartTime: number;
  testEndTime?: number;
  totalDuration?: number;
}

interface TestDetails {
  manifest: TestManifest;
  consoleLog: string;
  testOutput?: any; // The JSON output from the CLI
}

async function getTestDetails(
  gameId: string,
  timestamp: string
): Promise<TestDetails | null> {
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
  
  const res = await fetch(`${baseUrl}/api/tests/${gameId}/${timestamp}`, {
    cache: 'no-store',
  });

  if (!res.ok) {
    return null;
  }

  return res.json();
}

function formatTimestamp(timestamp: string | number): string {
  const date = typeof timestamp === 'number' 
    ? new Date(timestamp) 
    : new Date(timestamp);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
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

function getScreenshotUrl(gameId: string, timestamp: string, filename: string): string {
  // Always use API route - it will check both runtime and static directories
  return `/api/screenshots/${gameId}/${timestamp}/${filename}`;
}

function getConsoleLogUrl(gameId: string, timestamp: string): string {
  // Always use API route - it will check both runtime and static directories
  return `/api/screenshots/${gameId}/${timestamp}/console.log`;
}

export default async function TestDetailPage({
  params,
}: {
  params: Promise<{ gameId: string; timestamp: string }>;
}) {
  const { gameId, timestamp } = await params;
  const testDetails = await getTestDetails(gameId, timestamp);

  if (!testDetails) {
    notFound();
  }

  const { manifest, consoleLog, testOutput } = testDetails;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black">
      <main className="container mx-auto px-4 py-8 max-w-6xl">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-zinc-50 mb-6 text-sm"
        >
          ← Back to Test Results
        </Link>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-black dark:text-zinc-50 mb-2">
            Test Results
          </h1>
          <p className="text-zinc-600 dark:text-zinc-400 break-all">
            {manifest.gameUrl}
          </p>
        </div>

        {/* Test Output JSON */}
        {testOutput && <JsonViewer data={testOutput} title="Test Results (JSON)" />}

        {/* Metadata Section */}
        <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6 mb-6">
          <h2 className="text-xl font-semibold text-black dark:text-zinc-50 mb-4">
            Test Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-zinc-600 dark:text-zinc-400">Game ID:</span>
              <span className="ml-2 font-mono text-black dark:text-zinc-50">
                {manifest.gameId}
              </span>
            </div>
            <div>
              <span className="text-zinc-600 dark:text-zinc-400">Test ID:</span>
              <span className="ml-2 font-mono text-black dark:text-zinc-50 text-xs">
                {manifest.testId}
              </span>
            </div>
            <div>
              <span className="text-zinc-600 dark:text-zinc-400">Started:</span>
              <span className="ml-2 text-black dark:text-zinc-50">
                {formatTimestamp(manifest.timestamp)}
              </span>
            </div>
            <div>
              <span className="text-zinc-600 dark:text-zinc-400">Duration:</span>
              <span className="ml-2 text-black dark:text-zinc-50">
                {formatDuration(manifest.totalDuration)}
              </span>
            </div>
            <div>
              <span className="text-zinc-600 dark:text-zinc-400">Screenshots:</span>
              <span className="ml-2 text-black dark:text-zinc-50">
                {manifest.screenshots.length}
              </span>
            </div>
            <div>
              <span className="text-zinc-600 dark:text-zinc-400">Console Logs:</span>
              <span className="ml-2 text-black dark:text-zinc-50">
                {manifest.consoleLogs.length} entries
              </span>
            </div>
          </div>
        </div>

        {/* Screenshots Section */}
        {manifest.screenshots.length > 0 && (
          <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6 mb-6">
            <h2 className="text-xl font-semibold text-black dark:text-zinc-50 mb-4">
              Screenshots ({manifest.screenshots.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {manifest.screenshots.map((screenshot) => {
                const screenshotUrl = getScreenshotUrl(
                  gameId,
                  timestamp,
                  screenshot.filename
                );
                return (
                  <div
                    key={screenshot.index}
                    className="border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden hover:shadow-lg transition-shadow"
                  >
                    <div className="relative aspect-video bg-zinc-100 dark:bg-zinc-800">
                      <Image
                        src={screenshotUrl}
                        alt={screenshot.description}
                        fill
                        className="object-contain"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      />
                    </div>
                    <div className="p-3">
                      <p className="text-sm font-medium text-black dark:text-zinc-50 mb-1">
                        {screenshot.description}
                      </p>
                      <p className="text-xs text-zinc-600 dark:text-zinc-400">
                        {formatTimestamp(screenshot.timestamp)}
                      </p>
                      <a
                        href={screenshotUrl}
                        download={screenshot.filename}
                        className="mt-2 inline-block text-xs text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        Download
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Console Logs Section */}
        {consoleLog && (
          <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-black dark:text-zinc-50">
                Console Logs
              </h2>
              <a
                href={getConsoleLogUrl(gameId, timestamp)}
                download="console.log"
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                Download
              </a>
            </div>
            <pre className="bg-zinc-100 dark:bg-zinc-800 rounded p-4 overflow-x-auto text-xs font-mono text-black dark:text-zinc-50">
              {consoleLog}
            </pre>
          </div>
        )}

        {/* Console Logs from Manifest */}
        {manifest.consoleLogs.length > 0 && !consoleLog && (
          <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6 mb-6">
            <h2 className="text-xl font-semibold text-black dark:text-zinc-50 mb-4">
              Console Logs ({manifest.consoleLogs.length} entries)
            </h2>
            <div className="bg-zinc-100 dark:bg-zinc-800 rounded p-4 max-h-96 overflow-y-auto">
              {manifest.consoleLogs.map((log, index) => (
                <div
                  key={index}
                  className="mb-2 text-xs font-mono text-black dark:text-zinc-50"
                >
                  <span className="text-zinc-600 dark:text-zinc-400">
                    [{formatTimestamp(log.timestamp)}]
                  </span>
                  <span
                    className={`ml-2 ${
                      log.level === 'error'
                        ? 'text-red-600 dark:text-red-400'
                        : log.level === 'warn'
                        ? 'text-yellow-600 dark:text-yellow-400'
                        : 'text-black dark:text-zinc-50'
                    }`}
                  >
                    [{log.level.toUpperCase()}]
                  </span>
                  <span className="ml-2">{log.message}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

