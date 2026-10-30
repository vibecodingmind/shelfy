/**
 * Shelfy 🇹🇿 — Main React Application Architecture & Router
 */

import React, { useState, useEffect } from 'react';
import { Header } from './components/Header.js';
import { MobileBottomNav } from './components/MobileBottomNav.js';
import { LandingPage } from './components/LandingPage.js';
import { AdminDashboard } from './components/AdminDashboard.js';
import { VendorDashboard } from './components/VendorDashboard.js';
import { HostDashboard } from './components/HostDashboard.js';
import { AgentDashboard } from './components/AgentDashboard.js';
import { AuthModal } from './components/AuthModal.js';
import { LegalPage, LEGAL_SLUGS } from './components/LegalPage.js';
import { AzamPayPaymentModal } from './components/AzamPayPaymentModal.js';
import { NotificationInbox } from './components/NotificationInbox.js';
import { MessagesPage } from './components/MessagesPage.js';
import { UserSettingsPage } from './components/UserSettingsPage.js';
import { InboxThread, shopThreadId } from './lib/messageThreads.js';
import { CheckoutCartWithRegister } from './components/CheckoutCart.js';
import { api, getStoredToken, setStoredToken, clearStoredToken } from './lib/api.js';
import {
  User,
  UserRole,
  VendorProfile,
  HostProfile,
  Shop,
  Shelf,
  Booking,
  Product,
  ShelfInventory,
  FieldVisit,
  ShelfReport,
  AuditLog,
  PlatformSettings,
  Notification,
  Message,
  Payout,
} from './types/index.js';

