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
const STORAGE_KEY_ELEMENTS = 'bluetooth-printer-elements';
const STORAGE_KEY_TEMPLATES = 'bluetooth-printer-templates';
const STORAGE_KEY_SNIPPETS = 'bluetooth-printer-snippets';

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

// 历史条目裁剪：去掉二进制与图片等大字段，避免 localStorage 爆量
function sanitizeHistoryEntry(entry: PrintHistoryEntry): PrintHistoryEntry | null {
  if (!entry || typeof entry !== 'object' || !entry.job) return null;
  const job = entry.job;
  return {
    id: String(entry.id),
    preview: entry.preview ?? job.compiledText?.slice(0, 200),
    job: {
      id: String(job.id),
      mode: job.mode === 'designer' ? 'designer' : 'command',
      status: ['pending', 'sending', 'success', 'failed', 'canceled'].includes(job.status) ? job.status : 'failed',
      progress: Number.isFinite(job.progress) ? job.progress : 0,
      createdAt: Number.isFinite(job.createdAt) ? job.createdAt : Date.now(),
      startedAt: job.startedAt,
      finishedAt: job.finishedAt,
      bytesSent: job.bytesSent,
      totalBytes: job.totalBytes,
      error: job.error,
      deviceId: job.deviceId,
      deviceName: job.deviceName,
      compiledText: job.compiledText?.slice(0, 400),
    },
  };
}

function loadHistory(): PrintHistoryEntry[] {
  try {
    const v = localStorage.getItem(STORAGE_KEY_HISTORY);
    if (v) {
      const parsed = JSON.parse(v);
      if (!Array.isArray(parsed)) return [];
      return parsed
        .map((entry) => sanitizeHistoryEntry(entry as PrintHistoryEntry))
        .filter((entry): entry is PrintHistoryEntry => entry !== null);
    }
  } catch { /* ignore */ }
  return [];
}

function loadElements(): PrintElement[] {
  try {
    const v = localStorage.getItem(STORAGE_KEY_ELEMENTS);
    if (v) {
      const parsed = JSON.parse(v);
      if (Array.isArray(parsed)) return parsed as PrintElement[];
    }
  } catch { /* ignore */ }
  return [];
}

function loadCustomTemplates(): Template[] {
  try {
    const v = localStorage.getItem(STORAGE_KEY_TEMPLATES);
    if (v) {
      const parsed = JSON.parse(v);
      if (Array.isArray(parsed)) return parsed as Template[];
    }
  } catch { /* ignore */ }
  return [];
}

function loadCustomSnippets(): CommandSnippet[] {
  try {
    const v = localStorage.getItem(STORAGE_KEY_SNIPPETS);
    if (v) {
      const parsed = JSON.parse(v);
      if (Array.isArray(parsed)) return parsed as CommandSnippet[];
    }
  } catch { /* ignore */ }
  return [];
}

// 编辑区元素体积较大（含图片 base64），做防抖落盘
let elementsTimer: ReturnType<typeof setTimeout> | null = null;
function schedulePersistElements(elements: PrintElement[]) {
  if (elementsTimer) clearTimeout(elementsTimer);
  elementsTimer = setTimeout(() => {
    try { localStorage.setItem(STORAGE_KEY_ELEMENTS, JSON.stringify(elements)); } catch { /* ignore */ }
  }, 300);
}

function persistCustomTemplates(templates: Template[]) {
  try {
    localStorage.setItem(
      STORAGE_KEY_TEMPLATES,
      JSON.stringify(templates.filter((t) => t.category === 'custom')),
    );
  } catch { /* ignore */ }
}

function persistCustomSnippets(snippets: CommandSnippet[]) {
  try {
    localStorage.setItem(
      STORAGE_KEY_SNIPPETS,
      JSON.stringify(snippets.filter((s) => s.id.startsWith('snip-custom-'))),
    );
  } catch { /* ignore */ }
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
  elements: loadElements(),
  selectedElementId: null,
  addElement: (element) => set((s) => {
    const elements = [...s.elements, element];
    schedulePersistElements(elements);
    return { elements };
  }),
  updateElement: (id, patch) => set((s) => {
    const elements = s.elements.map((el) =>
      el.id === id ? { ...el, ...patch } as PrintElement : el
    );
    schedulePersistElements(elements);
    return { elements };
  }),
  removeElement: (id) => set((s) => {
    const elements = s.elements.filter((el) => el.id !== id);
    schedulePersistElements(elements);
    return {
      elements,
      selectedElementId: s.selectedElementId === id ? null : s.selectedElementId,
    };
  }),
  reorderElements: (from, to) => set((s) => {
    if (from < 0 || from >= s.elements.length || to < 0 || to >= s.elements.length || from === to) {
      return s;
    }
    const elements = [...s.elements];
    const [moved] = elements.splice(from, 1);
    elements.splice(to, 0, moved);
    schedulePersistElements(elements);
    return { elements };
  }),
  setElements: (elements) => {
    schedulePersistElements(elements);
    set({ elements });
  },
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
    const sanitized = sanitizeHistoryEntry(entry);
    const newHistory = (sanitized ? [sanitized, ...s.history] : s.history).slice(0, 100);
    try { localStorage.setItem(STORAGE_KEY_HISTORY, JSON.stringify(newHistory)); } catch { /* ignore */ }
    return { history: newHistory };
  }),
  clearHistory: () => {
    try { localStorage.removeItem(STORAGE_KEY_HISTORY); } catch { /* ignore */ }
    set({ history: [] });
  },

  // 模板与片段
  templates: [...BUILTIN_TEMPLATES, ...loadCustomTemplates()],
  snippets: [...BUILTIN_SNIPPETS, ...loadCustomSnippets()],
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
    const templates = [...s.templates, tpl];
    persistCustomTemplates(templates);
    return { templates };
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
    const snippets = [...s.snippets, snip];
    persistCustomSnippets(snippets);
    return { snippets };
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
