/**
 * Shelfy 🇹🇿 — Main React Application Architecture & Router
 */

import React, { useState, useEffect } from 'react';
import { Header } from './components/Header.js';
import { LandingPage } from './components/LandingPage.js';
import { AdminDashboard } from './components/AdminDashboard.js';
import { VendorDashboard } from './components/VendorDashboard.js';
import { HostDashboard } from './components/HostDashboard.js';
import { AgentDashboard } from './components/AgentDashboard.js';
import { AuthModal } from './components/AuthModal.js';
import { PesapalPaymentModal } from './components/PesapalPaymentModal.js';
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
    autoApproveBookings: true,
    pesapalEnvironment: 'sandbox',
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
  const [activePesapalBooking, setActivePesapalBooking] = useState<Booking | null>(null);
  const [activePesapalShelf, setActivePesapalShelf] = useState<Shelf | null>(null);
  const [showPesapalModal, setShowPesapalModal] = useState<boolean>(false);

  // Load Initial Market Data & Platform Settings
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

  // Demo Login Handler
  const handleDemoLogin = async (email: string) => {
    const res = await api.login({ email, password: 'Password123!' });
    if (res.success && res.data) {
      setStoredToken(res.data.token);
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

  // Create Booking & Open Secure PesaPal Payment Modal
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
      setActivePesapalBooking(res.data);
      setActivePesapalShelf(shelf);
      setShowPesapalModal(true);
      loadUserData();
    } else {
      alert(res.error?.message || 'Failed to initialize shelf reservation. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 font-sans text-white flex flex-col">
      
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
        onSwitchView={(view) => setActiveRoleView(view)}
        notificationsCount={notifications.filter((n) => !n.readAt).length}
        onNotificationsClick={async () => {
          if (!user) return;
          await api.markNotificationsRead();
          const notifRes = await api.getNotifications();
          if (notifRes.success && notifRes.data) setNotifications(notifRes.data);
        }}
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
            messages={messages}
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
            shelfCategories={platformSettings?.shelfCategories}
            shelfTypes={platformSettings?.shelfTypes}
            onRefreshData={() => {
              loadPublicData();
              loadUserData();
            }}
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

      {/* Secure PesaPal Payment Modal */}
      {showPesapalModal && activePesapalBooking && (
        <PesapalPaymentModal
          isOpen={showPesapalModal}
          booking={activePesapalBooking}
          shelf={activePesapalShelf}
          onClose={() => {
            setShowPesapalModal(false);
            setActivePesapalBooking(null);
            setActivePesapalShelf(null);
          }}
          onPaymentSuccess={(verifiedData) => {
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
            setStoredToken(data.token);
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
