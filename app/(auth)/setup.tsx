import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { initPortfolio, updateUser } from '../../src/services/auth';
import { useAppStore } from '../../src/store/useAppStore';
import { Colors, FontSize, FontWeight } from '../../src/constants/theme';

const STARTING_BALANCE = 10000;

export default function SetupScreen() {
  const { user, setUser, setShowWelcomePopup, appMode } = useAppStore();

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        await initPortfolio(user.id, STARTING_BALANCE);
        // Persist onboarding + welcome flag + app mode to DB
        await updateUser(user.id, {
          startingBalance: STARTING_BALANCE,
          onboardingComplete: true,
          welcomeShown: false,
          appMode,
        });
        setUser({ ...user, startingBalance: STARTING_BALANCE, onboardingComplete: true, welcomeShown: false, appMode });
      } catch {
        // Non-critical — still route to dashboard
      }
      setShowWelcomePopup(true);
      router.replace('/(app)/dashboard');
    })();
  }, [user?.id]); // Re-runs if user becomes available after initial mount

  return (
    <View style={styles.container}>
      <Text style={styles.emoji}>💰</Text>
      <Text style={styles.title}>Setting Up Your Portfolio</Text>
      <Text style={styles.subtitle}>Starting you off with $10,000</Text>
      <ActivityIndicator color={Colors.brand.primary} size="large" style={styles.spinner} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.bg.primary,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  emoji: { fontSize: 56 },
  title: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.extrabold,
    color: Colors.text.primary,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: FontSize.base,
    color: Colors.text.secondary,
    textAlign: 'center',
  },
  spinner: { marginTop: 16 },
});
