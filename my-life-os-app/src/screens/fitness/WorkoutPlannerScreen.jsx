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

export default function WorkoutPlannerScreen({ navigation }) {
  const { plans, activePlan, loading, generating, error, fetchPlans, generateAndSave, updateDay, applyDay, activatePlan, deletePlan } = useWorkoutPlanStore();
  const { scans: bodyScans, fetchScans: fetchBodyScans } = useBodyScanStore();

  const [showGen, setShowGen] = useState(false);
  const [genGoal, setGenGoal] = useState('maintain');
  const [genLevel, setGenLevel] = useState('beginner');
  const [genDays, setGenDays] = useState(5);
  const [genEquipment, setGenEquipment] = useState([]);
  const [editingDay, setEditingDay] = useState(null);
  const [editName, setEditName] = useState('');
  const [editMuscle, setEditMuscle] = useState('');
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

  const handleGenerate = async (save) => {
    try {
      await generateAndSave({
        goal: genGoal,
        fitnessLevel: genLevel,
        daysPerWeek: genDays,
        equipment: genEquipment,
      });
      if (save !== false) setShowGen(false);
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
    setEditExercises(day.exercises?.length
      ? day.exercises.map((ex) => ({ name: ex.name || '', sets: String(ex.sets ?? 3), reps: String(ex.reps ?? '10') }))
      : [{ name: '', sets: '3', reps: '10' }]);
  };

  const saveDay = async () => {
    try {
      await updateDay(activePlan.id, editingDay.id, {
        workoutName: editName || undefined,
        muscleGroup: editMuscle || undefined,
        restDay: false,
        exercises: editExercises.filter((e) => e.name.trim()).map((e) => ({
          name: e.name.trim(), sets: Number(e.sets) || undefined, reps: e.reps,
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
          text: 'Add', onPress: async () => {
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
        <ActivityIndicator size="large" color={colors.emerald} />
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
        <ActivityIndicator size="large" color={colors.emerald} />
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
              <Ionicons name="barbell-outline" size={40} color={colors.emerald} />
              <Text style={styles.emptyTitle}>No workout plan yet</Text>
              <Text style={styles.emptySub}>Generate a personalized weekly schedule based on your goal, level and equipment.</Text>
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
              <ActivityIndicator size="large" color={colors.emerald} />
              <Text style={styles.emptyTitle}>Designing your week…</Text>
              <Text style={styles.emptySub}>The AI is building your plan around your goals.</Text>
            </View>
          </GlassCard>
        )}

        {activePlan && (
          <>
            <View style={styles.planMeta}>
              <Badge tone="emerald" style={styles.planChip}>
                <Text style={styles.planChipText}>{activePlan.name}</Text>
              </Badge>
              <Text style={styles.planMetaText}>
                {activePlan.fitnessLevel ? `${capitalize(activePlan.fitnessLevel)} · ` : ''}
                {activePlan.goal ? `${capitalize(activePlan.goal)} · ` : ''}
                {activePlan.daysPerWeek} days/wk
              </Text>
            </View>

            <GlassCard padded={false} style={styles.weekCard}>
              {week().map((d, i) => {
                const day = activePlan.days.find((x) => x.dayNumber === i);
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
                      <TouchableOpacity style={styles.dayCell} onPress={() => startEdit(day)}>
                        <Text style={styles.dayWorkoutName} numberOfLines={1}>{day.workoutName || 'Workout'}</Text>
                        <Text style={styles.dayMuscle} numberOfLines={1}>{day.muscleGroup}</Text>
                        <Text style={styles.dayExercises} numberOfLines={2}>
                          {day.exercises?.slice(0, 3).map((ex) => ex.name).join(' · ')}
                        </Text>
                      </TouchableOpacity>
                    )}
                    {!day?.restDay && day && (
                      <TouchableOpacity style={styles.applyBtn} onPress={() => handleApply(day)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                        <Ionicons name="add" size={18} color={colors.emerald} />
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
                      <Ionicons name="barbell-outline" size={18} color={p.id === activePlan.id ? colors.emerald : colors.textFaint} />
                      <View style={styles.planRowInfo}>
                        <Text style={styles.planRowName} numberOfLines={1}>{p.name}</Text>
                        <Text style={styles.planRowMeta}>{capitalize(p.goal)} · {p.daysPerWeek} days{p.generatedByAI ? ' · ✨ AI' : ''}</Text>
                      </View>
                    </View>
                    <View style={styles.planRowBtns}>
                      <TouchableOpacity
                        style={styles.smallBtn}
                        onPress={() => activatePlan(p.id).catch(() => Alert.alert('Error', 'Could not activate plan.'))}
                        disabled={p.id === activePlan.id}
                      >
                        <Text style={[styles.smallBtnText, p.id === activePlan.id && { color: colors.emerald }]}>
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

      {/* Generate modal */}
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

              <Text style={styles.modalLabel}>Equipment</Text>
              <View style={styles.chipRowWrap}>
                {EQUIPMENT_OPTIONS.map((opt) => (
                  <TouchableOpacity key={opt} style={[styles.chip, genEquipment.includes(opt) && styles.chipActive]} onPress={() => toggleEquipment(opt)}>
                    <Text style={[styles.chipText, genEquipment.includes(opt) && styles.chipTextActive]}>{opt}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <Button
              onPress={() => handleGenerate()}
              loading={generating}
              style={styles.generateBtn}
              icon={<Ionicons name="sparkles" size={16} />}
            >
              Generate plan
            </Button>
          </View>
        </View>
      </Modal>

      {/* Edit day modal */}
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
              <Input label="Workout name" value={editName} onChangeText={setEditName} placeholder="Push Day" style={styles.modalField} />
              <Input label="Muscle group" value={editMuscle} onChangeText={setEditMuscle} placeholder="Chest, Shoulders, Triceps" style={styles.modalField} />

              <View style={styles.exTitleRow}>
                <Text style={styles.modalLabel}>Exercises</Text>
                <TouchableOpacity style={styles.addExBtn} onPress={() => setEditExercises((prev) => [...prev, { name: '', sets: '3', reps: '10' }])}>
                  <Ionicons name="add" size={14} color={colors.emerald} />
                  <Text style={styles.addExText}>Add</Text>
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
                  <TouchableOpacity onPress={() => setEditExercises((prev) => prev.filter((_, i) => i !== idx))} style={styles.removeEx}>
                    <Ionicons name="close" size={16} color={colors.rose} />
                  </TouchableOpacity>
                </View>
              ))}
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
    width: 28, height: 28, borderRadius: radii.sm, backgroundColor: colors.emerald,
    alignItems: 'center', justifyContent: 'center', ...shadow.glow(colors.emerald),
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
    backgroundColor: colors.emerald, borderColor: colors.emerald,
    shadowColor: colors.emerald, marginTop: spacing.xl,
  },
  scroll: { paddingHorizontal: spacing.xl, paddingBottom: 40, paddingTop: spacing.sm },
  emptyCard: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40, marginTop: spacing.lg },
  emptyInner: { alignItems: 'center' },
  emptyTitle: { fontSize: 17, fontWeight: '800', color: colors.white, marginTop: spacing.md },
  emptySub: { fontSize: 13, color: colors.textMuted, textAlign: 'center', marginTop: 6, lineHeight: 19 },
  primaryBtn: {
    backgroundColor: colors.emerald, borderColor: colors.emerald,
    shadowColor: colors.emerald, marginTop: spacing.xl,
  },
  planMeta: { marginTop: spacing.xs, alignItems: 'center' },
  planChip: { paddingHorizontal: 14, paddingVertical: 6 },
  planChipText: { color: colors.emerald, fontWeight: '700', fontSize: 13 },
  planMetaText: { fontSize: 12, color: colors.textMuted, marginTop: 4, textTransform: 'capitalize' },
  weekCard: {
    backgroundColor: colors.surface, borderRadius: radii.lg, padding: spacing.sm, marginTop: spacing.lg,
    borderWidth: 1, borderColor: colors.edge,
  },
  dayRow: {
    flexDirection: 'row', alignItems: 'center', padding: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: overlays.borderSoft,
  },
  dayRowToday: { backgroundColor: tint(colors.emerald, 0.06), borderRadius: radii.md },
  dayCol: { width: 52, alignItems: 'center' },
  dayLabel: { fontSize: 10, fontWeight: '700', color: colors.textFaint, textTransform: 'uppercase' },
  dayNum: { fontSize: 18, fontWeight: '800', color: colors.text },
  dayNumToday: { color: colors.emerald },
  dayCell: { flex: 1, backgroundColor: overlays.faint, borderRadius: radii.md, padding: 10, borderWidth: 1, borderColor: overlays.borderSoft },
  dayWorkoutName: { fontSize: 13, fontWeight: '700', color: colors.white },
  dayMuscle: { fontSize: 10, color: colors.textFaint, marginTop: 1 },
  dayExercises: { fontSize: 10, color: colors.textMuted, marginTop: 3 },
  restCell: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  applyBtn: { marginLeft: spacing.sm, padding: spacing.sm },
  plansSection: { marginTop: spacing.xxl },
  sectionTitle: { ...typ.label, marginBottom: spacing.sm },
  planRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.card, borderRadius: radii.lg, padding: 12, marginBottom: spacing.sm,
    borderWidth: 1, borderColor: colors.edge,
  },
  planRowActive: { borderColor: colors.emerald, backgroundColor: tint(colors.emerald, 0.05) },
  planRowLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1, minWidth: 0 },
  planRowInfo: { flex: 1, minWidth: 0 },
  planRowName: { fontSize: 14, fontWeight: '600', color: colors.text },
  planRowMeta: { fontSize: 11, color: colors.textFaint, marginTop: 1, textTransform: 'capitalize' },
  planRowBtns: { flexDirection: 'row', gap: 6 },
  smallBtn: { backgroundColor: overlays.soft, borderRadius: radii.sm, paddingHorizontal: 10, paddingVertical: 6 },
  smallBtnDanger: { backgroundColor: tint(colors.rose, 0.12) },
  smallBtnText: { fontSize: 11, fontWeight: '700', color: colors.textSoft },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(7,7,13,0.8)', justifyContent: 'flex-end' },
  modal: {
    backgroundColor: colors.surface, borderTopLeftRadius: radii.xxl, borderTopRightRadius: radii.xxl,
    padding: spacing.xxl, maxHeight: '85%', borderWidth: 1, borderColor: colors.edge, borderBottomWidth: 0,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg },
  modalTitle: { fontSize: 18, fontWeight: '800', color: colors.white },
  modalLabel: { ...typ.label, marginTop: spacing.md, marginBottom: spacing.sm },
  modalLabelHighlight: { color: colors.emerald },
  modalField: { marginBottom: spacing.sm },
  chipRow: { flexDirection: 'row', gap: spacing.sm },
  chipRowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  chip: {
    backgroundColor: colors.card, borderRadius: radii.pill, paddingHorizontal: 14, paddingVertical: 9,
    borderWidth: 1, borderColor: colors.edge,
  },
  chipActive: { backgroundColor: tint(colors.emerald, 0.16), borderColor: tint(colors.emerald, 0.5) },
  chipText: { fontSize: 13, color: colors.textMuted, fontWeight: '600' },
  chipTextActive: { color: colors.emerald },
  sliderRow: { flexDirection: 'row', gap: spacing.sm },
  dayPill: {
    flex: 1, backgroundColor: colors.card, borderRadius: radii.sm, paddingVertical: 10, alignItems: 'center',
    borderWidth: 1, borderColor: colors.edge,
  },
  dayPillActive: { backgroundColor: colors.emerald, borderColor: colors.emerald },
  dayPillText: { fontSize: 14, fontWeight: '700', color: colors.textFaint },
  dayPillTextActive: { color: colors.white },
  generateBtn: {
    backgroundColor: colors.emerald, borderColor: colors.emerald,
    shadowColor: colors.emerald, marginTop: spacing.xl,
  },
  exTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  addExBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, padding: 4 },
  addExText: { fontSize: 13, color: colors.emerald, fontWeight: '600' },
  exRowWrap: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: spacing.sm },
  exInput: {
    borderWidth: 1, borderColor: overlays.border, borderRadius: radii.md, padding: 10,
    fontSize: 14, backgroundColor: overlays.faint, color: colors.text,
  },
  smallInput: { width: 62, textAlign: 'center' },
  removeEx: { padding: spacing.sm },
});