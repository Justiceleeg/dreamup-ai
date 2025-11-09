'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function TestForm() {
  const [gameUrl, setGameUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!gameUrl.trim()) {
      setError('Please enter a valid URL');
      return;
    }

    // Basic URL validation
    try {
      new URL(gameUrl);
    } catch {
      setError('Please enter a valid URL (e.g., https://example.com/game)');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ gameUrl }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Test failed');
      }

      // Test completed successfully - refresh the page to show new results
      router.refresh();
      setGameUrl('');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to run test';
      setError(errorMessage);
      console.error('Test error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6 mb-8">
      <h2 className="text-xl font-semibold text-black dark:text-zinc-50 mb-4">
        Run New Test
      </h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            htmlFor="gameUrl"
            className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2"
          >
            Game URL
          </label>
          <div className="flex gap-2">
            <input
              type="url"
              id="gameUrl"
              value={gameUrl}
              onChange={(e) => {
                setGameUrl(e.target.value);
                setError(null);
              }}
              placeholder="https://example.com/game"
              className="flex-1 px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-black dark:text-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isLoading}
              required
            />
            <button
              type="submit"
              disabled={isLoading || !gameUrl.trim()}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'Testing...' : 'Run Test'}
            </button>
          </div>
          {error && (
            <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>
          )}
          <p className="mt-2 text-xs text-zinc-500 dark:text-zinc-400">
            Note: Tests run with a 60-second timeout on web. For longer tests, deploy to Railway or use the CLI tool.
          </p>
        </div>
      </form>
    </div>
  );
}

