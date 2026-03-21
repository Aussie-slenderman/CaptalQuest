import React, { useMemo, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, StatusBar, SafeAreaView, Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { ALL_NEWS } from './notifications';
import Sidebar from '../../src/components/Sidebar';
import AppHeader from '../../src/components/AppHeader';
import { useAppStore } from '../../src/store/useAppStore';
import { formatRelativeTime } from '../../src/utils/formatters';
import { getQuotes } from '../../src/services/stockApi';
import { updateUser } from '../../src/services/auth';
import { Colors, LightColors, FontSize, FontWeight, Spacing, Radius } from '../../src/constants/theme';

// ─── Market indices ───────────────────────────────────────────────────────────
const MARKET_INDICES = [
  { symbol: '^GSPC', name: 'S&P 500',    price: 6672.62,  changePercent: -1.50 },
  { symbol: '^IXIC', name: 'NASDAQ',     price: 22105.36, changePercent: -0.93 },
  { symbol: '^DJI',  name: 'Dow Jones',  price: 46958.47, changePercent: -1.55 },
  { symbol: '^FTSE', name: 'FTSE 100',   price: 10261.15, changePercent: -0.43 },
  { symbol: '^GDAXI',name: 'DAX',        price: 23447.29, changePercent: -0.60 },
  { symbol: '^N225', name: 'Nikkei',     price: 53819.61, changePercent: -1.16 },
];

const DASHBOARD_NEWS = [
  {
    id: '1',
    headline: 'Markets selloff deepens as tariff fears and recession concerns rattle investors',
    source: 'Reuters',
    publishedAt: Date.now() - 1_800_000,
    relatedSymbols: ['SPY', 'QQQ'],
    category: 'Markets',
  },
  {
    id: '2',
    headline: 'Tesla slides as EV demand concerns mount and margin pressure weighs on outlook',
    source: 'Bloomberg',
    publishedAt: Date.now() - 5_400_000,
    relatedSymbols: ['TSLA'],
    category: 'Stocks',
  },
  {
    id: '3',
    headline: 'NVIDIA faces pressure as AI spending scrutiny grows among hyperscalers',
    source: 'WSJ',
    publishedAt: Date.now() - 9_000_000,
    relatedSymbols: ['NVDA', 'AMD'],
    category: 'Tech',
  },
  {
    id: '4',
    headline: 'Apple quietly launches new iPhone SE with advanced AI features at lower price point',
    source: 'CNBC',
    publishedAt: Date.now() - 14_400_000,
    relatedSymbols: ['AAPL'],
    category: 'Tech',
  },
  {
    id: '5',
    headline: 'Fed holds rates steady, signals patient approach as jobs data stays resilient',
    source: 'Financial Times',
    publishedAt: Date.now() - 21_600_000,
    relatedSymbols: ['SPY', 'GLD'],
    category: 'Economy',
  },
];

export default function DashboardScreen() {
  const {
    user, setUser,
    quotes, setQuote, notifications, newsLastRead,
    portfolio, isSidebarOpen, setSidebarOpen, appTabColors, appMode, appColorMode,
    showWelcomePopup, setShowWelcomePopup,
  } = useAppStore();
  const isAdult = appMode === 'adult';
  const adultBg = appColorMode === 'light' ? '#FFFFFF' : '#000000';
  const isLight = appColorMode === 'light';
  const C = isLight ? LightColors : Colors;

  // Dismisses the welcome popup and marks it as permanently shown in the DB
  function handleDismissWelcome() {
    setShowWelcomePopup(false);
    if (user) {
      updateUser(user.id, { welcomeShown: true }).catch(() => {});
      setUser({ ...user, welcomeShown: true });
    }
  }

  const tabColor = appTabColors["home"] ?? Colors.brand.primary;
  const gc3 = (a: string, b: string, c: string) => isAdult ? ["transparent","transparent","transparent"] as any : [a,b,c] as any;

  const unreadNotifications = useMemo(() => {
    const heldSymbols = portfolio?.holdings.map(h => h.symbol) ?? [];
    const hasUnreadHoldingsNews = heldSymbols.length > 0 &&
      ALL_NEWS.some(n =>
        n.relatedSymbols.some(s => heldSymbols.includes(s)) && n.publishedAt > newsLastRead
      );
    return notifications.filter(n => !n.read).length + (hasUnreadHoldingsNews ? 1 : 0);
  }, [notifications, portfolio, newsLastRead]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const liveQuotes = await getQuotes(MARKET_INDICES.map(i => i.symbol));
        if (cancelled) return;
        Object.entries(liveQuotes).forEach(([sym, q]) => setQuote(sym, q));
      } catch { /* fall back to mock */ }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <View style={{ flex: 1 }}>
      <SafeAreaView style={[styles.safeArea, { backgroundColor: isAdult ? adultBg : C.bg.primary }]}>
        <StatusBar barStyle="light-content" backgroundColor={isAdult ? adultBg : C.bg.primary} />

        {/* ── Top bar ── */}
        <AppHeader title="CapitalQuest" />

        {/* ── Market indices strip ── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.indicesStrip}
          contentContainerStyle={styles.indicesContent}
        >
          {MARKET_INDICES.map(idx => {
            const live = quotes[idx.symbol];
            const price = live?.price ?? idx.price;
            const pct = live?.changePercent ?? idx.changePercent;
            const up = pct >= 0;
            return (
              <View key={idx.symbol} style={[styles.indexPill, { backgroundColor: C.bg.secondary, borderColor: C.border.default }]}>
                <Text style={[styles.indexName, { color: C.text.tertiary }]}>{idx.name}</Text>
                <Text style={[styles.indexPrice, { color: C.text.primary }]}>
                  {price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Text>
                <Text style={[styles.indexChange, { color: up ? Colors.market.gain : Colors.market.loss }]}>
                  {up ? '▲' : '▼'} {Math.abs(pct).toFixed(2)}%
                </Text>
              </View>
            );
          })}
        </ScrollView>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* ── Hero slogan ── */}
          <LinearGradient
            colors={gc3(`${tabColor}22`, `${tabColor}08`, "transparent")}
            style={styles.heroSection}
          >
            <Text style={[styles.heroSlogan, { color: C.text.primary }]}>Practice.</Text>
            <Text style={[styles.heroSlogan, { color: C.text.primary }]}>Trade.</Text>
            <Text style={[styles.heroSlogan, { color: tabColor }]}>Prosper.</Text>
            <Text style={[styles.heroSubtitle, { color: C.text.secondary }]}>
              Master the markets risk-free — real prices, real strategies.
            </Text>

            {/* Quick action buttons */}
            <View style={styles.quickActions}>
              <TouchableOpacity
                style={[styles.quickBtn, { borderColor: tabColor }]}
                onPress={() => router.push('/(app)/home' as never)}
              >
                <Text style={styles.quickBtnIcon}>📊</Text>
                <Text style={[styles.quickBtnText, { color: tabColor }]}>Markets</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.quickBtn, { borderColor: Colors.brand.accent }]}
                onPress={() => router.push('/(app)/portfolio' as never)}
              >
                <Text style={styles.quickBtnIcon}>💼</Text>
                <Text style={[styles.quickBtnText, { color: Colors.brand.accent }]}>Portfolio</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.quickBtn, { borderColor: Colors.brand.gold }]}
                onPress={() => router.push('/(app)/leaderboard' as never)}
              >
                <Text style={styles.quickBtnIcon}>🏆</Text>
                <Text style={[styles.quickBtnText, { color: Colors.brand.gold }]}>Rankings</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>

          {/* ── News section ── */}
          <View style={styles.newsHeader}>
            <Text style={[styles.newsTitle, { color: C.text.primary }]}>📰  Market News</Text>
            <TouchableOpacity onPress={() => router.push('/(app)/home' as never)}>
              <Text style={[styles.seeAll, { color: tabColor }]}>See all →</Text>
            </TouchableOpacity>
          </View>

          {DASHBOARD_NEWS.map((article, i) => (
            <TouchableOpacity key={article.id} style={[styles.newsCard, { backgroundColor: C.bg.secondary, borderColor: C.border.default }]} activeOpacity={0.8}>
              <View style={[styles.newsCategoryBadge, { backgroundColor: C.bg.tertiary }]}>
                <Text style={styles.newsCategoryText}>{article.category}</Text>
              </View>
              <Text style={[styles.newsHeadline, { color: C.text.primary }]} numberOfLines={2}>{article.headline}</Text>
              <View style={styles.newsMeta}>
                <Text style={styles.newsSource}>{article.source}</Text>
                <Text style={[styles.newsDot, { color: C.text.tertiary }]}>·</Text>
                <Text style={[styles.newsTime, { color: C.text.tertiary }]}>{formatRelativeTime(article.publishedAt)}</Text>
                <View style={styles.newsTagRow}>
                  {article.relatedSymbols.slice(0, 2).map(sym => (
                    <View key={sym} style={[styles.newsTag, { backgroundColor: C.bg.input, borderColor: C.border.default }]}>
                      <Text style={[styles.newsTagText, { color: C.text.secondary }]}>{sym}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </TouchableOpacity>
          ))}

          <View style={{ height: 24 }} />
        </ScrollView>
      </SafeAreaView>

      <Sidebar visible={isSidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* ── One-time Welcome Popup ── */}
      <Modal
        visible={showWelcomePopup}
        animationType="fade"
        transparent
        onRequestClose={handleDismissWelcome}
      >
        <View style={styles.welcomeOverlay}>
          <LinearGradient
            colors={['#0A1228', '#111827']}
            style={styles.welcomeCard}
          >
            {/* Gold glow ring */}
            <View style={styles.welcomeIconRing}>
              <Text style={styles.welcomeIconEmoji}>🎉</Text>
            </View>

            <Text style={styles.welcomeTitle}>Congratulations!</Text>

            <Text style={styles.welcomeBody}>
              You have now created your{' '}
              <Text style={styles.welcomeBrand}>CapitalQuest</Text>{' '}
              account and have been awarded{' '}
              <Text style={styles.welcomeMoney}>$10,000</Text>{' '}
              virtual dollars.
            </Text>

            <Text style={styles.welcomeFun}>Have Fun!!! 🚀</Text>

            <TouchableOpacity
              style={styles.welcomeBtn}
              onPress={handleDismissWelcome}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={[Colors.brand.primary, Colors.brand.accent]}
                style={styles.welcomeBtnGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={styles.welcomeBtnText}>Let's Trade! 📈</Text>
              </LinearGradient>
            </TouchableOpacity>
          </LinearGradient>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: Colors.bg.primary },

  // Top bar
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.default,
  },
  appName: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.extrabold,
    color: Colors.brand.primary,
    letterSpacing: 0.4,
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  iconBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  iconText: { fontSize: 22 },
  notifDot: {
    position: 'absolute',
    top: 7,
    right: 7,
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: Colors.market.loss,
    borderWidth: 1.5,
    borderColor: Colors.bg.primary,
  },
  hamburger: { gap: 4, alignItems: 'flex-end' },
  hLine: {
    width: 20,
    height: 2,
    backgroundColor: Colors.text.secondary,
    borderRadius: 2,
  },

  // Indices strip
  indicesStrip: {
    maxHeight: 72,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.default,
  },
  indicesContent: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  indexPill: {
    backgroundColor: Colors.bg.secondary,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    minWidth: 110,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  indexName:   { fontSize: FontSize.xs, color: Colors.text.tertiary, fontWeight: FontWeight.medium },
  indexPrice:  { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.text.primary, marginTop: 2 },
  indexChange: { fontSize: FontSize.xs, fontWeight: FontWeight.medium, marginTop: 1 },

  // Scroll
  scroll:   { flex: 1 },
  scrollContent: { paddingTop: Spacing.base },

  // Hero
  heroSection: {
    marginHorizontal: Spacing.base,
    marginBottom: Spacing.xl,
    paddingVertical: Spacing['2xl'],
    paddingHorizontal: Spacing.xl,
    borderRadius: Radius.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  heroSlogan: {
    fontSize: 42,
    fontWeight: FontWeight.extrabold,
    color: Colors.text.primary,
    letterSpacing: -1.5,
    lineHeight: 50,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: FontSize.base,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginTop: Spacing.md,
    lineHeight: 22,
    maxWidth: 280,
  },
  quickActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.xl,
    width: '100%',
  },
  quickBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 10,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    backgroundColor: 'rgba(255,255,255,0.04)',
    gap: 6,
    minWidth: 0,
  },
  quickBtnIcon: { fontSize: 22 },
  quickBtnText: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold },

  // News
  newsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: Spacing.base,
    marginBottom: Spacing.sm,
  },
  newsTitle: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.semibold,
    color: Colors.text.primary,
  },
  seeAll: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
  },
  newsCard: {
    backgroundColor: Colors.bg.secondary,
    borderRadius: Radius.lg,
    marginHorizontal: Spacing.base,
    marginBottom: Spacing.sm,
    padding: Spacing.base,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  newsCategoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.bg.tertiary,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    marginBottom: Spacing.xs,
  },
  newsCategoryText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    color: Colors.brand.primary,
  },
  newsHeadline: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.medium,
    color: Colors.text.primary,
    lineHeight: 21,
    marginBottom: Spacing.sm,
  },
  newsMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flexWrap: 'wrap',
  },
  newsSource: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold, color: Colors.brand.primary },
  newsDot:    { fontSize: FontSize.xs, color: Colors.text.tertiary },
  newsTime:   { fontSize: FontSize.xs, color: Colors.text.tertiary },
  newsTagRow: { flexDirection: 'row', gap: 4, marginLeft: 4 },
  newsTag: {
    backgroundColor: Colors.bg.input,
    borderRadius: Radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  newsTagText: { fontSize: FontSize.xs, fontWeight: FontWeight.semibold, color: Colors.text.secondary },

  // ── Welcome popup ──
  welcomeOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  welcomeCard: {
    width: '100%',
    borderRadius: Radius.xl,
    padding: Spacing['2xl'],
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.brand.gold + '60',
    shadowColor: Colors.brand.gold,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 20,
  },
  welcomeIconRing: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: Colors.brand.gold + '22',
    borderWidth: 2,
    borderColor: Colors.brand.gold + '66',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  welcomeIconEmoji: { fontSize: 44 },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: FontWeight.extrabold,
    color: Colors.text.primary,
    letterSpacing: -0.5,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  welcomeBody: {
    fontSize: FontSize.base,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: Spacing.md,
  },
  welcomeBrand: {
    color: Colors.brand.primary,
    fontWeight: FontWeight.bold,
  },
  welcomeMoney: {
    color: Colors.market.gain,
    fontWeight: FontWeight.extrabold,
  },
  welcomeFun: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.extrabold,
    color: Colors.brand.gold,
    marginBottom: Spacing.xl,
    textAlign: 'center',
  },
  welcomeBtn: {
    width: '100%',
    borderRadius: Radius.lg,
    overflow: 'hidden',
    shadowColor: Colors.brand.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  welcomeBtnGradient: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  welcomeBtnText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.extrabold,
    color: '#fff',
    letterSpacing: 0.3,
  },
});
