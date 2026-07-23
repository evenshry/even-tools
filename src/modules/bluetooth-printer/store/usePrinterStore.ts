// 蓝牙打印机全局状态 (Zustand)

import { create } from 'zustand';
import type {
  AppMode, CommandInput, CommandSnippet, ConnectionState,
  ConnectedDevice, PrintElement, PrintHistoryEntry, PrintJob,
  PrinterProfile, PrinterStatus, Template,
} from '../data/interface';
import { DEFAULT_PROFILE } from '../data/printerProfiles';
import { BUILTIN_SNIPPETS } from '../data/snippets';
import { BUILTIN_TEMPLATES } from '../data/templates';

const STORAGE_KEY_MODE = 'bluetooth-printer-mode';
const STORAGE_KEY_COMMAND = 'bluetooth-printer-command';
const STORAGE_KEY_PROFILE = 'bluetooth-printer-profile';

function loadMode(): AppMode {
  try {
    const v = localStorage.getItem(STORAGE_KEY_MODE);
    return v === 'designer' ? 'designer' : 'command';
  } catch {
    return 'command';
  }
}

function loadCommandInput(): CommandInput {
  try {
    const v = localStorage.getItem(STORAGE_KEY_COMMAND);
    if (v) return JSON.parse(v);
  } catch { /* ignore */ }
  return {
    syntax: 'mnemonic',
    raw: '@init\n@align center\n@size 2x2\n@bold on\nHello World\n@bold off\n@size 1x1\n@align left\n@feed 3\n@cut',
    encoding: 'utf8',
    appendNewline: false,
    repeat: 1,
  };
}

function loadProfile(): PrinterProfile {
  try {
    const v = localStorage.getItem(STORAGE_KEY_PROFILE);
    if (v) return JSON.parse(v);
  } catch { /* ignore */ }
  return DEFAULT_PROFILE;
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
    const newInput = { ...get().commandInput, ...patch };
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
  history: [],
  addHistory: (entry) => set((s) => ({
    history: [entry, ...s.history].slice(0, 100),
  })),
  clearHistory: () => set({ history: [] }),

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
}));
