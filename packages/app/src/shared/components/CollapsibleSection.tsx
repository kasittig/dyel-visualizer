import { useState } from 'react';
import type React from 'react';

export function CollapsibleSection({
  label,
  children,
  trailing,
}: {
  label: string;
  children: React.ReactNode;
  trailing?: React.ReactNode;
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  return (
    <>
      <button className="tab-title" onClick={() => setIsExpanded((v) => !v)}>
        <span className="tab-title-toggle">{isExpanded ? '▾' : '▸'}</span>
        <span className="tab-title-label">{label}</span>
        {trailing}
      </button>
      {isExpanded && children}
    </>
  );
}
