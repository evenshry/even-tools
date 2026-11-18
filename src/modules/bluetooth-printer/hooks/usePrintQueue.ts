// 打印队列 Hook - 异步消费队列，发送到打印机

import { useEffect, useCallback } from 'react';
import { message } from 'antd';
import { usePrinterStore } from '../store/usePrinterStore';
import { useBluetoothPrinter } from './useBluetoothPrinter';
import { generateSelfTestBytes } from '../utils/testPage';
import type { PrintJob, PrintHistoryEntry } from '../data/interface';

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;
const DEBUG = import.meta.env.DEV;

function log(...args: unknown[]) {
  if (DEBUG) console.log('[usePrintQueue]', ...args);
}

// 提取可持久化的文本预览，避免把二进制/图片写进历史
function buildPreview(job: PrintJob): string | undefined {
  if (job.compiledText) return job.compiledText.slice(0, 200);
  if (job.commandInput?.raw) return job.commandInput.raw.slice(0, 200);
  if (job.elements?.length) {
    return job.elements
      .map((el) => {
        switch (el.type) {
          case 'text': return el.content;
          case 'barcode': return `[条码] ${el.content}`;
          case 'qrcode': return `[二维码] ${el.content}`;
          case 'divider': return '[分割线]';
          case 'table': return '[表格]';
          case 'image': return '[图片]';
          default: return '';
        }
      })
      .filter(Boolean)
      .join(' | ')
      .slice(0, 200);
  }
  return undefined;
}

// 全局锁，防止多个组件实例同时处理同一个任务
let globalProcessingJobId: string | null = null;

export function usePrintQueue() {
  const queue = usePrinterStore((s) => s.queue);
  const currentJob = usePrinterStore((s) => s.currentJob);
  const enqueueJob = usePrinterStore((s) => s.enqueueJob);
  const setCurrentJob = usePrinterStore((s) => s.setCurrentJob);
  const updateJob = usePrinterStore((s) => s.updateJob);
  const removeJob = usePrinterStore((s) => s.removeJob);
  const addHistory = usePrinterStore((s) => s.addHistory);
  const profile = usePrinterStore((s) => s.profile);
  const connectedDevice = usePrinterStore((s) => s.connectedDevice);
  const { write, connectionState } = useBluetoothPrinter();

  log('render hook, connectionState:', connectionState, 'queue.length:', queue.length, 'currentJob:', currentJob?.id);

  const runJob = useCallback(async (job: PrintJob) => {
    log('runJob start:', job.id);
    setCurrentJob(job);
    updateJob(job.id, { status: 'sending', startedAt: Date.now(), progress: 0 });

    const data = job.compiledBytes;
    const buildHistoryEntry = (status: PrintJob['status'], error?: string): PrintHistoryEntry => ({
      id: `hist-${job.id}`,
      preview: buildPreview(job),
      job: {
        ...job,
        status,
        error,
        progress: status === 'success' ? 100 : job.progress,
        finishedAt: Date.now(),
      },
    });

    if (!data || data.length === 0) {
      log('runJob failed: no data');
      updateJob(job.id, { status: 'failed', error: '无数据', finishedAt: Date.now() });
      addHistory(buildHistoryEntry('failed', '无数据'));
      setCurrentJob(null);
      return;
    }

    let lastError: string | null = null;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      log(`runJob attempt ${attempt}/${MAX_RETRIES}`);
      // 只要发出了任意分片，就不再自动重试，否则会重复打印
      let sentAny = false;
      try {
        updateJob(job.id, { totalBytes: data.length, bytesSent: 0 });
        await write(data, (sent, total) => {
          if (sent > 0) sentAny = true;
          updateJob(job.id, {
            bytesSent: sent,
            totalBytes: total,
            progress: total > 0 ? Math.round((sent / total) * 100) : 0,
          });
        });
        log('write success');
        updateJob(job.id, {
          status: 'success',
          progress: 100,
          bytesSent: data.length,
          finishedAt: Date.now(),
        });
        addHistory(buildHistoryEntry('success'));
        setCurrentJob(null);
        message.success(`打印完成 (${data.length} 字节)`);
        return;
      } catch (e) {
        lastError = (e as Error).message;
        log(`runJob attempt ${attempt} failed:`, lastError);
        if (sentAny) {
          lastError = `${lastError}（已发送部分数据，为避免重复打印已停止重试）`;
          break;
        }
        if (attempt < MAX_RETRIES) {
          await new Promise(r => setTimeout(r, RETRY_DELAY));
        }
      }
    }

    log('runJob final failed:', lastError);
    updateJob(job.id, { status: 'failed', error: lastError || '未知错误', finishedAt: Date.now() });
    addHistory(buildHistoryEntry('failed', lastError || '未知错误'));
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
    if (!nextJob) return;
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
