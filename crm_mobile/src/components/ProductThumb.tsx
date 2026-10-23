import React, { useState } from 'react';
import { Image, StyleProp, StyleSheet, Text, View, ViewStyle } from 'react-native';
import { colors } from '../theme';
import { thumbUrl } from '../utils/images';

interface Props {
  image: string | null;
  emoji: string;
  size: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}

// The product's cover photo, or its emoji when it has none (or the photo cannot load).
export const ProductThumb: React.FC<Props> = ({ image, emoji, size, radius = 14, style }) => {
  const [failed, setFailed] = useState(false);
  const uri = failed ? null : thumbUrl(image, Math.ceil(size * 2));
  return (
    <View style={[styles.tile, { width: size, height: size, borderRadius: radius }, style]}>
      {uri
        ? <Image source={{ uri }} style={styles.img} resizeMode="cover" onError={() => setFailed(true)} accessibilityIgnoresInvertColors />
        : <Text style={{ fontSize: size * 0.5 }}>{emoji}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  tile: { backgroundColor: colors.bgCard2, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  img: { width: '100%', height: '100%' },
});
