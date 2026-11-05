import React from 'react';
import { AlertTriangle, CloudRain, Lightbulb, AlertCircle } from 'lucide-react';
import { useI18n } from '../i18n';

export default function AlertsList({ alerts = [] }) {
  const { t } = useI18n();

  if (!alerts || alerts.length === 0) return null;

  const getAlertIcon = (type) => {
    switch (type) {
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />;
      case 'info':
        return <CloudRain className="w-5 h-5 text-sky-600 shrink-0" />;
      case 'tip':
        return <Lightbulb className="w-5 h-5 text-emerald-600 shrink-0" />;
      default:
        return <AlertCircle className="w-5 h-5 text-slate-500 shrink-0" />;
    }
  };

  const getAlertBg = (type) => {
    switch (type) {
      case 'warning':
        return 'bg-amber-50 border-amber-200 text-amber-950';
      case 'info':
        return 'bg-sky-50 border-sky-200 text-sky-950';
      case 'tip':
        return 'bg-emerald-50 border-emerald-200 text-emerald-950';
      default:
        return 'bg-slate-50 border-slate-200 text-slate-900';
    }
  };

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider px-1">
        {t('alerts_title')}
      </h3>
      <div className="space-y-2">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className={`p-3.5 rounded-2xl border flex items-start gap-3 transition-all ${getAlertBg(
              alert.type
            )}`}
          >
            <div className="mt-0.5">{getAlertIcon(alert.type)}</div>
            <div className="flex-1">
              <span className="font-bold text-xs block mb-0.5">{alert.title}</span>
              <p className="text-xs opacity-90 leading-relaxed">{alert.message}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
