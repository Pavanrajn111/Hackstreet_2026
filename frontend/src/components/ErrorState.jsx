import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';

export default function ErrorState({
  title = 'Could not load data',
  message = 'Please check your connection and try again.',
  onRetry,
}) {
  return (
    <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center my-4">
      <AlertCircle className="w-10 h-10 text-red-500 mx-auto mb-2.5" />
      <h3 className="text-sm font-bold text-red-900">{title}</h3>
      <p className="text-xs text-red-700 mt-1 max-w-sm mx-auto">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-colors active:scale-95"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Retry
        </button>
      )}
    </div>
  );
}
