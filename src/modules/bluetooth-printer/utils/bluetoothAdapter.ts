// Web Bluetooth 适配层
// 封装 navigator.bluetooth API，提供稳定的 Promise 化接口
//
// 关键改进：自动发现服务和特征，不再依赖预设 UUID
// 连接流程：连接设备 → 发现所有服务 → 遍历特征 → 找到支持写入的特征

import type { PrinterProfile, PrinterStatus } from '../data/interface';

const DEBUG = import.meta.env.DEV;

// 常见热敏/标签打印机服务 UUID，用于 requestDevice 与自动发现优先级
const KNOWN_PRINTER_SERVICES = [
  '000018f0-0000-1000-8000-00805f9b34fb',
  '0000ff00-0000-1000-8000-00805f9b34fb',
  '0000fee7-0000-1000-8000-00805f9b34fb',
  '49535343-fe7d-4ae5-8fa9-9fafd205e455',
  'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
];

function log(...args: unknown[]) {
  if (DEBUG) console.log('[BluetoothAdapter]', ...args);
}

function logError(...args: unknown[]) {
  if (DEBUG) console.error('[BluetoothAdapter]', ...args);
}

// Navigator.bluetooth 类型扩展 (Web Bluetooth API)
interface NavigatorBluetooth {
  bluetooth: {
    requestDevice(options: unknown): Promise<BluetoothDevice>;
    getAvailability(): Promise<boolean>;
  };
}

function getNavigatorBluetooth(): NavigatorBluetooth['bluetooth'] | null {
  if (typeof navigator === 'undefined') return null;
  return (navigator as Navigator & NavigatorBluetooth).bluetooth ?? null;
}

// 浏览器是否支持 Web Bluetooth
export function isBluetoothSupported(): boolean {
  return !!getNavigatorBluetooth();
}

// Web Bluetooth 类型声明 (完整版)
interface BluetoothDevice {
  id: string;
  name?: string;
  gatt?: {
    connected: boolean;
    connect(): Promise<BluetoothRemoteGATTServer>;
    disconnect(): void;
  };
  addEventListener(type: string, listener: (e: Event) => void): void;
  removeEventListener(type: string, listener: (e: Event) => void): void;
  watchAdvertisements?: () => Promise<void>;
}

interface BluetoothRemoteGATTService {
  uuid: string;
  getCharacteristic(uuid: string): Promise<BluetoothRemoteGATTCharacteristic>;
  getCharacteristics(): Promise<BluetoothRemoteGATTCharacteristic[]>;
}

interface BluetoothRemoteGATTServer {
  connected: boolean;
  connect(): Promise<BluetoothRemoteGATTServer>;
  disconnect(): void;
  getPrimaryService(uuid: string): Promise<BluetoothRemoteGATTService>;
  getPrimaryServices(uuid?: string): Promise<BluetoothRemoteGATTService[]>;
}

interface BluetoothCharacteristicValueChangedEvent extends Event {
  target: (EventTarget & { value: DataView }) | null;
}

interface BluetoothCharacteristicProperties {
  broadcast: boolean;
  read: boolean;
  writeWithoutResponse: boolean;
  write: boolean;
  notify: boolean;
  indicate: boolean;
  authenticatedSignedWrites: boolean;
  reliableWrite: boolean;
  writableAuxiliaries: boolean;
}

interface BluetoothRemoteGATTCharacteristic {
  uuid: string;
  properties: BluetoothCharacteristicProperties;
  writeValue(data: BufferSource): Promise<void>;
  writeValueWithResponse(data: BufferSource): Promise<void>;
  writeValueWithoutResponse(data: BufferSource): Promise<void>;
  readValue(): Promise<DataView>;
  startNotifications(): Promise<BluetoothRemoteGATTCharacteristic>;
  addEventListener(type: string, listener: (e: BluetoothCharacteristicValueChangedEvent) => void): void;
  removeEventListener(type: string, listener: (e: BluetoothCharacteristicValueChangedEvent) => void): void;
  value?: DataView;
}

