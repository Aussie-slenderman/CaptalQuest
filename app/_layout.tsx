import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Toast from 'react-native-toast-message';
import { onAuthChange, getUserById } from '../src/services/auth';
import { useAppStore } from '../src/store/useAppStore';
import { Colors } from '../src/constants/theme';
import AchievementOverlay from '../src/components/AchievementOverlay';

// ─── Error Boundary ───────────────────────────────────────────────────────────
interface EBState { hasError: boolean; error: Error | null }
class ErrorBoundary extends React.Component<{ children: React.ReactNode }, EBState> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: Error): EBState {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[CapitalQuest] Uncaught error:', error.message, info.componentStack);
  }
  render() {
    if (this.state.hasError) {
      return (
        <View style={{ flex: 1, backgroundColor: Colors.bg.primary, alignItems: 'center', justifyContent: 'center', padding: 28 }}>
          <Text style={{ fontSize: 48, marginBottom: 16 }}>⚠️</Text>
          <Text style={{ color: Colors.text.primary, fontSize: 20, fontWeight: 'bold', marginBottom: 8, textAlign: 'center' }}>
            Something went wrong
          </Text>
          <Text style={{ color: Colors.text.secondary, fontSize: 14, textAlign: 'center', marginBottom: 28, lineHeight: 20 }}>
            {this.state.error?.message ?? 'An unexpected error occurred. Please try again.'}
          </Text>
          <TouchableOpacity
            onPress={() => this.setState({ hasError: false, error: null })}
            style={{ backgroundColor: Colors.brand.primary, paddingHorizontal: 28, paddingVertical: 14, borderRadius: 12 }}
          >
            <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const { setUser, setAuthLoading, setShowWelcomePopup, setAppMode, appMode } = useAppStore();

  useEffect(() => {
    const unsub = onAuthChange(async (session: unknown) => {
      const s = session as { uid?: string } | null;
      if (s?.uid) {
        const userData = await getUserById(s.uid);
        setUser(userData as import('../src/types').User);
        // Sync app mode from saved profile
        const mode = (userData as Record<string, unknown>)?.appMode as 'kids' | 'adult' | undefined;
        if (mode === 'kids' || mode === 'adult') setAppMode(mode);
        if (!userData || !(userData as Record<string, unknown>).onboardingComplete) {
          router.replace('/(auth)/tutorial');
        } else {
          // Show welcome popup for users who have never seen it
          // (covers existing accounts and cases where setup.tsx was bypassed)
          if (!(userData as Record<string, unknown>).welcomeShown) {
            setShowWelcomePopup(true);
          }
          router.replace('/(app)/dashboard');
        }
      } else {
        setUser(null);
        router.replace('/(auth)/welcome');
      }
      setAuthLoading(false);
      await SplashScreen.hideAsync();
    });
    return unsub as () => void;
  }, []);

  const shellBg = appMode === 'adult' ? '#000000' : Colors.bg.primary;

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: shellBg }}>
        <StatusBar style="light" backgroundColor={shellBg} />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: shellBg } }}>
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(app)" />
        </Stack>
        <Toast />
        <AchievementOverlay />
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}
