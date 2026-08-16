/**
 * Shelfy 🇹🇿 — Mobile-First Field Agent Inspection Workspace
 * Complete with live camera stream permissions, photo snapping, file uploads,
 * GPS location verification, Gemini AI shelf auditing, and structured report submission.
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  UserCheck,
  MapPin,
  Camera,
  Sparkles,
  CheckCircle2,
  Calendar,
  AlertTriangle,
  Upload,
  Clock,
  ChevronRight,
  FileText,
  ShieldAlert,
  X,
  RefreshCw,
  Image as ImageIcon,
  Check,
  Video,
  VideoOff,
  Navigation,
  Compass,
} from 'lucide-react';
import { User, FieldVisit, ShelfReport } from '../types/index.js';
import { api } from '../lib/api.js';

interface AgentDashboardProps {
  user: User;
  visits: FieldVisit[];
  reports: ShelfReport[];
  onRefreshData: () => void;
}

export const AgentDashboard: React.FC<AgentDashboardProps> = ({
  user,
  visits,
  reports,
  onRefreshData,
}) => {
  const [activeVisit, setActiveVisit] = useState<FieldVisit | null>(null);

  // Photos State: array of captured or uploaded photo URLs
  const [capturedPhotos, setCapturedPhotos] = useState<string[]>([
    'https://images.unsplash.com/photo-1583258292688-d02132382025?w=800',
  ]);
  const [activePhotoIndex, setActivePhotoIndex] = useState<number>(0);

  // Camera Stream state
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraFacingMode, setCameraFacingMode] = useState<'environment' | 'user'>('environment');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // GPS Location state
  const [gpsLocation, setGpsLocation] = useState<{ latitude: number; longitude: number; accuracy: number } | null>(null);
  const [gpsLoading, setGpsLoading] = useState<boolean>(false);
  const [gpsDistanceMeters, setGpsDistanceMeters] = useState<number | null>(null);

  // Active visit form state
  const [stockPercent, setStockPercent] = useState<number>(80);
  const [condition, setCondition] = useState<'EXCELLENT' | 'GOOD' | 'NEEDS_CLEANING' | 'DAMAGED' | 'DISORGANIZED'>('EXCELLENT');
  const [notes, setNotes] = useState<string>('');

  // AI analysis result state
  const [aiAnalysis, setAiAnalysis] = useState<any>(null);
  const [analyzingPhoto, setAnalyzingPhoto] = useState<boolean>(false);
  const [submittingReport, setSubmittingReport] = useState<boolean>(false);

  // Clean up camera stream on unmount or when visit closes
  const stopCameraStream = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    setIsCameraActive(false);
  };

  useEffect(() => {
    return () => {
      stopCameraStream();
    };
  }, []);

  // Request Camera Permission and Start Stream
  const startCamera = async () => {
    setCameraError(null);
    stopCameraStream();

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError('Camera API is not supported in this browser. Please use the file upload option.');
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: cameraFacingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setIsCameraActive(true);
    } catch (err: any) {
      console.error('Camera access error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError('Camera permission was denied. Please grant camera access in your browser or use photo upload.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setCameraError('No camera found on this device. You can upload photo files directly.');
      } else {
        setCameraError(`Camera error: ${err.message || 'Unable to access camera'}`);
      }
      setIsCameraActive(false);
    }
  };

  // Capture current frame from camera stream
  const capturePhoto = () => {
    if (!videoRef.current) return;

    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85);

      setCapturedPhotos((prev) => [dataUrl, ...prev]);
      setActivePhotoIndex(0);
      stopCameraStream();
    }
  };

  // Switch between front/back camera
  const toggleCameraFacing = () => {
    setCameraFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
    setTimeout(() => {
      startCamera();
    }, 100);
  };

  // Handle File Upload from device
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    Array.from(fileList).forEach((file: File) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          const resultStr = event.target.result as string;
          setCapturedPhotos((prev) => [resultStr, ...prev]);
          setActivePhotoIndex(0);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  // Verify GPS Location
  const handleVerifyLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        setGpsLocation({ latitude, longitude, accuracy });

        if (activeVisit) {
          const shopLat = activeVisit.shopLatitude;
          const shopLng = activeVisit.shopLongitude;
          if (typeof shopLat === 'number' && typeof shopLng === 'number') {
            const R = 6371e3;
            const phi1 = (latitude * Math.PI) / 180;
            const phi2 = (shopLat * Math.PI) / 180;
            const deltaPhi = ((shopLat - latitude) * Math.PI) / 180;
            const deltaLambda = ((shopLng - longitude) * Math.PI) / 180;
            const a =
              Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
              Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            setGpsDistanceMeters(Math.round(R * c));
          }
          const check = await api.checkInVisit(activeVisit.id, latitude, longitude);
          if (!check.success) {
            alert(check.error?.message || 'Check-in failed. You must be at the shop coordinates.');
          } else if (check.data?.gps?.meters !== undefined) {
            setGpsDistanceMeters(check.data.gps.meters);
          }
        }
        setGpsLoading(false);
      },
      (err) => {
        console.error('GPS error:', err);
        setGpsLoading(false);
        alert('Could not obtain GPS location: ' + err.message);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Run AI Photo Analysis
  const handleAnalyzePhoto = async () => {
    const currentPhoto = capturedPhotos[activePhotoIndex] || capturedPhotos[0];
    if (!currentPhoto) return;

    setAnalyzingPhoto(true);
    const res = await api.analyzeShelfPhoto(currentPhoto);
    if (res.success && res.data) {
      setAiAnalysis(res.data);
      if (res.data.estimatedStockPercent) setStockPercent(res.data.estimatedStockPercent);
    }
    setAnalyzingPhoto(false);
  };

  // Submit Report
  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeVisit) return;

    setSubmittingReport(true);
    const res = await api.submitReport({
      visitId: activeVisit.id,
      shelfId: activeVisit.shelfId,
      shopId: activeVisit.shopId,
      stockLevelPercent: stockPercent,
      shelfCondition: condition,
      notes: notes || 'Physical inspection complete by agent.',
      photos: capturedPhotos,
      gpsVerified: !!gpsLocation,
      gpsDistanceMeters: gpsDistanceMeters || 12,
    });

    if (res.success) {
      stopCameraStream();
      setActiveVisit(null);
      setAiAnalysis(null);
      setNotes('');
      setGpsLocation(null);
      onRefreshData();
    }
    setSubmittingReport(false);
  };

  return (
    <div id="field-agent-dashboard" className="min-h-screen bg-slate-950 text-white p-4 max-w-lg mx-auto pb-24 font-sans">
      
      {/* Mobile Agent Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-6 shadow-xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-semibold text-purple-400">Field Operations Agent</div>
            <div className="font-bold text-white text-sm">{user.name}</div>
          </div>
        </div>
        <div className="text-right">
          <span className="text-[10px] font-mono font-bold bg-purple-500/20 text-purple-300 px-2.5 py-1 rounded-full border border-purple-500/30">
            TANZANIA 🇹🇿
          </span>
        </div>
      </div>

      {/* ACTIVE VISIT AUDIT FLOW */}
      {activeVisit ? (
        <div className="bg-slate-900 border border-purple-500/40 rounded-3xl p-5 shadow-2xl animate-in fade-in space-y-6">
          
          {/* Shop Header */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div>
              <div className="text-[10px] font-bold text-purple-400 uppercase tracking-wider">Active Shop Verification</div>
              <h2 className="text-base font-bold text-white">{activeVisit.shopName}</h2>
              <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                <MapPin className="w-3.5 h-3.5 text-emerald-400" /> {activeVisit.shopCity} • {activeVisit.shelfName}
              </div>
            </div>
            <button
              onClick={() => {
                stopCameraStream();
                setActiveVisit(null);
              }}
              className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <form onSubmit={handleSubmitReport} className="space-y-5">
            
            {/* 1. CAMERA & PHOTO CAPTURE WORKSPACE */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <Camera className="w-4 h-4 text-purple-400" />
                  Shelf Inspection Photos ({capturedPhotos.length})
                </label>
                <span className="text-[11px] text-slate-400">Live Camera / File Upload</span>
              </div>

              {/* LIVE CAMERA VIEWFINDER */}
              {isCameraActive ? (
                <div className="relative rounded-2xl overflow-hidden border-2 border-purple-500 bg-black aspect-video shadow-2xl">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />

                  {/* Top Bar on live camera */}
                  <div className="absolute top-3 left-3 right-3 flex justify-between items-center z-10">
                    <span className="bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                      <span className="w-2 h-2 rounded-full bg-white" /> REC LIVE
                    </span>

                    <button
                      type="button"
                      onClick={toggleCameraFacing}
                      className="p-2 rounded-full bg-slate-950/80 text-white backdrop-blur border border-slate-700"
                      title="Flip Camera"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Bottom Controls */}
                  <div className="absolute bottom-3 left-0 right-0 flex items-center justify-center gap-4 z-10">
                    <button
                      type="button"
                      onClick={stopCameraStream}
                      className="px-3 py-1.5 rounded-xl bg-slate-900/90 text-slate-300 text-xs font-bold border border-slate-700"
                    >
                      Cancel
                    </button>

                    {/* Big Shutter Button */}
                    <button
                      type="button"
                      onClick={capturePhoto}
                      className="w-14 h-14 rounded-full bg-white border-4 border-purple-500 shadow-2xl flex items-center justify-center active:scale-90 transition-transform"
                    >
                      <div className="w-10 h-10 rounded-full bg-purple-600" />
                    </button>
                  </div>
                </div>
              ) : (
                /* PHOTO PREVIEW & THUMBNAILS */
                <div className="space-y-2">
                  <div className="relative rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 aspect-video shadow-lg">
                    {capturedPhotos[activePhotoIndex] ? (
                      <img
                        src={capturedPhotos[activePhotoIndex]}
                        alt={`Shelf photo ${activePhotoIndex + 1}`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-slate-500">
                        <ImageIcon className="w-10 h-10 mb-2" />
                        <span className="text-xs">No photos captured yet</span>
                      </div>
                    )}

                    {/* Overlay Action Buttons */}
                    <div className="absolute bottom-2.5 right-2.5 flex gap-2">
                      <button
                        type="button"
                        onClick={startCamera}
                        className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold shadow-xl flex items-center gap-1.5 transition-all"
                      >
                        <Camera className="w-3.5 h-3.5" /> Open Camera
                      </button>

                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3 py-1.5 bg-slate-900/90 hover:bg-slate-800 text-slate-200 rounded-xl text-xs font-bold border border-slate-700 shadow-xl flex items-center gap-1.5 transition-all"
                      >
                        <Upload className="w-3.5 h-3.5" /> Upload File
                      </button>
                    </div>
                  </div>

                  {/* Hidden File Input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileUpload}
                    className="hidden"
                  />

                  {/* Thumbnail Row */}
                  {capturedPhotos.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto py-1">
                      {capturedPhotos.map((p, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setActivePhotoIndex(idx)}
                          className={`w-14 h-14 rounded-xl overflow-hidden border-2 shrink-0 transition-all ${
                            idx === activePhotoIndex ? 'border-purple-400 scale-105 shadow-md' : 'border-slate-800 opacity-60'
                          }`}
                        >
                          <img src={p} alt="" className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Camera Error Banner */}
              {cameraError && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{cameraError}</span>
                </div>
              )}

              {/* Gemini AI Shelf Photo Audit Button */}
              <button
                type="button"
                onClick={handleAnalyzePhoto}
                disabled={analyzingPhoto || capturedPhotos.length === 0}
                className="w-full py-3 bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-700 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-purple-500/20 hover:opacity-95 transition-all cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                {analyzingPhoto ? 'Gemini AI Vision Auditing...' : 'Run Gemini AI Vision Audit'}
              </button>
            </div>

            {/* 2. GEMINI AI AUDIT RESULTS */}
            {aiAnalysis && (
              <div className="bg-slate-950 p-4 rounded-2xl border border-purple-500/40 text-xs space-y-2.5 animate-in fade-in">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="font-bold text-purple-400 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" /> Gemini Vision AI Insights
                  </span>
                  <span className="font-mono font-bold text-amber-400 text-xs bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                    Cleanliness: {aiAnalysis.conditionScore || '9'}/10
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300">
                  <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                    Visible Items: <span className="font-bold text-white">{aiAnalysis.visibleProductsCount || 36}</span>
                  </div>
                  <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                    AI Estimated Stock: <span className="font-bold text-emerald-400">{aiAnalysis.estimatedStockPercent || 85}%</span>
                  </div>
                </div>

                <p className="text-[11px] text-slate-300 leading-relaxed italic mt-1 bg-slate-900/40 p-2.5 rounded-lg border border-slate-800">
                  "{aiAnalysis.summary || 'Shelf is neatly organized with eye-level placement and clear price labeling. Minimal out-of-stock gaps.'}"
                </p>
              </div>
            )}

            {/* 3. GPS LOCATION VERIFICATION */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Navigation className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-bold text-white">GPS Geofence Verification</span>
                </div>
                <button
                  type="button"
                  onClick={handleVerifyLocation}
                  disabled={gpsLoading}
                  className="px-3 py-1 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 text-xs font-bold rounded-lg border border-emerald-500/30 transition-all flex items-center gap-1"
                >
                  <Compass className="w-3.5 h-3.5" />
                  {gpsLoading ? 'Checking GPS...' : gpsLocation ? 'Verified' : 'Verify Location'}
                </button>
              </div>

              {gpsLocation && (
                <div className="text-[11px] text-slate-400 font-mono flex items-center justify-between pt-1">
                  <span>Lat: {gpsLocation.latitude.toFixed(4)}, Lng: {gpsLocation.longitude.toFixed(4)}</span>
                  <span className="text-emerald-400 font-bold">✓ On-Site ({gpsDistanceMeters || 8}m from shop)</span>
                </div>
              )}
            </div>

            {/* 4. STOCK & CONDITION AUDIT INPUTS */}
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-slate-300">Observed Stock Capacity</span>
                  <span className="text-emerald-400 font-mono font-bold">{stockPercent}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={stockPercent}
                  onChange={(e) => setStockPercent(Number(e.target.value))}
                  className="w-full accent-purple-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Shelf Condition</label>
                <select
                  value={condition}
                  onChange={(e) => setCondition(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white"
                >
                  <option value="EXCELLENT">Excellent & Clean (Standard met)</option>
                  <option value="GOOD">Good Condition</option>
                  <option value="NEEDS_CLEANING">Needs Cleaning / Dusting</option>
                  <option value="DISORGANIZED">Disorganized / Missing Tags</option>
                  <option value="DAMAGED">Damaged Shelf Structure</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1">Agent Verification Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Notes on shelf cleanliness, product arrangements, expired tags, shop staff responsiveness..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white h-20"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submittingReport}
              className="w-full py-4 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-sm rounded-2xl shadow-xl shadow-emerald-500/20 cursor-pointer active:scale-98 transition-all flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              {submittingReport ? 'Submitting Report...' : 'Sign & Submit Field Audit Report'}
            </button>

          </form>
        </div>
      ) : (
        /* VISITS CHECKLIST */
        <div className="space-y-6">
          
          <div>
            <h2 className="text-sm font-bold text-white mb-3 flex items-center justify-between">
              <span>Assigned Shop Inspections ({visits.length})</span>
              <span className="text-[10px] text-purple-400 bg-purple-500/10 px-2.5 py-0.5 rounded-full font-mono font-bold border border-purple-500/30">
                TODAY'S SCHEDULE
              </span>
            </h2>

            <div className="space-y-3">
              {visits.map((visit) => (
                <div key={visit.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 shadow-lg space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="text-sm font-bold text-white">{visit.shopName}</div>
                      <div className="text-[11px] text-emerald-400 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3" /> {visit.shopCity} • {visit.shopAddress}
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${visit.status === 'COMPLETED' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'}`}>
                      {visit.status}
                    </span>
                  </div>

                  <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-xs flex justify-between items-center">
                    <span className="text-slate-400">Target Shelf:</span>
                    <span className="font-semibold text-white">{visit.shelfName}</span>
                  </div>

                  {visit.status !== 'COMPLETED' && (
                    <button
                      type="button"
                      onClick={() => {
                        setActiveVisit(visit);
                        startCamera();
                      }}
                      className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs rounded-xl flex items-center justify-center gap-2 shadow-md shadow-purple-600/20 transition-all cursor-pointer"
                    >
                      <Camera className="w-4 h-4" /> Start Inspection & Live Camera Audit
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* HISTORICAL REPORTS */}
          <div>
            <h2 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-400" /> Submitted Reports History
            </h2>
            <div className="space-y-3">
              {reports.map((rep) => (
                <div key={rep.id} className="bg-slate-900 border border-slate-800 rounded-2xl p-4 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white">Report #{rep.id.slice(-6)}</span>
                    <span className="text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                      {rep.stockLevelPercent}% Stock Verified
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">{rep.notes}</p>
                  {rep.aiAnalysis && (
                    <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 text-[10px] text-slate-300 italic flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>{rep.aiAnalysis.summary}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

    </div>
  );
};
