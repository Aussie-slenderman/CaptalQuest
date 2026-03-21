import React, { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Dimensions, ScrollView, Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Colors, FontSize, FontWeight, Spacing, Radius } from '../../src/constants/theme';
import { useAppStore } from '../../src/store/useAppStore';

const { width } = Dimensions.get('window');

// ── Per-slide colour theme ─────────────────────────────────────────────────
const SLIDE_COLORS = [
  { accent: '#FF8C00', banner: ['#FF8C00', '#FFB347'] as const },   // 1 – orange
  { accent: '#00C853', banner: ['#00C853', '#69F0AE'] as const },   // 2 – green
  { accent: '#2979FF', banner: ['#2979FF', '#82B1FF'] as const },   // 3 – blue
  { accent: '#E91E63', banner: ['#E91E63', '#F48FB1'] as const },   // 4 – pink
  { accent: '#00BCD4', banner: ['#00BCD4', '#80DEEA'] as const },   // 5 – cyan
  { accent: '#9C27B0', banner: ['#9C27B0', '#CE93D8'] as const },   // 6 – purple
  { accent: '#FF5722', banner: ['#FF5722', '#FFAB91'] as const },   // 7 – deep-orange
  { accent: '#F5C518', banner: ['#F5A623', '#F5C518'] as const },   // 8 – gold
];

const SLIDES = [
  {
    id: 'what',
    icon: '🏢',
    title: "What's a Stock?",
    intro: 'Big companies let people own a small piece of them!',
    content: [
      '🏢  A company is a business that makes or sells something — like Apple making phones, or Nike making trainers.',
      '📄  A STOCK (also called a SHARE) is a tiny piece of that company. When you own a share, you are a part-owner!',
      '📈  If the company does really well and earns lots of money, your share becomes worth MORE. If it does badly, it might be worth less.',
    ],
    fact: '🍎  Apple is one of the most valuable companies ever. It is worth over $3 TRILLION — that is three thousand billion dollars!',
  },
  {
    id: 'buying',
    icon: '💰',
    title: 'Buying & Selling',
    intro: 'You spend money to own a share — and sell it later for more!',
    content: [
      '🛒  When you BUY a stock, you pay money to own a share of a company.',
      '💸  When you SELL a stock later, you hope to get back MORE than you paid. The extra money you make is called PROFIT!',
      '🎯  The key idea: Buy LOW, sell HIGH. It sounds simple, but it takes practice — which is exactly what CapitalQuest is for!',
    ],
    fact: '🎮  If someone bought £1,000 of Nintendo stock in 2017, it would be worth over £3,000 today!',
  },
  {
    id: 'price',
    icon: '📈',
    title: 'Why Prices Go Up & Down',
    intro: 'Stock prices change every single day!',
    content: [
      '👥  Prices go UP when lots of people want to buy a stock. They go DOWN when lots of people want to sell.',
      '📰  Big news about a company changes its price too. Good news = more buyers = price goes up. Bad news = more sellers = price goes down.',
      '🚀  If a company makes something people really love, lots of people want to own a part of it — so the price rises!',
    ],
    fact: '📱  When Apple first showed the iPhone in 2007, their stock jumped 8% in just ONE day — because everyone was so excited!',
  },
  {
    id: 'risk',
    icon: '🌈',
    title: 'Spread Your Money Around',
    intro: 'Smart investors never put all their money in one place!',
    content: [
      '😊  In CapitalQuest, all your money is VIRTUAL — so there is zero real risk! You can try anything you like!',
      '💡  But in real life, stock prices can go down. A smart move is to buy shares in LOTS of different companies.',
      '🌈  That way, if one company does badly, the others can still do well. This is called DIVERSIFICATION — sharing your money around.',
    ],
    fact: '🌍  The S&P 500 follows the 500 biggest companies in America all at once. It has grown about 10% every year for over 100 years!',
  },
  {
    id: 'reading',
    icon: '🟢',
    title: 'Reading the Numbers',
    intro: 'Green means up, red means down — that is all you need to know!',
    content: [
      '🟢  GREEN numbers mean the price went UP today. Good news if you own that stock!',
      '🔴  RED numbers mean the price went DOWN today.',
      '📊  The % sign tells you by HOW MUCH. +5% means the price grew by 5 for every 100.',
      '🔢  Volume shows how many shares were bought and sold today. A really big number usually means something important happened!',
    ],
    fact: '💚  Warren Buffett — one of the richest people in the world — started investing when he was just 11 years old!',
  },
  {
    id: 'international',
    icon: '🌍',
    title: 'Markets Around the World',
    intro: 'You can buy shares in companies from all over the planet!',
    content: [
      '🗽  The biggest stock markets are in New York, London, and Tokyo — but there are markets in almost every country!',
      '🌐  CapitalQuest lets you trade on all of them. You could own shares in a company from Japan, Germany, or Brazil!',
      '⏰  Every market opens and closes at different times of the day. While you are at school, traders around the world are already buying and selling!',
    ],
    fact: '🌏  There are over 60,000 companies you can buy shares in around the whole world. That is a huge number of choices!',
  },
  {
    id: 'orders',
    icon: '📲',
    title: 'How to Make a Trade',
    intro: 'Buying a stock only takes a few taps!',
    content: [
      '🔍  First, search for a company you want to invest in.',
      '🖱️  Choose how many shares you want to buy, or how much money you want to spend, then tap BUY.',
      '✅  To sell, do the same steps but tap SELL instead. Your balance will update straight away!',
    ],
    fact: '⚡  On real stock markets, a trade can happen in less than one millionth of a second. Computers move incredibly fast!',
  },
  {
    id: 'ready',
    icon: '🏆',
    title: "You Are Ready to Trade! 🎉",
    intro: "You have learned everything you need to get started!",
    content: [
      '🎊  Well done! You now know what stocks are, why prices change, and how to buy and sell.',
      '🪙  In CapitalQuest, all the money is virtual — nothing is real, so you can try things out without any worry at all.',
      '🥇  Try different plans, check the news, unlock achievements, and climb the leaderboard. The more you play, the better you get!',
    ],
    fact: '🌟  Every great investor in the world started out as a complete beginner — just like you right now. Your journey starts here!',
  },
];

