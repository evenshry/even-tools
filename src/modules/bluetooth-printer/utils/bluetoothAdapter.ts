// Web Bluetooth 适配层
// 封装 navigator.bluetooth API，提供稳定的 Promise 化接口
//
// 关键改进：自动发现服务和特征，不再依赖预设 UUID
// 连接流程：连接设备 → 发现所有服务 → 遍历特征 → 找到支持写入的特征

import type { PrinterProfile, PrinterStatus } from '../data/interface';

const DEBUG = true;

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

  onDisconnected: ((device: BluetoothDevice) => void) | null = null;

  // 请求设备选择 (必须由用户手势触发)
  async requestDevice(_profile: PrinterProfile): Promise<BluetoothDevice> {
    if (!isBluetoothSupported()) {
      throw new Error('浏览器不支持 Web Bluetooth API，请使用 Chrome 或 Edge');
    }

    const bt = getNavigatorBluetooth();
    if (!bt) {
      throw new Error('浏览器不支持 Web Bluetooth API，请使用 Chrome 或 Edge');
    }

    const options: Parameters<typeof bt.requestDevice>[0] = {
      acceptAllDevices: true,
      optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb', '49535343-fe7d-4ae5-8fa9-9fafd205e455'],
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
          log('found write characteristic by configured UUID:', char.uuid);
          return char;
        }
        log('configured characteristic found but not writable');
      } catch (e) {
        logError('configured UUID failed:', (e as Error).message);
      }
    }

    // 策略2：自动发现所有服务，找到第一个可写入的特征
    log('fallback to auto discovery for write characteristic');
    const services = await this.server.getPrimaryServices();
    for (const service of services) {
      const characteristics = await service.getCharacteristics();
      for (const char of characteristics) {
        if (char.properties.write || char.properties.writeWithoutResponse) {
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

    // 策略2：自动发现所有服务，找到第一个可通知的特征
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

    device.addEventListener('gattserverdisconnected', () => {
      log('gattserverdisconnected event', device.id);
      this.onDisconnected?.(device);
    });

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

  // 写数据 (自动分片)
  async write(data: Uint8Array, mode: 'withResponse' | 'withoutResponse' = 'withResponse'): Promise<void> {
    log('write called, isConnected:', this.isConnected(), 'writeCharacteristic exists:', !!this.writeCharacteristic);
    if (!this.writeCharacteristic) throw new Error('未连接写特征');
    if (!this.server) throw new Error('未连接服务器');

    log('write start, mode:', mode, 'bytes:', data.length);

    const CHUNK_SIZE = 200;
    const CHUNK_DELAY = 20;

    for (let offset = 0; offset < data.length; offset += CHUNK_SIZE) {
      const chunk = data.slice(offset, offset + CHUNK_SIZE);
      log(`writing chunk ${offset}-${offset + chunk.length}/${data.length}`);
      try {
        if (mode === 'withResponse') {
          await this.writeCharacteristic.writeValueWithResponse(chunk);
        } else {
          await this.writeCharacteristic.writeValueWithoutResponse(chunk);
        }
      } catch (e) {
        logError('write chunk failed:', (e as Error).message);
        throw e;
      }
      if (offset + CHUNK_SIZE < data.length) {
        await new Promise(resolve => setTimeout(resolve, CHUNK_DELAY));
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

    if (protocol === 'tspl') {
      const cmd = new Uint8Array([0x53, 0x54, 0x41, 0x54, 0x55, 0x53, 0x0D, 0x0A]);
      await this.writeCharacteristic.writeValueWithResponse(cmd);
      return { online: true };
    }

    // ESC/POS: DLE EOT 1 (实时状态传输)
    // 0x10 0x04 0x01
    const query = new Uint8Array([0x10, 0x04, 0x01]);
    await this.writeCharacteristic.writeValueWithoutResponse(query);

    // 如果 notify 特征存在，尝试读取其当前值
    if (this.notifyCharacteristic?.readValue) {
      try {
        const value = await this.notifyCharacteristic.readValue();
        const status: PrinterStatus = { online: true };
        if (value.byteLength > 0) {
          const byte0 = value.getUint8(0);
          status.paperOut = (byte0 & 0x04) !== 0;
          status.coverOpen = (byte0 & 0x08) !== 0;
          status.overheated = (byte0 & 0x40) !== 0;
        }
        log('queryStatus read value:', status);
        return status;
      } catch (e) {
        logError('queryStatus readValue failed:', (e as Error).message);
      }
    }

    return { online: true };
  }

  // 订阅打印机状态推送
  async subscribeStatus(callback: (status: PrinterStatus) => void): Promise<void> {
    if (!this.notifyCharacteristic) return;
    await this.notifyCharacteristic.startNotifications();
    this.notifyCharacteristic.addEventListener('characteristicvaluechanged', (e: BluetoothCharacteristicValueChangedEvent) => {
      if (!e.target) return;
      const value: DataView = e.target.value;
      const status: PrinterStatus = { online: true };
      if (value.byteLength > 0) {
        const byte0 = value.getUint8(0);
        status.paperOut = (byte0 & 0x04) !== 0;
        status.coverOpen = (byte0 & 0x08) !== 0;
        status.overheated = (byte0 & 0x40) !== 0;
      }
      log('status notification:', status);
      callback(status);
    });
  }

  // 断开连接
  async disconnect(): Promise<void> {
    log('disconnect called');
    if (this.server) {
      this.server.disconnect();
      this.server = null;
    }
    this.device = null;
    this.writeCharacteristic = null;
    this.notifyCharacteristic = null;
    this.discoveredServices = [];
    log('disconnect done');
  }

  // 是否已连接
  isConnected(): boolean {
    const serverOk = !!this.server;
    const connectedFlag = !!this.server?.connected;
    const writeCharOk = !!this.writeCharacteristic;
    log('isConnected check:', { serverOk, connectedFlag, writeCharOk });
    return serverOk && writeCharOk;
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
