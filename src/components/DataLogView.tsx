import React, { useState, useMemo } from 'react';
import { LeakageRecord, MonthReport, WarehouseSettings } from '../types';
import {
  formatNumberIndonesian,
  getIndonesianFullDayName,
} from '../utils/calculations';
import { isIndonesianRedDay } from '../data/initialData';
import {
  Search,
  Trash2,
  Edit3,
  Eye,
  Calendar,
  Filter,
  ArrowUpDown,
  PlusCircle,
  Save,
  X,
  CheckCircle2,
  AlertTriangle,
  Clock,
  User,
  FileText,
  RotateCcw,
  Printer,
  FileSpreadsheet,
  Layers,
  Sparkles,
} from 'lucide-react';

interface DataLogViewProps {
  logs: LeakageRecord[];
  reports: MonthReport[];
  settings: WarehouseSettings;
  onAddLog: (record: Omit<LeakageRecord, 'id'>) => void;
  onUpdateLog: (record: LeakageRecord, syncToReport?: boolean) => void;
  onDeleteLog: (id: string, monthIndex?: number, day?: number, syncToReport?: boolean) => void;
  onViewInTable?: (monthIndex: number, day: number) => void;
  onNavigateToPetugas?: () => void;
}

export const DataLogView: React.FC<DataLogViewProps> = ({
  logs,
  reports,
  settings,
  onAddLog,
  onUpdateLog,
  onDeleteLog,
  onViewInTable,
  onNavigateToPetugas,
}) => {
  const currentYear = 2026;
  const todayStr = new Date().toISOString().split('T')[0];

  // ================= Filters & Search State =================
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDateFilter, setSelectedDateFilter] = useState('');
  const [selectedMonthFilter, setSelectedMonthFilter] = useState<number | 'all'>('all');
  const [selectedShiftFilter, setSelectedShiftFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'bocor_desc' | 'bocor_asc'>('date_desc');

  // ================= Modal States =================
  const [viewingLog, setViewingLog] = useState<LeakageRecord | null>(null);
  const [editingLog, setEditingLog] = useState<LeakageRecord | null>(null);
  const [isDeletingLog, setIsDeletingLog] = useState<LeakageRecord | null>(null);
  const [deleteSyncExcel, setDeleteSyncExcel] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // ================= Edit Form State =================
  const [editDate, setEditDate] = useState('');
  const [editShift, setEditShift] = useState('Shift 1');
  const [editOperator, setEditOperator] = useState('');
  const [editForklift, setEditForklift] = useState<number>(0);
  const [editPallet, setEditPallet] = useState<number>(0);
  const [editBocorProduksi, setEditBocorProduksi] = useState<number>(0);
  const [editCatatan, setEditCatatan] = useState('');
  const [editIsRedDay, setEditIsRedDay] = useState(false);
  const [editSyncExcel, setEditSyncExcel] = useState(true);

  // ================= Add Form State =================
  const [newDate, setNewDate] = useState(todayStr);
  const [newShift, setNewShift] = useState('Shift 1');
  const [newOperator, setNewOperator] = useState('');
  const [newForklift, setNewForklift] = useState<number>(0);
  const [newPallet, setNewPallet] = useState<number>(0);
  const [newBocorProduksi, setNewBocorProduksi] = useState<number>(0);
  const [newCatatan, setNewCatatan] = useState('');
  const [newIsRedDay, setNewIsRedDay] = useState(false);

  // Toast / Feedback message
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Compile unified log entries (incorporating explicit logs + non-zero daily entries from reports)
  const unifiedLogs = useMemo<LeakageRecord[]>(() => {
    const map = new Map<string, LeakageRecord>();

    // 1. Map all non-zero daily entries from 12-month spreadsheet reports
    reports.forEach((r) => {
      for (let d = 1; d <= 31; d++) {
        const entry = r.dailyEntries[d];
        if (!entry) continue;

        const fk = entry.forklift || 0;
        const pl = entry.pallet || 0;
        const pr = entry.bocorProduksi || 0;
        const total = fk + pl + pr;

        if (total > 0 || entry.note) {
          const dateStr = `${currentYear}-${String(r.monthIndex).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
          const isSunday = new Date(currentYear, r.monthIndex - 1, d).getDay() === 0;
          const isHoliday = isIndonesianRedDay(currentYear, r.monthIndex, d);
          const isRed = entry.isRedDay !== undefined ? entry.isRedDay : (isSunday || isHoliday);

          const key = `rep_${r.monthIndex}_${d}`;
          map.set(key, {
            id: key,
            date: dateStr,
            monthIndex: r.monthIndex,
            day: d,
            forklift: fk,
            pallet: pl,
            bocorProduksi: pr,
            totalBocor: total,
            shift: 'Reguler',
            operator: 'Petugas Gudang',
            catatan: entry.note || '',
            isRedDay: isRed,
          });
        }
      }
    });

    // 2. Overwrite / merge with saved explicit logs
    logs.forEach((log) => {
      const parts = (log.date || '').split('-').map(Number);
      const mIdx = log.monthIndex || parts[1] || 1;
      const d = log.day || parts[2] || 1;
      const key = `rep_${mIdx}_${d}`;

      // If already exists from report, update it with log's rich metadata
      const existing = map.get(key);
      if (existing) {
        map.set(key, {
          ...existing,
          ...log,
          id: log.id || existing.id,
          monthIndex: mIdx,
          day: d,
          date: log.date || existing.date,
          shift: log.shift || existing.shift,
          operator: log.operator || existing.operator,
          catatan: log.catatan !== undefined ? log.catatan : existing.catatan,
          totalBocor: (log.forklift ?? existing.forklift) + (log.pallet ?? existing.pallet) + (log.bocorProduksi ?? existing.bocorProduksi),
        });
      } else {
        // Unique log item
        map.set(log.id || key, {
          ...log,
          id: log.id || key,
          monthIndex: mIdx,
          day: d,
          totalBocor: log.totalBocor || ((log.forklift || 0) + (log.pallet || 0) + (log.bocorProduksi || 0)),
        });
      }
    });

    const list = Array.from(map.values());

    // Sort list
    list.sort((a, b) => {
      if (sortBy === 'date_desc') {
        return (b.date || '').localeCompare(a.date || '');
      }
      if (sortBy === 'date_asc') {
        return (a.date || '').localeCompare(b.date || '');
      }
      if (sortBy === 'bocor_desc') {
        return (b.totalBocor || 0) - (a.totalBocor || 0);
      }
      if (sortBy === 'bocor_asc') {
        return (a.totalBocor || 0) - (b.totalBocor || 0);
      }
      return 0;
    });

    return list;
  }, [logs, reports, sortBy]);

  // Filter logs based on date, month, shift, and search term
  const filteredLogs = useMemo(() => {
    return unifiedLogs.filter((log) => {
      // 1. Date Filter (YYYY-MM-DD)
      if (selectedDateFilter && log.date !== selectedDateFilter) {
        return false;
      }

      // 2. Month Filter (1..12)
      if (selectedMonthFilter !== 'all' && log.monthIndex !== selectedMonthFilter) {
        return false;
      }

      // 3. Shift Filter
      if (selectedShiftFilter !== 'all') {
        const s = (log.shift || '').toLowerCase();
        const f = selectedShiftFilter.toLowerCase();
        if (!s.includes(f)) return false;
      }

      // 4. Search text (matches date, day name, operator, shift, catatan)
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const dayName = log.monthIndex && log.day ? getIndonesianFullDayName(currentYear, log.monthIndex, log.day).toLowerCase() : '';
        const dateMatch = (log.date || '').toLowerCase().includes(q);
        const dayMatch = dayName.includes(q);
        const operatorMatch = (log.operator || '').toLowerCase().includes(q);
        const shiftMatch = (log.shift || '').toLowerCase().includes(q);
        const catatanMatch = (log.catatan || '').toLowerCase().includes(q);

        if (!dateMatch && !dayMatch && !operatorMatch && !shiftMatch && !catatanMatch) {
          return false;
        }
      }

      return true;
    });
  }, [unifiedLogs, selectedDateFilter, selectedMonthFilter, selectedShiftFilter, searchTerm]);

  // Aggregate stats of filtered results
  const stats = useMemo(() => {
    const count = filteredLogs.length;
    const sumForklift = filteredLogs.reduce((acc, item) => acc + (item.forklift || 0), 0);
    const sumPallet = filteredLogs.reduce((acc, item) => acc + (item.pallet || 0), 0);
    const sumProduksi = filteredLogs.reduce((acc, item) => acc + (item.bocorProduksi || 0), 0);
    const sumTotalBocor = sumForklift + sumPallet + sumProduksi;
    const beratKgPerKarung = settings.beratPerKarungKg || 50;
    const totalKg = sumTotalBocor * beratKgPerKarung;

    return {
      count,
      sumForklift,
      sumPallet,
      sumProduksi,
      sumTotalBocor,
      totalKg,
    };
  }, [filteredLogs, settings.beratPerKarungKg]);

  // Month options for filter dropdown
  const monthOptions = [
    { index: 1, name: '01 Januari' },
    { index: 2, name: '02 Februari' },
    { index: 3, name: '03 Maret' },
    { index: 4, name: '04 April' },
    { index: 5, name: '05 Mei' },
    { index: 6, name: '06 Juni' },
    { index: 7, name: '07 Juli' },
    { index: 8, name: '08 Agustus' },
    { index: 9, name: '09 September' },
    { index: 10, name: '10 Oktober' },
    { index: 11, name: '11 November' },
    { index: 12, name: '12 Desember' },
  ];

  // Open Edit Modal
  const handleOpenEdit = (log: LeakageRecord) => {
    setEditingLog(log);
    setEditDate(log.date);
    setEditShift(log.shift || 'Shift 1');
    setEditOperator(log.operator || '');
    setEditForklift(log.forklift || 0);
    setEditPallet(log.pallet || 0);
    setEditBocorProduksi(log.bocorProduksi || 0);
    setEditCatatan(log.catatan || '');
    setEditIsRedDay(!!log.isRedDay);
    setEditSyncExcel(true);
  };

  // Submit Save Edit
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLog) return;

    const parts = editDate.split('-').map(Number);
    const mIdx = parts[1] || editingLog.monthIndex || 1;
    const d = parts[2] || editingLog.day || 1;

    const fk = Number(editForklift) || 0;
    const pl = Number(editPallet) || 0;
    const pr = Number(editBocorProduksi) || 0;
    const total = fk + pl + pr;

    const updated: LeakageRecord = {
      ...editingLog,
      date: editDate,
      monthIndex: mIdx,
      day: d,
      shift: editShift,
      operator: editOperator.trim() || 'Petugas Gudang',
      forklift: fk,
      pallet: pl,
      bocorProduksi: pr,
      totalBocor: total,
      catatan: editCatatan,
      isRedDay: editIsRedDay,
      updatedAtStr: new Date().toISOString(),
    };

    onUpdateLog(updated, editSyncExcel);
    setEditingLog(null);
    showToast(`Data log tanggal ${editDate} berhasil disimpan dan disinkronkan!`);
  };

  // Open Delete Confirmation Modal
  const handleOpenDelete = (log: LeakageRecord) => {
    setIsDeletingLog(log);
    setDeleteSyncExcel(true);
  };

  // Confirm Delete
  const handleConfirmDelete = () => {
    if (!isDeletingLog) return;
    onDeleteLog(isDeletingLog.id, isDeletingLog.monthIndex, isDeletingLog.day, deleteSyncExcel);
    showToast(`Data log tanggal ${isDeletingLog.date} berhasil dihapus.`);
    setIsDeletingLog(null);
    if (viewingLog && viewingLog.id === isDeletingLog.id) {
      setViewingLog(null);
    }
  };

  // Submit Add New Log
  const handleSaveNew = (e: React.FormEvent) => {
    e.preventDefault();

    const parts = newDate.split('-').map(Number);
    const mIdx = parts[1] || 1;
    const d = parts[2] || 1;

    const fk = Number(newForklift) || 0;
    const pl = Number(newPallet) || 0;
    const pr = Number(newBocorProduksi) || 0;
    const total = fk + pl + pr;

    onAddLog({
      date: newDate,
      monthIndex: mIdx,
      day: d,
      shift: newShift,
      operator: newOperator.trim() || 'Petugas Gudang',
      forklift: fk,
      pallet: pl,
      bocorProduksi: pr,
      totalBocor: total,
      catatan: newCatatan,
      isRedDay: newIsRedDay,
    });

    setIsAddModalOpen(false);
    // Reset Form
    setNewForklift(0);
    setNewPallet(0);
    setNewBocorProduksi(0);
    setNewCatatan('');
    showToast(`Input harian baru tanggal ${newDate} berhasil disimpan ke log dan tabel!`);
  };

  // Reset all filters
  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedDateFilter('');
    setSelectedMonthFilter('all');
    setSelectedShiftFilter('all');
    setSortBy('date_desc');
  };

  // Quick Date Selectors
  const setFilterToday = () => {
    setSelectedDateFilter(todayStr);
  };

  const setFilterYesterday = () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    setSelectedDateFilter(yesterday.toISOString().split('T')[0]);
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Toast Notification Alert */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl border border-slate-700 flex items-center gap-2.5 text-xs font-semibold animate-slide-up">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          <span>{toastMessage}</span>
          <button
            onClick={() => setToastMessage(null)}
            className="ml-2 text-slate-400 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Header & Action Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 bg-slate-900 text-amber-400 rounded-lg shadow-2xs">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 uppercase tracking-tight flex items-center gap-2">
                  LOG DETAIL CATATAN KARUNG BOCOR
                  <span className="bg-amber-100 text-amber-900 text-[10px] font-black px-2 py-0.5 rounded-full border border-amber-300">
                    Inputan Harian
                  </span>
                </h2>
                <p className="text-xs text-slate-500 font-medium">
                  Rincian seluruh riwayat entri kerusakan harian gudang jadi &bull; Tersinkronisasi dengan Tabel Excel
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <PlusCircle className="w-4 h-4 text-amber-400" />
              <span>+ Input Harian Baru</span>
            </button>

            {onNavigateToPetugas && (
              <button
                type="button"
                onClick={onNavigateToPetugas}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-all border border-slate-200 cursor-pointer"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-blue-600" />
                <span>Form Berita Acara</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold border border-slate-300 transition-all cursor-pointer"
              title="Cetak Log Laporan"
            >
              <Printer className="w-3.5 h-3.5 text-slate-500" />
              <span>Cetak Log</span>
            </button>
          </div>
        </div>

        {/* ================= FILTER TOOLBAR (Pilih Tanggal, Bulan, Shift, Pencarian) ================= */}
        <div className="mt-4 pt-1 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* 1. Pilih Tanggal Spesifik */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-blue-600" />
                Pilih Tanggal:
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={selectedDateFilter}
                  onChange={(e) => setSelectedDateFilter(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 font-semibold text-slate-800"
                />
                {selectedDateFilter && (
                  <button
                    onClick={() => setSelectedDateFilter('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-0.5 rounded"
                    title="Hapus filter tanggal"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* 2. Pilih Bulan */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-amber-600" />
                Pilih Bulan:
              </label>
              <select
                value={selectedMonthFilter}
                onChange={(e) =>
                  setSelectedMonthFilter(e.target.value === 'all' ? 'all' : parseInt(e.target.value, 10))
                }
                className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 font-bold text-slate-800"
              >
                <option value="all">Semua Bulan (Januari - Desember)</option>
                {monthOptions.map((m) => {
                  const countInMonth = unifiedLogs.filter((l) => l.monthIndex === m.index).length;
                  return (
                    <option key={m.index} value={m.index}>
                      {m.name} {countInMonth > 0 ? `(${countInMonth} data)` : ''}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* 3. Filter Shift Kerja */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-emerald-600" />
                Filter Shift:
              </label>
              <select
                value={selectedShiftFilter}
                onChange={(e) => setSelectedShiftFilter(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 font-semibold text-slate-800"
              >
                <option value="all">Semua Shift</option>
                <option value="Shift 1">Shift 1 (Pagi)</option>
                <option value="Shift 2">Shift 2 (Sore)</option>
                <option value="Shift 3">Shift 3 (Malam)</option>
                <option value="Reguler">Reguler</option>
              </select>
            </div>

            {/* 4. Urutan Sort */}
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                <ArrowUpDown className="w-3.5 h-3.5 text-slate-500" />
                Urutan:
              </label>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 font-semibold text-slate-800"
              >
                <option value="date_desc">Tanggal: Terbaru &rarr; Terlama</option>
                <option value="date_asc">Tanggal: Terlama &rarr; Terbaru</option>
                <option value="bocor_desc">Total Bocor: Terbesar &rarr; Terkecil</option>
                <option value="bocor_asc">Total Bocor: Terkecil &rarr; Terbesar</option>
              </select>
            </div>
          </div>

          {/* Quick Date Chips & Search Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-bold text-slate-500 mr-1">Cepat:</span>
              <button
                type="button"
                onClick={setFilterToday}
                className={`text-[11px] font-bold px-2.5 py-1 rounded-md transition-colors border ${
                  selectedDateFilter === todayStr
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                }`}
              >
                Hari Ini
              </button>
              <button
                type="button"
                onClick={setFilterYesterday}
                className="text-[11px] font-bold px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors"
              >
                Kemarin
              </button>
              <button
                type="button"
                onClick={() => {
                  setSelectedDateFilter('');
                  setSelectedMonthFilter('all');
                }}
                className="text-[11px] font-bold px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition-colors"
              >
                Semua Tanggal
              </button>

              {(selectedDateFilter || selectedMonthFilter !== 'all' || selectedShiftFilter !== 'all' || searchTerm) && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="text-[11px] font-bold px-2.5 py-1 rounded-md bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 transition-colors flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset Filter</span>
                </button>
              )}
            </div>

            {/* Keyword Search Input */}
            <div className="relative w-full sm:w-72">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Cari operator, catatan, tanggal..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-lg pl-8 pr-7 py-1.5 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 font-medium text-slate-800 placeholder-slate-400"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-0.5 rounded"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ================= SUMMARY STATS CARDS ================= */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Total Entri</span>
          <span className="text-base font-extrabold text-slate-900 mt-0.5 block">{stats.count} Data</span>
          <span className="text-[10px] text-slate-400">Dari input harian</span>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Bocor Forklift</span>
          <span className="text-base font-extrabold text-slate-800 mt-0.5 block">{formatNumberIndonesian(stats.sumForklift)}</span>
          <span className="text-[10px] text-slate-400">karung</span>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Bocor Pallet</span>
          <span className="text-base font-extrabold text-slate-800 mt-0.5 block">{formatNumberIndonesian(stats.sumPallet)}</span>
          <span className="text-[10px] text-slate-400">karung</span>
        </div>

        <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Bocor Produksi</span>
          <span className="text-base font-extrabold text-slate-800 mt-0.5 block">{formatNumberIndonesian(stats.sumProduksi)}</span>
          <span className="text-[10px] text-slate-400">karung</span>
        </div>

        <div className="bg-amber-500 text-slate-950 p-3 rounded-xl border border-amber-600 shadow-2xs">
          <span className="text-[10px] font-black uppercase tracking-wider block text-slate-900">Total Bocor</span>
          <span className="text-lg font-black mt-0.5 block">{formatNumberIndonesian(stats.sumTotalBocor)}</span>
          <span className="text-[10px] font-bold text-slate-900">karung</span>
        </div>

        <div className="bg-slate-900 text-white p-3 rounded-xl border border-slate-800 shadow-2xs">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Estimasi Bobot</span>
          <span className="text-base font-extrabold text-emerald-400 mt-0.5 block">{formatNumberIndonesian(stats.totalKg)}</span>
          <span className="text-[10px] text-slate-400">Kg (Std: {settings.beratPerKarungKg}kg)</span>
        </div>
      </div>

      {/* ================= LOG TABLE WITH LIHAT, EDIT, HAPUS ================= */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead>
              <tr className="bg-slate-900 text-white font-bold tracking-wider text-[10px] uppercase border-b border-slate-900">
                <th className="p-3 text-center w-10 border-r border-slate-800">NO</th>
                <th className="p-3 border-r border-slate-800">TANGGAL & HARI</th>
                <th className="p-3 border-r border-slate-800">SHIFT</th>
                <th className="p-3 border-r border-slate-800 text-center">FORKLIFT</th>
                <th className="p-3 border-r border-slate-800 text-center">PALLET</th>
                <th className="p-3 border-r border-slate-800 text-center">PRODUKSI</th>
                <th className="p-3 border-r border-slate-800 text-center font-black bg-amber-400 text-slate-950">
                  TOTAL BOCOR
                </th>
                <th className="p-3 border-r border-slate-800">OPERATOR / PETUGAS</th>
                <th className="p-3 border-r border-slate-800">CATATAN KERUSAKAN</th>
                <th className="p-3 text-center w-36">AKSI (LIHAT / EDIT / HAPUS)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={10} className="p-10 text-center text-slate-400">
                    <div className="max-w-sm mx-auto space-y-2">
                      <div className="p-3 bg-slate-100 rounded-full w-12 h-12 flex items-center justify-center mx-auto text-slate-400">
                        <Search className="w-6 h-6" />
                      </div>
                      <p className="font-bold text-slate-700 text-sm">Tidak Ada Catatan Log yang Sesuai</p>
                      <p className="text-xs text-slate-500">
                        {searchTerm || selectedDateFilter || selectedMonthFilter !== 'all' || selectedShiftFilter !== 'all'
                          ? 'Silakan ubah kriteria pencarian, tanggal, atau klik "Reset Filter".'
                          : 'Belum ada data input harian karung bocor.'}
                      </p>
                      <div className="pt-2 flex justify-center gap-2">
                        <button
                          type="button"
                          onClick={() => setIsAddModalOpen(true)}
                          className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-all shadow-xs"
                        >
                          + Input Harian Baru
                        </button>
                        {(selectedDateFilter || selectedMonthFilter !== 'all' || searchTerm) && (
                          <button
                            type="button"
                            onClick={handleResetFilters}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold border border-slate-300"
                          >
                            Reset Filter
                          </button>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log, index) => {
                  const parts = (log.date || '').split('-').map(Number);
                  const mIdx = log.monthIndex || parts[1] || 1;
                  const d = log.day || parts[2] || 1;
                  const dayName = getIndonesianFullDayName(currentYear, mIdx, d);

                  return (
                    <tr
                      key={log.id}
                      className="hover:bg-amber-50/40 transition-colors group"
                    >
                      {/* No */}
                      <td className="p-2.5 text-center text-slate-400 font-semibold border-r border-slate-100">
                        {index + 1}
                      </td>

                      {/* Tanggal & Hari */}
                      <td className="p-2.5 border-r border-slate-100">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span className="font-bold text-slate-900">
                            {dayName}, {d} {monthOptions[mIdx - 1]?.name.replace(/^[0-9]+\s*/, '')} {currentYear}
                          </span>
                          {log.isRedDay && (
                            <span className="bg-red-100 text-red-700 text-[9px] font-black px-1.5 py-0.2 rounded border border-red-200 uppercase">
                              Off
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-400 font-mono ml-5 block">
                          {log.date}
                        </span>
                      </td>

                      {/* Shift */}
                      <td className="p-2.5 border-r border-slate-100">
                        <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 rounded text-[10px] font-bold text-slate-700 uppercase">
                          {log.shift || 'Shift 1'}
                        </span>
                      </td>

                      {/* Forklift */}
                      <td className="p-2.5 text-center font-bold border-r border-slate-100 text-slate-800">
                        {formatNumberIndonesian(log.forklift || 0)}
                      </td>

                      {/* Pallet */}
                      <td className="p-2.5 text-center font-bold border-r border-slate-100 text-slate-800">
                        {formatNumberIndonesian(log.pallet || 0)}
                      </td>

                      {/* Produksi */}
                      <td className="p-2.5 text-center font-bold border-r border-slate-100 text-slate-800">
                        {formatNumberIndonesian(log.bocorProduksi || 0)}
                      </td>

                      {/* Total Bocor */}
                      <td className="p-2.5 text-center font-black border-r border-slate-100 bg-amber-50/80">
                        <span className="inline-block px-2 py-0.5 rounded bg-amber-100 text-amber-950 border border-amber-300 font-black">
                          {formatNumberIndonesian(log.totalBocor || 0)}
                        </span>
                      </td>

                      {/* Operator */}
                      <td className="p-2.5 border-r border-slate-100 font-semibold text-slate-800">
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span>{log.operator || 'Petugas'}</span>
                        </div>
                      </td>

                      {/* Catatan */}
                      <td className="p-2.5 border-r border-slate-100 text-slate-600 max-w-xs truncate font-medium">
                        {log.catatan || <span className="text-slate-300 italic">—</span>}
                      </td>

                      {/* AKSI: LIHAT, EDIT, HAPUS */}
                      <td className="p-2.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {/* 1. LIHAT (View Modal) */}
                          <button
                            type="button"
                            onClick={() => setViewingLog(log)}
                            className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors shadow-2xs"
                            title="Lihat Detail Log"
                          >
                            <Eye className="w-3.5 h-3.5 text-slate-700" />
                          </button>

                          {/* 2. EDIT (Edit Modal) */}
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(log)}
                            className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-semibold transition-colors shadow-2xs"
                            title="Edit & Simpan Log"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-blue-700" />
                          </button>

                          {/* 3. HAPUS (Delete Modal) */}
                          <button
                            type="button"
                            onClick={() => handleOpenDelete(log)}
                            className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg text-xs font-semibold transition-colors shadow-2xs"
                            title="Hapus Entri Log"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-red-600" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
            {/* Table Footer Summary */}
            {filteredLogs.length > 0 && (
              <tfoot>
                <tr className="bg-slate-100 font-extrabold text-slate-900 border-t-2 border-slate-300 text-xs">
                  <td colSpan={3} className="p-3 text-right uppercase tracking-wider text-slate-800">
                    TOTAL TERFILTER ({filteredLogs.length} DATA):
                  </td>
                  <td className="p-3 text-center text-slate-800">
                    {formatNumberIndonesian(stats.sumForklift)}
                  </td>
                  <td className="p-3 text-center text-slate-800">
                    {formatNumberIndonesian(stats.sumPallet)}
                  </td>
                  <td className="p-3 text-center text-slate-800">
                    {formatNumberIndonesian(stats.sumProduksi)}
                  </td>
                  <td className="p-3 text-center bg-amber-400 text-slate-950 font-black text-sm">
                    {formatNumberIndonesian(stats.sumTotalBocor)}
                  </td>
                  <td colSpan={3} className="p-3 text-slate-600 text-[11px] font-normal">
                    Estimasi Bobot: <span className="font-bold text-slate-900">{formatNumberIndonesian(stats.totalKg)} Kg</span> &bull; Tersinkronisasi otomatis dengan Firestore & Excel
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* ================= MODAL LIHAT DETAIL (VIEW MODAL) ================= */}
      {viewingLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden">
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-900 to-slate-800 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-400 text-slate-950 rounded-xl shadow-xs">
                  <Eye className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white uppercase tracking-tight">
                    DETAIL CATATAN KARUNG BOCOR
                  </h3>
                  <p className="text-xs text-slate-300">
                    Entri inputan harian gudang jadi
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingLog(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              {/* Tanggal & Shift */}
              <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Tanggal Entri</span>
                  <span className="text-sm font-bold text-slate-900">
                    {viewingLog.monthIndex && viewingLog.day
                      ? `${getIndonesianFullDayName(currentYear, viewingLog.monthIndex, viewingLog.day)}, ${viewingLog.day} ${monthOptions[viewingLog.monthIndex - 1]?.name.replace(/^[0-9]+\s*/, '')} ${currentYear}`
                      : viewingLog.date}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono block">{viewingLog.date}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Shift & Operator</span>
                  <span className="text-xs font-bold text-slate-800">{viewingLog.shift || 'Shift 1'}</span>
                  <span className="text-xs text-slate-600 block">{viewingLog.operator || 'Petugas Gudang'}</span>
                </div>
              </div>

              {/* Rincian Angka */}
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Forklift</span>
                  <span className="text-xl font-extrabold text-slate-900 mt-1 block">
                    {formatNumberIndonesian(viewingLog.forklift || 0)}
                  </span>
                  <span className="text-[10px] text-slate-400">karung</span>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Pallet</span>
                  <span className="text-xl font-extrabold text-slate-900 mt-1 block">
                    {formatNumberIndonesian(viewingLog.pallet || 0)}
                  </span>
                  <span className="text-[10px] text-slate-400">karung</span>
                </div>

                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-center">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Produksi</span>
                  <span className="text-xl font-extrabold text-slate-900 mt-1 block">
                    {formatNumberIndonesian(viewingLog.bocorProduksi || 0)}
                  </span>
                  <span className="text-[10px] text-slate-400">karung</span>
                </div>
              </div>

              {/* Total Banner */}
              <div className="bg-amber-500 text-slate-950 p-4 rounded-xl border border-amber-600 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-xs font-black uppercase tracking-wider text-slate-900 block">
                    TOTAL KERUSAKAN KARUNG
                  </span>
                  <span className="text-xs text-slate-900 font-semibold">
                    Estimasi: {formatNumberIndonesian((viewingLog.totalBocor || 0) * (settings.beratPerKarungKg || 50))} Kg
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-3xl font-black text-slate-950">
                    {formatNumberIndonesian(viewingLog.totalBocor || 0)}
                  </span>
                  <span className="text-xs font-bold text-slate-900 ml-1">Karung</span>
                </div>
              </div>

              {/* Catatan / Keterangan */}
              <div>
                <label className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Catatan / Keterangan Penyebab:
                </label>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 font-medium whitespace-pre-wrap">
                  {viewingLog.catatan ? viewingLog.catatan : <span className="text-slate-400 italic">Tidak ada catatan tambahan untuk entri ini.</span>}
                </div>
              </div>

              {/* Status Hari */}
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-500 font-medium">Status Hari:</span>
                {viewingLog.isRedDay ? (
                  <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-0.5 rounded border border-red-200">
                    Hari Libur / Off Pabrik
                  </span>
                ) : (
                  <span className="bg-emerald-100 text-emerald-800 text-xs font-bold px-2 py-0.5 rounded border border-emerald-200">
                    Hari Kerja Normal
                  </span>
                )}
              </div>
            </div>

            {/* Footer Buttons */}
            <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const target = viewingLog;
                    setViewingLog(null);
                    handleOpenEdit(target);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit Data Ini</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const target = viewingLog;
                    setViewingLog(null);
                    handleOpenDelete(target);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 rounded-lg text-xs font-bold cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Hapus</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                {onViewInTable && viewingLog.monthIndex && viewingLog.day && (
                  <button
                    type="button"
                    onClick={() => {
                      onViewInTable(viewingLog.monthIndex, viewingLog.day);
                      setViewingLog(null);
                    }}
                    className="flex items-center gap-1 px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-bold cursor-pointer"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5 text-slate-700" />
                    <span>Buka di Excel</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setViewingLog(null)}
                  className="px-4 py-1.5 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL EDIT & SIMPAN (EDIT MODAL) ================= */}
      {editingLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden">
            {/* Header */}
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-600 text-white rounded-xl shadow-xs">
                  <Edit3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white uppercase tracking-tight">
                    EDIT CATATAN KARUNG BOCOR
                  </h3>
                  <p className="text-xs text-slate-300">
                    Perbarui data log harian dan simpan ke database
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingLog(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Tanggal */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    Tanggal:
                  </label>
                  <input
                    type="date"
                    required
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 font-bold text-slate-800"
                  />
                </div>

                {/* Shift */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    Shift Kerja:
                  </label>
                  <select
                    value={editShift}
                    onChange={(e) => setEditShift(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 font-semibold text-slate-800"
                  >
                    <option value="Shift 1">Shift 1 (07:00 - 15:00)</option>
                    <option value="Shift 2">Shift 2 (15:00 - 23:00)</option>
                    <option value="Shift 3">Shift 3 (23:00 - 07:00)</option>
                    <option value="Reguler">Reguler</option>
                  </select>
                </div>
              </div>

              {/* Operator */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  Operator / Petugas Gudang:
                </label>
                <input
                  type="text"
                  placeholder="Nama petugas pencatat..."
                  value={editOperator}
                  onChange={(e) => setEditOperator(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 font-medium text-slate-800"
                />
              </div>

              {/* Quantities Grid */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3">
                <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wider block">
                  Jumlah Karung Bocor (Pcs)
                </span>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      FORKLIFT
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={editForklift}
                      onChange={(e) => setEditForklift(Math.max(0, parseInt(e.target.value, 10) || 0))}
                      className="w-full text-xs text-center border border-slate-300 rounded-lg p-2 bg-white focus:ring-2 focus:ring-blue-600 font-extrabold text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      PALLET
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={editPallet}
                      onChange={(e) => setEditPallet(Math.max(0, parseInt(e.target.value, 10) || 0))}
                      className="w-full text-xs text-center border border-slate-300 rounded-lg p-2 bg-white focus:ring-2 focus:ring-blue-600 font-extrabold text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      PRODUKSI
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={editBocorProduksi}
                      onChange={(e) => setEditBocorProduksi(Math.max(0, parseInt(e.target.value, 10) || 0))}
                      className="w-full text-xs text-center border border-slate-300 rounded-lg p-2 bg-white focus:ring-2 focus:ring-blue-600 font-extrabold text-slate-900"
                    />
                  </div>
                </div>

                {/* Real-time Total Calculation */}
                <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">Total Bocor:</span>
                  <span className="text-sm font-black text-amber-950 bg-amber-100 px-2.5 py-0.5 rounded border border-amber-300">
                    {formatNumberIndonesian((Number(editForklift) || 0) + (Number(editPallet) || 0) + (Number(editBocorProduksi) || 0))} Karung
                  </span>
                </div>
              </div>

              {/* Catatan */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-slate-400" />
                  Catatan / Keterangan Kerusakan:
                </label>
                <textarea
                  rows={2}
                  placeholder="Keterangan jenis pakan, lokasi pallet, penyebab..."
                  value={editCatatan}
                  onChange={(e) => setEditCatatan(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 font-medium text-slate-800"
                />
              </div>

              {/* Options */}
              <div className="space-y-2 pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700 font-medium">
                  <input
                    type="checkbox"
                    checked={editIsRedDay}
                    onChange={(e) => setEditIsRedDay(e.target.checked)}
                    className="w-4 h-4 text-red-600 rounded border-slate-300 focus:ring-red-500"
                  />
                  <span>Tandai sebagai Hari Libur / Off (Sorotan Merah di Excel)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700 font-semibold bg-emerald-50 p-2.5 rounded-lg border border-emerald-200">
                  <input
                    type="checkbox"
                    checked={editSyncExcel}
                    onChange={(e) => setEditSyncExcel(e.target.checked)}
                    className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                  />
                  <span className="text-emerald-900">
                    Sinkronkan otomatis nilai ini ke lembar kerja Excel 2026
                  </span>
                </label>
              </div>

              {/* Action Buttons: SIMPAN & Batal */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setEditingLog(null)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Simpan Perubahan</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= MODAL HAPUS KONFIRMASI (DELETE MODAL) ================= */}
      {isDeletingLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-md w-full overflow-hidden">
            <div className="bg-red-600 text-white p-5 flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-xl">
                <AlertTriangle className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white uppercase tracking-tight">
                  HAPUS CATATAN LOG
                </h3>
                <p className="text-xs text-red-100">
                  Konfirmasi penghapusan data karung bocor
                </p>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-700 leading-relaxed">
                Apakah Anda yakin ingin menghapus catatan log tanggal{' '}
                <strong className="text-slate-900 font-bold">{isDeletingLog.date}</strong>{' '}
                dengan total <strong className="text-red-600 font-black">{isDeletingLog.totalBocor || 0} Karung Bocor</strong>?
              </p>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                <div className="flex justify-between text-slate-600">
                  <span>Forklift:</span>
                  <span className="font-bold text-slate-800">{isDeletingLog.forklift || 0} krg</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Pallet:</span>
                  <span className="font-bold text-slate-800">{isDeletingLog.pallet || 0} krg</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Produksi:</span>
                  <span className="font-bold text-slate-800">{isDeletingLog.bocorProduksi || 0} krg</span>
                </div>
                <div className="flex justify-between font-bold text-slate-900 pt-1 border-t border-slate-200">
                  <span>Total Kerusakan:</span>
                  <span className="text-red-600">{isDeletingLog.totalBocor || 0} Karung</span>
                </div>
              </div>

              {/* Sync Excel Checkbox */}
              <label className="flex items-start gap-2 cursor-pointer text-xs text-slate-700 font-medium bg-red-50 p-2.5 rounded-lg border border-red-200">
                <input
                  type="checkbox"
                  checked={deleteSyncExcel}
                  onChange={(e) => setDeleteSyncExcel(e.target.checked)}
                  className="w-4 h-4 text-red-600 rounded border-slate-300 focus:ring-red-500 mt-0.5"
                />
                <span className="text-red-950 font-semibold">
                  Kosongkan juga angka hari ini di tabel lembar kerja Excel 2026 (reset ke 0)
                </span>
              </label>
            </div>

            {/* Footer Buttons */}
            <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsDeletingLog(null)}
                className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Ya, Hapus Data</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL TAMBAH INPUT HARIAN BARU ================= */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden">
            {/* Header */}
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-500 text-slate-950 rounded-xl shadow-xs">
                  <PlusCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white uppercase tracking-tight">
                    TAMBAH CATATAN LOG HARIAN BARU
                  </h3>
                  <p className="text-xs text-slate-300">
                    Input data karung bocor harian langsung ke log & tabel
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveNew} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Tanggal */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    Tanggal Laporan:
                  </label>
                  <input
                    type="date"
                    required
                    value={newDate}
                    onChange={(e) => setNewDate(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 font-bold text-slate-800"
                  />
                </div>

                {/* Shift */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    Shift Kerja:
                  </label>
                  <select
                    value={newShift}
                    onChange={(e) => setNewShift(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 font-semibold text-slate-800"
                  >
                    <option value="Shift 1">Shift 1 (07:00 - 15:00)</option>
                    <option value="Shift 2">Shift 2 (15:00 - 23:00)</option>
                    <option value="Shift 3">Shift 3 (23:00 - 07:00)</option>
                    <option value="Reguler">Reguler</option>
                  </select>
                </div>
              </div>

              {/* Operator */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  Operator / Petugas:
                </label>
                <input
                  type="text"
                  placeholder="Nama petugas pencatat..."
                  value={newOperator}
                  onChange={(e) => setNewOperator(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 font-medium text-slate-800"
                />
              </div>

              {/* Quantities Grid */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-3">
                <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wider block">
                  Jumlah Karung Bocor Berdasarkan Penyebab (Pcs)
                </span>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      FORKLIFT
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={newForklift}
                      onChange={(e) => setNewForklift(Math.max(0, parseInt(e.target.value, 10) || 0))}
                      className="w-full text-xs text-center border border-slate-300 rounded-lg p-2 bg-white focus:ring-2 focus:ring-slate-900 font-extrabold text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      PALLET
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={newPallet}
                      onChange={(e) => setNewPallet(Math.max(0, parseInt(e.target.value, 10) || 0))}
                      className="w-full text-xs text-center border border-slate-300 rounded-lg p-2 bg-white focus:ring-2 focus:ring-slate-900 font-extrabold text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      PRODUKSI
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={newBocorProduksi}
                      onChange={(e) => setNewBocorProduksi(Math.max(0, parseInt(e.target.value, 10) || 0))}
                      className="w-full text-xs text-center border border-slate-300 rounded-lg p-2 bg-white focus:ring-2 focus:ring-slate-900 font-extrabold text-slate-900"
                    />
                  </div>
                </div>

                {/* Realtime Calculation */}
                <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700">Total Bocor:</span>
                  <span className="text-sm font-black text-amber-950 bg-amber-100 px-2.5 py-0.5 rounded border border-amber-300">
                    {formatNumberIndonesian((Number(newForklift) || 0) + (Number(newPallet) || 0) + (Number(newBocorProduksi) || 0))} Karung
                  </span>
                </div>
              </div>

              {/* Catatan */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-slate-400" />
                  Catatan / Keterangan:
                </label>
                <textarea
                  rows={2}
                  placeholder="Catatan tambahan mengenai kondisi karung, jenis pakan, dsb..."
                  value={newCatatan}
                  onChange={(e) => setNewCatatan(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-lg p-2.5 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900 font-medium text-slate-800"
                />
              </div>

              {/* Hari Libur Checkbox */}
              <div>
                <label className="flex items-center gap-2 cursor-pointer text-xs text-slate-700 font-medium">
                  <input
                    type="checkbox"
                    checked={newIsRedDay}
                    onChange={(e) => setNewIsRedDay(e.target.checked)}
                    className="w-4 h-4 text-red-600 rounded border-slate-300 focus:ring-red-500"
                  />
                  <span>Tandai sebagai Hari Libur / Off (Latar Merah di Excel)</span>
                </label>
              </div>

              {/* Buttons */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-lg text-xs font-semibold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>Simpan ke Log & Tabel</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