const IS_LAST = (index: number) => index === SLIDES.length - 1;

export default function TutorialScreen() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [selectedMode, setSelectedMode] = useState<'kids' | 'adult' | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const progressAnim = useRef(new Animated.Value(0)).current;
  const { setAppMode } = useAppStore();

  const goTo = (index: number) => {
    setCurrentSlide(index);
    scrollRef.current?.scrollTo({ x: index * width, animated: true });
    Animated.timing(progressAnim, {
      toValue: (index + 1) / SLIDES.length,
      duration: 300,
      useNativeDriver: false,
    }).start();
  };

  const next = () => {
    if (!IS_LAST(currentSlide)) {
      goTo(currentSlide + 1);
    } else {
      const mode = selectedMode ?? 'kids';
      setAppMode(mode);
      router.replace('/(auth)/setup');
    }
  };

  const skip = () => router.replace('/(auth)/setup');

  const slide = SLIDES[currentSlide];
  const theme = SLIDE_COLORS[currentSlide];
  const isLastSlide = IS_LAST(currentSlide);
  const canProceed = !isLastSlide || selectedMode !== null;

  return (
    <View style={styles.container}>

      {/* ── Coloured top banner ──────────────────────────────────── */}
      <LinearGradient
        colors={theme.banner}
        style={styles.banner}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
      >
        {/* Progress bar */}
        <View style={styles.progressRow}>
          <View style={styles.progressTrack}>
            <Animated.View
              style={[
                styles.progressFill,
                {
                  width: progressAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0%', '100%'],
                  }),
                },
              ]}
            />
          </View>
          <Text style={styles.progressText}>{currentSlide + 1}/{SLIDES.length}</Text>
        </View>

        {/* Icon + skip row */}
        <View style={styles.bannerRow}>
          <View style={[styles.iconBubble, { backgroundColor: 'rgba(255,255,255,0.25)' }]}>
            <Text style={styles.slideIcon}>{slide.icon}</Text>
          </View>
          <TouchableOpacity style={styles.skipButton} onPress={skip}>
            <Text style={styles.skipText}>Skip ›</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.slideTitle}>{slide.title}</Text>
        <Text style={styles.slideIntro}>{slide.intro}</Text>
      </LinearGradient>

      {/* ── Scrollable content ───────────────────────────────────── */}
      <ScrollView
        style={styles.contentScroll}
        contentContainerStyle={styles.contentInner}
        showsVerticalScrollIndicator={false}
      >
        {slide.content.map((para, i) => (
          <View key={i} style={[styles.bulletCard, { borderLeftColor: theme.accent }]}>
            <Text style={styles.bulletText}>{para}</Text>
          </View>
        ))}

        {/* Did You Know box */}
        <LinearGradient
          colors={[theme.accent + '30', theme.accent + '10']}
          style={[styles.factBox, { borderColor: theme.accent }]}
        >
          <Text style={styles.factLabel}>✨ Did You Know?</Text>
          <Text style={[styles.factText, { color: theme.accent }]}>{slide.fact}</Text>
        </LinearGradient>

        {/* ── Version picker — last slide only ─────────────────── */}
        {isLastSlide && (
          <View style={styles.modeSection}>
            <Text style={styles.modeSectionTitle}>Choose Your Experience</Text>
            <Text style={styles.modeSectionSubtitle}>
              Pick the version that suits you best. You can change this later in Settings.
            </Text>

            {/* Kids Mode card */}
            <TouchableOpacity
              style={[
                styles.modeCard,
                selectedMode === 'kids' && styles.modeCardKidsSelected,
              ]}
              onPress={() => setSelectedMode('kids')}
              activeOpacity={0.82}
            >
              <View style={styles.modeCardHeader}>
                <View style={[styles.modeIconBubble, { backgroundColor: 'rgba(245,197,24,0.18)' }]}>
                  <Text style={styles.modeCardIcon}>🎮</Text>
                </View>
                <View style={styles.modeCardTitleRow}>
                  <Text style={[styles.modeCardTitle, { color: '#F5C518' }]}>Kids Mode</Text>
                  <Text style={styles.modeCardAge}>Ages 8 – 18</Text>
                </View>
                <View style={[styles.modeRadio, selectedMode === 'kids' && styles.modeRadioKidsActive]}>
                  {selectedMode === 'kids' && <View style={[styles.modeRadioDot, { backgroundColor: '#F5C518' }]} />}
                </View>
              </View>
              <Text style={styles.modeCardDesc}>
                The full CapitalQuest experience! Includes:
              </Text>
              <View style={styles.modeFeatureList}>
                <Text style={styles.modeFeatureItem}>🎨  Unlock and equip custom avatars</Text>
                <Text style={styles.modeFeatureItem}>🐾  Collect and level up rare pets</Text>
                <Text style={styles.modeFeatureItem}>🏆  Trophy Road with milestone rewards</Text>
                <Text style={styles.modeFeatureItem}>📈  Real-time stock trading simulation</Text>
                <Text style={styles.modeFeatureItem}>🥇  Global leaderboard &amp; achievements</Text>
              </View>
            </TouchableOpacity>

            {/* Adult Mode card */}
            <TouchableOpacity
              style={[
                styles.modeCard,
                selectedMode === 'adult' && styles.modeCardAdultSelected,
              ]}
              onPress={() => setSelectedMode('adult')}
              activeOpacity={0.82}
            >
              <View style={styles.modeCardHeader}>
                <View style={[styles.modeIconBubble, { backgroundColor: 'rgba(0,179,230,0.18)' }]}>
                  <Text style={styles.modeCardIcon}>💼</Text>
                </View>
                <View style={styles.modeCardTitleRow}>
                  <Text style={[styles.modeCardTitle, { color: Colors.brand.primary }]}>Adult Mode</Text>
                  <Text style={styles.modeCardAge}>Classic &amp; Focused</Text>
                </View>
                <View style={[styles.modeRadio, selectedMode === 'adult' && styles.modeRadioAdultActive]}>
                  {selectedMode === 'adult' && <View style={[styles.modeRadioDot, { backgroundColor: Colors.brand.primary }]} />}
                </View>
              </View>
              <Text style={styles.modeCardDesc}>
                A clean, distraction-free trading experience. Includes:
              </Text>
              <View style={styles.modeFeatureList}>
                <Text style={styles.modeFeatureItem}>📈  Real-time stock trading simulation</Text>
                <Text style={styles.modeFeatureItem}>💼  Full portfolio &amp; analytics tools</Text>
                <Text style={styles.modeFeatureItem}>🥇  Global leaderboard &amp; achievements</Text>
                <Text style={styles.modeFeatureItem}>🤖  AI market advisor</Text>
                <Text style={[styles.modeFeatureItem, styles.modeFeatureOff]}>✕  No avatars, pets, or trophy road</Text>
              </View>
            </TouchableOpacity>

            {!selectedMode && (
              <Text style={styles.modeHint}>Please select a version to continue</Text>
            )}
          </View>
        )}
      </ScrollView>

      {/* ── Navigation dots ──────────────────────────────────────── */}
      <View style={styles.dots}>
        {SLIDES.map((_, i) => (
          <TouchableOpacity key={i} onPress={() => goTo(i)} hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}>
            <View
              style={[
                styles.dot,
                i === currentSlide && [styles.dotActive, { backgroundColor: theme.accent }],
              ]}
            />
          </TouchableOpacity>
        ))}
      </View>

      {/* ── Next button ──────────────────────────────────────────── */}
      <TouchableOpacity
        style={[styles.nextButton, !canProceed && styles.nextButtonDisabled]}
        onPress={canProceed ? next : undefined}
        activeOpacity={canProceed ? 0.85 : 1}
      >
        <LinearGradient
          colors={canProceed ? theme.banner : ['#2A2F3E', '#2A2F3E']}
          style={styles.nextGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <Text style={[styles.nextText, !canProceed && styles.nextTextDisabled]}>
            {isLastSlide ? "Let's Trade! 🚀" : 'Next  →'}
          </Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg.primary,
  },

  // ── Banner ──────────────────────────────────────────────────────
  banner: {
    paddingTop: 56,
    paddingHorizontal: Spacing.xl,
    paddingBottom: 24,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  progressTrack: {
    flex: 1,
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.30)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: 3,
  },
  progressText: {
    fontSize: FontSize.sm,
    color: 'rgba(255,255,255,0.85)',
    fontWeight: FontWeight.bold,
    width: 36,
  },
  bannerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  iconBubble: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slideIcon: { fontSize: 38 },
  skipButton: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderRadius: 20,
  },
  skipText: {
    color: '#fff',
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  slideTitle: {
    fontSize: 26,
    fontWeight: FontWeight.extrabold,
    color: '#fff',
    marginBottom: 6,
  },
  slideIntro: {
    fontSize: FontSize.base,
    color: 'rgba(255,255,255,0.88)',
    lineHeight: 22,
  },

  // ── Content ──────────────────────────────────────────────────────
  contentScroll: { flex: 1 },
  contentInner: {
    padding: Spacing.xl,
    paddingBottom: 8,
    gap: 10,
  },
  bulletCard: {
    backgroundColor: Colors.bg.secondary,
    borderRadius: Radius.md,
    padding: Spacing.base,
    borderLeftWidth: 4,
  },
  bulletText: {
    fontSize: 15,
    color: Colors.text.primary,
    lineHeight: 24,
  },

  // ── Fact box ─────────────────────────────────────────────────────
  factBox: {
    borderRadius: Radius.lg,
    padding: Spacing.base,
    borderWidth: 1.5,
    marginTop: 4,
  },
  factLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.extrabold,
    color: '#fff',
    marginBottom: 6,
    letterSpacing: 0.5,
  },
  factText: {
    fontSize: FontSize.sm,
    lineHeight: 20,
    fontWeight: FontWeight.medium,
  },

  // ── Version picker ────────────────────────────────────────────────
  modeSection: {
    marginTop: 20,
    gap: 12,
  },
  modeSectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.extrabold,
    color: Colors.text.primary,
    textAlign: 'center',
  },
  modeSectionSubtitle: {
    fontSize: FontSize.sm,
    color: Colors.text.secondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 4,
  },
  modeCard: {
    backgroundColor: Colors.bg.secondary,
    borderRadius: Radius.lg,
    padding: Spacing.base,
    borderWidth: 2,
    borderColor: Colors.bg.tertiary,
    gap: 10,
  },
  modeCardKidsSelected: {
    borderColor: '#F5C518',
    backgroundColor: 'rgba(245,197,24,0.07)',
  },
  modeCardAdultSelected: {
    borderColor: Colors.brand.primary,
    backgroundColor: 'rgba(0,179,230,0.07)',
  },
  modeCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  modeIconBubble: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeCardIcon: { fontSize: 26 },
  modeCardTitleRow: { flex: 1 },
  modeCardTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.extrabold,
  },
  modeCardAge: {
    fontSize: FontSize.xs,
    color: Colors.text.tertiary,
    marginTop: 2,
  },
  modeRadio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: Colors.bg.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeRadioKidsActive: { borderColor: '#F5C518' },
  modeRadioAdultActive: { borderColor: Colors.brand.primary },
  modeRadioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  modeCardDesc: {
    fontSize: FontSize.sm,
    color: Colors.text.secondary,
    lineHeight: 19,
  },
  modeFeatureList: { gap: 5 },
  modeFeatureItem: {
    fontSize: FontSize.sm,
    color: Colors.text.primary,
    lineHeight: 20,
  },
  modeFeatureOff: {
    color: Colors.text.tertiary,
    textDecorationLine: 'line-through',
  },
  modeHint: {
    fontSize: FontSize.xs,
    color: Colors.market.loss,
    textAlign: 'center',
    marginTop: 4,
  },

  // ── Dots ─────────────────────────────────────────────────────────
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.bg.tertiary,
  },
  dotActive: {
    width: 28,
    borderRadius: 4,
  },

  // ── Next button ──────────────────────────────────────────────────
  nextButton: {
    marginHorizontal: Spacing.xl,
    marginBottom: 32,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  nextButtonDisabled: {
    opacity: 0.5,
  },
  nextGradient: {
    paddingVertical: 17,
    alignItems: 'center',
  },
  nextText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.extrabold,
    color: '#fff',
    letterSpacing: 0.5,
  },
  nextTextDisabled: {
    color: Colors.text.tertiary,
  },
});