// 发现的服务信息
export interface DiscoveredServiceInfo {
  uuid: string;
  characteristics: DiscoveredCharacteristicInfo[];
}

export interface DiscoveredCharacteristicInfo {
  uuid: string;
  canWrite: boolean;
  canNotify: boolean;
  properties: string;
}

export class BluetoothAdapter {
  private device: BluetoothDevice | null = null;
  private server: BluetoothRemoteGATTServer | null = null;
  private writeCharacteristic: BluetoothRemoteGATTCharacteristic | null = null;
  private notifyCharacteristic: BluetoothRemoteGATTCharacteristic | null = null;
  private discoveredServices: DiscoveredServiceInfo[] = [];
  private writeServiceUuid: string | null = null;
  private disconnectHandler: ((e: Event) => void) | null = null;
  private notifyHandler: ((e: BluetoothCharacteristicValueChangedEvent) => void) | null = null;

  onDisconnected: ((device: BluetoothDevice) => void) | null = null;

  // 请求设备选择 (必须由用户手势触发)
  async requestDevice(profile: PrinterProfile): Promise<BluetoothDevice> {
    if (!isBluetoothSupported()) {
      throw new Error('浏览器不支持 Web Bluetooth API，请使用 Chrome 或 Edge');
    }

    const bt = getNavigatorBluetooth();
    if (!bt) {
      throw new Error('浏览器不支持 Web Bluetooth API，请使用 Chrome 或 Edge');
    }

    // optionalServices 必须覆盖设备上所有需要访问的服务，否则 getPrimaryServices 会失败
    const optionalServices = new Set<string>(KNOWN_PRINTER_SERVICES);
    if (profile.serviceUuid) optionalServices.add(profile.serviceUuid);

    const options: Parameters<typeof bt.requestDevice>[0] = {
      acceptAllDevices: true,
      optionalServices: Array.from(optionalServices),
    };

    log('requestDevice options:', JSON.stringify(options));
    const device = await bt.requestDevice(options);
    log('device selected:', device.id, device.name);
    return device;
  }

  // 发现所有服务和特征
  private async discoverServices(): Promise<DiscoveredServiceInfo[]> {
    if (!this.server) return [];

    log('discoverServices start');
    const services = await this.server.getPrimaryServices();
    log('discovered services count:', services.length);

    const result: DiscoveredServiceInfo[] = [];

    for (const service of services) {
      const characteristics = await service.getCharacteristics();
      log(`service ${service.uuid} characteristics count:`, characteristics.length);

      const charInfos: DiscoveredCharacteristicInfo[] = [];

      for (const char of characteristics) {
        const info: DiscoveredCharacteristicInfo = {
          uuid: char.uuid,
          canWrite: char.properties.write || char.properties.writeWithoutResponse,
          canNotify: char.properties.notify || char.properties.indicate,
          properties: [
            char.properties.write && 'write',
            char.properties.writeWithoutResponse && 'writeNR',
            char.properties.read && 'read',
            char.properties.notify && 'notify',
            char.properties.indicate && 'indicate',
          ].filter(Boolean).join(' | '),
        };
        charInfos.push(info);
        log('characteristic:', JSON.stringify(info));
      }

      result.push({
        uuid: service.uuid,
        characteristics: charInfos,
      });
    }

    log('discoverServices done');
    return result;
  }

