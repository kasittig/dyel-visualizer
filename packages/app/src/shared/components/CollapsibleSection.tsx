import { useEffect, useId, useRef } from 'react';
import type React from 'react';
import { useLocalStorageState } from '../hooks';

const deserializeExpanded = (raw: string) => {
  const value: unknown = JSON.parse(raw);
  if (typeof value !== 'boolean') {
    throw new TypeError('Stored section state must be a boolean');
  }
  return value;
};

interface CollapsibleSectionProps {
  label: string;
  children: React.ReactNode;
  trailing?: React.ReactNode;
  persistenceId: string;
  summary?: React.ReactNode;
  defaultExpanded?: boolean;
  expandRequest?: number;
  enabled?: boolean;
}

export function CollapsibleSection({ enabled = true, ...props }: CollapsibleSectionProps) {
  if (!enabled) {
    return props.children;
  }
  return <PersistedCollapsibleSection key={props.persistenceId} {...props} />;
}

function PersistedCollapsibleSection({
  label,
  children,
  trailing,
  persistenceId,
  summary,
  defaultExpanded = true,
  expandRequest = 0,
}: CollapsibleSectionProps) {
  const [isExpanded, setIsExpanded] = useLocalStorageState(
    `dyel:collapsibleSection:${persistenceId}`,
    defaultExpanded,
    { deserialize: deserializeExpanded }
  );
  const generatedId = useId();
  const triggerId = `${generatedId}-trigger`;
  const regionId = `${generatedId}-region`;
  const triggerRef = useRef<HTMLButtonElement>(null);
  const handledExpandRequest = useRef(0);

  useEffect(() => {
    if (expandRequest <= handledExpandRequest.current) {
      return;
    }
    handledExpandRequest.current = expandRequest;
    setIsExpanded(true);
    triggerRef.current?.focus({ preventScroll: true });
    triggerRef.current?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
  }, [expandRequest, setIsExpanded]);

  return (
    <>
      <button
        ref={triggerRef}
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
        {!isExpanded && summary != null && <span className="tab-title-summary">{summary}</span>}
        {trailing}
      </button>
      {isExpanded && (
        <div id={regionId} role="region" aria-labelledby={triggerId}>
          {children}
        </div>
      )}
    </>
  );
}
