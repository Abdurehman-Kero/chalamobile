import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as productsApi from '../api/products';
import { Product } from '../api/products';
import * as customersApi from '../api/customers';
import * as salesApi from '../api/sales';
import * as offline from '../offline/mutations';
import { overlayCustomers, overlayProducts } from '../offline/overlays';
import { getErrorMessage } from '../api/errors';
import { useResource } from '../hooks/useResource';
import { useCartStore } from '../store/cartStore';
import { toast } from '../store/toastStore';
import { OfflineBanner } from '../components/OfflineBanner';
import { ScreenHeader } from '../components/ScreenHeader';
import { SearchBar } from '../components/SearchBar';
import { ChipRow } from '../components/ChipRow';
import { EmptyState, LoadingState } from '../components/EmptyState';
import { InlineNotice } from '../components/InlineNotice';
import { FormModal } from '../components/FormModal';
import { CenterModal } from '../components/CenterModal';
import { Button } from '../components/Button';
import { ProductThumb } from '../components/ProductThumb';
import { PAYMENT_LABELS } from '../components/SalesHistorySheet';
import { TopLoader } from '../components/TopLoader';
import { formatBr } from '../utils/formatCurrency';
import { tx, useT } from '../i18n';
import { colors, spacing, radius, shadow, layout } from '../theme';

const CAT = 'cat:';
const BRAND = 'brand:';

const PAYMENTS = [
  { key: 'cash', icon: '💵', name: tx('Cash') },
  { key: 'telebirr', icon: '📱', name: 'Telebirr' },
  { key: 'cbe', icon: '🏦', name: 'CBE' },
];

