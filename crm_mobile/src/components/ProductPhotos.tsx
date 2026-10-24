import React, { forwardRef, useCallback, useEffect, useImperativeHandle, useState } from 'react';
import { ActivityIndicator, Alert, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { launchCamera, launchImageLibrary, Asset } from 'react-native-image-picker';
import * as productsApi from '../api/products';
import { LocalPhoto, ProductImage } from '../api/products';
import { getErrorMessage } from '../api/errors';
import { thumbUrl } from '../utils/images';
import { toast } from '../store/toastStore';
import { useT } from '../i18n';
import { colors, radius, spacing } from '../theme';

export const MAX_PHOTOS = 4;

export interface ProductPhotosHandle {
  // Sends the photos picked while the product was still new.
  uploadStaged: (productId: number) => Promise<void>;
}

interface Props {
  // The saved product being edited. Null while adding a new one.
  productId: number | null;
  // False when the product only exists on this phone so far.
  canUploadNow: boolean;
}

interface Tile { key: string; uri: string; cover: boolean; imageId?: number }

const toLocal = (a: Asset, i: number): LocalPhoto => ({
  uri: a.uri || '', name: a.fileName || `photo_${Date.now()}_${i}.jpg`, type: a.type || 'image/jpeg',
});
const PICKER = { mediaType: 'photo' as const, quality: 0.8 as const, maxWidth: 1600, maxHeight: 1600 };

/**
 * Photo strip for the product form. For a saved product, adding / removing / choosing the
 * cover happens straight away. For a new product the photos wait here and are sent by
 * the form once the product has been created (see uploadStaged).
 */
export const ProductPhotos = forwardRef<ProductPhotosHandle, Props>(({ productId, canUploadNow }, ref) => {
  const tt = useT();
  const [saved, setSaved] = useState<ProductImage[]>([]);
  const [staged, setStaged] = useState<LocalPhoto[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setStaged([]);
    if (productId == null || !canUploadNow) { setSaved([]); return; }
    let cancelled = false;
    productsApi.getProductImages(productId).then(imgs => { if (!cancelled) setSaved(imgs); }).catch(() => {});
    return () => { cancelled = true; };
  }, [productId, canUploadNow]);

  useImperativeHandle(ref, () => ({
    uploadStaged: async (id: number) => {
      if (!staged.length) return;
      await productsApi.uploadProductImages(id, staged);
      setStaged([]);
    },
  }), [staged]);

  const tiles: Tile[] = [
    ...saved.map(i => ({ key: `s${i.id}`, uri: i.url, cover: i.is_primary, imageId: i.id })),
    ...staged.map((p, i) => ({ key: `n${i}`, uri: p.uri, cover: saved.length === 0 && i === 0 })),
  ];
  const remaining = MAX_PHOTOS - tiles.length;

  const addPicked = useCallback(async (assets: Asset[] | undefined) => {
    const picked = (assets || []).filter(a => a.uri).slice(0, remaining).map(toLocal);
    if (!picked.length) return;
    if (productId != null && canUploadNow) {
      setBusy(true);
      try {
        setSaved(await productsApi.uploadProductImages(productId, picked));
      } catch (err) {
        toast.error(getErrorMessage(err, tt('Could not upload the photo')));
      } finally {
        setBusy(false);
      }
    } else {
      setStaged(s => [...s, ...picked]);
    }
  }, [productId, canUploadNow, remaining, tt]);

  const add = () => {
    Alert.alert(tt('Add a photo'), undefined, [
      { text: tt('Take a photo'), onPress: async () => addPicked((await launchCamera({ ...PICKER, saveToPhotos: false })).assets) },
      { text: tt('Choose from gallery'), onPress: async () => addPicked((await launchImageLibrary({ ...PICKER, selectionLimit: remaining })).assets) },
      { text: tt('Cancel'), style: 'cancel' },
    ]);
  };

  const remove = async (t: Tile) => {
    if (t.imageId == null || productId == null) {
      setStaged(s => s.filter((_, i) => `n${i}` !== t.key));
      return;
    }
    setBusy(true);
    try {
      await productsApi.deleteProductImage(productId, t.imageId);
      setSaved(await productsApi.getProductImages(productId));
    } catch (err) {
      toast.error(getErrorMessage(err, tt('Could not remove the photo')));
    } finally {
      setBusy(false);
    }
  };

  const makeCover = async (t: Tile) => {
    if (t.cover) return;
    if (t.imageId == null || productId == null) {
      // Photos still waiting to upload: the first one becomes the cover.
      setStaged(s => { const i = Number(t.key.slice(1)); return [s[i], ...s.filter((_, j) => j !== i)]; });
      return;
    }
    setBusy(true);
    try {
      setSaved(await productsApi.setProductCover(productId, t.imageId));
    } catch (err) {
      toast.error(getErrorMessage(err, tt('Could not change the cover photo')));
    } finally {
      setBusy(false);
    }
  };

  const onTilePress = (t: Tile) => {
    Alert.alert(t.cover ? tt('Cover photo') : tt('Photo'), undefined, [
      ...(t.cover ? [] : [{ text: tt('Make cover photo'), onPress: () => makeCover(t) }]),
      { text: tt('Remove photo'), style: 'destructive' as const, onPress: () => remove(t) },
      { text: tt('Cancel'), style: 'cancel' as const },
    ]);
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{tt('PHOTOS')} · {tiles.length}/{MAX_PHOTOS}</Text>
      <View style={styles.row}>
        {tiles.map(t => (
          <TouchableOpacity
            key={t.key} style={styles.tile} onPress={() => onTilePress(t)} activeOpacity={0.8}
            accessibilityRole="button" accessibilityLabel={t.cover ? tt('Cover photo, tap for options') : tt('Photo, tap for options')}
          >
            <Image source={{ uri: thumbUrl(t.uri, 240) || t.uri }} style={styles.img} resizeMode="cover" />
            {t.cover && <View style={styles.coverTag}><Text style={styles.coverText}>{tt('Cover')}</Text></View>}
          </TouchableOpacity>
        ))}
        {remaining > 0 && (
          <TouchableOpacity
            style={[styles.tile, styles.addTile]} onPress={add} disabled={busy} activeOpacity={0.7}
            accessibilityRole="button" accessibilityLabel={tt('Add a photo')}
          >
            {busy
              ? <ActivityIndicator color={colors.navy} />
              : <><Text style={styles.plus}>+</Text><Text style={styles.addText}>{tt('Add')}</Text></>}
          </TouchableOpacity>
        )}
      </View>
      <Text style={styles.hint}>
        {productId != null && !canUploadNow
          ? tt('This product is still waiting to sync. Add photos once it has reached the server.')
          : tt('Customers see these on the web store. The first photo is the cover.')}
      </Text>
    </View>
  );
});

const SIZE = 72;
const styles = StyleSheet.create({
  wrap: { marginBottom: spacing.lg },
  label: { fontSize: 11, fontWeight: '800', color: colors.label, letterSpacing: 0.6, marginBottom: spacing.sm },
  row: { flexDirection: 'row', flexWrap: 'wrap' },
  tile: { width: SIZE, height: SIZE, borderRadius: radius.sm, marginRight: spacing.sm, marginBottom: spacing.sm, overflow: 'hidden', backgroundColor: colors.bgCard2 },
  img: { width: '100%', height: '100%' },
  addTile: { alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.border2 },
  plus: { fontSize: 22, fontWeight: '700', color: colors.navy, lineHeight: 24 },
  addText: { fontSize: 11, fontWeight: '700', color: colors.text2 },
  coverTag: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(13,28,61,0.78)', paddingVertical: 2, alignItems: 'center' },
  coverText: { fontSize: 10, fontWeight: '800', color: colors.white },
  hint: { fontSize: 12, color: colors.text3, lineHeight: 16 },
});
