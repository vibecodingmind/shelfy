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
  const [platformSettings, setPlatformSettings] = useState<PlatformSettings>({
    commissionPercentage: 10,
    autoApproveBookings: true,
    requireFieldVerification: true,
    pesapalEnvironment: 'DEMO',
  });

  // UI Modals
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [showAIShelfMatch, setShowAIShelfMatch] = useState<boolean>(false);
  const [activePesapalBooking, setActivePesapalBooking] = useState<Booking | null>(null);
  const [activePesapalShelf, setActivePesapalShelf] = useState<Shelf | null>(null);
  const [showPesapalModal, setShowPesapalModal] = useState<boolean>(false);

  // Load Initial Market Data
  const loadPublicData = async () => {
    const shopsRes = await api.getShops();
    if (shopsRes.success && shopsRes.data) setShops(shopsRes.data);

    const shelvesRes = await api.getShelves();
    if (shelvesRes.success && shelvesRes.data) setShelves(shelvesRes.data);
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
        if (statsRes.success) setAdminStats(statsRes.data.stats);

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
    } else {
      // Default demo auto-login as Vendor for instant experience
      handleDemoLogin('vendor@shelfy.co.tz');
    }
  }, []);

  // Demo Login Handler
  const handleDemoLogin = async (email: string) => {
    const res = await api.login({ email, password: 'password123' });
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
      setShowAuthModal(true);
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
      
      {/* Global Header */}
      <Header
        user={user}
        activeRole={activeRoleView}
        onLoginClick={() => setShowAuthModal(true)}
        onDemoLogin={handleDemoLogin}
        onLogout={handleLogout}
        notificationsCount={notifications.filter((n) => !n.isRead).length}
      />

      {/* Role Navigation Bar when authenticated */}
      {user && (
        <div className="bg-slate-900/90 border-b border-slate-800 px-4 py-2 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2 max-w-7xl mx-auto w-full">
            <span className="text-slate-400 font-semibold">Switch View:</span>
            <button
              onClick={() => setActiveRoleView('MARKETPLACE')}
              className={`px-3 py-1 rounded-lg font-bold transition-all ${
                activeRoleView === 'MARKETPLACE' ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-300 hover:text-white'
              }`}
            >
              Public Marketplace
            </button>
            <button
              onClick={() => setActiveRoleView(user.role)}
              className={`px-3 py-1 rounded-lg font-bold transition-all ${
                activeRoleView === user.role ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-300 hover:text-white'
              }`}
            >
              My {user.role.replace('_', ' ')} Portal
            </button>
          </div>
        </div>
      )}

      {/* Main View Router */}
      <div className="flex-1 flex flex-col">
        {activeRoleView === 'MARKETPLACE' && (
          <LandingPage
            shelves={shelves}
            shops={shops}
            user={user}
            onBookShelf={handleBookShelfAction}
            onOpenAIShelfMatch={() => {
              if (user?.role === 'VENDOR') setActiveRoleView('VENDOR');
              else setShowAuthModal(true);
            }}
            onLoginClick={() => setShowAuthModal(true)}
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
            payouts={[]}
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
      <AuthModal
        isOpen={showAuthModal}
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

    </div>
  );
}
export default App;
