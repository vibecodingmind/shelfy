/**
 * Shelfy 🇹🇿 — Main Admin Platform Dashboard & Control Panel
 */

import React, { useEffect, useState } from 'react';
import {
  Shield,
  Users,
  Store,
  Sliders,
  FileText,
  UserCheck,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Activity,
  Tag,
  Plus,
  Trash2,
  Package,
  Truck,
} from 'lucide-react';
import { User, AuditLog, PlatformSettings, Shop, Shelf, Booking, ShelfTypeOption } from '../types/index.js';
import { SHELF_TYPE_CATALOG } from '../lib/shelfTypes.js';
import { api } from '../lib/api.js';
import { AdminPlatformSettings } from './AdminPlatformSettings.js';
import { AdminAnalyticsPanel } from './admin/AdminAnalyticsPanel.js';
import { AdminBusinessesPanel } from './admin/AdminBusinessesPanel.js';
import { AdminUsersPanel } from './admin/AdminUsersPanel.js';
import { AdminVendorsPanel } from './admin/AdminVendorsPanel.js';

interface AdminDashboardProps {
  stats: any;
  users: User[];
  shops: Shop[];
  shelves: Shelf[];
  bookings: Booking[];
  auditLogs: AuditLog[];
  settings: PlatformSettings;
  onUpdateUserStatus: (userId: string, status: string) => void;
  onUpdateSettings: (settings: Partial<PlatformSettings>) => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  stats,
  users,
  shops,
  shelves,
  bookings,
  auditLogs,
  settings,
  onUpdateUserStatus,
  onUpdateSettings,
}) => {
  const [activeTab, setActiveTab] = useState<
    | 'ANALYTICS'
    | 'CLIENTS'
    | 'USERS'
    | 'VENDORS'
    | 'MARKETPLACE'
    | 'BOOKINGS'
    | 'FIELD'
    | 'SUPPORT'
    | 'SETTINGS'
    | 'AUDIT'
  >('ANALYTICS');
  const [verifications, setVerifications] = useState<any[]>([]);
  const [disputes, setDisputes] = useState<any[]>([]);
  const [fieldVisits, setFieldVisits] = useState<any[]>([]);
  const [fieldReports, setFieldReports] = useState<any[]>([]);
  const [adminProducts, setAdminProducts] = useState<any[]>([]);
  const [shelfListingFilter, setShelfListingFilter] = useState('');

  useEffect(() => {
    api.getVerifications().then((res) => {
      if (res.success && res.data) setVerifications(res.data);
    });
    api.getDisputes().then((res) => {
      if (res.success && res.data) setDisputes(res.data);
    });
    if (activeTab === 'FIELD') {
      api.getFieldVisits().then((res) => {
        if (res.success && res.data) setFieldVisits(res.data);
      });
      api.getReports().then((res) => {
        if (res.success && res.data) setFieldReports(res.data);
      });
    }
    if (activeTab === 'MARKETPLACE') {
      api.getProducts().then((res) => {
        if (res.success && res.data) setAdminProducts(res.data);
      });
    }
  }, [activeTab]);

  // Shelf Category Management State
  const defaultCategories = [
    'Food & Beverages',
    'Organic Goods',
    'Cosmetics',
    'Health & Beauty',
    'Spices',
    'Snacks & Confectionery',
    'Dairy & Fresh',
    'Gifts & Crafts',
    'Electronics & Tech',
    'Beverages & Juices',
    'Baked Goods',
    'Supplements & Herbal',
  ];
  const [categoriesList, setCategoriesList] = useState<string[]>(
    settings?.shelfCategories && settings.shelfCategories.length > 0 ? settings.shelfCategories : defaultCategories
  );
  const [newCategoryInput, setNewCategoryInput] = useState('');

  // Shelf Type Management State
  const defaultShelfTypes: ShelfTypeOption[] = SHELF_TYPE_CATALOG.map((type) => ({ ...type }));
  const [shelfTypesList, setShelfTypesList] = useState<ShelfTypeOption[]>(
    settings?.shelfTypes && settings.shelfTypes.length > 0 ? settings.shelfTypes : defaultShelfTypes
  );
  const [newTypeName, setNewTypeName] = useState('');
  const [newTypeDesc, setNewTypeDesc] = useState('');
  const [newTypeIcon, setNewTypeIcon] = useState('📦');

  const [savedSuccessMsg, setSavedSuccessMsg] = useState('');

  // Handle Add Category
  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newCategoryInput.trim();
    if (!trimmed) return;
    if (categoriesList.some((c) => c.toLowerCase() === trimmed.toLowerCase())) {
      alert('This category already exists.');
      return;
    }
    const updated = [...categoriesList, trimmed];
    setCategoriesList(updated);
    setNewCategoryInput('');
    onUpdateSettings({ shelfCategories: updated });
    showNotification('Category added and saved!');
  };

  // Handle Remove Category
  const handleRemoveCategory = (catToRemove: string) => {
    if (categoriesList.length <= 1) {
      alert('You must have at least one allowed category.');
      return;
    }
    const updated = categoriesList.filter((c) => c !== catToRemove);
    setCategoriesList(updated);
    onUpdateSettings({ shelfCategories: updated });
    showNotification(`Category "${catToRemove}" removed.`);
  };

  // Handle Add Shelf Type
  const handleAddShelfType = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTypeName.trim()) return;
    const generatedId = newTypeName.toUpperCase().replace(/[^A-Z0-9]/g, '_');
    if (shelfTypesList.some((t) => t.id === generatedId)) {
      alert('A shelf type with similar name already exists.');
      return;
    }
    const newType: ShelfTypeOption = {
      id: generatedId,
      name: newTypeName.trim(),
      description: newTypeDesc.trim() || 'Custom shelf placement inside store.',
      icon: newTypeIcon || '📦',
    };
    const updated = [...shelfTypesList, newType];
    setShelfTypesList(updated);
    setNewTypeName('');
    setNewTypeDesc('');
    onUpdateSettings({ shelfTypes: updated });
    showNotification('New Shelf Type added for Hosts!');
  };

  // Handle Remove Shelf Type
  const handleRemoveShelfType = (typeIdToRemove: string) => {
    if (shelfTypesList.length <= 1) {
      alert('You must have at least one shelf type.');
      return;
    }
    const updated = shelfTypesList.filter((t) => t.id !== typeIdToRemove);
    setShelfTypesList(updated);
    onUpdateSettings({ shelfTypes: updated });
    showNotification('Shelf Type removed.');
  };

  const showNotification = (msg: string) => {
    setSavedSuccessMsg(msg);
    setTimeout(() => setSavedSuccessMsg(''), 3000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col md:flex-row">
      
      {/* Left Admin Sidebar */}
      <aside className="w-full md:w-64 bg-slate-900 border-b md:border-b-0 md:border-r border-slate-800 p-3 md:p-4 flex flex-col shrink-0">
        <div>
          <div className="flex items-center gap-2 px-2 py-2 md:py-3 border-b border-slate-800 mb-3 md:mb-4">
            <Shield className="w-5 h-5 text-emerald-400" />
            <span className="font-extrabold text-sm tracking-wider text-white">ADMIN</span>
          </div>

          <nav className="flex md:flex-col gap-1 overflow-x-auto md:overflow-visible pb-1 md:pb-0 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {[
              { id: 'ANALYTICS', label: 'Dashboard', icon: Activity },
              { id: 'CLIENTS', label: 'Clients', icon: Store },
              { id: 'USERS', label: 'Users', icon: Users },
              { id: 'VENDORS', label: 'Vendors', icon: Truck },
              { id: 'MARKETPLACE', label: 'Marketplace', icon: Package },
              { id: 'BOOKINGS', label: 'Bookings', icon: Layers },
              { id: 'FIELD', label: 'Field', icon: UserCheck },
              { id: 'SUPPORT', label: 'Support', icon: AlertTriangle },
              { id: 'SETTINGS', label: 'Settings', icon: Sliders },
              { id: 'AUDIT', label: 'Audit', icon: FileText },
            ].map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id as any)}
                  className={`shrink-0 md:w-full flex items-center gap-2 md:gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap touch-target ${
                    isActive
                      ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20'
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
          <div>Platform Currency: <span className="text-emerald-400 font-bold">TZS</span></div>
          <div>Active Categories: <span className="text-emerald-400 font-bold">{categoriesList.length}</span></div>
          <div>Commission: <span className="text-amber-400 font-bold">{settings?.commissionPercentage || 10}%</span></div>
        </div>
      </aside>

      {/* Main Admin Content */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full overflow-x-hidden">
        
        {/* Header Title & Notification */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-4 border-b border-slate-800">
          <div>
            <h1 className="text-2xl font-black text-white flex items-center gap-2">
              <Shield className="w-6 h-6 text-emerald-400" />
              Admin
            </h1>
            <p className="text-xs text-slate-400 mt-1">Super Admin — businesses (clients), users, vendors, marketplace, and platform settings.</p>
          </div>

          {savedSuccessMsg && (
            <div className="px-4 py-2 rounded-xl bg-emerald-500/20 border border-emerald-500 text-emerald-400 text-xs font-bold flex items-center gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4" /> {savedSuccessMsg}
            </div>
          )}
        </div>

        {/* TAB: SHELF TYPES & CATEGORIES MANAGEMENT */}
        {activeTab === 'MARKETPLACE' && (
          <div className="space-y-8 animate-in fade-in">
            
            {/* Section 1: Product Categories Allowed on Shelves */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-800">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <Tag className="w-5 h-5 text-emerald-400" />
                    Shelf Product Categories ({categoriesList.length})
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Hosts select from these categories when configuring what products are permitted on their rented shelves.
                  </p>
                </div>
                <span className="text-xs text-emerald-400 font-mono font-semibold bg-emerald-500/10 px-3 py-1.5 rounded-lg border border-emerald-500/30">
                  Live for Hosts & Vendors
                </span>
              </div>

              {/* Add New Category Form */}
              <form onSubmit={handleAddCategory} className="flex gap-3 mb-6">
                <input
                  type="text"
                  value={newCategoryInput}
                  onChange={(e) => setNewCategoryInput(e.target.value)}
                  placeholder="e.g. Baby Care & Toys, Coffee & Tea, Artisanal Fashion..."
                  className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-2 shadow-lg shadow-emerald-500/20 transition-all cursor-pointer shrink-0"
                >
                  <Plus className="w-4 h-4" /> Add Category
                </button>
              </form>

              {/* Category Chips Grid with Delete Action */}
              <div className="flex flex-wrap gap-2.5">
                {categoriesList.map((cat, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 bg-slate-950 border border-slate-700/80 hover:border-slate-600 px-3.5 py-2 rounded-xl text-xs text-slate-200 transition-all group"
                  >
                    <span className="font-semibold">{cat}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveCategory(cat)}
                      title={`Remove category "${cat}"`}
                      className="p-1 rounded-md text-slate-500 hover:text-rose-400 hover:bg-rose-500/20 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Section 2: Shelf Display Types for Hosts */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-800">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <Layers className="w-5 h-5 text-amber-400" />
                    Shelf Display Types ({shelfTypesList.length})
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Configure the architectural placement types hosts can select when listing their store shelves (e.g. Eye-Level, Counter Display, Refrigerated Cooler).
                  </p>
                </div>
              </div>

              {/* Add New Shelf Type Form */}
              <form onSubmit={handleAddShelfType} className="bg-slate-950 p-4 rounded-xl border border-slate-800 mb-6 space-y-3">
                <div className="text-xs font-bold text-amber-400 uppercase tracking-wider">Add New Shelf Type</div>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                  <div className="sm:col-span-2">
                    <label className="text-[11px] text-slate-400 block mb-1">Display Type Name</label>
                    <input
                      type="text"
                      required
                      value={newTypeName}
                      onChange={(e) => setNewTypeName(e.target.value)}
                      placeholder="e.g. Cashier Counter Box, Premium Island Stand"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Icon / Emoji</label>
                    <input
                      type="text"
                      value={newTypeIcon}
                      onChange={(e) => setNewTypeIcon(e.target.value)}
                      placeholder="🛒, 👁️, ✨, ❄️, 📦"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white"
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      type="submit"
                      className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer"
                    >
                      <Plus className="w-4 h-4" /> Add Shelf Type
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Description / Shopper Visibility Benefit</label>
                  <input
                    type="text"
                    value={newTypeDesc}
                    onChange={(e) => setNewTypeDesc(e.target.value)}
                    placeholder="e.g. Positioned directly at eye-height for maximum brand awareness and product pick-rate."
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white"
                  />
                </div>
              </form>

              {/* Shelf Types Grid Cards with Delete Action */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {shelfTypesList.map((st) => (
                  <div key={st.id} className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col justify-between group hover:border-slate-700 transition-all">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{st.icon || '📦'}</span>
                          <span className="font-bold text-white text-xs">{st.name}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveShelfType(st.id)}
                          title={`Remove shelf type "${st.name}"`}
                          className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-500/20 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed mb-3">{st.description}</p>
                    </div>
                    <div className="pt-2 border-t border-slate-900 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                      <span>ID: {st.id}</span>
                      <span className="text-emerald-400 font-semibold">Ready for Hosts</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

        {activeTab === 'ANALYTICS' && (
          <AdminAnalyticsPanel stats={stats} users={users} shops={shops} shelves={shelves} bookings={bookings} settings={settings} />
        )}
        {activeTab === 'CLIENTS' && <AdminBusinessesPanel users={users} />}
        {activeTab === 'USERS' && (
          <AdminUsersPanel users={users} shops={shops} onUpdateUserStatus={onUpdateUserStatus} />
        )}
        {activeTab === 'VENDORS' && <AdminVendorsPanel users={users} />}

        {/* TAB 3: SHOPS & SHELVES */}
        {activeTab === 'MARKETPLACE' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <h2 className="text-base font-bold text-white mb-3">Products ({adminProducts.length})</h2>
              {adminProducts.length === 0 ? (
                <div className="text-xs text-slate-500">No products yet.</div>
              ) : (
                <div className="overflow-x-auto max-h-64">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="text-slate-400 uppercase text-[10px]">
                      <tr>
                        <th className="p-2">Product</th>
                        <th className="p-2">Vendor</th>
                        <th className="p-2">Status</th>
                        <th className="p-2">Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      {adminProducts.map((p) => (
                        <tr key={p.id} className="border-t border-slate-800">
                          <td className="p-2 text-white font-semibold">{p.name}</td>
                          <td className="p-2">{p.vendorName || p.vendorId}</td>
                          <td className="p-2">{p.status}</td>
                          <td className="p-2 font-mono">TZS {Number(p.priceTzs || 0).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <h2 className="text-base font-bold text-white">Shelf moderation ({shelves.length})</h2>
                <select
                  value={shelfListingFilter}
                  onChange={(e) => setShelfListingFilter(e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white max-w-xs"
                >
                  <option value="">All listing statuses</option>
                  <option value="DRAFT">Draft</option>
                  <option value="SUBMITTED">Submitted</option>
                  <option value="UNDER_REVIEW">Under review</option>
                  <option value="PUBLISHED">Published</option>
                  <option value="REJECTED">Rejected</option>
                  <option value="SUSPENDED">Suspended</option>
                </select>
              </div>
              <div className="overflow-x-auto max-h-80 overflow-y-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] sticky top-0">
                    <tr>
                      <th className="p-2">Shelf</th>
                      <th className="p-2">In-store label</th>
                      <th className="p-2">Shop / host</th>
                      <th className="p-2">Status</th>
                      <th className="p-2">Preview</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {shelves
                      .filter((sh) => !shelfListingFilter || (sh.listingStatus || sh.verificationStatus || 'DRAFT') === shelfListingFilter)
                      .map((sh) => {
                        const shop = shops.find((s) => s.id === sh.shopId);
                        return (
                          <tr key={sh.id} className="hover:bg-slate-800/30">
                            <td className="p-2">
                              <div className="font-bold text-white">{sh.name}</div>
                              <div className="text-[10px] text-slate-500">{sh.shelfType} · TZS {sh.monthlyPriceTzs.toLocaleString()}/mo</div>
                            </td>
                            <td className="p-2 text-slate-400 max-w-[140px]">
                              {sh.locationInsideShop?.trim() ? sh.locationInsideShop : '—'}
                            </td>
                            <td className="p-2">
                              <div>{sh.shopName || shop?.name}</div>
                              <div className="text-[10px] text-slate-500">{shop?.hostName} · {sh.shopCity}</div>
                            </td>
                            <td className="p-2">
                              <span className="px-2 py-0.5 rounded bg-slate-800 text-amber-400 font-bold text-[10px]">
                                {sh.listingStatus || sh.verificationStatus || 'DRAFT'}
                              </span>
                            </td>
                            <td className="p-2">
                              {sh.slug || sh.id ? (
                                <a
                                  href={`/s/${sh.slug || sh.id}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-emerald-400 hover:underline"
                                >
                                  View listing
                                </a>
                              ) : (
                                '—'
                              )}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <h2 className="text-base font-bold text-white mb-4">Platform Retail Shops ({shops.length})</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {shops.map((sp) => (
                  <div key={sp.id} className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex gap-4">
                    <img src={sp.photos[0]} alt={sp.name} className="w-20 h-20 rounded-lg object-cover border border-slate-700" />
                    <div>
                      <div className="text-xs font-bold text-white">{sp.name}</div>
                      <div className="text-[11px] text-emerald-400">{sp.city} • {sp.address}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        Map:{' '}
                        {Number.isFinite(sp.latitude) && Number.isFinite(sp.longitude)
                          ? `${sp.latitude.toFixed(4)}, ${sp.longitude.toFixed(4)}`
                          : 'No map pin'}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1">Host: {sp.hostName}</div>
                      <div className="mt-2 flex items-center gap-2">
                        <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${sp.verificationStatus === 'VERIFIED' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                          {sp.verificationStatus}
                        </span>
                        <span className="text-[10px] bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded font-bold">Traffic: {sp.footTrafficScore}/10</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'BOOKINGS' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <h2 className="text-base font-bold text-white mb-4">Bookings & Financials ({bookings.length})</h2>
            {bookings.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400">No bookings recorded yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider font-bold">
                    <tr>
                      <th className="p-3">Shelf</th>
                      <th className="p-3">Vendor</th>
                      <th className="p-3">Dates</th>
                      <th className="p-3">Amount</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {bookings.map((b) => (
                      <tr key={b.id} className="hover:bg-slate-800/40">
                        <td className="p-3">
                          <div className="font-bold text-white">{b.shelfName}</div>
                          <div className="text-[10px] text-slate-400">{b.shopName} • {b.shopCity}</div>
                        </td>
                        <td className="p-3">{b.vendorName}</td>
                        <td className="p-3 font-mono">{b.startDate} → {b.endDate}</td>
                        <td className="p-3 font-mono text-emerald-400">TZS {b.totalPriceTzs.toLocaleString()}</td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-amber-400">{b.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'FIELD' && (
          <div className="space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <h2 className="text-base font-bold text-white mb-3">Field visits ({fieldVisits.length})</h2>
              {fieldVisits.length === 0 ? (
                <div className="text-xs text-slate-500">No inspection visits.</div>
              ) : (
                <div className="space-y-2">
                  {fieldVisits.map((v) => (
                    <div key={v.id} className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs flex justify-between gap-3">
                      <div>
                        <div className="font-bold text-white">{v.shopName} · {v.shelfName}</div>
                        <div className="text-slate-400">{v.shopCity} · agent {v.agentName || v.agentId}</div>
                      </div>
                      <span className="text-amber-400 font-bold">{v.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
              <h2 className="text-base font-bold text-white mb-3">Inspection reports ({fieldReports.length})</h2>
              {fieldReports.length === 0 ? (
                <div className="text-xs text-slate-500">No reports submitted.</div>
              ) : (
                <div className="space-y-2">
                  {fieldReports.map((r) => (
                    <div key={r.id} className="bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs">
                      <div className="font-bold text-white">{r.stockLevelPercent}% stock · {r.shelfCondition}</div>
                      <div className="text-slate-400 mt-1">{r.notes}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'SUPPORT' && (
          <div className="space-y-8">
            <div className="space-y-3">
              <h2 className="text-lg font-bold text-white">Verification queue</h2>
              <p className="text-xs text-slate-400">Approve shops and shelves before they appear in the public marketplace.</p>
              {verifications.length === 0 ? (
                <div className="text-xs text-slate-500">No verification requests.</div>
              ) : (
                verifications.map((v) => (
                  <div key={v.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-xs flex items-center justify-between">
                    <div>
                      <div className="font-bold text-white">{v.subjectType} · {v.subjectId}</div>
                      <div className="text-slate-400">{v.status} · {new Date(v.createdAt).toLocaleString()}</div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={async () => { await api.decideVerification(v.id, 'VERIFIED'); const res = await api.getVerifications(); if (res.data) setVerifications(res.data); }} className="px-2 py-1 bg-emerald-500 text-slate-950 font-bold rounded">Verify</button>
                      <button onClick={async () => { await api.decideVerification(v.id, 'REJECTED'); const res = await api.getVerifications(); if (res.data) setVerifications(res.data); }} className="px-2 py-1 bg-rose-500/20 text-rose-400 font-bold rounded">Reject</button>
                      <button onClick={async () => { await api.decideVerification(v.id, 'SUSPENDED'); const res = await api.getVerifications(); if (res.data) setVerifications(res.data); }} className="px-2 py-1 bg-amber-500/20 text-amber-400 font-bold rounded">Suspend</button>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="space-y-3">
            <h2 className="text-lg font-bold text-white">Open disputes</h2>
            <p className="text-xs text-slate-400">Resolving to COMPLETED releases host earnings. CANCELLED does not invent a refund — use cancel if money must move.</p>
            {disputes.length === 0 ? (
              <div className="text-xs text-slate-500">No disputes.</div>
            ) : (
              disputes.map((d) => (
                <div key={d.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 text-xs flex items-center justify-between gap-3">
                  <div>
                    <div className="font-bold text-white">{d.status} · {d.bookingId}</div>
                    <div className="text-slate-400">{d.raisedByName} vs {d.againstName}</div>
                    <div className="text-slate-300 mt-1">{d.reason}</div>
                  </div>
                  {['OPEN', 'UNDER_REVIEW'].includes(d.status) && (
                    <div className="flex gap-2 shrink-0">
                      <button onClick={async () => { await api.resolveDispute(d.id, 'COMPLETED', 'Admin completed after review'); const res = await api.getDisputes(); if (res.data) setDisputes(res.data); }} className="px-2 py-1 bg-emerald-500 text-slate-950 font-bold rounded">Complete</button>
                      <button onClick={async () => { await api.resolveDispute(d.id, 'ACTIVE', 'Returned to active'); const res = await api.getDisputes(); if (res.data) setDisputes(res.data); }} className="px-2 py-1 bg-slate-700 text-white font-bold rounded">Reactivate</button>
                      <button onClick={async () => { await api.resolveDispute(d.id, 'CANCELLED', 'Cancelled after dispute'); const res = await api.getDisputes(); if (res.data) setDisputes(res.data); }} className="px-2 py-1 bg-rose-500/20 text-rose-400 font-bold rounded">Cancel</button>
                    </div>
                  )}
                </div>
              ))
            )}
            </div>
          </div>
        )}

        {activeTab === 'SETTINGS' && (
          <AdminPlatformSettings
            settings={settings}
            onUpdateSettings={onUpdateSettings}
            onSaved={showNotification}
          />
        )}

        {/* TAB 6: AUDIT LOGS */}
        {activeTab === 'AUDIT' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
            <h2 className="text-base font-bold text-white mb-4">Security & Operational Audit Log Trail</h2>
            <div className="space-y-2">
              {auditLogs.map((log) => (
                <div key={log.id} className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs flex items-center justify-between">
                  <div>
                    <span className="font-mono text-emerald-400 font-bold mr-2">[{log.action}]</span>
                    <span className="text-white font-semibold">{log.userName}</span>
                    <span className="text-slate-400 ml-2">{log.details}</span>
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </main>
    </div>
  );
};
