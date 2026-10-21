// Single source of truth for colour. Screens and components import from here
// and never hardcode a hex value, so the whole app can be re-themed in one file.
export const colors = {
  // Brand
  red:          '#E8231A',
  redDark:      '#C41B13',
  navy:         '#0D1C3D',

  // Surfaces
  bgDeep:       '#F3F5F9',   // screen background
  bgCard:       '#FFFFFF',
  bgCard2:      '#F4F6F9',   // inputs, chips, quiet panels
  white:        '#FFFFFF',
  black:        '#000000',
  border:       '#E5E9F2',
  border2:      '#D8DDE8',

  // Text
  text1:        '#0D1C3D',
  text2:        '#4A5568',
  text3:        '#7C8AA0',   // meta text and placeholders
  label:        '#64748B',   // small uppercase field labels

  // Status
  green:        '#16A34A',
  greenDark:    '#15803D',
  amber:        '#F59E0B',
  amberDark:    '#B45309',
  blue:         '#2563EB',
  blueDark:     '#1D4ED8',
  purple:       '#7C3AED',

  // Soft tints (backgrounds + borders for the status colours above)
  redSoft:      '#FFF0F0',
  redBorder:    '#FFD5D5',
  greenSoft:    '#ECFDF3',
  greenBorder:  '#BBF7D0',
  amberSoft:    '#FFF8E6',
  amberBorder:  '#FDE68A',
  blueSoft:     '#EFF6FF',
  blueBorder:   '#BFDBFE',
  purpleSoft:   '#F5F3FF',
  purpleBorder: '#DDD6FE',

  // Text and lines that sit on top of navy surfaces
  onNavy:       'rgba(255,255,255,0.72)',
  onNavyStrong: 'rgba(255,255,255,0.9)',
  onNavyLine:   'rgba(255,255,255,0.14)',
  onNavyChip:   'rgba(255,255,255,0.22)',

  overlay:      'rgba(13,28,61,0.55)',
  transparent:  'transparent',
};
export type ColorKey = keyof typeof colors;

// Avatar backgrounds, picked by customer id.
export const avatarColors = [colors.red, colors.blue, colors.green, colors.amberDark, colors.purple, colors.navy];

export type Tone = 'red' | 'green' | 'amber' | 'blue' | 'purple' | 'neutral';

// Background / border / readable foreground for each tone, shared by badges,
// stat tiles and tinted icon tiles so every screen uses the same pairings.
export const tones: Record<Tone, { bg: string; border: string; fg: string; solid: string }> = {
  red:     { bg: colors.redSoft,    border: colors.redBorder,    fg: colors.redDark,   solid: colors.red },
  green:   { bg: colors.greenSoft,  border: colors.greenBorder,  fg: colors.greenDark, solid: colors.green },
  amber:   { bg: colors.amberSoft,  border: colors.amberBorder,  fg: colors.amberDark, solid: colors.amber },
  blue:    { bg: colors.blueSoft,   border: colors.blueBorder,   fg: colors.blueDark,  solid: colors.blue },
  purple:  { bg: colors.purpleSoft, border: colors.purpleBorder, fg: colors.purple,    solid: colors.purple },
  neutral: { bg: colors.bgCard2,    border: colors.border,       fg: colors.text2,     solid: colors.text2 },
};
