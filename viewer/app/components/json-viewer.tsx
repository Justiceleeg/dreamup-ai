'use client';

import { useState } from 'react';

interface JsonViewerProps {
  data: any;
  title?: string;
}

export default function JsonViewer({ data, title = 'Test Results' }: JsonViewerProps) {
  const [isExpanded, setIsExpanded] = useState(true);

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
            onClick={() => {
              navigator.clipboard.writeText(JSON.stringify(data, null, 2));
            }}
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
          >
            Copy JSON
          </button>
        </div>
      </div>
      
      {isExpanded ? (
        <div className="bg-zinc-100 dark:bg-zinc-800 rounded p-4 overflow-x-auto">
          <pre className="text-xs font-mono text-black dark:text-zinc-50">
            {JSON.stringify(data, null, 2)}
          </pre>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-zinc-600 dark:text-zinc-400">Status:</span>
            <span className={`ml-2 font-medium ${
              data.status === 'pass' 
                ? 'text-green-600 dark:text-green-400' 
                : 'text-red-600 dark:text-red-400'
            }`}>
              {data.status?.toUpperCase() || 'N/A'}
            </span>
          </div>
          <div>
            <span className="text-zinc-600 dark:text-zinc-400">Playability Score:</span>
            <span className="ml-2 text-black dark:text-zinc-50 font-medium">
              {data.playability_score || 'N/A'}/100
            </span>
          </div>
          <div>
            <span className="text-zinc-600 dark:text-zinc-400">Confidence:</span>
            <span className="ml-2 text-black dark:text-zinc-50">
              {data.confidence || 'N/A'}%
            </span>
          </div>
          <div>
            <span className="text-zinc-600 dark:text-zinc-400">Execution Time:</span>
            <span className="ml-2 text-black dark:text-zinc-50">
              {data.execution_time_ms ? `${(data.execution_time_ms / 1000).toFixed(2)}s` : 'N/A'}
            </span>
          </div>
          {data.metadata && (
            <>
              <div>
                <span className="text-zinc-600 dark:text-zinc-400">Actions Performed:</span>
                <span className="ml-2 text-black dark:text-zinc-50">
                  {data.metadata.actions_performed || 0}
                </span>
              </div>
              <div>
                <span className="text-zinc-600 dark:text-zinc-400">Screenshots:</span>
                <span className="ml-2 text-black dark:text-zinc-50">
                  {data.metadata.screenshots_captured || 0}
                </span>
              </div>
            </>
          )}
          {data.objective_metrics && (
            <>
              <div>
                <span className="text-zinc-600 dark:text-zinc-400">Control Response Rate:</span>
                <span className="ml-2 text-black dark:text-zinc-50 font-medium">
                  {data.objective_metrics.control_response_rate || 0}%
                </span>
              </div>
              <div>
                <span className="text-zinc-600 dark:text-zinc-400">Successful Actions:</span>
                <span className="ml-2 text-black dark:text-zinc-50">
                  {data.objective_metrics.successful_actions || 0} / {data.objective_metrics.total_actions_attempted || 0}
                </span>
              </div>
            </>
          )}
        </div>
      )}
      
      {data.issues && data.issues.length > 0 && (
        <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-800">
          <h3 className="text-sm font-semibold text-black dark:text-zinc-50 mb-2">
            Issues Found ({data.issues.length})
          </h3>
          <div className="space-y-2">
            {data.issues.map((issue: any, index: number) => (
              <div 
                key={index}
                className="text-sm p-2 rounded bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800"
              >
                <span className="font-medium text-yellow-800 dark:text-yellow-300">
                  [{issue.severity || 'unknown'}]
                </span>
                <span className="ml-2 text-yellow-900 dark:text-yellow-200">
                  {issue.description || 'No description'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {data.evaluation_reasoning && !isExpanded && (
        <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-800">
          <h3 className="text-sm font-semibold text-black dark:text-zinc-50 mb-2">
            AI Evaluation
          </h3>
          <p className="text-sm text-zinc-700 dark:text-zinc-300">
            {data.evaluation_reasoning}
          </p>
        </div>
      )}
    </div>
  );
}

