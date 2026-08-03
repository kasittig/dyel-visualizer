import { useRef } from 'react';
import clsx from 'clsx';
import type { KeyboardEvent, ReactNode } from 'react';
import type { PageTab } from './appTabs';
import { PRIMARY_TABPANEL_ID, primaryTabId } from './appTabA11y';
import styles from './App.module.css';

export interface PrimaryTab {
  id: PageTab;
  label: string;
  accessibleLabel?: string;
}

export function PrimaryTabs({
  tabs,
  activeTab,
  onSelect,
  trailing,
}: {
  tabs: PrimaryTab[];
  activeTab: PageTab;
  onSelect: (tab: PageTab) => void;
  trailing?: ReactNode;
}) {
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let nextIndex: number | undefined;
    if (event.key === 'ArrowRight') {
      nextIndex = (index + 1) % tabs.length;
    }
    if (event.key === 'ArrowLeft') {
      nextIndex = (index - 1 + tabs.length) % tabs.length;
    }
    if (event.key === 'Home') {
      nextIndex = 0;
    }
    if (event.key === 'End') {
      nextIndex = tabs.length - 1;
    }
    if (nextIndex === undefined) {
      return;
    }

    event.preventDefault();
    onSelect(tabs[nextIndex]!.id);
    tabRefs.current[nextIndex]?.focus();
  };

  return (
    <div className={styles.tabNav}>
      <nav className={styles.viewNav} aria-label="Visualization views">
        <div className={styles.tabList} role="tablist" aria-label="Visualization">
          {tabs.map(({ id, label, accessibleLabel }, index) => (
          <button
            key={id}
            ref={(node) => {
              tabRefs.current[index] = node;
            }}
            id={primaryTabId(id)}
            type="button"
            role="tab"
            aria-label={accessibleLabel}
            aria-selected={activeTab === id}
            aria-controls={PRIMARY_TABPANEL_ID}
            tabIndex={activeTab === id ? 0 : -1}
            onClick={() => onSelect(id)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            className={clsx(styles.tab, activeTab === id && styles.tabActive)}
          >
            {label}
          </button>
          ))}
        </div>
      </nav>
      {trailing}
    </div>
  );
}
