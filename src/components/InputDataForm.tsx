import React, { useState } from 'react';
import { MonthReport, WarehouseSettings, LeakageRecord } from '../types';
import {
  formatNumberIndonesian,
  getIndonesianFullDayName,
} from '../utils/calculations';
import {
  PlusCircle,
  Save,
  Calendar,
  User,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Lock,
  ExternalLink,
  ShieldAlert,
  FileSpreadsheet,
  ListFilter,
} from 'lucide-react';
import { MonthlyTargetAlarm } from './MonthlyTargetAlarm';

interface InputDataFormProps {
  reports: MonthReport[];
  settings: WarehouseSettings;
  logs?: LeakageRecord[];
  onAddLogEntry: (record: Omit<LeakageRecord, 'id'>) => void;
  onUpdateCellStatus: (monthIndex: number, day: number, isRed: boolean, isYellow: boolean) => void;
  onNavigateToLog?: () => void;
  onNavigateToTable?: () => void;
}

export const InputDataForm: React.FC<InputDataFormProps> = ({
  reports,
  settings,
  logs = [],
  onAddLogEntry,
  onUpdateCellStatus,
  onNavigateToLog,
  onNavigateToTable,
}) => {
  const currentYear = 2026;
  const todayStr = new Date().toISOString().split('T')[0];

  const [dateStr, setDateStr] = useState(todayStr);
  const [forklift, setForklift] = useState<number | ''>(0);
  const [pallet, setPallet] = useState<number | ''>(0);
  const [bocorProduksi, setBocorProduksi] = useState<number | ''>(0);
  const [shift, setShift] = useState('Shift 1');
  const [operator, setOperator] = useState('');
  const [catatan, setCatatan] = useState('');
  const [isRedDay, setIsRedDay] = useState(false);
  const [isYellowDay, setIsYellowDay] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Extract month index and day from the selected date string (YYYY-MM-DD)
  const parts = dateStr.split('-').map(Number);
  const selectedYear = parts[0] || currentYear;
  const monthIndex = parts[1] || 1; // 1..12
  const day = parts[2] || 1;

  // Check if this date already exists in the 12-month spreadsheet reports
  const targetReport = reports.find((r) => r.monthIndex === monthIndex);
  const existingEntry = targetReport?.dailyEntries?.[day];
  const existingForklift = existingEntry?.forklift || 0;
  const existingPallet = existingEntry?.pallet || 0;
  const existingProduksi = existingEntry?.bocorProduksi || 0;
  const existingTotalBocor = existingForklift + existingPallet + existingProduksi;

  // Also check if an explicit record exists in the logs collection for this date
  const existingLogInList = logs.find((l) => l.date === dateStr);

  // If there are recorded leaks or note in Excel report or existing log:
  const isAlreadyInExcel = existingTotalBocor > 0 || Boolean(existingEntry?.note);
  const isAlreadyInputted = isAlreadyInExcel || Boolean(existingLogInList);

  const dayName = getIndonesianFullDayName(selectedYear, monthIndex, day);
  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
  ];
  const monthLabel = monthNames[monthIndex - 1] || `Bulan ${monthIndex}`;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // STRICT VALIDATION: If data for this date already exists in Excel report, block submission!
    if (isAlreadyInputted) {
      alert(`Peringatan: Data untuk tanggal ${dateStr} sudah ada di tampilan laporan Excel dan tidak bisa diinput kembali!`);
      return;
    }

    const fkVal = typeof forklift === 'number' ? forklift : 0;
    const plVal = typeof pallet === 'number' ? pallet : 0;
    const prVal = typeof bocorProduksi === 'number' ? bocorProduksi : 0;
    const total = fkVal + plVal + prVal;

    onAddLogEntry({
      date: dateStr,
      monthIndex,
      day,
      forklift: fkVal,
      pallet: plVal,
      bocorProduksi: prVal,
      totalBocor: total,
      shift,
      operator: operator.trim() || 'Petugas Gudang',
      catatan,
      isRedDay,
    });

    onUpdateCellStatus(monthIndex, day, isRedDay, isYellowDay);

    setSuccessMessage(`Data tanggal ${dateStr} berhasil disimpan! Total Karung Bocor: ${total}`);
    setTimeout(() => setSuccessMessage(''), 4500);

    // Reset form
    setForklift(0);
    setPallet(0);
    setBocorProduksi(0);
    setCatatan('');
  };

  const currentTotal =
    (typeof forklift === 'number' ? forklift : 0) +
    (typeof pallet === 'number' ? pallet : 0) +
    (typeof bocorProduksi === 'number' ? bocorProduksi : 0);

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* ALARM REKAPITULASI BULANAN JIKA MENDEKATI / MELEBIHI TARGET */}
      <MonthlyTargetAlarm
        reports={reports}
        settings={settings}
        activeMonthIndex={monthIndex}
        onNavigateToMainTable={onNavigateToTable}
      />

      {/* Header Card */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-6">
          <div className="p-2.5 bg-slate-900 text-white rounded-lg shadow-xs">
            <PlusCircle className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 uppercase tracking-tight flex items-center gap-2">
              INPUT LAPORAN KARUNG BOCOR HARIAN
              <span className="text-[10px] bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded border border-slate-200">
                Pencegahan Data Ganda Aktif
              </span>
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Catat jumlah karung bocor berdasarkan penyebab kerusakan dan shift kerja &bull; Terhubung ke Laporan Excel
            </p>
          </div>
        </div>

        {/* Success Alert */}
        {successMessage && (
          <div className="mb-6 p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2 animate-fade-in shadow-2xs">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* ================= STRICT WARNING & BLOCK BANNER IF DATE ALREADY INPUTTED ================= */}
        {isAlreadyInputted && (
          <div className="mb-6 p-4 bg-red-50 border-2 border-red-300 rounded-xl shadow-xs space-y-3 animate-fade-in">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-red-600 text-white rounded-lg flex-shrink-0 mt-0.5 shadow-2xs">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-extrabold text-red-900 uppercase tracking-tight flex items-center gap-2">
                  DATA TANGGAL INI SUDAH ADA DI TAMPILAN LAPORAN EXCEL!
                  <span className="bg-red-200 text-red-950 text-[10px] font-black px-2 py-0.5 rounded-full border border-red-300">
                    TIDAK BISA DIINPUT KEMBALI
                  </span>
                </h3>
                <p className="text-xs text-red-800 mt-1 leading-relaxed">
                  Tanggal <strong>{dayName}, {day} {monthLabel} {selectedYear}</strong> (<code>{dateStr}</code>) sudah pernah diinput sebelumnya dan sudah aktif terdaftar di lembar kerja Excel 2026.
                </p>

                {/* Existing Data Breakdown */}
                <div className="mt-3 bg-white p-3 rounded-lg border border-red-200 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block uppercase">Bocor Forklift:</span>
                    <span className="font-extrabold text-slate-800 text-sm">
                      {formatNumberIndonesian(existingForklift || existingLogInList?.forklift || 0)} krg
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block uppercase">Bocor Pallet:</span>
                    <span className="font-extrabold text-slate-800 text-sm">
                      {formatNumberIndonesian(existingPallet || existingLogInList?.pallet || 0)} krg
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold block uppercase">Bocor Produksi:</span>
                    <span className="font-extrabold text-slate-800 text-sm">
                      {formatNumberIndonesian(existingProduksi || existingLogInList?.bocorProduksi || 0)} krg
                    </span>
                  </div>
                  <div className="bg-red-50 p-1.5 rounded border border-red-200">
                    <span className="text-[10px] text-red-700 font-black block uppercase">TOTAL TERCATAT:</span>
                    <span className="font-black text-red-700 text-base">
                      {formatNumberIndonesian(existingTotalBocor || existingLogInList?.totalBocor || 0)} Karung
                    </span>
                  </div>
                </div>

                {/* Important notice */}
                <p className="text-[11px] text-red-700 font-medium mt-2.5">
                  &bull; <strong>Kebijakan Sistem:</strong> Formulir ini menolak penyimpanan ganda pada tanggal yang sama agar laporan tidak terhitung dua kali (*double-counting*). Jika Anda perlu mengoreksi atau mengubah angka tanggal ini, gunakan fitur <strong>Edit</strong> di Log Detail atau perbarui langsung pada tabel Excel.
                </p>

                {/* Quick Action Navigation */}
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-red-200/80">
                  {onNavigateToLog && (
                    <button
                      type="button"
                      onClick={onNavigateToLog}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
                    >
                      <ListFilter className="w-3.5 h-3.5 text-amber-400" />
                      <span>Buka &amp; Edit di Log Detail</span>
                    </button>
                  )}

                  {onNavigateToTable && (
                    <button
                      type="button"
                      onClick={onNavigateToTable}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-800 rounded-lg text-xs font-bold border border-slate-300 transition-all cursor-pointer"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Buka di Tabel Excel</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Row 1: Date & Shift */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  Tanggal Laporan:
                </span>
                {isAlreadyInputted && (
                  <span className="text-[10px] text-red-600 font-bold flex items-center gap-1">
                    <Lock className="w-3 h-3" />
                    Sudah Terisi
                  </span>
                )}
              </label>
              <input
                type="date"
                required
                value={dateStr}
                onChange={(e) => setDateStr(e.target.value)}
                className={`w-full text-xs border rounded-lg p-2.5 font-bold transition-all ${
                  isAlreadyInputted
                    ? 'border-red-400 bg-red-50/50 text-red-950 focus:ring-2 focus:ring-red-500'
                    : 'border-slate-300 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 text-slate-800'
                }`}
              />
              <span className="text-[10px] text-slate-500 mt-1 block">
                {dayName}, {day} {monthLabel} {selectedYear}
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Shift Kerja:
              </label>
              <select
                value={shift}
                disabled={isAlreadyInputted}
                onChange={(e) => setShift(e.target.value)}
                className={`w-full text-xs border border-slate-300 rounded-lg p-2.5 font-semibold text-slate-800 ${
                  isAlreadyInputted ? 'bg-slate-100 opacity-60 cursor-not-allowed' : 'bg-slate-50 focus:bg-white focus:ring-2 focus:ring-slate-900'
                }`}
              >
                <option value="Shift 1">Shift 1 (07:00 - 15:00)</option>
                <option value="Shift 2">Shift 2 (15:00 - 23:00)</option>
                <option value="Shift 3">Shift 3 (23:00 - 07:00)</option>
                <option value="Reguler">Reguler</option>
              </select>
            </div>
          </div>

          {/* Row 2: Quantities */}
          <div className={`p-4 rounded-xl border space-y-3 transition-all ${
            isAlreadyInputted ? 'bg-slate-100/60 border-slate-200 opacity-60' : 'bg-slate-50 border-slate-200'
          }`}>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-200 pb-2 flex items-center justify-between">
              <span>Jumlah Karung Bocor Berdasarkan Penyebab</span>
              <span className="text-[10px] font-normal text-slate-500">Standar: {settings.beratPerKarungKg} Kg/Karung</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              {/* Forklift */}
              <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  FORKLIFT
                </label>
                <input
                  type="number"
                  min="0"
                  disabled={isAlreadyInputted}
                  value={forklift}
                  onChange={(e) => setForklift(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                  placeholder="0"
                  className="w-full text-base font-black text-slate-900 border border-slate-300 rounded-md p-2 text-center focus:ring-2 focus:ring-slate-900 disabled:bg-slate-100"
                />
              </div>

              {/* Pallet */}
              <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  PALLET
                </label>
                <input
                  type="number"
                  min="0"
                  disabled={isAlreadyInputted}
                  value={pallet}
                  onChange={(e) => setPallet(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                  placeholder="0"
                  className="w-full text-base font-black text-slate-900 border border-slate-300 rounded-md p-2 text-center focus:ring-2 focus:ring-slate-900 disabled:bg-slate-100"
                />
              </div>

              {/* Produksi */}
              <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  PRODUKSI
                </label>
                <input
                  type="number"
                  min="0"
                  disabled={isAlreadyInputted}
                  value={bocorProduksi}
                  onChange={(e) => setBocorProduksi(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
                  placeholder="0"
                  className="w-full text-base font-black text-slate-900 border border-slate-300 rounded-md p-2 text-center focus:ring-2 focus:ring-slate-900 disabled:bg-slate-100"
                />
              </div>
            </div>

            {/* Total Indicator */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-200">
              <span className="text-xs font-bold text-slate-700">Total Kerusakan Karung:</span>
              <span className="text-sm font-black text-slate-950 bg-amber-100 px-3 py-1 rounded-lg border border-amber-300">
                {currentTotal} Karung (~{currentTotal * (settings.beratPerKarungKg || 50)} Kg)
              </span>
            </div>
          </div>

          {/* Row 3: Operator & Notes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-slate-400" />
                Operator / Petugas Gudang:
              </label>
              <input
                type="text"
                disabled={isAlreadyInputted}
                placeholder="Contoh: Budi Santoso"
                value={operator}
                onChange={(e) => setOperator(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 font-medium disabled:bg-slate-100 disabled:cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                Catatan / Keterangan Kerusakan:
              </label>
              <input
                type="text"
                disabled={isAlreadyInputted}
                placeholder="Contoh: Pallet kayu ada paku tajam di Line 2"
                value={catatan}
                onChange={(e) => setCatatan(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 font-medium disabled:bg-slate-100 disabled:cursor-not-allowed"
              />
            </div>
          </div>

          {/* Row 4: Status Day Colors */}
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex flex-wrap items-center gap-6 text-xs">
            <span className="font-bold text-slate-700 uppercase tracking-wider">Format Sel:</span>
            <label className="flex items-center gap-2 cursor-pointer bg-red-50 hover:bg-red-100 p-2 rounded-lg border border-red-200 transition-colors">
              <input
                type="checkbox"
                disabled={isAlreadyInputted}
                checked={isRedDay}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setIsRedDay(checked);
                  if (checked) setIsYellowDay(false);
                }}
                className="w-4 h-4 text-red-600 rounded focus:ring-red-500 cursor-pointer disabled:cursor-not-allowed"
              />
              <span className="font-extrabold text-red-700">Hari Libur / Off (Latar Merah Aktif di Excel)</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                disabled={isAlreadyInputted}
                checked={isYellowDay}
                onChange={(e) => {
                  setIsYellowDay(e.target.checked);
                  if (e.target.checked) setIsRedDay(false);
                }}
                className="w-4 h-4 text-amber-600 rounded focus:ring-amber-500 disabled:cursor-not-allowed"
              />
              <span className="font-semibold text-amber-800">Sorot Khusus / Audit (Latar Kuning)</span>
            </label>
          </div>

          {/* Submit Button */}
          {isAlreadyInputted ? (
            <div className="space-y-2">
              <button
                type="button"
                disabled
                className="w-full py-3.5 bg-slate-200 text-slate-400 font-extrabold text-xs uppercase tracking-wider rounded-xl border border-slate-300 cursor-not-allowed flex items-center justify-center gap-2 shadow-none"
              >
                <Lock className="w-4 h-4 text-slate-400" />
                <span>Tidak Bisa Disimpan (Data Tanggal Ini Sudah Ada di Excel)</span>
              </button>
              <p className="text-center text-[11px] text-red-600 font-semibold">
                Silakan pilih tanggal lain yang belum pernah diinput, atau buka menu <strong>Log Detail</strong> untuk mengedit data ini.
              </p>
            </div>
          ) : (
            <button
              type="submit"
              className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4 text-amber-400" />
              <span>Simpan Laporan Harian</span>
            </button>
          )}
        </form>
      </div>
    </div>
  );
};
