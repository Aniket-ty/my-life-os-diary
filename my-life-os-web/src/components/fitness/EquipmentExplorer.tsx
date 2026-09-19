import { useState, useEffect } from 'react';
import {
  Search,
  Dumbbell,
  Play,
  Settings,
  Camera,
} from 'lucide-react';
import {
  equipmentService,
  type EquipmentDetail,
} from '@/services/equipment';
import { ExerciseDemo } from './ExerciseDemo';
import { Button } from '@/components/ui/Button';
import { Loading } from '@/components/ui/Loading';
import { cn } from '@/lib/utils';

const MUSCLE_FILTERS = [
  'All',
  'Chest',
  'Back',
  'Shoulders',
  'Quadriceps',
  'Hamstrings',
  'Glutes',
  'Biceps',
  'Triceps',
  'Calves',
];

export function EquipmentExplorer({
  onOpenScanner,
  onOpenAdmin,
}: {
  onOpenScanner: () => void;
  onOpenAdmin?: () => void;
}) {
  const [equipmentList, setEquipmentList] = useState<EquipmentDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMuscle, setSelectedMuscle] = useState('All');
  const [selectedEquipment, setSelectedEquipment] = useState<EquipmentDetail | null>(null);

  // Exercise demo dialog
  const [demoExerciseId, setDemoExerciseId] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const data = await equipmentService.listEquipment();
        setEquipmentList(data);
      } catch (err) {
        console.error('Failed to load equipment catalog:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filteredEquipment = equipmentList.filter((eq) => {
    const matchesSearch =
      !searchQuery.trim() ||
      eq.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      eq.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (Array.isArray(eq.aliases) && eq.aliases.some((a) => a.toLowerCase().includes(searchQuery.toLowerCase())));

    const matchesMuscle =
      selectedMuscle === 'All' ||
      (Array.isArray(eq.primaryMuscles) &&
        eq.primaryMuscles.some((m) => m.toLowerCase().includes(selectedMuscle.toLowerCase())));

    return matchesSearch && matchesMuscle;
  });

  return (
    <div className="space-y-5">
      {/* Header & Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-display text-lg font-bold text-white">
            Gym Equipment & Exercise Library
          </h3>
          <p className="text-xs text-slate-400">
            Explore 20+ gym machines, setup instructions & HD exercise video demonstrations
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={onOpenScanner}
            className="gap-2 bg-gradient-to-r from-teal-500 to-emerald-500 text-white shadow-lg shadow-teal-500/20"
          >
            <Camera size={15} />
            Scan Machine
          </Button>

          {onOpenAdmin && (
            <Button
              size="sm"
              variant="secondary"
              onClick={onOpenAdmin}
              className="gap-1.5 border-white/10 text-slate-300"
              title="Admin Manager"
            >
              <Settings size={14} />
              Manage
            </Button>
          )}
        </div>
      </div>

      {/* Search & Muscle Group Filter Tabs */}
      <div className="space-y-3">
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search gym equipment (e.g., Lat Pulldown, Cable Crossover, Smith Machine)..."
            className="w-full rounded-2xl border border-white/10 bg-white/5 py-2.5 pl-10 pr-4 text-sm text-white placeholder-slate-500 focus:border-violet-brand focus:outline-none"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex flex-wrap gap-1.5 overflow-x-auto pb-1">
          {MUSCLE_FILTERS.map((muscle) => (
            <button
              key={muscle}
              onClick={() => setSelectedMuscle(muscle)}
              className={cn(
                'rounded-xl px-3 py-1.5 text-xs font-semibold transition-all duration-150',
                selectedMuscle === muscle
                  ? 'bg-violet-brand text-white shadow-md shadow-violet-brand/25'
                  : 'bg-white/[0.04] text-slate-400 hover:bg-white/[0.08] hover:text-slate-200'
              )}
            >
              {muscle}
            </button>
          ))}
        </div>
      </div>

      {/* Equipment List Grid */}
      {loading ? (
        <Loading />
      ) : filteredEquipment.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/[0.02] py-12 text-center">
          <Dumbbell size={32} className="text-slate-600 mb-2" />
          <p className="text-sm font-medium text-slate-300">No equipment found matching criteria</p>
          <p className="text-xs text-slate-500 mt-1">Try another search or muscle group</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredEquipment.map((eq) => (
            <div
              key={eq.id}
              className="flex flex-col justify-between rounded-2xl border border-white/10 bg-white/[0.03] p-4 transition-all hover:border-white/20 hover:bg-white/[0.05]"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-semibold text-white text-sm leading-tight">{eq.name}</h4>
                    <span className="text-[11px] font-medium text-teal-400">{eq.category}</span>
                  </div>
                  <span className="rounded-md bg-white/10 px-2 py-0.5 text-[10px] font-semibold text-slate-300">
                    {eq.exercises?.length || 0} exercises
                  </span>
                </div>

                <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                  {eq.description}
                </p>

                {/* Primary Muscle Badges */}
                <div className="flex flex-wrap gap-1 pt-1">
                  {(eq.primaryMuscles || []).map((m) => (
                    <span
                      key={m}
                      className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-300"
                    >
                      {m}
                    </span>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
                <button
                  onClick={() => setSelectedEquipment(eq)}
                  className="text-xs font-semibold text-slate-300 hover:text-white transition-colors"
                >
                  View Details & Guide
                </button>

                {eq.exercises && eq.exercises.length > 0 && (
                  <Button
                    size="sm"
                    variant="secondary"
                    className="gap-1 text-xs text-violet-300 hover:bg-violet-500/10"
                    onClick={() => setDemoExerciseId(eq.exercises[0].id)}
                  >
                    <Play size={11} className="fill-violet-300" />
                    Demo ({eq.exercises[0].name})
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Selected Equipment Modal Drawer */}
      {selectedEquipment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5">
          <div
            className="absolute inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setSelectedEquipment(null)}
          />

          <div className="relative z-10 flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-slate-950 p-6 shadow-2xl">
            <div className="flex items-start justify-between pb-4 border-b border-white/10">
              <div>
                <h3 className="font-display text-lg font-bold text-white">{selectedEquipment.name}</h3>
                <p className="text-xs text-teal-400 font-medium">{selectedEquipment.category}</p>
              </div>
              <button
                onClick={() => setSelectedEquipment(null)}
                className="rounded-xl p-1.5 text-slate-400 hover:bg-white/10"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-4 text-xs text-slate-300">
              <div>
                <p className="font-semibold text-slate-400 uppercase tracking-wider mb-1 text-[10px]">Overview</p>
                <p className="leading-relaxed text-sm text-slate-200">{selectedEquipment.description}</p>
              </div>

              {selectedEquipment.setupInstructions && selectedEquipment.setupInstructions.length > 0 && (
                <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4">
                  <p className="font-semibold text-teal-300 mb-2">How to Adjust the Machine</p>
                  <ol className="list-decimal list-inside space-y-1.5">
                    {selectedEquipment.setupInstructions.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ol>
                </div>
              )}

              {selectedEquipment.instructions && selectedEquipment.instructions.length > 0 && (
                <div className="rounded-2xl border border-white/5 bg-white/[0.02] p-4">
                  <p className="font-semibold text-white mb-2">Standard Execution Steps</p>
                  <ol className="list-decimal list-inside space-y-1.5">
                    {selectedEquipment.instructions.map((s, i) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ol>
                </div>
              )}

              {/* Supported Exercises */}
              <div>
                <p className="font-semibold text-slate-400 uppercase tracking-wider mb-2 text-[10px]">
                  Exercises on this Machine ({selectedEquipment.exercises?.length || 0})
                </p>
                <div className="space-y-2">
                  {(selectedEquipment.exercises || []).map((ex) => (
                    <div
                      key={ex.id}
                      className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] p-3"
                    >
                      <div>
                        <p className="font-semibold text-white text-xs">{ex.name}</p>
                        <p className="text-[10px] text-slate-400">{ex.primaryMuscle}</p>
                      </div>

                      <Button
                        size="sm"
                        variant="secondary"
                        className="gap-1 text-xs text-violet-300"
                        onClick={() => {
                          setDemoExerciseId(ex.id);
                        }}
                      >
                        <Play size={12} className="fill-violet-300" />
                        Watch Demo
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-white/10 flex justify-end">
              <Button size="sm" variant="secondary" onClick={() => setSelectedEquipment(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Embedded Exercise Demo Modal */}
      {demoExerciseId && (
        <ExerciseDemo
          open={Boolean(demoExerciseId)}
          onClose={() => setDemoExerciseId(null)}
          exerciseId={demoExerciseId}
        />
      )}
    </div>
  );
}