  // 查找写入特征
  private async findWriteCharacteristic(profile: PrinterProfile): Promise<BluetoothRemoteGATTCharacteristic | null> {
    if (!this.server) return null;

    log('findWriteCharacteristic start', { profile });

    // 策略1：尝试使用配置的 UUID
    if (profile.serviceUuid && profile.writeCharacteristicUuid) {
      try {
        log('trying configured UUIDs', profile.serviceUuid, profile.writeCharacteristicUuid);
        const service = await this.server.getPrimaryService(profile.serviceUuid);
        const char = await service.getCharacteristic(profile.writeCharacteristicUuid);
        if (char.properties.write || char.properties.writeWithoutResponse) {
          this.writeServiceUuid = service.uuid;
          log('found write characteristic by configured UUID:', char.uuid);
          return char;
        }
        log('configured characteristic found but not writable');
      } catch (e) {
        logError('configured UUID failed:', (e as Error).message);
      }
    }

    // 策略2：自动发现所有服务，优先匹配常见打印机服务，再退回第一个可写特征
    log('fallback to auto discovery for write characteristic');
    const services = await this.server.getPrimaryServices();
    const known = new Set(KNOWN_PRINTER_SERVICES);
    const ordered = [...services].sort(
      (a, b) => Number(known.has(b.uuid.toLowerCase())) - Number(known.has(a.uuid.toLowerCase())),
    );
    for (const service of ordered) {
      const characteristics = await service.getCharacteristics();
      for (const char of characteristics) {
        if (char.properties.write || char.properties.writeWithoutResponse) {
          this.writeServiceUuid = service.uuid;
          log('found write characteristic by auto discovery:', char.uuid, 'in service:', service.uuid);
          return char;
        }
      }
    }

    logError('no write characteristic found');
    return null;
  }

  // 查找通知特征
  private async findNotifyCharacteristic(profile: PrinterProfile): Promise<BluetoothRemoteGATTCharacteristic | null> {
    if (!this.server) return null;

    log('findNotifyCharacteristic start');

    // 策略1：尝试使用配置的 UUID
    if (profile.serviceUuid && profile.notifyCharacteristicUuid) {
      try {
        log('trying configured notify UUID', profile.serviceUuid, profile.notifyCharacteristicUuid);
        const service = await this.server.getPrimaryService(profile.serviceUuid);
        const char = await service.getCharacteristic(profile.notifyCharacteristicUuid);
        if (char.properties.notify || char.properties.indicate) {
          log('found notify characteristic by configured UUID:', char.uuid);
          return char;
        }
      } catch (e) {
        logError('configured notify UUID failed:', (e as Error).message);
      }
    }

    // 策略2：优先在写特征所在服务中查找通知特征，避免跨服务读错状态
    if (this.writeServiceUuid) {
      try {
        const service = await this.server.getPrimaryService(this.writeServiceUuid);
        const characteristics = await service.getCharacteristics();
        const char = characteristics.find(c => c.properties.notify || c.properties.indicate);
        if (char) {
          log('found notify characteristic in write service:', char.uuid);
          return char;
        }
      } catch (e) {
        logError('notify in write service failed:', (e as Error).message);
      }
    }

    // 策略3：自动发现所有服务，找到第一个可通知的特征
    log('fallback to auto discovery for notify characteristic');
    const services = await this.server.getPrimaryServices();
    for (const service of services) {
      const characteristics = await service.getCharacteristics();
      for (const char of characteristics) {
        if (char.properties.notify || char.properties.indicate) {
          log('found notify characteristic by auto discovery:', char.uuid, 'in service:', service.uuid);
          return char;
        }
      }
    }

    log('no notify characteristic found (optional)');
    return null;
  }

  // 连接设备
  async connect(device: BluetoothDevice, profile: PrinterProfile): Promise<DiscoveredServiceInfo[]> {
    log('connect start', device.id, device.name);
    this.device = device;
    this.writeServiceUuid = null;

    // 先移除上一次的监听，避免重连后重复触发
    if (this.disconnectHandler) {
      device.removeEventListener('gattserverdisconnected', this.disconnectHandler);
    }
    this.disconnectHandler = () => {
      log('gattserverdisconnected event', device.id);
      this.writeCharacteristic = null;
      this.notifyCharacteristic = null;
      this.writeServiceUuid = null;
      this.onDisconnected?.(device);
    };
    device.addEventListener('gattserverdisconnected', this.disconnectHandler);

    if (!device.gatt) throw new Error('设备不支持 GATT');

    log('connecting GATT...');
    this.server = await device.gatt.connect();
    log('GATT connected, server.connected:', this.server.connected);

    // 发现所有服务（用于调试和展示）
    this.discoveredServices = await this.discoverServices();

    // 自动查找写入特征
    this.writeCharacteristic = await this.findWriteCharacteristic(profile);
    if (!this.writeCharacteristic) {
      throw new Error('未找到支持写入的特征，请检查设备是否为蓝牙打印机');
    }

    // 自动查找通知特征（可选）
    this.notifyCharacteristic = await this.findNotifyCharacteristic(profile);

    log('connect done. writeChar:', this.writeCharacteristic.uuid, 'notifyChar:', this.notifyCharacteristic?.uuid);
    return this.discoveredServices;
  }

