import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl, Alert, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import * as productsApi from '../api/products';
import * as offline from '../offline/mutations';
import { overlayProducts } from '../offline/overlays';
import { isLocalId } from '../offline/types';
import { Product } from '../api/products';
import { getErrorMessage } from '../api/errors';
import { useResource } from '../hooks/useResource';
import { useRole } from '../hooks/useRole';
import { toast } from '../store/toastStore';
import { OfflineBanner } from '../components/OfflineBanner';
import { ScreenHeader } from '../components/ScreenHeader';
import { SearchBar } from '../components/SearchBar';
import { ChipRow, ChipItem } from '../components/ChipRow';
import { EmptyState, LoadingState } from '../components/EmptyState';
import { InlineNotice } from '../components/InlineNotice';
import { Badge } from '../components/Badge';
import { PendingBadge } from '../components/PendingBadge';
import { FormModal } from '../components/FormModal';
import { FormInput } from '../components/FormInput';
import { OptionPicker } from '../components/OptionPicker';
import { Button } from '../components/Button';
import { TopLoader } from '../components/TopLoader';
import { FadeInView, rowDelay } from '../components/FadeInView';
import { formatBr } from '../utils/formatCurrency';
import { colors, tones, spacing, radius, shadow, layout } from '../theme';

const LOW = 'low';
const ALL = 'all';
const CAT = 'cat:';
const BRAND = 'brand:';

interface Form {
  name: string; brand: string; category: string; specs: string;
  sellingPrice: string; costPrice: string; stock: string; notes: string; published: boolean;
}
const EMPTY_FORM: Form = {
  name: '', brand: '', category: '', specs: '',
  sellingPrice: '', costPrice: '', stock: '', notes: '', published: true,
};

const numeric = (v: string) => v.replace(/[^0-9.]/g, '');
const wholeNumber = (v: string) => v.replace(/[^0-9]/g, '');

function stockStatus(stock: number, lowAt: number): { label: string; tone: 'green' | 'amber' | 'red' } {
  if (stock <= 0) return { label: 'Out of stock', tone: 'red' };
  if (stock <= lowAt) return { label: `Low · ${stock} left`, tone: 'amber' };
  return { label: `${stock} in stock`, tone: 'green' };
}

