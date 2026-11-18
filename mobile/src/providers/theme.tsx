import * as SecureStore from 'expo-secure-store';
import { createContext, useContext, useEffect, useRef, useState, type PropsWithChildren } from 'react';
import { Appearance, Platform, useColorScheme } from 'react-native';

import { DarkColors, LightColors, isThemePreference, resolveTheme, type ThemePreference } from '@/constants/theme';

const STORAGE_KEY = 'fitgen.theme';
const ThemeContext = createContext({
  preference: 'system' as ThemePreference,
  scheme: 'light' as 'light' | 'dark',
  colors: LightColors as typeof DarkColors,
  ready: false,
  setPreference: async (_preference: ThemePreference): Promise<void> => {},
});

export function AppThemeProvider({ children }: PropsWithChildren) {
  const systemScheme = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>('system');
  const [ready, setReady] = useState(false);
  // Serialize writes so rapid changes cannot restore an older selection on restart.
  const pendingWrite = useRef(Promise.resolve());

  useEffect(() => {
    let active = true;
    async function restore() {
      try {
        const saved = Platform.OS === 'web'
          ? globalThis.localStorage?.getItem(STORAGE_KEY)
          : await SecureStore.getItemAsync(STORAGE_KEY);
        if (active && isThemePreference(saved)) setPreferenceState(saved);
      } catch {
        // Storage can be unavailable. Keep the system theme usable.
      } finally {
        if (active) setReady(true);
      }
    }
    void restore();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (ready && Platform.OS !== 'web') Appearance.setColorScheme(preference === 'system' ? 'auto' : preference);
  }, [preference, ready]);

  const scheme = resolveTheme(preference, systemScheme);
  const colors = scheme === 'dark' ? DarkColors : LightColors;

  const setPreference = (next: ThemePreference) => {
    setPreferenceState(next);
    const write = pendingWrite.current.catch(() => {}).then(async () => {
      if (Platform.OS === 'web') globalThis.localStorage.setItem(STORAGE_KEY, next);
      else await SecureStore.setItemAsync(STORAGE_KEY, next);
    });
    pendingWrite.current = write;
    return write;
  };

  return <ThemeContext value={{ preference, scheme, colors, ready, setPreference }}>{children}</ThemeContext>;
}

export function useAppTheme() {
  return useContext(ThemeContext);
}

export function useColors() {
  return useAppTheme().colors;
}
