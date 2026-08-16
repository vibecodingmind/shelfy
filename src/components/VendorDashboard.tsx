/**
 * Shelfy 🇹🇿 — Vendor Workspace & Retail Expansion Dashboard
 */

import React, { useState } from 'react';
import {
  ShoppingBag,
  Store,
  MapPin,
  Calendar,
  DollarSign,
  Package,
  AlertTriangle,
  Sparkles,
  Search,
  Plus,
  MessageSquare,
  CreditCard,
  CheckCircle2,
  TrendingUp,
  X,
  Layers,
  ChevronRight,
} from 'lucide-react';
import { User, Booking, Product, ShelfInventory, Shelf, Message, VendorProfile } from '../types/index.js';
import { api } from '../lib/api.js';
import { PesapalPaymentModal } from './PesapalPaymentModal.js';
import { AirbnbShelfCard } from './AirbnbShelfCard.js';

interface VendorDashboardProps {
  user: User;
  vendorProfile?: VendorProfile | null;
  bookings: Booking[];
  products: Product[];
  inventory: ShelfInventory[];
  shelves: Shelf[];
  messages: Message[];
  onBookShelf: (shelf: Shelf) => void;
  onRefreshData: () => void;
}

export const VendorDashboard: React.FC<VendorDashboardProps> = ({
  user,
  vendorProfile,
  bookings,
  products,
  inventory,
  shelves,
  messages,
  onBookShelf,
  onRefreshData,
}) => {
  const [activeTab, setActiveTab] = useState<
    'OVERVIEW' | 'FIND_SHELVES' | 'BOOKINGS' | 'PRODUCTS' | 'INVENTORY' | 'AI_INSIGHTS' | 'MESSAGES'
  >('OVERVIEW');

  // AI ShelfMatch modal
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [matchCategory, setMatchCategory] = useState('Food & Beverages');
  const [matchBudget, setMatchBudget] = useState(100000);
  const [matchCity, setMatchCity] = useState('Dar es Salaam');
  const [matchResults, setMatchResults] = useState<any[]>([]);
  const [loadingMatch, setLoadingMatch] = useState(false);

  // AI Vendor Insights
  const [aiInsights, setAiInsights] = useState<any>(null);
  const [loadingInsights, setLoadingInsights] = useState(false);

  // New Product Modal
  const [showProductModal, setShowProductModal] = useState(false);
  const [prodName, setProdName] = useState('');
  const [prodCategory, setProdCategory] = useState('Food & Beverages');
  const [prodPrice, setProdPrice] = useState(5000);
  const [prodSku, setProdSku] = useState('');
  const [prodStock, setProdStock] = useState(100);

  // PesaPal Checkout
  const [checkoutBooking, setCheckoutBooking] = useState<Booking | null>(null);
  const [loadingCheckout, setLoadingCheckout] = useState(false);

  // Run AI ShelfMatch
  const handleRunMatch = async () => {
    setLoadingMatch(true);
    const res = await api.shelfMatch({
      category: matchCategory,
      budgetMonthlyTzs: matchBudget,
      city: matchCity,
    });
    if (res.success && res.data) {
      setMatchResults(res.data);
    }
    setLoadingMatch(false);
  };

  // Fetch Vendor Insights
  const handleFetchInsights = async () => {
    setLoadingInsights(true);
    const res = await api.getVendorInsights();
    if (res.success && res.data) {
      setAiInsights(res.data);
    }
    setLoadingInsights(false);
  };

  // Add Product
  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await api.createProduct({
      name: prodName,
      category: prodCategory,
      priceTzs: prodPrice,
      sku: prodSku || `SKU-${Date.now().toString().slice(-6)}`,
      stockQuantity: prodStock,
    });
    if (res.success) {
      setShowProductModal(false);
      setProdName('');
      onRefreshData();
    }
  };

  // Process PesaPal Checkout
  const handlePesaPalCheckout = async () => {
    if (!checkoutBooking) return;
    setLoadingCheckout(true);
    const res = await api.checkoutPayment({ bookingId: checkoutBooking.id });
    if (res.success) {
      setCheckoutBooking(null);
      onRefreshData();
    }
    setLoadingCheckout(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col md:flex-row">
      
      {/* Left Vendor Navigation Sidebar */}
      <aside className="w-full md:w-64 bg-slate-900 border-r border-slate-800 p-4 flex flex-col justify-between shrink-0">
        <div>
          <div className="px-3 py-3 border-b border-slate-800 mb-4">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-amber-400" />
              <span className="font-extrabold text-sm tracking-wider text-white">VENDOR PORTAL</span>
            </div>
            <div className="text-[11px] text-emerald-400 font-semibold mt-1 truncate">
              {vendorProfile?.businessName || user.name}
            </div>
          </div>

          <nav className="space-y-1">
            {[
              { id: 'OVERVIEW', label: 'Dashboard Overview', icon: TrendingUp },
              { id: 'FIND_SHELVES', label: 'Find Shelves Marketplace', icon: Search },
              { id: 'BOOKINGS', label: 'My Shelf Bookings', icon: Calendar },
              { id: 'PRODUCTS', label: 'My Products Catalogue', icon: Package },
              { id: 'INVENTORY', label: 'Shelf Stock Inventory', icon: Layers },
              { id: 'AI_INSIGHTS', label: 'AI Market Insights', icon: Sparkles },
              { id: 'MESSAGES', label: 'Host Messages', icon: MessageSquare },
            ].map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id as any);
                    if (item.id === 'AI_INSIGHTS' && !aiInsights) handleFetchInsights();
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
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

        {/* AI ShelfMatch Trigger */}
        <div className="mt-6 p-4 bg-gradient-to-br from-amber-500/10 to-emerald-500/10 border border-amber-500/30 rounded-2xl">
          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400 mb-1">
            <Sparkles className="w-4 h-4" /> AI ShelfMatch
          </div>
          <p className="text-[11px] text-slate-300 mb-3">Find top performing shelves for your brand based on budget & foot traffic.</p>
          <button
            onClick={() => setShowMatchModal(true)}
            className="w-full py-2 bg-gradient-to-r from-amber-500 to-emerald-500 text-slate-950 font-extrabold text-xs rounded-xl shadow-lg"
          >
            Run AI Matcher
          </button>
        </div>
      </aside>

      {/* Main Vendor Content */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
        
        {/* Welcome Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-4 border-b border-slate-800">
          <div>
            <h1 className="text-2xl font-black text-white">Welcome back, {user.name}</h1>
            <p className="text-xs text-slate-400 mt-1">Manage your retail display distribution, shelf bookings, and stock performance in Tanzania.</p>
          </div>
          <button
            onClick={() => setActiveTab('FIND_SHELVES')}
            className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs rounded-xl flex items-center gap-2 shadow-lg shadow-emerald-500/20 self-start sm:self-auto"
          >
            <Search className="w-4 h-4" /> Book New Shelf
          </button>
        </div>

        {/* TAB 1: OVERVIEW */}
        {activeTab === 'OVERVIEW' && (
          <div className="space-y-8">
            
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
                <div className="text-slate-400 text-xs font-semibold mb-1">Active Shelf Bookings</div>
                <div className="text-2xl font-black text-amber-400">{bookings.filter((b) => b.status === 'ACTIVE').length}</div>
                <div className="text-[11px] text-slate-400 mt-1">Across Dar es Salaam & Mwanza</div>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
                <div className="text-slate-400 text-xs font-semibold mb-1">Listed Products</div>
                <div className="text-2xl font-black text-white">{products.length}</div>
                <div className="text-[11px] text-emerald-400 mt-1">Active SKUs</div>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
                <div className="text-slate-400 text-xs font-semibold mb-1">Total Monthly Retail Rent</div>
                <div className="text-2xl font-black text-emerald-400">
                  TZS {bookings.reduce((sum, b) => sum + b.monthlyPriceTzs, 0).toLocaleString()}
                </div>
                <div className="text-[11px] text-emerald-400 mt-1">Paid via PesaPal</div>
              </div>

              <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl">
                <div className="text-slate-400 text-xs font-semibold mb-1">Low-Stock Alerts</div>
                <div className="text-2xl font-black text-rose-400">
                  {inventory.filter((i) => i.stockStatus === 'LOW_STOCK').length}
                </div>
                <div className="text-[11px] text-rose-400 mt-1">Restock recommended</div>
              </div>
            </div>

            {/* Active Bookings & Inventory Alerts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              
              {/* Active Bookings List */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-amber-400" /> Active Shelf Locations
                </h3>
                {bookings.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 text-xs">No active bookings. Book a shelf space to get started!</div>
                ) : (
                  <div className="space-y-3">
                    {bookings.map((b) => (
                      <div key={b.id} className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                        <div>
                          <div className="font-bold text-white">{b.shelfName}</div>
                          <div className="text-[10px] text-emerald-400">{b.shopName} • {b.shopCity}</div>
                          <div className="text-[10px] text-slate-400 mt-0.5">Rent: TZS {b.monthlyPriceTzs.toLocaleString()}/mo</div>
                        </div>
                        <div>
                          {b.paymentStatus === 'PENDING' ? (
                            <button
                              onClick={() => setCheckoutBooking(b)}
                              className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-[11px] rounded-lg shadow"
                            >
                              Pay TZS {b.totalPriceTzs.toLocaleString()}
                            </button>
                          ) : (
                            <span className="px-2.5 py-1 bg-emerald-500/20 text-emerald-400 font-bold rounded text-[10px] flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" /> Paid & Active
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Low Stock Alerts */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
                <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400" /> Shelf Inventory Status
                </h3>
                <div className="space-y-3">
                  {inventory.map((inv) => (
                    <div key={inv.id} className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-bold text-white">{inv.productName}</div>
                        <div className="text-[10px] text-slate-400">SKU: {inv.productSku}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono font-bold text-amber-400 text-sm">{inv.quantity} units</div>
                        <span className={`text-[10px] font-bold ${inv.stockStatus === 'LOW_STOCK' ? 'text-rose-400' : 'text-emerald-400'}`}>
                          {inv.stockStatus.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

            </div>

          </div>
        )}

        {/* TAB 2: FIND SHELVES */}
        {activeTab === 'FIND_SHELVES' && (
          <div>
            <div className="mb-6">
              <h2 className="text-lg font-bold text-white">Find Retail Shelves across Tanzania</h2>
              <p className="text-xs text-slate-400">Select an available retail shelf and expand your brand placement instantly.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {shelves.map((shelf) => (
                <AirbnbShelfCard
                  key={shelf.id}
                  shelf={shelf}
                  onSelectShelf={(s) => onBookShelf(s)}
                  onBookDirect={(s) => onBookShelf(s)}
                />
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: PRODUCTS */}
        {activeTab === 'PRODUCTS' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">My Product Catalogue</h2>
                <p className="text-xs text-slate-400">Add SKUs and products to place in booked retail shelves.</p>
              </div>
              <button
                onClick={() => setShowProductModal(true)}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs rounded-xl flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" /> Add Product
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {products.map((p) => (
                <div key={p.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                  <img src={p.images[0]} alt={p.name} className="w-full h-36 object-cover rounded-xl mb-3" />
                  <div className="text-[10px] text-amber-400 font-mono font-bold">{p.sku}</div>
                  <h3 className="font-bold text-white text-sm">{p.name}</h3>
                  <div className="text-xs font-mono font-bold text-emerald-400 my-1">TZS {p.priceTzs.toLocaleString()}</div>
                  <div className="text-[11px] text-slate-400">Stock: {p.stockQuantity} units</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 6: AI INSIGHTS */}
        {activeTab === 'AI_INSIGHTS' && (
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                <h2 className="text-lg font-bold text-white">Gemini AI Vendor Expansion Insights</h2>
              </div>
              <button
                onClick={handleFetchInsights}
                disabled={loadingInsights}
                className="px-3 py-1.5 bg-amber-500/20 text-amber-400 rounded-lg text-xs font-bold border border-amber-500/30"
              >
                {loadingInsights ? 'Analyzing...' : 'Refresh AI Analysis'}
              </button>
            </div>

            {aiInsights ? (
              <div className="space-y-6">
                <div>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Recommended Restock Actions</h3>
                  <div className="space-y-2">
                    {aiInsights.restockAlerts?.map((a: any, i: number) => (
                      <div key={i} className="bg-slate-950 p-3 rounded-xl border border-rose-500/30 text-xs flex items-center justify-between">
                        <div>
                          <div className="font-bold text-white">{a.productName}</div>
                          <div className="text-[11px] text-slate-300 mt-0.5">{a.suggestedAction}</div>
                        </div>
                        <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 font-bold text-[10px]">{a.urgency}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Strategic Expansion Recommendations</h3>
                  <ul className="space-y-2">
                    {aiInsights.expansionAdvice?.map((advice: string, i: number) => (
                      <li key={i} className="bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs text-slate-200 flex items-start gap-2">
                        <span className="text-amber-400 font-bold">•</span>
                        {advice}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-slate-400 text-xs">
                Click Refresh to generate AI recommendations using your current product performance data.
              </div>
            )}
          </div>
        )}

      </main>

      {/* AI SHELFMATCH MODAL */}
      {showMatchModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full p-6 relative shadow-2xl">
            <button onClick={() => setShowMatchModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              <h2 className="text-lg font-bold text-white">AI ShelfMatch Engine</h2>
            </div>
            <p className="text-xs text-slate-400 mb-6">Gemini AI analyzes brand target category, city, and budget to recommend prime retail placement.</p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">Target Category</label>
                <select
                  value={matchCategory}
                  onChange={(e) => setMatchCategory(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-white"
                >
                  <option value="Food & Beverages">Food & Beverages</option>
                  <option value="Cosmetics">Cosmetics & Beauty</option>
                  <option value="Spices">Spices & Teas</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">Monthly Budget (TZS)</label>
                <input
                  type="number"
                  value={matchBudget}
                  onChange={(e) => setMatchBudget(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-400 block mb-1">Target City</label>
                <select
                  value={matchCity}
                  onChange={(e) => setMatchCity(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-white"
                >
                  <option value="Dar es Salaam">Dar es Salaam</option>
                  <option value="Mwanza">Mwanza</option>
                  <option value="Arusha">Arusha</option>
                  <option value="Zanzibar">Zanzibar</option>
                </select>
              </div>
            </div>

            <button
              onClick={handleRunMatch}
              disabled={loadingMatch}
              className="w-full py-3 bg-gradient-to-r from-amber-500 to-emerald-500 text-slate-950 font-black text-xs rounded-xl shadow-lg mb-6"
            >
              {loadingMatch ? 'Analyzing Available Shelves...' : 'Run Gemini AI Match Analysis'}
            </button>

            {/* Results */}
            {matchResults.length > 0 && (
              <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                {matchResults.map((m, idx) => {
                  const targetShelf = shelves.find((s) => s.id === m.shelfId);
                  if (!targetShelf) return null;
                  return (
                    <div key={idx} className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs">
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-bold text-white text-sm">{targetShelf.name}</div>
                        <span className="px-2.5 py-1 bg-amber-500 text-slate-950 font-extrabold rounded-lg text-xs">
                          {m.matchPercentage}% MATCH
                        </span>
                      </div>
                      <div className="text-[11px] text-emerald-400 mb-2">{targetShelf.shopName} • {targetShelf.shopCity}</div>
                      <ul className="space-y-1 mb-3">
                        {m.reasons?.map((r: string, ri: number) => (
                          <li key={ri} className="text-slate-300 text-[11px] flex items-center gap-1.5">
                            <span className="text-emerald-400 font-bold">✓</span> {r}
                          </li>
                        ))}
                      </ul>
                      <button
                        onClick={() => {
                          setShowMatchModal(false);
                          onBookShelf(targetShelf);
                        }}
                        className="px-3 py-1.5 bg-emerald-500 text-slate-950 font-bold text-xs rounded-lg"
                      >
                        Book This Matched Shelf
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* NEW PRODUCT MODAL */}
      {showProductModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 relative">
            <button onClick={() => setShowProductModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-lg font-bold text-white mb-4">Add Product SKU</h2>

            <form onSubmit={handleAddProduct} className="space-y-4 text-xs">
              <div>
                <label className="text-slate-400 block mb-1 font-semibold">Product Name</label>
                <input
                  type="text"
                  required
                  value={prodName}
                  onChange={(e) => setProdName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white"
                  placeholder="e.g. Serengeti Passion Juice (500ml)"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1 font-semibold">Price in TZS</label>
                <input
                  type="number"
                  required
                  value={prodPrice}
                  onChange={(e) => setProdPrice(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white"
                />
              </div>

              <div>
                <label className="text-slate-400 block mb-1 font-semibold">Initial Stock Quantity</label>
                <input
                  type="number"
                  value={prodStock}
                  onChange={(e) => setProdStock(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white"
                />
              </div>

              <button type="submit" className="w-full py-3 bg-emerald-500 text-slate-950 font-bold text-xs rounded-xl">
                Create SKU
              </button>
            </form>
          </div>
        </div>
      )}

      {/* PESAPAL SECURE PAYMENT MODAL */}
      {checkoutBooking && (
        <PesapalPaymentModal
          isOpen={!!checkoutBooking}
          booking={checkoutBooking}
          shelf={shelves.find((s) => s.id === checkoutBooking.shelfId)}
          onClose={() => setCheckoutBooking(null)}
          onPaymentSuccess={() => {
            setCheckoutBooking(null);
            onRefreshData();
          }}
        />
      )}

    </div>
  );
};
