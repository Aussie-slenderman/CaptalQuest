import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform, AppState } from 'react-native';
import { Tabs, router } from 'expo-router';
import { useAppStore } from '../../src/store/useAppStore';
import {
  listenToPortfolio,
  listenToChatRooms,
  listenToTradeProposals,
} from '../../src/services/auth';
import { refreshPortfolioPrices } from '../../src/services/tradingEngine';
import { subscribeToPrices } from '../../src/services/stockApi';
import { Colors, FontSize, FontWeight } from '../../src/constants/theme';
import type { Portfolio, ChatRoom } from '../../src/types';
import AchievementToast from '../../src/components/AchievementToast';

export default function AppLayout() {
  const {
    user, setPortfolio, setChatRooms, setUnreadCount, unreadCount,
    portfolio, setQuote,
    appAccentColor, appColorMode, appMode,
  } = useAppStore();
  const isAdult = appMode === 'adult';

  // Return to dashboard whenever app comes back to foreground (native only —
  // on web, AppState fires on every browser-tab switch which would be disruptive)
  const appState = useRef(AppState.currentState);
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const sub = AppState.addEventListener('change', nextState => {
      if (appState.current.match(/inactive|background/) && nextState === 'active') {
        router.replace('/(app)/dashboard');
      }
      appState.current = nextState;
    });
    return () => sub.remove();
  }, []);

  // Listen to portfolio changes
  useEffect(() => {
    if (!user?.id) return;
    const unsub = listenToPortfolio(user.id, (data) => {
      setPortfolio(data as Portfolio);
    });
    return unsub;
  }, [user?.id]);

  // Refresh portfolio prices every 30s
  useEffect(() => {
    if (!user?.id) return;
    refreshPortfolioPrices(user.id);
    const interval = setInterval(() => refreshPortfolioPrices(user.id!), 30_000);
    return () => clearInterval(interval);
  }, [user?.id]);

  // Subscribe to real-time WebSocket prices for watchlist
  useEffect(() => {
    const watchlist = useAppStore.getState().watchlist;
    const unsub = subscribeToPrices(watchlist, (symbol, quote) => {
      setQuote(symbol, quote);
    });
    return unsub;
  }, []);

  // Listen to chat rooms
  useEffect(() => {
    if (!user?.id) return;
    const unsub = listenToChatRooms(user.id, (rooms) => {
      setChatRooms(rooms as ChatRoom[]);
    });
    return unsub;
  }, [user?.id]);

  // Listen to trade proposals
  useEffect(() => {
    if (!user?.id) return;
    const unsub = listenToTradeProposals(user.id, (proposals) => {
      if (proposals.length > 0) {
        setUnreadCount(unreadCount + proposals.length);
      }
    });
    return unsub;
  }, [user?.id]);

  const tabBarBg = isAdult ? '#000000'
    : appColorMode === 'light' ? '#F0F2F8'
    : Colors.bg.secondary;
  const tabBarBorder = isAdult ? '#1a1a1a'
    : appColorMode === 'light' ? 'rgba(0,0,0,0.12)'
    : Colors.border.default;
  const screenBg = isAdult ? '#000000' : Colors.bg.primary;

  // In adult mode all tab-icon highlight colours become transparent
  const ic = (color: string) => isAdult ? 'transparent' : color;

  return (
    <View style={{ flex: 1, backgroundColor: screenBg }}>
    <Tabs
      initialRouteName="dashboard"
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: screenBg },
        tabBarStyle: [styles.tabBar, { backgroundColor: tabBarBg, borderTopColor: tabBarBorder }],
        tabBarActiveTintColor: isAdult ? '#ffffff' : appAccentColor,
        tabBarInactiveTintColor: isAdult ? '#555555' : Colors.text.tertiary,
        tabBarLabelStyle: styles.tabLabel,
        tabBarItemStyle: styles.tabItem,
      }}
    >
      {/* ── LEFT of Home: 5 tabs (kids) / 3 tabs (adult) ── */}
      <Tabs.Screen
        name="tutorial"
        options={{
          title: 'Learn',
          href: isAdult ? null : undefined,
          tabBarIcon: ({ focused }) => <TabIcon icon="🎓" focused={focused} bgColor={ic('rgba(210, 150, 255, 0.35)')} />,
        }}
      />
      <Tabs.Screen
        name="home"
        options={{
          title: 'Markets',
          tabBarIcon: ({ focused }) => <TabIcon icon="📊" focused={focused} bgColor={ic('rgba(120, 180, 255, 0.35)')} />,
        }}
      />
      <Tabs.Screen
        name="portfolio"
        options={{
          title: 'Portfolio',
          tabBarIcon: ({ focused }) => <TabIcon icon="💼" focused={focused} bgColor={ic('rgba(100, 240, 160, 0.35)')} />,
        }}
      />
      <Tabs.Screen
        name="leaderboard"
        options={{
          title: 'Ranks',

          tabBarIcon: ({ focused }) => <TabIcon icon="🏆" focused={focused} bgColor={ic('rgba(255, 220, 100, 0.35)')} />,
        }}
      />
      <Tabs.Screen
        name="advisor"
        options={{
          title: 'AI',
          tabBarIcon: ({ focused }) => <TabIcon icon="🤖" focused={focused} bgColor={ic('rgba(100, 240, 210, 0.35)')} />,
          tabBarLabelStyle: { ...styles.tabLabel, color: Colors.brand.accent },
        }}
      />

      {/* ── Centre: Home ── */}
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Home',
          tabBarButton: (props) => <CenterTabButton {...props} />,
        }}
      />

      {/* ── RIGHT of Home: 5 tabs ── */}
      <Tabs.Screen
        name="social"
        options={{
          title: 'Social',
          tabBarIcon: ({ focused }) => (
            <View>
              <TabIcon icon="💬" focused={focused} bgColor={ic('rgba(255, 160, 200, 0.35)')} />
              {unreadCount > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
                </View>
              )}
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="trophy-road"
        options={{
          title: 'Trophy',
          href: isAdult ? null : undefined,
          tabBarIcon: ({ focused }) => <TabIcon icon="🎖️" focused={focused} bgColor={ic('rgba(255, 200, 120, 0.35)')} />,
        }}
      />
      <Tabs.Screen
        name="shop"
        options={{
          title: 'Shop',
          href: isAdult ? null : undefined,
          tabBarIcon: ({ focused }) => <TabIcon icon="🛒" focused={focused} bgColor={ic('rgba(120, 230, 240, 0.35)')} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused }) => <TabIcon icon="👤" focused={focused} bgColor={ic('rgba(190, 170, 255, 0.35)')} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ focused }) => <TabIcon icon="⚙️" focused={focused} bgColor={ic('rgba(180, 200, 210, 0.35)')} />,
        }}
      />

      {/* ── Hidden routes (no tab icon) ── */}
      <Tabs.Screen name="trade"         options={{ href: null }} />
      <Tabs.Screen name="buy-bling"     options={{ href: null }} />
      <Tabs.Screen name="notifications" options={{ href: null }} />
    </Tabs>
    <AchievementToast />
    </View>
  );
}

