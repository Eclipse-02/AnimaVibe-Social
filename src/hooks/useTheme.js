import { useColorScheme } from 'react-native';
import { useThemeStore } from '../store/themeStore';
import { LIGHT_COLORS, DARK_COLORS } from '../constants/colors';

export function useThemeColors() {
  const theme = useThemeStore((state) => state.theme);
  const systemTheme = useColorScheme();
  const activeTheme = theme === 'system' ? systemTheme : theme;
  return activeTheme === 'dark' ? DARK_COLORS : LIGHT_COLORS;
}
