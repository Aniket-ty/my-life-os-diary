import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Camera,
  Upload,
  RefreshCw,
  X,
  ScanLine,
  CheckCircle2,
  AlertCircle,
  Layers,
  ArrowRight,
  Play,
  Search,
  ChevronRight,
  Loader2,
  Sliders,
  Dumbbell,
} from 'lucide-react';
import {
  equipmentService,
  type ScanEquipmentResponse,
  type ScanEquipmentSuccessResponse,
  type ScanEquipmentUncertainResponse,
  type ScanEquipmentMultipleResponse,
  type EquipmentDetail,
} from '@/services/equipment';
import { ExerciseDemo } from './ExerciseDemo';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';
import { cn } from '@/lib/utils';

interface GymEquipmentScannerProps {
  open: boolean;
  onClose: () => void;
  onExerciseAdded?: () => void;
}

export function GymEquipmentScanner({
  open,
  onClose,
  onExerciseAdded,
}: GymEquipmentScannerProps) {
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<'environment' | 'user'>('environment');
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Results
  const [scanResult, setScanResult] = useState<ScanEquipmentResponse | null>(null);
  const [activeTab, setActiveTab] = useState<'howToUse' | 'setup' | 'safety' | 'exercises'>('exercises');

  // Manual fallback search
  const [showManualSearch, setShowManualSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<EquipmentDetail[]>([]);
  const [searching, setSearching] = useState(false);

  // Selected exercise for demo popup
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const { toast } = useToast();

  // Start Camera
  const startCamera = async () => {
    setCameraError(null);
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: cameraFacing,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
      setCameraActive(true);
    } catch (err) {
      console.warn('Camera access error:', err);
      setCameraError('Camera access denied or unavailable. Please upload a photo instead.');
      setCameraActive(false);
    }
  };

  // Stop Camera
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  useEffect(() => {
    if (open && !capturedImage && !scanResult && !showManualSearch) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [open, cameraFacing, capturedImage, scanResult, showManualSearch]);

  // Flip Camera
  const toggleCameraFacing = () => {
    setCameraFacing((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  // Capture Photo from Camera
  const takePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current || document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    setCapturedImage(dataUrl);
    stopCamera();

    canvas.toBlob((blob) => {
      if (blob) {
        void analyzePhoto(blob);
      }
    }, 'image/jpeg', 0.85);
  };

  // Upload Photo from File
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (ev) => {
      setCapturedImage(ev.target?.result as string);
    };
    reader.readAsDataURL(file);

    stopCamera();
    void analyzePhoto(file);
  };

  // Send photo to Backend Vision API
  const analyzePhoto = async (imageFileOrBlob: Blob | File) => {
    setIsAnalyzing(true);
    setScanResult(null);
    equipmentService.trackEvent('equipment_scan_started');

    try {
      const result = await equipmentService.scanEquipment(imageFileOrBlob);
      setScanResult(result);

      if ('isUncertain' in result && result.isUncertain) {
        equipmentService.trackEvent('scan_low_confidence', { detectedName: result.detectedName });
      } else if ('detectedMultiple' in result && result.detectedMultiple) {
        equipmentService.trackEvent('scan_multiple_detected', { count: result.candidates.length });
      } else {
        const success = result as ScanEquipmentSuccessResponse;
        equipmentService.trackEvent('scan_succeeded', {
          equipmentName: success.equipment.name,
          confidence: success.equipment.confidence,
        });
        toast(`Identified: ${success.equipment.name}!`);
      }
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Identification failed. Try manual search.', 'error');
      equipmentService.trackEvent('scan_failed');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Retake or Clear
  const handleResetScan = () => {
    setCapturedImage(null);
    setScanResult(null);
    setShowManualSearch(false);
    startCamera();
  };

  // Manual Search Handler
  const handleManualSearch = async (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const results = await equipmentService.listEquipment({ q: query.trim() });
      setSearchResults(results);
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  // Select a manual equipment machine
  const handleSelectEquipment = async (eq: EquipmentDetail) => {
    setShowManualSearch(false);
    // Convert to success result format
    setScanResult({
      equipment: {
        id: eq.id,
        name: eq.name,
        category: eq.category,
        confidence: 1.0,
        imageUrl: eq.imageUrl,
      },
      description: eq.description,
      primaryMuscles: eq.primaryMuscles || [],
      secondaryMuscles: eq.secondaryMuscles || [],
      howToUse: eq.instructions,
      setupInstructions: eq.setupInstructions,
      safetyTips: eq.safetyInstructions,
      commonMistakes: eq.commonMistakes,
      exercises: eq.exercises,
      reasoning: 'Selected manually from verified gym equipment catalog.',
    });
    equipmentService.trackEvent('manual_fallback_used', { equipmentName: eq.name });
  };

  if (!open) return null;

  const successResult = scanResult && !('isUncertain' in scanResult) && !('detectedMultiple' in scanResult)
    ? (scanResult as ScanEquipmentSuccessResponse)
    : null;

  const uncertainResult = scanResult && 'isUncertain' in scanResult
    ? (scanResult as ScanEquipmentUncertainResponse)
    : null;

  const multipleResult = scanResult && 'detectedMultiple' in scanResult
    ? (scanResult as ScanEquipmentMultipleResponse)
    : null;

  return (
    <>
      <AnimatePresence>
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/85 backdrop-blur-md"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            className="relative z-10 flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-slate-950/95 shadow-2xl backdrop-blur-2xl"
          >
            {/* Top Bar */}
            <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500/20 to-emerald-500/20 text-teal-400">
                  <ScanLine size={20} />
                </div>
                <div>
                  <h2 className="font-display text-lg font-bold text-white">Scan Gym Equipment</h2>
                  <p className="text-xs text-slate-400">Point camera at any gym machine to identify & get instructions</p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="rounded-xl p-2 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              {/* VIEW 1: Manual Search Fallback */}
              {showManualSearch ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-white">Manual Equipment Search</h3>
                    <button
                      onClick={() => setShowManualSearch(false)}
                      className="text-xs font-medium text-teal-400 hover:underline"
                    >
                      ← Back to Camera
                    </button>
                  </div>

                  <div className="relative">
                    <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => handleManualSearch(e.target.value)}
                      placeholder="Search by machine name (e.g. Lat Pulldown, Cable, Leg Press)..."
                      className="w-full rounded-2xl border border-white/10 bg-white/5 py-3 pl-10 pr-4 text-sm text-white placeholder-slate-500 focus:border-teal-400 focus:outline-none"
                      autoFocus
                    />
                  </div>

                  {/* Quick Filters */}
                  <div className="flex flex-wrap gap-1.5">
                    {['Lat', 'Cable', 'Chest', 'Press', 'Leg', 'Squat', 'Bench', 'Curl'].map((tag) => (
                      <button
                        key={tag}
                        onClick={() => handleManualSearch(tag)}
                        className="rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1 text-xs text-slate-300 transition-colors hover:bg-white/10"
                      >
                        {tag}
                      </button>
                    ))}
                  </div>

                  {searching ? (
                    <div className="flex py-12 justify-center text-slate-400">
                      <Loader2 size={24} className="animate-spin text-teal-400" />
                    </div>
                  ) : searchResults.length > 0 ? (
                    <div className="space-y-2 max-h-[350px] overflow-y-auto">
                      {searchResults.map((eq) => (
                        <div
                          key={eq.id}
                          onClick={() => handleSelectEquipment(eq)}
                          className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] p-3.5 transition-all hover:border-teal-500/40 hover:bg-white/[0.06] cursor-pointer"
                        >
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-500/20 text-teal-300">
                              <Dumbbell size={18} />
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-white">{eq.name}</p>
                              <p className="text-xs text-slate-400">
                                {eq.category} • {eq.primaryMuscles?.join(', ')}
                              </p>
                            </div>
                          </div>
                          <ChevronRight size={18} className="text-slate-500" />
                        </div>
                      ))}
                    </div>
                  ) : searchQuery ? (
                    <div className="py-8 text-center text-slate-400 text-sm">
                      No matching gym equipment found for "{searchQuery}".
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 text-center py-4">
                      Type above to find any gym machine from our verified catalog.
                    </p>
                  )}
                </div>
              ) : !capturedImage && !scanResult ? (
                /* VIEW 2: Camera Viewfinder & Guides */
                <div className="space-y-4">
                  <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl border border-white/10 bg-black shadow-inner">
                    {/* Camera Video Feed */}
                    {cameraActive && !cameraError ? (
                      <video
                        ref={videoRef}
                        playsInline
                        muted
                        autoPlay
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full flex-col items-center justify-center p-6 text-center text-slate-400">
                        <Camera size={42} className="mb-2 text-slate-600" />
                        <p className="text-sm font-medium text-slate-300">
                          {cameraError || 'Camera preview initializing...'}
                        </p>
                        <p className="text-xs text-slate-500 mt-1 max-w-xs">
                          You can also upload a photo directly using the button below.
                        </p>
                      </div>
                    )}

                    {/* Viewfinder Target Box Overlay */}
                    {cameraActive && !cameraError && (
                      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                        <div className="relative h-48 w-48 sm:h-56 sm:w-56 rounded-3xl border-2 border-dashed border-teal-400/80 shadow-[0_0_20px_rgba(45,212,191,0.25)]">
                          {/* Corner markers */}
                          <div className="absolute -top-1 -left-1 h-4 w-4 border-t-4 border-l-4 border-teal-400 rounded-tl-lg" />
                          <div className="absolute -top-1 -right-1 h-4 w-4 border-t-4 border-r-4 border-teal-400 rounded-tr-lg" />
                          <div className="absolute -bottom-1 -left-1 h-4 w-4 border-b-4 border-l-4 border-teal-400 rounded-bl-lg" />
                          <div className="absolute -bottom-1 -right-1 h-4 w-4 border-b-4 border-r-4 border-teal-400 rounded-br-lg" />

                          {/* Center scan line animation */}
                          <div className="absolute inset-x-2 top-0 h-0.5 bg-gradient-to-r from-transparent via-teal-400 to-transparent animate-pulse" />
                        </div>
                        <p className="mt-4 rounded-full bg-black/70 px-3.5 py-1 text-xs font-semibold text-teal-300 backdrop-blur-md">
                          Point your camera at the machine
                        </p>
                      </div>
                    )}

                    {/* Camera Flip Button */}
                    {cameraActive && (
                      <button
                        onClick={toggleCameraFacing}
                        className="absolute right-3 top-3 rounded-full bg-black/60 p-2 text-white backdrop-blur-md transition-colors hover:bg-black/90"
                        title="Flip Camera"
                      >
                        <RefreshCw size={17} />
                      </button>
                    )}
                  </div>

                  {/* Camera Controls & Upload Button */}
                  <div className="flex items-center justify-center gap-4 pt-2">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleFileUpload}
                    />

                    <Button
                      variant="secondary"
                      size="md"
                      className="gap-2 rounded-2xl border-white/10"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload size={16} />
                      Upload Photo
                    </Button>

                    <Button
                      size="md"
                      onClick={takePhoto}
                      disabled={!cameraActive}
                      className="gap-2 rounded-2xl bg-gradient-to-r from-teal-500 to-emerald-500 px-6 font-semibold text-white shadow-lg shadow-teal-500/25 active:scale-95"
                    >
                      <Camera size={18} />
                      Take Photo
                    </Button>
                  </div>

                  {/* Manual search prompt */}
                  <div className="text-center pt-2">
                    <button
                      onClick={() => setShowManualSearch(true)}
                      className="text-xs text-slate-400 transition-colors hover:text-teal-300"
                    >
                      Can't take a photo? <span className="underline font-medium text-teal-400">Search equipment manually</span>
                    </button>
                  </div>
                </div>
              ) : isAnalyzing ? (
                /* VIEW 3: Analyzing animation */
                <div className="flex min-h-[320px] flex-col items-center justify-center p-6 text-center">
                  <div className="relative mb-6">
                    <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-teal-500/20 text-teal-400 shadow-xl shadow-teal-500/10">
                      <ScanLine size={40} className="animate-pulse" />
                    </div>
                    <div className="absolute -inset-1 rounded-3xl border border-teal-400/40 animate-ping" />
                  </div>

                  <h3 className="font-display text-lg font-bold text-white">Analyzing gym machine...</h3>
                  <p className="mt-1 text-xs text-slate-400 max-w-sm">
                    Our vision engine is identifying the equipment frame, pulleys, and exercise biomechanics.
                  </p>
                </div>
              ) : uncertainResult ? (
                /* VIEW 4: Low Confidence / Uncertainty Handling */
                <div className="rounded-2xl border border-amber-500/30 bg-amber-500/[0.05] p-5 space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="rounded-xl bg-amber-500/20 p-2 text-amber-400 shrink-0">
                      <AlertCircle size={24} />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white">
                        {uncertainResult.message}
                      </h3>
                      <p className="mt-1 text-xs text-slate-300 leading-relaxed">
                        {uncertainResult.reasoning}
                      </p>
                    </div>
                  </div>

                  {/* Helpful Tips */}
                  <div className="rounded-xl border border-white/5 bg-black/40 p-3.5">
                    <p className="text-xs font-semibold text-amber-300 uppercase tracking-wider mb-2">
                      Tips for a better scan:
                    </p>
                    <ul className="space-y-1 text-xs text-slate-300 list-disc list-inside">
                      {uncertainResult.tips.map((tip, idx) => (
                        <li key={idx}>{tip}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Fallback Suggestions */}
                  {uncertainResult.suggestions && uncertainResult.suggestions.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold text-slate-400 mb-2">Did you mean one of these?</p>
                      <div className="grid grid-cols-2 gap-2">
                        {uncertainResult.suggestions.map((s) => (
                          <button
                            key={s.id}
                            onClick={() => handleManualSearch(s.name)}
                            className="rounded-xl border border-white/10 bg-white/[0.03] p-2.5 text-left text-xs font-medium text-slate-200 transition-colors hover:bg-white/10"
                          >
                            {s.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/10">
                    <Button variant="secondary" size="sm" onClick={handleResetScan}>
                      Try Another Photo
                    </Button>
                    <Button
                      size="sm"
                      className="bg-amber-500 text-black font-semibold"
                      onClick={() => setShowManualSearch(true)}
                    >
                      Search Manually
                    </Button>
                  </div>
                </div>
              ) : multipleResult ? (
                /* VIEW 5: Multiple Machines Detected */
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-indigo-400 font-semibold text-sm">
                    <Layers size={18} />
                    {multipleResult.message}
                  </div>
                  <p className="text-xs text-slate-400">
                    Select which piece of gym equipment you want to inspect:
                  </p>

                  <div className="space-y-2">
                    {multipleResult.candidates.map((cand) => (
                      <button
                        key={cand.id}
                        onClick={() => handleManualSearch(cand.name)}
                        className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-left transition-all hover:border-indigo-500/40 hover:bg-white/[0.06]"
                      >
                        <div>
                          <p className="font-semibold text-white">{cand.name}</p>
                          <p className="text-xs text-slate-400">{cand.category}</p>
                        </div>
                        <ArrowRight size={16} className="text-indigo-400" />
                      </button>
                    ))}
                  </div>

                  <div className="flex justify-end pt-2">
                    <Button variant="secondary" size="sm" onClick={handleResetScan}>
                      Retake Photo
                    </Button>
                  </div>
                </div>
              ) : successResult ? (
                /* VIEW 6: High Confidence Success Result */
                <div className="space-y-5">
                  {/* Machine Header Banner */}
                  <div className="flex items-start justify-between gap-3 rounded-2xl border border-teal-500/30 bg-teal-500/[0.06] p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-400 text-black font-bold">
                        <CheckCircle2 size={24} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-display text-base font-bold text-white">
                            {successResult.equipment.name}
                          </h3>
                          <Badge tone="emerald">
                            Confidence: {Math.round((successResult.equipment.confidence ?? 1) * 100)}%
                          </Badge>
                        </div>
                        <p className="mt-1 text-xs text-slate-300 leading-relaxed">
                          {successResult.description}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Muscle Groups Trained */}
                  <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                      Target Muscles
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {successResult.primaryMuscles.map((m) => (
                        <span
                          key={m}
                          className="rounded-lg bg-emerald-500/20 px-2.5 py-1 text-xs font-semibold text-emerald-300 border border-emerald-500/30"
                        >
                          Primary: {m}
                        </span>
                      ))}
                      {successResult.secondaryMuscles.map((m) => (
                        <span
                          key={m}
                          className="rounded-lg bg-white/5 px-2.5 py-1 text-xs font-medium text-slate-300"
                        >
                          {m}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Tabs: Exercises, How to Use, Setup, Safety */}
                  <div>
                    <div className="flex border-b border-white/10 text-xs font-semibold">
                      {[
                        { id: 'exercises', label: `Exercises (${successResult.exercises.length})` },
                        { id: 'howToUse', label: 'How to Use' },
                        { id: 'setup', label: 'Adjustment' },
                        { id: 'safety', label: 'Safety' },
                      ].map((tab) => (
                        <button
                          key={tab.id}
                          onClick={() => setActiveTab(tab.id as any)}
                          className={cn(
                            'px-4 py-2.5 transition-colors border-b-2',
                            activeTab === tab.id
                              ? 'border-teal-400 text-teal-400'
                              : 'border-transparent text-slate-400 hover:text-white'
                          )}
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>

                    <div className="pt-4">
                      {activeTab === 'exercises' && (
                        <div className="space-y-3">
                          {successResult.exercises.map((ex) => (
                            <div
                              key={ex.id}
                              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition-all hover:bg-white/[0.06]"
                            >
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <p className="font-semibold text-white text-sm">{ex.name}</p>
                                  <span className="rounded bg-white/10 px-2 py-0.5 text-[10px] text-slate-300 capitalize">
                                    {ex.difficultyLevel}
                                  </span>
                                </div>
                                <p className="text-xs text-slate-400 line-clamp-1">
                                  {ex.shortDescription}
                                </p>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  className="gap-1.5 text-xs text-violet-300 hover:bg-violet-500/10"
                                  onClick={() => setSelectedExerciseId(ex.id)}
                                >
                                  <Play size={13} className="fill-violet-300" />
                                  Watch Demo
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {activeTab === 'howToUse' && (
                        <div className="space-y-2.5 text-xs text-slate-300">
                          {successResult.howToUse.map((step, i) => (
                            <div key={i} className="flex items-start gap-2.5">
                              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-500/20 text-[11px] font-bold text-teal-300">
                                {i + 1}
                              </span>
                              <span className="leading-relaxed">{step}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {activeTab === 'setup' && (
                        <div className="space-y-2.5 text-xs text-slate-300">
                          {(successResult.setupInstructions || []).map((step, i) => (
                            <div key={i} className="flex items-start gap-2.5">
                              <Sliders size={16} className="text-teal-400 shrink-0 mt-0.5" />
                              <span className="leading-relaxed">{step}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {activeTab === 'safety' && (
                        <div className="space-y-3 text-xs text-slate-300">
                          <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.04] p-3">
                            <p className="font-semibold text-amber-300 mb-1.5">Safety Instructions</p>
                            <ul className="list-disc list-inside space-y-1">
                              {successResult.safetyTips.map((tip, i) => (
                                <li key={i}>{tip}</li>
                              ))}
                            </ul>
                          </div>

                          <div className="rounded-xl border border-rose-500/20 bg-rose-500/[0.04] p-3">
                            <p className="font-semibold text-rose-300 mb-1.5">Common Mistakes</p>
                            <ul className="list-disc list-inside space-y-1">
                              {successResult.commonMistakes.map((mistake, i) => (
                                <li key={i}>{mistake}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-between border-t border-white/10 bg-slate-900/60 px-5 py-3.5">
              <Button variant="secondary" size="sm" onClick={onClose}>
                Close
              </Button>

              {(capturedImage || scanResult || showManualSearch) && (
                <Button variant="secondary" size="sm" onClick={handleResetScan} className="gap-1.5">
                  <RefreshCw size={14} />
                  Scan Another
                </Button>
              )}
            </div>
          </motion.div>
        </div>
      </AnimatePresence>

      {/* Embedded Exercise Demo Popup */}
      {selectedExerciseId && (
        <ExerciseDemo
          open={Boolean(selectedExerciseId)}
          onClose={() => setSelectedExerciseId(null)}
          exerciseId={selectedExerciseId}
          onAddedToWorkout={() => {
            if (onExerciseAdded) onExerciseAdded();
          }}
        />
      )}
    </>
  );
}
