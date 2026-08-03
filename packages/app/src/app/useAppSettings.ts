import { useState, useMemo, useEffect } from 'react';
import type { DateRange } from 'react-day-picker';
import { useLocalStorageState } from '../shared/hooks/useLocalStorageState';
import type { InputMode, PageTab } from './appTabs';
import type { LiftType } from '@dyel/api';

export function useAppSettings() {
  const [isFirstUse] = useState(() => {
    const hasSavedSource =
      localStorage.getItem('dyel:url') !== null || localStorage.getItem('dyel:pastedText') !== null;
    const p = new URLSearchParams(window.location.search),
      u = p.get('sheet'),
      m = p.get('mode'),
      t = p.get('text');
    if (m === 'text') {
      localStorage.setItem('dyel:inputMode', JSON.stringify('text'));
    } else if (u !== null) {
      localStorage.setItem('dyel:inputMode', JSON.stringify('url'));
    }
    if (u !== null) {
      localStorage.setItem('dyel:url', JSON.stringify(u));
    }
    if (t !== null) {
      localStorage.setItem('dyel:pastedText', JSON.stringify(t));
    }
    return !hasSavedSource;
  });

  const [url, setUrl] = useLocalStorageState<string>(
    'dyel:url',
    () => import.meta.env.VITE_SHEET_URL ?? ''
  );
  const [inputMode, setInputMode] = useLocalStorageState<InputMode>('dyel:inputMode', 'url');
  const [pastedText, setPastedText] = useLocalStorageState<string>('dyel:pastedText', '');
  const [panelForcedOpen, setPanelForcedOpen] = useState(false);
  const [refreshToken, setRefreshToken] = useState(0);
  const [activeTab, setActiveTab] = useLocalStorageState<PageTab>('dyel:activeTab', 'sigma');
  const [lastLiftTab, setLastLiftTab] = useLocalStorageState<LiftType>('dyel:lastLiftTab', 'squat');
  const [shownResetToken, setShownResetToken] = useState(0);
  const [dateRange, setDateRange] = useState<DateRange>({ from: undefined, to: undefined });
  const athleteBase = useMemo(() => ({ sex: 'M' as const, bodyweight: 80 }), []);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (inputMode === 'text') {
      p.set('mode', 'text');
      p.delete('sheet');
      if (pastedText) {
        p.set('text', pastedText);
      } else {
        p.delete('text');
      }
    } else {
      p.delete('mode');
      p.delete('text');
      if (url) {
        p.set('sheet', url);
      } else {
        p.delete('sheet');
      }
    }
    history.replaceState(null, '', `?${p.toString()}`);
  }, [inputMode, url, pastedText]);

  const tok = (clr = false) => {
    if (clr) {
      setPanelForcedOpen(false);
    }
    setShownResetToken((t) => t + 1);
  };

  return {
    isFirstUse,
    url,
    setUrl,
    inputMode,
    setInputMode,
    pastedText,
    setPastedText,
    panelForcedOpen,
    setPanelForcedOpen,
    refreshToken,
    setRefreshToken,
    activeTab,
    setActiveTab,
    lastLiftTab,
    setLastLiftTab,
    shownResetToken,
    setShownResetToken,
    athleteBase,
    dateRange,
    setDateRange,
    handleUrlChange: (u: string) => {
      setUrl(u);
      tok(true);
    },
    handleTextChange: (t: string) => {
      setPastedText(t);
      tok(true);
    },
    handleModeChange: (m: InputMode) => {
      setInputMode(m);
      tok();
    },
  };
}
