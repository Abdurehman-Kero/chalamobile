import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme';
import { useCartStore } from '../store/cartStore';
import { useRole } from '../hooks/useRole';
import { Role } from '../api/auth';
import { tx, useT } from '../i18n';
import { useRepairReminders } from '../reminders/useReminders';
import { usePrefetch } from '../hooks/usePrefetch';

import DashboardScreen from '../screens/DashboardScreen';
import InventoryScreen from '../screens/InventoryScreen';
import RepairsScreen from '../screens/RepairsScreen';
import POSScreen from '../screens/POSScreen';
import CustomersScreen from '../screens/CustomersScreen';

const Tab = createBottomTabNavigator();

// Route names are used by navigate() calls elsewhere; labels are what people read.
const ALL_TABS = [
  { name: 'Home',    label: tx('Home'),    icon: '📊', screen: DashboardScreen, roles: ['owner', 'sales', 'technician'] },
  { name: 'Stock',   label: tx('Stock'),   icon: '📦', screen: InventoryScreen, roles: ['owner', 'sales'] },
  { name: 'Repair',  label: tx('Repairs'), icon: '🔧', screen: RepairsScreen,   roles: ['owner', 'technician'] },
  { name: 'POS',     label: tx('Sell'),    icon: '💳', screen: POSScreen,       roles: ['owner', 'sales'] },
  { name: 'Clients', label: tx('Clients'), icon: '👥', screen: CustomersScreen, roles: ['owner', 'sales'] },
] as const;

// Owner sees everything, the sales desk sees selling, a technician sees repairs.
const tabsFor = (role: Role) => ALL_TABS.filter(t => (t.roles as readonly string[]).includes(role));

export default function MainTabs() {
  const { role } = useRole();
  // Rings the technician the day before each customer comes for a repair.
  useRepairReminders();
  // Loads the other tabs' lists in the background so they open instantly.
  usePrefetch();
  const tabs = tabsFor(role);
  return (
    <Tab.Navigator
      // A different role gets a fresh navigator, so no stale screens carry over.
      key={role}
      screenOptions={{
        headerShown: false,
        // Tabs cross-fade instead of snapping.
        animation: 'fade',
        transitionSpec: { animation: 'timing', config: { duration: 180 } },
      }}
      tabBar={(props) => <CustomTabBar {...props} tabs={tabs} />}
    >
      {tabs.map(t => (
        <Tab.Screen key={t.name} name={t.name} component={t.screen} />
      ))}
    </Tab.Navigator>
  );
}

function CustomTabBar({ state, navigation, tabs }: any) {
  const t = useT();
  const insets = useSafeAreaInsets();
  const cartCount = useCartStore(s => s.items.reduce((n, i) => n + i.qty, 0));

  return (
    <View style={[styles.tabBar, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      {state.routes.map((route: any, index: number) => {
        const isFocused = state.index === index;
        const tab = tabs.find((x: any) => x.name === route.name);
        if (!tab) return null;
        const badge = route.name === 'POS' && cartCount > 0 ? cartCount : 0;

        const onPress = () => {
          const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
          if (!isFocused && !event.defaultPrevented) navigation.navigate(route.name);
        };

        return (
          <TouchableOpacity
            key={route.key}
            style={styles.tabItem}
            onPress={onPress}
            activeOpacity={0.7}
            accessibilityRole="tab"
            accessibilityLabel={badge ? t('{label}, {n} items in cart', { label: t(tab.label), n: badge }) : t(tab.label)}
            accessibilityState={{ selected: isFocused }}
          >
            <View style={[styles.iconPill, isFocused && styles.iconPillActive]}>
              <Text style={[styles.tabIcon, !isFocused && styles.tabIconIdle]}>{tab.icon}</Text>
              {badge > 0 && (
                <View style={styles.badge}><Text style={styles.badgeText}>{badge > 99 ? '99+' : badge}</Text></View>
              )}
            </View>
            <Text style={[styles.tabLabel, isFocused && styles.tabLabelActive]} numberOfLines={1}>
              {t(tab.label)}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 8,
  },
  tabItem: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 54 },
  iconPill: {
    width: 56, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center', marginBottom: 3,
  },
  iconPillActive: { backgroundColor: colors.redSoft },
  tabIcon: { fontSize: 20 },
  tabIconIdle: { opacity: 0.6 },
  tabLabel: { fontSize: 12, color: colors.text2, fontWeight: '600' },
  tabLabelActive: { color: colors.red, fontWeight: '800' },
  badge: {
    position: 'absolute', top: -4, right: 6, minWidth: 18, height: 18, borderRadius: 9,
    backgroundColor: colors.red, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4,
    borderWidth: 2, borderColor: colors.white,
  },
  badgeText: { color: colors.white, fontSize: 10, fontWeight: '900' },
});
