// 蓝牙打印机全局状态 (Zustand)

import { create } from 'zustand';
import type {
  AppMode, CommandInput, CommandSnippet, ConnectionState,
  ConnectedDevice, PrintElement, PrintHistoryEntry, PrintJob,
  PrinterProfile, PrinterStatus, SavedDevice, Template,
} from '../data/interface';
import { DEFAULT_PROFILE, PRINTER_PROFILES } from '../data/printerProfiles';
import { BUILTIN_SNIPPETS } from '../data/snippets';
import { BUILTIN_TEMPLATES } from '../data/templates';

const STORAGE_KEY_MODE = 'bluetooth-printer-mode';
const STORAGE_KEY_COMMAND = 'bluetooth-printer-command';
const STORAGE_KEY_PROFILE = 'bluetooth-printer-profile';
const STORAGE_KEY_HISTORY = 'bluetooth-printer-history';
const STORAGE_KEY_SAVED_DEVICES = 'bluetooth-printer-saved-devices';

function loadMode(): AppMode {
  try {
    const v = localStorage.getItem(STORAGE_KEY_MODE);
    return v === 'designer' ? 'designer' : 'command';
  } catch {
    return 'command';
  }
}

function loadCommandInput(): CommandInput {
  const fallback: CommandInput = {
    syntax: 'plaintext',
    raw: '',
    encoding: 'utf8',
    appendNewline: false,
    repeat: 1,
  };
  try {
    const v = localStorage.getItem(STORAGE_KEY_COMMAND);
    if (v) {
      const parsed = JSON.parse(v);
      return {
        syntax: parsed.syntax === 'hex' ? 'hex' : 'plaintext',
        raw: typeof parsed.raw === 'string' ? parsed.raw : '',
        encoding: parsed.encoding === 'gbk' ? 'gbk' : 'utf8',
        appendNewline: !!parsed.appendNewline,
        repeat: Number.isFinite(parsed.repeat) && parsed.repeat > 0 ? parsed.repeat : 1,
      };
    }
  } catch { /* ignore */ }
  return fallback;
}

function loadProfile(): PrinterProfile {
  try {
    const v = localStorage.getItem(STORAGE_KEY_PROFILE);
    if (v) {
      const saved = JSON.parse(v);
      // 从 PRINTER_PROFILES 中查找匹配的完整配置，确保新字段不会缺失
      const matched = PRINTER_PROFILES.find(p => p.id === saved.id);
      return matched ?? { ...DEFAULT_PROFILE, ...saved };
    }
  } catch { /* ignore */ }
  return DEFAULT_PROFILE;
}

function loadHistory(): PrintHistoryEntry[] {
  try {
    const v = localStorage.getItem(STORAGE_KEY_HISTORY);
    if (v) return JSON.parse(v);
  } catch { /* ignore */ }
  return [];
}

function loadSavedDevices(): SavedDevice[] {
  try {
    const v = localStorage.getItem(STORAGE_KEY_SAVED_DEVICES);
    if (v) return JSON.parse(v);
  } catch { /* ignore */ }
  return [];
}

interface PrinterStore {
  // 模式
  mode: AppMode;
  setMode: (mode: AppMode) => void;

  // 设备
  connectionState: ConnectionState;
  connectedDevice: ConnectedDevice | null;
  profile: PrinterProfile;
  printerStatus: PrinterStatus | null;
  setProfile: (profile: PrinterProfile) => void;
  setConnectionState: (state: ConnectionState) => void;
  setConnectedDevice: (device: ConnectedDevice | null) => void;
  setPrinterStatus: (status: PrinterStatus | null) => void;

  // 指令模式
  commandInput: CommandInput;
  setCommandInput: (patch: Partial<CommandInput>) => void;

  // 编辑模式
  elements: PrintElement[];
  selectedElementId: string | null;
  addElement: (element: PrintElement) => void;
  updateElement: (id: string, patch: Partial<PrintElement>) => void;
  removeElement: (id: string) => void;
  reorderElements: (from: number, to: number) => void;
  setElements: (elements: PrintElement[]) => void;
  selectElement: (id: string | null) => void;

  // 队列
  queue: PrintJob[];
  currentJob: PrintJob | null;
  enqueueJob: (job: PrintJob) => void;
  setCurrentJob: (job: PrintJob | null) => void;
  updateJob: (id: string, patch: Partial<PrintJob>) => void;
  removeJob: (id: string) => void;

  // 历史
  history: PrintHistoryEntry[];
  addHistory: (entry: PrintHistoryEntry) => void;
  clearHistory: () => void;

  // 模板与片段
  templates: Template[];
  snippets: CommandSnippet[];
  saveAsTemplate: (name: string, elements: PrintElement[]) => void;
  loadTemplate: (id: string) => PrintElement[] | null;
  saveAsSnippet: (name: string, input: CommandInput) => void;

  // 已保存设备
  savedDevices: SavedDevice[];
  saveDevice: (device: Omit<SavedDevice, 'lastConnectedAt'>) => void;
  removeSavedDevice: (id: string) => void;
}

