import React, { useMemo, useState } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Shop } from '../types/index.js';
import { api } from '../lib/api.js';
import { CITY_COORDINATES, coordinatesForCity } from '../server/domain/listings.js';

const STEPS = ['Shop', 'Location', 'Photo', 'Shelf', 'Pricing', 'Review'] as const;

interface ListingWizardProps {
  shops: Shop[];
  shelfCategories: string[];
  shelfTypes: { id: string; name: string }[];
  onClose: () => void;
  onComplete: () => void;
}

export function ListingWizard({ shops, shelfCategories, shelfTypes, onClose, onComplete }: ListingWizardProps) {
  const [step, setStep] = useState(shops.length ? 3 : 0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [mode, setMode] = useState<'NEW' | 'EXISTING'>(shops.length ? 'EXISTING' : 'NEW');
  const [existingShopId, setExistingShopId] = useState(shops[0]?.id || '');

  const [shopName, setShopName] = useState('');
  const [shopType, setShopType] = useState('SUPERMARKET');
  const [description, setDescription] = useState('');
  const [city, setCity] = useState('Dar es Salaam');
  const [address, setAddress] = useState('');
  const [latitude, setLatitude] = useState(CITY_COORDINATES['Dar es Salaam'].latitude);
  const [longitude, setLongitude] = useState(CITY_COORDINATES['Dar es Salaam'].longitude);
  const [shopPhoto, setShopPhoto] = useState('');

  const [shelfName, setShelfName] = useState('');
  const [shelfType, setShelfType] = useState(shelfTypes[0]?.id || 'EYE_LEVEL');
  const [locationInsideShop, setLocationInsideShop] = useState('Main aisle');
  const [widthCm, setWidthCm] = useState(120);
  const [heightCm, setHeightCm] = useState(40);
  const [depthCm, setDepthCm] = useState(40);
  const [monthlyPrice, setMonthlyPrice] = useState(70000);
  const [categories, setCategories] = useState<string[]>(shelfCategories.slice(0, 2));
  const [shelfPhoto, setShelfPhoto] = useState('');

  const cities = Object.keys(CITY_COORDINATES);
  const visibleSteps = useMemo(() => (mode === 'EXISTING' ? [3, 4, 5] : [0, 1, 2, 3, 4, 5]), [mode]);
  const stepIndex = visibleSteps.indexOf(step);
  const currentLabel = STEPS[step];

  const applyCity = (nextCity: string) => {
    setCity(nextCity);
    const coords = coordinatesForCity(nextCity);
    setLatitude(coords.latitude);
    setLongitude(coords.longitude);
  };

  const readPhoto = (file: File, setter: (url: string) => void) => {
    const reader = new FileReader();
    reader.onload = () => setter(String(reader.result || ''));
    reader.readAsDataURL(file);
  };

  const canAdvance = () => {
    if (step === 0) return shopName.trim().length >= 3 && description.trim().length >= 10;
    if (step === 1) return address.trim().length >= 5 && Number.isFinite(latitude) && Number.isFinite(longitude);
    if (step === 2) return Boolean(shopPhoto);
    if (step === 3) return shelfName.trim().length >= 3 && widthCm > 0 && heightCm > 0 && depthCm > 0;
    if (step === 4) return monthlyPrice > 0 && categories.length > 0 && Boolean(shelfPhoto);
    return true;
  };

  const next = () => {
    setError('');
    if (!canAdvance()) {
      setError('Complete this step before continuing.');
      return;
    }
    const nextStep = visibleSteps[stepIndex + 1];
    if (nextStep !== undefined) setStep(nextStep);
  };

  const back = () => {
    const prev = visibleSteps[stepIndex - 1];
    if (prev !== undefined) setStep(prev);
  };

  const submit = async () => {
    setBusy(true);
    setError('');
    try {
      let shopId = existingShopId;
      if (mode === 'NEW') {
        const shopPhotoRes = await api.uploadImage(shopPhoto, 'shop');
        const shopRes = await api.createShop({
          name: shopName,
          description,
          address,
          city,
          region: city,
          latitude,
          longitude,
          shopType,
          photos: shopPhotoRes.data?.url ? [shopPhotoRes.data.url] : [],
        });
        if (!shopRes.success || !shopRes.data) throw new Error(shopRes.error?.message || 'Could not create shop.');
        shopId = shopRes.data.id;
        const submitted = await api.submitListing('shop', shopId);
        if (!submitted.success) throw new Error(submitted.error?.message || 'Shop created but not submitted.');
      }
      const shelfPhotoRes = await api.uploadImage(shelfPhoto, 'shelf');
      const shelfRes = await api.createShelf({
        shopId,
        name: shelfName,
        description: `${shelfName} at ${locationInsideShop}`,
        shelfType,
        locationInsideShop,
        widthCm,
        heightCm,
        depthCm,
        monthlyPriceTzs: monthlyPrice,
        allowedCategories: categories,
        photos: shelfPhotoRes.data?.url ? [shelfPhotoRes.data.url] : [],
      });
      if (!shelfRes.success || !shelfRes.data) throw new Error(shelfRes.error?.message || 'Could not create shelf.');
      const submittedShelf = await api.submitListing('shelf', shelfRes.data.id);
      if (!submittedShelf.success) throw new Error(submittedShelf.error?.message || 'Shelf created but not submitted.');
      onComplete();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Listing failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 relative max-h-[90vh] overflow-y-auto">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-white">
          <X className="w-5 h-5" />
        </button>
        <h2 className="text-lg font-bold text-white mb-1">List shop & shelf</h2>
        <p className="text-[11px] text-slate-400 mb-4">
          Step {stepIndex + 1} of {visibleSteps.length}: {currentLabel}. Submitted listings stay hidden until admin verification.
        </p>
        <div className="flex gap-1 mb-5">
          {visibleSteps.map((id) => (
            <div key={id} className={`h-1 flex-1 rounded ${id <= step ? 'bg-emerald-500' : 'bg-slate-800'}`} />
          ))}
        </div>

        {step === 0 && (
          <div className="space-y-3 text-xs">
            {shops.length > 0 && (
              <div className="flex gap-2">
                <button type="button" onClick={() => { setMode('EXISTING'); setStep(3); }} className={`px-2 py-1 rounded ${mode === 'EXISTING' ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-300'}`}>Use existing shop</button>
                <button type="button" onClick={() => setMode('NEW')} className={`px-2 py-1 rounded ${mode === 'NEW' ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-300'}`}>New shop</button>
              </div>
            )}
            <label className="block text-slate-400">Shop name
              <input value={shopName} onChange={(e) => setShopName(e.target.value)} className="mt-1 w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white" />
            </label>
            <label className="block text-slate-400">Shop type
              <select value={shopType} onChange={(e) => setShopType(e.target.value)} className="mt-1 w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white">
                <option value="SUPERMARKET">Supermarket</option>
                <option value="MINI_MARKET">Mini market</option>
                <option value="CONVENIENCE">Convenience</option>
                <option value="BOUTIQUE">Boutique</option>
                <option value="PHARMACY">Pharmacy</option>
                <option value="SPECIALTY">Specialty</option>
              </select>
            </label>
            <label className="block text-slate-400">Description
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="mt-1 w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white" rows={3} />
            </label>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-3 text-xs">
            <label className="block text-slate-400">City
              <select value={city} onChange={(e) => applyCity(e.target.value)} className="mt-1 w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white">
                {cities.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            <label className="block text-slate-400">Street address
              <input value={address} onChange={(e) => setAddress(e.target.value)} className="mt-1 w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white" />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="block text-slate-400">Latitude
                <input type="number" step="0.0001" value={latitude} onChange={(e) => setLatitude(Number(e.target.value))} className="mt-1 w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white" />
              </label>
              <label className="block text-slate-400">Longitude
                <input type="number" step="0.0001" value={longitude} onChange={(e) => setLongitude(Number(e.target.value))} className="mt-1 w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white" />
              </label>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3 text-xs">
            <label className="block text-slate-400">Shop photo (JPEG, PNG, or WebP)
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => e.target.files?.[0] && readPhoto(e.target.files[0], setShopPhoto)} className="mt-1 block w-full text-slate-300" />
            </label>
            {shopPhoto && <img src={shopPhoto} alt="Shop preview" className="h-28 w-full object-cover rounded-lg border border-slate-800" />}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3 text-xs">
            {mode === 'EXISTING' && (
              <>
                <button type="button" onClick={() => { setMode('NEW'); setStep(0); }} className="text-[11px] text-emerald-400">
                  List a new shop instead
                </button>
                <label className="block text-slate-400">Shop
                  <select value={existingShopId} onChange={(e) => setExistingShopId(e.target.value)} className="mt-1 w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white">
                    {shops.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.city})</option>)}
                  </select>
                </label>
              </>
            )}
            <label className="block text-slate-400">Shelf name
              <input value={shelfName} onChange={(e) => setShelfName(e.target.value)} className="mt-1 w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white" />
            </label>
            <label className="block text-slate-400">Display type
              <select value={shelfType} onChange={(e) => setShelfType(e.target.value)} className="mt-1 w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white">
                {shelfTypes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </label>
            <label className="block text-slate-400">Location inside shop
              <input value={locationInsideShop} onChange={(e) => setLocationInsideShop(e.target.value)} className="mt-1 w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white" />
            </label>
            <div className="grid grid-cols-3 gap-2">
              <label className="block text-slate-400">W cm<input type="number" value={widthCm} onChange={(e) => setWidthCm(Number(e.target.value))} className="mt-1 w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white" /></label>
              <label className="block text-slate-400">H cm<input type="number" value={heightCm} onChange={(e) => setHeightCm(Number(e.target.value))} className="mt-1 w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white" /></label>
              <label className="block text-slate-400">D cm<input type="number" value={depthCm} onChange={(e) => setDepthCm(Number(e.target.value))} className="mt-1 w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white" /></label>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-3 text-xs">
            <label className="block text-slate-400">Monthly rent (TZS)
              <input type="number" value={monthlyPrice} onChange={(e) => setMonthlyPrice(Number(e.target.value))} className="mt-1 w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-white" />
            </label>
            <div className="grid grid-cols-2 gap-1.5 p-2 bg-slate-950 rounded-lg border border-slate-800 max-h-32 overflow-y-auto">
              {shelfCategories.map((cat) => (
                <label key={cat} className="flex items-center gap-1.5 text-[11px] text-slate-300">
                  <input
                    type="checkbox"
                    checked={categories.includes(cat)}
                    onChange={() => setCategories(categories.includes(cat) ? categories.filter((c) => c !== cat) : [...categories, cat])}
                    className="accent-emerald-500"
                  />
                  {cat}
                </label>
              ))}
            </div>
            <label className="block text-slate-400">Shelf photo
              <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => e.target.files?.[0] && readPhoto(e.target.files[0], setShelfPhoto)} className="mt-1 block w-full text-slate-300" />
            </label>
            {shelfPhoto && <img src={shelfPhoto} alt="Shelf preview" className="h-28 w-full object-cover rounded-lg border border-slate-800" />}
          </div>
        )}

        {step === 5 && (
          <div className="text-xs text-slate-300 space-y-2">
            {mode === 'NEW' && <div><span className="text-slate-500">Shop:</span> {shopName} · {city}</div>}
            {mode === 'EXISTING' && <div><span className="text-slate-500">Shop:</span> {shops.find((s) => s.id === existingShopId)?.name}</div>}
            <div><span className="text-slate-500">Shelf:</span> {shelfName} · TZS {monthlyPrice.toLocaleString()}/mo</div>
            <div><span className="text-slate-500">Categories:</span> {categories.join(', ')}</div>
            <p className="text-amber-400">This will submit the listing for admin verification. It will not appear in the public marketplace until verified.</p>
          </div>
        )}

        {error && <div className="mt-3 text-[11px] text-rose-400">{error}</div>}

        <div className="mt-6 flex justify-between">
          <button type="button" onClick={back} disabled={stepIndex === 0 || busy} className="px-3 py-2 text-xs text-slate-300 disabled:opacity-30 flex items-center gap-1">
            <ChevronLeft className="w-4 h-4" /> Back
          </button>
          {step === 5 ? (
            <button type="button" onClick={submit} disabled={busy} className="px-4 py-2 bg-emerald-500 text-slate-950 font-bold text-xs rounded-xl">
              {busy ? 'Submitting…' : 'Create & submit for verification'}
            </button>
          ) : (
            <button type="button" onClick={next} className="px-4 py-2 bg-blue-500 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1">
              Next <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