// Distinct values with how many products use each, most used first.
function tally(values: (string | null)[]): [string, number][] {
  const counts = new Map<string, number>();
  values.forEach(v => { if (v) counts.set(v, (counts.get(v) || 0) + 1); });
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

export default function InventoryScreen() {
  const navigation: any = useNavigation();
  const route: any = useRoute();

  const { canManageStock } = useRole();
  const { data, error, loading, refreshing, fetching, refresh, reload } = useResource('products', productsApi.getProducts, overlayProducts);
  const products = useMemo(() => data?.items ?? [], [data]);
  const lowAt = data?.lowStockAt ?? 0;

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState(ALL);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<Form>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof Form, string>>>({});
  const [saving, setSaving] = useState(false);

  // Restocking: record stock that was just bought.
  const [restockFor, setRestockFor] = useState<Product | null>(null);
  const [rQty, setRQty] = useState('');
  const [rCost, setRCost] = useState('');
  const [rSupplier, setRSupplier] = useState('');
  const [rError, setRError] = useState<string | undefined>();
  const [restocking, setRestocking] = useState(false);

  const openRestock = (p: Product) => {
    setRestockFor(p); setRQty(''); setRCost(p.cost_price == null ? '' : String(p.cost_price)); setRSupplier(''); setRError(undefined);
  };

  const saveRestock = async () => {
    const qty = Number(rQty);
    if (!restockFor) return;
    if (!Number.isInteger(qty) || qty < 1) { setRError('Enter how many you bought'); return; }
    setRestocking(true);
    try {
      const out = await offline.restockProduct(restockFor.id, {
        qty,
        unit_cost: rCost ? Number(rCost) : undefined,
        supplier: rSupplier.trim() || undefined,
      }, restockFor.name);
      toast.success(offline.savedMessage(out, `Added ${qty} to ${restockFor.name}`));
      setRestockFor(null);
      reload();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not restock'));
    } finally {
      setRestocking(false);
    }
  };

  const categories = useMemo(() => tally(products.map(p => p.category)), [products]);
  const brands = useMemo(() => tally(products.map(p => p.brand)), [products]);
  const lowCount = useMemo(() => products.filter(p => p.stock <= lowAt).length, [products, lowAt]);

  const set = <K extends keyof Form>(key: K, value: Form[K]) => {
    setForm(f => ({ ...f, [key]: value }));
    if (errors[key]) setErrors(e => ({ ...e, [key]: undefined }));
  };

  const openAdd = useCallback(() => {
    setEditing(null);
    // Start from the most-used category and brand in your own stock.
    setForm({ ...EMPTY_FORM, category: categories[0]?.[0] ?? '', brand: brands[0]?.[0] ?? '' });
    setErrors({});
    setFormOpen(true);
  }, [categories, brands]);

  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({
      name: p.name, brand: p.brand || '', category: p.category || '', specs: p.specs || '',
      sellingPrice: String(p.selling_price), costPrice: p.cost_price == null ? '' : String(p.cost_price),
      stock: String(p.stock), notes: p.notes || '', published: p.is_published,
    });
    setErrors({});
    setFormOpen(true);
  };

  // Deep links from the dashboard: "+ Add product" and the low-stock alert.
  useEffect(() => {
    if (route.params?.openAdd) { if (canManageStock) openAdd(); navigation.setParams({ openAdd: undefined }); }
    if (route.params?.filter) { setFilter(route.params.filter); navigation.setParams({ filter: undefined }); }
  }, [route.params?.openAdd, route.params?.filter, openAdd, navigation, canManageStock]);

  const chips: ChipItem[] = [
    { key: ALL, label: 'All', count: products.length },
    ...(lowCount > 0 ? [{ key: LOW, label: '⚠️ Low stock', count: lowCount }] : []),
    ...brands.map(([b, n]) => ({ key: BRAND + b, label: b, count: n })),
    ...categories.map(([c, n]) => ({ key: CAT + c, label: c, count: n })),
  ];

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return products.filter(p => {
      if (filter === LOW && p.stock > lowAt) return false;
      if (filter.startsWith(CAT) && p.category !== filter.slice(CAT.length)) return false;
      if (filter.startsWith(BRAND) && p.brand !== filter.slice(BRAND.length)) return false;
      if (!q) return true;
      return [p.name, p.brand, p.specs].some(f => f?.toLowerCase().includes(q));
    });
  }, [products, search, filter, lowAt]);

  const profit = form.sellingPrice && form.costPrice ? Number(form.sellingPrice) - Number(form.costPrice) : null;

  const validate = () => {
    const e: Partial<Record<keyof Form, string>> = {};
    if (!form.name.trim()) e.name = 'Enter the product name';
    if (!form.sellingPrice || isNaN(Number(form.sellingPrice))) e.sellingPrice = 'Enter a selling price';
    if (form.costPrice && isNaN(Number(form.costPrice))) e.costPrice = 'Not a valid price';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const save = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        brand: form.brand.trim(),
        category: form.category.trim(),
        specs: form.specs.trim(),
        selling_price: Number(form.sellingPrice),
        cost_price: form.costPrice ? Number(form.costPrice) : null,
        stock: form.stock ? Number(form.stock) : 0,
        notes: form.notes.trim(),
        is_published: form.published,
      };
      const out = editing ? await offline.updateProduct(editing.id, payload) : await offline.createProduct(payload);
      setFormOpen(false);
      toast.success(offline.savedMessage(out, editing ? 'Product updated' : 'Product added'));
      reload();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not save the product'));
    } finally {
      setSaving(false);
    }
  };

  const confirmRemove = () => {
    if (!editing) return;
    Alert.alert(
      'Remove this product?',
      `${editing.name} will be hidden from stock and sales. Past sales stay in your records.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove', style: 'destructive',
          onPress: async () => {
            try {
              const out = await offline.deleteProduct(editing.id, editing.name);
              setFormOpen(false);
              toast.success(offline.savedMessage(out, 'Product removed'));
              reload();
            } catch (err) {
              toast.error(getErrorMessage(err, 'Could not remove the product'));
            }
          },
        },
      ],
    );
  };

  const adjustStock = (delta: number) =>
    set('stock', String(Math.max(0, (Number(form.stock) || 0) + delta)));

  const renderItem = ({ item, index }: { item: Product; index: number }) => {
    const s = stockStatus(item.stock, lowAt);
    return (
      <FadeInView delay={rowDelay(index)}>
      <TouchableOpacity
        style={[styles.row, shadow.sm]}
        onPress={() => openEdit(item)}
        disabled={!canManageStock}
        activeOpacity={0.75}
        accessibilityRole={canManageStock ? 'button' : undefined}
      >
        <View style={styles.emojiTile}><Text style={styles.emoji}>{item.emoji}</Text></View>
        <View style={styles.rowBody}>
          <Text style={styles.rowName} numberOfLines={1}>{item.name}</Text>
          <Text style={styles.rowSpec} numberOfLines={1}>{[item.brand, item.specs].filter(Boolean).join(' · ') || item.category}</Text>
          {isLocalId(item.id) ? <PendingBadge style={styles.rowBadge} /> : <Badge label={s.label} variant={s.tone} style={styles.rowBadge} />}
        </View>
        <View style={styles.rowEnd}>
          <Text style={styles.price}>{formatBr(item.selling_price)}</Text>
          {!item.is_published && <Text style={styles.draft}>Not on web</Text>}
          {canManageStock && item.stock <= lowAt && (
            <Button title="Restock" size="sm" variant="secondary" onPress={() => openRestock(item)} style={styles.restockBtn} />
          )}
        </View>
      </TouchableOpacity>
      </FadeInView>
    );
  };

  const emptyList = loading && !data ? (
    <LoadingState label="Loading stock…" />
  ) : error && !data ? (
    <EmptyState emoji="📡" title="Can't load stock" message={error} actionLabel="Try again" onAction={reload} />
  ) : products.length === 0 ? (
    <EmptyState emoji="📦" title="No products yet" message={canManageStock ? 'Add your first product to start tracking stock.' : 'The owner has not added any products yet.'} actionLabel={canManageStock ? 'Add product' : undefined} onAction={canManageStock ? openAdd : undefined} />
  ) : (
    <EmptyState emoji="🔍" title="No matches" message="Try a different search or filter." actionLabel="Clear filters" onAction={() => { setSearch(''); setFilter(ALL); }} />
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <OfflineBanner />
      <ScreenHeader
        title="Stock"
        subtitle={data ? `${products.length} products${lowCount ? ` · ${lowCount} low` : ''}` : undefined}
        right={canManageStock ? <Button title="+ Add" size="sm" onPress={openAdd} /> : undefined}
      />
      <View style={styles.searchWrap}>
        <SearchBar value={search} onChangeText={setSearch} placeholder="Search name, brand or specs" />
      </View>
      <ChipRow items={chips} selected={filter} onSelect={setFilter} />
      <TopLoader active={fetching && !!data} />

      <FlatList
        data={visible}
        keyExtractor={p => String(p.id)}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} colors={[colors.red]} />}
        ListHeaderComponent={error && data ? <InlineNotice message="Couldn't refresh. Showing saved stock." onRetry={reload} /> : undefined}
        ListEmptyComponent={emptyList}
      />

      <FormModal
        visible={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? 'Edit product' : 'New product'}
        subtitle={editing ? editing.name : 'Add an item to your stock'}
        footer={
          <View>
            <Button title={editing ? 'Save changes' : 'Add product'} onPress={save} loading={saving} />
            {editing && <Button title="Remove product" variant="ghost" size="sm" onPress={confirmRemove} style={styles.removeBtn} />}
          </View>
        }
      >
        <FormInput label="Product name *" value={form.name} onChangeText={v => set('name', v)} placeholder="e.g. Samsung A26 5G" error={errors.name} />

        <OptionPicker label="Category" options={categories.map(c => c[0])} value={form.category} onChange={v => set('category', v)} />
        <OptionPicker label="Brand" options={brands.map(b => b[0])} value={form.brand} onChange={v => set('brand', v)} />

        <FormInput label="Specs" value={form.specs} onChangeText={v => set('specs', v)} placeholder="e.g. 128+4GB" />

        <View style={styles.twoCol}>
          <FormInput
            label="Selling price (Br) *" value={form.sellingPrice} onChangeText={v => set('sellingPrice', numeric(v))}
            keyboardType="numeric" placeholder="15000" error={errors.sellingPrice} containerStyle={styles.colLeft}
          />
          <FormInput
            label="Cost price (Br)" value={form.costPrice} onChangeText={v => set('costPrice', numeric(v))}
            keyboardType="numeric" placeholder="12000" error={errors.costPrice} containerStyle={styles.colRight}
          />
        </View>

        {profit !== null && (
          <View style={[styles.profit, { backgroundColor: profit >= 0 ? tones.green.bg : tones.red.bg, borderColor: profit >= 0 ? tones.green.border : tones.red.border }]}>
            <Text style={[styles.profitText, { color: profit >= 0 ? tones.green.fg : tones.red.fg }]}>
              {profit >= 0 ? 'Profit per item: ' : 'Loss per item: '}{formatBr(Math.abs(profit))}
            </Text>
          </View>
        )}

        <Text style={styles.selectorLabel}>STOCK QUANTITY</Text>
        <View style={styles.stepper}>
          <TouchableOpacity style={styles.stepBtn} onPress={() => adjustStock(-1)} accessibilityLabel="Decrease stock" hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
            <Text style={styles.stepText}>−</Text>
          </TouchableOpacity>
          <FormInput
            value={form.stock} onChangeText={v => set('stock', wholeNumber(v))} keyboardType="numeric" placeholder="0"
            accessibilityLabel="Stock quantity" containerStyle={styles.stepInput} style={styles.stepInputText}
          />
          <TouchableOpacity style={styles.stepBtn} onPress={() => adjustStock(1)} accessibilityLabel="Increase stock" hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}>
            <Text style={styles.stepText}>+</Text>
          </TouchableOpacity>
        </View>

        <FormInput label="Notes" value={form.notes} onChangeText={v => set('notes', v)} placeholder="Supplier, shelf, colour…" />

        <View style={styles.publishBox}>
          <View style={styles.publishText}>
            <Text style={styles.publishTitle}>🌐 Show on web store</Text>
            <Text style={styles.publishSub}>Visible to customers online. Shop sales don't depend on this.</Text>
          </View>
          <Switch value={form.published} onValueChange={v => set('published', v)} trackColor={{ false: colors.border2, true: colors.green }} thumbColor={colors.white} />
        </View>
      </FormModal>

      <FormModal
        visible={!!restockFor}
        onClose={() => setRestockFor(null)}
        title="Restock"
        subtitle={restockFor ? `${restockFor.name} · ${restockFor.stock} in stock now` : undefined}
        footer={<Button title="Add to stock" onPress={saveRestock} loading={restocking} />}
      >
        <FormInput
          label="How many did you buy? *" value={rQty} onChangeText={v => { setRQty(wholeNumber(v)); setRError(undefined); }}
          keyboardType="numeric" placeholder="e.g. 10" error={rError}
        />
        <FormInput
          label="Cost per item (Br)" value={rCost} onChangeText={v => setRCost(numeric(v))} keyboardType="numeric" placeholder="12000"
          helperText="Recorded as today's purchase and used to work out your profit."
        />
        <FormInput label="Supplier (optional)" value={rSupplier} onChangeText={setRSupplier} placeholder="Who you bought it from" autoCapitalize="words" />
        {rQty && Number(rQty) > 0 && rCost ? (
          <View style={styles.restockTotal}>
            <Text style={styles.restockTotalLabel}>Total spent</Text>
            <Text style={styles.restockTotalValue}>{formatBr(Number(rQty) * Number(rCost))}</Text>
          </View>
        ) : null}
      </FormModal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bgDeep },
  searchWrap: { paddingHorizontal: layout.screenX, paddingBottom: spacing.md, backgroundColor: colors.white },
  listContent: { paddingHorizontal: layout.screenX, paddingTop: spacing.lg, paddingBottom: layout.bottomGap, flexGrow: 1 },
  row: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.white, borderRadius: radius.md,
    borderWidth: 1, borderColor: colors.border, padding: spacing.md, marginBottom: spacing.md,
  },
  emojiTile: { width: 48, height: 48, borderRadius: 14, backgroundColor: colors.bgCard2, alignItems: 'center', justifyContent: 'center', marginRight: spacing.md },
  emoji: { fontSize: 24 },
  rowBody: { flex: 1, marginRight: spacing.sm },
  rowBadge: { marginTop: 6 },
  rowEnd: { alignItems: 'flex-end' },
  rowName: { fontSize: 15, fontWeight: '800', color: colors.navy },
  rowSpec: { fontSize: 13, color: colors.text2, marginTop: 2 },
  price: { fontSize: 15, fontWeight: '900', color: colors.navy },
  draft: { fontSize: 11, color: colors.text3, marginTop: 4, fontWeight: '600' },

  selectorLabel: { fontSize: 11, fontWeight: '700', color: colors.label, letterSpacing: 0.6, marginBottom: 6 },
  twoCol: { flexDirection: 'row' },
  colLeft: { flex: 1, marginRight: spacing.sm },
  colRight: { flex: 1, marginLeft: spacing.sm },
  profit: { borderRadius: radius.sm, borderWidth: 1, padding: spacing.md, marginBottom: spacing.lg },
  profitText: { fontSize: 14, fontWeight: '800' },
  stepper: { flexDirection: 'row', alignItems: 'flex-start' },
  stepBtn: { width: 52, height: 52, borderRadius: 12, backgroundColor: colors.bgCard2, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  stepText: { fontSize: 24, fontWeight: '700', color: colors.navy, marginTop: -2 },
  stepInput: { flex: 1, marginHorizontal: spacing.sm },
  stepInputText: { textAlign: 'center', fontWeight: '800' },
  publishBox: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bgCard2, borderRadius: radius.md,
    padding: spacing.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.lg,
  },
  publishText: { flex: 1, marginRight: spacing.md },
  publishTitle: { fontSize: 14, fontWeight: '800', color: colors.navy },
  publishSub: { fontSize: 12, color: colors.text2, marginTop: 2, lineHeight: 16 },
  removeBtn: { alignSelf: 'center', marginTop: spacing.xs },
  restockBtn: { marginTop: spacing.sm },
  restockTotal: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.bgCard2, borderRadius: radius.md, padding: spacing.lg, marginBottom: spacing.lg },
  restockTotalLabel: { fontSize: 14, fontWeight: '700', color: colors.text2 },
  restockTotalValue: { fontSize: 20, fontWeight: '900', color: colors.navy },
});