export const usePrinterStore = create<PrinterStore>((set, get) => ({
  // 模式
  mode: loadMode(),
  setMode: (mode) => {
    try { localStorage.setItem(STORAGE_KEY_MODE, mode); } catch { /* ignore */ }
    set({ mode });
  },

  // 设备
  connectionState: 'idle',
  connectedDevice: null,
  profile: loadProfile(),
  printerStatus: null,
  setProfile: (profile) => {
    try { localStorage.setItem(STORAGE_KEY_PROFILE, JSON.stringify(profile)); } catch { /* ignore */ }
    set({ profile });
  },
  setConnectionState: (connectionState) => set({ connectionState }),
  setConnectedDevice: (connectedDevice) => set({ connectedDevice }),
  setPrinterStatus: (printerStatus) => set({ printerStatus }),

  // 指令模式
  commandInput: loadCommandInput(),
  setCommandInput: (patch) => {
    const newInput: CommandInput = { ...get().commandInput, ...patch };
    try { localStorage.setItem(STORAGE_KEY_COMMAND, JSON.stringify(newInput)); } catch { /* ignore */ }
    set({ commandInput: newInput });
  },

  // 编辑模式
  elements: [],
  selectedElementId: null,
  addElement: (element) => set((s) => ({ elements: [...s.elements, element] })),
  updateElement: (id, patch) => set((s) => ({
    elements: s.elements.map((el) =>
      el.id === id ? { ...el, ...patch } as PrintElement : el
    ),
  })),
  removeElement: (id) => set((s) => ({
    elements: s.elements.filter((el) => el.id !== id),
    selectedElementId: s.selectedElementId === id ? null : s.selectedElementId,
  })),
  reorderElements: (from, to) => set((s) => {
    const elements = [...s.elements];
    const [moved] = elements.splice(from, 1);
    elements.splice(to, 0, moved);
    return { elements };
  }),
  setElements: (elements) => set({ elements }),
  selectElement: (id) => set({ selectedElementId: id }),

  // 队列
  queue: [],
  currentJob: null,
  enqueueJob: (job) => set((s) => ({ queue: [...s.queue, job] })),
  setCurrentJob: (currentJob) => set({ currentJob }),
  updateJob: (id, patch) => set((s) => {
    const updateInList = (list: PrintJob[]) =>
      list.map((j) => (j.id === id ? { ...j, ...patch } : j));
    return {
      queue: updateInList(s.queue),
      currentJob: s.currentJob?.id === id
        ? { ...s.currentJob, ...patch }
        : s.currentJob,
    };
  }),
  removeJob: (id) => set((s) => ({
    queue: s.queue.filter((j) => j.id !== id),
    currentJob: s.currentJob?.id === id ? null : s.currentJob,
  })),

  // 历史
  history: loadHistory(),
  addHistory: (entry) => set((s) => {
    // 防止重复添加
    if (s.history.some(h => h.id === entry.id)) return s;
    const newHistory = [entry, ...s.history].slice(0, 100);
    try { localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(newHistory)); } catch { /* ignore */ }
    return { history: newHistory };
  }),
  clearHistory: () => {
    try { localStorage.removeItem(STORAGE_KEY_HISTORY); } catch { /* ignore */ }
    set({ history: [] });
  },

  // 模板与片段
  templates: BUILTIN_TEMPLATES,
  snippets: BUILTIN_SNIPPETS,
  saveAsTemplate: (name, elements) => set((s) => {
    const tpl: Template = {
      id: `tpl-custom-${Date.now()}`,
      name,
      description: '用户自定义模板',
      elements: JSON.parse(JSON.stringify(elements)),
      variables: [],
      category: 'custom',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    return { templates: [...s.templates, tpl] };
  }),
  loadTemplate: (id) => {
    const tpl = get().templates.find((t) => t.id === id);
    return tpl ? JSON.parse(JSON.stringify(tpl.elements)) : null;
  },
  saveAsSnippet: (name, input) => set((s) => {
    const snip: CommandSnippet = {
      id: `snip-custom-${Date.now()}`,
      name,
      description: '用户自定义片段',
      syntax: input.syntax,
      content: input.raw,
      category: 'common',
    };
    return { snippets: [...s.snippets, snip] };
  }),

  // 已保存设备
  savedDevices: loadSavedDevices(),
  saveDevice: (device) => set((s) => {
    const newDevices = s.savedDevices
      .filter(d => d.id !== device.id)
      .concat({ ...device, lastConnectedAt: Date.now() })
      .sort((a, b) => b.lastConnectedAt - a.lastConnectedAt)
      .slice(0, 10);
    try { localStorage.setItem(STORAGE_KEY_SAVED_DEVICES, JSON.stringify(newDevices)); } catch { /* ignore */ }
    return { savedDevices: newDevices };
  }),
  removeSavedDevice: (id) => set((s) => {
    const newDevices = s.savedDevices.filter(d => d.id !== id);
    try { localStorage.setItem(STORAGE_KEY_SAVED_DEVICES, JSON.stringify(newDevices)); } catch { /* ignore */ }
    return { savedDevices: newDevices };
  }),
}));