export function App() {
  const [user, setUser] = useState<User | null>(null);
  const [vendorProfile, setVendorProfile] = useState<VendorProfile | null>(null);
  const [hostProfile, setHostProfile] = useState<HostProfile | null>(null);
  const [activeRoleView, setActiveRoleView] = useState<string>('MARKETPLACE');

  // Application Data State
  const [shops, setShops] = useState<Shop[]>([]);
  const [shelves, setShelves] = useState<Shelf[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [inventory, setInventory] = useState<ShelfInventory[]>([]);
  const [fieldVisits, setFieldVisits] = useState<FieldVisit[]>([]);
  const [fieldReports, setFieldReports] = useState<ShelfReport[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [adminStats, setAdminStats] = useState<any>(null);
  const [adminUsers, setAdminUsers] = useState<User[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [platformSettings, setPlatformSettings] = useState<PlatformSettings>({
    commissionPercentage: 10,
    autoApproveBookings: false,
    azamPayEnvironment: 'sandbox',
    currency: 'TZS',
    maintenanceMode: false,
    shelfCategories: [],
    shelfTypes: [],
  });

  // UI Modals & Auth Props
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [authModalMode, setAuthModalMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
  const [authModalRole, setAuthModalRole] = useState<UserRole>('VENDOR');
  const [globalSearchQuery, setGlobalSearchQuery] = useState<string>('');
  const [filterOpenSignal, setFilterOpenSignal] = useState(0);
  const [homeSignal, setHomeSignal] = useState(0);
  const [filtersActive, setFiltersActive] = useState(false);
  const [clearFiltersSignal, setClearFiltersSignal] = useState(0);
  const [activePayBooking, setActivePayBooking] = useState<Booking | null>(null);
  const [showPayModal, setShowPayModal] = useState<boolean>(false);
  const [showNotificationInbox, setShowNotificationInbox] = useState(false);
  const [openWorkspaceMessagesSignal, setOpenWorkspaceMessagesSignal] = useState(0);
  const [pendingMessageThreadId, setPendingMessageThreadId] = useState<string | null>(null);
  const [messagesNavActive, setMessagesNavActive] = useState(false);
  const [settingsReturnView, setSettingsReturnView] = useState<string>('MARKETPLACE');

  const messagesUnreadCount = messages.filter((m) => m.receiverId === user?.id && !m.readAt).length;

  const loadPublicData = async () => {
    const shopsRes = await api.getShops();
    if (shopsRes.success && shopsRes.data) setShops(shopsRes.data);

    const shelvesRes = await api.getShelves();
    if (shelvesRes.success && shelvesRes.data) setShelves(shelvesRes.data);

    const settingsRes = await api.getSettings();
    if (settingsRes.success && settingsRes.data) setPlatformSettings(settingsRes.data);
  };

  // Load User Specific Data
  const loadUserData = async () => {
    const meRes = await api.getMe();
    if (meRes.success && meRes.data) {
      setUser(meRes.data.user);
      if (meRes.data.vendorProfile) setVendorProfile(meRes.data.vendorProfile);
      if (meRes.data.hostProfile) setHostProfile(meRes.data.hostProfile);

      // Fetch Role-Specific Collections
      if (meRes.data.user.role === 'ADMIN') {
        const statsRes = await api.getAdminDashboard();
        if (statsRes.success && statsRes.data) {
          setAdminStats(statsRes.data.stats || statsRes.data);
        }

        const usersRes = await api.getAdminUsers();
        if (usersRes.success && usersRes.data) setAdminUsers(usersRes.data);

        const auditRes = await api.getAuditLogs();
        if (auditRes.success && auditRes.data) setAuditLogs(auditRes.data);
      }

      if (meRes.data.user.role === 'VENDOR') {
        const prodRes = await api.getProducts();
        if (prodRes.success && prodRes.data) setProducts(prodRes.data);

        const invRes = await api.getInventory();
        if (invRes.success && invRes.data) setInventory(invRes.data);
      }

      if (meRes.data.user.role === 'FIELD_AGENT') {
        const visitsRes = await api.getFieldVisits();
        if (visitsRes.success && visitsRes.data) setFieldVisits(visitsRes.data);

        const repRes = await api.getReports();
        if (repRes.success && repRes.data) setFieldReports(repRes.data);
      }

      if (meRes.data.user.role === 'HOST' || meRes.data.user.role === 'ADMIN') {
        const payRes = await api.getPayouts();
        if (payRes.success && payRes.data) setPayouts(payRes.data);
      }

      const bookRes = await api.getBookings();
      if (bookRes.success && bookRes.data) setBookings(bookRes.data);

      const notifRes = await api.getNotifications();
      if (notifRes.success && notifRes.data) setNotifications(notifRes.data);

      const msgRes = await api.getMessages();
      if (msgRes.success && msgRes.data) setMessages(msgRes.data);
    }
  };

  useEffect(() => {
    loadPublicData();
    const token = getStoredToken();
    if (token) {
      loadUserData();
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    const timer = window.setInterval(() => {
      void loadUserData();
    }, 45000);
    return () => window.clearInterval(timer);
  }, [user?.id]);

  // Demo Login Handler
  const handleDemoLogin = async (email: string) => {
    const res = await api.login({ email, password: 'Password123!' });
    if (res.success && res.data) {
      setStoredToken(res.data.token, res.data.refreshToken);
      setUser(res.data.user);
      if (res.data.vendorProfile) setVendorProfile(res.data.vendorProfile);
      if (res.data.hostProfile) setHostProfile(res.data.hostProfile);
      setActiveRoleView(res.data.user.role);
      loadUserData();
      loadPublicData();
    }
  };

  // Logout Handler
  const handleLogout = () => {
    void api.logout();
    clearStoredToken();
    setUser(null);
    setVendorProfile(null);
    setHostProfile(null);
    setActiveRoleView('MARKETPLACE');
    setBookings([]);
    setProducts([]);
    setInventory([]);
    setFieldVisits([]);
    setFieldReports([]);
    setNotifications([]);
    setMessages([]);
    setAdminStats(null);
    setAdminUsers([]);
    setAuditLogs([]);
    setPayouts([]);
  };

  const handleOpenAuthModal = (initialMode: 'LOGIN' | 'REGISTER' = 'LOGIN', initialRole: UserRole = 'VENDOR') => {
    setAuthModalMode(initialMode);
    setAuthModalRole(initialRole);
    setShowAuthModal(true);
  };

  const openAccountSettings = () => {
    if (!user) {
      handleOpenAuthModal('LOGIN');
      return;
    }
    setSettingsReturnView(activeRoleView === 'SETTINGS' ? user.role : activeRoleView);
    setActiveRoleView('SETTINGS');
  };

  const goToMessages = (threadId?: string | null) => {
    if (!user) {
      handleOpenAuthModal('LOGIN', 'VENDOR');
      return;
    }
    if (threadId) setPendingMessageThreadId(threadId);
    setMessagesNavActive(true);
    setOpenWorkspaceMessagesSignal((n) => n + 1);
    if (user.role === 'VENDOR') {
      setActiveRoleView('VENDOR');
      return;
    }
    if (user.role === 'HOST') {
      setActiveRoleView('HOST');
      return;
    }
    setActiveRoleView('MESSAGES');
  };

  const openShopChat = (shopId: string, _shelfId?: string, _shelfName?: string) => {
    if (!user) {
      handleOpenAuthModal('LOGIN', 'VENDOR');
      return;
    }
    const shop = shops.find((s) => s.id === shopId);
    if (!shop) return;
    if (user.id === shop.hostId) return;
    goToMessages(shopThreadId(shopId, shop.hostId));
  };

  const openInboxThread = (thread: InboxThread) => {
    goToMessages(thread.id);
  };

  // Create Booking & Open Azam Pay checkout
  const handleBookShelfAction = async (
    shelf: Shelf,
    startDate?: string,
    endDate?: string,
    durationMonths?: number,
    category?: string
  ) => {
    if (!user) {
      handleOpenAuthModal('LOGIN');
      return;
    }

    const payload = {
      shelfId: shelf.id,
      startDate: startDate || new Date().toISOString().split('T')[0],
      durationMonths: durationMonths || 1,
      selectedCategory: category,
    };

    const res = await api.createBooking(payload);

    if (res.success && res.data) {
      loadUserData();
      if (res.data.status === 'PENDING_APPROVAL') {
        window.alert(
          'Booking request sent to the shop host. You will get a notification when you can pay with Azam Pay.'
        );
        return;
      }
      if (['PAYMENT_PENDING', 'PAYMENT_FAILED', 'APPROVED'].includes(res.data.status)) {
        setActivePayBooking(res.data);
        setShowPayModal(true);
      }
    } else {
      alert(res.error?.message || 'Failed to initialize shelf reservation. Please try again.');
    }
  };

  const legalSlug = window.location.pathname.replace(/^\/legal\/?/, '');
  const showLegal = window.location.pathname.startsWith('/legal');
  const shelfSlugMatch = window.location.pathname.match(/^\/s\/([^/]+)/);
  if (showLegal) {
    return (
      <LegalPage
        slug={LEGAL_SLUGS.includes(legalSlug) ? legalSlug : 'terms'}
        onBack={() => {
          window.history.pushState({}, '', '/');
          window.location.reload();
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[var(--shelfy-bg)] font-sans text-[var(--shelfy-fg)] flex flex-col overflow-x-clip">
      
      {/* Global Airbnb-Style Header */}
      <Header
        user={user}
        activeRole={activeRoleView}
        searchQuery={globalSearchQuery}
        onSearchChange={(q) => {
          setGlobalSearchQuery(q);
          if (activeRoleView !== 'MARKETPLACE') setActiveRoleView('MARKETPLACE');
        }}
        onLoginClick={(mode, role) => handleOpenAuthModal(mode || 'LOGIN', role || 'VENDOR')}
        onDemoLogin={handleDemoLogin}
        onLogout={handleLogout}
        onSwitchView={(view) => {
          setActiveRoleView(view);
          if (view !== 'VENDOR' && view !== 'HOST' && view !== 'MESSAGES') setMessagesNavActive(false);
          if (view === 'MARKETPLACE') setHomeSignal((n) => n + 1);
        }}
        messagesNavActive={messagesNavActive || activeRoleView === 'MESSAGES'}
        notificationsCount={notifications.filter((n) => !n.readAt).length}
        messagesUnreadCount={messagesUnreadCount}
        onNotificationsClick={() => {
          if (!user) return;
          setShowNotificationInbox(true);
        }}
        onMessagesClick={() => goToMessages(null)}
        onOpenSettings={openAccountSettings}
        onOpenFilter={() => {
          setActiveRoleView('MARKETPLACE');
          setFilterOpenSignal((n) => n + 1);
        }}
        filtersActive={filtersActive}
        onClearFilters={() => setClearFiltersSignal((n) => n + 1)}
        onHomeClick={() => setHomeSignal((n) => n + 1)}
      />

      {/* Main View Router */}
      <div className="flex-1 flex flex-col">
        {activeRoleView === 'MARKETPLACE' && (
          <LandingPage
            shelves={shelves}
            shops={shops}
            user={user}
            searchQuery={globalSearchQuery}
            onSearchChange={setGlobalSearchQuery}
            shelfCategories={platformSettings?.shelfCategories}
            shelfTypes={platformSettings?.shelfTypes}
            onBookShelf={handleBookShelfAction}
            onLoginClick={() => handleOpenAuthModal('LOGIN')}
            onOpenHostChat={openShopChat}
            initialShelfSlug={shelfSlugMatch?.[1]}
            openFilterSignal={filterOpenSignal}
            homeSignal={homeSignal}
            clearFiltersSignal={clearFiltersSignal}
            onFiltersActiveChange={setFiltersActive}
          />
        )}

        {activeRoleView === 'ADMIN' && user?.role === 'ADMIN' && (
          <AdminDashboard
            stats={adminStats}
            users={adminUsers}
            shops={shops}
            shelves={shelves}
            bookings={bookings}
            auditLogs={auditLogs}
            settings={platformSettings}
            onUpdateUserStatus={async (userId, status) => {
              await api.updateUserStatus(userId, status);
              loadUserData();
            }}
            onUpdateSettings={async (settings) => {
              const res = await api.updateSettings(settings);
              if (res.success && res.data) setPlatformSettings(res.data);
            }}
          />
        )}

        {activeRoleView === 'VENDOR' && user?.role === 'VENDOR' && (
          <VendorDashboard
            user={user}
            vendorProfile={vendorProfile}
            bookings={bookings}
            products={products}
            inventory={inventory}
            shelves={shelves}
            shops={shops}
            messages={messages}
            openMessagesSignal={openWorkspaceMessagesSignal}
            initialMessageThreadId={pendingMessageThreadId}
            onInitialMessageThreadConsumed={() => setPendingMessageThreadId(null)}
            onMessagesTabActiveChange={setMessagesNavActive}
            onBookShelf={handleBookShelfAction}
            onRefreshData={loadUserData}
          />
        )}

        {activeRoleView === 'HOST' && user?.role === 'HOST' && (
          <HostDashboard
            user={user}
            hostProfile={hostProfile}
            shops={shops}
            shelves={shelves}
            bookings={bookings}
            payouts={payouts}
            messages={messages}
            openMessagesSignal={openWorkspaceMessagesSignal}
            initialMessageThreadId={pendingMessageThreadId}
            onInitialMessageThreadConsumed={() => setPendingMessageThreadId(null)}
            onMessagesTabActiveChange={setMessagesNavActive}
            shelfCategories={platformSettings?.shelfCategories}
            shelfTypes={platformSettings?.shelfTypes}
            onRefreshData={() => {
              loadPublicData();
              loadUserData();
            }}
          />
        )}

        {activeRoleView === 'SETTINGS' && user && (
          <UserSettingsPage
            user={user}
            vendorProfile={vendorProfile}
            hostProfile={hostProfile}
            onUpdated={loadUserData}
            onBack={() => {
              const back = settingsReturnView && settingsReturnView !== 'SETTINGS' ? settingsReturnView : 'MARKETPLACE';
              setActiveRoleView(back);
            }}
          />
        )}

        {activeRoleView === 'MESSAGES' && user && (
          <MessagesPage
            user={user}
            messages={messages}
            shops={shops}
            bookings={bookings}
            onRefresh={loadUserData}
            onBackToMarket={() => {
              setMessagesNavActive(false);
              setActiveRoleView('MARKETPLACE');
            }}
            initialThreadId={pendingMessageThreadId}
            onInitialThreadConsumed={() => setPendingMessageThreadId(null)}
          />
        )}

        {activeRoleView === 'FIELD_AGENT' && user?.role === 'FIELD_AGENT' && (
          <AgentDashboard
            user={user}
            visits={fieldVisits}
            reports={fieldReports}
            onRefreshData={loadUserData}
          />
        )}
      </div>

      <MobileBottomNav
        user={user}
        activeRole={activeRoleView}
        notificationsCount={notifications.filter((n) => !n.readAt).length}
        onSwitchView={(view) => {
          setActiveRoleView(view);
          if (view === 'MARKETPLACE') setHomeSignal((n) => n + 1);
        }}
        onNotificationsClick={() => {
          if (!user) return;
          setShowNotificationInbox(true);
        }}
        onLoginClick={(mode) => handleOpenAuthModal(mode || 'LOGIN', 'VENDOR')}
        onLogout={handleLogout}
      />

      {/* Notification inbox */}
      {user && (
        <NotificationInbox
          open={showNotificationInbox}
          onClose={() => setShowNotificationInbox(false)}
          notifications={notifications}
          onMarkRead={async (ids) => {
            await api.markNotificationsRead(ids);
            const notifRes = await api.getNotifications();
            if (notifRes.success && notifRes.data) setNotifications(notifRes.data);
          }}
        />
      )}

      {user?.role === 'VENDOR' && (
        <CheckoutCartWithRegister
          onCheckoutComplete={() => {
            loadUserData();
            setActiveRoleView('VENDOR');
          }}
        />
      )}

      {showPayModal && activePayBooking && (
        <AzamPayPaymentModal
          isOpen={showPayModal}
          booking={activePayBooking}
          onClose={() => {
            setShowPayModal(false);
            setActivePayBooking(null);
          }}
          onPaymentSuccess={() => {
            loadUserData();
            loadPublicData();
            if (user?.role === 'VENDOR') {
              setActiveRoleView('VENDOR');
            }
          }}
        />
      )}

      {/* Authentication Modal */}
      {showAuthModal && (
        <AuthModal
          isOpen={showAuthModal}
          initialMode={authModalMode}
          initialRole={authModalRole}
          onClose={() => setShowAuthModal(false)}
          onSuccess={(data) => {
            setStoredToken(data.token, data.refreshToken);
            setUser(data.user);
            if (data.vendorProfile) setVendorProfile(data.vendorProfile);
            if (data.hostProfile) setHostProfile(data.hostProfile);
            setActiveRoleView(data.user.role);
            loadUserData();
          }}
        />
      )}

    </div>
  );
}
export default App;
