import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import { Badge } from './Badge';

// Marks a record that was created on this phone and has not reached the server yet.
export const PendingBadge: React.FC<{ style?: StyleProp<ViewStyle> }> = ({ style }) => (
  <Badge label="⏳ Not synced yet" variant="amber" style={style} />
);
