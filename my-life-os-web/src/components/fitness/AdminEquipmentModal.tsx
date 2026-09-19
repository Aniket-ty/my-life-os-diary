import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings,
  Edit2,
  X,
  Video,
  Loader2,
} from 'lucide-react';
import {
  equipmentService,
  type EquipmentDetail,
  type ExerciseDetail,
} from '@/services/equipment';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';

export function AdminEquipmentModal({
  open,
  onClose,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
}) {
  const [tab, setTab] = useState<'equipment' | 'exercises'>('exercises');
  const [exercises, setExercises] = useState<ExerciseDetail[]>([]);
  const [equipmentList, setEquipmentList] = useState<EquipmentDetail[]>([]);
  const [loading, setLoading] = useState(false);

  // Edit exercise state
  const [editingExercise, setEditingExercise] = useState<ExerciseDetail | null>(null);
  const [videoUrl, setVideoUrl] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');
  const [difficulty, setDifficulty] = useState('Beginner');
  const [recommendedSets, setRecommendedSets] = useState(3);
  const [recommendedReps, setRecommendedReps] = useState('10-12');
  const [saving, setSaving] = useState(false);

  const { toast } = useToast();

  const loadData = async () => {
    setLoading(true);
    try {
      const [exs, eqs] = await Promise.all([
        equipmentService.listExercises(),
        equipmentService.listEquipment(),
      ]);
      setExercises(exs);
      setEquipmentList(eqs);
    } catch (err) {
      toast('Failed to load catalog data', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open]);

  const handleEditExercise = (ex: ExerciseDetail) => {
    setEditingExercise(ex);
    setVideoUrl(ex.videoUrl || '');
    setThumbnailUrl(ex.thumbnailUrl || '');
    setDifficulty(ex.difficultyLevel || 'Beginner');
    setRecommendedSets(ex.recommendedSets || 3);
    setRecommendedReps(ex.recommendedReps || '10-12');
  };

  const handleSaveExercise = async () => {
    if (!editingExercise) return;
    setSaving(true);
    try {
      await equipmentService.updateExercise(editingExercise.id, {
        videoUrl: videoUrl.trim() || null,
        thumbnailUrl: thumbnailUrl.trim() || null,
        difficultyLevel: difficulty,
        recommendedSets: Number(recommendedSets),
        recommendedReps,
      });

      toast(`Updated exercise "${editingExercise.name}"`);
      setEditingExercise(null);
      await loadData();
      if (onSaved) onSaved();
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Failed to update', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        />

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative z-10 flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-slate-950 p-6 shadow-2xl"
        >
          <div className="flex items-center justify-between pb-4 border-b border-white/10">
            <div className="flex items-center gap-2.5">
              <Settings size={20} className="text-violet-brand" />
              <div>
                <h3 className="font-display text-base font-bold text-white">
                  Fitness Catalog Management
                </h3>
                <p className="text-xs text-slate-400">
                  Update exercise demonstration videos, equipment aliases & instructions
                </p>
              </div>
            </div>

            <button onClick={onClose} className="rounded-xl p-1.5 text-slate-400 hover:bg-white/10">
              <X size={18} />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 pt-3 border-b border-white/10 pb-3 text-xs">
            <button
              onClick={() => { setTab('exercises'); setEditingExercise(null); }}
              className={`rounded-xl px-3 py-1.5 font-semibold transition-colors ${
                tab === 'exercises' ? 'bg-violet-brand text-white' : 'bg-white/5 text-slate-400 hover:text-white'
              }`}
            >
              Exercises ({exercises.length})
            </button>
            <button
              onClick={() => { setTab('equipment'); setEditingExercise(null); }}
              className={`rounded-xl px-3 py-1.5 font-semibold transition-colors ${
                tab === 'equipment' ? 'bg-violet-brand text-white' : 'bg-white/5 text-slate-400 hover:text-white'
              }`}
            >
              Equipment ({equipmentList.length})
            </button>
          </div>

          <div className="flex-1 overflow-y-auto py-4">
            {loading ? (
              <div className="flex py-12 justify-center text-slate-400">
                <Loader2 size={28} className="animate-spin text-violet-brand" />
              </div>
            ) : editingExercise ? (
              /* Edit Exercise Form */
              <div className="space-y-4 text-xs">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-white text-sm">
                    Editing: {editingExercise.name}
                  </h4>
                  <button
                    onClick={() => setEditingExercise(null)}
                    className="text-violet-brand hover:underline"
                  >
                    Cancel
                  </button>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Demonstration Video URL (MP4 / WebM)</label>
                  <input
                    type="url"
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    placeholder="https://cdn.example.com/videos/exercise.mp4"
                    className="w-full rounded-xl border border-white/10 bg-white/5 p-2.5 text-white focus:outline-none focus:border-violet-brand"
                  />
                  <p className="mt-1 text-[11px] text-slate-500">
                    Host on CDN/storage URL. Replaces video across all views instantly without app update.
                  </p>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1 font-medium">Video Thumbnail Poster URL</label>
                  <input
                    type="url"
                    value={thumbnailUrl}
                    onChange={(e) => setThumbnailUrl(e.target.value)}
                    placeholder="https://images.unsplash.com/..."
                    className="w-full rounded-xl border border-white/10 bg-white/5 p-2.5 text-white focus:outline-none focus:border-violet-brand"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-400 mb-1 font-medium">Difficulty</label>
                    <select
                      value={difficulty}
                      onChange={(e) => setDifficulty(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-slate-900 p-2.5 text-white focus:outline-none focus:border-violet-brand"
                    >
                      <option value="Beginner">Beginner</option>
                      <option value="Intermediate">Intermediate</option>
                      <option value="Advanced">Advanced</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1 font-medium">Recommended Sets</label>
                    <input
                      type="number"
                      value={recommendedSets}
                      onChange={(e) => setRecommendedSets(Number(e.target.value))}
                      className="w-full rounded-xl border border-white/10 bg-white/5 p-2.5 text-white focus:outline-none focus:border-violet-brand"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-400 mb-1 font-medium">Recommended Reps</label>
                    <input
                      type="text"
                      value={recommendedReps}
                      onChange={(e) => setRecommendedReps(e.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-white/5 p-2.5 text-white focus:outline-none focus:border-violet-brand"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3">
                  <Button size="sm" variant="secondary" onClick={() => setEditingExercise(null)}>
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    className="bg-violet-brand text-white"
                    disabled={saving}
                    onClick={handleSaveExercise}
                  >
                    {saving ? <Loader2 size={14} className="animate-spin" /> : 'Save Changes'}
                  </Button>
                </div>
              </div>
            ) : tab === 'exercises' ? (
              /* Exercise List */
              <div className="space-y-2">
                {exercises.map((ex) => (
                  <div
                    key={ex.id}
                    className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.03] p-3 text-xs"
                  >
                    <div>
                      <p className="font-semibold text-white">{ex.name}</p>
                      <p className="text-[11px] text-slate-400">
                        {ex.primaryMuscle} • {ex.equipment?.name || 'Bodyweight'}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      {ex.videoUrl && (
                        <span className="flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                          <Video size={10} /> Video active
                        </span>
                      )}
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => handleEditExercise(ex)}
                        className="gap-1 text-xs"
                      >
                        <Edit2 size={12} />
                        Edit Video
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* Equipment List */
              <div className="space-y-2">
                {equipmentList.map((eq) => (
                  <div
                    key={eq.id}
                    className="rounded-xl border border-white/5 bg-white/[0.03] p-3 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-white">{eq.name}</p>
                      <span className="text-[10px] font-medium text-teal-400">{eq.category}</span>
                    </div>
                    <p className="text-slate-400 text-[11px]">
                      Aliases: {Array.isArray(eq.aliases) ? eq.aliases.join(', ') : 'None'}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-white/10 flex justify-end">
            <Button size="sm" variant="secondary" onClick={onClose}>
              Done
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
