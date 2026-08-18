/**
 * Shelfy 🇹🇿 — Host Workspace (Shop & Shelf Owner Dashboard)
 */

import React, { useEffect, useState } from 'react';
import {
  Store,
  Layers,
  Calendar,
  DollarSign,
  Plus,
  CheckCircle2,
  XCircle,
  MapPin,
  TrendingUp,
  X,
  CreditCard,
  Building,
} from 'lucide-react';
import { User, HostProfile, Shop, Shelf, Booking, Payout } from '../types/index.js';
import { api } from '../lib/api.js';
import { ListingWizard } from './ListingWizard.js';
import { HostAnalyticsPanel } from './HostAnalyticsPanel.js';
import { HostApprovalInbox } from './HostApprovalInbox.js';

interface HostDashboardProps {
  user: User;
  hostProfile?: HostProfile | null;
  shops: Shop[];
  shelves: Shelf[];
  bookings: Booking[];
  payouts: Payout[];
  shelfCategories?: string[];
  shelfTypes?: { id: string; name: string }[];
  onRefreshData: () => void;
}

export const HostDashboard: React.FC<HostDashboardProps> = ({
  user,
  hostProfile,
  shops,
  shelves,
  bookings,
  payouts,
  shelfCategories,
  shelfTypes,
  onRefreshData,
}) => {
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'SHOPS' | 'SHELVES' | 'BOOKINGS' | 'EARNINGS' | 'APPROVALS'>('OVERVIEW');
  const [finance, setFinance] = useState<any>(null);
  const [withdrawAmount, setWithdrawAmount] = useState(20000);

  // Add Shop Modal
  const [showShopModal, setShowShopModal] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [shopName, setShopName] = useState('');
  const [shopAddress, setShopAddress] = useState('');
  const [shopCity, setShopCity] = useState('Dar es Salaam');
  const [shopType, setShopType] = useState<'SUPERMARKET' | 'CONVENIENCE' | 'BOUTIQUE' | 'MINI_MARKET'>('SUPERMARKET');

  // Add Shelf Modal
  const [showShelfModal, setShowShelfModal] = useState(false);
  const [selectedShopId, setSelectedShopId] = useState('');
  const [shelfName, setShelfName] = useState('');
  const [shelfType, setShelfType] = useState('EYE_LEVEL');
  const [monthlyPrice, setMonthlyPrice] = useState(70000);
  const [widthCm, setWidthCm] = useState(120);
  const [selectedAllowedCategories, setSelectedAllowedCategories] = useState<string[]>([
    'Food & Beverages',
    'Snacks',
  ]);

  const defaultCategories = shelfCategories || [
    'Food & Beverages',
    'Health & Beauty',
    'Snacks',
    'Organic Goods',
    'Cosmetics',
    'Packaged Spices',
    'Confectionery',
    'Household Goods',
  ];

  const defaultShelfTypesList = shelfTypes || [
    { id: 'EYE_LEVEL', name: 'Eye-Level Display Shelf' },
    { id: 'COUNTER_DISPLAY', name: 'Counter Checkout Impulse Box' },
    { id: 'ENTRANCE_DISPLAY', name: 'Lobby Entrance Glass Stand' },
    { id: 'REFRIGERATED', name: 'Chilled Cooler / Refrigerator' },
    { id: 'TOP_SHELF', name: 'Top Display Rack' },
    { id: 'BOTTOM_SHELF', name: 'Bottom Bulk Shelf' },
  ];

  const toggleCategory = (cat: string) => {
    if (selectedAllowedCategories.includes(cat)) {
      setSelectedAllowedCategories(selectedAllowedCategories.filter((c) => c !== cat));
    } else {
      setSelectedAllowedCategories([...selectedAllowedCategories, cat]);
    }
  };

  const myShops = shops.filter((s) => s.hostId === user.id && !s.deletedAt);
  const myShelves = shelves.filter((sh) => myShops.some((s) => s.id === sh.shopId) && !sh.deletedAt);
  const myBookings = bookings.filter((b) => b.hostId === user.id);

  useEffect(() => {
    api.getFinanceSummary().then((res) => {
      if (res.success) setFinance(res.data);
    });
  }, [activeTab, payouts.length]);

  const totalEarningsTzs = myBookings
    .filter((b) => b.paymentStatus === 'PAID')
    .reduce((sum, b) => sum + b.hostEarningsTzs, 0);

  // Submit Shop
  const handleCreateShop = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await api.createShop({
      name: shopName,
      address: shopAddress,
      city: shopCity,
      shopType,
    });
    if (res.success) {
      setShowShopModal(false);
      setShopName('');
      setShopAddress('');
      onRefreshData();
    }
  };

  // Submit Shelf
  const handleCreateShelf = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedShopId && myShops[0]) {
      setSelectedShopId(myShops[0].id);
    }
    const targetShopId = selectedShopId || (myShops[0] ? myShops[0].id : '');
    const res = await api.createShelf({
      shopId: targetShopId,
      name: shelfName,
      shelfType,
      monthlyPriceTzs: monthlyPrice,
      widthCm,
      allowedCategories: selectedAllowedCategories,
    });
    if (res.success) {
      setShowShelfModal(false);
      setShelfName('');
      onRefreshData();
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col md:flex-row">
      
      {/* Left Host Navigation Sidebar */}
      <aside className="w-full md:w-64 bg-slate-900 border-b md:border-b-0 md:border-r border-slate-800 p-3 md:p-4 flex flex-col shrink-0">
        <div className="md:flex-1">
          <div className="px-2 md:px-3 py-2 md:py-3 border-b border-slate-800 mb-3 md:mb-4">
            <div className="flex items-center gap-2">
              <Store className="w-5 h-5 text-blue-400" />
              <span className="font-extrabold text-sm tracking-wider text-white">HOST PORTAL</span>
            </div>
            <div className="text-[11px] text-emerald-400 font-semibold mt-1 truncate">
              {hostProfile?.businessName || user.name}
            </div>
          </div>

          <nav className="flex md:flex-col gap-1 overflow-x-auto md:overflow-visible pb-1 md:pb-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {[
              { id: 'OVERVIEW', label: 'Dashboard', icon: TrendingUp },
              { id: 'SHOPS', label: 'Shops', icon: Building },
              { id: 'SHELVES', label: 'Shelves', icon: Layers },
              { id: 'BOOKINGS', label: 'Bookings', icon: Calendar },
              { id: 'APPROVALS', label: 'Approvals', icon: CheckCircle2 },
              { id: 'EARNINGS', label: 'Earnings', icon: DollarSign },
            ].map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as any)}
                  className={`shrink-0 md:w-full flex items-center gap-2 md:gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap touch-target ${
                    isActive
                      ? 'bg-blue-500 text-slate-950 font-bold shadow-md shadow-blue-500/20'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="hidden md:block p-3 bg-slate-950 border border-slate-800 rounded-xl mt-6 text-center text-xs text-slate-400">
          <div>
            Verified Host:{' '}
            <span className={hostProfile?.verificationStatus === 'VERIFIED' ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
              {hostProfile?.verificationStatus || 'PENDING'}
            </span>
          </div>
          <div>Net Earnings: <span className="text-amber-400 font-bold">TZS {totalEarningsTzs.toLocaleString()}</span></div>
        </div>
      </aside>

      {/* Main Host Content */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
        
        {/* Welcome Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-4 border-b border-slate-800">
          <div>
            <h1 className="text-2xl font-black text-white">Host Command Center</h1>
            <p className="text-xs text-slate-400 mt-1">Monetize unused retail shelf space by connecting with brands in Tanzania.</p>
          </div>
          <div className="flex flex-col sm:flex-row flex-wrap gap-2 w-full sm:w-auto">
            <button
              onClick={() => setShowWizard(true)}
              className="flex-1 sm:flex-none px-3.5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs rounded-xl flex items-center justify-center gap-1.5 touch-target"
            >
              <Plus className="w-4 h-4" /> List shop & shelf
            </button>
            <button
              onClick={() => setShowShopModal(true)}
              className="flex-1 sm:flex-none px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 touch-target"
            >
              <Plus className="w-4 h-4 text-emerald-400" /> Add shop
            </button>
            <button
              onClick={() => setShowShelfModal(true)}
              className="flex-1 sm:flex-none px-3.5 py-2.5 bg-blue-500 hover:bg-blue-400 text-slate-950 font-extrabold text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-lg shadow-blue-500/20 touch-target"
            >
              <Plus className="w-4 h-4" /> Add shelf
            </button>
          </div>
        </div>

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'OVERVIEW' && (
          <div className="space-y-8">
            <HostAnalyticsPanel />
            
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
                <div className="text-slate-400 text-xs font-semibold mb-1">My Retail Shops</div>
                <div className="text-2xl font-black text-white">{myShops.length}</div>
                <div className="text-[11px] text-emerald-400 mt-1">Verified Locations</div>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
                <div className="text-slate-400 text-xs font-semibold mb-1">Total Display Shelves</div>
                <div className="text-2xl font-black text-blue-400">{myShelves.length}</div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Booked: {myShelves.filter((s) => s.availabilityStatus === 'BOOKED').length}
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
                <div className="text-slate-400 text-xs font-semibold mb-1">Total Net Earnings</div>
                <div className="text-2xl font-black text-emerald-400">
                  TZS {totalEarningsTzs.toLocaleString()}
                </div>
                <div className="text-[11px] text-emerald-400 mt-1">After 10% platform fee</div>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
                <div className="text-slate-400 text-xs font-semibold mb-1">Pending Bookings</div>
                <div className="text-2xl font-black text-amber-400">
                  {myBookings.filter((b) => b.status === 'PENDING_APPROVAL').length}
                </div>
                <div className="text-[11px] text-amber-400 mt-1">Action required</div>
              </div>
            </div>

            {/* My Shops & Active Bookings Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* My Shops List */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                  <Store className="w-4 h-4 text-emerald-400" /> Listed Retail Shops
                </h3>
                <div className="space-y-3">
                  {myShops.map((sp) => (
                    <div key={sp.id} className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex gap-3">
                      <img src={sp.photos[0]} alt={sp.name} className="w-16 h-16 rounded-lg object-cover border border-slate-700" />
                      <div>
                        <div className="font-bold text-white text-xs">{sp.name}</div>
                        <div className="text-[10px] text-emerald-400">{sp.city} • {sp.address}</div>
                        <div className="text-[10px] text-slate-400 mt-1">Foot Traffic Score: {sp.footTrafficScore}/10</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Vendor Bookings */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-blue-400" /> Active Vendor Placement Bookings
                </h3>
                <div className="space-y-3">
                  {myBookings.map((b) => (
                    <div key={b.id} className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-bold text-white">{b.shelfName}</div>
                        <div className="text-[10px] text-amber-400">Vendor: {b.vendorName}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono font-bold text-emerald-400">TZS {b.hostEarningsTzs.toLocaleString()}</div>
                        <span className="text-[10px] font-bold text-emerald-400">{b.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>

          </div>
        )}

        {activeTab === 'SHOPS' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">My Shop Locations ({myShops.length})</h2>
              <button onClick={() => setShowShopModal(true)} className="px-3 py-2 bg-emerald-500 text-slate-950 font-bold text-xs rounded-xl">
                Add Shop
              </button>
            </div>
            {myShops.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-xs text-slate-400">
                No shops yet. Add a retail location to start listing shelves.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {myShops.map((sp) => (
                  <div key={sp.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex gap-4">
                    <img src={sp.photos[0]} alt={sp.name} className="w-20 h-20 rounded-lg object-cover border border-slate-700" />
                    <div>
                      <div className="font-bold text-white text-sm">{sp.name}</div>
                      <div className="text-[11px] text-emerald-400">{sp.city} • {sp.address}</div>
                      <div className="text-[10px] text-slate-400 mt-1">Type: {sp.shopType.replace('_', ' ')}</div>
                      <span className={`mt-2 inline-block text-[10px] px-2 py-0.5 rounded font-bold ${sp.verificationStatus === 'VERIFIED' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                        {sp.listingStatus || sp.verificationStatus}
                      </span>
                      {sp.verificationStatus !== 'VERIFIED' && sp.listingStatus !== 'PUBLISHED' && sp.listingStatus !== 'SUBMITTED' && (
                        <button
                          onClick={async () => { await api.submitListing('shop', sp.id); onRefreshData(); }}
                          className="ml-2 text-[10px] px-2 py-0.5 rounded bg-amber-500 text-slate-950 font-bold"
                        >
                          Submit for verification
                        </button>
                      )}
                      <button
                        onClick={async () => {
                          const res = await api.archiveShop(sp.id);
                          if (!res.success) alert(res.error?.message || 'Could not archive shop.');
                          onRefreshData();
                        }}
                        className="ml-2 text-[10px] text-slate-500"
                      >
                        Archive
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'SHELVES' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">My Display Shelves ({myShelves.length})</h2>
              <button onClick={() => setShowShelfModal(true)} className="px-3 py-2 bg-blue-500 text-slate-950 font-bold text-xs rounded-xl">
                Add Shelf
              </button>
            </div>
            {myShelves.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 text-center text-xs text-slate-400">
                No shelves listed yet. Add a display shelf to start earning rent.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {myShelves.map((sh) => (
                  <div key={sh.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="font-bold text-white text-sm">{sh.name}</div>
                        <div className="text-[11px] text-emerald-400">{sh.shopName} • {sh.shopCity}</div>
                      </div>
                      <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${sh.availabilityStatus === 'AVAILABLE' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                        {sh.availabilityStatus}
                      </span>
                    </div>
                    <div className="mt-3 text-xs text-slate-300">TZS {sh.monthlyPriceTzs.toLocaleString()}/mo • {sh.shelfType.replace('_', ' ')}</div>
                    <button
                      type="button"
                      onClick={async () => {
                        const res = await api.getPricingSuggestion(sh.id);
                        if (res.success && res.data) {
                          const ok = window.confirm(`${res.data.reason}\n\nApply TZS ${res.data.suggestedPriceTzs.toLocaleString()}?`);
                          if (ok) {
                            await api.applyShelfPricing(sh.id, res.data.suggestedPriceTzs);
                            onRefreshData();
                          }
                        }
                      }}
                      className="mt-2 text-[10px] px-2 py-1 rounded bg-purple-500/20 text-purple-300 font-bold border border-purple-500/30"
                    >
                      Dynamic pricing
                    </button>
                    <div className="mt-1 text-[10px] text-slate-500">{sh.listingStatus || sh.verificationStatus || 'DRAFT'} · {sh.allowedCategories.join(', ')}</div>
                    {sh.listingStatus !== 'PUBLISHED' && sh.verificationStatus !== 'VERIFIED' && sh.hostVerificationStatus !== 'VERIFIED' && sh.listingStatus !== 'SUBMITTED' && (
                      <button onClick={async () => { await api.submitListing('shelf', sh.id); onRefreshData(); }} className="mt-2 text-[10px] px-2 py-0.5 rounded bg-amber-500 text-slate-950 font-bold">Submit for verification</button>
                    )}
                    <button
                      onClick={async () => {
                        const res = await api.archiveShelf(sh.id);
                        if (!res.success) alert(res.error?.message || 'Could not archive shelf.');
                        onRefreshData();
                      }}
                      className="mt-2 ml-2 text-[10px] text-slate-500"
                    >
                      Archive
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'APPROVALS' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <h2 className="text-lg font-bold text-white mb-4">Pending approval inbox</h2>
            <HostApprovalInbox onAction={onRefreshData} />
          </div>
        )}

        {activeTab === 'BOOKINGS' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <h2 className="text-lg font-bold text-white mb-4">Vendor Bookings</h2>
            {myBookings.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400">No vendor bookings yet.</div>
            ) : (
              <div className="space-y-3">
                {myBookings.map((b) => (
                  <div key={b.id} className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <div className="font-bold text-white">{b.shelfName}</div>
                      <div className="text-amber-400">{b.vendorName} • {b.shopCity}</div>
                      <div className="text-slate-400 mt-1">{b.startDate} → {b.endDate} • {b.status}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-bold text-emerald-400">TZS {b.hostEarningsTzs.toLocaleString()}</div>
                      {b.status === 'PENDING_APPROVAL' && (
                        <div className="flex gap-2 mt-2 justify-end">
                          <button
                            onClick={async () => {
                              await api.updateBookingStatus(b.id, 'APPROVED');
                              onRefreshData();
                            }}
                            className="px-2.5 py-1 bg-emerald-500 text-slate-950 font-bold rounded"
                          >
                            Approve
                          </button>
                          <button
                            onClick={async () => {
                              await api.updateBookingStatus(b.id, 'REJECTED');
                              onRefreshData();
                            }}
                            className="px-2.5 py-1 bg-rose-500/20 text-rose-400 font-bold rounded"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                      {['PENDING_APPROVAL', 'APPROVED', 'PAYMENT_PENDING', 'PAID', 'ACTIVE', 'EXPIRING'].includes(b.status) && (
                        <button
                          onClick={async () => {
                            await api.cancelBooking(b.id, 'Host cancelled');
                            onRefreshData();
                          }}
                          className="block mt-2 ml-auto text-[10px] text-rose-400"
                        >
                          Cancel booking
                        </button>
                      )}
                      {['ACTIVE', 'EXPIRING'].includes(b.status) && (
                        <button
                          onClick={async () => {
                            const reason = window.prompt('Describe the dispute (min 10 characters)');
                            if (!reason) return;
                            const res = await api.openDispute(b.id, reason);
                            if (!res.success) alert(res.error?.message || 'Could not open dispute.');
                            onRefreshData();
                          }}
                          className="block mt-1 ml-auto text-[10px] text-amber-400"
                        >
                          Open dispute
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'EARNINGS' && (
          <div className="space-y-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <h2 className="text-lg font-bold text-white mb-1">Earnings & Payouts</h2>
              <p className="text-xs text-slate-400 mb-4">Available balance is withdrawable. Pending is still in an active booking.</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6 text-xs">
                <div><div className="text-slate-400">Available</div><div className="text-xl font-black text-emerald-400">TZS {(finance?.availableTzs || 0).toLocaleString()}</div></div>
                <div><div className="text-slate-400">Pending</div><div className="text-xl font-black text-amber-400">TZS {(finance?.pendingTzs || 0).toLocaleString()}</div></div>
                <div><div className="text-slate-400">Earned</div><div className="text-xl font-black text-white">TZS {(finance?.totalEarnedTzs || totalEarningsTzs).toLocaleString()}</div></div>
                <div><div className="text-slate-400">Withdrawn</div><div className="text-xl font-black text-slate-300">TZS {(finance?.withdrawnTzs || 0).toLocaleString()}</div></div>
              </div>
              <div className="flex gap-2 mb-6">
                <input type="number" value={withdrawAmount} onChange={(e) => setWithdrawAmount(Number(e.target.value))} className="bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-white" />
                <button
                  onClick={async () => {
                    await api.requestWithdrawal(withdrawAmount, 'MOBILE_MONEY').then(async (wd) => {
                      if (!wd.success) {
                        alert(wd.error?.message || 'Withdrawal failed.');
                        return;
                      }
                      const res = await api.getFinanceSummary();
                      if (res.data) setFinance(res.data);
                      onRefreshData();
                    });
                  }}
                  className="px-3 py-2 bg-emerald-500 text-slate-950 font-bold text-xs rounded-lg"
                >
                  Request withdrawal
                </button>
              </div>
              {payouts.length === 0 ? (
                <div className="text-xs text-slate-400">No payout records yet. Paid bookings will appear here.</div>
              ) : (
                <div className="space-y-3">
                  {payouts.map((p) => (
                    <div key={p.id} className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 text-xs flex items-center justify-between">
                      <div>
                        <div className="font-bold text-white">{p.payoutReference || p.id}</div>
                        <div className="text-slate-400">Gross TZS {p.grossAmountTzs.toLocaleString()} • Fee TZS {p.commissionTzs.toLocaleString()}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono font-bold text-emerald-400">TZS {p.netAmountTzs.toLocaleString()}</div>
                        <div className="text-[10px] text-amber-400 font-bold">{p.status}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

      </main>

      {showWizard && (
        <ListingWizard
          shops={myShops}
          shelfCategories={defaultCategories}
          shelfTypes={defaultShelfTypesList}
          onClose={() => setShowWizard(false)}
          onComplete={onRefreshData}
        />
      )}

      {/* ADD SHOP MODAL */}
      {showShopModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-2xl max-w-md w-full p-6 relative max-h-[92vh] overflow-y-auto safe-bottom">
            <button onClick={() => setShowShopModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-lg font-bold text-white mb-4">List New Retail Shop Location</h2>

            <form onSubmit={handleCreateShop} className="space-y-4 text-xs">
              <div>
                <label className="text-slate-400 block mb-1 font-semibold">Shop Name</label>
                <input
                  type="text"
                  required
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white"
                  placeholder="e.g. Mwanza Lake Supermarket"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1 font-semibold">Street Address</label>
                <input
                  type="text"
                  required
                  value={shopAddress}
                  onChange={(e) => setShopAddress(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white"
                  placeholder="e.g. Swahili Street, Kariakoo"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1 font-semibold">City / Region</label>
                <select
                  value={shopCity}
                  onChange={(e) => setShopCity(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white"
                >
                  <option value="Dar es Salaam">Dar es Salaam</option>
                  <option value="Mwanza">Mwanza</option>
                  <option value="Arusha">Arusha</option>
                  <option value="Dodoma">Dodoma</option>
                  <option value="Zanzibar">Zanzibar</option>
                  <option value="Mbeya">Mbeya</option>
                </select>
              </div>

              <button type="submit" className="w-full py-3 bg-emerald-500 text-slate-950 font-bold text-xs rounded-xl">
                Create Retail Shop
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ADD SHELF MODAL */}
      {showShelfModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-2xl max-w-md w-full p-6 relative max-h-[92vh] overflow-y-auto safe-bottom">
            <button onClick={() => setShowShelfModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-lg font-bold text-white mb-4">Add Display Shelf Space</h2>

            <form onSubmit={handleCreateShelf} className="space-y-4 text-xs">
              <div>
                <label className="text-slate-400 block mb-1 font-semibold">Target Shop</label>
                <select
                  value={selectedShopId}
                  onChange={(e) => setSelectedShopId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white"
                >
                  {myShops.map((s) => (
                    <option key={s.id} value={s.id}>{s.name} ({s.city})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-1 font-semibold">Shelf Name / Label</label>
                <input
                  type="text"
                  required
                  value={shelfName}
                  onChange={(e) => setShelfName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white"
                  placeholder="e.g. Eye-Level Counter Stand A"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1 font-semibold">Display Type</label>
                <select
                  value={shelfType}
                  onChange={(e) => setShelfType(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white"
                >
                  {defaultShelfTypesList.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-slate-400 block mb-1 font-semibold">Permitted Product Categories</label>
                <div className="grid grid-cols-2 gap-1.5 p-2 bg-slate-950 rounded-lg border border-slate-800 max-h-32 overflow-y-auto">
                  {defaultCategories.map((cat) => (
                    <label key={cat} className="flex items-center gap-1.5 text-[11px] text-slate-300 cursor-pointer hover:text-white">
                      <input
                        type="checkbox"
                        checked={selectedAllowedCategories.includes(cat)}
                        onChange={() => toggleCategory(cat)}
                        className="rounded accent-emerald-500"
                      />
                      <span className="truncate">{cat}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-slate-400 block mb-1 font-semibold">Monthly Rent in TZS</label>
                <input
                  type="number"
                  required
                  value={monthlyPrice}
                  onChange={(e) => setMonthlyPrice(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white"
                />
              </div>

              <button type="submit" className="w-full py-3 bg-blue-500 text-slate-950 font-extrabold text-xs rounded-xl">
                List Shelf For Rent
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
