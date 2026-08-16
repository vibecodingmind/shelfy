/**
 * Shelfy 🇹🇿 — Host Workspace (Shop & Shelf Owner Dashboard)
 */

import React, { useState } from 'react';
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

interface HostDashboardProps {
  user: User;
  hostProfile?: HostProfile | null;
  shops: Shop[];
  shelves: Shelf[];
  bookings: Booking[];
  payouts: Payout[];
  onRefreshData: () => void;
}

export const HostDashboard: React.FC<HostDashboardProps> = ({
  user,
  hostProfile,
  shops,
  shelves,
  bookings,
  payouts,
  onRefreshData,
}) => {
  const [activeTab, setActiveTab] = useState<'OVERVIEW' | 'SHOPS' | 'SHELVES' | 'BOOKINGS' | 'EARNINGS'>('OVERVIEW');

  // Add Shop Modal
  const [showShopModal, setShowShopModal] = useState(false);
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

  const myShops = shops.filter((s) => s.hostId === user.id);
  const myShelves = shelves.filter((sh) => myShops.some((s) => s.id === sh.shopId));
  const myBookings = bookings.filter((b) => b.hostId === user.id);

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
      <aside className="w-full md:w-64 bg-slate-900 border-r border-slate-800 p-4 flex flex-col justify-between shrink-0">
        <div>
          <div className="px-3 py-3 border-b border-slate-800 mb-4">
            <div className="flex items-center gap-2">
              <Store className="w-5 h-5 text-blue-400" />
              <span className="font-extrabold text-sm tracking-wider text-white">HOST PORTAL</span>
            </div>
            <div className="text-[11px] text-emerald-400 font-semibold mt-1 truncate">
              {hostProfile?.businessName || user.name}
            </div>
          </div>

          <nav className="space-y-1">
            {[
              { id: 'OVERVIEW', label: 'Host Dashboard', icon: TrendingUp },
              { id: 'SHOPS', label: 'My Shops Locations', icon: Building },
              { id: 'SHELVES', label: 'Shelves & Space', icon: Layers },
              { id: 'BOOKINGS', label: 'Vendor Bookings', icon: Calendar },
              { id: 'EARNINGS', label: 'Earnings & Payouts', icon: DollarSign },
            ].map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as any)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
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

        <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl mt-6 text-center text-xs text-slate-400">
          <div>Verified Host: <span className="text-emerald-400 font-bold">YES</span></div>
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
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowShopModal(true)}
              className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4 text-emerald-400" /> Add Shop Location
            </button>
            <button
              onClick={() => setShowShelfModal(true)}
              className="px-3.5 py-2.5 bg-blue-500 hover:bg-blue-400 text-slate-950 font-extrabold text-xs rounded-xl flex items-center gap-1.5 shadow-lg shadow-blue-500/20"
            >
              <Plus className="w-4 h-4" /> Add Display Shelf
            </button>
          </div>
        </div>

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'OVERVIEW' && (
          <div className="space-y-8">
            
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

      </main>

      {/* ADD SHOP MODAL */}
      {showShopModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 relative">
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
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 relative">
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
                  <option value="EYE_LEVEL">Eye-Level Display</option>
                  <option value="COUNTER_DISPLAY">Counter Checkout Box</option>
                  <option value="ENTRANCE_DISPLAY">Entrance Lobby Stand</option>
                  <option value="REFRIGERATED">Chilled / Refrigerated</option>
                </select>
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
