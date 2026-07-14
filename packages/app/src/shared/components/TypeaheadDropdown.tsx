import { useState, useEffect, useRef } from 'react';
import * as Popover from '@radix-ui/react-popover';
import styles from './TypeaheadDropdown.module.css';

interface TypeaheadDropdownProps {
  options: string[];
  value: string | null;
  onChange: (value: string) => void;
  placeholder?: string;
  emptyMessage?: string;
}

export function TypeaheadDropdown({
  options,
  value,
  onChange,
  placeholder = 'Search...',
  emptyMessage = 'No matches',
}: TypeaheadDropdownProps) {
  const [open, setOpen] = useState(false);
  const [inputText, setInputText] = useState(value ?? '');
  const [focused, setFocused] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState<number | null>(null);
  const [showFullList, setShowFullList] = useState(false);

  const outerRef = useRef<HTMLDivElement>(null);
  const popoverContentRef = useRef<HTMLDivElement>(null);

  const visibleOptions = showFullList
    ? options
    : options.filter((opt) => opt.toLowerCase().includes(inputText.toLowerCase()));

  useEffect(() => {
    if (!focused && value !== null) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setInputText(value);
    }
  }, [value, focused]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const handleMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (!outerRef.current?.contains(target) && !popoverContentRef.current?.contains(target)) {
        setOpen(false);
        setShowFullList(false);
      }
    };
    document.addEventListener('mousedown', handleMouseDown, { capture: true });
    return () => document.removeEventListener('mousedown', handleMouseDown, { capture: true });
  }, [open]);

  const selectOption = (selected: string) => {
    setInputText(selected);
    onChange(selected);
    setOpen(false);
    setShowFullList(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        setOpen(true);
        setShowFullList(true);
        setHighlightedIndex(0);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        Math.min(prev === null ? 0 : prev + 1, visibleOptions.length - 1)
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => Math.max(0, (prev ?? 1) - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIndex !== null && highlightedIndex < visibleOptions.length) {
        selectOption(visibleOptions[highlightedIndex]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
      setShowFullList(false);
    }
  };

  const handleToggleClick = () => {
    if (open && showFullList) {
      setOpen(false);
      setShowFullList(false);
    } else {
      setOpen(true);
      setShowFullList(true);
      setHighlightedIndex(0);
    }
  };

  return (
    <div ref={outerRef} className={styles.outerWrapper}>
      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.Anchor asChild>
          <div className={styles.container}>
            <input
              type="text"
              value={inputText}
              placeholder={placeholder}
              onKeyDown={handleKeyDown}
              onChange={(e) => {
                setInputText(e.target.value);
                setShowFullList(false);
                setHighlightedIndex(null);
                setOpen(true);
              }}
              onFocus={() => {
                setOpen(true);
                setShowFullList(false);
                setFocused(true);
              }}
              onBlur={() => {
                setFocused(false);
              }}
              className={styles.input}
            />
            <button
              className={styles.toggleButton}
              onClick={handleToggleClick}
              aria-label="Toggle dropdown"
              type="button"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M4 6l4 4 4-4"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        </Popover.Anchor>
        <Popover.Portal>
          <Popover.Content
            ref={popoverContentRef}
            sideOffset={6}
            className={styles.popover}
            onOpenAutoFocus={(e) => {
              e.preventDefault();
            }}
            onInteractOutside={(e) => {
              e.preventDefault();
            }}
            onFocusOutside={(e) => {
              e.preventDefault();
            }}
          >
            <div className={styles.list}>
              {visibleOptions.length > 0 ? (
                visibleOptions.map((option, idx) => (
                  <button
                    key={option}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                    }}
                    onClick={() => {
                      selectOption(option);
                    }}
                    className={`${styles.option} ${idx === highlightedIndex ? styles.optionHighlighted : ''}`}
                  >
                    {option}
                  </button>
                ))
              ) : (
                <div className={styles.empty}>{emptyMessage}</div>
              )}
            </div>
          </Popover.Content>
        </Popover.Portal>
      </Popover.Root>
    </div>
  );
}
