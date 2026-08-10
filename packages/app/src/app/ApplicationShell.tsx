import { useRef } from 'react';
import type { KeyboardEvent, ReactNode } from 'react';
import clsx from 'clsx';
import {
  APP_DESTINATIONS,
  destinationForPage,
  destinationHref,
  type AppDestination,
} from '../shared/pageRouting';
import styles from './ApplicationShell.module.css';

export function ApplicationShell({ page, children }: { page: string | null; children: ReactNode }) {
  const activeDestination = destinationForPage(page);
  const links = useRef<Array<HTMLAnchorElement | null>>([]);

  const handleKeyDown = (event: KeyboardEvent<HTMLAnchorElement>, index: number) => {
    let nextIndex: number | undefined;
    if (event.key === 'ArrowRight') {
      nextIndex = (index + 1) % APP_DESTINATIONS.length;
    }
    if (event.key === 'ArrowLeft') {
      nextIndex = (index - 1 + APP_DESTINATIONS.length) % APP_DESTINATIONS.length;
    }
    if (event.key === 'Home') {
      nextIndex = 0;
    }
    if (event.key === 'End') {
      nextIndex = APP_DESTINATIONS.length - 1;
    }
    if (nextIndex === undefined) {
      return;
    }
    event.preventDefault();
    links.current[nextIndex]?.focus();
  };

  const renderLink = (
    { id, label, mobileLabel }: (typeof APP_DESTINATIONS)[number],
    index: number,
    mobile = false
  ) => (
    <a
      key={id}
      ref={mobile ? undefined : (node) => void (links.current[index] = node)}
      href={destinationHref(id as AppDestination)}
      className={clsx(styles.navLink, mobile && styles.mobileLink)}
      aria-current={activeDestination === id ? 'page' : undefined}
      onKeyDown={mobile ? undefined : (event) => handleKeyDown(event, index)}
    >
      {mobile ? mobileLabel : label}
    </a>
  );

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <a className={styles.brand} href={destinationHref('my-training')} aria-label="DYEL home">
          DYEL
        </a>
        <nav className={styles.desktopNav} aria-label="Primary navigation">
          {APP_DESTINATIONS.map((destination, index) => renderLink(destination, index))}
        </nav>
      </header>
      <div className={styles.body}>{children}</div>
      <nav className={styles.mobileNav} aria-label="Primary navigation">
        {APP_DESTINATIONS.map((destination, index) => renderLink(destination, index, true))}
      </nav>
    </div>
  );
}
