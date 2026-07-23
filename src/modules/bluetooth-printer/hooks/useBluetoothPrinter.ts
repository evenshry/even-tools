// 蓝牙连接生命周期 Hook

import { useRef, useCallback } from 'react';
import { message } from 'antd';
import { usePrinterStore } from '../store/usePrinterStore';
import { getSharedBluetoothAdapter, isBluetoothSupported } from '../utils/bluetoothAdapter';
import type { ConnectedDevice, PrinterProfile } from '../data/interface';

const DEBUG = true;

function log(...args: unknown[]) {
  if (DEBUG) console.log('[useBluetoothPrinter]', ...args);
}

// 根据设备名称和服务 UUID 推断打印机协议和纸宽
function inferProfile(deviceName: string, serviceUuids: string[]): Partial<PrinterProfile> {
  const name = deviceName.toLowerCase();

  // TSC / 标签打印机
  if (name.includes('tsc') || name.includes('label') || name.includes('标签')) {
    return { protocol: 'tspl', paperWidth: 72, dpi: 203, writeMode: 'withoutResponse' };
  }

  // 80mm 热敏打印机
  if (name.includes('80') || name.includes('p80') || name.includes('pos-80')) {
    return { protocol: 'escpos', paperWidth: 48, dpi: 203, writeMode: 'withoutResponse' };
  }

  // 58mm 热敏打印机 / 便携打印机
  if (name.includes('58') || name.includes('p58') || name.includes('mini') || name.includes('便携')) {
    return { protocol: 'escpos', paperWidth: 32, dpi: 203, writeMode: 'withResponse' };
  }

  // 通过服务 UUID 推断
  const tsplServiceUuid = '000018f0-0000-1000-8000-00805f9b34fb';
  if (serviceUuids.includes(tsplServiceUuid)) {
    return { protocol: 'escpos', paperWidth: 48, dpi: 203, writeMode: 'withoutResponse' };
  }

  // 默认 fallback
  return { protocol: 'escpos', paperWidth: 48, dpi: 203, writeMode: 'withoutResponse' };
}

export function useBluetoothPrinter() {
  const adapterRef = useRef(getSharedBluetoothAdapter());
  const {
    profile, connectionState, connectedDevice,
    setConnectionState, setConnectedDevice, setProfile, setPrinterStatus,
  } = usePrinterStore();

  log('render hook, connectionState:', connectionState, 'connectedDevice:', connectedDevice?.name);

  const connect = useCallback(async () => {
    log('connect callback start');
    if (!isBluetoothSupported()) {
      message.error('浏览器不支持 Web Bluetooth API，请使用 Chrome 或 Edge');
      return;
    }

    try {
      setConnectionState('scanning');
      const adapter = adapterRef.current;
      log('adapter instance:', adapter);

      const device = await adapter.requestDevice(profile);
      log('device selected in hook:', device?.id, device?.name);

      setConnectionState('connecting');
      const discoveredServices = await adapter.connect(device, profile);
      log('adapter.connect done');

      // 推断实际协议和纸宽
      const serviceUuids = discoveredServices.map(s => s.uuid);
      const inferred = inferProfile(device.name || '', serviceUuids);
      const actualProfile: PrinterProfile = {
        ...profile,
        ...inferred,
      };
      log('inferred profile:', actualProfile);
      setProfile(actualProfile);

      // 断线监听
      adapter.onDisconnected = () => {
        log('onDisconnected callback fired');
        setConnectionState('disconnected');
        setConnectedDevice(null);
        message.warning('打印机已断开连接');
      };

      const connected: ConnectedDevice = {
        id: device.id,
        name: device.name || '未知设备',
        profile: actualProfile,
        actualServiceUuid: serviceUuids[0],
        actualWriteCharacteristicUuid: adapter.getWriteCharacteristicUuid() || undefined,
        actualNotifyCharacteristicUuid: adapter.getNotifyCharacteristicUuid() || undefined,
      };
      log('setConnectedDevice:', connected);
      setConnectedDevice(connected);
      setConnectionState('connected');

      // 连接成功后自动订阅状态推送（如果打印机支持）
      adapter.subscribeStatus((status) => {
        log('status update from subscription:', status);
        setPrinterStatus(status);
      }).catch((e) => log('subscribeStatus failed:', e));

      message.success(`已连接: ${connected.name}`);
    } catch (e) {
      log('connect error:', e);
      setConnectionState('error');
      const err = e as Error;
      if (err.name === 'NotFoundError') {
        message.info('未选择设备');
        setConnectionState('idle');
      } else {
        message.error(`连接失败: ${err.message}`);
      }
    }
  }, [profile, setConnectionState, setConnectedDevice, setProfile]);

  const disconnect = useCallback(async () => {
    log('disconnect callback start');
    try {
      setConnectionState('disconnecting');
      await adapterRef.current.disconnect();
      setConnectedDevice(null);
      setPrinterStatus(null);
      setConnectionState('idle');
      message.info('已断开连接');
    } catch (e) {
      message.error(`断开失败: ${(e as Error).message}`);
      setConnectionState('error');
    }
  }, [setConnectionState, setConnectedDevice, setPrinterStatus]);

  const queryStatus = useCallback(async () => {
    log('queryStatus callback start');
    const adapter = adapterRef.current;
    if (!adapter.isConnected()) {
      message.warning('打印机未连接');
      return;
    }
    try {
      const status = await adapter.queryStatus(profile.protocol);
      log('queryStatus result:', status);
      setPrinterStatus(status);
      message.success('已读取打印机状态');
    } catch (e) {
      log('queryStatus error:', e);
      message.error(`读取状态失败: ${(e as Error).message}`);
    }
  }, [profile.protocol, setPrinterStatus]);

  const write = useCallback(async (data: Uint8Array) => {
    log('write callback start, adapter:', adapterRef.current);
    const adapter = adapterRef.current;
    log('adapter.isConnected():', adapter.isConnected());
    if (!adapter.isConnected()) {
      throw new Error('打印机未连接');
    }
    log('calling adapter.write with mode:', profile.writeMode);
    await adapter.write(data, profile.writeMode);
  }, [profile.writeMode]);

  return {
    connectionState,
    connectedDevice,
    isSupported: isBluetoothSupported(),
    connect,
    disconnect,
    write,
    queryStatus,
  };
}
