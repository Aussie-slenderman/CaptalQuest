import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  TouchableOpacity, Switch, Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useAppStore } from '../../src/store/useAppStore';
import { signOut, deleteAccount } from '../../src/services/auth';
import { ACHIEVEMENTS, LEVELS, getXPProgress } from '../../src/constants/achievements';
import { TROPHY_REWARDS, getCurrentAvatar, getCurrentPet, type TrophyReward } from '../../src/constants/trophyRewards';
import { SHOP_ITEMS, TIER_COLORS, TIER_LABELS, blingAtMilestone, type ShopItem, type PetAbility } from '../../src/constants/shopItems';
import AppHeader from '../../src/components/AppHeader';
import Sidebar from '../../src/components/Sidebar';
import { Colors, LightColors, FontSize, FontWeight, Spacing, Radius } from '../../src/constants/theme';
import { formatCurrency, formatPercent, formatAccountNumber } from '../../src/utils/formatters';

export default function ProfileScreen() {
  const {
    user, portfolio, setUser,
    bling,
    equippedAvatarId, setEquippedAvatarId,
    equippedPetId,   setEquippedPetId,
    shopPurchases,
    petAbilityActiveUntil, setPetAbilityActiveUntil,
    petAbilityLastUsed,    setPetAbilityLastUsed,
    appColorMode, appTabColors,
    isSidebarOpen, setSidebarOpen,
  appMode: profileAppMode,
  } = useAppStore();
  const tabColor = appTabColors['profile'] ?? '#7C3AED';
  const isLight = appColorMode === 'light';
  const C = isLight ? LightColors : Colors;
  const screenBg = profileAppMode === 'adult' ? (isLight ? '#FFFFFF' : '#000000') : isLight ? '#F5F0FF' : '#4A1898';
  const adultGrad = profileAppMode === 'adult';
  const gc = (a: string, b: string, c: string) => adultGrad ? ['transparent','transparent','transparent'] as any : [a,b,c] as any;
  const gcFull = (a: string, b: string, c: string, d: string) => adultGrad ? ['transparent','transparent','transparent',screenBg] as any : [a,b,c,d] as any;
  const [isDark] = useState(true);
  const [wardrobeOpen, setWardrobeOpen] = useState(false);
  const [signOutVisible, setSignOutVisible] = useState(false);
  const [deleteVisible, setDeleteVisible] = useState(false);
  const [abilityInfoVisible, setAbilityInfoVisible] = useState(false);
  const [now, setNow] = useState(Date.now());

  // Tick every second to keep timers live
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!user) return null;

  const xpInfo = getXPProgress(user.xp || 0);
  const levelColor = LEVELS.find(l => l.level === user.level)?.color ?? Colors.brand.primary;
  const gainPct = portfolio?.totalGainLossPercent ?? 0;

  // ── Pet ability ─────────────────────────────────────────────────────────────
  const equippedShopPet = (equippedPetId && !equippedPetId.startsWith('trophy:'))
    ? SHOP_ITEMS.find(i => i.id === equippedPetId && i.type === 'pet') ?? null
    : null;
  const currentAbility: PetAbility | null = equippedShopPet?.ability ?? null;
  const isPassiveAbility = currentAbility?.abilityType === 'daily_luck';
  const abilityActive  = !!petAbilityActiveUntil && now < petAbilityActiveUntil;
  const lastUsedAt     = equippedShopPet ? (petAbilityLastUsed[equippedShopPet.id] ?? 0) : 0;
  // For daily_luck: "cooldown" = already rolled today (within 24h) but no proc
  const rolledToday = isPassiveAbility && lastUsedAt > 0 && (now - lastUsedAt) < 24 * 60 * 60 * 1000;
  const abilityOnCooldown = isPassiveAbility
    ? false // daily_luck doesn't show a "cooldown" UI — it auto-rolls
    : !abilityActive && lastUsedAt > 0 && !!currentAbility
      && (now - lastUsedAt) < currentAbility.cooldownMs;
  const activeRemainingMs   = abilityActive && petAbilityActiveUntil ? petAbilityActiveUntil - now : 0;
  const cooldownRemainingMs = abilityOnCooldown && currentAbility ? currentAbility.cooldownMs - (now - lastUsedAt) : 0;
  const nextRollMs = isPassiveAbility && rolledToday ? (24 * 60 * 60 * 1000) - (now - lastUsedAt) : 0;

  function fmtDuration(ms: number): string {
    const s = Math.ceil(ms / 1000);
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (d > 0) return `${d}d ${h}h`;
    if (h > 0) return `${h}h ${m}m`;
    if (m > 0) return `${m}m ${sec}s`;
    return `${sec}s`;
  }

  function handleActivateAbility() {
    if (!equippedShopPet || !currentAbility || abilityActive || abilityOnCooldown) return;
    const expiresAt = now + currentAbility.durationMs;
    setPetAbilityActiveUntil(expiresAt);
    setPetAbilityLastUsed(equippedShopPet.id, now);
  }

  // Resolve displayed avatar: check shop items and trophy road rewards by equipped ID
  const defaultAvatar = getCurrentAvatar(gainPct);
  const defaultPet    = getCurrentPet(gainPct);

  function resolveItem(id: string | null): { emoji: string; name: string; color: string } | null {
    if (!id) return null;
    // Trophy road item: id = "trophy:50" means gainThreshold=50
    if (id.startsWith('trophy:')) {
      const gt = parseInt(id.split(':')[1], 10);
      const r = TROPHY_REWARDS.find(t => t.gainThreshold === gt);
      return r ? { emoji: r.emoji, name: r.name, color: r.color } : null;
    }
    // Shop item
    const s = SHOP_ITEMS.find(i => i.id === id);
    return s ? { emoji: s.emoji, name: s.name, color: TIER_COLORS[s.tier] } : null;
  }

  const resolvedAvatar = resolveItem(equippedAvatarId);
  const resolvedPet    = resolveItem(equippedPetId);

  // What is actually shown as the profile icon
  const displayAvatarEmoji = resolvedAvatar?.emoji ?? defaultAvatar.emoji;
  const displayPetEmoji    = resolvedPet?.emoji    ?? defaultPet?.emoji ?? null;
  const displayAvatarName  = resolvedAvatar?.name  ?? defaultAvatar.name;

  // Wardrobe: all unlocked avatars (trophy road + shop)
  const unlockedTrophyAvatars = TROPHY_REWARDS.filter(r => r.type === 'avatar' && gainPct >= r.gainThreshold);
  const unlockedTrophyPets    = TROPHY_REWARDS.filter(r => r.type === 'pet'    && gainPct >= r.gainThreshold);
  const ownedShopAvatars = SHOP_ITEMS.filter(i => i.type === 'avatar' && shopPurchases.includes(i.id));
  const ownedShopPets    = SHOP_ITEMS.filter(i => i.type === 'pet'    && shopPurchases.includes(i.id));

  const handleSignOut = () => setSignOutVisible(true);

  const confirmSignOut = async () => {
    setSignOutVisible(false);
    await signOut();
    setUser(null);
    router.replace('/(auth)/welcome');
  };

  const confirmDeleteAccount = async () => {
    setDeleteVisible(false);
    await deleteAccount(user.id);
    setUser(null);
    router.replace('/(auth)/welcome');
  };

  const totalGainPercent = portfolio?.totalGainLossPercent ?? 0;
  const unlockedAchievements = (user.achievements || []).filter(a => a.unlockedAt);

  return (
    <View style={[styles.rootContainer, { backgroundColor: screenBg }]}>
      {/* Full-screen colour wash */}
      <LinearGradient
        colors={gcFull(`${tabColor}80`, `${tabColor}50`, `${tabColor}30`, screenBg)}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <LinearGradient
        colors={gc('transparent', `${tabColor}30`, `${tabColor}40`)}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <LinearGradient
        colors={gc(`${tabColor}28`, 'transparent', `${tabColor}28`)}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        pointerEvents="none"
      />
      <AppHeader title="Profile" />
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Header */}
      <LinearGradient
        colors={gcFull(`${tabColor}CC`, `${tabColor}88`, `${tabColor}22`, screenBg)}
        style={styles.headerGradient}
      >
        {/* Bling badge top-right */}
        <View style={styles.blingBadge}>
          <Text style={styles.blingEmoji}>💎</Text>
          <Text style={styles.blingText}>{bling.toLocaleString()}</Text>
        </View>
        <View style={styles.avatarContainer}>
          <LinearGradient colors={[levelColor, `${levelColor}88`]} style={styles.avatar}>
            <Text style={styles.avatarEmoji}>{displayAvatarEmoji}</Text>
            {displayPetEmoji && (
              <View style={[styles.petBadge, { backgroundColor: levelColor }]}>
                <Text style={styles.petBadgeEmoji}>{displayPetEmoji}</Text>
              </View>
            )}
          </LinearGradient>
          <View style={[styles.levelBadge, { backgroundColor: levelColor }]}>
            <Text style={styles.levelBadgeText}>Lv.{user.level}</Text>
          </View>
        </View>

        <Text style={[styles.displayName, { color: C.text.primary }]}>{user.displayName}</Text>
        <Text style={[styles.username, { color: C.text.secondary }]}>@{user.username}</Text>
        <Text style={[styles.avatarNameLabel, { color: C.text.secondary }]}>{displayAvatarEmoji} {displayAvatarName}</Text>
        <Text style={[styles.accountNumber, { color: C.text.tertiary }]}>{formatAccountNumber(user.accountNumber)}</Text>

        {/* Wardrobe button */}
        <TouchableOpacity
          style={styles.wardrobeBtn}
          onPress={() => setWardrobeOpen(true)}
        >
          <Text style={styles.wardrobeBtnText}>👗 Wardrobe</Text>
        </TouchableOpacity>

        {/* XP Bar */}
        <View style={styles.xpContainer}>
          <View style={styles.xpLabelRow}>
            <Text style={[styles.xpLabel, { color: C.text.secondary }]}>{xpInfo.current.title}</Text>
            <Text style={[styles.xpValue, { color: C.text.secondary }]}>{user.xp} XP</Text>
          </View>
          <View style={styles.xpTrack}>
            <LinearGradient
              colors={[levelColor, `${levelColor}88`]}
              style={[styles.xpFill, { width: `${Math.min(xpInfo.progress * 100, 100)}%` }]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            />
          </View>
          {xpInfo.nextLevel && (
            <Text style={[styles.xpNext, { color: C.text.tertiary }]}>
              {xpInfo.xpInLevel} / {xpInfo.xpNeeded} XP to {xpInfo.nextLevel.title}
            </Text>
          )}
        </View>
      </LinearGradient>

      {/* ── Pet Ability Card (Ultra Legendary only) ── */}
      {currentAbility && (
        <View style={[styles.abilityCard, abilityActive && styles.abilityCardActive]}>
          <View style={styles.abilityRow}>
            <Text style={styles.abilityIcon}>{currentAbility.icon}</Text>
            <View style={styles.abilityInfo}>
              <Text style={styles.abilityName}>{currentAbility.name}</Text>
              <Text style={styles.abilityDesc}>{currentAbility.description}</Text>
            </View>
            <View style={styles.abilityBtns}>
              {/* Info button — opens full explanation */}
              <TouchableOpacity
                style={styles.abilityInfoBtn}
                onPress={() => setAbilityInfoVisible(true)}
              >
                <Text style={styles.abilityInfoBtnText}>ℹ️</Text>
              </TouchableOpacity>
              {isPassiveAbility ? (
                <View style={[styles.abilityBtn, abilityActive && styles.abilityBtnActive]}>
                  <Text style={[styles.abilityBtnText, !abilityActive && { color: C.text.tertiary }]}>
                    {abilityActive ? '🍀 Active' : rolledToday ? '🎲 Rolled' : '🎲 Auto'}
                  </Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={[
                    styles.abilityBtn,
                    abilityActive      && styles.abilityBtnActive,
                    abilityOnCooldown  && styles.abilityBtnCooldown,
                  ]}
                  onPress={() => setAbilityInfoVisible(true)}
                >
                  <Text style={[
                    styles.abilityBtnText,
                    (abilityActive || abilityOnCooldown) && { color: C.text.tertiary },
                  ]}>
                    {abilityActive ? '⚡ Active' : abilityOnCooldown ? '⏳' : 'Activate'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
          {abilityActive && (
            <View style={styles.abilityTimerRow}>
              <Text style={[styles.abilityTimerLabel, { color: C.text.secondary }]}>⏱ Active for</Text>
              <Text style={styles.abilityTimerValue}>{fmtDuration(activeRemainingMs)}</Text>
            </View>
          )}
          {abilityOnCooldown && (
            <View style={styles.abilityTimerRow}>
              <Text style={[styles.abilityTimerLabel, { color: C.text.secondary }]}>🔒 Ready in</Text>
              <Text style={styles.abilityTimerValue}>{fmtDuration(cooldownRemainingMs)}</Text>
            </View>
          )}
          {isPassiveAbility ? (
            abilityActive ? null : rolledToday ? (
              <View style={styles.abilityTimerRow}>
                <Text style={[styles.abilityTimerLabel, { color: C.text.secondary }]}>⏰ Next roll in</Text>
                <Text style={styles.abilityTimerValue}>{fmtDuration(nextRollMs)}</Text>
              </View>
            ) : (
              <Text style={[styles.abilityCooldownHint, { color: C.text.tertiary }]}>
                Auto-rolls on your next trade · 5% chance to 2× earnings
              </Text>
            )
          ) : (
            !abilityActive && !abilityOnCooldown && (
              <Text style={[styles.abilityCooldownHint, { color: C.text.tertiary }]}>
                Cooldown: {currentAbility.cooldownLabel} · Duration: {currentAbility.durationLabel}
              </Text>
            )
          )}
        </View>
      )}

      {/* ── Ability Info Modal ── */}
      {currentAbility && (
        <Modal
          visible={abilityInfoVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setAbilityInfoVisible(false)}
        >
          <View style={styles.abilityModalOverlay}>
            <View style={styles.abilityModalCard}>
              {/* Header gradient strip */}
              <LinearGradient
                colors={['#1A0A3A', '#0D1830']}
                style={styles.abilityModalHeader}
              >
                <View style={styles.abilityModalIconRing}>
                  <Text style={styles.abilityModalIconEmoji}>{currentAbility.icon}</Text>
                </View>
                <View style={[styles.abilityModalTierBadge, { backgroundColor: '#8B5CF620' }]}>
                  <Text style={[styles.abilityModalTierText, { color: '#8B5CF6' }]}>
                    ⚡ ULTRA LEGENDARY ABILITY
                  </Text>
                </View>
              </LinearGradient>

              <View style={styles.abilityModalBody}>
                {/* Ability name */}
                <Text style={styles.abilityModalName}>{currentAbility.name}</Text>

                {/* Description */}
                <View style={styles.abilityModalDescBox}>
                  <Text style={[styles.abilityModalDescText, { color: C.text.primary }]}>{currentAbility.description}</Text>
                </View>

                {/* Stats grid */}
                <View style={styles.abilityModalStats}>
                  {!isPassiveAbility && (
                    <>
                      <View style={styles.abilityModalStat}>
                        <Text style={styles.abilityModalStatIcon}>⏱</Text>
                        <Text style={[styles.abilityModalStatLabel, { color: C.text.tertiary }]}>Duration</Text>
                        <Text style={[styles.abilityModalStatValue, { color: C.text.primary }]}>{currentAbility.durationLabel}</Text>
                      </View>
                      <View style={styles.abilityModalStatDivider} />
                      <View style={styles.abilityModalStat}>
                        <Text style={styles.abilityModalStatIcon}>🔄</Text>
                        <Text style={[styles.abilityModalStatLabel, { color: C.text.tertiary }]}>Cooldown</Text>
                        <Text style={[styles.abilityModalStatValue, { color: C.text.primary }]}>{currentAbility.cooldownLabel}</Text>
                      </View>
                    </>
                  )}
                  {isPassiveAbility && (
                    <View style={styles.abilityModalStat}>
                      <Text style={styles.abilityModalStatIcon}>🎲</Text>
                      <Text style={[styles.abilityModalStatLabel, { color: C.text.tertiary }]}>Type</Text>
                      <Text style={[styles.abilityModalStatValue, { color: C.text.primary }]}>Passive · Auto-rolls on trade</Text>
                    </View>
                  )}
                </View>

                {/* Status indicator */}
                <View style={[
                  styles.abilityModalStatus,
                  abilityActive && styles.abilityModalStatusActive,
                  abilityOnCooldown && styles.abilityModalStatusCooldown,
                ]}>
                  <Text style={[styles.abilityModalStatusText, { color: C.text.primary }]}>
                    {abilityActive
                      ? `⚡ Active · ${fmtDuration(activeRemainingMs)} remaining`
                      : abilityOnCooldown
                        ? `⏳ Cooldown · Ready in ${fmtDuration(cooldownRemainingMs)}`
                        : isPassiveAbility
                          ? rolledToday ? '🎲 Already rolled today' : '🍀 Ready to roll'
                          : '✅ Ready to activate'}
                  </Text>
                </View>

                {/* Action buttons */}
                <View style={styles.abilityModalActions}>
                  {!isPassiveAbility && !abilityActive && !abilityOnCooldown && (
                    <TouchableOpacity
                      style={styles.abilityModalActivateBtn}
                      onPress={() => { handleActivateAbility(); setAbilityInfoVisible(false); }}
                    >
                      <LinearGradient
                        colors={['#8B5CF6', '#6D28D9']}
                        style={styles.abilityModalActivateGrad}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                      >
                        <Text style={styles.abilityModalActivateText}>⚡ Activate Now</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity
                    style={styles.abilityModalCloseBtn}
                    onPress={() => setAbilityInfoVisible(false)}
                  >
                    <Text style={styles.abilityModalCloseBtnText}>Close</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Stats */}
      <View style={styles.statsGrid}>
        <StatCard
          label="Portfolio Value"
          value={formatCurrency(portfolio?.totalValue ?? user.startingBalance)}
          icon="💼"
        />
        <StatCard
          label="Total Gain"
          value={formatPercent(totalGainPercent)}
          icon={totalGainPercent >= 0 ? '📈' : '📉'}
          valueColor={totalGainPercent >= 0 ? Colors.market.gain : Colors.market.loss}
        />
        <StatCard
          label="Starting Balance"
          value={formatCurrency(user.startingBalance)}
          icon="💰"
        />
        <StatCard
          label="Achievements"
          value={`${unlockedAchievements.length} / ${ACHIEVEMENTS.length}`}
          icon="🏆"
        />
      </View>

      {/* Achievements */}
      <SectionHeader title="Achievements" icon="🏆" />
      <View style={styles.achievementsList}>
        {ACHIEVEMENTS.map(ach => {
          const unlocked = (user.achievements || []).some(a => a.id === ach.id && a.unlockedAt);
          return (
            <View
              key={ach.id}
              style={[styles.achievementRow, { backgroundColor: C.bg.secondary, borderColor: C.border.default }, !unlocked && styles.achievementRowLocked]}
            >
              <View style={[styles.achIconWrapper, { backgroundColor: unlocked ? `${Colors.brand.gold}22` : `${C.bg.tertiary}88` }]}>
                <Text style={[styles.achievementIcon, !unlocked && { opacity: 0.4 }]}>{ach.icon}</Text>
              </View>
              <View style={styles.achBody}>
                <View style={styles.achTitleRow}>
                  <Text style={[styles.achievementTitle, { color: C.text.primary }, !unlocked && styles.lockedText]}>
                    {ach.title}
                  </Text>
                  {unlocked
                    ? <Text style={styles.xpReward}>+{ach.xpReward} XP ✓</Text>
                    : <Text style={styles.xpRewardLocked}>+{ach.xpReward} XP</Text>
                  }
                </View>
                {unlocked
                  ? <Text style={[styles.achDescription, { color: C.text.secondary }]}>{ach.description}</Text>
                  : <Text style={[styles.achRequirement, { color: C.text.tertiary }]}>{ach.requirement ?? ach.description}</Text>
                }
              </View>
              {!unlocked && <Text style={styles.lockIcon}>🔒</Text>}
            </View>
          );
        })}
      </View>

      {/* XP Levels */}
      <SectionHeader title="XP Levels" icon="⭐" />
      <View style={styles.levelsList}>
        {LEVELS.map(lvl => {
          const gainPctForLevel = (lvl.level - 1) * 5;
          const blingReward = gainPctForLevel > 0 ? blingAtMilestone(gainPctForLevel) : 0;
          const isCurrentLevel = user.level === lvl.level;
          const isUnlocked = (user.xp || 0) >= lvl.xpRequired;
          return (
            <View
              key={lvl.level}
              style={[
                styles.levelRow,
                { backgroundColor: C.bg.secondary, borderColor: C.border.default },
                isCurrentLevel && { borderColor: `${lvl.color}88`, backgroundColor: `${lvl.color}0D` },
              ]}
            >
              <View style={[styles.levelIconBadge, { backgroundColor: `${lvl.color}22` }]}>
                <Text style={styles.levelIconText}>{lvl.icon}</Text>
              </View>
              <View style={styles.levelBody}>
                <Text style={[styles.levelTitle, { color: C.text.primary }, !isUnlocked && styles.lockedText]}>
                  {lvl.title}
                </Text>
                <Text style={[styles.levelSubtitle, { color: C.text.tertiary }]}>
                  {lvl.xpRequired === 0 ? 'Starting level' : `${lvl.xpRequired} XP · +${gainPctForLevel}% portfolio`}
                </Text>
              </View>
              <View style={styles.levelRight}>
                <View style={[styles.levelBadgePill, { backgroundColor: `${lvl.color}22` }]}>
                  <Text style={[styles.levelBadgePillText, { color: lvl.color }]}>Lv.{lvl.level}</Text>
                </View>
                {blingReward > 0 && (
                  <View style={styles.levelBlingRow}>
                    <Text style={styles.levelBlingText}>+{blingReward}</Text>
                    <Text style={styles.levelBlingIcon}>💎</Text>
                  </View>
                )}
              </View>
              {isCurrentLevel && (
                <View style={[styles.currentLevelBar, { backgroundColor: lvl.color }]} />
              )}
            </View>
          );
        })}
      </View>

      {/* Settings */}
      <SectionHeader title="Settings" icon="⚙️" />
      <View style={[styles.settingsContainer, { backgroundColor: C.bg.secondary, borderColor: C.border.default }]}>
        <SettingsRow
          label="Dark Mode"
          right={<Switch value={isDark} trackColor={{ true: Colors.brand.primary }} thumbColor="#fff" />}
        />
        <SettingsRow
          label="Push Notifications"
          right={<Switch value={true} trackColor={{ true: Colors.brand.primary }} thumbColor="#fff" />}
        />
        <SettingsRow
          label="Country"
          right={<Text style={[styles.settingsValue, { color: C.text.secondary }]}>{user.country}</Text>}
        />
        <SettingsRow
          label="Account Number"
          right={<Text style={[styles.settingsValue, { color: C.text.secondary }]}>{formatAccountNumber(user.accountNumber)}</Text>}
        />
      </View>

      {/* Sign out */}
      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>

      {/* Delete account */}
      <TouchableOpacity style={styles.deleteAccountButton} onPress={() => setDeleteVisible(true)}>
        <Text style={styles.deleteAccountText}>Delete Account</Text>
      </TouchableOpacity>

      <Text style={[styles.version, { color: C.text.tertiary }]}>CapitalQuest v1.0.0 · Virtual trading only · No real money involved</Text>
    </ScrollView>

    {/* ── Wardrobe Modal ── */}
    <Modal
      visible={wardrobeOpen}
      animationType="slide"
      transparent
      onRequestClose={() => setWardrobeOpen(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalSheet}>
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: C.text.primary }]}>👗 Wardrobe</Text>
            <TouchableOpacity onPress={() => setWardrobeOpen(false)}>
              <Text style={styles.modalClose}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Avatars */}
            <Text style={[styles.wardrobeSection, { color: C.text.primary }]}>🎨 Avatars</Text>
            <View style={styles.wardrobeGrid}>
              {[...unlockedTrophyAvatars, ...ownedShopAvatars].map((item, idx) => {
                const isTrophy = 'gainThreshold' in item;
                const id = isTrophy ? `trophy:${(item as TrophyReward).gainThreshold}` : (item as ShopItem).id;
                // Active if explicitly equipped, or if it's the default (highest unlocked trophy) and nothing is equipped
                const isDefault = isTrophy && !equippedAvatarId && (item as TrophyReward).gainThreshold === defaultAvatar.gainThreshold;
                const active = equippedAvatarId === id || isDefault;
                const tierColor = isTrophy ? (item as TrophyReward).color : TIER_COLORS[(item as ShopItem).tier];
                return (
                  <TouchableOpacity
                    key={id + idx}
                    style={[styles.wardrobeItem, active && { borderColor: tierColor }]}
                    onPress={() => setEquippedAvatarId(active ? null : id)}
                  >
                    <Text style={styles.wardrobeEmoji}>{item.emoji}</Text>
                    <Text style={[styles.wardrobeName, { color: C.text.secondary }]} numberOfLines={1}>{item.name}</Text>
                    {active && <View style={[styles.wardrobeCheck, { backgroundColor: tierColor }]}>
                      <Text style={styles.wardrobeCheckText}>✓</Text>
                    </View>}
                    {!isTrophy && (
                      <View style={[styles.wardrobeTierBadge, { backgroundColor: tierColor }]}>
                        <Text style={styles.wardrobeTierText}>{TIER_LABELS[(item as ShopItem).tier].split(' ')[0]}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Pets */}
            <Text style={[styles.wardrobeSection, { color: C.text.primary }]}>🐾 Pets</Text>
            {[...unlockedTrophyPets, ...ownedShopPets].length === 0 ? (
              <Text style={[styles.wardrobeEmpty, { color: C.text.tertiary }]}>Reach +10% portfolio gain to unlock your first pet!</Text>
            ) : (
              <View style={styles.wardrobeGrid}>
                {[...unlockedTrophyPets, ...ownedShopPets].map((item, idx) => {
                  const isTrophy = 'gainThreshold' in item;
                  const id = isTrophy ? `trophy:${(item as TrophyReward).gainThreshold}` : (item as ShopItem).id;
                  const isDefault = isTrophy && !equippedPetId && defaultPet && (item as TrophyReward).gainThreshold === defaultPet.gainThreshold;
                  const active = equippedPetId === id || !!isDefault;
                  const tierColor = isTrophy ? (item as TrophyReward).color : TIER_COLORS[(item as ShopItem).tier];
                  return (
                    <TouchableOpacity
                      key={id + idx}
                      style={[styles.wardrobeItem, active && { borderColor: tierColor }]}
                      onPress={() => setEquippedPetId(active ? null : id)}
                    >
                      <Text style={styles.wardrobeEmoji}>{item.emoji}</Text>
                      <Text style={[styles.wardrobeName, { color: C.text.secondary }]} numberOfLines={1}>{item.name}</Text>
                      {active && <View style={[styles.wardrobeCheck, { backgroundColor: tierColor }]}>
                        <Text style={styles.wardrobeCheckText}>✓</Text>
                      </View>}
                      {!isTrophy && (
                        <View style={[styles.wardrobeTierBadge, { backgroundColor: tierColor }]}>
                          <Text style={styles.wardrobeTierText}>{TIER_LABELS[(item as ShopItem).tier].split(' ')[0]}</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>

    {/* ── Delete Account Confirmation ── */}
    <Modal
      visible={deleteVisible}
      animationType="fade"
      transparent
      onRequestClose={() => setDeleteVisible(false)}
    >
      <View style={styles.signOutOverlay}>
        <View style={styles.signOutCard}>
          <Text style={styles.deleteModalIcon}>⚠️</Text>
          <Text style={[styles.signOutTitle, { color: C.text.primary }]}>Delete Account</Text>
          <Text style={[styles.deleteModalMessage, { color: C.text.secondary }]}>
            This will permanently delete your account, portfolio, and all progress. This cannot be undone.
          </Text>
          <View style={styles.signOutButtons}>
            <TouchableOpacity style={styles.signOutCancelBtn} onPress={() => setDeleteVisible(false)}>
              <Text style={[styles.signOutCancelText, { color: C.text.secondary }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.deleteConfirmBtn} onPress={confirmDeleteAccount}>
              <Text style={styles.signOutConfirmText}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>

    {/* ── Sign Out Confirmation ── */}
    <Modal
      visible={signOutVisible}
      animationType="fade"
      transparent
      onRequestClose={() => setSignOutVisible(false)}
    >
      <View style={styles.signOutOverlay}>
        <View style={styles.signOutCard}>
          <Text style={[styles.signOutTitle, { color: C.text.primary }]}>Sign Out</Text>
          <Text style={[styles.signOutMessage, { color: C.text.secondary }]}>Are you sure you want to sign out?</Text>
          <View style={styles.signOutButtons}>
            <TouchableOpacity style={styles.signOutCancelBtn} onPress={() => setSignOutVisible(false)}>
              <Text style={[styles.signOutCancelText, { color: C.text.secondary }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.signOutConfirmBtn} onPress={confirmSignOut}>
              <Text style={styles.signOutConfirmText}>Sign Out</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
    <Sidebar visible={isSidebarOpen} onClose={() => setSidebarOpen(false)} />
    </View>
  );
}

function StatCard({ label, value, icon, valueColor }: {
  label: string; value: string; icon: string; valueColor?: string;
}) {
  const { appColorMode } = useAppStore();
  const SC = appColorMode === 'light' ? LightColors : Colors;
  return (
    <View style={[styles.statCard, { backgroundColor: SC.bg.secondary, borderColor: SC.border.default }]}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={[styles.statValue, { color: SC.text.primary }, valueColor ? { color: valueColor } : {}]}>{value}</Text>
      <Text style={[styles.statLabel, { color: SC.text.tertiary }]}>{label}</Text>
    </View>
  );
}

function SectionHeader({ title, icon }: { title: string; icon: string }) {
  const { appColorMode } = useAppStore();
  const SHC = appColorMode === 'light' ? LightColors : Colors;
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionIcon}>{icon}</Text>
      <Text style={[styles.sectionTitle, { color: SHC.text.primary }]}>{title}</Text>
    </View>
  );
}

function SettingsRow({ label, right }: { label: string; right: React.ReactNode }) {
  const { appColorMode } = useAppStore();
  const SRC = appColorMode === 'light' ? LightColors : Colors;
  return (
    <View style={[styles.settingsRow, { borderBottomColor: SRC.border.subtle }]}>
      <Text style={[styles.settingsLabel, { color: SRC.text.primary }]}>{label}</Text>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  deleteAccountButton: {
    marginHorizontal: Spacing.base,
    marginTop: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.market.loss + '60',
    alignItems: 'center',
  },
  deleteAccountText: {
    color: Colors.market.loss,
    fontWeight: FontWeight.semibold,
    fontSize: FontSize.base,
  },
  deleteModalIcon: {
    fontSize: 36,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  deleteModalMessage: {
    fontSize: FontSize.sm,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
    lineHeight: 20,
  },
  deleteConfirmBtn: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: '#8B0000',
    alignItems: 'center',
  },
  signOutOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  signOutCard: {
    backgroundColor: Colors.bg.secondary,
    borderRadius: Radius.lg,
    padding: Spacing.xl,
    width: '100%',
    maxWidth: 320,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  signOutTitle: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    color: Colors.text.primary,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  signOutMessage: {
    fontSize: FontSize.base,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  signOutButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  signOutCancelBtn: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.bg.tertiary,
    borderWidth: 1,
    borderColor: Colors.border.default,
    alignItems: 'center',
  },
  signOutCancelText: {
    color: Colors.text.secondary,
    fontWeight: FontWeight.semibold,
    fontSize: FontSize.base,
  },
  signOutConfirmBtn: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.market.loss,
    alignItems: 'center',
  },
  signOutConfirmText: {
    color: '#fff',
    fontWeight: FontWeight.bold,
    fontSize: FontSize.base,
  },
  rootContainer: { flex: 1 },
  container: { flex: 1, backgroundColor: 'transparent' },
  content: { paddingBottom: 40 },
  headerGradient: {
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: Spacing.xl,
    paddingHorizontal: Spacing['2xl'],
    gap: 4,
  },
  avatarContainer: { position: 'relative', marginBottom: 8 },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEmoji: {
    fontSize: 36,
  },
  petBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.bg.primary,
  },
  petBadgeEmoji: { fontSize: 14 },
  levelBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.full,
    borderWidth: 2,
    borderColor: Colors.bg.primary,
  },
  levelBadgeText: { color: '#fff', fontSize: FontSize.xs, fontWeight: FontWeight.bold },
  displayName: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.extrabold,
    color: Colors.text.primary,
    marginTop: 4,
  },
  username: { fontSize: FontSize.base, color: Colors.text.secondary },
  accountNumber: {
    fontSize: FontSize.sm,
    color: Colors.text.tertiary,
    fontFamily: 'monospace',
    marginTop: 2,
  },
  xpContainer: { width: '100%', gap: 6, marginTop: 12 },
  xpLabelRow: { flexDirection: 'row', justifyContent: 'space-between' },
  xpLabel: { fontSize: FontSize.sm, color: Colors.text.secondary, fontWeight: FontWeight.medium },
  xpValue: { fontSize: FontSize.sm, color: Colors.text.secondary },
  xpTrack: {
    height: 6,
    backgroundColor: Colors.bg.tertiary,
    borderRadius: 3,
    overflow: 'hidden',
  },
  xpFill: { height: '100%', borderRadius: 3 },
  xpNext: { fontSize: FontSize.xs, color: Colors.text.tertiary, textAlign: 'center' },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    padding: Spacing.base,
  },
  statCard: {
    width: '47%',
    backgroundColor: Colors.bg.secondary,
    borderRadius: Radius.lg,
    padding: Spacing.base,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  statIcon: { fontSize: 24 },
  statValue: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text.primary,
  },
  statLabel: { fontSize: FontSize.xs, color: Colors.text.secondary },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    marginTop: Spacing.sm,
  },
  sectionIcon: { fontSize: 18 },
  sectionTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.bold,
    color: Colors.text.primary,
  },
  achievementsList: {
    gap: 8,
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.sm,
  },

  // ── XP Levels ──────────────────────────────────────────────────────────────
  levelsList: {
    gap: 6,
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.sm,
  },
  levelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bg.secondary,
    borderRadius: Radius.lg,
    padding: 10,
    borderWidth: 1,
    borderColor: Colors.border.default,
    gap: 10,
    position: 'relative',
    overflow: 'hidden',
  },
  levelIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  levelIconText: { fontSize: 20 },
  levelBody: { flex: 1, gap: 2 },
  levelTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.text.primary,
  },
  levelSubtitle: {
    fontSize: FontSize.xs,
    color: Colors.text.secondary,
  },
  levelRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  levelBadgePill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  levelBadgePillText: {
    fontSize: 10,
    fontWeight: FontWeight.extrabold,
  },
  levelBlingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  levelBlingText: {
    fontSize: 11,
    fontWeight: FontWeight.bold,
    color: Colors.brand.gold,
  },
  levelBlingIcon: { fontSize: 11 },
  currentLevelBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 3,
    borderTopLeftRadius: Radius.lg,
    borderBottomLeftRadius: Radius.lg,
  },
  achievementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bg.secondary,
    borderRadius: Radius.lg,
    padding: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  achievementRowLocked: {
    borderColor: `${Colors.border.default}66`,
  },
  achIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  achBody: { flex: 1, gap: 3 },
  achTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  achievementIcon: { fontSize: 24 },
  achievementTitle: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.text.primary,
    flex: 1,
  },
  achDescription: {
    fontSize: FontSize.xs,
    color: Colors.text.secondary,
    lineHeight: 16,
  },
  achRequirement: {
    fontSize: FontSize.xs,
    color: Colors.text.tertiary,
    lineHeight: 16,
    fontStyle: 'italic',
  },
  lockedText: { color: Colors.text.tertiary },
  xpReward: { fontSize: FontSize.xs, color: Colors.brand.accent, fontWeight: FontWeight.semibold },
  xpRewardLocked: { fontSize: FontSize.xs, color: Colors.text.tertiary },
  lockIcon: { fontSize: 16, marginLeft: 2 },
  settingsContainer: {
    marginHorizontal: Spacing.base,
    backgroundColor: Colors.bg.secondary,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border.default,
    overflow: 'hidden',
  },
  settingsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.default,
  },
  settingsLabel: { fontSize: FontSize.base, color: Colors.text.primary },
  settingsValue: { fontSize: FontSize.base, color: Colors.text.secondary },
  signOutButton: {
    margin: Spacing.base,
    marginTop: Spacing.xl,
    paddingVertical: 14,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.market.loss,
    alignItems: 'center',
  },
  signOutText: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.semibold,
    color: Colors.market.loss,
  },
  version: {
    fontSize: FontSize.xs,
    color: Colors.text.tertiary,
    textAlign: 'center',
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.xl,
  },

  // Bling badge (top-right of header)
  blingBadge: {
    position: 'absolute',
    top: 54,
    right: Spacing.base,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: `${Colors.brand.gold}22`,
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: `${Colors.brand.gold}55`,
  },
  blingEmoji: { fontSize: 14 },
  blingText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.brand.gold,
  },

  // Avatar name under username
  avatarNameLabel: {
    fontSize: FontSize.xs,
    color: Colors.brand.accent,
    fontWeight: FontWeight.semibold,
    marginTop: 2,
  },

  // Wardrobe button
  wardrobeBtn: {
    marginTop: 8,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: Radius.full,
    backgroundColor: Colors.bg.tertiary,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  wardrobeBtnText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.text.primary,
  },

  // Wardrobe modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: Colors.bg.secondary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    paddingBottom: 32,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border.default,
  },
  modalTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.extrabold,
    color: Colors.text.primary,
  },
  modalClose: { fontSize: 20, color: Colors.text.secondary, padding: 4 },

  wardrobeSection: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
    color: Colors.text.primary,
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.base,
    paddingBottom: Spacing.sm,
  },
  wardrobeEmpty: {
    fontSize: FontSize.sm,
    color: Colors.text.tertiary,
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.base,
    fontStyle: 'italic',
  },
  wardrobeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    paddingHorizontal: Spacing.base,
  },
  wardrobeItem: {
    width: 80,
    alignItems: 'center',
    backgroundColor: Colors.bg.tertiary,
    borderRadius: Radius.lg,
    padding: 8,
    borderWidth: 2,
    borderColor: Colors.border.default,
    position: 'relative',
  },
  wardrobeEmoji: { fontSize: 32 },
  wardrobeName: {
    fontSize: 9,
    color: Colors.text.secondary,
    textAlign: 'center',
    marginTop: 3,
    width: '100%',
  },
  wardrobeCheck: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.bg.secondary,
  },
  wardrobeCheckText: { fontSize: 10, color: '#fff', fontWeight: FontWeight.bold },
  wardrobeTierBadge: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: Radius.lg - 1,
    borderTopRightRadius: Radius.lg - 1,
    paddingVertical: 2,
    alignItems: 'center',
  },
  wardrobeTierText: { fontSize: 7, color: '#fff', fontWeight: FontWeight.extrabold, letterSpacing: 0.5 },

  // Pet ability card
  abilityCard: {
    marginHorizontal: Spacing.base,
    marginTop: Spacing.sm,
    backgroundColor: Colors.bg.secondary,
    borderRadius: Radius.lg,
    padding: Spacing.base,
    borderWidth: 1.5,
    borderColor: `${Colors.brand.accent}44`,
    gap: 8,
  },
  abilityCardActive: {
    borderColor: Colors.brand.accent,
    backgroundColor: `${Colors.brand.accent}12`,
  },
  abilityRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  abilityIcon: { fontSize: 28 },
  abilityInfo: { flex: 1, gap: 2 },
  abilityName: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.extrabold,
    color: Colors.brand.accent,
  },
  abilityDesc: { fontSize: FontSize.xs, color: Colors.text.secondary },
  abilityBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: Radius.full,
    backgroundColor: Colors.brand.accent,
  },
  abilityBtnActive:   { backgroundColor: `${Colors.brand.accent}55` },
  abilityBtnCooldown: { backgroundColor: Colors.bg.tertiary },
  abilityBtnText: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: '#fff' },
  abilityBtnTextDim: { color: Colors.text.tertiary },
  abilityTimerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: Colors.border.default,
  },
  abilityTimerLabel: { fontSize: FontSize.xs, color: Colors.text.secondary },
  abilityTimerValue: { fontSize: FontSize.sm, fontWeight: FontWeight.bold, color: Colors.brand.accent },
  abilityCooldownHint: {
    fontSize: FontSize.xs,
    color: Colors.text.tertiary,
    textAlign: 'center',
    paddingTop: 2,
  },

  // Ability buttons row (info + activate side by side)
  abilityBtns: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  abilityInfoBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.bg.tertiary,
    borderWidth: 1,
    borderColor: Colors.border.default,
    alignItems: 'center',
    justifyContent: 'center',
  },
  abilityInfoBtnText: { fontSize: 16 },

  // Ability Info Modal
  abilityModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.75)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  abilityModalCard: {
    width: '100%',
    backgroundColor: Colors.bg.secondary,
    borderRadius: Radius.xl,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: '#8B5CF666',
  },
  abilityModalHeader: {
    alignItems: 'center',
    paddingTop: 32,
    paddingBottom: 20,
    gap: 12,
  },
  abilityModalIconRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#8B5CF620',
    borderWidth: 2,
    borderColor: '#8B5CF666',
    alignItems: 'center',
    justifyContent: 'center',
  },
  abilityModalIconEmoji: { fontSize: 36 },
  abilityModalTierBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: '#8B5CF644',
  },
  abilityModalTierText: {
    fontSize: 10,
    fontWeight: FontWeight.extrabold,
    letterSpacing: 0.8,
  },
  abilityModalBody: {
    padding: 20,
    gap: 14,
  },
  abilityModalName: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.extrabold,
    color: Colors.brand.accent,
    textAlign: 'center',
  },
  abilityModalDescBox: {
    backgroundColor: Colors.bg.tertiary,
    borderRadius: Radius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  abilityModalDescText: {
    fontSize: FontSize.sm,
    color: Colors.text.primary,
    lineHeight: 20,
    textAlign: 'center',
  },
  abilityModalStats: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.bg.tertiary,
    borderRadius: Radius.md,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  abilityModalStat: { flex: 1, alignItems: 'center', gap: 4 },
  abilityModalStatDivider: {
    width: 1,
    height: 36,
    backgroundColor: Colors.border.default,
    marginHorizontal: 8,
  },
  abilityModalStatIcon: { fontSize: 18 },
  abilityModalStatLabel: { fontSize: FontSize.xs, color: Colors.text.tertiary },
  abilityModalStatValue: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    color: Colors.text.primary,
    textAlign: 'center',
  },
  abilityModalStatus: {
    padding: 10,
    borderRadius: Radius.md,
    backgroundColor: Colors.bg.tertiary,
    borderWidth: 1,
    borderColor: Colors.border.default,
    alignItems: 'center',
  },
  abilityModalStatusActive: {
    backgroundColor: `${Colors.brand.accent}15`,
    borderColor: `${Colors.brand.accent}55`,
  },
  abilityModalStatusCooldown: {
    backgroundColor: `${Colors.text.tertiary}15`,
    borderColor: Colors.border.default,
  },
  abilityModalStatusText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.text.secondary,
  },
  abilityModalActions: { gap: 10 },
  abilityModalActivateBtn: {
    borderRadius: Radius.lg,
    overflow: 'hidden',
  },
  abilityModalActivateGrad: {
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  abilityModalActivateText: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.extrabold,
    color: '#fff',
    letterSpacing: 0.3,
  },
  abilityModalCloseBtn: {
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: Radius.lg,
    backgroundColor: Colors.bg.tertiary,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  abilityModalCloseBtnText: {
    fontSize: FontSize.base,
    fontWeight: FontWeight.semibold,
    color: Colors.text.secondary,
  },
});
