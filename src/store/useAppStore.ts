import { create } from 'zustand';
import type {
  User, Portfolio, Stock, StockQuote,
  ChatRoom, AppNotification, LeaderboardEntry, Achievement, Club, ClubInvite,
} from '../types';

interface AppState {
  // Auth
  user: User | null;
  isAuthLoading: boolean;
  setUser: (user: User | null) => void;
  setAuthLoading: (v: boolean) => void;

  // Achievement toast
  pendingAchievement: Achievement | null;
  setPendingAchievement: (a: Achievement | null) => void;

  // Portfolio
  portfolio: Portfolio | null;
  setPortfolio: (p: Portfolio | null) => void;
  updatePortfolioField: (updates: Partial<Portfolio>) => void;

  // Market data
  quotes: Record<string, StockQuote>;
  setQuote: (symbol: string, quote: StockQuote) => void;
  setQuotes: (quotes: Record<string, StockQuote>) => void;

  watchlist: string[];
  addToWatchlist: (symbol: string) => void;
  removeFromWatchlist: (symbol: string) => void;

  // UI state
  selectedStock: Stock | null;
  setSelectedStock: (stock: Stock | null) => void;

  activeTab: string;
  setActiveTab: (tab: string) => void;

  isSidebarOpen: boolean;
  setSidebarOpen: (v: boolean) => void;

  // Clubs (persisted in store so they survive tab remounts)
  myClubs: Club[];
  setMyClubs: (clubs: Club[] | ((prev: Club[]) => Club[])) => void;
  addMyClub: (club: Club) => void;

  // Chat
  chatRooms: ChatRoom[];
  setChatRooms: (rooms: ChatRoom[]) => void;
  unreadCount: number;
  setUnreadCount: (n: number) => void;

  // Notifications
  notifications: AppNotification[];
  addNotification: (n: AppNotification) => void;
  markAllRead: () => void;

  // Club invites (pending invites the current user has received)
  clubInvites: ClubInvite[];
  addClubInvite: (invite: ClubInvite) => void;
  removeClubInvite: (id: string) => void;

  // Leaderboard cache
  globalLeaderboard: LeaderboardEntry[];
  setGlobalLeaderboard: (entries: LeaderboardEntry[]) => void;
  localLeaderboard: LeaderboardEntry[];
  setLocalLeaderboard: (entries: LeaderboardEntry[]) => void;

  // Bling (in-game currency) + Shop
  bling: number;
  setBling: (n: number) => void;
  addBling: (n: number) => void;
  shopPurchases: string[]; // item IDs owned
  addShopPurchase: (id: string) => void;
  claimedMilestones: number[]; // gain% milestones already awarded bling
  addClaimedMilestone: (gainPct: number) => void;

  // Wardrobe — equipped cosmetics (item ID or 'trophy:gainPct' for trophy rewards)
  equippedAvatarId: string | null;
  setEquippedAvatarId: (id: string | null) => void;
  equippedPetId: string | null;
  setEquippedPetId: (id: string | null) => void;

  // Pet special abilities
  petAbilityActiveUntil: number | null;       // ms timestamp when current buff expires
  setPetAbilityActiveUntil: (ts: number | null) => void;
  petAbilityLastUsed: Record<string, number>; // petId → ms timestamp of last activation
  setPetAbilityLastUsed: (petId: string, ts: number) => void;

  // App Theme Settings
  appColorMode: 'dark' | 'light';
  setAppColorMode: (mode: 'dark' | 'light') => void;
  appAccentColor: string;
  setAppAccentColor: (color: string) => void;
  appTileStyle: 'default' | 'vivid' | 'glass';
  setAppTileStyle: (style: 'default' | 'vivid' | 'glass') => void;
  appTabColors: Record<string, string>; // tabName → custom color
  setAppTabColor: (tab: string, color: string) => void;

  // One-time welcome popup (shown once after account creation)
  showWelcomePopup: boolean;
  setShowWelcomePopup: (v: boolean) => void;

  // News read tracking
  newsLastRead: number;
  setNewsLastRead: (ts: number) => void;

  // App mode (kids = full experience, adult = no avatars/pets/trophy road)
  appMode: 'kids' | 'adult';
  setAppMode: (mode: 'kids' | 'adult') => void;
}

