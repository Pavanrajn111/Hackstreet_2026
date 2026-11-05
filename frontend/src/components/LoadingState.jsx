import React from 'react';
import { Loader2 } from 'lucide-react';

export default function LoadingState({ message = 'Calculating irrigation needs...' }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <Loader2 className="w-9 h-9 text-emerald-600 animate-spin mb-3" />
      <p className="text-sm font-semibold text-slate-700">{message}</p>
      <p className="text-xs text-slate-400 mt-1">Analyzing soil water balance and weather data</p>
    </div>
  );
}
