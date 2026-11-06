import React, { useState } from 'react';
import { Share2, Check, Copy } from 'lucide-react';
import { useI18n } from '../i18n';

export default function ShareSummary({ farm, recommendation }) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);

  if (!farm || !recommendation) return null;

  const {
    irrigate_today,
    irrigation_depth_mm,
    water_volume_litres,
    estimated_pump_runtime_minutes,
    current_growth_stage,
    risk_status,
    next_irrigation_date,
    rain_warning,
  } = recommendation;

  // Construct structured text summary
  const summaryText = `💧 *AGR002 Smart Irrigation Advisory*
📍 *Farm:* ${farm.farm_name || 'My Farm'} (${farm.crop}, ${farm.farm_area_hectares} ha)
📅 *Date:* ${new Date().toLocaleDateString()}
━━━━━━━━━━━━━━━━━━━━
🌱 *Decision:* ${irrigate_today ? '✅ IRRIGATE TODAY: YES' : '❌ NO IRRIGATION NEEDED TODAY'}
📊 *Recommended Depth:* ${irrigate_today ? `${irrigation_depth_mm} mm` : '0 mm'}
🌊 *Water Volume:* ${irrigate_today ? `${water_volume_litres.toLocaleString()} Litres` : '0 L'}
⏱️ *Pump Run Time:* ${irrigate_today ? `${estimated_pump_runtime_minutes} mins` : '0 mins'} (@ ${farm.pump_flow_rate_lpm || 120} L/min)
🌾 *Growth Stage:* ${current_growth_stage}
⚠️ *Moisture Stress Risk:* ${risk_status}
${next_irrigation_date ? `📆 *Next Scheduled Check:* ${next_irrigation_date}` : ''}
${rain_warning ? `🌧️ *Rain Note:* ${rain_warning}` : ''}
━━━━━━━━━━━━━━━━━━━━
*AGR002 Smart Irrigation & Water Management*`;

  const encodedUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(summaryText)}`;

  const handleCopy = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(summaryText);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
    } catch (err) {
      console.warn('Clipboard copy failed:', err);
    }
  };

  return (
    <div className="glass-card p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
      <div>
        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
          {t('share_title')}
        </h4>
        <p className="text-xs text-slate-500">
          Send today's field advice to farm workers, partners, or save to notes
        </p>
      </div>

      <div className="flex items-center gap-2">
        {/* Copy to clipboard */}
        <button
          type="button"
          onClick={handleCopy}
          className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-all min-h-[44px] active:scale-95 cursor-pointer"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 text-emerald-600" />
              <span className="text-emerald-700">{t('summary_copied')}</span>
            </>
          ) : (
            <>
              <Copy className="w-4 h-4 text-slate-500" />
              <span>{t('copy_summary')}</span>
            </>
          )}
        </button>

        {/* WhatsApp Share Button */}
        <a
          href={encodedUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-all min-h-[44px] active:scale-95 cursor-pointer"
        >
          <Share2 className="w-4 h-4" />
          <span>{t('share_whatsapp')}</span>
        </a>
      </div>
    </div>
  );
}