export default function POSScreen() {
  const t = useT();
  const products = useResource('products', productsApi.getProducts, overlayProducts);
  const customers = useResource('customers', customersApi.getCustomers, overlayCustomers);

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const [payment, setPayment] = useState('cash');
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [pickingCustomer, setPickingCustomer] = useState(false);
  const [customerQuery, setCustomerQuery] = useState('');
  const [completing, setCompleting] = useState(false);
  const [receipt, setReceipt] = useState<{ sale: salesApi.Sale; queued: boolean } | null>(null);

  const items = useCartStore(s => s.items);
  const customer = useCartStore(s => s.customer);
  const { addItem, incrementQty, decrementQty, setCustomer, clearCart } = useCartStore.getState();
  const total = items.reduce((sum, i) => sum + i.price * i.qty, 0);
  const cartCount = items.reduce((sum, i) => sum + i.qty, 0);

  const all = useMemo(() => products.data?.items ?? [], [products.data]);
  const lowAt = products.data?.lowStockAt ?? 0;

  // An emptied cart closes checkout, so adding the next item doesn't reopen it.
  useEffect(() => { if (items.length === 0) setCheckoutOpen(false); }, [items.length]);

  // Filter chips are built from what is actually in stock: brands, then categories.
  const chips = useMemo(() => {
    const tally = (values: (string | null)[]) => {
      const counts = new Map<string, number>();
      values.forEach(v => { if (v) counts.set(v, (counts.get(v) || 0) + 1); });
      return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
    };
    return [
      { key: 'All', label: t('All'), count: all.length },
      ...tally(all.map(p => p.brand)).map(([b, n]) => ({ key: BRAND + b, label: b, count: n })),
      ...tally(all.map(p => p.category)).map(([c, n]) => ({ key: CAT + c, label: c, count: n })),
    ];
  }, [all, t]);

  // Anything with stock can be sold in the shop, whether or not it is on the web store.
  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return all.filter(p => {
      if (filter.startsWith(CAT) && p.category !== filter.slice(CAT.length)) return false;
      if (filter.startsWith(BRAND) && p.brand !== filter.slice(BRAND.length)) return false;
      if (!q) return true;
      return [p.name, p.brand, p.specs].some(f => f?.toLowerCase().includes(q));
    });
  }, [all, search, filter]);

  const customerMatches = useMemo(() => {
    const q = customerQuery.trim().toLowerCase();
    const list = customers.data ?? [];
    const found = q ? list.filter(c => c.name.toLowerCase().includes(q) || (c.phone || '').includes(q)) : list;
    return found.slice(0, 5);
  }, [customers.data, customerQuery]);

  const addProduct = (p: Product) => {
    const ok = addItem({ product_id: p.id, name: p.name, spec: p.specs || p.brand || '', price: p.selling_price, emoji: p.emoji, stock: p.stock });
    if (!ok) toast.error(p.stock < 1 ? t('{name} is out of stock', { name: p.name }) : t('Only {n} of {name} in stock', { n: p.stock, name: p.name }));
  };

  const completeSale = async () => {
    if (items.length === 0) return;
    setCompleting(true);
    try {
      const out = await offline.createSale({
        customer_id: customer?.id,
        customer_name: customer?.name ?? 'Walk-in', // stored as typed on the receipt record
        payment_method: payment,
        items: items.map(i => ({ product_id: i.product_id, qty: i.qty, unit_price: i.price, product_name: i.name })),
      });
      setCheckoutOpen(false);
      setReceipt({ sale: out.data, queued: out.queued });
      clearCart();
      setPickingCustomer(false);
      setCustomerQuery('');
      // Stock and customer totals just changed on the server.
      products.reload();
      customers.reload();
    } catch (err) {
      toast.error(getErrorMessage(err, t('Could not complete the sale')));
      products.reload();
    } finally {
      setCompleting(false);
    }
  };

  const renderProduct = ({ item }: { item: Product }) => {
    const line = items.find(i => i.product_id === item.id);
    const out = item.stock < 1;
    return (
      <TouchableOpacity
        style={[styles.card, shadow.sm, out && styles.cardOut, !!line && styles.cardInCart]}
        onPress={() => addProduct(item)}
        activeOpacity={0.75}
        accessibilityRole="button"
        accessibilityLabel={`${item.name}, ${formatBr(item.selling_price)}, ${out ? t('Out of stock') : t('{n} in stock', { n: item.stock })}`}
      >
        <ProductThumb image={item.primary_image} emoji={item.emoji} size={56} style={styles.cardThumb} />
        <Text style={styles.cardName} numberOfLines={2}>{item.name}</Text>
        <Text style={styles.cardSpec} numberOfLines={1}>{item.specs || item.brand || ' '}</Text>
        <View style={styles.cardFoot}>
          <Text style={styles.cardPrice} numberOfLines={1}>{formatBr(item.selling_price)}</Text>
          <Text style={[styles.cardStock, out && { color: colors.redDark }, !out && item.stock <= lowAt && { color: colors.amberDark }]}>
            {out ? t('Out') : t('{n} left', { n: item.stock })}
          </Text>
        </View>
        {line ? (
          // Already in the sale: step the quantity down or up without opening the cart.
          <View style={styles.cardStepper}>
            <TouchableOpacity
              style={styles.cardStepBtn}
              onPress={() => decrementQty(item.id)}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              accessibilityRole="button"
              accessibilityLabel={t('Remove one {name}', { name: item.name })}
            >
              <Text style={styles.cardStepText}>−</Text>
            </TouchableOpacity>
            <Text style={styles.cardQty} accessibilityLabel={t('{n} in the sale', { n: line.qty })}>{line.qty}</Text>
            <TouchableOpacity
              style={[styles.cardStepBtn, styles.cardStepPlus]}
              onPress={() => addProduct(item)}
              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
              accessibilityRole="button"
              accessibilityLabel={t('Add one {name}', { name: item.name })}
            >
              <Text style={[styles.cardStepText, styles.cardStepTextPlus]}>+</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </TouchableOpacity>
    );
  };

  const emptyList = products.loading && !products.data ? (
    <LoadingState label={t('Loading products…')} />
  ) : products.error && !products.data ? (
    <EmptyState emoji="📡" title={t("Can't load products")} message={products.error} actionLabel={t('Try again')} onAction={products.reload} />
  ) : all.length === 0 ? (
    <EmptyState emoji="📦" title={t('No products to sell')} message={t('Add products in the Stock tab first.')} />
  ) : (
    <EmptyState emoji="🔍" title={t('No matches')} message={t('Try a different search or category.')} />
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <OfflineBanner />
      <ScreenHeader
        title={t('Sell')}
        subtitle={t('Tap a product to add it to the sale')}
        right={
          <TouchableOpacity
            style={[styles.cartBtn, cartCount > 0 && styles.cartBtnActive]}
            onPress={() => setCheckoutOpen(true)}
            disabled={cartCount === 0}
            accessibilityRole="button"
            accessibilityLabel={t('Cart, {n} items', { n: cartCount })}
          >
            <Text style={styles.cartIcon}>🛒</Text>
            <Text style={[styles.cartCount, cartCount > 0 && { color: colors.white }]}>{cartCount}</Text>
          </TouchableOpacity>
        }
      />
      <View style={styles.searchWrap}>
        <SearchBar value={search} onChangeText={setSearch} placeholder={t('Search products')} />
      </View>
      <ChipRow items={chips} selected={filter} onSelect={setFilter} />
      <TopLoader active={products.fetching && !!products.data} />

      <FlatList
        data={visible}
        keyExtractor={p => String(p.id)}
        renderItem={renderProduct}
        numColumns={2}
        columnWrapperStyle={styles.column}
        contentContainerStyle={[styles.gridContent, { paddingBottom: cartCount > 0 ? layout.bottomGapFab : layout.bottomGap }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={products.refreshing} onRefresh={products.refresh} colors={[colors.red]} />}
        ListHeaderComponent={products.error && products.data ? <InlineNotice message={t("Couldn't refresh. Stock levels may be out of date.")} onRetry={products.reload} /> : undefined}
        ListEmptyComponent={emptyList}
      />

      {cartCount > 0 && (
        <View style={[styles.bar, shadow.md]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.barCount}>{t(cartCount === 1 ? tx('{n} item') : tx('{n} items'), { n: cartCount })}</Text>
            <Text style={styles.barTotal}>{formatBr(total)}</Text>
          </View>
          <Button title={`${t('Checkout')} ›`} onPress={() => setCheckoutOpen(true)} size="sm" />
        </View>
      )}

      {/* Checkout */}
      <FormModal
        visible={checkoutOpen && items.length > 0}
        onClose={() => setCheckoutOpen(false)}
        title={t('Checkout')}
        subtitle={t(cartCount === 1 ? tx('{n} item') : tx('{n} items'), { n: cartCount })}
        footer={<Button title={`${t('Complete sale')} · ${formatBr(total)}`} onPress={completeSale} loading={completing} />}
      >
        <View style={styles.sectionHead}>
          <Text style={styles.sectionLabel}>{t('ITEMS')}</Text>
          <TouchableOpacity onPress={() => { clearCart(); setCheckoutOpen(false); }} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={styles.clear}>{t('Clear all')}</Text>
          </TouchableOpacity>
        </View>

        {items.map(item => (
          <View key={item.product_id} style={styles.line}>
            <View style={{ flex: 1, marginRight: spacing.sm }}>
              <Text style={styles.lineName} numberOfLines={2}>{item.name}</Text>
              <Text style={styles.lineSub}>{t('{price} each', { price: formatBr(item.price) })}</Text>
            </View>
            <View style={styles.stepper}>
              <TouchableOpacity style={styles.stepBtn} onPress={() => decrementQty(item.product_id)} accessibilityLabel={t('Remove one {name}', { name: item.name })}>
                <Text style={styles.stepText}>−</Text>
              </TouchableOpacity>
              <Text style={styles.stepQty}>{item.qty}</Text>
              <TouchableOpacity
                style={styles.stepBtn}
                onPress={() => { if (!incrementQty(item.product_id)) toast.error(t('Only {n} of {name} in stock', { n: item.stock, name: item.name })); }}
                accessibilityLabel={t('Add one {name}', { name: item.name })}
              >
                <Text style={styles.stepText}>+</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.lineTotal}>{formatBr(item.price * item.qty)}</Text>
          </View>
        ))}

        <View style={styles.totalBox}>
          <Text style={styles.totalLabel}>{t('Total')}</Text>
          <Text style={styles.totalValue}>{formatBr(total)}</Text>
        </View>

        <Text style={styles.sectionLabel}>{t('CUSTOMER')}</Text>
        {customer ? (
          <View style={styles.customerChip}>
            <Text style={styles.customerChipName} numberOfLines={1}>👤 {customer.name}</Text>
            <TouchableOpacity onPress={() => setCustomer(null)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} accessibilityLabel={t('Remove customer')}>
              <Text style={styles.clear}>{t('Remove')}</Text>
            </TouchableOpacity>
          </View>
        ) : pickingCustomer ? (
          <View style={{ marginBottom: spacing.lg }}>
            <SearchBar value={customerQuery} onChangeText={setCustomerQuery} placeholder={t('Search customer name or phone')} />
            {customerMatches.length === 0 ? (
              <Text style={styles.noMatch}>{t('No customer found. Add them in the Clients tab.')}</Text>
            ) : customerMatches.map(c => (
              <TouchableOpacity
                key={c.id}
                style={styles.matchRow}
                onPress={() => { setCustomer({ id: c.id, name: c.name }); setPickingCustomer(false); setCustomerQuery(''); }}
              >
                <Text style={styles.matchName}>{c.name}</Text>
                <Text style={styles.matchPhone}>{c.phone || t('No phone')}</Text>
              </TouchableOpacity>
            ))}
            <Button title={t('Cancel')} variant="ghost" size="sm" onPress={() => setPickingCustomer(false)} style={{ alignSelf: 'flex-start', marginTop: 4 }} />
          </View>
        ) : (
          <TouchableOpacity style={styles.walkIn} onPress={() => setPickingCustomer(true)} accessibilityRole="button">
            <Text style={styles.walkInText}>{t('Walk-in customer')}</Text>
            <Text style={styles.walkInLink}>{t('Link a customer')} ›</Text>
          </TouchableOpacity>
        )}

        <Text style={styles.sectionLabel}>{t('PAYMENT')}</Text>
        <ChipRow variant="form" items={PAYMENTS.map(p => ({ key: p.key, label: `${p.icon} ${t(p.name)}` }))} selected={payment} onSelect={setPayment} />

      </FormModal>

      {/* Receipt */}
      <CenterModal
        visible={!!receipt}
        onClose={() => setReceipt(null)}
        title={receipt?.queued ? t('Sale saved offline') : t('Sale complete')}
        footer={<Button title={t('New sale')} variant="dark" onPress={() => setReceipt(null)} />}
      >
        {receipt && (
          <View>
            <View style={styles.receiptTop}>
              <View style={styles.check}><Text style={styles.checkText}>✓</Text></View>
              <Text style={styles.receiptTitle}>{formatBr(receipt.sale.total)}</Text>
              <Text style={styles.receiptSub}>
                {t(PAYMENT_LABELS[receipt.sale.payment_method] || receipt.sale.payment_method)} · {receipt.sale.customer_name === 'Walk-in' || !receipt.sale.customer_name ? t('Walk-in') : receipt.sale.customer_name}
              </Text>
            </View>
            {receipt.queued && (
              <Text style={styles.offlineNote}>{t('Saved on this phone. It will be sent to the server when you’re back online.')}</Text>
            )}
            <View style={styles.receiptBox}>
              {receipt.sale.items?.map((i, idx) => (
                <View key={idx} style={styles.receiptRow}>
                  <Text style={styles.receiptItem} numberOfLines={1}>{i.product_name} × {i.qty}</Text>
                  <Text style={styles.receiptPrice}>{formatBr(i.total)}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </CenterModal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bgDeep },
  cartBtn: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: colors.bgCard2, paddingHorizontal: 14, minHeight: 40,
    borderRadius: radius.full, borderWidth: 1, borderColor: colors.border,
  },
  cartBtnActive: { backgroundColor: colors.red, borderColor: colors.red },
  cartIcon: { fontSize: 16, marginRight: 6 },
  cartCount: { fontSize: 14, fontWeight: '900', color: colors.navy },
  searchWrap: { paddingHorizontal: layout.screenX, paddingBottom: spacing.md, backgroundColor: colors.white },

  gridContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, flexGrow: 1 },
  column: { justifyContent: 'space-between' },
  card: {
    width: '48.5%', backgroundColor: colors.white, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border,
    padding: spacing.md, marginBottom: spacing.md,
  },
  cardOut: { opacity: 0.5 },
  cardInCart: { borderColor: colors.red },
  cardStepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.sm, backgroundColor: colors.redSoft, borderRadius: radius.full, padding: 4 },
  cardStepBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.redBorder, alignItems: 'center', justifyContent: 'center' },
  cardStepPlus: { backgroundColor: colors.red, borderColor: colors.red },
  cardStepText: { fontSize: 20, fontWeight: '800', color: colors.red, marginTop: -2 },
  cardStepTextPlus: { color: colors.white },
  cardQty: { fontSize: 16, fontWeight: '900', color: colors.navy },
  qtyBadge: {
    position: 'absolute', top: 8, right: 8, minWidth: 24, height: 24, borderRadius: 12, backgroundColor: colors.red,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6, zIndex: 1,
  },
  qtyBadgeText: { color: colors.white, fontSize: 12, fontWeight: '900' },
  cardThumb: { marginBottom: 6 },
  cardName: { fontSize: 14, fontWeight: '800', color: colors.navy, minHeight: 36 },
  cardSpec: { fontSize: 12, color: colors.text2, marginTop: 2 },
  cardFoot: { marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 1, borderColor: colors.border },
  cardPrice: { fontSize: 14, fontWeight: '900', color: colors.navy },
  cardStock: { fontSize: 12, fontWeight: '700', color: colors.greenDark, marginTop: 2 },

  bar: {
    position: 'absolute', left: spacing.lg, right: spacing.lg, bottom: spacing.md, backgroundColor: colors.navy,
    borderRadius: radius.lg, paddingVertical: spacing.md, paddingLeft: spacing.xl, paddingRight: spacing.md,
    flexDirection: 'row', alignItems: 'center',
  },
  barCount: { fontSize: 12, fontWeight: '700', color: colors.onNavy },
  barTotal: { fontSize: 18, fontWeight: '900', color: colors.white, marginTop: 1 },

  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: colors.label, letterSpacing: 0.6, marginBottom: 8, marginTop: spacing.sm },
  clear: { fontSize: 13, fontWeight: '800', color: colors.red },
  line: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderColor: colors.border },
  lineName: { fontSize: 14, fontWeight: '700', color: colors.navy },
  lineSub: { fontSize: 12, color: colors.text2, marginTop: 2 },
  stepper: { flexDirection: 'row', alignItems: 'center', marginHorizontal: spacing.sm },
  stepBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: colors.bgCard2, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  stepText: { fontSize: 18, fontWeight: '700', color: colors.navy, marginTop: -2 },
  stepQty: { minWidth: 28, textAlign: 'center', fontSize: 15, fontWeight: '800', color: colors.navy },
  lineTotal: { minWidth: 78, textAlign: 'right', fontSize: 14, fontWeight: '800', color: colors.navy },
  totalBox: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.bgCard2,
    borderRadius: radius.md, padding: spacing.lg, marginTop: spacing.md, marginBottom: spacing.lg,
  },
  totalLabel: { fontSize: 15, fontWeight: '700', color: colors.navy },
  totalValue: { fontSize: 22, fontWeight: '900', color: colors.red },

  customerChip: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.blueSoft,
    borderColor: colors.blueBorder, borderWidth: 1, borderRadius: radius.md, padding: spacing.md, minHeight: 50, marginBottom: spacing.lg,
  },
  customerChipName: { flex: 1, fontSize: 15, fontWeight: '800', color: colors.blueDark, marginRight: spacing.md },
  walkIn: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.bgCard2,
    borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md, minHeight: 50, marginBottom: spacing.lg,
  },
  walkInText: { fontSize: 14, fontWeight: '700', color: colors.text2 },
  walkInLink: { fontSize: 13, fontWeight: '800', color: colors.red },
  noMatch: { fontSize: 13, color: colors.text2, paddingVertical: spacing.md },
  matchRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderColor: colors.border },
  matchName: { fontSize: 14, fontWeight: '700', color: colors.navy },
  matchPhone: { fontSize: 13, color: colors.text2 },

  receiptTop: { alignItems: 'center', marginBottom: spacing.lg },
  check: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.greenSoft, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.sm },
  checkText: { fontSize: 28, color: colors.greenDark, fontWeight: '900' },
  receiptTitle: { fontSize: 30, fontWeight: '900', color: colors.navy },
  receiptSub: { fontSize: 14, color: colors.text2, marginTop: 4 },
  offlineNote: { fontSize: 13, color: colors.amberDark, backgroundColor: colors.amberSoft, borderColor: colors.amberBorder, borderWidth: 1, borderRadius: radius.sm, padding: spacing.md, marginBottom: spacing.md, lineHeight: 18, fontWeight: '600' },
  receiptBox: { backgroundColor: colors.bgCard2, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.lg },
  receiptRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  receiptItem: { fontSize: 14, color: colors.navy, flex: 1, marginRight: 10 },
  receiptPrice: { fontSize: 14, fontWeight: '700', color: colors.navy },
});
