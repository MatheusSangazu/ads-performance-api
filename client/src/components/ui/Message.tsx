import type { ReactNode } from 'react';

interface MessageProps {
  type: 'success' | 'error';
  children: ReactNode;
}

export default function Message({ type, children }: MessageProps) {
  return (
    <div
      className={`mb-4 rounded-lg px-4 py-3 text-sm ${
        type === 'success'
          ? 'bg-green-900/50 text-green-300 border border-green-800'
          : 'bg-red-900/50 text-red-300 border border-red-800'
      }`}
    >
      {children}
    </div>
  );
}
