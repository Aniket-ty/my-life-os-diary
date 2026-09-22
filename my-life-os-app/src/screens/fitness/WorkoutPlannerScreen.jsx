import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, StatusBar,
  TextInput, ActivityIndicator, Alert, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useWorkoutPlanStore } from '../../stores/workoutPlanStore';
import { useBodyScanStore } from '../../stores/bodyScanStore';
import moment from 'moment';
import GlassCard from '../../components/ui/GlassCard';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { colors, spacing, radii, type as typ, tint, overlays, shadow } from '../../theme';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const GOALS = [
  { value: 'lose', label: 'Lose weight' },
  { value: 'maintain', label: 'Maintain' },
  { value: 'gain', label: 'Build muscle' },
];
const LEVELS = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
];
const EQUIPMENT_OPTIONS = ['None', 'Dumbbells', 'Barbell', 'Resistance bands', 'Pull-up bar', 'Treadmill', 'Kettlebells', 'Bodyweight', 'Gym machines'];

const SPLIT_OPTIONS = [
  'Push Pull Legs (PPL)',
  'Upper / Lower',
  'Full Body',
  'Arnold Split',
  'Bro Split (1 Muscle/Day)',
  'Cardio & Conditioning',
  'Dumbbell / Home Only',
  'Strength & Power',
];

const DURATION_OPTIONS = ['30-45 mins', '45-60 mins', '60-75 mins', '75+ mins'];

