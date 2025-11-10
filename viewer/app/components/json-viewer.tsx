'use client';

import { useState } from 'react';

interface JsonViewerProps {
  data: any;
  title?: string;
}

export default function JsonViewer({ data, title = 'Test Results' }: JsonViewerProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [copySuccess, setCopySuccess] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-lg border border-zinc-200 dark:border-zinc-800 p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold text-black dark:text-zinc-50">
          {title}
        </h2>
        <div className="flex gap-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            {isExpanded ? 'Collapse' : 'Expand'}
          </button>
          <button
            onClick={handleCopy}
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            {copySuccess ? '✓ Copied!' : 'Copy JSON'}
          </button>
        </div>
      </div>
      
      {isExpanded && (
        <div className="bg-zinc-100 dark:bg-zinc-800 rounded p-4 overflow-x-auto">
          <pre className="text-xs font-mono text-black dark:text-zinc-50">
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

