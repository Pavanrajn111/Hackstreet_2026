import React from 'react';

export default function StatusCard({
  title,
  value,
  unit = '',
  icon: Icon,
  subtitle,
  variant = 'default',
  badge,
}) {
  const variantStyles = {
    default: 'bg-white border-slate-200 text-slate-900',
    primary: 'bg-emerald-50 border-emerald-200 text-emerald-950',
    water: 'bg-sky-50 border-sky-200 text-sky-950',
    warning: 'bg-amber-50 border-amber-200 text-amber-950',
  };

  const cardStyle = variantStyles[variant] || variantStyles.default;

  return (
    <div className={`p-4 rounded-2xl border shadow-sm flex flex-col justify-between transition-all ${cardStyle}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
          {title}
        </span>
        {badge}
      </div>

      <div className="flex items-baseline gap-2">
        {Icon && <Icon className="w-5 h-5 opacity-70 shrink-0 self-center text-current" />}
        <span className="text-2xl font-bold tracking-tight">
          {value}
        </span>
        {unit && <span className="text-sm font-semibold opacity-75">{unit}</span>}
      </div>

      {subtitle && (
        <p className="mt-2 text-xs text-slate-600 line-clamp-2">
          {subtitle}
        </p>
      )}
    </div>
  );
}
