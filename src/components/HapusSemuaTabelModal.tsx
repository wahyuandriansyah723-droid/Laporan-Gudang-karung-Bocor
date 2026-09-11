import React, { useState } from 'react';
import {
  Trash2,
  RotateCcw,
  RefreshCw,
  AlertTriangle,
  X,
  Sparkles,
  CheckCircle2,
  Info,
} from 'lucide-react';

interface HapusSemuaTabelModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportTanggalFormatted: string;
  reportHari: string;
  totalRows: number;
  totalBocor: number;
  onClearValuesOnly: () => void;
  onClearAllRows: () => void;
  onResetToStandardEmptyRows: () => void;
  onResetToPhotoSample?: () => void;
}

export const HapusSemuaTabelModal: React.FC<HapusSemuaTabelModalProps> = ({
  isOpen,
  onClose,
  reportTanggalFormatted,
  reportHari,
  totalRows,
  totalBocor,
  onClearValuesOnly,
  onClearAllRows,
  onResetToStandardEmptyRows,
  onResetToPhotoSample,
}) => {
  const [selectedOption, setSelectedOption] = useState<'values' | 'rows' | 'standard'>('values');

  if (!isOpen) return null;

  const handleExecute = () => {
    if (selectedOption === 'values') {
      onClearValuesOnly();
    } else if (selectedOption === 'rows') {
      onClearAllRows();
    } else if (selectedOption === 'standard') {
      onResetToStandardEmptyRows();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-rose-700 via-red-600 to-rose-700 px-5 py-4 text-white flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center flex-shrink-0 border border-white/30">
              <Trash2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-black text-base leading-tight tracking-wide">
                Hapus Semua Isi Tabel Karung Bocor
              </h3>
              <p className="text-xs text-rose-100 mt-0.5">
                Laporan: <strong>{reportHari}, {reportTanggalFormatted}</strong> &bull; {totalRows} Baris &bull; Total {totalBocor} Karung
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-black/10 hover:bg-black/20 text-white/90 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            title="Tutup dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs text-slate-700">
          {/* Warning Banner */}
          <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-amber-900">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <h4 className="font-bold text-xs text-amber-950">
                Peringatan Penghapusan Data Tabel
              </h4>
              <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
                Tindakan ini akan mengubah data laporan karung bocor untuk tanggal <strong>{reportTanggalFormatted}</strong>. Perubahan akan langsung disinkronkan ke cloud & perangkat tim lainnya secara otomatis.
              </p>
            </div>
          </div>

          <div>
            <p className="font-bold text-slate-900 text-xs mb-2">
              Pilih metode penghapusan isi tabel:
            </p>

            <div className="space-y-2.5">
              {/* Option 1: Kosongkan Nilai Saja (Pertahankan Pakan) */}
              <label
                onClick={() => setSelectedOption('values')}
                className={`flex items-start gap-3 p-3.5 rounded-xl border-2 transition-all cursor-pointer ${
                  selectedOption === 'values'
                    ? 'border-rose-600 bg-rose-50/50 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <input
                  type="radio"
                  name="clear_mode"
                  checked={selectedOption === 'values'}
                  onChange={() => setSelectedOption('values')}
                  className="mt-1 w-4 h-4 text-rose-600 focus:ring-rose-500 cursor-pointer"
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                      <RotateCcw className="w-4 h-4 text-rose-600" />
                      Kosongkan Semua Angka & Nilai Kerusakan
                    </span>
                    <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                      Paling Direkomendasikan
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                    Mereset seluruh kolom <strong>Stok Awal, Forklift, Pallet, Produksi, Total Bocor, Jahit, Ganti Karung, Sisa,</strong> dan <strong>Keterangan</strong> ke angka <strong>0 (bersih)</strong>. Daftar nama jenis pakan tetap tersusun rapi di tabel.
                  </p>
                </div>
              </label>

              {/* Option 2: Hapus Bersih Semua Baris Pakan */}
              <label
                onClick={() => setSelectedOption('rows')}
                className={`flex items-start gap-3 p-3.5 rounded-xl border-2 transition-all cursor-pointer ${
                  selectedOption === 'rows'
                    ? 'border-rose-600 bg-rose-50/50 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <input
                  type="radio"
                  name="clear_mode"
                  checked={selectedOption === 'rows'}
                  onChange={() => setSelectedOption('rows')}
                  className="mt-1 w-4 h-4 text-rose-600 focus:ring-rose-500 cursor-pointer"
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                      <Trash2 className="w-4 h-4 text-rose-600" />
                      Hapus Bersih Seluruh Baris Pakan (Tabel Kosong)
                    </span>
                    <span className="bg-rose-100 text-rose-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                      Reset Total
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                    Menghapus <strong>seluruh baris jenis pakan</strong> dari tabel sehingga tabel menjadi <strong>0 baris (bersih total)</strong>. Anda dapat menginput baris jenis pakan dari awal satu per satu.
                  </p>
                </div>
              </label>

              {/* Option 3: Format Ulang ke 20 Pakan Standar JAPFA (Angka 0) */}
              <label
                onClick={() => setSelectedOption('standard')}
                className={`flex items-start gap-3 p-3.5 rounded-xl border-2 transition-all cursor-pointer ${
                  selectedOption === 'standard'
                    ? 'border-rose-600 bg-rose-50/50 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <input
                  type="radio"
                  name="clear_mode"
                  checked={selectedOption === 'standard'}
                  onChange={() => setSelectedOption('standard')}
                  className="mt-1 w-4 h-4 text-rose-600 focus:ring-rose-500 cursor-pointer"
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                      <RefreshCw className="w-4 h-4 text-rose-600" />
                      Atur Ulang ke Template Standar 20 Pakan (0 Karung)
                    </span>
                    <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
                      Template Baku
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                    Mengisi ulang tabel dengan susunan <strong>20 baris jenis pakan standar JAPFA</strong> (Parli, Par DOC, Par GOLD, SB 10, SB 11, SB 12, KUK Supra, dll) dengan seluruh angka <strong>0</strong>.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Quick Alternative: Restore Photo Sample if needed */}
          {onResetToPhotoSample && (
            <div className="pt-2 border-t border-slate-200 flex items-center justify-between gap-3">
              <div className="text-[11px] text-slate-500">
                Ingin mengisi kembali dengan data sampel JAPFA?
              </div>
              <button
                type="button"
                onClick={() => {
                  onResetToPhotoSample();
                  onClose();
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg text-xs transition-colors shadow-2xs cursor-pointer flex-shrink-0"
                title="Muat kembali data sampel 109 karung (18 Juli 2026)"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Muat Sampel Foto (109)</span>
              </button>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
          >
            Batal
          </button>

          <button
            type="button"
            onClick={handleExecute}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white font-black rounded-xl text-xs shadow-md transition-all cursor-pointer hover:shadow-lg"
          >
            <Trash2 className="w-4 h-4" />
            <span>
              {selectedOption === 'values'
                ? 'Kosongkan Semua Angka'
                : selectedOption === 'rows'
                ? 'Hapus Semua Baris Tabel'
                : 'Atur Ulang ke 20 Pakan Kosong'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
