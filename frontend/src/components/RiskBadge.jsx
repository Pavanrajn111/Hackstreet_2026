import React from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, ShieldAlert } from 'lucide-react';
import { useI18n } from '../i18n';

export default function RiskBadge({ status = 'Moderate', labelPrefix = '' }) {
  const { t } = useI18n();

  const config = {
    Low: {
      style: 'bg-emerald-100 text-emerald-900 border-emerald-300',
      icon: CheckCircle2,
      key: 'status_low',
    },
    Moderate: {
      style: 'bg-amber-100 text-amber-950 border-amber-300',
      icon: AlertTriangle,
      key: 'status_moderate',
    },
    High: {
      style: 'bg-orange-100 text-orange-950 border-orange-300',
      icon: AlertCircle,
      key: 'status_high',
    },
    Critical: {
      style: 'bg-red-100 text-red-950 border-red-300',
      icon: ShieldAlert,
      key: 'status_critical',
    },
  };

  const current = config[status] || config.Moderate;
  const Icon = current.icon;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border shadow-xs ${current.style}`}
      role="status"
    >
      <Icon className="w-3.5 h-3.5 shrink-0" />
      <span>{labelPrefix ? `${labelPrefix}: ` : ''}{t(current.key)}</span>
    </span>
  );
}
