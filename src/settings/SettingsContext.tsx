import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";

const STORAGE_KEY = "commander-playtester/settings/v1";

export interface Settings {
  /** Pay for spells by tapping sources yourself instead of auto-paying. */
  manualMana: boolean;
}

const DEFAULTS: Settings = { manualMana: false };

function initialSettings(): Settings {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return { ...DEFAULTS, ...JSON.parse(saved) };
  } catch {
    // ignore storage/parse errors (private mode, corrupt value)
  }
  return DEFAULTS;
}

interface SettingsApi {
  settings: Settings;
  setManualMana: (on: boolean) => void;
}

const Ctx = createContext<SettingsApi | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(initialSettings);

  const persist = useCallback((next: Settings) => {
    setSettings(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // ignore storage errors
    }
  }, []);

  const setManualMana = useCallback(
    (on: boolean) => persist({ ...settings, manualMana: on }),
    [persist, settings],
  );

  const value = useMemo<SettingsApi>(
    () => ({ settings, setManualMana }),
    [settings, setManualMana],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useSettings(): SettingsApi {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
  return ctx;
}
