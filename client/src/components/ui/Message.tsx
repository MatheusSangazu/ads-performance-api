import type { ReactNode } from 'react';

interface MessageProps {
  type: 'success' | 'error';
  children: ReactNode;
}

export default function Message({ type, children }: MessageProps) {
  return (
    <div
      className={`mb-4 rounded-xl px-4 py-3 text-sm font-medium animate-in fade-in slide-in-from-top-1 ${
        type === 'success'
          ? 'bg-green-50 text-green-700 border border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800'
          : 'bg-red-50 text-red-700 border border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800'
      }`}
    >
      {children}
    </div>
  );
}
