import { colors } from './colors';

export const spacing = {
  xs: 4, sm: 8, md: 12, base: 14, lg: 16, xl: 20, xxl: 24, '3xl': 32, '4xl': 40, '5xl': 48,
};
export const radius = { sm: 10, md: 16, lg: 22, xl: 28, full: 999 };
export const shadow = {
  sm: { shadowColor: colors.navy, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.07, shadowRadius: 8, elevation: 2 },
  md: { shadowColor: colors.navy, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.10, shadowRadius: 16, elevation: 4 },
};

// Page-level spacing shared by every screen, so top and bottom breathing room
// is the same everywhere. The status-bar and nav-bar insets come on top of these.
export const layout = {
  screenX: 20,        // left/right page padding
  topGap: 12,         // space between the status bar and the first element
  bottomGap: 28,      // space between the last element and the tab bar
  bottomGapFab: 112,  // same, on screens with a floating button
};
