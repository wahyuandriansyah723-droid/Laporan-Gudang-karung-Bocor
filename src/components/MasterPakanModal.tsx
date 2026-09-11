import React, { useState, useMemo, useEffect } from 'react';
import { MasterJenisPakan } from '../types';
import { defaultMasterFeedTypes } from '../data/samplePetugasReport';
import { defaultDaftarKategoriPakan } from '../data/initialData';
import {
  X,
  Plus,
  Search,
  Check,
  Edit3,
  Trash2,
  RotateCcw,
  ArrowUp,
  ArrowDown,
  Layers,
  Package,
  FileSpreadsheet,
  Upload,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Sparkles,
  Tag,
  FolderTree,
  FolderPlus,
  Save,
} from 'lucide-react';

export interface MasterPakanModalProps {
  isOpen: boolean;
  onClose: () => void;
  masterPakanList: MasterJenisPakan[];
  daftarKategori?: string[];
  onSaveMasterPakan: (newList: MasterJenisPakan[], newCategories?: string[]) => void;
  onSaveCategories?: (newCategories: string[], updatedFeeds?: MasterJenisPakan[]) => void;
  onApplyToActiveReport?: (activeFeedNames: string[]) => void;
}

export const MasterPakanModal: React.FC<MasterPakanModalProps> = ({
  isOpen,
  onClose,
  masterPakanList,
  daftarKategori,
  onSaveMasterPakan,
  onSaveCategories,
  onApplyToActiveReport,
}) => {
  // Navigation tab: 'pakan' for feeds list, 'kategori' for categories management
  const [activeTab, setActiveTab] = useState<'pakan' | 'kategori'>('pakan');

  // Feeds state
  const [list, setList] = useState<MasterJenisPakan[]>(() => {
    if (masterPakanList && masterPakanList.length > 0) {
      return masterPakanList;
    }
    return defaultMasterFeedTypes;
  });

  // Sync internal feed list if props update
  useEffect(() => {
    if (masterPakanList && masterPakanList.length > 0) {
      setList(masterPakanList);
    }
  }, [masterPakanList]);

  // Categories state
  const [categoryList, setCategoryList] = useState<string[]>(() => {
    if (daftarKategori && daftarKategori.length > 0) {
      return daftarKategori;
    }
    const fromFeeds = (masterPakanList || defaultMasterFeedTypes)
      .map((f) => f.kategori)
      .filter((k): k is string => Boolean(k && k.trim()));
    const combined = Array.from(new Set([...defaultDaftarKategoriPakan, ...fromFeeds]));
    return combined.length > 0 ? combined : defaultDaftarKategoriPakan;
  });

  // Sync internal category list if props update
  useEffect(() => {
    if (daftarKategori && daftarKategori.length > 0) {
      setCategoryList(daftarKategori);
    }
  }, [daftarKategori]);

  // Feed search & filter
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Semua Kategori');

  // Feed Add/Edit form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formKode, setFormKode] = useState('');
  const [formNama, setFormNama] = useState('');
  const [formKategori, setFormKategori] = useState('Broiler Starter');
  const [formBerat, setFormBerat] = useState<number>(50);
  const [formKeterangan, setFormKeterangan] = useState('');
  const [formIsActive, setFormIsActive] = useState(true);

  // Bulk paste state
  const [showBulkPaste, setShowBulkPaste] = useState(false);
  const [bulkText, setBulkText] = useState('');

  // Category management state
  const [categorySearchTerm, setCategorySearchTerm] = useState('');
  const [showAddCategoryForm, setShowAddCategoryForm] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCategory, setEditingCategory] = useState<{
    originalName: string;
    newName: string;
  } | null>(null);

  // In-app Category delete dialog state
  const [categoryToDelete, setCategoryToDelete] = useState<{
    name: string;
    affectedFeeds: MasterJenisPakan[];
    replacementCategory: string;
  } | null>(null);

  // In-app Feed delete dialog state
  const [feedToDelete, setFeedToDelete] = useState<MasterJenisPakan | null>(null);

  // In-app Reset dialog states
  const [isResetFeedConfirmOpen, setIsResetFeedConfirmOpen] = useState(false);
  const [isResetCategoryConfirmOpen, setIsResetCategoryConfirmOpen] = useState(false);

  // Notification Toast
  const [notification, setNotification] = useState<string | null>(null);

  // Memoized derived calculations - unconditionally before any early return
  const feedCountByCategory = useMemo(() => {
    const counts: Record<string, number> = {};
    list.forEach((item) => {
      const cat = item.kategori?.trim() || 'Lainnya';
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return counts;
  }, [list]);

  const filteredList = useMemo(() => {
    return list.filter((item) => {
      const matchesSearch =
        item.nama.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.kode && item.kode.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.keterangan && item.keterangan.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesCategory =
        selectedCategory === 'Semua Kategori' ||
        (item.kategori && item.kategori.toLowerCase() === selectedCategory.toLowerCase());

      return matchesSearch && matchesCategory;
    });
  }, [list, searchTerm, selectedCategory]);

  const filteredCategories = useMemo(() => {
    return categoryList.filter((cat) =>
      cat.toLowerCase().includes(categorySearchTerm.toLowerCase())
    );
  }, [categoryList, categorySearchTerm]);

  const activeFeedsCount = useMemo(() => {
    return list.filter((f) => f.isActive).length;
  }, [list]);

  // Show notification helper
  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3500);
  };

  // Helper to save categories & feeds synchronously
  const persistCategoriesAndFeeds = (
    newCats: string[],
    updatedFeeds: MasterJenisPakan[] = list
  ) => {
    setCategoryList(newCats);
    if (onSaveCategories) {
      onSaveCategories(newCats, updatedFeeds);
    } else {
      onSaveMasterPakan(updatedFeeds, newCats);
    }
  };

  // Category Handlers
  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = newCategoryName.trim();
    if (!cleanName) {
      showNotification('Nama kategori tidak boleh kosong!');
      return;
    }

    const isDuplicate = categoryList.some(
      (c) => c.toLowerCase() === cleanName.toLowerCase()
    );
    if (isDuplicate) {
      showNotification(`Kategori "${cleanName}" sudah terdaftar!`);
      return;
    }

    const updated = [...categoryList, cleanName];
    persistCategoriesAndFeeds(updated);
    setNewCategoryName('');
    setShowAddCategoryForm(false);
    showNotification(`Kategori baru "${cleanName}" berhasil ditambahkan dan disimpan!`);
  };

  const handleStartEditCategory = (cat: string) => {
    setEditingCategory({ originalName: cat, newName: cat });
  };

  const handleSaveEditCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCategory) return;
    const cleanNewName = editingCategory.newName.trim();
    const original = editingCategory.originalName;

    if (!cleanNewName) {
      showNotification('Nama kategori tidak boleh kosong!');
      return;
    }

    if (cleanNewName.toLowerCase() === original.toLowerCase()) {
      setEditingCategory(null);
      return;
    }

    const isDuplicate = categoryList.some(
      (c) => c.toLowerCase() === cleanNewName.toLowerCase() && c.toLowerCase() !== original.toLowerCase()
    );
    if (isDuplicate) {
      showNotification(`Kategori "${cleanNewName}" sudah ada dalam daftar!`);
      return;
    }

    // Update category list
    const updatedCategories = categoryList.map((c) => (c === original ? cleanNewName : c));

    // Cascade update all feeds currently using the old category name
    let affectedCount = 0;
    const updatedFeeds = list.map((item) => {
      if (item.kategori && item.kategori.trim().toLowerCase() === original.toLowerCase()) {
        affectedCount++;
        return { ...item, kategori: cleanNewName };
      }
      return item;
    });

    setList(updatedFeeds);
    persistCategoriesAndFeeds(updatedCategories, updatedFeeds);
    onSaveMasterPakan(updatedFeeds, updatedCategories);

    if (selectedCategory === original) {
      setSelectedCategory(cleanNewName);
    }
    if (formKategori === original) {
      setFormKategori(cleanNewName);
    }

    setEditingCategory(null);
    showNotification(
      `Kategori "${original}" berhasil diubah menjadi "${cleanNewName}" (${affectedCount} jenis pakan diperbarui)!`
    );
  };

  const handlePromptDeleteCategory = (catName: string) => {
    const affected = list.filter(
      (item) => item.kategori && item.kategori.trim().toLowerCase() === catName.toLowerCase()
    );

    const otherCats = categoryList.filter((c) => c.toLowerCase() !== catName.toLowerCase());
    const defaultReplacement = otherCats.includes('Lainnya')
      ? 'Lainnya'
      : otherCats[0] || 'Umum';

    setCategoryToDelete({
      name: catName,
      affectedFeeds: affected,
      replacementCategory: defaultReplacement,
    });
  };

  const handleConfirmDeleteCategory = () => {
    if (!categoryToDelete) return;
    const catName = categoryToDelete.name;
    const replacement = categoryToDelete.replacementCategory;

    const updatedCategories = categoryList.filter((c) => c !== catName);
    if (!updatedCategories.includes(replacement) && replacement !== '') {
      updatedCategories.push(replacement);
    }

    let reassignCount = 0;
    const updatedFeeds = list.map((item) => {
      if (item.kategori && item.kategori.trim().toLowerCase() === catName.toLowerCase()) {
        reassignCount++;
        return { ...item, kategori: replacement || 'Lainnya' };
      }
      return item;
    });

    setList(updatedFeeds);
    persistCategoriesAndFeeds(updatedCategories, updatedFeeds);
    onSaveMasterPakan(updatedFeeds, updatedCategories);

    if (selectedCategory === catName) {
      setSelectedCategory('Semua Kategori');
    }
    if (formKategori === catName) {
      setFormKategori(replacement || 'Lainnya');
    }

    const deletedName = categoryToDelete.name;
    setCategoryToDelete(null);

    if (reassignCount > 0) {
      showNotification(
        `Kategori "${deletedName}" dihapus. ${reassignCount} jenis pakan dialihkan ke kategori "${replacement}".`
      );
    } else {
      showNotification(`Kategori "${deletedName}" berhasil dihapus.`);
    }
  };

  const handleResetCategoriesToDefault = () => {
    persistCategoriesAndFeeds(defaultDaftarKategoriPakan);
    setIsResetCategoryConfirmOpen(false);
    showNotification('Daftar kategori pakan berhasil direset ke standar pabrik JAPFA!');
  };

  // Feed Handlers
  const resetForm = () => {
    setFormKode('');
    setFormNama('');
    setFormKategori(categoryList[0] || 'Broiler Starter');
    setFormBerat(50);
    setFormKeterangan('');
    setFormIsActive(true);
    setEditingId(null);
    setShowAddForm(false);
  };

  const handleStartAdd = () => {
    resetForm();
    setShowAddForm(true);
    setShowBulkPaste(false);
  };

  const handleStartEdit = (item: MasterJenisPakan) => {
    setEditingId(item.id);
    setFormKode(item.kode || '');
    setFormNama(item.nama);
    setFormKategori(item.kategori || categoryList[0] || 'Broiler Starter');
    setFormBerat(item.beratKemasan || 50);
    setFormKeterangan(item.keterangan || '');
    setFormIsActive(item.isActive);
    setShowAddForm(true);
    setShowBulkPaste(false);
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanNama = formNama.trim();
    if (!cleanNama) {
      showNotification('Nama jenis pakan wajib diisi!');
      return;
    }

    let currentCats = [...categoryList];
    const cleanCat = formKategori.trim();
    if (cleanCat && !currentCats.some((c) => c.toLowerCase() === cleanCat.toLowerCase())) {
      currentCats.push(cleanCat);
      setCategoryList(currentCats);
    }

    let updated: MasterJenisPakan[];

    if (editingId) {
      updated = list.map((item) =>
        item.id === editingId
          ? {
              ...item,
              kode: formKode.trim().toUpperCase() || undefined,
              nama: cleanNama,
              kategori: cleanCat,
              beratKemasan: formBerat > 0 ? formBerat : 50,
              keterangan: formKeterangan.trim(),
              isActive: formIsActive,
            }
          : item
      );
      showNotification(`Jenis pakan "${cleanNama}" berhasil diperbarui!`);
    } else {
      const isExist = list.some((i) => i.nama.toLowerCase() === cleanNama.toLowerCase());
      if (isExist) {
        showNotification(`Pakan dengan nama "${cleanNama}" sudah ada dalam master data!`);
        return;
      }

      const newItem: MasterJenisPakan = {
        id: `pakan_${Date.now()}`,
        kode: formKode.trim().toUpperCase() || undefined,
        nama: cleanNama,
        kategori: cleanCat,
        beratKemasan: formBerat > 0 ? formBerat : 50,
        keterangan: formKeterangan.trim(),
        isActive: formIsActive,
        urutan: list.length + 1,
      };
      updated = [...list, newItem];
      showNotification(`Jenis pakan baru "${cleanNama}" berhasil ditambahkan ke master data!`);
    }

    setList(updated);
    onSaveMasterPakan(updated, currentCats);
    resetForm();
  };

  const handleConfirmDeleteFeed = () => {
    if (!feedToDelete) return;
    const updated = list
      .filter((item) => item.id !== feedToDelete.id)
      .map((item, idx) => ({ ...item, urutan: idx + 1 }));
    setList(updated);
    onSaveMasterPakan(updated, categoryList);
    showNotification(`Jenis pakan "${feedToDelete.nama}" telah dihapus.`);
    setFeedToDelete(null);
  };

  const handleToggleActive = (id: string) => {
    const updated = list.map((item) =>
      item.id === id ? { ...item, isActive: !item.isActive } : item
    );
    setList(updated);
    onSaveMasterPakan(updated, categoryList);
  };

  const handleMoveOrder = (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= list.length) return;

    const updated = [...list];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;

    const reordered = updated.map((item, idx) => ({ ...item, urutan: idx + 1 }));
    setList(reordered);
    onSaveMasterPakan(reordered, categoryList);
  };

  const handleResetFeedsToDefault = () => {
    setList(defaultMasterFeedTypes);
    onSaveMasterPakan(defaultMasterFeedTypes, categoryList);
    setIsResetFeedConfirmOpen(false);
    showNotification('Master data pakan berhasil direset ke standar pabrik JAPFA!');
  };

  const handleBulkImport = () => {
    if (!bulkText.trim()) {
      showNotification('Masukkan atau tempel daftar nama pakan terlebih dahulu!');
      return;
    }

    const rawLines = bulkText
      .split(/[\n,;]/)
      .map((s) => s.trim())
      .filter(Boolean);

    if (rawLines.length === 0) {
      showNotification('Tidak ada nama pakan yang valid terdeteksi.');
      return;
    }

    const currentNames = new Set(list.map((i) => i.nama.toLowerCase()));
    const newItems: MasterJenisPakan[] = [];

    rawLines.forEach((name, i) => {
      if (!currentNames.has(name.toLowerCase())) {
        currentNames.add(name.toLowerCase());
        newItems.push({
          id: `pakan_bulk_${Date.now()}_${i}`,
          nama: name,
          kategori: categoryList[0] || 'Broiler Starter',
          beratKemasan: 50,
          isActive: true,
          urutan: list.length + newItems.length + 1,
        });
      }
    });

    if (newItems.length === 0) {
      showNotification('Semua pakan yang ditempel sudah ada dalam daftar.');
    } else {
      const combined = [...list, ...newItems];
      setList(combined);
      onSaveMasterPakan(combined, categoryList);
      setBulkText('');
      setShowBulkPaste(false);
      showNotification(`Berhasil menambahkan ${newItems.length} jenis pakan baru dari teks!`);
    }
  };

  const handleApplyToTable = () => {
    if (!onApplyToActiveReport) return;
    const activeNames = list.filter((f) => f.isActive).map((f) => f.nama);
    onApplyToActiveReport(activeNames);
    showNotification(
      `Daftar ${activeNames.length} jenis pakan aktif berhasil diterapkan ke tabel laporan hari ini!`
    );
  };

  // Safe early return strictly AFTER all Hooks and derived states
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto print:hidden">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white p-4 sm:p-5 flex items-center justify-between border-b border-blue-800/40 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600/30 border border-blue-400/40 rounded-xl text-blue-300">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-wide uppercase">
                  Master Data Jenis Pakan Ternak & Kategori
                </h2>
                <span className="bg-blue-500/30 text-blue-200 border border-blue-400/30 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  Unit GBJ JAPFA
                </span>
              </div>
              <p className="text-xs text-blue-200/80 font-medium mt-0.5">
                Kelola nama jenis pakan, kode sak, dan edit/hapus/simpan kategori ternak untuk Formulir Fisik FG WH
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
            title="Tutup Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation: Pakan vs Kategori */}
        <div className="bg-slate-100 border-b border-slate-200 px-4 pt-3 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('pakan')}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-t-xl transition-all border-t border-x cursor-pointer ${
                activeTab === 'pakan'
                  ? 'bg-white text-blue-900 border-slate-300 shadow-xs'
                  : 'bg-slate-200/70 hover:bg-slate-200 text-slate-600 border-transparent'
              }`}
            >
              <Package className="w-4 h-4 text-blue-600" />
              <span>Jenis Pakan Ternak</span>
              <span
                className={`text-[10px] font-black px-1.5 py-0.2 rounded-full ${
                  activeTab === 'pakan'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-slate-300 text-slate-700'
                }`}
              >
                {list.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('kategori')}
              className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-t-xl transition-all border-t border-x cursor-pointer ${
                activeTab === 'kategori'
                  ? 'bg-white text-purple-900 border-slate-300 shadow-xs'
                  : 'bg-slate-200/70 hover:bg-slate-200 text-slate-600 border-transparent'
              }`}
            >
              <Tag className="w-4 h-4 text-purple-600" />
              <span>Kelola Kategori Pakan</span>
              <span
                className={`text-[10px] font-black px-1.5 py-0.2 rounded-full ${
                  activeTab === 'kategori'
                    ? 'bg-purple-100 text-purple-800'
                    : 'bg-slate-300 text-slate-700'
                }`}
              >
                {categoryList.length}
              </span>
            </button>
          </div>

          <div className="text-[11px] text-slate-500 hidden sm:block">
            {activeTab === 'pakan' ? (
              <span>Daftar pakan aktif: <strong className="text-emerald-700">{activeFeedsCount}</strong></span>
            ) : (
              <span>Kategori tersimpan: <strong className="text-purple-700">{categoryList.length}</strong></span>
            )}
          </div>
        </div>

        {/* Notification Toast */}
        {notification && (
          <div className="bg-emerald-600 text-white text-xs font-bold px-4 py-2 flex items-center justify-between shadow-xs animate-in slide-in-from-top-1 flex-shrink-0">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              <span>{notification}</span>
            </div>
            <button
              type="button"
              onClick={() => setNotification(null)}
              className="text-white/80 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* ==================== TAB 1: JENIS PAKAN TERNAK ==================== */}
        {activeTab === 'pakan' && (
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Controls & Quick Action Bar */}
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2 flex-1">
                <div className="relative flex-1 max-w-sm">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Cari jenis pakan / kode..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none font-medium"
                  />
                </div>

                <div className="flex items-center gap-1">
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="py-1.5 px-2.5 text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none font-medium text-slate-700 max-w-[160px]"
                  >
                    <option value="Semua Kategori">Semua Kategori</option>
                    {categoryList.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat} ({feedCountByCategory[cat] || 0})
                      </option>
                    ))}
                  </select>

                  <button
                    type="button"
                    onClick={() => setActiveTab('kategori')}
                    className="px-2 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 border border-purple-300 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                    title="Buka menu Kelola Kategori (Edit, Hapus, Tambah Kategori)"
                  >
                    <Tag className="w-3.5 h-3.5" />
                    <span className="hidden md:inline">Edit Kategori</span>
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {!showAddForm && (
                  <button
                    type="button"
                    onClick={handleStartAdd}
                    className="px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambah Pakan</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    setShowBulkPaste(!showBulkPaste);
                    setShowAddForm(false);
                  }}
                  className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
                  title="Tempel daftar nama pakan sekaligus (Bulk Paste)"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Impor Cepat</span>
                </button>

                {onApplyToActiveReport && (
                  <button
                    type="button"
                    onClick={handleApplyToTable}
                    className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
                    title="Terapkan urutan pakan master ini ke baris tabel laporan petugas hari ini"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>Terapkan ke Tabel</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setIsResetFeedConfirmOpen(true)}
                  className="p-1.5 bg-slate-200 hover:bg-rose-100 hover:text-rose-700 text-slate-600 rounded-lg text-xs font-bold cursor-pointer transition-colors"
                  title="Reset ke Standar JAPFA (16 Jenis Pakan)"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Bulk Paste Area */}
            {showBulkPaste && (
              <div className="p-4 bg-blue-50/70 border-b border-blue-200 flex flex-col gap-2 animate-in slide-in-from-top-2 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-blue-900 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                    Tempel Nama Pakan Sekaligus (Baris per baris atau dipisah koma):
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowBulkPaste(false)}
                    className="text-xs text-slate-500 hover:text-slate-800 cursor-pointer"
                  >
                    Tutup
                  </button>
                </div>
                <textarea
                  rows={3}
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  placeholder="Contoh:&#10;Parli&#10;Par DOC&#10;SB 10&#10;KUK SUPRA"
                  className="w-full p-2 text-xs border border-blue-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 font-mono"
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setShowBulkPaste(false)}
                    className="px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-200 rounded-md cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={handleBulkImport}
                    className="px-3 py-1 text-xs font-bold bg-blue-700 hover:bg-blue-800 text-white rounded-md flex items-center gap-1 cursor-pointer"
                  >
                    <Check className="w-3 h-3" />
                    <span>Tambahkan ke Master</span>
                  </button>
                </div>
              </div>
            )}

            {/* Add / Edit Form Modal Segment */}
            {showAddForm && (
              <form
                onSubmit={handleSaveForm}
                className="p-4 bg-amber-50/60 border-b border-amber-200 flex flex-col gap-3 flex-shrink-0"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-amber-950 flex items-center gap-1.5 uppercase tracking-wide">
                    <Package className="w-4 h-4 text-amber-700" />
                    {editingId ? 'Edit Data Jenis Pakan' : 'Tambah Jenis Pakan Baru'}
                  </span>
                  <button
                    type="button"
                    onClick={resetForm}
                    className="text-slate-500 hover:text-slate-800 text-xs font-bold cursor-pointer"
                  >
                    Batal
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                  {/* Nama Pakan */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-700 uppercase">
                      Nama Jenis Pakan: <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formNama}
                      onChange={(e) => setFormNama(e.target.value)}
                      placeholder="e.g. Parli, SB 10"
                      className="w-full px-2.5 py-1 text-xs font-bold border border-slate-300 rounded-md bg-white focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  {/* Kode Pakan */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-700 uppercase">
                      Kode Kemasan / Sak:
                    </label>
                    <input
                      type="text"
                      value={formKode}
                      onChange={(e) => setFormKode(e.target.value)}
                      placeholder="e.g. PRL, SB10"
                      className="w-full px-2.5 py-1 text-xs font-bold uppercase border border-slate-300 rounded-md bg-white focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  {/* Kategori */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-black text-slate-700 uppercase">
                        Kategori Ternak:
                      </label>
                      <button
                        type="button"
                        onClick={() => setActiveTab('kategori')}
                        className="text-[10px] text-purple-700 font-bold hover:underline cursor-pointer"
                      >
                        + Kelola Kategori
                      </button>
                    </div>
                    <select
                      value={formKategori}
                      onChange={(e) => setFormKategori(e.target.value)}
                      className="w-full px-2.5 py-1 text-xs font-semibold border border-slate-300 rounded-md bg-white focus:ring-2 focus:ring-amber-500"
                    >
                      {categoryList.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Berat Kemasan (Kg) */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-700 uppercase">
                      Berat Kemasan (Kg/Sak):
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={formBerat}
                      onChange={(e) => setFormBerat(parseFloat(e.target.value) || 50)}
                      className="w-full px-2.5 py-1 text-xs font-bold border border-slate-300 rounded-md bg-white focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  {/* Keterangan */}
                  <div className="sm:col-span-2 space-y-1">
                    <label className="text-[10px] font-black text-slate-700 uppercase">
                      Keterangan / Spesifikasi:
                    </label>
                    <input
                      type="text"
                      value={formKeterangan}
                      onChange={(e) => setFormKeterangan(e.target.value)}
                      placeholder="e.g. Pakan crumble starter pedaging kualitas premium"
                      className="w-full px-2.5 py-1 text-xs border border-slate-300 rounded-md bg-white focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  {/* Status Aktif & Submit */}
                  <div className="sm:col-span-2 flex items-center justify-between pt-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formIsActive}
                        onChange={(e) => setFormIsActive(e.target.checked)}
                        className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
                      />
                      <span className="text-xs font-bold text-slate-800">
                        Aktif (Otomatis tampil di lembar laporan harian)
                      </span>
                    </label>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={resetForm}
                        className="px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-md cursor-pointer"
                      >
                        Batal
                      </button>
                      <button
                        type="submit"
                        className="px-4 py-1.5 bg-amber-700 hover:bg-amber-800 text-white text-xs font-black rounded-md flex items-center gap-1 shadow-xs cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>{editingId ? 'Simpan Perubahan' : 'Tambah ke Master'}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </form>
            )}

            {/* Master Feeds Table */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black text-slate-700 uppercase tracking-wide">
                  Daftar Master Jenis Pakan ({filteredList.length} dari {list.length} terdaftar &bull;{' '}
                  <span className="text-emerald-700">{activeFeedsCount} Aktif</span>)
                </span>
                <span className="text-[11px] text-slate-500">
                  Gunakan tanda panah &uarr;&darr; untuk menyusun urutan baris di lembar kerja
                </span>
              </div>

              <div className="border border-slate-300 rounded-xl overflow-hidden bg-white shadow-xs">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100 text-slate-800 border-b border-slate-300 text-[10px] font-black uppercase">
                      <th className="p-2.5 text-center w-12">No</th>
                      <th className="p-2.5 text-center w-20">Urutan</th>
                      <th className="p-2.5 w-24">Kode</th>
                      <th className="p-2.5 min-w-[160px]">Jenis Pakan Ternak</th>
                      <th className="p-2.5 w-36">Kategori</th>
                      <th className="p-2.5 text-center w-20">Kemasan</th>
                      <th className="p-2.5 min-w-[160px]">Keterangan</th>
                      <th className="p-2.5 text-center w-24">Status</th>
                      <th className="p-2.5 text-center w-24">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-sans">
                    {filteredList.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="p-8 text-center text-slate-400">
                          <AlertCircle className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                          <p className="font-semibold text-xs">
                            Tidak ada jenis pakan yang cocok dengan filter pencarian.
                          </p>
                        </td>
                      </tr>
                    ) : (
                      filteredList.map((item, index) => {
                        const originalIndex = list.findIndex((l) => l.id === item.id);
                        return (
                          <tr
                            key={item.id}
                            className={`hover:bg-slate-50 transition-colors ${
                              !item.isActive ? 'opacity-60 bg-slate-50/50' : ''
                            }`}
                          >
                            <td className="p-2 text-center font-bold text-slate-500">
                              {index + 1}
                            </td>

                            <td className="p-2 text-center">
                              <div className="flex items-center justify-center gap-0.5">
                                <button
                                  type="button"
                                  disabled={originalIndex === 0}
                                  onClick={() => handleMoveOrder(originalIndex, 'up')}
                                  className="p-1 hover:bg-slate-200 text-slate-600 rounded disabled:opacity-20 cursor-pointer"
                                  title="Pindahkan urutan ke atas"
                                >
                                  <ArrowUp className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  disabled={originalIndex === list.length - 1}
                                  onClick={() => handleMoveOrder(originalIndex, 'down')}
                                  className="p-1 hover:bg-slate-200 text-slate-600 rounded disabled:opacity-20 cursor-pointer"
                                  title="Pindahkan urutan ke bawah"
                                >
                                  <ArrowDown className="w-3 h-3" />
                                </button>
                              </div>
                            </td>

                            <td className="p-2">
                              <span className="font-mono text-[10px] font-extrabold bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded border border-slate-300">
                                {item.kode || '-'}
                              </span>
                            </td>

                            <td className="p-2">
                              <span className="font-black text-slate-900 text-xs uppercase tracking-wide">
                                {item.nama}
                              </span>
                            </td>

                            <td className="p-2">
                              <span className="text-[11px] font-bold text-purple-800 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-full inline-block">
                                {item.kategori || 'Umum'}
                              </span>
                            </td>

                            <td className="p-2 text-center font-bold text-slate-700">
                              {item.beratKemasan || 50} kg
                            </td>

                            <td
                              className="p-2 text-[11px] text-slate-500 truncate max-w-[200px]"
                              title={item.keterangan}
                            >
                              {item.keterangan || '-'}
                            </td>

                            <td className="p-2 text-center">
                              <button
                                type="button"
                                onClick={() => handleToggleActive(item.id)}
                                className={`px-2 py-0.5 text-[10px] font-black rounded-full border cursor-pointer transition-colors ${
                                  item.isActive
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100'
                                    : 'bg-slate-100 text-slate-500 border-slate-300 hover:bg-slate-200'
                                }`}
                              >
                                {item.isActive ? 'Aktif' : 'Non-Aktif'}
                              </button>
                            </td>

                            <td className="p-2 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleStartEdit(item)}
                                  className="p-1 hover:bg-blue-100 text-blue-700 rounded transition-colors cursor-pointer"
                                  title="Edit Jenis Pakan"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setFeedToDelete(item)}
                                  className="p-1 hover:bg-rose-100 text-rose-600 rounded transition-colors cursor-pointer"
                                  title="Hapus Jenis Pakan"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ==================== TAB 2: KELOLA KATEGORI PAKAN ==================== */}
        {activeTab === 'kategori' && (
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Top Toolbar for Categories */}
            <div className="p-4 bg-purple-50/50 border-b border-purple-200 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-2 flex-1 max-w-sm">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={categorySearchTerm}
                    onChange={(e) => setCategorySearchTerm(e.target.value)}
                    placeholder="Cari nama kategori pakan..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-purple-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none font-medium"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {!showAddCategoryForm && (
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddCategoryForm(true);
                      setEditingCategory(null);
                    }}
                    className="px-3.5 py-1.5 bg-purple-700 hover:bg-purple-800 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer transition-colors"
                  >
                    <FolderPlus className="w-4 h-4" />
                    <span>Tambah Kategori Baru</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setIsResetCategoryConfirmOpen(true)}
                  className="px-2.5 py-1.5 bg-white hover:bg-rose-50 text-slate-700 hover:text-rose-700 border border-slate-300 hover:border-rose-300 rounded-lg text-xs font-bold cursor-pointer transition-colors flex items-center gap-1"
                  title="Kembalikan daftar kategori ke standar 17 kategori JAPFA"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Kategori Standar</span>
                </button>
              </div>
            </div>

            {/* Add New Category Banner Form */}
            {showAddCategoryForm && (
              <form
                onSubmit={handleAddCategory}
                className="p-4 bg-purple-100/70 border-b border-purple-300 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between animate-in slide-in-from-top-2 flex-shrink-0"
              >
                <div className="flex items-center gap-2 flex-1">
                  <div className="w-8 h-8 rounded-lg bg-purple-700 text-white flex items-center justify-center flex-shrink-0">
                    <FolderPlus className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <label className="text-[10px] font-black text-purple-950 uppercase block mb-0.5">
                      Nama Kategori Baru: <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      autoFocus
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      placeholder="Contoh: Ruminansia Sapi, Unggas Petelur Bebek, Pakan Puyuh"
                      className="w-full px-3 py-1.5 text-xs font-bold border border-purple-400 rounded-lg bg-white focus:ring-2 focus:ring-purple-600"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 justify-end sm:pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddCategoryForm(false);
                      setNewCategoryName('');
                    }}
                    className="px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-purple-200/80 rounded-lg cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Simpan Kategori</span>
                  </button>
                </div>
              </form>
            )}

            {/* Edit Category Modal Segment */}
            {editingCategory && (
              <form
                onSubmit={handleSaveEditCategory}
                className="p-4 bg-amber-50 border-b border-amber-300 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between animate-in slide-in-from-top-2 flex-shrink-0"
              >
                <div className="flex items-center gap-2 flex-1">
                  <div className="w-8 h-8 rounded-lg bg-amber-600 text-white flex items-center justify-center flex-shrink-0">
                    <Edit3 className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-black text-amber-950 uppercase block mb-0.5">
                        Edit Nama Kategori:
                      </label>
                      <span className="text-[10px] text-amber-800 font-semibold">
                        Semua {feedCountByCategory[editingCategory.originalName] || 0} pakan terkait akan otomatis diperbarui
                      </span>
                    </div>
                    <input
                      type="text"
                      required
                      autoFocus
                      value={editingCategory.newName}
                      onChange={(e) =>
                        setEditingCategory({
                          ...editingCategory,
                          newName: e.target.value,
                        })
                      }
                      className="w-full px-3 py-1.5 text-xs font-bold border border-amber-400 rounded-lg bg-white focus:ring-2 focus:ring-amber-600"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 justify-end sm:pt-4">
                  <button
                    type="button"
                    onClick={() => setEditingCategory(null)}
                    className="px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-amber-200/80 rounded-lg cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-amber-700 hover:bg-amber-800 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Simpan Perubahan Kategori</span>
                  </button>
                </div>
              </form>
            )}

            {/* Categories Table */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                  <FolderTree className="w-4 h-4 text-purple-600" />
                  Daftar Kategori Pakan Ternak ({filteredCategories.length} dari {categoryList.length} terdaftar)
                </span>
                <span className="text-[11px] text-slate-500">
                  Mengedit atau menghapus kategori akan otomatis menyesuaikan pakan terkait
                </span>
              </div>

              <div className="border border-slate-300 rounded-xl overflow-hidden bg-white shadow-xs">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-purple-100/70 text-purple-950 border-b border-purple-300 text-[10px] font-black uppercase">
                      <th className="p-2.5 text-center w-12">No</th>
                      <th className="p-2.5 min-w-[200px]">Nama Kategori Ternak</th>
                      <th className="p-2.5 text-center w-32">Jumlah Pakan Terkait</th>
                      <th className="p-2.5 min-w-[220px]">Contoh Jenis Pakan di Kategori Ini</th>
                      <th className="p-2.5 text-center w-28">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 font-sans">
                    {filteredCategories.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-slate-400">
                          <AlertCircle className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                          <p className="font-semibold text-xs">
                            Tidak ada kategori yang cocok dengan kata kunci pencarian.
                          </p>
                        </td>
                      </tr>
                    ) : (
                      filteredCategories.map((cat, index) => {
                        const count = feedCountByCategory[cat] || 0;
                        const matchingFeeds = list.filter(
                          (item) => item.kategori && item.kategori.trim().toLowerCase() === cat.toLowerCase()
                        );

                        return (
                          <tr key={cat} className="hover:bg-purple-50/40 transition-colors">
                            <td className="p-2.5 text-center font-bold text-slate-500">
                              {index + 1}
                            </td>

                            <td className="p-2.5">
                              <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-purple-600 flex-shrink-0"></span>
                                <span className="font-bold text-slate-900 text-xs">
                                  {cat}
                                </span>
                              </div>
                            </td>

                            <td className="p-2.5 text-center">
                              <span
                                className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black border ${
                                  count > 0
                                    ? 'bg-purple-100 text-purple-900 border-purple-300'
                                    : 'bg-slate-100 text-slate-500 border-slate-300'
                                }`}
                              >
                                {count} Jenis Pakan
                              </span>
                            </td>

                            <td className="p-2.5">
                              {matchingFeeds.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {matchingFeeds.slice(0, 4).map((f) => (
                                    <span
                                      key={f.id}
                                      className="text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-200 px-1.5 py-0.2 rounded"
                                    >
                                      {f.nama}
                                    </span>
                                  ))}
                                  {matchingFeeds.length > 4 && (
                                    <span className="text-[10px] text-slate-500 font-semibold">
                                      +{matchingFeeds.length - 4} lainnya
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-[11px] text-slate-400 italic">
                                  Belum ada pakan di kategori ini
                                </span>
                              )}
                            </td>

                            <td className="p-2.5 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleStartEditCategory(cat)}
                                  className="p-1.5 hover:bg-amber-100 text-amber-700 rounded-lg transition-colors cursor-pointer"
                                  title={`Edit nama kategori "${cat}"`}
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handlePromptDeleteCategory(cat)}
                                  className="p-1.5 hover:bg-rose-100 text-rose-600 rounded-lg transition-colors cursor-pointer"
                                  title={`Hapus kategori "${cat}"`}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div className="p-4 bg-slate-100 border-t border-slate-200 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-600 font-medium">
            <Package className="w-4 h-4 text-blue-600 flex-shrink-0" />
            <span className="truncate">
              Perubahan master data pakan & kategori otomatis tersimpan ke Pengaturan & Firebase Cloud.
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer"
            >
              Selesai & Tutup
            </button>
          </div>
        </div>
      </div>

      {/* ================= IN-APP DIALOGS (Safe for Iframe) ================= */}

      {/* 1. Category Delete Confirmation Dialog */}
      {categoryToDelete && (
        <div
          className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setCategoryToDelete(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl border border-rose-200 max-w-md w-full p-5 flex flex-col gap-4 animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-black text-slate-900">
                  Hapus Kategori "{categoryToDelete.name}"?
                </h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  {categoryToDelete.affectedFeeds.length > 0 ? (
                    <span>
                      Kategori ini saat ini digunakan oleh{' '}
                      <strong>{categoryToDelete.affectedFeeds.length} jenis pakan</strong>. Pilih kategori pengganti agar pakan tersebut tetap terorganisir rapi.
                    </span>
                  ) : (
                    <span>
                      Kategori ini tidak digunakan oleh pakan manapun. Anda yakin ingin menghapusnya secara permanen?
                    </span>
                  )}
                </p>
              </div>
            </div>

            {categoryToDelete.affectedFeeds.length > 0 && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-2">
                <div className="text-[11px] font-bold text-rose-950">
                  Pakan yang terpengaruh ({categoryToDelete.affectedFeeds.length}):
                </div>
                <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                  {categoryToDelete.affectedFeeds.map((f) => (
                    <span
                      key={f.id}
                      className="text-[10px] font-bold bg-white text-rose-900 border border-rose-300 px-1.5 py-0.5 rounded"
                    >
                      {f.nama}
                    </span>
                  ))}
                </div>

                <div className="pt-2">
                  <label className="text-[11px] font-black text-slate-800 block mb-1">
                    Alihkan ke Kategori Pengganti:
                  </label>
                  <select
                    value={categoryToDelete.replacementCategory}
                    onChange={(e) =>
                      setCategoryToDelete({
                        ...categoryToDelete,
                        replacementCategory: e.target.value,
                      })
                    }
                    className="w-full text-xs font-bold p-2 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500"
                  >
                    {categoryList
                      .filter((c) => c !== categoryToDelete.name)
                      .map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    <option value="Lainnya">Lainnya</option>
                    <option value="Umum">Umum</option>
                  </select>
                </div>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setCategoryToDelete(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteCategory}
                className="px-4 py-2 text-xs font-black bg-rose-600 hover:bg-rose-700 text-white rounded-lg shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus Kategori</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Feed Delete Confirmation Dialog */}
      {feedToDelete && (
        <div
          className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setFeedToDelete(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl border border-rose-200 max-w-sm w-full p-5 flex flex-col gap-4 animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-black text-slate-900">
                  Hapus Pakan "{feedToDelete.nama}"?
                </h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Pakan ini akan dihapus dari daftar master pakan ternak.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setFeedToDelete(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteFeed}
                className="px-4 py-2 text-xs font-black bg-rose-600 hover:bg-rose-700 text-white rounded-lg shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Hapus Pakan</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Reset Categories to Default Confirmation */}
      {isResetCategoryConfirmOpen && (
        <div
          className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setIsResetCategoryConfirmOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl border border-amber-200 max-w-sm w-full p-5 flex flex-col gap-4 animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-black text-slate-900">
                  Reset Kategori ke Standar JAPFA?
                </h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Semua kategori kustom akan dikembalikan ke susunan 17 kategori standar pabrik JAPFA.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setIsResetCategoryConfirmOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleResetCategoriesToDefault}
                className="px-4 py-2 text-xs font-black bg-amber-600 hover:bg-amber-700 text-white rounded-lg shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Kategori</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Reset Feeds to Default Confirmation */}
      {isResetFeedConfirmOpen && (
        <div
          className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
          onClick={() => setIsResetFeedConfirmOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl border border-amber-200 max-w-sm w-full p-5 flex flex-col gap-4 animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-black text-slate-900">
                  Reset Master Pakan ke Standar?
                </h3>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Mengembalikan master data pakan ke 16 jenis pakan standar JAPFA (Parli, Par DOC, SB 10, dll).
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setIsResetFeedConfirmOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleResetFeedsToDefault}
                className="px-4 py-2 text-xs font-black bg-amber-600 hover:bg-amber-700 text-white rounded-lg shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Pakan</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