function TabIcon({
  icon,
  focused,
  bgColor,
}: {
  icon: string;
  focused: boolean;
  bgColor: string;   // expects a full rgba() string
}) {
  return (
    <View style={[styles.tabIconWrap, focused && { backgroundColor: bgColor }]}>
      <Text style={[styles.tabIconEmoji, { opacity: focused ? 1 : 0.50 }]}>{icon}</Text>
    </View>
  );
}

function CenterTabButton({ onPress, accessibilityState }: any) {
  const focused = accessibilityState?.selected;
  const isAdultMode = useAppStore(s => s.appMode) === 'adult';
  const boxStyle = isAdultMode
    ? { backgroundColor: focused ? '#333333' : '#111111', borderColor: '#333333' }
    : undefined;
  return (
    <TouchableOpacity
      onPress={onPress}
      style={styles.centerTabOuter}
      activeOpacity={0.85}
    >
      <View style={[styles.centerTabBox, !isAdultMode && focused && styles.centerTabBoxActive, boxStyle]}>
        <Text style={styles.centerTabIcon}>🏠</Text>
        <Text style={[styles.centerTabLabel, { color: focused ? '#fff' : isAdultMode ? '#555555' : Colors.text.tertiary }]}>Home</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.bg.secondary,
    borderTopColor: Colors.border.default,
    borderTopWidth: 1,
    height: 52,
    paddingBottom: 4,
    paddingTop: 3,
  },
  tabItem: {
    paddingHorizontal: 0,
    minWidth: 0,
  },
  tabLabel: {
    fontSize: 6.5,
    fontWeight: FontWeight.medium,
  },
  // Center home tab — sits inside the bar, no overlap
  centerTabOuter: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerTabBox: {
    backgroundColor: Colors.bg.tertiary,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.border.default,
    paddingHorizontal: 9,
    paddingVertical: 3,
    alignItems: 'center',
    minWidth: 46,
  },
  centerTabBoxActive: {
    backgroundColor: Colors.brand.primary,
    borderColor: Colors.brand.primary,
  },
  centerTabIcon: { fontSize: 15 },
  centerTabLabel: {
    fontSize: 7,
    fontWeight: FontWeight.bold,
    marginTop: 1,
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: Colors.market.loss,
    borderRadius: 10,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: { color: '#fff', fontSize: 9, fontWeight: FontWeight.bold },
  // Per-tab colour pill
  tabIconWrap: {
    borderRadius: 8,
    paddingHorizontal: 5,
    paddingVertical: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabIconEmoji: { fontSize: 13 },
});
