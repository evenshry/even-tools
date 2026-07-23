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
    notify