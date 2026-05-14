import { useEffect, useRef, useState } from 'react';
import { X, Minimize2, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

export interface LogEntry {
  type: 'start' | 'log' | 'progress' | 'done' | 'error';
  message: string;
  step?: string;
  progress?: number;
  records?: number;
  errors?: number;
  timestamp: Date;
}

interface SyncProgressModalProps {
  logs: LogEntry[];
  progress: number;
  isOpen: boolean;
  isMinimized: boolean;
  onClose: () => void;
  onMinimize: () => void;
  onRestore: () => void;
  isDone: boolean;
  totalRecords: number;
  totalErrors: number;
}

export default function SyncProgressModal({
  logs,
  progress,
  isOpen,
  isMinimized,
  onClose,
  onMinimize,
  onRestore,
  isDone,
  totalRecords,
  totalErrors,
}: SyncProgressModalProps) {
  const logContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  if (!isOpen && !isMinimized) return null;

  if (isMinimized) {
    return (
      <div
        onClick={onRestore}
        className="fixed bottom-4 right-4 z-50 flex cursor-pointer items-center gap-3 rounded-xl border border-gray-700 bg-gray-900 px-5 py-3 shadow-2xl transition-all hover:bg-gray-800"
      >
        {isDone ? (
          <CheckCircle size={20} className={totalErrors > 0 ? 'text-yellow-400' : 'text-green-400'} />
        ) : (
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
        )}
        <div className="flex flex-col">
          <span className="text-sm font-medium text-white">
            {isDone
              ? `Concluído: ${totalRecords} registros`
              : `Sincronizando... ${progress}%`}
          </span>
          <div className="mt-1 h-1.5 w-40 overflow-hidden rounded-full bg-gray-700">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                isDone ? (totalErrors > 0 ? 'bg-yellow-400' : 'bg-green-400') : 'bg-blue-500'
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="flex max-h-[80vh] w-full max-w-2xl flex-col rounded-2xl border border-gray-700 bg-gray-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-800 px-6 py-4">
          <h3 className="text-lg font-semibold text-white">
            {isDone ? (
              <span className="flex items-center gap-2">
                <CheckCircle size={20} className="text-green-400" />
                Sincronização Concluída
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Loader2 size={20} className="animate-spin text-blue-400" />
                Sincronizando...
              </span>
            )}
          </h3>
          <div className="flex items-center gap-2">
            <button
              onClick={onMinimize}
              className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-800 hover:text-white"
              title="Minimizar (sync continua)"
            >
              <Minimize2 size={18} />
            </button>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-800 hover:text-white"
              title="Fechar"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="px-6 py-3">
          <div className="flex items-center justify-between text-sm text-gray-400">
            <span>Progresso</span>
            <span>{progress}%</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-800">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                isDone ? (totalErrors > 0 ? 'bg-yellow-400' : 'bg-green-400') : 'bg-blue-500'
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div
          ref={logContainerRef}
          className="flex-1 overflow-y-auto px-6 py-3 font-mono text-sm"
          style={{ minHeight: '200px', maxHeight: '400px' }}
        >
          {logs.map((log, idx) => (
            <div
              key={idx}
              className={`py-0.5 ${
                log.type === 'error'
                  ? 'text-red-400'
                  : log.type === 'done'
                    ? 'text-green-400'
                    : log.type === 'start'
                      ? 'text-blue-400 font-semibold'
                      : 'text-gray-300'
              }`}
            >
              <span className="mr-2 text-gray-600">
                {log.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
              {log.message}
            </div>
          ))}
          {!isDone && (
            <div className="mt-2 text-gray-500">
              <span className="animate-pulse">▌</span>
            </div>
          )}
        </div>

        {isDone && (
          <div className="flex items-center justify-between border-t border-gray-800 px-6 py-4">
            <div className="flex items-center gap-4 text-sm">
              <span className="flex items-center gap-1 text-green-400">
                <CheckCircle size={16} />
                {totalRecords} registros
              </span>
              {totalErrors > 0 && (
                <span className="flex items-center gap-1 text-red-400">
                  <AlertCircle size={16} />
                  {totalErrors} erros
                </span>
              )}
            </div>
            <button
              onClick={onClose}
              className="rounded-lg bg-gray-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-600"
            >
              Fechar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
