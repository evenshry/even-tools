import type { PrinterProfile } from './interface';

export const PRINTER_PROFILES: PrinterProfile[] = [
  {
    id: 'escpos-58mm',
    name: 'ESC/POS 58mm',
    serviceUuid: '',
    writeCharacteristicUuid: '',
    notifyCharacteristicUuid: '',
    protocol: 'escpos',
    paperWidth: 32,
    dpi: 203,
    writeMode: 'withResponse',
  },
  {
    id: 'escpos-80mm',
    name: 'ESC/POS 80mm',
    serviceUuid: '',
    writeCharacteristicUuid: '',
    notifyCharacteristicUuid: '',
    protocol: 'escpos',
    paperWidth: 48,
    dpi: 203,
    writeMode: 'withResponse',
  },
  {
    id: 'tspl-58mm',
    name: 'TSPL 58mm',
    serviceUuid: '',
    writeCharacteristicUuid: '',
    notifyCharacteristicUuid: '',
    protocol: 'tspl',
    paperWidth: 32,
    dpi: 203,
    writeMode: 'withoutResponse',
  },
  {
    id: 'tspl-80mm',
    name: 'TSPL 80mm',
    serviceUuid: '',
    writeCharacteristicUuid: '',
    notifyCharacteristicUuid: '',
    protocol: 'tspl',
    paperWidth: 48,
    dpi: 203,
    writeMode: 'withoutResponse',
  },
];

export const DEFAULT_PROFILE = PRINTER_PROFILES[0];