export const useAppStore = create<AppState>((set) => ({
  // Auth
  user: null,
  isAuthLoading: true,
  setUser: (user) => set({ user }),
  setAuthLoading: (isAuthLoading) => set({ isAuthLoading }),

  // Achievement toast
  pendingAchievement: null,
  setPendingAchievement: (pendingAchievement) => set({ pendingAchievement }),

  // Portfolio
  portfolio: null,
  setPortfolio: (portfolio) => set({ portfolio }),
  updatePortfolioField: (updates) =>
    set((state) => ({
      portfolio: state.portfolio ? { ...state.portfolio, ...updates } : null,
    })),

  // Quotes
  quotes: {},
  setQuote: (symbol, quote) =>
    set((state) => ({ quotes: { ...state.quotes, [symbol]: quote } })),
  setQuotes: (quotes) =>
    set((state) => ({ quotes: { ...state.quotes, ...quotes } })),

  // Watchlist
  watchlist: ['AAPL', 'MSFT', 'GOOGL', 'TSLA', 'NVDA'],
  addToWatchlist: (symbol) =>
    set((state) => ({
      watchlist: state.watchlist.includes(symbol)
        ? state.watchlist
        : [...state.watchlist, symbol],
    })),
  removeFromWatchlist: (symbol) =>
    set((state) => ({
      watchlist: state.watchlist.filter(s => s !== symbol),
    })),

  // UI
  selectedStock: null,
  setSelectedStock: (selectedStock) => set({ selectedStock }),

  activeTab: 'home',
  setActiveTab: (activeTab) => set({ activeTab }),

  isSidebarOpen: false,
  setSidebarOpen: (isSidebarOpen) => set({ isSidebarOpen }),

  // Clubs
  myClubs: [],
  setMyClubs: (clubs) =>
    set((state) => ({
      myClubs: typeof clubs === 'function' ? clubs(state.myClubs) : clubs,
    })),
  addMyClub: (club) =>
    set((state) => ({
      myClubs: state.myClubs.some(c => c.id === club.id)
        ? state.myClubs
        : [club, ...state.myClubs],
    })),

  // Chat
  chatRooms: [],
  setChatRooms: (chatRooms) => set({ chatRooms }),
  unreadCount: 0,
  setUnreadCount: (unreadCount) => set({ unreadCount }),

  // Notifications
  notifications: [],
  addNotification: (n) =>
    set((state) => ({ notifications: [n, ...state.notifications] })),
  markAllRead: () =>
    set((state) => ({
      notifications: state.notifications.map(n => ({ ...n, read: true })),
    })),

  // Club invites
  clubInvites: [],
  addClubInvite: (invite) =>
    set((state) => ({
      clubInvites: state.clubInvites.some(i => i.id === invite.id)
        ? state.clubInvites
        : [invite, ...state.clubInvites],
    })),
  removeClubInvite: (id) =>
    set((state) => ({
      clubInvites: state.clubInvites.filter(i => i.id !== id),
    })),

  // Leaderboard
  globalLeaderboard: [],
  setGlobalLeaderboard: (globalLeaderboard) => set({ globalLeaderboard }),
  localLeaderboard: [],
  setLocalLeaderboard: (localLeaderboard) => set({ localLeaderboard }),

  // Bling + Shop
  bling: 0,
  setBling: (bling) => set({ bling }),
  addBling: (amount) => set((state) => ({ bling: state.bling + amount })),
  shopPurchases: [],
  addShopPurchase: (id) =>
    set((state) => ({
      shopPurchases: state.shopPurchases.includes(id)
        ? state.shopPurchases
        : [...state.shopPurchases, id],
    })),
  claimedMilestones: [],
  addClaimedMilestone: (gainPct) =>
    set((state) => ({
      claimedMilestones: state.claimedMilestones.includes(gainPct)
        ? state.claimedMilestones
        : [...state.claimedMilestones, gainPct],
    })),

  // Wardrobe
  equippedAvatarId: null,
  setEquippedAvatarId: (equippedAvatarId) => set({ equippedAvatarId }),
  equippedPetId: null,
  setEquippedPetId: (equippedPetId) => set({ equippedPetId }),

  // Pet abilities
  petAbilityActiveUntil: null,
  setPetAbilityActiveUntil: (petAbilityActiveUntil) => set({ petAbilityActiveUntil }),
  petAbilityLastUsed: {},
  setPetAbilityLastUsed: (petId, ts) =>
    set((state) => ({
      petAbilityLastUsed: { ...state.petAbilityLastUsed, [petId]: ts },
    })),

  // App Theme Settings
  appColorMode: 'dark',
  setAppColorMode: (appColorMode) => set({ appColorMode }),
  appAccentColor: '#00B3E6',
  setAppAccentColor: (appAccentColor) => set({ appAccentColor }),
  appTileStyle: 'default',
  setAppTileStyle: (appTileStyle) => set({ appTileStyle }),
  appTabColors: {
    home: '#00B3E6',
    leaderboard: '#F5C518',
    social: '#EC4899',
    advisor: '#00D4AA',
    trade: '#00C853',
    shop: '#F59E0B',
    profile: '#7C3AED',
  },
  setAppTabColor: (tab, color) =>
    set((state) => ({
      appTabColors: { ...state.appTabColors, [tab]: color },
    })),

  // Welcome popup
  showWelcomePopup: false,
  setShowWelcomePopup: (showWelcomePopup) => set({ showWelcomePopup }),

  // News read tracking
  newsLastRead: 0,
  setNewsLastRead: (newsLastRead) => set({ newsLastRead }),

  // App mode
  appMode: 'kids',
  setAppMode: (appMode) => set({ appMode }),
}));