export default function WorkoutPlannerScreen({ navigation }) {
  const { plans, activePlan, loading, generating, error, fetchPlans, generateAndSave, updateDay, applyDay, activatePlan, deletePlan } = useWorkoutPlanStore();
  const { scans: bodyScans, fetchScans: fetchBodyScans } = useBodyScanStore();

  const [showGen, setShowGen] = useState(false);
  const [genGoal, setGenGoal] = useState('maintain');
  const [genLevel, setGenLevel] = useState('beginner');
  const [genDays, setGenDays] = useState(5);
  const [genEquipment, setGenEquipment] = useState([]);
  const [genSplit, setGenSplit] = useState('Push Pull Legs (PPL)');
  const [genDuration, setGenDuration] = useState('45-60 mins');
  const [genFocus, setGenFocus] = useState('');
  const [genPreferences, setGenPreferences] = useState('');

  // Edit Day state
  const [editingDay, setEditingDay] = useState(null);
  const [editName, setEditName] = useState('');
  const [editMuscle, setEditMuscle] = useState('');
  const [editRestDay, setEditRestDay] = useState(false);
  const [editExercises, setEditExercises] = useState([]);
  const [scanChecked, setScanChecked] = useState(false);

  useEffect(() => {
    fetchPlans();
    fetchBodyScans().then(() => setScanChecked(true));
  }, []);

  const week = () => {
    const start = moment().startOf('week');
    return Array.from({ length: 7 }, (_, i) => start.clone().add(i, 'days'));
  };

  const handleGenerate = async () => {
    try {
      await generateAndSave({
        goal: genGoal,
        fitnessLevel: genLevel,
        daysPerWeek: genDays,
        equipment: genEquipment,
        splitType: genSplit,
        workoutDuration: genDuration,
        focus: genFocus || undefined,
        preferences: genPreferences || undefined,
      });
      setShowGen(false);
      Alert.alert('Plan Generated', 'Your new weekly workout plan is ready!');
    } catch (e) {
      Alert.alert('Generation failed', e.message || 'Please try again.');
    }
  };

  const toggleEquipment = (opt) => {
    setGenEquipment((prev) =>
      prev.includes(opt) ? prev.filter((e) => e !== opt) : [...prev, opt]
    );
  };

  const startEdit = (day) => {
    setEditingDay(day);
    setEditName(day.workoutName || '');
    setEditMuscle(day.muscleGroup || '');
    setEditRestDay(Boolean(day.restDay));
    setEditExercises(day.exercises?.length
      ? day.exercises.map((ex) => ({
          name: ex.name || '',
          sets: String(ex.sets ?? 3),
          reps: String(ex.reps ?? '10'),
          restSec: String(ex.restSec ?? 90),
        }))
      : [{ name: '', sets: '3', reps: '10', restSec: '90' }]);
  };

  const saveDay = async () => {
    try {
      await updateDay(activePlan.id, editingDay.id, {
        workoutName: editRestDay ? undefined : editName || undefined,
        muscleGroup: editRestDay ? undefined : editMuscle || undefined,
        restDay: editRestDay,
        exercises: editRestDay
          ? []
          : editExercises.filter((e) => e.name.trim()).map((e) => ({
              name: e.name.trim(),
              sets: Number(e.sets) || undefined,
              reps: e.reps,
              restSec: Number(e.restSec) || 90,
            })),
      });
      setEditingDay(null);
      Alert.alert('Saved', 'Workout day updated.');
    } catch (e) {
      Alert.alert('Error', e.message || 'Could not save day.');
    }
  };

  const handleApply = (day) => {
    Alert.alert(
      `Add "${day.workoutName || 'Workout'}" to today?`,
      'This creates a workout entry for today with all the exercises.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Add to Today', onPress: async () => {
            try {
              await applyDay(activePlan.id, day.id, moment().format('YYYY-MM-DD'));
              Alert.alert('Added', 'Workout added to today in your Fitness journal.');
            } catch (e) {
              Alert.alert('Error', e.message || 'Could not add workout.');
            }
          },
        },
      ]
    );
  };

  if (!scanChecked) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={colors.volt400} />
      </View>
    );
  }

  if (!bodyScans || bodyScans.length === 0) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={colors.void} />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Workout Plan</Text>
          <View style={{ width: 34 }} />
        </View>
        <View style={styles.gateWrap}>
          <GlassCard strong style={styles.gateCard}>
            <View style={[styles.gateIcon, { backgroundColor: tint(colors.rose, 0.16), borderColor: tint(colors.rose, 0.35) }]}>
              <Ionicons name="scan-outline" size={28} color={colors.rose} />
            </View>
            <Text style={styles.gateTitle}>Complete your body scan first</Text>
            <Text style={styles.gateSub}>
              Your workout plan is built around your starting measurements. Log a quick body scan (just your weight is enough) to unlock your personalized plan.
            </Text>
            <Button
              size="md"
              onPress={() => navigation.navigate('BodyScan')}
              style={styles.gateBtn}
              icon={<Ionicons name="scan" size={16} />}
            >
              Go to Body Scan
            </Button>
          </GlassCard>
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={colors.volt400} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.void} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Workout Plan</Text>
        <TouchableOpacity style={styles.genBtn} onPress={() => setShowGen(true)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="sparkles" size={16} color={colors.white} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {!activePlan && !generating && (
          <GlassCard strong style={styles.emptyCard} padded={false}>
            <View style={styles.emptyInner}>
              <Ionicons name="barbell-outline" size={40} color={colors.volt400} />
              <Text style={styles.emptyTitle}>No workout plan yet</Text>
              <Text style={styles.emptySub}>Generate a personalized weekly schedule based on your goal, level, split style and equipment.</Text>
              <Button
                size="md"
                onPress={() => setShowGen(true)}
                style={styles.primaryBtn}
                icon={<Ionicons name="sparkles" size={16} />}
              >
                Generate my plan
              </Button>
            </View>
          </GlassCard>
        )}

        {generating && (
          <GlassCard strong style={styles.emptyCard} padded={false}>
            <View style={styles.emptyInner}>
              <ActivityIndicator size="large" color={colors.volt400} />
              <Text style={styles.emptyTitle}>Designing your week…</Text>
              <Text style={styles.emptySub}>Building your plan around your goals and preferences.</Text>
            </View>
          </GlassCard>
        )}

        {activePlan && (
          <>
            {/* Plan switcher chips if multiple */}
            {plans.length > 1 && (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.planSwitchScroll}>
                {plans.map((p) => (
                  <TouchableOpacity
                    key={p.id}
                    style={[styles.planSwitchChip, p.id === activePlan.id && styles.planSwitchChipActive]}
                    onPress={() => activatePlan(p.id)}
                  >
                    <Text style={[styles.planSwitchText, p.id === activePlan.id && styles.planSwitchTextActive]}>
                      {p.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            )}

            <View style={styles.planMeta}>
              <Badge tone="indigo" style={styles.planChip}>
                <Text style={styles.planChipText}>{activePlan.name}</Text>
              </Badge>
              <Text style={styles.planMetaText}>
                {activePlan.fitnessLevel ? `${capitalize(activePlan.fitnessLevel)} · ` : ''}
                {activePlan.goal ? `${capitalize(activePlan.goal)} · ` : ''}
                {activePlan.daysPerWeek} days/wk
                {activePlan.equipment?.length > 0 ? ` · ${activePlan.equipment.slice(0, 2).join(', ')}` : ''}
              </Text>
            </View>

            <GlassCard padded={false} style={styles.weekCard}>
              {week().map((d, i) => {
                const day = activePlan.days?.find((x) => x.dayNumber === i);
                const isToday = d.isSame(moment(), 'day');
                return (
                  <View key={i} style={[styles.dayRow, isToday && styles.dayRowToday]}>
                    <View style={styles.dayCol}>
                      <Text style={styles.dayLabel}>{DAY_LABELS[i]}</Text>
                      <Text style={[styles.dayNum, isToday && styles.dayNumToday]}>{d.date()}</Text>
                    </View>
                    {!day || day.restDay ? (
                      <View style={styles.restCell}>
                        <Badge tone="slate">🧘 Rest day</Badge>
                      </View>
                    ) : (
                      <TouchableOpacity style={styles.dayCell} onPress={() => startEdit(day)} activeOpacity={0.8}>
                        <View style={styles.dayCellHeader}>
                          <Text style={styles.dayWorkoutName} numberOfLines={1}>{day.workoutName || 'Workout'}</Text>
                          <Ionicons name="pencil" size={13} color={colors.textMuted} />
                        </View>
                        <Text style={styles.dayMuscle} numberOfLines={1}>{day.muscleGroup}</Text>
                        <View style={styles.exercisePreviewList}>
                          {day.exercises?.slice(0, 3).map((ex, exi) => (
                            <Text key={exi} style={styles.dayExercises} numberOfLines={1}>
                              • {ex.name} <Text style={styles.exSubText}>({ex.sets || 3}×{ex.reps || '10'}{ex.restSec ? ` · ${ex.restSec}s` : ''})</Text>
                            </Text>
                          ))}
                          {(day.exercises?.length ?? 0) > 3 && (
                            <Text style={styles.moreExText}>+{(day.exercises?.length ?? 0) - 3} more exercises</Text>
                          )}
                        </View>
                      </TouchableOpacity>
                    )}
                    {!day?.restDay && day && (
                      <TouchableOpacity style={styles.applyBtn} onPress={() => handleApply(day)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                        <Ionicons name="checkmark-circle-outline" size={24} color={colors.volt400} />
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}
            </GlassCard>

            {plans.length > 0 && (
              <View style={styles.plansSection}>
                <Text style={styles.sectionTitle}>Your plans</Text>
                {plans.map((p) => (
                  <View key={p.id} style={[styles.planRow, p.id === activePlan.id && styles.planRowActive]}>
                    <View style={styles.planRowLeft}>
                      <Ionicons name="barbell-outline" size={18} color={p.id === activePlan.id ? colors.volt400 : colors.textFaint} />
                      <View style={styles.planRowInfo}>
                        <Text style={styles.planRowName} numberOfLines={1}>{p.name}</Text>
                        <Text style={styles.planRowMeta}>{capitalize(p.goal)} · {p.daysPerWeek} days{p.generatedByAI ? ' · ✨ Suggested' : ''}</Text>
                      </View>
                    </View>
                    <View style={styles.planRowBtns}>
                      <TouchableOpacity
                        style={styles.smallBtn}
                        onPress={() => activatePlan(p.id).catch(() => Alert.alert('Error', 'Could not activate plan.'))}
                        disabled={p.id === activePlan.id}
                      >
                        <Text style={[styles.smallBtnText, p.id === activePlan.id && { color: colors.volt400 }]}>
                          {p.id === activePlan.id ? 'Active' : 'Activate'}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.smallBtn, styles.smallBtnDanger]}
                        onPress={() => {
                          Alert.alert('Delete plan?', `Delete "${p.name}"?`, [
                            { text: 'Cancel', style: 'cancel' },
                            { text: 'Delete', style: 'destructive', onPress: () => deletePlan(p.id).catch(() => Alert.alert('Error', 'Could not delete plan.')) },
                          ]);
                        }}
                      >
                        <Ionicons name="trash-outline" size={14} color={colors.rose} />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Generate Plan Preferences Modal */}
      <Modal visible={showGen} animationType="slide" transparent onRequestClose={() => setShowGen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Plan preferences</Text>
              <TouchableOpacity onPress={() => setShowGen(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close" size={22} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalLabel}>Goal</Text>
              <View style={styles.chipRow}>
                {GOALS.map((g) => (
                  <TouchableOpacity key={g.value} style={[styles.chip, genGoal === g.value && styles.chipActive]} onPress={() => setGenGoal(g.value)}>
                    <Text style={[styles.chipText, genGoal === g.value && styles.chipTextActive]}>{g.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.modalLabel}>Fitness level</Text>
              <View style={styles.chipRow}>
                {LEVELS.map((l) => (
                  <TouchableOpacity key={l.value} style={[styles.chip, genLevel === l.value && styles.chipActive]} onPress={() => setGenLevel(l.value)}>
                    <Text style={[styles.chipText, genLevel === l.value && styles.chipTextActive]}>{l.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.modalLabel}>Days per week: <Text style={styles.modalLabelHighlight}>{genDays}</Text></Text>
              <View style={styles.sliderRow}>
                {[2, 3, 4, 5, 6, 7].map((n) => (
                  <TouchableOpacity key={n} style={[styles.dayPill, genDays === n && styles.dayPillActive]} onPress={() => setGenDays(n)}>
                    <Text style={[styles.dayPillText, genDays === n && styles.dayPillTextActive]}>{n}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.modalLabel}>Workout Split / Style</Text>
              <View style={styles.chipRowWrap}>
                {SPLIT_OPTIONS.map((opt) => (
                  <TouchableOpacity key={opt} style={[styles.chip, genSplit === opt && styles.chipActive]} onPress={() => setGenSplit(opt)}>
                    <Text style={[styles.chipText, genSplit === opt && styles.chipTextActive]}>{opt}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.modalLabel}>Target Session Duration</Text>
              <View style={styles.chipRowWrap}>
                {DURATION_OPTIONS.map((dur) => (
                  <TouchableOpacity key={dur} style={[styles.chip, genDuration === dur && styles.chipActive]} onPress={() => setGenDuration(dur)}>
                    <Text style={[styles.chipText, genDuration === dur && styles.chipTextActive]}>{dur}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.modalLabel}>Equipment</Text>
              <View style={styles.chipRowWrap}>
                {EQUIPMENT_OPTIONS.map((opt) => (
                  <TouchableOpacity key={opt} style={[styles.chip, genEquipment.includes(opt) && styles.chipActive]} onPress={() => toggleEquipment(opt)}>
                    <Text style={[styles.chipText, genEquipment.includes(opt) && styles.chipTextActive]}>{opt}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.modalLabel}>Focus Areas (Optional)</Text>
              <TextInput
                style={styles.textInput}
                value={genFocus}
                onChangeText={setGenFocus}
                placeholder="e.g. Chest & arms, glutes & quads, back thickness"
                placeholderTextColor={colors.textFaint}
              />

              <Text style={styles.modalLabel}>Preferences & Special Instructions</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={genPreferences}
                onChangeText={setGenPreferences}
                placeholder="Describe your ideal workout (e.g. Focus on hypertrophy with drop sets, avoid squats due to knee pain, include 90s rest...)"
                placeholderTextColor={colors.textFaint}
                multiline
                numberOfLines={3}
              />
            </ScrollView>

            <Button
              onPress={handleGenerate}
              loading={generating}
              style={styles.generateBtn}
              icon={<Ionicons name="sparkles" size={16} />}
            >
              Generate plan
            </Button>
          </View>
        </View>
      </Modal>

      {/* Edit Day Modal */}
      <Modal visible={!!editingDay} animationType="slide" transparent onRequestClose={() => setEditingDay(null)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit {DAY_LABELS[editingDay?.dayNumber || 0]}</Text>
              <TouchableOpacity onPress={() => setEditingDay(null)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close" size={22} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Rest day toggle */}
              <TouchableOpacity
                style={[styles.restDayToggle, editRestDay && styles.restDayToggleActive]}
                onPress={() => setEditRestDay(!editRestDay)}
              >
                <Ionicons name={editRestDay ? "checkmark-circle" : "ellipse-outline"} size={20} color={editRestDay ? colors.volt400 : colors.textMuted} />
                <Text style={[styles.restDayToggleText, editRestDay && styles.restDayToggleTextActive]}>
                  {editRestDay ? "Rest Day (No Workout)" : "Mark as Rest Day"}
                </Text>
              </TouchableOpacity>

              {!editRestDay && (
                <>
                  <Input label="Workout name" value={editName} onChangeText={setEditName} placeholder="Push Day" style={styles.modalField} />
                  <Input label="Muscle group" value={editMuscle} onChangeText={setEditMuscle} placeholder="Chest, Shoulders, Triceps" style={styles.modalField} />

                  <View style={styles.exTitleRow}>
                    <Text style={styles.modalLabel}>Exercises</Text>
                    <TouchableOpacity style={styles.addExBtn} onPress={() => setEditExercises((prev) => [...prev, { name: '', sets: '3', reps: '10', restSec: '90' }])}>
                      <Ionicons name="add" size={14} color={colors.volt400} />
                      <Text style={styles.addExText}>Add Exercise</Text>
                    </TouchableOpacity>
                  </View>
                  {editExercises.map((ex, idx) => (
                    <View key={idx} style={styles.exRowWrap}>
                      <TextInput
                        style={[styles.exInput, { flex: 1 }]} value={ex.name}
                        onChangeText={(t) => setEditExercises((prev) => prev.map((e, i) => i === idx ? { ...e, name: t } : e))}
                        placeholder="Exercise name" placeholderTextColor={colors.textFaint}
                      />
                      <TextInput
                        style={[styles.exInput, styles.smallInput]} value={ex.sets}
                        onChangeText={(t) => setEditExercises((prev) => prev.map((e, i) => i === idx ? { ...e, sets: t } : e))}
                        keyboardType="number-pad" placeholder="sets" placeholderTextColor={colors.textFaint}
                      />
                      <TextInput
                        style={[styles.exInput, styles.smallInput]} value={ex.reps}
                        onChangeText={(t) => setEditExercises((prev) => prev.map((e, i) => i === idx ? { ...e, reps: t } : e))}
                        placeholder="reps" placeholderTextColor={colors.textFaint}
                      />
                      <TextInput
                        style={[styles.exInput, styles.smallInput]} value={ex.restSec}
                        onChangeText={(t) => setEditExercises((prev) => prev.map((e, i) => i === idx ? { ...e, restSec: t } : e))}
                        keyboardType="number-pad" placeholder="sec" placeholderTextColor={colors.textFaint}
                      />
                      <TouchableOpacity onPress={() => setEditExercises((prev) => prev.filter((_, i) => i !== idx))} style={styles.removeEx}>
                        <Ionicons name="close" size={16} color={colors.rose} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </>
              )}
            </ScrollView>

            <Button
              onPress={saveDay}
              style={styles.generateBtn}
              icon={<Ionicons name="checkmark" size={16} />}
            >
              Save day
            </Button>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function capitalize(s) {
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.void },
  center: { alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.xl, paddingTop: 56, paddingBottom: spacing.md,
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: colors.white },
  genBtn: {
    width: 32, height: 32, borderRadius: radii.md, backgroundColor: colors.volt500,
    alignItems: 'center', justifyContent: 'center', ...shadow.glow(colors.volt500),
  },
  gateWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 },
  gateCard: { alignItems: 'center', alignSelf: 'stretch', paddingVertical: 36 },
  gateIcon: {
    width: 56, height: 56, borderRadius: 16, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
  },
  gateTitle: { fontSize: 19, fontWeight: '800', color: colors.white, textAlign: 'center', marginTop: spacing.sm },
  gateSub: { fontSize: 13, color: colors.textMuted, textAlign: 'center', marginTop: spacing.sm, lineHeight: 20 },
  gateBtn: {
    backgroundColor: colors.volt500, borderColor: colors.volt500,
    shadowColor: colors.volt500, marginTop: spacing.xl,
  },
  scroll: { paddingHorizontal: spacing.xl, paddingBottom: 40, paddingTop: spacing.sm },
  emptyCard: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40, marginTop: spacing.lg },
  emptyInner: { alignItems: 'center' },
  emptyTitle: { fontSize: 17, fontWeight: '800', color: colors.white, marginTop: spacing.md },
  emptySub: { fontSize: 13, color: colors.textMuted, textAlign: 'center', marginTop: 6, lineHeight: 19, paddingHorizontal: 20 },
  primaryBtn: {
    backgroundColor: colors.volt500, borderColor: colors.volt500,
    shadowColor: colors.volt500, marginTop: spacing.xl,
  },
  planSwitchScroll: { flexDirection: 'row', gap: 8, paddingVertical: 8, marginBottom: 8 },
  planSwitchChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: radii.pill,
    backgroundColor: colors.card, borderWidth: 1, borderColor: colors.edge,
  },
  planSwitchChipActive: {
    backgroundColor: tint(colors.volt, 0.18), borderColor: colors.volt400,
  },
  planSwitchText: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
  planSwitchTextActive: { color: colors.volt300, fontWeight: '700' },
  planMeta: { marginTop: spacing.xs, alignItems: 'center' },
  planChip: { paddingHorizontal: 14, paddingVertical: 6 },
  planChipText: { color: colors.volt400, fontWeight: '700', fontSize: 13 },
  planMetaText: { fontSize: 12, color: colors.textMuted, marginTop: 4, textTransform: 'capitalize' },
  weekCard: {
    backgroundColor: colors.surface, borderRadius: radii.xl, padding: spacing.sm, marginTop: spacing.lg,
    borderWidth: 1, borderColor: colors.edge,
  },
  dayRow: {
    flexDirection: 'row', alignItems: 'center', padding: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: overlays.borderSoft,
  },
  dayRowToday: { backgroundColor: tint(colors.volt, 0.08), borderRadius: radii.md },
  dayCol: { width: 50, alignItems: 'center' },
  dayLabel: { fontSize: 10, fontWeight: '700', color: colors.textFaint, textTransform: 'uppercase' },
  dayNum: { fontSize: 17, fontWeight: '800', color: colors.text },
  dayNumToday: { color: colors.volt400 },
  dayCell: { flex: 1, backgroundColor: overlays.faint, borderRadius: radii.md, padding: 10, borderWidth: 1, borderColor: overlays.borderSoft },
  dayCellHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dayWorkoutName: { fontSize: 13, fontWeight: '700', color: colors.white, flex: 1 },
  dayMuscle: { fontSize: 11, color: colors.textFaint, marginTop: 2 },
  exercisePreviewList: { marginTop: 4, gap: 2 },
  dayExercises: { fontSize: 11, color: colors.textSoft },
  exSubText: { color: colors.textFaint, fontSize: 10 },
  moreExText: { fontSize: 10, color: colors.volt400, fontWeight: '600', marginTop: 2 },
  restCell: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  applyBtn: { marginLeft: spacing.sm, padding: spacing.xs },
  plansSection: { marginTop: spacing.xxl },
  sectionTitle: { ...typ.label, marginBottom: spacing.sm },
  planRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.card, borderRadius: radii.lg, padding: 12, marginBottom: spacing.sm,
    borderWidth: 1, borderColor: colors.edge,
  },
  planRowActive: { borderColor: colors.volt400, backgroundColor: tint(colors.volt, 0.08) },
  planRowLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1, minWidth: 0 },
  planRowInfo: { flex: 1, minWidth: 0 },
  planRowName: { fontSize: 14, fontWeight: '600', color: colors.text },
  planRowMeta: { fontSize: 11, color: colors.textFaint, marginTop: 1, textTransform: 'capitalize' },
  planRowBtns: { flexDirection: 'row', gap: 6 },
  smallBtn: { backgroundColor: overlays.soft, borderRadius: radii.sm, paddingHorizontal: 10, paddingVertical: 6 },
  smallBtnDanger: { backgroundColor: tint(colors.rose, 0.12) },
  smallBtnText: { fontSize: 11, fontWeight: '700', color: colors.textSoft },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(7,7,13,0.85)', justifyContent: 'flex-end' },
  modal: {
    backgroundColor: colors.surface, borderTopLeftRadius: radii.xxl, borderTopRightRadius: radii.xxl,
    padding: spacing.xl, maxHeight: '88%', borderWidth: 1, borderColor: colors.edge, borderBottomWidth: 0,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md },
  modalTitle: { fontSize: 18, fontWeight: '800', color: colors.white },
  modalLabel: { ...typ.label, marginTop: spacing.md, marginBottom: spacing.sm },
  modalLabelHighlight: { color: colors.volt400 },
  modalField: { marginBottom: spacing.sm },
  chipRow: { flexDirection: 'row', gap: spacing.sm },
  chipRowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    backgroundColor: colors.card, borderRadius: radii.pill, paddingHorizontal: 12, paddingVertical: 8,
    borderWidth: 1, borderColor: colors.edge,
  },
  chipActive: { backgroundColor: tint(colors.volt, 0.18), borderColor: colors.volt400 },
  chipText: { fontSize: 12, color: colors.textMuted, fontWeight: '600' },
  chipTextActive: { color: colors.volt300, fontWeight: '700' },
  sliderRow: { flexDirection: 'row', gap: spacing.sm },
  dayPill: {
    flex: 1, backgroundColor: colors.card, borderRadius: radii.sm, paddingVertical: 10, alignItems: 'center',
    borderWidth: 1, borderColor: colors.edge,
  },
  dayPillActive: { backgroundColor: colors.volt500, borderColor: colors.volt500 },
  dayPillText: { fontSize: 14, fontWeight: '700', color: colors.textFaint },
  dayPillTextActive: { color: colors.white },
  textInput: {
    borderWidth: 1, borderColor: colors.edge, borderRadius: radii.md, padding: 12,
    fontSize: 13, backgroundColor: colors.card, color: colors.text,
  },
  textArea: { minHeight: 70, textAlignVertical: 'top' },
  generateBtn: {
    backgroundColor: colors.volt500, borderColor: colors.volt500,
    shadowColor: colors.volt500, marginTop: spacing.lg,
  },
  restDayToggle: {
    flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14,
    borderRadius: radii.md, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.edge,
    marginBottom: spacing.md,
  },
  restDayToggleActive: {
    borderColor: colors.volt400, backgroundColor: tint(colors.volt, 0.12),
  },
  restDayToggleText: { fontSize: 14, fontWeight: '600', color: colors.textSoft },
  restDayToggleTextActive: { color: colors.volt300, fontWeight: '700' },
  exTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  addExBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, padding: 4 },
  addExText: { fontSize: 13, color: colors.volt400, fontWeight: '600' },
  exRowWrap: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing.sm },
  exInput: {
    borderWidth: 1, borderColor: overlays.border, borderRadius: radii.md, padding: 10,
    fontSize: 13, backgroundColor: overlays.faint, color: colors.text,
  },
  smallInput: { width: 54, textAlign: 'center' },
  removeEx: { padding: spacing.sm },
});