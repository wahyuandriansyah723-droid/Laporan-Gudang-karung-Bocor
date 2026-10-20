import React, { useState, useEffect } from 'react';
import { MonthReport, WarehouseSettings } from '../types';
import { calculateAnnualTotals, formatNumberIndonesian } from '../utils/calculations';
import {
  AlertTriangle,
  BellRing,
  Volume2,
  VolumeX,
  ExternalLink,
  ShieldAlert,
  CheckCircle2,
  TrendingUp,
  FileSpreadsheet,
} from 'lucide-react';

interface MonthlyTargetAlarmProps {
  reports: MonthReport[];
  settings: WarehouseSettings;
  activeMonthIndex?: number; // 1..12
  onNavigateToMainTable?: () => void;
  className?: string;
}

// Industrial Web Audio alert sound
function playIndustrialAlertSound(isCritical: boolean) {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = isCritical ? 'sawtooth' : 'triangle';
    if (isCritical) {
      // Urgent two-pulse siren
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.setValueAtTime(587.33, now + 0.12);
      osc.frequency.setValueAtTime(880, now + 0.24);
      osc.frequency.setValueAtTime(587.33, now + 0.36);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.5);
    } else {
      // Warning chime
      osc.frequency.setValueAtTime(659.25, now);
      osc.frequency.setValueAtTime(783.99, now + 0.15);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.35);
    }
  } catch (e) {
    console.error('Audio playback error', e);
  }
}

