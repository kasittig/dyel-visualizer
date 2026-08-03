import { useId } from 'react';
import type React from 'react';
import { useLocalStorageState } from '../hooks';

const deserializeExpanded = (raw: string) => {
  const value: unknown = JSON.parse(raw);
  if (typeof value !== 'boolean') {
    throw new TypeError('Stored section state must be a boolean');
  }
  return value;
};

export function CollapsibleSection({
  label,
  children,
  trailing,
  persistenceId,
}: {
  label: string;
  children: React.ReactNode;
  trailing?: React.ReactNode;
  persistenceId: string;
}) {
  const [isExpanded, setIsExpanded] = useLocalStorageState(
    `dyel:collapsibleSection:${persistenceId}`,
    true,
    { deserialize: deserializeExpanded }
  );
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
