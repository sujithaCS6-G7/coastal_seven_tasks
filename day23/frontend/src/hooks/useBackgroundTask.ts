import { useState, useEffect, useRef, useCallback } from 'react';
import { getErrorMessage } from '../api/axiosClient';
import { taskService } from '../api/taskService';
import type { BackgroundTaskResponse, BackgroundTaskStatus } from '../types/api';

export interface UseBackgroundTaskOptions<TResult, TArgs extends unknown[]> {
  /** Function that initiates the Celery task and returns the initial BackgroundTaskResponse */
  starterFn: (...args: TArgs) => Promise<BackgroundTaskResponse<TResult>>;
  /** Polling interval in milliseconds (default: 350ms) */
  pollIntervalMs?: number;
  /** Optional callback fired when the task reaches COMPLETED state */
  onSuccess?: (result: TResult, response: BackgroundTaskResponse<TResult>) => void;
  /** Optional callback fired when the task reaches FAILED state */
  onError?: (errorMessage: string) => void;
}

export interface UseBackgroundTaskReturn<TResult, TArgs extends unknown[]> {
  taskId: string | null;
  status: BackgroundTaskStatus;
  progress: number;
  stage: string;
  result: TResult | null;
  error: string | null;
  isPolling: boolean;
  isRunning: boolean;
  startTask: (...args: TArgs) => Promise<BackgroundTaskResponse<TResult> | null>;
  resetTask: () => void;
}

function normalizeStatus(raw?: string | null): BackgroundTaskStatus {
  const upper = (raw || '').toUpperCase();
  if (upper === 'COMPLETED' || upper === 'SUCCESS') return 'COMPLETED';
  if (upper === 'FAILED' || upper === 'FAILURE' || upper === 'REVOKED') return 'FAILED';
  if (upper === 'STARTED' || upper === 'PROGRESS' || upper === 'RUNNING') return 'STARTED';
  if (upper === 'PENDING') return 'PENDING';
  return 'IDLE';
}

/**
 * Day 18: Reusable React Hook for Celery Background Task Lifecycle
 * Manages starting a background task, storing task_id, polling GET /tasks/{task_id},
 * updating live progress (0-100%), and stopping polling automatically on COMPLETED or FAILED.
 */
export function useBackgroundTask<TResult = unknown, TArgs extends unknown[] = []>({
  starterFn,
  pollIntervalMs = 350,
  onSuccess,
  onError,
}: UseBackgroundTaskOptions<TResult, TArgs>): UseBackgroundTaskReturn<TResult, TArgs> {
  const [taskId, setTaskId] = useState<string | null>(null);
  const [status, setStatus] = useState<BackgroundTaskStatus>('IDLE');
  const [progress, setProgress] = useState<number>(0);
  const [stage, setStage] = useState<string>('');
  const [result, setResult] = useState<TResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPolling, setIsPolling] = useState<boolean>(false);

  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isMountedRef = useRef<boolean>(true);
  const onSuccessRef = useRef(onSuccess);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onSuccessRef.current = onSuccess;
    onErrorRef.current = onError;
  }, [onSuccess, onError]);

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    if (isMountedRef.current) {
      setIsPolling(false);
    }
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
  }, []);

  const applyTaskResponse = useCallback(
    (data: BackgroundTaskResponse<TResult>) => {
      if (!isMountedRef.current) return;
      const nextStatus = normalizeStatus(data.status);
      setStatus(nextStatus);
      setProgress(typeof data.progress === 'number' ? data.progress : nextStatus === 'COMPLETED' ? 100 : 0);
      setStage(data.stage || `Task is ${nextStatus.toLowerCase()}`);

      if (data.result !== undefined && data.result !== null) {
        setResult(data.result);
      }

      if (nextStatus === 'COMPLETED') {
        stopPolling();
        setError(null);
        if (data.result !== undefined && data.result !== null) {
          onSuccessRef.current?.(data.result, data);
        }
      } else if (nextStatus === 'FAILED') {
        stopPolling();
        const errText = data.error || 'Background task failed.';
        setError(errText);
        onErrorRef.current?.(errText);
      }
    },
    [stopPolling]
  );

  // Poll GET /tasks/{taskId} while in PENDING or STARTED state
  useEffect(() => {
    if (!taskId || (status !== 'PENDING' && status !== 'STARTED')) {
      return;
    }

    setIsPolling(true);

    const pollOnce = async () => {
      try {
        const taskData = await taskService.getTaskStatus<TResult>(taskId);
        applyTaskResponse(taskData);
      } catch (err) {
        if (!isMountedRef.current) return;
        const msg = getErrorMessage(err);
        stopPolling();
        setStatus('FAILED');
        setError(msg);
        onErrorRef.current?.(msg);
      }
    };

    pollTimerRef.current = setInterval(pollOnce, pollIntervalMs);

    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current);
        pollTimerRef.current = null;
      }
    };
  }, [taskId, status, pollIntervalMs, applyTaskResponse, stopPolling]);

  const startTask = useCallback(
    async (...args: TArgs): Promise<BackgroundTaskResponse<TResult> | null> => {
      stopPolling();
      setError(null);
      setResult(null);
      setProgress(5);
      setStatus('PENDING');
      setStage('Starting Celery background task...');

      try {
        const initialResponse = await starterFn(...args);
        if (!isMountedRef.current) return initialResponse;
        setTaskId(initialResponse.task_id);
        applyTaskResponse(initialResponse);
        return initialResponse;
      } catch (err) {
        if (!isMountedRef.current) return null;
        const msg = getErrorMessage(err);
        setStatus('FAILED');
        setProgress(0);
        setStage('Failed to start task');
        setError(msg);
        onErrorRef.current?.(msg);
        return null;
      }
    },
    [starterFn, stopPolling, applyTaskResponse]
  );

  const resetTask = useCallback(() => {
    stopPolling();
    setTaskId(null);
    setStatus('IDLE');
    setProgress(0);
    setStage('');
    setResult(null);
    setError(null);
  }, [stopPolling]);

  return {
    taskId,
    status,
    progress,
    stage,
    result,
    error,
    isPolling,
    isRunning: status === 'PENDING' || status === 'STARTED',
    startTask,
    resetTask,
  };
}

export default useBackgroundTask;
