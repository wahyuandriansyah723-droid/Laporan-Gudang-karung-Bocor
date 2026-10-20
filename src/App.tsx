import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Navbar } from './components/Navbar';
import { MainTableView } from './components/MainTableView';
import { InputDataForm } from './components/InputDataForm';
import { AnalyticsView } from './components/AnalyticsView';
import { DataLogView } from './components/DataLogView';
import { SettingsView } from './components/SettingsView';
import { PetugasDashboardView } from './components/PetugasDashboardView';
import { FirebaseMonitor } from './components/FirebaseMonitor';
import { ExportExcelModal } from './components/ExportExcelModal';
import { MonthReport, WarehouseSettings, LeakageRecord } from './types';
import { initialMonthReports, defaultSettings, emptyMonthReports, createEmptyMonthReports } from './data/initialData';
import { exportReportsToExcel } from './utils/excelExport';
import { cacheService } from './firebase/cacheService';
import { firestoreService } from './firebase/firestoreService';
import { connectionManager } from './firebase/connectionManager';

export default function App() {
  // Persistence state with synchronous initial value for 0ms paint
  const [reports, setReports] = useState<MonthReport[]>(() => {
    const saved = localStorage.getItem('karung_bocor_reports');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return emptyMonthReports;
  });

  const [settings, setSettings] = useState<WarehouseSettings>(() => {
    const saved = localStorage.getItem('karung_bocor_settings');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return defaultSettings;
  });

  const [logs, setLogs] = useState<LeakageRecord[]>(() => {
    const saved = localStorage.getItem('karung_bocor_logs');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return [];
  });

  const [activeTab, setActiveTab] = useState<'table' | 'petugas' | 'input' | 'analytics' | 'log' | 'settings'>('petugas');
  const [isMonitorOpen, setIsMonitorOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportModalMonth, setExportModalMonth] = useState<number | undefined>(undefined);

  // References to keep latest values without re-triggering effects
  const reportsRef = useRef(reports);
  reportsRef.current = reports;

  // Undo & Redo History State for Excel Report (reports)
  const [reportsUndoStack, setReportsUndoStack] = useState<{
    reports: MonthReport[];
    description: string;
    timestamp: number;
  }[]>([]);
  const [reportsRedoStack, setReportsRedoStack] = useState<{
    reports: MonthReport[];
    description: string;
    timestamp: number;
  }[]>([]);
  const [undoNotice, setUndoNotice] = useState<{
    message: string;
    actionDesc: string;
    timestamp: number;
  } | null>(null);

  // Auto-dismiss undo notice after 10 seconds
  useEffect(() => {
    if (undoNotice) {
      const timer = setTimeout(() => {
        setUndoNotice(null);
      }, 10000);
      return () => clearTimeout(timer);
    }
  }, [undoNotice]);

  // Record snapshot of reports before mutation
  const recordReportsHistory = useCallback((description: string, customSnapshot?: MonthReport[]) => {
    const snapshot = customSnapshot || reportsRef.current;
    const cloned = JSON.parse(JSON.stringify(snapshot));
    setReportsUndoStack((prev) => {
      const next = [...prev, { reports: cloned, description, timestamp: Date.now() }];
      if (next.length > 50) return next.slice(next.length - 50);
      return next;
    });
    setReportsRedoStack([]); // clear redo stack on new action
  }, []);

  // Handler: Undo last Excel report change
  const handleUndoReports = useCallback(() => {
    setReportsUndoStack((prevUndo) => {
      if (prevUndo.length === 0) return prevUndo;
      const lastStep = prevUndo[prevUndo.length - 1];
      const newUndo = prevUndo.slice(0, prevUndo.length - 1);

      // Save current state into redo stack
      const currentSnapshot = JSON.parse(JSON.stringify(reportsRef.current));
      setReportsRedoStack((prevRedo) => [
        ...prevRedo,
        { reports: currentSnapshot, description: lastStep.description, timestamp: Date.now() },
      ]);

      // Restore reports state
      setReports(lastStep.reports);
      cacheService.set('karung_bocor_reports', lastStep.reports);
      firestoreService.batchSaveAllReports(lastStep.reports);

      setUndoNotice({
        message: `Perubahan "${lastStep.description}" berhasil di-undo! Data telah dikembalikan.`,
        actionDesc: lastStep.description,
        timestamp: Date.now(),
      });

      return newUndo;
    });
  }, []);

  // Handler: Redo Excel report change
  const handleRedoReports = useCallback(() => {
    setReportsRedoStack((prevRedo) => {
      if (prevRedo.length === 0) return prevRedo;
      const nextStep = prevRedo[prevRedo.length - 1];
      const newRedo = prevRedo.slice(0, prevRedo.length - 1);

      // Save current state into undo stack
      const currentSnapshot = JSON.parse(JSON.stringify(reportsRef.current));
      setReportsUndoStack((prevUndo) => [
        ...prevUndo,
        { reports: currentSnapshot, description: nextStep.description, timestamp: Date.now() },
      ]);

      // Apply redo state
      setReports(nextStep.reports);
      cacheService.set('karung_bocor_reports', nextStep.reports);
      firestoreService.batchSaveAllReports(nextStep.reports);

      setUndoNotice({
        message: `Perubahan "${nextStep.description}" berhasil di-redo!`,
        actionDesc: nextStep.description,
        timestamp: Date.now(),
      });

      return newRedo;
    });
  }, []);

  // Global Keyboard shortcuts: Ctrl+Z (Undo) and Ctrl+Y (Redo)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const isInput = target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);

      if (e.ctrlKey || e.metaKey) {
        if (e.key.toLowerCase() === 'z' && !e.shiftKey) {
          if (!isInput) {
            e.preventDefault();
            handleUndoReports();
          }
        } else if (e.key.toLowerCase() === 'y' || (e.key.toLowerCase() === 'z' && e.shiftKey)) {
          if (!isInput) {
            e.preventDefault();
            handleRedoReports();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndoReports, handleRedoReports]);

  // Single active listener lifecycle on mount
  useEffect(() => {
    // 1. Asynchronously check IndexedDB cache to get freshest offline data
    cacheService.get<MonthReport[]>('karung_bocor_reports', emptyMonthReports).then((cachedReports) => {
      if (cachedReports && cachedReports.length > 0) {
        setReports(cachedReports);
      }
    });

    cacheService.get<WarehouseSettings>('karung_bocor_settings', defaultSettings).then((cachedSettings) => {
      if (cachedSettings) {
        setSettings(cachedSettings);
      }
    });

    cacheService.get<LeakageRecord[]>('karung_bocor_logs', []).then((cachedLogs) => {
      if (cachedLogs) {
        setLogs(cachedLogs);
      }
    });

    // 2. Attach single Firestore real-time listeners with lifecycle cleanup
    const unsubReports = firestoreService.subscribeMonthlyReports((cloudReports) => {
      setReports(cloudReports);
    });

    const unsubSettings = firestoreService.subscribeSettings((cloudSettings) => {
      setSettings(cloudSettings);
    });

    const unsubLogs = firestoreService.subscribeLeakageLogs((cloudLogs) => {
      setLogs(cloudLogs);
    });

    return () => {
      unsubReports();
      unsubSettings();
      unsubLogs();
    };
  }, []);

  // Synchronize document.title dynamically when system name or warehouse changes
  useEffect(() => {
    if (settings.namaSistem) {
      document.title = `${settings.namaSistem} - ${settings.namaGudang}`;
    } else {
      document.title = `Sistem Karung Bocor - ${settings.namaGudang}`;
    }
  }, [settings.namaSistem, settings.namaGudang]);

  // Handler: update cell entry (Optimistic update + targeted single month debounced write)
  const handleUpdateEntry = (
    monthIndex: number,
    day: number,
    field: 'forklift' | 'pallet' | 'bocorProduksi',
    value: number
  ) => {
    const currentReport = reportsRef.current.find((r) => r.monthIndex === monthIndex);
    const prevVal = currentReport?.dailyEntries[day]?.[field] ?? 0;
    if (prevVal !== value) {
      const monthName = currentReport?.monthName || `Bulan ${monthIndex}`;
      recordReportsHistory(`Ubah ${field} Tgl ${day} ${monthName} (${prevVal} ➔ ${value})`);
    }

    let targetUpdatedReport: MonthReport | null = null;

    setReports((prev) => {
      const next = prev.map((r) => {
        if (r.monthIndex === monthIndex) {
          const currentEntry = r.dailyEntries[day] || { forklift: 0, pallet: 0, bocorProduksi: 0 };
          const updated: MonthReport = {
            ...r,
            dailyEntries: {
              ...r.dailyEntries,
              [day]: {
                ...currentEntry,
                [field]: value,
              },
            },
          };
          targetUpdatedReport = updated;
          return updated;
        }
        return r;
      });
      cacheService.set('karung_bocor_reports', next);
      return next;
    });

    if (targetUpdatedReport) {
      firestoreService.saveSingleMonthReport(targetUpdatedReport);
    }
  };

  // Handler: update Penjualan Kg per month (Targeted single month write)
  const handleUpdatePenjualanKg = (monthIndex: number, newPenjualanKg: number) => {
    const currentReport = reportsRef.current.find((r) => r.monthIndex === monthIndex);
    if (currentReport && currentReport.penjualanKg !== newPenjualanKg) {
      recordReportsHistory(`Ubah Penjualan Kg ${currentReport.monthName}`);
    }

    let targetUpdatedReport: MonthReport | null = null;

    setReports((prev) => {
      const next = prev.map((r) => {
        if (r.monthIndex === monthIndex) {
          const updated = { ...r, penjualanKg: newPenjualanKg };
          targetUpdatedReport = updated;
          return updated;
        }
        return r;
      });
      cacheService.set('karung_bocor_reports', next);
      return next;
    });

    if (targetUpdatedReport) {
      firestoreService.saveSingleMonthReport(targetUpdatedReport);
    }
  };

  // Handler: toggle cell status (red / yellow / normal)
  const handleToggleCellStatus = (
    monthIndex: number,
    day: number,
    statusType: 'red' | 'yellow' | 'normal'
  ) => {
    const currentReport = reportsRef.current.find((r) => r.monthIndex === monthIndex);
    const monthName = currentReport?.monthName || `Bulan ${monthIndex}`;
    recordReportsHistory(`Ubah Status Warna Tgl ${day} ${monthName}`);

    let targetUpdatedReport: MonthReport | null = null;

    setReports((prev) => {
      const next = prev.map((r) => {
        if (r.monthIndex === monthIndex) {
          const currentEntry = r.dailyEntries[day] || { forklift: 0, pallet: 0, bocorProduksi: 0 };
          const updated: MonthReport = {
            ...r,
            dailyEntries: {
              ...r.dailyEntries,
              [day]: {
                ...currentEntry,
                isRedDay: statusType === 'red',
                isYellowDay: statusType === 'yellow',
              },
            },
          };
          targetUpdatedReport = updated;
          return updated;
        }
        return r;
      });
      cacheService.set('karung_bocor_reports', next);
      return next;
    });

    if (targetUpdatedReport) {
      firestoreService.saveSingleMonthReport(targetUpdatedReport);
    }
  };

  // Handler: update cell status explicitly from form
  const handleUpdateCellStatusExplicit = (
    monthIndex: number,
    day: number,
    isRed: boolean,
    isYellow: boolean
  ) => {
    let targetUpdatedReport: MonthReport | null = null;

    setReports((prev) => {
      const next = prev.map((r) => {
        if (r.monthIndex === monthIndex) {
          const currentEntry = r.dailyEntries[day] || { forklift: 0, pallet: 0, bocorProduksi: 0 };
          const updated: MonthReport = {
            ...r,
            dailyEntries: {
              ...r.dailyEntries,
              [day]: {
                ...currentEntry,
                isRedDay: isRed,
                isYellowDay: isYellow,
              },
            },
          };
          targetUpdatedReport = updated;
          return updated;
        }
        return r;
      });
      cacheService.set('karung_bocor_reports', next);
      return next;
    });

    if (targetUpdatedReport) {
      firestoreService.saveSingleMonthReport(targetUpdatedReport);
    }
  };

  // Handler: sync petugas report directly into main monthly grid
  const handleSyncPetugasToMainReport = (
    monthIndex: number,
    day: number,
    forklift: number,
    pallet: number,
    bocorProduksi: number,
    logRecord?: Omit<LeakageRecord, 'id'>,
    isRedDay?: boolean
  ) => {
    if (logRecord) {
      const record: LeakageRecord = {
        ...logRecord,
        id: Date.now().toString(),
      };
      setLogs((prev) => {
        const next = [record, ...prev];
        cacheService.set('karung_bocor_logs', next);
        return next;
      });
      firestoreService.addLeakageLog(record);
    }

    let targetUpdatedReport: MonthReport | null = null;

    setReports((prev) => {
      const next = prev.map((r) => {
        if (r.monthIndex === monthIndex) {
          const currentEntry = r.dailyEntries[day] || { forklift: 0, pallet: 0, bocorProduksi: 0 };
          const updated: MonthReport = {
            ...r,
            dailyEntries: {
              ...r.dailyEntries,
              [day]: {
                ...currentEntry,
                forklift,
                pallet,
                bocorProduksi,
                isRedDay: isRedDay !== undefined ? isRedDay : currentEntry.isRedDay,
              },
            },
          };
          targetUpdatedReport = updated;
          return updated;
        }
        return r;
      });
      cacheService.set('karung_bocor_reports', next);
      return next;
    });

    if (targetUpdatedReport) {
      firestoreService.saveSingleMonthReport(targetUpdatedReport, 0);
    }
  };

  // Handler: batch update all 12 month reports (e.g. from Holiday Manager)
  const handleBatchUpdateAllReports = async (updatedReports: MonthReport[]) => {
    recordReportsHistory('Pembaruan Massal Kalender Libur Tabel Excel');
    setReports(updatedReports);
    reportsRef.current = updatedReports;
    await cacheService.set('karung_bocor_reports', updatedReports);
    await firestoreService.batchSaveAllReports(updatedReports);
  };

  // Handler: add new log entry
  const handleAddLogEntry = (newRecord: Omit<LeakageRecord, 'id'>) => {
    const record: LeakageRecord = {
      ...newRecord,
      id: Date.now().toString(),
    };

    setLogs((prev) => {
      const next = [record, ...prev];
      cacheService.set('karung_bocor_logs', next);
      return next;
    });
    firestoreService.addLeakageLog(record);

    let targetUpdatedReport: MonthReport | null = null;

    // Also update monthly grid data
    setReports((prev) => {
      const next = prev.map((r) => {
        if (r.monthIndex === newRecord.monthIndex) {
          const currentEntry = r.dailyEntries[newRecord.day] || { forklift: 0, pallet: 0, bocorProduksi: 0 };
          const updated: MonthReport = {
            ...r,
            dailyEntries: {
              ...r.dailyEntries,
              [newRecord.day]: {
                ...currentEntry,
                forklift: (currentEntry.forklift || 0) + newRecord.forklift,
                pallet: (currentEntry.pallet || 0) + newRecord.pallet,
                bocorProduksi: (currentEntry.bocorProduksi || 0) + newRecord.bocorProduksi,
              },
            },
          };
          targetUpdatedReport = updated;
          return updated;
        }
        return r;
      });
      cacheService.set('karung_bocor_reports', next);
      return next;
    });

    if (targetUpdatedReport) {
      firestoreService.saveSingleMonthReport(targetUpdatedReport);
    }
  };

  // Handler: update log entry (updates logs in state, cache & firestore, and synchronizes to reports if syncToReport)
  const handleUpdateLog = (
    updatedLog: LeakageRecord,
    syncToReport: boolean = true
  ) => {
    // 1. Update logs state & cache (update existing or prepend if new/synthetic)
    setLogs((prev) => {
      const exists = prev.some((item) => item.id === updatedLog.id);
      const next = exists
        ? prev.map((item) => (item.id === updatedLog.id ? updatedLog : item))
        : [updatedLog, ...prev];
      cacheService.set('karung_bocor_logs', next);
      return next;
    });
    // 2. Persist to Firestore
    firestoreService.updateLeakageLog(updatedLog);

    // 3. Synchronize to monthly report if requested
    if (syncToReport && updatedLog.monthIndex && updatedLog.day) {
      let targetUpdatedReport: MonthReport | null = null;
      setReports((prev) => {
        const next = prev.map((r) => {
          if (r.monthIndex === updatedLog.monthIndex) {
            const currentEntry = r.dailyEntries[updatedLog.day] || { forklift: 0, pallet: 0, bocorProduksi: 0 };
            const updated: MonthReport = {
              ...r,
              dailyEntries: {
                ...r.dailyEntries,
                [updatedLog.day]: {
                  ...currentEntry,
                  forklift: updatedLog.forklift,
                  pallet: updatedLog.pallet,
                  bocorProduksi: updatedLog.bocorProduksi,
                  isRedDay: updatedLog.isRedDay !== undefined ? updatedLog.isRedDay : currentEntry.isRedDay,
                  note: updatedLog.catatan || currentEntry.note,
                },
              },
            };
            targetUpdatedReport = updated;
            return updated;
          }
          return r;
        });
        cacheService.set('karung_bocor_reports', next);
        return next;
      });

      if (targetUpdatedReport) {
        firestoreService.saveSingleMonthReport(targetUpdatedReport, 0);
      }
    }
  };

  // Handler: delete log
  const handleDeleteLog = (
    id: string,
    monthIndex?: number,
    day?: number,
    syncToReport: boolean = false
  ) => {
    setLogs((prev) => {
      const next = prev.filter((l) => l.id !== id);
      cacheService.set('karung_bocor_logs', next);
      return next;
    });
    firestoreService.deleteLeakageLog(id);

    if (syncToReport && monthIndex && day) {
      let targetUpdatedReport: MonthReport | null = null;
      setReports((prev) => {
        const next = prev.map((r) => {
          if (r.monthIndex === monthIndex) {
            const currentEntry = r.dailyEntries[day] || {};
            const updated: MonthReport = {
              ...r,
              dailyEntries: {
                ...r.dailyEntries,
                [day]: {
                  ...currentEntry,
                  forklift: 0,
                  pallet: 0,
                  bocorProduksi: 0,
                },
              },
            };
            targetUpdatedReport = updated;
            return updated;
          }
          return r;
        });
        cacheService.set('karung_bocor_reports', next);
        return next;
      });

      if (targetUpdatedReport) {
        firestoreService.saveSingleMonthReport(targetUpdatedReport, 0);
      }
    }
  };

  // Handler: batch update logs (e.g. after consolidating multiple duplicate dates into 1 entry)
  const handleBatchUpdateLogs = async (updatedLogs: LeakageRecord[]) => {
    setLogs(updatedLogs);
    await cacheService.set('karung_bocor_logs', updatedLogs);
    await firestoreService.batchSaveLeakageLogs(updatedLogs);
  };

  // Handler: explicitly save all current logs to Firestore & Cache
  const handleSaveAllLogs = async () => {
    await cacheService.set('karung_bocor_logs', logs);
    await firestoreService.batchSaveLeakageLogs(logs);
  };

  // Handler: clear single month entries (Targeted single month write with Undo support)
  const handleClearMonthReport = (monthIndex: number) => {
    const currentReport = reportsRef.current.find((r) => r.monthIndex === monthIndex);
    const monthName = currentReport?.monthName || `Bulan ${monthIndex}`;
    recordReportsHistory(`Kosongkan Laporan Bulan ${monthName}`);
    setUndoNotice({
      message: `Seluruh data kebocoran di bulan ${monthName} telah dikosongkan. Klik "Undo" jika ingin membatalkan.`,
      actionDesc: `Kosongkan Laporan Bulan ${monthName}`,
      timestamp: Date.now(),
    });

    let targetUpdatedReport: MonthReport | null = null;

    setReports((prev) => {
      const next = prev.map((r) => {
        if (r.monthIndex === monthIndex) {
          const clearedDaily: Record<number, any> = {};
          Object.keys(r.dailyEntries).forEach((dayKey) => {
            const d = parseInt(dayKey, 10);
            clearedDaily[d] = {
              ...r.dailyEntries[d],
              forklift: 0,
              pallet: 0,
              bocorProduksi: 0,
            };
          });
          const updated = {
            ...r,
            dailyEntries: clearedDaily,
          };
          targetUpdatedReport = updated;
          return updated;
        }
        return r;
      });
      cacheService.set('karung_bocor_reports', next);
      return next;
    });

    if (targetUpdatedReport) {
      firestoreService.saveSingleMonthReport(targetUpdatedReport);
    }
  };

  // Handler: clear single day entries (with Undo support)
  const handleClearDayReport = (monthIndex: number, day: number) => {
    const currentReport = reportsRef.current.find((r) => r.monthIndex === monthIndex);
    const monthName = currentReport?.monthName || `Bulan ${monthIndex}`;
    const dayEntry = currentReport?.dailyEntries[day];
    const totalBocor = (dayEntry?.forklift || 0) + (dayEntry?.pallet || 0) + (dayEntry?.bocorProduksi || 0);

    recordReportsHistory(`Hapus Data Tanggal ${day} ${monthName}${totalBocor > 0 ? ` (${totalBocor} krg)` : ''}`);
    setUndoNotice({
      message: `Data kebocoran Tanggal ${day} ${monthName} telah dihapus${totalBocor > 0 ? ` (${totalBocor} krg)` : ''}. Klik "Undo" untuk mengembalikan.`,
      actionDesc: `Hapus Data Tanggal ${day} ${monthName}`,
      timestamp: Date.now(),
    });

    let targetUpdatedReport: MonthReport | null = null;

    setReports((prev) => {
      const next = prev.map((r) => {
        if (r.monthIndex === monthIndex) {
          const currentEntry = r.dailyEntries[day] || {};
          const updated = {
            ...r,
            dailyEntries: {
              ...r.dailyEntries,
              [day]: {
                ...currentEntry,
                forklift: 0,
                pallet: 0,
                bocorProduksi: 0,
              },
            },
          };
          targetUpdatedReport = updated;
          return updated;
        }
        return r;
      });
      cacheService.set('karung_bocor_reports', next);
      return next;
    });

    if (targetUpdatedReport) {
      firestoreService.saveSingleMonthReport(targetUpdatedReport);
    }
  };

  // Handler: batch update day entries (with Undo support)
  const handleBatchUpdateDay = (
    monthIndex: number,
    day: number,
    forklift: number,
    pallet: number,
    bocorProduksi: number,
    isRedDay?: boolean
  ) => {
    const currentReport = reportsRef.current.find((r) => r.monthIndex === monthIndex);
    const monthName = currentReport?.monthName || `Bulan ${monthIndex}`;
    recordReportsHistory(`Edit Input Harian Tanggal ${day} ${monthName}`);

    let targetUpdatedReport: MonthReport | null = null;

    setReports((prev) => {
      const next = prev.map((r) => {
        if (r.monthIndex === monthIndex) {
          const currentEntry = r.dailyEntries[day] || {};
          const updated: MonthReport = {
            ...r,
            dailyEntries: {
              ...r.dailyEntries,
              [day]: {
                ...currentEntry,
                forklift,
                pallet,
                bocorProduksi,
                isRedDay: isRedDay !== undefined ? isRedDay : currentEntry.isRedDay,
              },
            },
          };
          targetUpdatedReport = updated;
          return updated;
        }
        return r;
      });
      cacheService.set('karung_bocor_reports', next);
      return next;
    });

    if (targetUpdatedReport) {
      firestoreService.saveSingleMonthReport(targetUpdatedReport);
    }
  };

  // Handler: reset data to initial photo sample (Atomic batch commit)
  const handleResetData = () => {
    recordReportsHistory('Reset Data ke Sampel Foto');
    setReports(initialMonthReports);
    setSettings(defaultSettings);
    firestoreService.batchSaveAllReports(initialMonthReports);
    firestoreService.saveSettings(defaultSettings);
  };

  const handleClearReports = () => {
    recordReportsHistory('Kosongkan Seluruh Tabel Excel (12 Bulan)');
    setUndoNotice({
      message: `Seluruh tabel Excel telah dikosongkan. Klik "Undo" jika ingin mengembalikan seluruh isi tabel.`,
      actionDesc: 'Kosongkan Seluruh Tabel Excel',
      timestamp: Date.now(),
    });
    const empty = createEmptyMonthReports();
    setReports(empty);
    setLogs([]);
    firestoreService.batchSaveAllReports(empty);
    cacheService.set('karung_bocor_logs', []);
  };

  const handleLoadSampleReports = () => {
    recordReportsHistory('Muat Ulang Contoh Data Demo');
    setReports(initialMonthReports);
    firestoreService.batchSaveAllReports(initialMonthReports);
  };

  const handleSaveSettings = (newSettings: WarehouseSettings) => {
    setSettings(newSettings);
    firestoreService.saveSettings(newSettings);
  };

  // Handler: explicitly save single month report to Firestore and Cache
  const handleSaveMonthReport = async (monthIndex: number) => {
    const currentReports = reportsRef.current;
    const targetReport = currentReports.find((r) => r.monthIndex === monthIndex);
    if (targetReport) {
      await cacheService.set('karung_bocor_reports', currentReports);
      await firestoreService.saveSingleMonthReport(targetReport, 0);
    }
  };

  const handleOpenExportModal = (monthIndex?: number) => {
    setExportModalMonth(monthIndex);
    setIsExportModalOpen(true);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans antialiased">
      {/* Top Navbar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        reports={reports}
        settings={settings}
        onExportExcel={() => handleOpenExportModal()}
        onPrint={handlePrint}
        onResetData={handleResetData}
        onOpenMonitor={() => setIsMonitorOpen(true)}
      />

      {/* Main Body */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'petugas' && (
          <PetugasDashboardView
            settings={settings}
            reports={reports}
            onUpdateSettings={handleSaveSettings}
            onSaveToMainLog={handleAddLogEntry}
            onSyncToMainReport={handleSyncPetugasToMainReport}
            onNavigateToMainTable={() => setActiveTab('table')}
          />
        )}

        {activeTab === 'table' && (
          <MainTableView
            reports={reports}
            settings={settings}
            onUpdateEntry={handleUpdateEntry}
            onUpdatePenjualanKg={handleUpdatePenjualanKg}
            onToggleCellStatus={handleToggleCellStatus}
            onClearReports={handleClearReports}
            onLoadSampleReports={handleLoadSampleReports}
            onClearMonthReport={handleClearMonthReport}
            onClearDayReport={handleClearDayReport}
            onBatchUpdateDay={handleBatchUpdateDay}
            onSaveMonthReport={handleSaveMonthReport}
            onBatchUpdateAllReports={handleBatchUpdateAllReports}
            onOpenExportModal={handleOpenExportModal}
            canUndo={reportsUndoStack.length > 0}
            canRedo={reportsRedoStack.length > 0}
            onUndo={handleUndoReports}
            onRedo={handleRedoReports}
            undoCount={reportsUndoStack.length}
            redoCount={reportsRedoStack.length}
            lastUndoDescription={reportsUndoStack[reportsUndoStack.length - 1]?.description}
            lastRedoDescription={reportsRedoStack[reportsRedoStack.length - 1]?.description}
            undoHistoryList={reportsUndoStack.map((s) => ({ description: s.description, timestamp: s.timestamp }))}
            undoNotice={undoNotice}
            onDismissUndoNotice={() => setUndoNotice(null)}
          />
        )}

        {activeTab === 'input' && (
          <InputDataForm
            reports={reports}
            settings={settings}
            logs={logs}
            onAddLogEntry={handleAddLogEntry}
            onUpdateCellStatus={handleUpdateCellStatusExplicit}
            onNavigateToLog={() => setActiveTab('log')}
            onNavigateToTable={() => setActiveTab('table')}
          />
        )}

        {activeTab === 'analytics' && (
          <AnalyticsView reports={reports} settings={settings} />
        )}

        {activeTab === 'log' && (
          <DataLogView
            logs={logs}
            reports={reports}
            settings={settings}
            onAddLog={handleAddLogEntry}
            onUpdateLog={handleUpdateLog}
            onDeleteLog={handleDeleteLog}
            onBatchUpdateLogs={handleBatchUpdateLogs}
            onSaveAllLogs={handleSaveAllLogs}
            onViewInTable={(monthIndex, day) => {
              setActiveTab('table');
            }}
            onNavigateToPetugas={() => setActiveTab('petugas')}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsView
            settings={settings}
            onSaveSettings={handleSaveSettings}
            onResetData={handleResetData}
          />
        )}
      </main>

      {/* Development Firebase Monitor Widget */}
      <FirebaseMonitor
        isOpen={isMonitorOpen}
        onClose={() => setIsMonitorOpen(false)}
      />

      {/* Export Excel Modal (Pilih Per Bulan atau 1 Tahun Lengkap) */}
      <ExportExcelModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        reports={reports}
        settings={settings}
        defaultMonthIndex={exportModalMonth}
      />

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 mt-12 print:hidden text-center text-xs text-slate-500">
        <p>
          Sistem Laporan Data Karung Bocor &bull; Gudang Jadi Utamain &bull; Firebase Multi-Device Synchronized
        </p>
      </footer>
    </div>
  );
}