export const MonthlyTargetAlarm: React.FC<MonthlyTargetAlarmProps> = ({
  reports,
  settings,
  activeMonthIndex = 7, // default to July if not specified
  onNavigateToMainTable,
  className = '',
}) => {
  const [isMuted, setIsMuted] = useState<boolean>(() => {
    return localStorage.getItem('japfa_alarm_muted') === 'true';
  });

  const toggleMute = () => {
    setIsMuted((prev) => {
      const next = !prev;
      localStorage.setItem('japfa_alarm_muted', String(next));
      return next;
    });
  };

  const annual = calculateAnnualTotals(reports, settings);
  const targetPercent = settings.targetToleransiPersen || 0.25;
  const warningThreshold = targetPercent * 0.8; // 80% of target limit (e.g. 0.20% for 0.25%)

  // Active month data
  const activeMonthData = annual.monthlyBreakdown.find((m) => m.monthIndex === activeMonthIndex) || {
    monthIndex: activeMonthIndex,
    monthName: `Bulan ${activeMonthIndex}`,
    totalForklift: 0,
    totalPallet: 0,
    totalBocorProduksi: 0,
    totalBocor: 0,
    totalPenjualanKg: 0,
    totalPenjualanKarung: 0,
    rasioBocorPersen: 0,
    isOverTarget: false,
    kontribusiPersen: 0,
  };

  const activeRasio = activeMonthData.rasioBocorPersen;
  const activeHasSales = activeMonthData.totalPenjualanKarung > 0;
  const activePercentageOfTarget = targetPercent > 0 ? (activeRasio / targetPercent) * 100 : 0;

  // Active month alarm states
  const isActiveOverTarget = activeHasSales && activeRasio > targetPercent;
  const isActiveApproaching =
    activeHasSales && activeRasio >= warningThreshold && activeRasio <= targetPercent;

  // All months in Tabel Rekapitulasi Bulanan with alarms
  const allOverTargetMonths = annual.monthlyBreakdown.filter(
    (m) => m.totalPenjualanKarung > 0 && m.rasioBocorPersen > targetPercent
  );
  const allApproachingMonths = annual.monthlyBreakdown.filter(
    (m) =>
      m.totalPenjualanKarung > 0 &&
      m.rasioBocorPersen >= warningThreshold &&
      m.rasioBocorPersen <= targetPercent
  );

  const hasAnyAlarm =
    isActiveOverTarget ||
    isActiveApproaching ||
    allOverTargetMonths.length > 0 ||
    allApproachingMonths.length > 0;

  // Calculate safe remaining bags allowed before crossing target in active month
  const maxBocorAllowed = Math.floor((targetPercent / 100) * activeMonthData.totalPenjualanKarung);
  const remainingAllowance = maxBocorAllowed - activeMonthData.totalBocor;

  // Trigger sound when alarm state is critical/approaching if unmuted
  useEffect(() => {
    if (!isMuted && hasAnyAlarm) {
      // Play brief alert chime
      playIndustrialAlertSound(isActiveOverTarget || allOverTargetMonths.length > 0);
    }
  }, [isActiveOverTarget, isActiveApproaching, isMuted]);

  // Determine overall alarm severity level
  const isCritical = isActiveOverTarget || allOverTargetMonths.length > 0;
  const isWarning = !isCritical && (isActiveApproaching || allApproachingMonths.length > 0);

  return (
    <div
      className={`rounded-xl border transition-all duration-300 shadow-sm overflow-hidden ${
        isCritical
          ? 'bg-gradient-to-r from-red-50 via-rose-50 to-amber-50 border-red-400 ring-2 ring-red-500/30'
          : isWarning
          ? 'bg-gradient-to-r from-amber-50 via-orange-50 to-yellow-50 border-amber-400 ring-2 ring-amber-500/20'
          : 'bg-emerald-50/70 border-emerald-300'
      } ${className}`}
    >
      {/* Top Banner Header */}
      <div
        className={`px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 border-b ${
          isCritical
            ? 'bg-red-600 text-white border-red-700'
            : isWarning
            ? 'bg-amber-600 text-white border-amber-700'
            : 'bg-emerald-700 text-white border-emerald-800'
        }`}
      >
        <div className="flex items-center gap-2 font-black text-xs uppercase tracking-wide">
          {isCritical ? (
            <div className="flex items-center gap-1.5 animate-pulse">
              <ShieldAlert className="w-4 h-4 text-amber-300" />
              <span>🚨 ALARM KRITIS REKAPITULASI BULANAN: MELEBIHI TARGET TOLERANSI!</span>
            </div>
          ) : isWarning ? (
            <div className="flex items-center gap-1.5 animate-pulse">
              <AlertTriangle className="w-4 h-4 text-amber-200" />
              <span>⚠️ ALARM SIAGA REKAPITULASI BULANAN: MENDEKATI TARGET TOLERANSI (&ge; 80%)</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-200" />
              <span>STATUS REKAPITULASI BULANAN: AMAN DI BAWAH TARGET</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Sound Mute Toggle */}
          <button
            type="button"
            onClick={toggleMute}
            className="flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-white/20 hover:bg-white/30 transition-colors cursor-pointer"
            title={isMuted ? 'Nyalakan bunyi alarm otomatis' : 'Matikan bunyi alarm'}
          >
            {isMuted ? (
              <>
                <VolumeX className="w-3.5 h-3.5 text-slate-200" />
                <span className="text-[10px]">Mute</span>
              </>
            ) : (
              <>
                <Volume2 className="w-3.5 h-3.5 text-yellow-300 animate-pulse" />
                <span className="text-[10px]">Alarm Bunyi On</span>
              </>
            )}
          </button>

          {/* Test Sound button */}
          <button
            type="button"
            onClick={() => playIndustrialAlertSound(isCritical)}
            className="text-[10px] bg-black/20 hover:bg-black/30 px-2 py-0.5 rounded font-semibold transition-colors cursor-pointer"
            title="Uji coba suara alarm"
          >
            Tes Bunyi
          </button>

          {/* Direct Link to Rekapitulasi Table */}
          {onNavigateToMainTable && (
            <button
              type="button"
              onClick={onNavigateToMainTable}
              className="flex items-center gap-1 text-[11px] font-bold bg-white text-slate-900 hover:bg-slate-100 px-2.5 py-0.5 rounded shadow-xs transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-700" />
              <span>Tabel Rekapitulasi Excel</span>
              <ExternalLink className="w-3 h-3 text-slate-500" />
            </button>
          )}
        </div>
      </div>

      {/* Main Alert Body */}
      <div className="p-4 space-y-3">
        {/* Active Month Detail Row */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-white/90 p-3 rounded-lg border border-slate-200">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-slate-900 uppercase">
                {activeMonthData.monthName} 2026
              </span>
              <span
                className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${
                  isActiveOverTarget
                    ? 'bg-red-100 text-red-800 border-red-300'
                    : isActiveApproaching
                    ? 'bg-amber-100 text-amber-900 border-amber-300'
                    : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                }`}
              >
                {isActiveOverTarget
                  ? 'MELEBIHI TARGET'
                  : isActiveApproaching
                  ? 'MENDEKATI TARGET'
                  : 'NORMAL'}
              </span>
            </div>
            <p className="text-[11px] text-slate-600 mt-0.5">
              Target Toleransi: &le; <strong>{targetPercent.toFixed(2)}%</strong> per bulan (Standar:{' '}
              {settings.beratPerKarungKg} Kg/Karung)
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs">
            {/* Rasio Card */}
            <div
              className={`px-3 py-1.5 rounded-lg border text-center min-w-[100px] ${
                isActiveOverTarget
                  ? 'bg-red-50 border-red-300 text-red-900'
                  : isActiveApproaching
                  ? 'bg-amber-50 border-amber-300 text-amber-900'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-900'
              }`}
            >
              <span className="text-[9px] uppercase font-bold tracking-wider block">
                Rasio Aktual
              </span>
              <span className="text-base font-black">
                {activeHasSales ? `${activeRasio.toFixed(2)}%` : '0.00%'}
              </span>
            </div>

            {/* Total Bocor vs Penjualan */}
            <div className="bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 text-center min-w-[110px]">
              <span className="text-[9px] uppercase font-bold tracking-wider text-slate-500 block">
                Total Bocor / Jual
              </span>
              <span className="text-xs font-extrabold text-slate-800">
                {formatNumberIndonesian(activeMonthData.totalBocor)} /{' '}
                {formatNumberIndonesian(activeMonthData.totalPenjualanKarung)} krg
              </span>
            </div>

            {/* Sisa Toleransi */}
            <div className="bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200 text-center min-w-[110px]">
              <span className="text-[9px] uppercase font-bold tracking-wider text-slate-500 block">
                Sisa Kuota Aman
              </span>
              <span
                className={`text-xs font-black ${
                  remainingAllowance < 0
                    ? 'text-red-600'
                    : remainingAllowance <= 20
                    ? 'text-amber-600'
                    : 'text-emerald-700'
                }`}
              >
                {activeHasSales
                  ? remainingAllowance < 0
                    ? `Over ${Math.abs(remainingAllowance)} krg`
                    : `${remainingAllowance} krg lagi`
                  : 'Belum ada data jual'}
              </span>
            </div>
          </div>
        </div>

        {/* Visual Progress Bar Ratio vs Target */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700">
            <span>
              Tingkat Keterisian Rasio Target: <strong>{activePercentageOfTarget.toFixed(1)}%</strong>
            </span>
            <span>
              Batas Maksimal:{' '}
              <strong className={isCritical ? 'text-red-700 font-black' : 'text-slate-800'}>
                {targetPercent.toFixed(2)}%
              </strong>
            </span>
          </div>
          <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden relative">
            <div
              className={`h-full transition-all duration-500 ${
                activePercentageOfTarget >= 100
                  ? 'bg-red-600'
                  : activePercentageOfTarget >= 80
                  ? 'bg-amber-500'
                  : 'bg-emerald-600'
              }`}
              style={{ width: `${Math.min(activePercentageOfTarget, 100)}%` }}
            />
            {/* 80% warning marker line */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-slate-400 z-10"
              style={{ left: '80%' }}
              title="Batas Peringatan 80% (Alarm Mendekati Target)"
            />
          </div>
          <div className="flex justify-between text-[9px] text-slate-400">
            <span>0%</span>
            <span className="text-amber-700 font-bold">80% (Peringatan Alarm)</span>
            <span className="text-red-600 font-bold">100% (Target Toleransi)</span>
          </div>
        </div>

        {/* Highlight All Months in Tabel Rekapitulasi with Alarm */}
        {(allOverTargetMonths.length > 0 || allApproachingMonths.length > 0) && (
          <div className="pt-2 border-t border-slate-200/80">
            <span className="text-[10px] font-extrabold uppercase tracking-wide text-slate-700 block mb-1">
              Rangkuman Bulan Rekapitulasi yang Menyalakan Alarm:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {allOverTargetMonths.map((m) => (
                <span
                  key={m.monthIndex}
                  className="inline-flex items-center gap-1 bg-red-100 text-red-900 border border-red-300 text-[10px] font-black px-2 py-0.5 rounded"
                >
                  <ShieldAlert className="w-3 h-3 text-red-600" />
                  <span>
                    {m.monthName}: {m.rasioBocorPersen.toFixed(2)}% (MELEBIHI TARGET)
                  </span>
                </span>
              ))}
              {allApproachingMonths.map((m) => (
                <span
                  key={m.monthIndex}
                  className="inline-flex items-center gap-1 bg-amber-100 text-amber-950 border border-amber-300 text-[10px] font-bold px-2 py-0.5 rounded"
                >
                  <AlertTriangle className="w-3 h-3 text-amber-700" />
                  <span>
                    {m.monthName}: {m.rasioBocorPersen.toFixed(2)}% (Mendekati:{' '}
                    {((m.rasioBocorPersen / targetPercent) * 100).toFixed(0)}%)
                  </span>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
