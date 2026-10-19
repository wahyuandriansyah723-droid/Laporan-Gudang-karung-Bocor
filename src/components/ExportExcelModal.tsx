import React, { useState } from 'react';
import { MonthReport, WarehouseSettings, HolidayItem } from '../types';
import { exportReportsToExcel, exportSingleMonthToExcel } from '../utils/excelExport';
import { calculateMonthTotals, formatNumberIndonesian } from '../utils/calculations';
import {
  FileSpreadsheet,
  Download,
  Calendar,
  X,
  CheckCircle2,
  Layers,
  Sparkles,
  ArrowRight,
  Filter,
} from 'lucide-react';

interface ExportExcelModalProps {
  isOpen: boolean;
  onClose: () => void;
  reports: MonthReport[];
  settings: WarehouseSettings;
  holidays?: HolidayItem[];
  defaultMonthIndex?: number;
}

export const ExportExcelModal: React.FC<ExportExcelModalProps> = ({
  isOpen,
  onClose,
  reports,
  settings,
  holidays,
  defaultMonthIndex,
}) => {
  const [activeTab, setActiveTab] = useState<'per_bulan' | 'semua_bulan'>('per_bulan');
  const [selectedMonth, setSelectedMonth] = useState<number>(defaultMonthIndex || 1);
  const [successExportName, setSuccessExportName] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentYear = 2026;

  // Selected Month Report
  const currentMonthReport = reports.find((r) => r.monthIndex === selectedMonth) || reports[0];
  const currentMonthTotals = currentMonthReport ? calculateMonthTotals(currentMonthReport, settings) : null;

  // Count of days with data in selected month
  const countDaysWithData = (report: MonthReport) => {
    let count = 0;
    for (let d = 1; d <= 31; d++) {
      const e = report.dailyEntries[d];
      if (e && ((e.forklift || 0) + (e.pallet || 0) + (e.bocorProduksi || 0) > 0 || e.note)) {
        count++;
      }
    }
    return count;
  };

  // Handle Export Single Month
  const handleExportMonth = (reportToExport: MonthReport) => {
    exportSingleMonthToExcel(reportToExport, settings, holidays);
    setSuccessExportName(`Laporan Bulan ${reportToExport.monthName} 2026`);
    setTimeout(() => setSuccessExportName(null), 3000);
  };

  // Handle Export All Months
  const handleExportAll = () => {
    exportReportsToExcel(reports, settings, holidays);
    setSuccessExportName(`Laporan Lengkap 12 Bulan & Rekapitulasi Tahunan 2026`);
    setTimeout(() => setSuccessExportName(null), 3500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fade-in">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold uppercase tracking-tight text-white flex items-center gap-2">
                Export Laporan Excel (.xlsx)
                <span className="bg-emerald-500 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full">
                  Format Resmi 2026
                </span>
              </h3>
              <p className="text-xs text-slate-300">
                Pilih export per bulan tertentu atau ekspor keseluruhan 12 bulan
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success Alert Toast */}
        {successExportName && (
          <div className="bg-emerald-50 border-b border-emerald-200 p-3 px-5 text-emerald-900 text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>Berhasil mengunduh file Excel: <strong>{successExportName}</strong></span>
          </div>
        )}

        {/* Tab Selection */}
        <div className="bg-slate-100 p-2 border-b border-slate-200 flex gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('per_bulan')}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'per_bulan'
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Calendar className="w-4 h-4 text-amber-500" />
            <span>Export Per Bulan (Pilihan Bulan)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('semua_bulan')}
            className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'semua_bulan'
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Layers className="w-4 h-4 text-blue-600" />
            <span>Export 1 Tahun Lengkap (12 Bulan)</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {activeTab === 'per_bulan' ? (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Filter className="w-3.5 h-3.5 text-slate-500" />
                  Pilih Bulan yang Ingin Di-Export:
                </label>
                {/* 12 Months Grid Selector */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                  {reports.map((r) => {
                    const daysWithData = countDaysWithData(r);
                    const totals = calculateMonthTotals(r, settings);
                    const isSelected = selectedMonth === r.monthIndex;

                    return (
                      <button
                        key={r.monthIndex}
                        type="button"
                        onClick={() => setSelectedMonth(r.monthIndex)}
                        className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer relative ${
                          isSelected
                            ? 'bg-amber-50 border-amber-500 shadow-xs ring-2 ring-amber-400/30'
                            : 'bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className={`text-xs font-bold ${isSelected ? 'text-amber-950 font-black' : 'text-slate-900'}`}>
                            {r.monthName}
                          </span>
                          {daysWithData > 0 ? (
                            <span className="w-2 h-2 rounded-full bg-emerald-500" title="Ada data terisi" />
                          ) : (
                            <span className="w-2 h-2 rounded-full bg-slate-200" title="Belum ada data" />
                          )}
                        </div>
                        <div className="mt-1 text-[10px] text-slate-500">
                          {daysWithData > 0 ? (
                            <span className="font-semibold text-slate-700">
                              {daysWithData} Hari &bull; {formatNumberIndonesian(totals.totalBocor)} Krg
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">0 data terisi</span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Month Preview Card */}
              {currentMonthReport && currentMonthTotals && (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                        Preview Bulan Terpilih
                      </span>
                      <h4 className="text-sm font-black text-slate-900">
                        {currentMonthReport.monthName} {currentYear}
                      </h4>
                    </div>
                    <span className="bg-amber-100 text-amber-950 text-xs font-extrabold px-2.5 py-1 rounded-md border border-amber-300">
                      Total Bocor: {formatNumberIndonesian(currentMonthTotals.totalBocor)} Karung
                    </span>
                  </div>

                  {/* Stat breakdown */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div className="bg-white p-2 rounded-lg border border-slate-200">
                      <span className="text-[10px] text-slate-400 block font-bold">Forklift</span>
                      <span className="font-bold text-slate-800">{formatNumberIndonesian(currentMonthTotals.totalForklift)} Krg</span>
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-slate-200">
                      <span className="text-[10px] text-slate-400 block font-bold">Pallet</span>
                      <span className="font-bold text-slate-800">{formatNumberIndonesian(currentMonthTotals.totalPallet)} Krg</span>
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-slate-200">
                      <span className="text-[10px] text-slate-400 block font-bold">Produksi</span>
                      <span className="font-bold text-slate-800">{formatNumberIndonesian(currentMonthTotals.totalBocorProduksi)} Krg</span>
                    </div>
                    <div className="bg-white p-2 rounded-lg border border-slate-200">
                      <span className="text-[10px] text-slate-400 block font-bold">Rasio Bocor</span>
                      <span className={`font-bold ${currentMonthTotals.rasioBocorPersen <= settings.targetToleransiPersen ? 'text-emerald-700' : 'text-red-600'}`}>
                        {currentMonthTotals.rasioBocorPersen.toFixed(2)}%
                      </span>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-500 leading-normal">
                    * File Excel yang diexport mencakup: <strong>Sheet 1</strong> (Tabel grid lengkap harian 1-31, ringkasan, persentase penyebab, dan lembar pengesahan resmi) &amp; <strong>Sheet 2</strong> (Rincian catatan kerusakan harian).
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 space-y-2">
                <div className="flex items-center gap-2 text-emerald-900 font-extrabold text-sm">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <span>Export Paket Lengkap 1 Tahun Penuh 2026</span>
                </div>
                <p className="text-xs text-emerald-800 leading-relaxed">
                  Mengunduh seluruh 12 lembar laporan bulanan (Januari s/d Desember 2026), 
                  lengkap dengan <strong>Sheet Rekapitulasi Eksekutif Tahunan</strong> dan 
                  <strong>Sheet Daftar Hari Libur Nasional &amp; Tanggal Merah</strong> dalam 1 file buku kerja Excel (.xlsx).
                </p>
              </div>

              <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 space-y-2 text-xs">
                <span className="font-bold text-slate-700 block">Struktur Lembar Kerja (Sheets) yang Dihasilkan:</span>
                <ul className="space-y-1.5 text-slate-600">
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <strong>Sheet 1:</strong> Laporan Bulanan 2026 (Grid 12 bulan lengkap dan rekapitulasi)
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <strong>Sheet 2:</strong> Rekapitulasi Tahunan 2026 (Ringkasan KPI, breakdown penyebab %, kepatuhan target)
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <strong>Sheet 3:</strong> Daftar Hari Libur &amp; Agenda Pabrik 2026
                  </li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 font-semibold rounded-lg text-xs border border-slate-300 transition-colors cursor-pointer"
          >
            Tutup
          </button>

          {activeTab === 'per_bulan' ? (
            <button
              type="button"
              onClick={() => handleExportMonth(currentMonthReport)}
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs transition-all shadow-xs cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Download Excel Bulan {currentMonthReport?.monthName} (.xlsx)</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleExportAll}
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs transition-all shadow-xs cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Download Excel 1 Tahun Penuh 2026 (.xlsx)</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
