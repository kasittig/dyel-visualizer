import { useId, useState } from 'react';
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
  const generatedId = useId();
  const triggerId = `${generatedId}-trigger`;
  const regionId = `${generatedId}-region`;
  return (
    <>
      <button
        id={triggerId}
        type="button"
        className="tab-title"
        aria-expanded={isExpanded}
        aria-controls={regionId}
        onClick={() => setIsExpanded((v) => !v)}
      >
        <span className="tab-title-toggle" aria-hidden="true">
          {isExpanded ? '▾' : '▸'}
        </span>
        <span className="tab-title-label">{label}</span>
        {trailing}
      </button>
      <div id={regionId} role="region" aria-labelledby={triggerId} hidden={!isExpanded}>
        {children}
      </div>
    </>
  );
}
