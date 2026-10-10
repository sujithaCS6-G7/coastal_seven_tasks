import React, { useState, useCallback } from 'react';
import { useBackgroundTask } from '../hooks/useBackgroundTask';
import { taskService } from '../api/taskService';
import { useInvalidateProducts } from '../hooks/useProducts';
import { getErrorMessage } from '../api/axiosClient';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/card';
import { useToast } from './ui/toast';
import {
  FileText,
  Download,
  Upload,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Database,
  Sparkles,
  FileSpreadsheet,
  RotateCcw,
} from 'lucide-react';
import type {
  BackgroundTaskStatus,
  CsvImportTaskResult,
  N1OptimizationBenchmark,
  PdfInvoiceTaskResult,
} from '../types/api';

const SAMPLE_CSV_TEXT = `name,category,price,stock,description,image_url
iPhone 16 Pro Max,Electronics,1199.99,30,Flagship smartphone with A18 Pro chip and Titanium frame,http://127.0.0.1:8003/uploads/products/laptop.jpg
MacBook Air M3 15-inch,Electronics,1399.00,18,Ultra-thin Apple Silicon laptop with 18-hour battery life,http://127.0.0.1:8003/uploads/products/laptop.jpg
Sony WH-1000XM5 Wireless,Audio,349.99,42,Industry-leading wireless noise-cancelling studio headphones,http://127.0.0.1:8003/uploads/products/headphones.jpg
Keychron Q1 Pro Mechanical Keyboard,Accessories,199.00,25,Custom QMK/VIA wireless mechanical keyboard with CNC aluminum body,http://127.0.0.1:8003/uploads/products/broken_404_image.jpg
LG UltraGear 32-inch OLED 240Hz,Displays,899.99,12,4K UHD OLED gaming monitor with 0.03ms response time,
Invalid Demo Row,Accessories,-15.00,10,Intentional invalid row with negative price to demonstrate error handling,http://127.0.0.1:8003/uploads/products/keyboard.jpg`;

export interface TaskLifecycleTrackerProps {
  taskId: string | null;
  status: BackgroundTaskStatus;
  progress: number;
  stage: string;
  error: string | null;
  testIdPrefix?: string;
}

/**
 * Reusable Celery Task Lifecycle Progress Bar & Status Badge
 */
