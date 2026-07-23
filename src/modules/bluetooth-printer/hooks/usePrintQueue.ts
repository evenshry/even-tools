// 打印队列 Hook - 异步消费队列，发送到打印机

import { useEffect, useCallback } from 'react';
import { message } from 'antd';
import { usePrinterStore } from '../store/usePrinterStore';
import { useBluetoothPrinter } from './useBluetoothPrinter';
import { generateSelfTestBytes } from '../utils/testPage';
import type { PrintJob, PrintHistoryEntry } from '../data/interface';

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;
const DEBUG = false;

function log(...args: unknown[]) {
  if (DEBUG) console.log('[usePrintQueue]', ...args);
}

// 全局锁，防止多个组件实例同时处理同一个任务
let globalProcessingJobId: string | null = null;

export function usePrintQueue() {
  const {
    queue, currentJob, enqueueJob, setCurrentJob, updateJob, removeJob, addHistory,
    profile, connectedDevice,
  } = usePrinterStore();
  const { write, connectionState } = useBluetoothPrinter();

  log('render hook, connectionState:', connectionState, 'queue.length:', queue.length, 'currentJob:', currentJob?.id);

  const runJob = useCallback(async (job: PrintJob) => {
    log('runJob start:', job.id);
    setCurrentJob(job);
    updateJob(job.id, { status: 'sending', startedAt: Date.now(), progress: 0 });

    const data = job.compiledBytes;
    if (!data || data.length === 0) {
      log('runJob failed: no data');
      updateJob(job.id, { status: 'failed', error: '无数据', finishedAt: Date.now() });
      addHistory({
        id: `hist-${job.id}`,
        job: { ...job, status: 'failed', error: '无数据', finishedAt: Date.now() },
      });
      setCurrentJob(null);
      return;
    }

    let lastError: string | null = null;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      log(`runJob attempt ${attempt}/${MAX_RETRIES}`);
      try {
        updateJob(job.id, {
          totalBytes: data.length,
          bytesSent: 0,
        });
        log('calling write, data length:', data.length);
        await write(data);
        log('write success');
        updateJob(job.id, {
          status: 'success',
          progress: 100,
          bytesSent: data.length,
          finishedAt: Date.now(),
        });
        const historyEntry: PrintHistoryEntry = {
          id: `hist-${job.id}`,
          job: { ...job, status: 'success', progress: 100, finishedAt: Date.now() },
        };
        addHistory(historyEntry);
        setCurrentJob(null);
        message.success(`打印完成 (${data.length} 字节)`);
        return;
      } catch (e) {
        lastError = (e as Error).message;
        log(`runJob attempt ${attempt} failed:`, lastError);
        if (attempt < MAX_RETRIES) {
          await new Promise(r => setTimeout(r, RETRY_DELAY));
        }
      }
    }

    log('runJob final failed:', lastError);
    updateJob(job.id, { status: 'failed', error: lastError || '未知错误', finishedAt: Date.now() });
    addHistory({
      id: `hist-${job.id}`,
      job: { ...job, status: 'failed', error: lastError || '未知错误', finishedAt: Date.now() },
    });
    setCurrentJob(null);
    message.error(`打印失败: ${lastError}`);
  }, [write, setCurrentJob, updateJob, addHistory]);

  // 队列消费循环
  useEffect(() => {
    log('useEffect check:', {
      globalProcessing: globalProcessingJobId,
      currentJob,
      queueLength: queue.length,
      connectionState,
    });
    if (currentJob) return;
    if (queue.length === 0) return;
    if (connectionState !== 'connected') return;

    const nextJob = queue[0];
    if (globalProcessingJobId) return;

    log('start processing job:', nextJob.id);
    globalProcessingJobId = nextJob.id;
    removeJob(nextJob.id);
    runJob(nextJob).finally(() => {
      globalProcessingJobId = null;
    });
  }, [queue, currentJob, connectionState, runJob, removeJob]);

  const enqueue = useCallback((job: PrintJob) => {
    log('enqueue called, connectionState:', connectionState);
    if (connectionState !== 'connected') {
      message.warning('请先连接打印机');
      return;
    }
    enqueueJob(job);
    message.info('已加入打印队列');
  }, [connectionState, enqueueJob]);

  const cancelJob = useCallback((jobId: string) => {
    removeJob(jobId);
    message.info('已取消');
  }, [removeJob]);

  const printTestPage = useCallback(() => {
    log('printTestPage (self-test) called');
    if (connectionState !== 'connected') {
      message.warning('请先连接打印机');
      return;
    }
    const bytes = generateSelfTestBytes(profile);
    const job: PrintJob = {
      id: `job-selftest-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      mode: 'command',
      compiledBytes: bytes,
      status: 'pending',
      progress: 0,
      createdAt: Date.now(),
      deviceId: connectedDevice?.id,
      deviceName: connectedDevice?.name,
    };
    enqueueJob(job);
    message.info(profile.protocol === 'tspl' ? '已发送 SELFTEST 指令，打印机将打印自检页' : '自检样张已加入打印队列');
  }, [connectionState, profile, connectedDevice, enqueueJob]);

  return { queue, currentJob, enqueue, cancelJob, printTestPage };
}
