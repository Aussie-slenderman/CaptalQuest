import React, { useState, useRef, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, ActivityIndicator, KeyboardAvoidingView,
  Platform, Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AppHeader from '../../src/components/AppHeader';
import Sidebar from '../../src/components/Sidebar';
import { useAppStore } from '../../src/store/useAppStore';
import { streamMarketAdvice } from '../../src/services/aiAdvisor';
import { Colors, LightColors, FontSize, FontWeight, Spacing, Radius } from '../../src/constants/theme';
import type { Portfolio } from '../../src/types';

// ─── Types ────────────────────────────────────────────────────────────────────

type MessageRole = 'user' | 'ai';

interface ChatMessage {
  id: string;
  role: MessageRole;
  text: string;
  timestamp: Date;
}

// ─── Suggested prompts ────────────────────────────────────────────────────────

const QUICK_PROMPTS = [
  { label: '📰 Today\'s Market', prompt: 'What are the biggest things happening in the market today and how should I react?' },
  { label: '📈 Buy Ideas', prompt: 'Based on current trends and news, what stocks look like good buys right now and why?' },
  { label: '⚠️ Risk Check', prompt: 'Look at my portfolio and tell me what risks I should be worried about.' },
  { label: '📚 History Lesson', prompt: 'Give me an example of a historical market event similar to what\'s happening now and what we can learn from it.' },
  { label: '💰 Cash Tips', prompt: 'I have cash sitting in my account. What\'s the best way to put it to work right now?' },
  { label: '🔄 Rebalance', prompt: 'Should I be rebalancing my portfolio? What sectors am I over or under-exposed to?' },
];

// ─── Screen ───────────────────────────────────────────────────────────────────

export default function AdvisorScreen() {
  const { portfolio, user, appColorMode, appTabColors, isSidebarOpen, setSidebarOpen, appMode: advisorAppMode } = useAppStore();
  const tabColor = appTabColors['advisor'] ?? '#00D4AA';
  const isLight = appColorMode === 'light';
  const C = isLight ? LightColors : Colors;
  const screenBg = advisorAppMode === 'adult' ? (isLight ? '#FFFFFF' : '#000000') : isLight ? '#E8FFF8' : '#147870';
  const adultGrad = advisorAppMode === 'adult';
  const gc = (a: string, b: string, c: string) => adultGrad ? ['transparent','transparent','transparent'] as any : [a,b,c] as any;
  const gcFull = (a: string, b: string, c: string, d: string) => adultGrad ? ['transparent','transparent','transparent',screenBg] as any : [a,b,c,d] as any;
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'ai',
      text: `👋 **Hi${user?.displayName ? ` ${user.displayName.split(' ')[0]}` : ''}! I'm your AI Market Advisor.**\n\nI can analyse current news, market trends, and your portfolio to help you make smarter virtual trading decisions.\n\nI also draw on decades of market history — from the dot-com bubble to the 2020 crash — to give you context and lessons from the past.\n\nWhat would you like to explore today?`,
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const [thinkingVisible, setThinkingVisible] = useState(false);
  const [thinkingText, setThinkingText] = useState('');

  const scrollRef = useRef<ScrollView>(null);
  const streamingMessageId = useRef<string | null>(null);
  const pulseAnim = useRef(new Animated.Value(0.4)).current;

  // Pulse animation for the thinking indicator
  const startPulse = useCallback(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 0.4, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, [pulseAnim]);

  const stopPulse = useCallback(() => {
    pulseAnim.stopAnimation();
    pulseAnim.setValue(1);
  }, [pulseAnim]);

  const scrollToBottom = () => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isStreaming) return;

    const userMsgId = `user_${Date.now()}`;
    const aiMsgId = `ai_${Date.now()}`;
    streamingMessageId.current = aiMsgId;

    // Add user message
    setMessages(prev => [...prev, {
      id: userMsgId,
      role: 'user',
      text: text.trim(),
      timestamp: new Date(),
    }]);
    setInputText('');
    setIsStreaming(true);
    setThinkingVisible(true);
    setThinkingText('');
    startPulse();
    scrollToBottom();

    // Add empty AI message that will be streamed into
    setMessages(prev => [...prev, {
      id: aiMsgId,
      role: 'ai',
      text: '',
      timestamp: new Date(),
    }]);

    await streamMarketAdvice(
      portfolio as Portfolio | null,
      text.trim(),
      {
        onChunk: (chunk) => {
          setThinkingVisible(false);
          setMessages(prev =>
            prev.map(msg =>
              msg.id === aiMsgId
                ? { ...msg, text: msg.text + chunk }
                : msg
            )
          );
          scrollToBottom();
        },
        onThinking: (chunk) => {
          setThinkingText(prev => prev + chunk);
        },
        onDone: () => {
          setIsStreaming(false);
          setThinkingVisible(false);
          stopPulse();
          streamingMessageId.current = null;
          scrollToBottom();
        },
        onError: (err) => {
          setIsStreaming(false);
          setThinkingVisible(false);
          stopPulse();
          setMessages(prev =>
            prev.map(msg =>
              msg.id === aiMsgId
                ? { ...msg, text: `❌ Sorry, I encountered an error: ${err}\n\nPlease check your API key or try again.` }
                : msg
            )
          );
        },
      },
      apiKey || undefined
    );
  }, [isStreaming, portfolio, apiKey, startPulse, stopPulse]);

  return (
    <View style={{ flex: 1 }}>
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: screenBg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={90}
    >
      {/* Full-screen colour wash — top */}
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
      <AppHeader title="AI Advisor" />

      {/* Portfolio summary strip */}
      {portfolio && (
        <View style={[styles.portfolioStrip, { backgroundColor: C.bg.tertiary, borderColor: C.border.subtle }]}>
          <PortfolioStat
            label="Portfolio"
            value={`$${(portfolio.totalValue ?? 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}`}
          />
          <PortfolioStat
            label="Cash"
            value={`$${(portfolio.cashBalance ?? 0).toLocaleString('en-US', { maximumFractionDigits: 0 })}`}
          />
          <PortfolioStat
            label="Total Return"
            value={`${(portfolio.totalGainLossPercent ?? 0) >= 0 ? '+' : ''}${(portfolio.totalGainLossPercent ?? 0).toFixed(2)}%`}
            positive={(portfolio.totalGainLossPercent ?? 0) >= 0}
          />
        </View>
      )}

      {/* Chat messages */}
      <ScrollView
        ref={scrollRef}
        style={styles.chatArea}
        contentContainerStyle={styles.chatContent}
        showsVerticalScrollIndicator={false}
      >
        {messages.map((msg) => (
          <ChatBubble key={msg.id} message={msg} isStreaming={isStreaming && msg.id === streamingMessageId.current} />
        ))}

        {/* Thinking indicator */}
        {thinkingVisible && (
          <View style={styles.thinkingContainer}>
            <Animated.View style={[styles.thinkingDots, { opacity: pulseAnim }]}>
              <View style={styles.dot} />
              <View style={styles.dot} />
              <View style={styles.dot} />
            </Animated.View>
            <Text style={[styles.thinkingLabel, { color: C.text.tertiary }]}>AI is analysing markets…</Text>
          </View>
        )}
      </ScrollView>

      {/* Quick prompts */}
      {messages.length <= 1 && !isStreaming && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.quickPromptRow}
          contentContainerStyle={styles.quickPromptContent}
        >
          {QUICK_PROMPTS.map((qp) => (
            <TouchableOpacity
              key={qp.label}
              style={[styles.quickPromptChip, { backgroundColor: C.bg.tertiary, borderColor: C.border.default }]}
              onPress={() => sendMessage(qp.prompt)}
            >
              <Text style={[styles.quickPromptText, { color: C.text.secondary }]}>{qp.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Input bar */}
      <View style={[styles.inputBar, { backgroundColor: C.bg.secondary, borderTopColor: C.border.default }]}>
        <TextInput
          style={[styles.input, { backgroundColor: C.bg.input, borderColor: C.border.default, color: C.text.primary }]}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Ask about stocks, trends, or your portfolio…"
          placeholderTextColor={C.text.tertiary}
          multiline
          maxLength={500}
          editable={!isStreaming}
        />
        <TouchableOpacity
          style={[styles.sendButton, (!inputText.trim() || isStreaming) && styles.sendButtonDisabled]}
          onPress={() => sendMessage(inputText)}
          disabled={!inputText.trim() || isStreaming}
        >
          {isStreaming
            ? <ActivityIndicator size="small" color="#fff" />
            : <Text style={styles.sendIcon}>➤</Text>
          }
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
    <Sidebar visible={isSidebarOpen} onClose={() => setSidebarOpen(false)} />
    </View>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function PortfolioStat({ label, value, positive }: { label: string; value: string; positive?: boolean }) {
  const { appColorMode } = useAppStore();
  const SC = appColorMode === 'light' ? LightColors : Colors;
  return (
    <View style={styles.stat}>
      <Text style={[styles.statLabel, { color: SC.text.tertiary }]}>{label}</Text>
      <Text style={[
        styles.statValue,
        { color: SC.text.primary },
        positive === true && { color: Colors.market.gain },
        positive === false && { color: Colors.market.loss },
      ]}>{value}</Text>
    </View>
  );
}

function ChatBubble({ message, isStreaming }: { message: ChatMessage; isStreaming: boolean }) {
  const { appColorMode } = useAppStore();
  const BC = appColorMode === 'light' ? LightColors : Colors;
  const isAI = message.role === 'ai';
  const isEmpty = message.text === '' && isStreaming;

  // Simple markdown-ish renderer: bold **text**, bullet • lines, headers ##
  const renderText = (raw: string) => {
    if (!raw) return null;
    return raw.split('\n').map((line, i) => {
      if (line.startsWith('## ')) {
        return <Text key={i} style={styles.mdHeader}>{line.slice(3)}</Text>;
      }
      if (line.startsWith('**') && line.endsWith('**')) {
        return <Text key={i} style={[styles.mdBold, { color: BC.text.primary }]}>{line.slice(2, -2)}</Text>;
      }
      // Bold inline segments
      const parts = line.split(/\*\*(.*?)\*\*/g);
      if (parts.length > 1) {
        return (
          <Text key={i} style={[isAI ? styles.aiBubbleText : styles.userBubbleText, isAI ? { color: BC.text.primary } : {}]}>
            {parts.map((p, j) =>
              j % 2 === 0
                ? <Text key={j}>{p}</Text>
                : <Text key={j} style={{ fontWeight: '700' }}>{p}</Text>
            )}
            {'\n'}
          </Text>
        );
      }
      return (
        <Text key={i} style={[isAI ? styles.aiBubbleText : styles.userBubbleText, isAI ? { color: BC.text.primary } : {}]}>
          {line}{'\n'}
        </Text>
      );
    });
  };

  if (!isAI) {
    return (
      <View style={styles.userBubbleWrapper}>
        <LinearGradient
          colors={[Colors.brand.primary, '#0096C7']}
          style={styles.userBubble}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        >
          <Text style={styles.userBubbleText}>{message.text}</Text>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={styles.aiBubbleWrapper}>
      <View style={[styles.aiIcon, { backgroundColor: BC.bg.tertiary }]}>
        <Text style={{ fontSize: 16 }}>🤖</Text>
      </View>
      <View style={[styles.aiBubble, { backgroundColor: BC.bg.secondary, borderColor: BC.border.subtle }]}>
        {isEmpty
          ? <ActivityIndicator size="small" color={Colors.brand.primary} />
          : renderText(message.text)
        }
        {isStreaming && !isEmpty && (
          <Text style={styles.cursor}>▍</Text>
        )}
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  header: {
    paddingTop: 56,
    paddingHorizontal: Spacing['2xl'],
    paddingBottom: Spacing.md,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  aiAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.bg.tertiary,
    borderWidth: 2,
    borderColor: Colors.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  aiAvatarText: { fontSize: 22 },
  headerTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.bold,
    color: Colors.text.primary,
  },
  headerSubtitle: {
    fontSize: FontSize.xs,
    color: Colors.text.tertiary,
    marginTop: 2,
  },
  keyButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.bg.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  keyButtonText: { fontSize: 16 },
  apiKeyContainer: {
    backgroundColor: Colors.bg.tertiary,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  apiKeyLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
    color: Colors.text.secondary,
    marginBottom: 6,
  },
  apiKeyInput: {
    backgroundColor: Colors.bg.input,
    borderRadius: Radius.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    color: Colors.text.primary,
    fontSize: FontSize.sm,
    borderWidth: 1,
    borderColor: Colors.border.default,
    marginBottom: 6,
  },
  apiKeyHint: {
    fontSize: 11,
    color: Colors.text.tertiary,
    lineHeight: 16,
  },
  portfolioStrip: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: Colors.bg.tertiary,
    borderRadius: Radius.md,
    padding: Spacing.md,
    marginTop: 4,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
  },
  stat: { alignItems: 'center' },
  statLabel: {
    fontSize: FontSize.xs,
    color: Colors.text.tertiary,
    marginBottom: 2,
  },
  statValue: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    color: Colors.text.primary,
  },
  chatArea: {
    flex: 1,
  },
  chatContent: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.base,
    gap: Spacing.md,
  },
  // User bubble
  userBubbleWrapper: {
    alignItems: 'flex-end',
    paddingLeft: 60,
  },
  userBubble: {
    borderRadius: Radius.lg,
    borderBottomRightRadius: 4,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    maxWidth: '100%',
  },
  userBubbleText: {
    color: '#fff',
    fontSize: FontSize.sm,
    lineHeight: 20,
  },
  // AI bubble
  aiBubbleWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingRight: 40,
    gap: Spacing.sm,
  },
  aiIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.bg.tertiary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    flexShrink: 0,
  },
  aiBubble: {
    flex: 1,
    backgroundColor: Colors.bg.secondary,
    borderRadius: Radius.lg,
    borderTopLeftRadius: 4,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border.subtle,
  },
  aiBubbleText: {
    color: Colors.text.primary,
    fontSize: FontSize.sm,
    lineHeight: 22,
  },
  mdHeader: {
    color: Colors.brand.primary,
    fontSize: FontSize.base,
    fontWeight: FontWeight.bold,
    marginTop: 4,
    marginBottom: 2,
  },
  mdBold: {
    color: Colors.text.primary,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.bold,
    lineHeight: 22,
  },
  cursor: {
    color: Colors.brand.primary,
    fontSize: FontSize.sm,
  },
  // Thinking indicator
  thinkingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 44,
    gap: Spacing.sm,
    paddingVertical: 4,
  },
  thinkingDots: {
    flexDirection: 'row',
    gap: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.brand.primary,
  },
  thinkingLabel: {
    fontSize: FontSize.xs,
    color: Colors.text.tertiary,
    fontStyle: 'italic',
  },
  // Quick prompts
  quickPromptRow: {
    maxHeight: 52,
    borderTopWidth: 1,
    borderTopColor: Colors.border.subtle,
  },
  quickPromptContent: {
    paddingHorizontal: Spacing.base,
    paddingVertical: 10,
    gap: Spacing.sm,
  },
  quickPromptChip: {
    backgroundColor: Colors.bg.tertiary,
    borderRadius: 20,
    paddingHorizontal: Spacing.base,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: Colors.border.default,
  },
  quickPromptText: {
    fontSize: FontSize.xs,
    color: Colors.text.secondary,
    fontWeight: FontWeight.medium,
  },
  // Input bar
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: Spacing.md,
    gap: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border.default,
    backgroundColor: Colors.bg.secondary,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.bg.input,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.base,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: Colors.border.default,
    color: Colors.text.primary,
    fontSize: FontSize.sm,
    maxHeight: 100,
    lineHeight: 20,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.brand.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
  sendIcon: {
    color: '#fff',
    fontSize: 16,
  },
});
