import React from 'react';
import { StyleProp, TextStyle } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import { colors } from '../theme';

interface Props {
  // Any Feather icon name, e.g. "eye", "eye-off", "mail", "lock". See feathericons.com
  name: string;
  size?: number;
  color?: string;
  style?: StyleProp<TextStyle>;
}

// One place that draws icons, so every screen uses the same set and sizing.
export const Icon: React.FC<Props> = ({ name, size = 20, color = colors.text3, style }) => (
  <Feather name={name} size={size} color={color} style={style} />
);
