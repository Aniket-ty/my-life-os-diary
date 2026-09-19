import { useEffect, useRef, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  X,
  Dumbbell,
  AlertTriangle,
  ShieldCheck,
  Wind,
  Plus,
  CheckCircle2,
  Loader2,
  Timer,
  ChevronLeft,
  ChevronRight,
  Flame,
} from 'lucide-react';
import {
  equipmentService,
  type ExerciseDetail,
} from '@/services/equipment';
import { useToast } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

export interface WorkoutExerciseItem {
  id?: string;
  name: string;
  sets?: number | null;
  reps?: string | number | null;
  weightKg?: number | null;
  restSec?: number | null;
}

export interface ExerciseDemoProps {
  open: boolean;
  onClose: () => void;
  exerciseId?: string | null;
  exerciseName?: string | null;
  initialData?: ExerciseDetail | null;
  onAddedToWorkout?: () => void;
  workoutName?: string | null;
  customSets?: number | string | null;
  customReps?: string | number | null;
  customWeightKg?: number | string | null;
  customRestSec?: number | string | null;
  workoutExercises?: WorkoutExerciseItem[];
  onSelectExercise?: (exerciseName: string) => void;
}

export function ExerciseDemo({
  open,
  onClose,
  exerciseId,
  exerciseName,
  initialData,
  onAddedToWorkout,
  workoutName,
  customSets,
  customReps,
  customWeightKg,
  customRestSec,
  workoutExercises = [],
  onSelectExercise,
}: ExerciseDemoProps) {
  const [activeName, setActiveName] = useState<string | null>(exerciseName || null);
  const [exercise, setExercise] = useState<ExerciseDetail | null>(initialData || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Video states
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true); // MUST not autoplay with sound
  const [videoProgress, setVideoProgress] = useState(0);
  const [videoDuration, setVideoDuration] = useState(0);
  const [videoLoading, setVideoLoading] = useState(true);
  const [videoError, setVideoError] = useState(false);

  // Add to workout modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [sets, setSets] = useState('3');
  const [reps, setReps] = useState('10');
  const [weightKg, setWeightKg] = useState('');
  const [addingToWorkout, setAddingToWorkout] = useState(false);

  // Rest Timer State
  const [restTimerSec, setRestTimerSec] = useState<number | null>(null);
  const [restTimerTotal, setRestTimerTotal] = useState<number>(60);
  const [restTimerRunning, setRestTimerRunning] = useState(false);

  const { toast } = useToast();

  // Sync activeName with incoming prop
  useEffect(() => {
    if (exerciseName) {
      setActiveName(exerciseName);
    }
  }, [exerciseName]);

  // Current exercise index in workout list
  const currentIndex = useMemo(() => {
    if (!workoutExercises.length || !activeName) return -1;
    return workoutExercises.findIndex(
      (we) => we.name.toLowerCase() === activeName.toLowerCase()
    );
  }, [workoutExercises, activeName]);

  // Active workout parameters for current exercise
  const currentWorkoutParams = useMemo(() => {
    if (currentIndex >= 0 && workoutExercises[currentIndex]) {
      const we = workoutExercises[currentIndex];
      return {
        sets: we.sets ?? customSets,
        reps: we.reps ?? customReps,
        weightKg: we.weightKg ?? customWeightKg,
        restSec: we.restSec ?? customRestSec,
      };
    }
    return {
      sets: customSets,
      reps: customReps,
      weightKg: customWeightKg,
      restSec: customRestSec,
    };
  }, [currentIndex, workoutExercises, customSets, customReps, customWeightKg, customRestSec]);

  // Effective rest period
  const effectiveRestSec = useMemo(() => {
    if (currentWorkoutParams.restSec) return Number(currentWorkoutParams.restSec);
    if (exercise?.recommendedRestSec) return exercise.recommendedRestSec;
    return 60;
  }, [currentWorkoutParams.restSec, exercise?.recommendedRestSec]);

  // Sound chime for rest timer completion using Web Audio API
  const playTimerChime = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.6);
    } catch {
      // Audio autoplay blocked or unsupported
    }
  };

  // Rest Timer Countdown Effect
  useEffect(() => {
    if (!restTimerRunning || restTimerSec === null) return;
    if (restTimerSec <= 0) {
      setRestTimerRunning(false);
      playTimerChime();
      toast('Rest period complete! Get ready for your next set 💪', 'success');
      return;
    }
    const interval = setInterval(() => {
      setRestTimerSec((prev) => (prev !== null && prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [restTimerRunning, restTimerSec, toast]);

  const startRestTimer = (seconds: number) => {
    setRestTimerTotal(seconds);
    setRestTimerSec(seconds);
    setRestTimerRunning(true);
    toast(`Rest timer started: ${seconds}s`, 'info');
  };

  const addRestTime = (seconds: number) => {
    setRestTimerSec((prev) => (prev !== null ? prev + seconds : seconds));
    setRestTimerTotal((prev) => Math.max(prev, (restTimerSec ?? 0) + seconds));
  };

  // Load exercise details
  useEffect(() => {
    if (!open) {
      setExercise(null);
      setIsPlaying(false);
      setRestTimerRunning(false);
      setRestTimerSec(null);
      return;
    }

    if (initialData && (!activeName || initialData.name.toLowerCase() === activeName.toLowerCase())) {
      setExercise(initialData);
      setSets(String(currentWorkoutParams.sets || initialData.recommendedSets || 3));
      setReps(String(currentWorkoutParams.reps || initialData.recommendedReps || '10'));
      if (currentWorkoutParams.weightKg) setWeightKg(String(currentWorkoutParams.weightKg));
      return;
    }

    async function fetchExercise() {
      setLoading(true);
      setError(null);
      setVideoError(false);
      try {
        let ex: ExerciseDetail;
        if (exerciseId && !activeName) {
          ex = await equipmentService.getExerciseById(exerciseId);
        } else if (activeName) {
          const list = await equipmentService.listExercises({ q: activeName });
          if (list && list.length > 0) {
            const match = list.find(
              (item) => item.name.toLowerCase() === activeName.toLowerCase()
            ) || list[0];
            ex = await equipmentService.getExerciseById(match.id);
          } else {
            // Fallback to catalog first item or mock structure so UI never crashes
            const all = await equipmentService.listExercises();
            if (all && all.length > 0) {
              const base = await equipmentService.getExerciseById(all[0].id);
              ex = {
                ...base,
                id: base.id,
                name: activeName,
              };
            } else {
              throw new Error(`Exercise "${activeName}" not found in catalog.`);
            }
          }
        } else {
          throw new Error('No exercise specified.');
        }

        setExercise(ex);
        setSets(String(currentWorkoutParams.sets || ex.recommendedSets || 3));
        setReps(String(currentWorkoutParams.reps || ex.recommendedReps || '10'));
        if (currentWorkoutParams.weightKg) setWeightKg(String(currentWorkoutParams.weightKg));

        equipmentService.trackEvent('exercise_demo_opened', {
          exerciseId: ex.id,
          exerciseName: ex.name,
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not load exercise details');
      } finally {
        setLoading(false);
      }
    }

    fetchExercise();
  }, [open, exerciseId, activeName, initialData, currentWorkoutParams.sets, currentWorkoutParams.reps, currentWorkoutParams.weightKg]);

  // Video controls
  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current
        .play()
        .then(() => {
          setIsPlaying(true);
          equipmentService.trackEvent('video_played', { exerciseName: exercise?.name });
        })
        .catch(() => setIsPlaying(false));
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    const nextMute = !isMuted;
    videoRef.current.muted = nextMute;
    setIsMuted(nextMute);
  };

  const handleReplay = () => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = 0;
    videoRef.current
      .play()
      .then(() => setIsPlaying(true))
      .catch(() => setIsPlaying(false));
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const cur = videoRef.current.currentTime;
    const dur = videoRef.current.duration || 1;
    setVideoProgress((cur / dur) * 100);
    setVideoDuration(dur);
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!videoRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    videoRef.current.currentTime = pos * (videoDuration || 1);
  };

  // Add to workout submission
  const handleAddToWorkout = async () => {
    if (!exercise) return;
    setAddingToWorkout(true);
    try {
      await equipmentService.addExerciseToWorkout(exercise.id, {
        sets: Number(sets) || 3,
        reps: reps || '10',
        weightKg: weightKg ? Number(weightKg) : undefined,
      });

      toast(`Added ${exercise.name} (${sets} sets × ${reps}) to today's workout!`, 'success');
      setShowAddModal(false);
      onAddedToWorkout?.();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to add exercise to workout', 'error');
    } finally {
      setAddingToWorkout(false);
    }
  };

  // Switch exercise in list
  const handleSelectExercise = (name: string) => {
    setActiveName(name);
    setVideoError(false);
    setIsPlaying(false);
    onSelectExercise?.(name);
  };

  const handlePrev = () => {
    if (currentIndex > 0 && workoutExercises[currentIndex - 1]) {
      handleSelectExercise(workoutExercises[currentIndex - 1].name);
    }
  };

  const handleNext = () => {
    if (currentIndex < workoutExercises.length - 1 && workoutExercises[currentIndex + 1]) {
      handleSelectExercise(workoutExercises[currentIndex + 1].name);
    }
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/80 backdrop-blur-md"
          onClick={onClose}
        />

        {/* Modal Dialog */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative z-10 flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-slate-950/95 shadow-2xl backdrop-blur-2xl"
        >
          {/* Header */}
          <div className="border-b border-white/10 px-5 py-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-brand/20 text-violet-brand">
                  <Dumbbell size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-display text-lg font-bold text-white">
                      {exercise?.name || activeName || 'Exercise Demonstration'}
                    </h2>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    {workoutName && <span className="text-emerald-300 font-medium">{workoutName}</span>}
                    {workoutName && <span>•</span>}
                    <span>{exercise?.primaryMuscle || 'Fitness'}</span>
                    {exercise?.equipment?.name && (
                      <>
                        <span>•</span>
                        <span className="text-teal-300">{exercise.equipment.name}</span>
                      </>
                    )}
                    {exercise?.difficultyLevel && (
                      <>
                        <span>•</span>
                        <span className="capitalize">{exercise.difficultyLevel}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {workoutExercises.length > 1 && (
                  <div className="flex items-center gap-1 mr-2 bg-white/5 p-1 rounded-xl border border-white/10">
                    <button
                      onClick={handlePrev}
                      disabled={currentIndex <= 0}
                      className="p-1 rounded-lg text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:text-slate-400 transition-colors"
                      title="Previous exercise in workout"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <span className="text-[11px] font-semibold text-slate-300 px-1.5">
                      {currentIndex + 1} / {workoutExercises.length}
                    </span>
                    <button
                      onClick={handleNext}
                      disabled={currentIndex >= workoutExercises.length - 1}
                      className="p-1 rounded-lg text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:text-slate-400 transition-colors"
                      title="Next exercise in workout"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                )}
                <button
                  onClick={onClose}
                  className="rounded-xl p-2 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Horizontal Exercise Stepper Carousel for Workout */}
            {workoutExercises.length > 1 && (
              <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin">
                {workoutExercises.map((we, idx) => {
                  const isCurrent = we.name.toLowerCase() === (activeName || exercise?.name || '').toLowerCase();
                  return (
                    <button
                      key={idx}
                      onClick={() => handleSelectExercise(we.name)}
                      className={cn(
                        'flex shrink-0 items-center gap-1.5 rounded-xl border px-2.5 py-1.5 text-xs font-medium transition-all',
                        isCurrent
                          ? 'border-emerald-500/60 bg-emerald-500/20 text-white font-semibold shadow-md shadow-emerald-500/10'
                          : 'border-white/10 bg-white/[0.03] text-slate-400 hover:border-white/20 hover:text-slate-200'
                      )}
                    >
                      <span className={cn(
                        'flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold',
                        isCurrent ? 'bg-emerald-400 text-slate-950' : 'bg-white/10 text-slate-400'
                      )}>
                        {idx + 1}
                      </span>
                      <span className="max-w-[130px] truncate">{we.name}</span>
                      {we.sets && (
                        <span className={isCurrent ? 'text-emerald-300' : 'text-slate-500'}>
                          ({we.sets}×{we.reps ?? '10'})
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
            {loading ? (
              <div className="flex min-h-[300px] flex-col items-center justify-center gap-3 text-slate-400">
                <Loader2 size={32} className="animate-spin text-violet-brand" />
                <p className="text-sm">Loading demonstration video and instructions...</p>
              </div>
            ) : error ? (
              <div className="flex min-h-[250px] flex-col items-center justify-center text-center">
                <AlertTriangle size={36} className="text-amber-400 mb-2" />
                <p className="text-white font-medium">{error}</p>
                <Button className="mt-4" variant="secondary" onClick={onClose}>
                  Close
                </Button>
              </div>
            ) : exercise ? (
              <>
                {/* Video Player Card */}
                <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-black aspect-video max-h-[360px] w-full shadow-lg">
                  {exercise.videoUrl && !videoError ? (
                    <>
                      <video
                        ref={videoRef}
                        src={exercise.videoUrl}
                        poster={exercise.thumbnailUrl || undefined}
                        loop
                        muted={isMuted}
                        playsInline
                        preload="metadata"
                        onTimeUpdate={handleTimeUpdate}
                        onWaiting={() => setVideoLoading(true)}
                        onPlaying={() => setVideoLoading(false)}
                        onLoadedData={() => setVideoLoading(false)}
                        onError={() => setVideoError(true)}
                        className="h-full w-full object-cover cursor-pointer"
                        onClick={togglePlay}
                      />

                      {/* Video Loading Spinner */}
                      {videoLoading && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px]">
                          <Loader2 size={32} className="animate-spin text-white/80" />
                        </div>
                      )}

                      {/* Center Play Button Overlay (when paused) */}
                      {!isPlaying && !videoLoading && (
                        <button
                          onClick={togglePlay}
                          className="absolute inset-0 m-auto flex h-16 w-16 items-center justify-center rounded-full bg-violet-brand/80 text-white shadow-xl transition-all duration-200 hover:scale-110 hover:bg-violet-brand active:scale-95"
                          title="Play Demonstration"
                        >
                          <Play size={28} className="ml-1 fill-white" />
                        </button>
                      )}

                      {/* Custom Controls Bar */}
                      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-3 pt-6 transition-opacity group-hover:opacity-100 opacity-90">
                        {/* Progress Scrubber Bar */}
                        <div
                          onClick={handleSeek}
                          className="mb-2 h-1.5 w-full cursor-pointer rounded-full bg-white/20 transition-all hover:h-2.5"
                        >
                          <div
                            className="h-full rounded-full bg-violet-brand transition-all"
                            style={{ width: `${videoProgress}%` }}
                          />
                        </div>

                        {/* Control Buttons */}
                        <div className="flex items-center justify-between text-white">
                          <div className="flex items-center gap-3">
                            <button
                              onClick={togglePlay}
                              className="rounded-lg p-1.5 transition-colors hover:bg-white/20"
                              title={isPlaying ? 'Pause' : 'Play'}
                            >
                              {isPlaying ? <Pause size={18} /> : <Play size={18} className="fill-white" />}
                            </button>

                            <button
                              onClick={handleReplay}
                              className="rounded-lg p-1.5 transition-colors hover:bg-white/20"
                              title="Replay from start"
                            >
                              <RotateCcw size={17} />
                            </button>

                            <button
                              onClick={toggleMute}
                              className="rounded-lg p-1.5 transition-colors hover:bg-white/20"
                              title={isMuted ? 'Unmute' : 'Mute'}
                            >
                              {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                            </button>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-medium tracking-wide text-slate-300">
                              HD Video Demonstration
                            </span>
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    /* Fallback when video is absent or failed to load */
                    <div className="flex h-full w-full flex-col items-center justify-center p-6 text-center">
                      {exercise.thumbnailUrl ? (
                        <img
                          src={exercise.thumbnailUrl}
                          alt={exercise.name}
                          className="absolute inset-0 h-full w-full object-cover opacity-60"
                        />
                      ) : null}
                      <div className="relative z-10 rounded-2xl bg-black/70 p-4 backdrop-blur-md">
                        <Dumbbell size={36} className="mx-auto mb-2 text-violet-brand" />
                        <p className="font-semibold text-white">{exercise.name}</p>
                        <p className="text-xs text-slate-400 mt-1">
                          Demonstration preview · Follow execution details below
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Workout Targets: Sets, Reps, Weight & Rest Period */}
                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.04] p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2">
                      <Flame size={18} className="text-emerald-400" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-300">
                        {workoutName ? `${workoutName} Targets` : 'Exercise Targets & Rest'}
                      </h3>
                    </div>

                    {/* Rest Timer Trigger Button */}
                    <button
                      onClick={() => startRestTimer(effectiveRestSec)}
                      className="flex items-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-300 hover:bg-amber-500/20 transition-all shadow-sm"
                    >
                      <Timer size={14} className="text-amber-400 animate-pulse" />
                      <span>Start {effectiveRestSec}s Rest Timer</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    <div className="rounded-xl border border-white/5 bg-slate-900/60 p-2.5 text-center">
                      <p className="text-[11px] font-medium text-slate-400">Total Sets</p>
                      <p className="mt-0.5 text-base font-bold text-white">
                        {currentWorkoutParams.sets || exercise.recommendedSets || 3} sets
                      </p>
                    </div>

                    <div className="rounded-xl border border-white/5 bg-slate-900/60 p-2.5 text-center">
                      <p className="text-[11px] font-medium text-slate-400">Reps per Set</p>
                      <p className="mt-0.5 text-base font-bold text-emerald-300">
                        {currentWorkoutParams.reps || exercise.recommendedReps || '10'} reps
                      </p>
                    </div>

                    <div className="rounded-xl border border-white/5 bg-slate-900/60 p-2.5 text-center">
                      <p className="text-[11px] font-medium text-slate-400">Target Rest</p>
                      <p className="mt-0.5 text-base font-bold text-amber-300">
                        {effectiveRestSec} sec
                      </p>
                    </div>

                    <div className="rounded-xl border border-white/5 bg-slate-900/60 p-2.5 text-center">
                      <p className="text-[11px] font-medium text-slate-400">Weight</p>
                      <p className="mt-0.5 text-base font-bold text-violet-brand">
                        {currentWorkoutParams.weightKg ? `${currentWorkoutParams.weightKg} kg` : 'Bodyweight'}
                      </p>
                    </div>
                  </div>

                  {/* Active Rest Timer Widget */}
                  {restTimerSec !== null && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="mt-3 overflow-hidden rounded-xl border border-amber-500/30 bg-amber-950/30 p-3"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Timer size={16} className={cn('text-amber-400', restTimerRunning && 'animate-spin')} />
                          <span className="text-xs font-bold text-amber-200">Rest Countdown</span>
                        </div>
                        <span className="font-mono text-lg font-bold text-amber-300">
                          {Math.floor(restTimerSec / 60)}:{(restTimerSec % 60).toString().padStart(2, '0')}
                        </span>
                      </div>

                      {/* Timer progress bar */}
                      <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden mb-3">
                        <div
                          className="h-full bg-gradient-to-r from-amber-400 to-emerald-400 transition-all duration-500"
                          style={{
                            width: `${Math.min(100, Math.max(0, ((restTimerSec) / (restTimerTotal || 60)) * 100))}%`,
                          }}
                        />
                      </div>

                      {/* Timer controls */}
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => setRestTimerRunning((prev) => !prev)}
                            className="rounded-lg bg-amber-500/20 px-2.5 py-1 text-xs font-semibold text-amber-200 hover:bg-amber-500/30 transition-colors"
                          >
                            {restTimerRunning ? 'Pause' : 'Resume'}
                          </button>
                          <button
                            onClick={() => addRestTime(30)}
                            className="rounded-lg bg-white/10 px-2 py-1 text-xs text-slate-300 hover:bg-white/20 transition-colors"
                          >
                            +30s
                          </button>
                          <button
                            onClick={() => {
                              setRestTimerRunning(false);
                              setRestTimerSec(null);
                            }}
                            className="rounded-lg bg-white/5 px-2 py-1 text-xs text-slate-400 hover:bg-white/15 transition-colors"
                          >
                            Dismiss
                          </button>
                        </div>

                        <div className="flex items-center gap-1 text-[11px] text-slate-400">
                          <span>Presets:</span>
                          <button
                            onClick={() => startRestTimer(45)}
                            className="rounded px-1.5 py-0.5 hover:bg-white/10 text-amber-300"
                          >
                            45s
                          </button>
                          <button
                            onClick={() => startRestTimer(60)}
                            className="rounded px-1.5 py-0.5 hover:bg-white/10 text-amber-300"
                          >
                            60s
                          </button>
                          <button
                            onClick={() => startRestTimer(90)}
                            className="rounded px-1.5 py-0.5 hover:bg-white/10 text-amber-300"
                          >
                            90s
                          </button>
                          <button
                            onClick={() => startRestTimer(120)}
                            className="rounded px-1.5 py-0.5 hover:bg-white/10 text-amber-300"
                          >
                            120s
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </div>

                {/* Secondary Muscles & Tags */}
                {exercise.secondaryMuscles && exercise.secondaryMuscles.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-slate-400">Secondary muscles:</span>
                    {exercise.secondaryMuscles.map((m) => (
                      <span
                        key={m}
                        className="rounded-lg bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-300"
                      >
                        {m}
                      </span>
                    ))}
                  </div>
                )}

                {/* Step by step instructions */}
                {exercise.instructions && exercise.instructions.length > 0 && (
                  <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4">
                    <h3 className="flex items-center gap-2 font-display text-sm font-bold text-white mb-3">
                      <CheckCircle2 size={16} className="text-emerald-400" />
                      Step-by-Step Instructions
                    </h3>
                    <ol className="space-y-2.5 text-sm text-slate-300">
                      {exercise.instructions.map((step, idx) => (
                        <li key={idx} className="flex items-start gap-3">
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-brand/20 text-xs font-bold text-violet-brand">
                            {idx + 1}
                          </span>
                          <span className="leading-relaxed">{step}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}

                {/* Proper Starting Position & Technique */}
                {(exercise.startingPosition || exercise.executionTechnique) && (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {exercise.startingPosition && (
                      <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4">
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                          Starting Position
                        </p>
                        <p className="mt-1.5 text-xs leading-relaxed text-slate-300">
                          {exercise.startingPosition}
                        </p>
                      </div>
                    )}

                    {exercise.executionTechnique && (
                      <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4">
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                          Execution Technique
                        </p>
                        <p className="mt-1.5 text-xs leading-relaxed text-slate-300">
                          {exercise.executionTechnique}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Breathing & Safety */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {exercise.breathingInstructions && (
                    <div className="rounded-2xl border border-sky-500/20 bg-sky-500/[0.03] p-4">
                      <div className="flex items-center gap-2 text-sky-400 font-semibold text-xs mb-1.5">
                        <Wind size={15} />
                        Breathing Technique
                      </div>
                      <p className="text-xs leading-relaxed text-slate-300">
                        {exercise.breathingInstructions}
                      </p>
                    </div>
                  )}

                  {exercise.safetyTips && exercise.safetyTips.length > 0 && (
                    <div className="rounded-2xl border border-amber-500/20 bg-amber-500/[0.03] p-4">
                      <div className="flex items-center gap-2 text-amber-400 font-semibold text-xs mb-1.5">
                        <ShieldCheck size={15} />
                        Safety Tips
                      </div>
                      <ul className="list-disc list-inside space-y-1 text-xs text-slate-300">
                        {exercise.safetyTips.map((tip, i) => (
                          <li key={i}>{tip}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Common Mistakes */}
                {exercise.commonMistakes && exercise.commonMistakes.length > 0 && (
                  <div className="rounded-2xl border border-rose-500/20 bg-rose-500/[0.03] p-4">
                    <div className="flex items-center gap-2 text-rose-400 font-semibold text-xs mb-2">
                      <AlertTriangle size={15} />
                      Common Mistakes to Avoid
                    </div>
                    <ul className="space-y-1.5 text-xs text-slate-300">
                      {exercise.commonMistakes.map((mistake, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-rose-400 font-bold">✕</span>
                          <span>{mistake}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Alternative Exercises */}
                {exercise.alternativeExercises && exercise.alternativeExercises.length > 0 && (
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                      Substitutions & Alternatives
                    </p>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {exercise.alternativeExercises.map((alt) => (
                        <button
                          key={alt.id}
                          onClick={() => setExercise(alt as ExerciseDetail)}
                          className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.03] p-2.5 text-left transition-colors hover:bg-white/10"
                        >
                          <div>
                            <p className="text-xs font-semibold text-white">{alt.name}</p>
                            <p className="text-[10px] text-slate-400">{alt.primaryMuscle} • {alt.difficultyLevel}</p>
                          </div>
                          <Play size={14} className="text-violet-brand" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : null}
          </div>

          {/* Footer Action Bar */}
          <div className="flex items-center justify-between border-t border-white/10 bg-slate-900/60 px-5 py-3.5">
            <Button variant="secondary" size="sm" onClick={onClose}>
              Close
            </Button>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                className="bg-gradient-to-r from-violet-brand to-indigo-600 text-white shadow-lg shadow-violet-brand/25"
                onClick={() => setShowAddModal(true)}
              >
                <Plus size={15} />
                Add to Workout Plan
              </Button>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Add To Workout Quick Dialog */}
      {showAddModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowAddModal(false)} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative z-10 w-full max-w-sm rounded-2xl border border-white/10 bg-slate-900 p-5 shadow-2xl"
          >
            <h3 className="font-display text-base font-bold text-white mb-1">
              Add to Workout
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Set target parameters for <span className="text-violet-brand font-medium">{exercise?.name}</span>
            </p>

            <div className="grid grid-cols-3 gap-2.5 mb-5">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Sets</label>
                <input
                  type="number"
                  value={sets}
                  onChange={(e) => setSets(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-center text-sm font-semibold text-white focus:outline-none focus:border-violet-brand"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Reps</label>
                <input
                  type="text"
                  value={reps}
                  onChange={(e) => setReps(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-center text-sm font-semibold text-white focus:outline-none focus:border-violet-brand"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Weight (kg)</label>
                <input
                  type="number"
                  placeholder="Optional"
                  value={weightKg}
                  onChange={(e) => setWeightKg(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-center text-sm font-semibold text-white focus:outline-none focus:border-violet-brand"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2">
              <Button variant="secondary" size="sm" onClick={() => setShowAddModal(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleAddToWorkout}
                disabled={addingToWorkout}
                className="bg-violet-brand text-white"
              >
                {addingToWorkout ? <Loader2 size={14} className="animate-spin" /> : 'Confirm & Add'}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
