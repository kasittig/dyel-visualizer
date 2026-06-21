import type React from 'react';

/** Shared floating card used by the Recharts custom tooltips across the charts. */
export function TooltipCard({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        background: 'var(--bg, #fff)',
        border: '1px solid var(--border, #ccc)',
        borderRadius: 4,
        padding: '6px 10px',
        fontSize: '0.8rem',
        lineHeight: 1.5,
      }}
    >
      {children}
    </div>
  );
}
