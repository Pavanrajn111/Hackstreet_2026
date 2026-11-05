import React from 'react';
import { ShieldCheck, Flame, Droplets } from 'lucide-react';
import { useI18n } from '../i18n';
import RiskBadge from './RiskBadge';

export default function RiskAssessmentCard({
  underRisk = 'Moderate',
  underNote = 'Soil moisture is approaching the management threshold.',
  overRisk = 'Low',
  overNote = 'Soil is well-drained with low waterlogging potential.',
}) {
  const { t } = useI18n();

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3">
      <div className="flex items-center gap-2">
        <ShieldCheck className="w-5 h-5 text-emerald-700" />
        <h3 className="text-sm font-bold text-slate-800">
          Soil Moisture Risk Evaluation
        </h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Under-Irrigation Risk Box */}
        <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/60 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-amber-600" />
                {t('under_irrigation_title')}
              </span>
              <RiskBadge status={underRisk} />
            </div>
            <p className="text-xs text-slate-700 leading-relaxed">{underNote}</p>
          </div>
        </div>

        {/* Over-Irrigation Risk Box */}
        <div className="p-3.5 rounded-xl border border-sky-200 bg-sky-50/60 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-sky-950 flex items-center gap-1.5">
                <Droplets className="w-4 h-4 text-sky-600" />
                {t('over_irrigation_title')}
              </span>
              <RiskBadge status={overRisk} />
            </div>
            <p className="text-xs text-slate-700 leading-relaxed">{overNote}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
