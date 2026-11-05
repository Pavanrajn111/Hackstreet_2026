import React from 'react';
import { Sparkles, Database, WifiOff } from 'lucide-react';
import { useI18n } from '../i18n';
import { isMockMode } from '../services/api';

export default function DemoBanner({ isCached = false, onLoadPreset }) {
  const { t } = useI18n();
  const mock = isMockMode();

  if (!mock && !isCached) return null;

  return (
    <div className="bg-amber-50 border border-amber-300 rounded-2xl p-3 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
      <div className="flex items-center gap-2">
        {isCached ? (
          <span className="p-1.5 bg-amber-200 text-amber-900 rounded-lg">
            <WifiOff className="w-4 h-4" />
          </span>
        ) : (
          <span className="p-1.5 bg-amber-200 text-amber-900 rounded-lg">
            <Database className="w-4 h-4" />
          </span>
        )}
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-amber-950">
              {isCached ? t('offline_pill') : t('demo_pill')}
            </span>
            <span className="text-[10px] bg-amber-200 text-amber-900 px-1.5 py-0.2 rounded font-semibold">
              Simulation Mode
            </span>
          </div>
          <p className="text-[11px] text-amber-800">
            {isCached
              ? 'Displaying previously saved farm and advice from local device storage.'
              : 'Displaying simulated agro-meteorological figures for demonstration.'}
          </p>
        </div>
      </div>

      {onLoadPreset && (
        <button
          type="button"
          onClick={onLoadPreset}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3 py-1.5 bg-amber-700 hover:bg-amber-800 text-white rounded-xl text-xs font-bold shadow-xs transition-all active:scale-95 cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>{t('load_demo_preset')}</span>
        </button>
      )}
    </div>
  );
}