  // 写数据 (自动分片，按写入模式选择分片大小)
  async write(
    data: Uint8Array,
    mode: 'withResponse' | 'withoutResponse' = 'withResponse',
    onProgress?: (sent: number, total: number) => void,
  ): Promise<void> {
    if (!this.writeCharacteristic) throw new Error('未连接写特征');
    if (!this.server) throw new Error('未连接服务器');

    log('write start, mode:', mode, 'bytes:', data.length);

    // BLE 默认 MTU 23 时无响应写只能发 20 字节；有响应写可走长包
    let chunkSize = mode === 'withResponse' ? 180 : 20;
    const delay = mode === 'withResponse' ? 5 : 10;

    let offset = 0;
    while (offset < data.length) {
      const end = Math.min(offset + chunkSize, data.length);
      const chunk = data.subarray(offset, end);
      // 复制为独立 ArrayBuffer，满足 BufferSource 类型要求
      const payload = chunk.buffer.slice(chunk.byteOffset, chunk.byteOffset + chunk.byteLength) as ArrayBuffer;
      try {
        if (mode === 'withResponse') {
          await this.writeCharacteristic.writeValueWithResponse(payload);
        } else {
          await this.writeCharacteristic.writeValueWithoutResponse(payload);
        }
      } catch (e) {
        // 首片失败通常是 MTU 不足，降级到 20 字节重试
        if (offset === 0 && chunkSize > 20) {
          logError('write chunk failed, retry with 20-byte chunks:', (e as Error).message);
          chunkSize = 20;
          continue;
        }
        logError('write chunk failed:', (e as Error).message);
        throw e;
      }
      offset = end;
      onProgress?.(end, data.length);
      if (end < data.length) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    log('write done');
  }

  // 主动查询打印机状态 (ESC/POS DLE EOT n)
  // 注意：此方法会写入查询指令并尝试读取返回的特征值。
  // 部分打印机不会立即返回，需要通过 startNotifications 订阅状态推送。
  async queryStatus(protocol: 'escpos' | 'tspl' = 'escpos'): Promise<PrinterStatus> {
    if (!this.writeCharacteristic) throw new Error('未连接写特征');

    log('queryStatus start, protocol:', protocol);
    const online = this.isConnected();

    if (protocol === 'tspl') {
      const cmd = new Uint8Array([0x53, 0x54, 0x41, 0x54, 0x55, 0x53, 0x0D, 0x0A]);
      await this.writeCharacteristic.writeValueWithResponse(cmd);
      // TSPL 的状态回复同样依赖通知，这里只反映 GATT 连接状态
      return { online };
    }

    // ESC/POS: DLE EOT 1 (实时状态传输) 0x10 0x04 0x01
    const query = new Uint8Array([0x10, 0x04, 0x01]);
    await this.writeCharacteristic.writeValueWithoutResponse(query);

    if (this.notifyCharacteristic?.readValue) {
      try {
        const value = await this.notifyCharacteristic.readValue();
        if (value.byteLength > 0) {
          const status = parseEscPosStatus(value.getUint8(0));
          log('queryStatus read value:', status);
          const { offline, ...flags } = status;
          return { online: online && !offline, ...flags };
        }
      } catch (e) {
        logError('queryStatus readValue failed:', (e as Error).message);
      }
    }

    // 无法读取状态时只反映连接状态，不伪造缺纸/开盖
    return { online };
  }

  // 订阅打印机状态推送
  async subscribeStatus(callback: (status: PrinterStatus) => void): Promise<void> {
    if (!this.notifyCharacteristic) return;
    await this.notifyCharacteristic.startNotifications();

    // 移除旧监听，避免重连后同一状态触发多次
    if (this.notifyHandler) {
      this.notifyCharacteristic.removeEventListener('characteristicvaluechanged', this.notifyHandler);
    }
    this.notifyHandler = (e: BluetoothCharacteristicValueChangedEvent) => {
      if (!e.target) return;
      const value: DataView = e.target.value;
      if (value.byteLength === 0) return;
      const status = parseEscPosStatus(value.getUint8(0));
      log('status notification:', status);
      const { offline, ...flags } = status;
      callback({ online: this.isConnected() && !offline, ...flags });
    };
    this.notifyCharacteristic.addEventListener('characteristicvaluechanged', this.notifyHandler);
  }

  // 断开连接
  async disconnect(): Promise<void> {
    log('disconnect called');
    if (this.device && this.disconnectHandler) {
      this.device.removeEventListener('gattserverdisconnected', this.disconnectHandler);
      this.disconnectHandler = null;
    }
    if (this.notifyCharacteristic && this.notifyHandler) {
      this.notifyCharacteristic.removeEventListener('characteristicvaluechanged', this.notifyHandler);
      this.notifyHandler = null;
    }
    if (this.server) {
      this.server.disconnect();
      this.server = null;
    }
    this.device = null;
    this.writeCharacteristic = null;
    this.notifyCharacteristic = null;
    this.writeServiceUuid = null;
    this.discoveredServices = [];
    log('disconnect done');
  }

  // 是否已连接
  isConnected(): boolean {
    return !!this.server?.connected && !!this.writeCharacteristic;
  }

  // 获取当前设备
  getDevice(): BluetoothDevice | null {
    return this.device;
  }

  // 获取发现的服务信息
  getDiscoveredServices(): DiscoveredServiceInfo[] {
    return this.discoveredServices;
  }

  // 获取当前使用的写入特征 UUID
  getWriteCharacteristicUuid(): string | null {
    return this.writeCharacteristic?.uuid || null;
  }

  // 获取当前使用的通知特征 UUID
  getNotifyCharacteristicUuid(): string | null {
    return this.notifyCharacteristic?.uuid || null;
  }
}

// ESC/POS DLE EOT 1 状态字节解析
// bit1=开盖 bit2=按键进纸 bit3=缺纸 bit5=打印错误 bit6=离线
interface EscPosStatusBits {
  offline: boolean;
  paperOut?: boolean;
  coverOpen?: boolean;
  overheated?: boolean;
  error?: string;
}

function parseEscPosStatus(byte0: number): EscPosStatusBits {
  const coverOpen = (byte0 & 0x02) !== 0;
  const paperOut = (byte0 & 0x08) !== 0;
  const printError = (byte0 & 0x20) !== 0;
  const offline = (byte0 & 0x40) !== 0;
  return {
    offline,
    paperOut: paperOut || undefined,
    coverOpen: coverOpen || undefined,
    // DLE EOT 1 不提供温度信息，避免伪造过热状态
    overheated: undefined,
    error: printError ? '打印错误' : undefined,
  };
}

// 全局单例：确保整个应用只使用一个 BluetoothAdapter 实例
// 避免多个组件各自创建 adapter 导致连接状态和发送状态不一致
let sharedAdapter: BluetoothAdapter | null = null;

export function getSharedBluetoothAdapter(): BluetoothAdapter {
  if (!sharedAdapter) {
    sharedAdapter = new BluetoothAdapter();
    log('created shared BluetoothAdapter instance');
  }
  return sharedAdapter;
}