export const TaskLifecycleTracker: React.FC<TaskLifecycleTrackerProps> = ({
  taskId,
  status,
  progress,
  stage,
  error,
  testIdPrefix = 'celery-task',
}) => {
  if (status === 'IDLE') return null;

  const statusBadge = () => {
    switch (status) {
      case 'PENDING':
        return (
          <Badge
            variant="secondary"
            data-testid={`${testIdPrefix}-status-badge`}
            className="gap-1 text-[11px] bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30"
          >
            <Clock className="h-3 w-3 animate-pulse" /> PENDING
          </Badge>
        );
      case 'STARTED':
        return (
          <Badge
            variant="default"
            data-testid={`${testIdPrefix}-status-badge`}
            className="gap-1 text-[11px] bg-blue-600 text-white"
          >
            <Loader2 className="h-3 w-3 animate-spin" /> RUNNING ({progress}%)
          </Badge>
        );
      case 'COMPLETED':
        return (
          <Badge
            variant="default"
            data-testid={`${testIdPrefix}-status-badge`}
            className="gap-1 text-[11px] bg-emerald-600 text-white"
          >
            <CheckCircle2 className="h-3 w-3" /> COMPLETED
          </Badge>
        );
      case 'FAILED':
        return (
          <Badge
            variant="destructive"
            data-testid={`${testIdPrefix}-status-badge`}
            className="gap-1 text-[11px]"
          >
            <AlertCircle className="h-3 w-3" /> FAILED
          </Badge>
        );
      default:
        return null;
    }
  };

  return (
    <div
      data-testid={`${testIdPrefix}-tracker`}
      className="rounded-xl border border-border bg-muted/30 p-3.5 space-y-2.5 text-xs"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {statusBadge()}
          {taskId && (
            <span
              data-testid={`${testIdPrefix}-id`}
              className="font-mono text-[10px] text-muted-foreground"
            >
              Task ID: {taskId.slice(0, 12)}...
            </span>
          )}
        </div>
        <span
          data-testid={`${testIdPrefix}-progress-label`}
          className="font-mono font-bold text-foreground"
        >
          {progress}%
        </span>
      </div>

      {/* Progress Bar */}
      <div
        role="progressbar"
        aria-label="Celery task progress"
        aria-valuenow={progress}
        aria-valuemin={0}
        aria-valuemax={100}
        data-testid={`${testIdPrefix}-progressbar`}
        className="w-full h-2.5 rounded-full bg-secondary overflow-hidden"
      >
        <div
          className={`h-full transition-all duration-300 rounded-full ${
            status === 'FAILED'
              ? 'bg-destructive'
              : status === 'COMPLETED'
                ? 'bg-emerald-600'
                : 'bg-primary'
          }`}
          style={{ width: `${Math.max(4, Math.min(100, progress))}%` }}
        />
      </div>

      {stage && (
        <p data-testid={`${testIdPrefix}-stage`} className="text-[11px] text-muted-foreground">
          {stage}
        </p>
      )}

      {error && (
        <div
          role="alert"
          data-testid={`${testIdPrefix}-error`}
          className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive flex items-center gap-1.5"
        >
          <AlertCircle className="h-3.5 w-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};

export interface OrderInvoiceGeneratorProps {
  orderId: number;
  orderNumber: string;
}

/**
 * Day 18: Per-Order Asynchronous PDF Invoice Generator & Downloader
 */
export const OrderInvoiceGenerator: React.FC<OrderInvoiceGeneratorProps> = ({
  orderId,
  orderNumber,
}) => {
  const { toast } = useToast();

  const starterFn = useCallback(() => taskService.startInvoiceGeneration(orderId), [orderId]);

  const {
    taskId,
    status,
    progress,
    stage,
    result,
    error,
    isRunning,
    startTask,
  } = useBackgroundTask<PdfInvoiceTaskResult>({
    starterFn,
    pollIntervalMs: 300,
    onSuccess: (res) => {
      toast({
        title: 'PDF Invoice Ready',
        description: `Invoice ${res.filename} (${(res.file_size_bytes / 1024).toFixed(1)} KB) generated via Celery.`,
        variant: 'success',
      });
    },
    onError: (errMsg) => {
      toast({
        title: 'Invoice Generation Failed',
        description: errMsg,
        variant: 'destructive',
      });
    },
  });

  const downloadUrl = taskService.getInvoiceDownloadUrl(orderId);

  return (
    <div className="space-y-2.5 pt-2 border-t border-border/60">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          <span className="text-xs font-semibold text-foreground">
            Async PDF Invoice ({orderNumber})
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant={status === 'COMPLETED' ? 'outline' : 'default'}
            disabled={isRunning}
            onClick={() => startTask()}
            data-testid={`generate-invoice-btn-${orderId}`}
            className="h-8 text-xs gap-1.5"
          >
            {isRunning ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Generating PDF ({progress}%)...</span>
              </>
            ) : (
              <>
                <FileText className="h-3.5 w-3.5" />
                <span>{status === 'COMPLETED' ? 'Regenerate PDF Invoice' : 'Generate PDF Invoice'}</span>
              </>
            )}
          </Button>

          {status === 'COMPLETED' && result && (
            <a
              href={downloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              download={result.filename || `invoice_${orderNumber}.pdf`}
              data-testid={`download-invoice-link-${orderId}`}
              className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white px-3 h-8 text-xs font-semibold shadow-sm transition-colors"
            >
              <Download className="h-3.5 w-3.5" />
              <span>Download PDF ({result.filename})</span>
            </a>
          )}
        </div>
      </div>

      <TaskLifecycleTracker
        taskId={taskId}
        status={status}
        progress={progress}
        stage={stage}
        error={error}
        testIdPrefix={`invoice-task-${orderId}`}
      />
    </div>
  );
};

/**
 * Day 18: Admin Background Jobs Center (Bulk CSV Product Import + N+1 SQL Query Optimization Benchmark)
 */
export const AdminBackgroundJobsCenter: React.FC = () => {
  const { toast } = useToast();
  const invalidateProducts = useInvalidateProducts();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [benchmarkData, setBenchmarkData] = useState<N1OptimizationBenchmark | null>(null);
  const [benchmarkLoading, setBenchmarkLoading] = useState<boolean>(false);
  const [benchmarkError, setBenchmarkError] = useState<string | null>(null);

  const csvStarter = useCallback((file: File) => taskService.startCsvImport(file), []);

  const {
    taskId: csvTaskId,
    status: csvStatus,
    progress: csvProgress,
    stage: csvStage,
    result: csvResult,
    error: csvError,
    isRunning: csvRunning,
    startTask: startCsvTask,
    resetTask: resetCsvTask,
  } = useBackgroundTask<CsvImportTaskResult, [File]>({
    starterFn: csvStarter,
    pollIntervalMs: 300,
    onSuccess: (res) => {
      invalidateProducts();
      toast({
        title: 'Bulk CSV Import Complete',
        description: `Imported ${res.success_count} of ${res.total_rows} products (${res.failure_count} failed).`,
        variant: 'success',
      });
    },
    onError: (errMsg) => {
      toast({
        title: 'Bulk CSV Import Failed',
        description: errMsg,
        variant: 'destructive',
      });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setSelectedFile(file);
  };

  const handleLoadSampleCsv = () => {
    const blob = new Blob([SAMPLE_CSV_TEXT], { type: 'text/csv' });
    const sample = new File([blob], 'sample_products_import.csv', { type: 'text/csv' });
    setSelectedFile(sample);
    toast({
      title: 'Sample CSV Loaded',
      description: 'Loaded sample_products_import.csv (5 valid products + 1 invalid demo row).',
      variant: 'info',
    });
  };

  const handleStartCsvImport = async () => {
    if (!selectedFile) {
      toast({
        title: 'No CSV File Selected',
        description: 'Please choose a .csv file or click "Load Sample CSV" first.',
        variant: 'destructive',
      });
      return;
    }
    await startCsvTask(selectedFile);
  };

  const handleRunN1Benchmark = async () => {
    setBenchmarkLoading(true);
    setBenchmarkError(null);
    try {
      const data = await taskService.getN1Benchmark();
      setBenchmarkData(data);
    } catch (err) {
      setBenchmarkError(getErrorMessage(err));
    } finally {
      setBenchmarkLoading(false);
    }
  };

  return (
    <div className="space-y-6" data-testid="admin-background-jobs-center">
      {/* Section 1: Bulk CSV Product Import via Celery */}
      <Card className="border border-border shadow-sm">
        <CardHeader className="border-b border-border pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-primary" />
                <span>Bulk CSV Product &amp; Image Import (Celery Background Task)</span>
              </CardTitle>
              <CardDescription className="text-xs mt-1">
                Upload a CSV catalog file (columns: <code>name, category, price, stock, description, image_url</code>) to validate rows, download &amp; optimize product images into <code>uploads/products/</code>, and track progress asynchronously via Celery.
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-xs border-primary/40 text-primary self-start">
              POST /tasks/csv-import
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="pt-5 space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <label
              htmlFor="csv-upload-input"
              className="flex-1 flex items-center justify-between rounded-xl border border-dashed border-border bg-muted/20 px-4 py-3 text-xs cursor-pointer hover:border-primary/50 transition-colors"
            >
              <div className="flex items-center gap-2.5 truncate">
                <Upload className="h-4 w-4 text-primary shrink-0" />
                <span className="font-medium text-foreground truncate">
                  {selectedFile
                    ? `${selectedFile.name} (${(selectedFile.size / 1024).toFixed(1)} KB)`
                    : 'Choose a .csv file to import products...'}
                </span>
              </div>
              <input
                id="csv-upload-input"
                data-testid="csv-file-input"
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileChange}
                className="sr-only"
              />
            </label>

            <div className="flex items-center gap-2 flex-wrap">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleLoadSampleCsv}
                data-testid="load-sample-csv-btn"
                className="text-xs gap-1.5"
              >
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                <span>Load Sample CSV</span>
              </Button>

              <Button
                type="button"
                size="sm"
                disabled={!selectedFile || csvRunning}
                onClick={handleStartCsvImport}
                data-testid="start-csv-import-btn"
                className="text-xs gap-1.5"
              >
                {csvRunning ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Importing ({csvProgress}%)...</span>
                  </>
                ) : (
                  <>
                    <Upload className="h-3.5 w-3.5" />
                    <span>Start Bulk CSV Import</span>
                  </>
                )}
              </Button>

              {csvStatus !== 'IDLE' && !csvRunning && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={resetCsvTask}
                  className="text-xs gap-1"
                >
                  <RotateCcw className="h-3.5 w-3.5" /> Reset
                </Button>
              )}
            </div>
          </div>

          <TaskLifecycleTracker
            taskId={csvTaskId}
            status={csvStatus}
            progress={csvProgress}
            stage={csvStage}
            error={csvError}
            testIdPrefix="csv-import-task"
          />

          {/* CSV Import Summary & Row Results */}
          {csvResult && (
            <div
              data-testid="csv-import-summary"
              className="rounded-xl border border-border bg-card p-4 space-y-4"
            >
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-center">
                <div className="rounded-lg border border-border bg-muted/20 p-3">
                  <span className="text-[11px] text-muted-foreground block">Total Rows</span>
                  <span
                    data-testid="csv-total-rows"
                    className="text-lg font-extrabold font-mono text-foreground"
                  >
                    {csvResult.total_rows}
                  </span>
                </div>
                <div className="rounded-lg border border-border bg-muted/20 p-3">
                  <span className="text-[11px] text-muted-foreground block">Processed Rows</span>
                  <span
                    data-testid="csv-processed-rows"
                    className="text-lg font-extrabold font-mono text-foreground"
                  >
                    {csvResult.processed_rows}
                  </span>
                </div>
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3">
                  <span className="text-[11px] text-emerald-700 dark:text-emerald-400 block">
                    Succeeded
                  </span>
                  <span
                    data-testid="csv-success-count"
                    className="text-lg font-extrabold font-mono text-emerald-600 dark:text-emerald-400"
                  >
                    {csvResult.success_count}
                  </span>
                </div>
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
                  <span className="text-[11px] text-amber-700 dark:text-amber-400 block">
                    Failed Rows
                  </span>
                  <span
                    data-testid="csv-failure-count"
                    className="text-lg font-extrabold font-mono text-amber-600 dark:text-amber-400"
                  >
                    {csvResult.failure_count}
                  </span>
                </div>
                <div className="rounded-lg border border-indigo-500/30 bg-indigo-500/10 p-3">
                  <span className="text-[11px] text-indigo-700 dark:text-indigo-400 block">
                    Images Saved
                  </span>
                  <span
                    data-testid="csv-images-downloaded-count"
                    className="text-lg font-extrabold font-mono text-indigo-600 dark:text-indigo-400"
                  >
                    {csvResult.image_downloaded_count ?? 0}
                  </span>
                </div>
                <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 p-3">
                  <span className="text-[11px] text-rose-700 dark:text-rose-400 block">
                    Image Failures
                  </span>
                  <span
                    data-testid="csv-images-failed-count"
                    className="text-lg font-extrabold font-mono text-rose-600 dark:text-rose-400"
                  >
                    {csvResult.image_failed_count ?? 0}
                  </span>
                </div>
              </div>

              {csvResult.imported_products?.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs font-bold text-foreground">
                    Imported / Updated Catalog Products ({csvResult.imported_products.length})
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {csvResult.imported_products.map((item) => (
                      <div
                        key={`${item.id}-${item.name}`}
                        className="flex flex-col justify-between rounded-lg border border-border bg-muted/20 px-3 py-2 text-xs gap-1.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="truncate pr-2">
                            <span className="font-semibold text-foreground">{item.name}</span>
                            <span className="text-[11px] text-muted-foreground ml-2">
                              ({item.category})
                            </span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="font-mono font-bold">${Number(item.price).toFixed(2)}</span>
                            <Badge variant="outline" className="text-[10px]">
                              {item.action}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex items-center justify-between gap-2 text-[11px] text-muted-foreground border-t border-border/50 pt-1">
                          <span className="font-mono truncate">
                            {item.saved_image_filename
                              ? `Saved: uploads/products/${item.saved_image_filename}`
                              : `Image: ${item.image_url || '/uploads/products/laptop.jpg'}`}
                          </span>
                          {item.image_status === 'downloaded' && (
                            <Badge className="bg-emerald-600 text-white text-[10px] px-1.5 py-0">
                              Image Saved
                            </Badge>
                          )}
                          {item.image_status === 'failed' && (
                            <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                              Image Failed (Fallback Used)
                            </Badge>
                          )}
                          {item.image_status === 'missing' && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                              No Image URL
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(csvResult.image_errors?.length ?? 0) > 0 && (
                <div className="space-y-1.5" data-testid="csv-image-errors">
                  <p className="text-xs font-bold text-amber-600 dark:text-amber-400">
                    Image Download Failures ({csvResult.image_errors?.length}) — Products Still Imported with Fallback Image
                  </p>
                  <div className="space-y-1">
                    {csvResult.image_errors?.map((imgErr, idx) => (
                      <div
                        key={`img-err-${imgErr.row}-${idx}`}
                        className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-300 flex flex-col gap-0.5"
                      >
                        <span>
                          <strong>Row #{imgErr.row}</strong> ({imgErr.name}) —{' '}
                          <code className="text-[11px]">{imgErr.image_url}</code>
                        </span>
                        <span className="text-[11px] opacity-90">{imgErr.error}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {csvResult.errors?.length > 0 && (
                <div className="space-y-1.5" data-testid="csv-row-errors">
                  <p className="text-xs font-bold text-destructive">
                    Row Validation Errors ({csvResult.errors.length})
                  </p>
                  <div className="space-y-1">
                    {csvResult.errors.map((errItem, idx) => (
                      <div
                        key={`${errItem.row}-${idx}`}
                        className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive flex items-center justify-between gap-2"
                      >
                        <span>
                          <strong>Row #{errItem.row}</strong> ({errItem.name}): {errItem.error}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Section 2: SQLAlchemy N+1 Query Optimization Live Benchmark */}
      <Card className="border border-border shadow-sm">
        <CardHeader className="border-b border-border pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Database className="h-5 w-5 text-indigo-500" />
                <span>SQLAlchemy N+1 Query Optimization Inspector</span>
              </CardTitle>
              <CardDescription className="text-xs mt-1">
                Compare actual PostgreSQL SQL statement counts between unoptimized lazy loading (<code>1 + 2N</code> queries) and eager loading with <code>joinedload(Order.user) + selectinload(Order.items)</code>.
              </CardDescription>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={benchmarkLoading}
              onClick={handleRunN1Benchmark}
              data-testid="run-n1-benchmark-btn"
              className="text-xs gap-1.5 self-start"
            >
              {benchmarkLoading ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  <span>Measuring SQL Queries...</span>
                </>
              ) : (
                <>
                  <Database className="h-3.5 w-3.5 text-indigo-500" />
                  <span>Run Live N+1 SQL Benchmark</span>
                </>
              )}
            </Button>
          </div>
        </CardHeader>

        <CardContent className="pt-4">
          {benchmarkError && (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
              {benchmarkError}
            </div>
          )}

          {!benchmarkData && !benchmarkLoading && !benchmarkError && (
            <p className="text-xs text-muted-foreground">
              Click <strong>Run Live N+1 SQL Benchmark</strong> to execute both query strategies against PostgreSQL and inspect the exact SQL query count reduction.
            </p>
          )}

          {benchmarkData && (
            <div
              data-testid="n1-benchmark-results"
              className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs"
            >
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-2">
                <Badge variant="outline" className="text-amber-600 border-amber-500/40">
                  BEFORE: Lazy Loading (N+1)
                </Badge>
                <p className="text-2xl font-extrabold font-mono text-foreground">
                  {benchmarkData.unoptimized_lazy_loading.sql_queries_executed} SQL Queries
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {benchmarkData.unoptimized_lazy_loading.formula}
                </p>
              </div>

              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 space-y-2">
                <Badge className="bg-emerald-600 text-white">
                  AFTER: Eager Loading (selectinload + joinedload)
                </Badge>
                <p
                  data-testid="n1-optimized-query-count"
                  className="text-2xl font-extrabold font-mono text-emerald-600 dark:text-emerald-400"
                >
                  {benchmarkData.optimized_eager_loading.sql_queries_executed} SQL Queries
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {benchmarkData.optimized_eager_loading.formula}
                </p>
              </div>

              <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/5 p-4 space-y-2">
                <Badge variant="secondary">Optimization Impact</Badge>
                <p className="text-2xl font-extrabold font-mono text-indigo-600 dark:text-indigo-400">
                  -{benchmarkData.reduction_percentage}% Queries
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Saved {benchmarkData.queries_saved} round-trip SQL queries across{' '}
                  {benchmarkData.orders_inspected} orders.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminBackgroundJobsCenter;
