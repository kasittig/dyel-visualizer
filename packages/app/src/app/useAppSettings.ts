import { useState, useMemo, useEffect } from 'react';
import type { DateRange } from 'react-day-picker';
import type { AthleteContext } from '@dyel/api';
import { useLocalStorageState } from '../shared/hooks/useLocalStorageState';
import type { InputMode, PageTab, DeadliftStancePreference } from './appTabs';

/**
 * Extracts all settings state from App.tsx: localStorage-backed settings (url, inputMode,
 * pastedText, activeTab, deadliftStance), transient UI state (panelForcedOpen, refreshToken,
 * shownResetToken), date range, cached sheet data, the athlete memo, and URL-sync effect.
 *
 * Query params (?sheet=, ?mode=, ?text=) override cached settings on mount.
 */
export function useAppSettings() {
  // Runs once, before the useLocalStorageState hooks below read from localStorage: an
  // explicit query param (e.g. a shared link) must override whatever was previously cached.
  useState(() => {
    const params = new URLSearchParams(window.location.search);
    const qUrl = params.get('sheet');
    const qMode = params.get('mode');
    const qText = params.get('text');
    if (qMode === 'text') {
      localStorage.setItem('dyel:inputMode', JSON.stringify('text'));
    } else if (qUrl !== null) {
      localStorage.setItem('dyel:inputMode', JSON.stringify('url'));
    }
    if (qUrl !== null) {
      localStorage.setItem('dyel:url', JSON.stringify(qUrl));
    }
    if (qText !== null) {
      localStorage.setItem('dyel:pastedText', JSON.stringify(qText));
    }
    return null;
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
  const [shownResetToken, setShownResetToken] = useState(0);
  const [deadliftStance, setDeadliftStance] = useLocalStorageState<DeadliftStancePreference>(
    'dyel:deadliftStance',
    'sumo'
  );

  const athlete: AthleteContext = useMemo(
    () => ({
      sex: 'M',
      bodyweight: 80,
      deadliftStance,
    }),
    [deadliftStance]
  );

  const [dateRange, setDateRange] = useState<DateRange>({ from: undefined, to: undefined });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (inputMode === 'text') {
      params.set('mode', 'text');
      params.delete('sheet');
      if (pastedText) {
        params.set('text', pastedText);
      } else {
        params.delete('text');
      }
    } else {
      params.delete('mode');
      params.delete('text');
      if (url) {
        params.set('sheet', url);
      } else {
        params.delete('sheet');
      }
    }
    history.replaceState(null, '', '?' + params.toString());
  }, [inputMode, url, pastedText]);

  function handleUrlChange(newUrl: string) {
    setUrl(newUrl);
    setPanelForcedOpen(false);
    setShownResetToken((t) => t + 1);
  }

  function handleTextChange(newText: string) {
    setPastedText(newText);
    setPanelForcedOpen(false);
    setShownResetToken((t) => t + 1);
  }

  function handleModeChange(newMode: InputMode) {
    setInputMode(newMode);
    setShownResetToken((t) => t + 1);
  }

  return {
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
    shownResetToken,
    setShownResetToken,
    deadliftStance,
    setDeadliftStance,
    athlete,
    dateRange,
    setDateRange,
    handleUrlChange,
    handleTextChange,
    handleModeChange,
  };
}
