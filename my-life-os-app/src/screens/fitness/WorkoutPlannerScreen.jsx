import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, StatusBar,
  TextInput, ActivityIndicator, Alert, Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useWorkoutPlanStore } from '../../stores/workoutPlanStore';
import moment from 'moment';

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
const EQUIPMENT_OPTIONS = ['None', 'Dumbbells', 'Barbell', 'Resistance bands', 'Pull-up bar', 'Treadmill', 'Kettlebells'];

export default function WorkoutPlannerScreen({ navigation }) {
  const { plans, activePlan, loading, generating, error, fetchPlans, generateAndSave, updateDay, applyDay, activatePlan, deletePlan } = useWorkoutPlanStore();

  const [showGen, setShowGen] = useState(false);
  const [genGoal, setGenGoal] = useState('maintain');
  const [genLevel, setGenLevel] = useState('beginner');
  const [genDays, setGenDays] = useState(5);
  const [genEquipment, setGenEquipment] = useState([]);
  const [editingDay, setEditingDay] = useState(null);
  const [editName, setEditName] = useState('');
  const [editMuscle, setEditMuscle] = useState('');
  const [editExercises, setEditExercises] = useState([]);

  useEffect(() => { fetchPlans(); }, []);

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

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#085041" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="chevron-back" size={24} color="#3d2b1f" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Workout Plan</Text>
        <TouchableOpacity style={styles.genBtn} onPress={() => setShowGen(true)}>
          <Ionicons name="sparkles" size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {!activePlan && !generating && (
          <View style={styles.emptyCard}>
            <Ionicons name="barbell-outline" size={40} color="#085041" />
            <Text style={styles.emptyTitle}>No workout plan yet</Text>
            <Text style={styles.emptySub}>Generate a personalized weekly schedule based on your goal, level and equipment.</Text>
            <TouchableOpacity style={styles.primaryBtn} onPress={() => setShowGen(true)}>
              <Ionicons name="sparkles" size={16} color="#fff" />
              <Text style={styles.primaryBtnText}>Generate my plan</Text>
            </TouchableOpacity>
          </View>
        )}

        {generating && (
          <View style={styles.emptyCard}>
            <ActivityIndicator size="large" color="#c8a96e" />
            <Text style={styles.emptyTitle}>Designing your week…</Text>
            <Text style={styles.emptySub}>The AI is building your plan around your goals.</Text>
          </View>
        )}

        {activePlan && (
          <>
            <View style={styles.planMeta}>
              <View style={styles.planChip}>
                <Text style={styles.planChipText}>{activePlan.name}</Text>
              </View>
              <Text style={styles.planMetaText}>
                {activePlan.fitnessLevel ? `${capitalize(activePlan.fitnessLevel)} · ` : ''}
                {activePlan.goal ? `${capitalize(activePlan.goal)} · ` : ''}
                {activePlan.daysPerWeek} days/wk
              </Text>
            </View>

            <View style={styles.weekCard}>
              {week().map((d, i) => {
                const day = activePlan.days.find((x) => x.dayNumber === i);
                const isToday = d.isSame(moment(), 'day');
                return (
                  <View key={i} style={[styles.dayRow, isToday && styles.dayRowToday]}>
                    <View style={styles.dayCol}>
                      <Text style={styles.dayLabel}>{DAY_LABELS[i]}</Text>
                      <Text style={styles.dayNum}>{d.date()}</Text>
                    </View>
                    {!day || day.restDay ? (
                      <View style={styles.restCell}>
                        <Text style={styles.restText}>🧘 Rest day</Text>
                      </View>
                    ) : (
                      <TouchableOpacity style={styles.dayCell} onPress={() => startEdit(day)}>
                        <Text style={styles.dayWorkoutName}>{day.workoutName || 'Workout'}</Text>
                        <Text style={styles.dayMuscle}>{day.muscleGroup}</Text>
                        <Text style={styles.dayExercises} numberOfLines={2}>
                          {day.exercises?.slice(0, 3).map((ex) => ex.name).join(' · ')}
                        </Text>
                      </TouchableOpacity>
                    )}
                    {!day?.restDay && day && (
                      <TouchableOpacity style={styles.applyBtn} onPress={() => handleApply(day)}>
                        <Ionicons name="add" size={18} color="#2ecc71" />
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}
            </View>

            {plans.length > 0 && (
              <View style={styles.plansSection}>
                <Text style={styles.sectionTitle}>Your plans</Text>
                {plans.map((p) => (
                  <View key={p.id} style={[styles.planRow, p.id === activePlan.id && styles.planRowActive]}>
                    <View style={styles.planRowLeft}>
                      <Ionicons name="barbell-outline" size={18} color={p.id === activePlan.id ? '#2ecc71' : '#999'} />
                      <View>
                        <Text style={styles.planRowName}>{p.name}</Text>
                        <Text style={styles.planRowMeta}>{capitalize(p.goal)} · {p.daysPerWeek} days{p.generatedByAI ? ' · ✨ AI' : ''}</Text>
                      </View>
                    </View>
                    <View style={styles.planRowBtns}>
                      <TouchableOpacity
                        style={styles.smallBtn}
                        onPress={() => activatePlan(p.id).catch(() => Alert.alert('Error', 'Could not activate plan.'))}
                        disabled={p.id === activePlan.id}
                      >
                        <Text style={[styles.smallBtnText, p.id === activePlan.id && { color: '#2ecc71' }]}>
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
                        <Ionicons name="trash-outline" size={14} color="#e74c3c" />
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
                <Ionicons name="close" size={22} color="#666" />
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

              <Text style={styles.modalLabel}>Days per week: {genDays}</Text>
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

            <TouchableOpacity style={styles.primaryBtn} onPress={() => handleGenerate()} disabled={generating}>
              {generating ? <ActivityIndicator color="#fff" /> : (
                <>
                  <Ionicons name="sparkles" size={16} color="#fff" />
                  <Text style={styles.primaryBtnText}>Generate plan</Text>
                </>
              )}
            </TouchableOpacity>
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
                <Ionicons name="close" size={22} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalLabel}>Workout name</Text>
              <TextInput style={styles.input} value={editName} onChangeText={setEditName} placeholder="Push Day" placeholderTextColor="#bbb" />
              <Text style={styles.modalLabel}>Muscle group</Text>
              <TextInput style={styles.input} value={editMuscle} onChangeText={setEditMuscle} placeholder="Chest, Shoulders, Triceps" placeholderTextColor="#bbb" />

              <View style={styles.exTitleRow}>
                <Text style={styles.modalLabel}>Exercises</Text>
                <TouchableOpacity style={styles.addExBtn} onPress={() => setEditExercises((prev) => [...prev, { name: '', sets: '3', reps: '10' }])}>
                  <Ionicons name="add" size={14} color="#085041" />
                  <Text style={styles.addExText}>Add</Text>
                </TouchableOpacity>
              </View>
              {editExercises.map((ex, idx) => (
                <View key={idx} style={styles.exRow}>
                  <TextInput
                    style={[styles.input, { flex: 1 }]} value={ex.name}
                    onChangeText={(t) => setEditExercises((prev) => prev.map((e, i) => i === idx ? { ...e, name: t } : e))}
                    placeholder="Exercise name" placeholderTextColor="#bbb"
                  />
                  <TextInput
                    style={[styles.input, styles.smallInput]} value={ex.sets}
                    onChangeText={(t) => setEditExercises((prev) => prev.map((e, i) => i === idx ? { ...e, sets: t } : e))}
                    keyboardType="number-pad" placeholder="sets" placeholderTextColor="#bbb"
                  />
                  <TextInput
                    style={[styles.input, styles.smallInput]} value={ex.reps}
                    onChangeText={(t) => setEditExercises((prev) => prev.map((e, i) => i === idx ? { ...e, reps: t } : e))}
                    placeholder="reps" placeholderTextColor="#bbb"
                  />
                  <TouchableOpacity onPress={() => setEditExercises((prev) => prev.filter((_, i) => i !== idx))} style={styles.removeEx}>
                    <Ionicons name="close" size={16} color="#e74c3c" />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>

            <TouchableOpacity style={styles.primaryBtn} onPress={saveDay}>
              <Ionicons name="checkmark" size={16} color="#fff" />
              <Text style={styles.primaryBtnText}>Save day</Text>
            </TouchableOpacity>
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
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  center: { alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 12,
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1a1a1a' },
  genBtn: { backgroundColor: '#c8a96e', borderRadius: 10, padding: 8 },
  scroll: { paddingHorizontal: 20, paddingBottom: 40 },
  emptyCard: { backgroundColor: '#fff', borderRadius: 16, padding: 30, alignItems: 'center', marginTop: 20 },
  emptyTitle: { fontSize: 17, fontWeight: '800', color: '#1a1a1a', marginTop: 10 },
  emptySub: { fontSize: 13, color: '#888', textAlign: 'center', marginTop: 6, lineHeight: 19 },
  primaryBtn: {
    backgroundColor: '#085041', borderRadius: 28, paddingVertical: 13, paddingHorizontal: 22,
    alignItems: 'center', flexDirection: 'row', gap: 8, marginTop: 16,
  },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  planMeta: { marginTop: 4, alignItems: 'center' },
  planChip: { backgroundColor: '#085041', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6 },
  planChipText: { color: '#9FE1CB', fontWeight: '700', fontSize: 13 },
  planMetaText: { fontSize: 12, color: '#888', marginTop: 4, textTransform: 'capitalize' },
  weekCard: { backgroundColor: '#fff', borderRadius: 16, padding: 8, marginTop: 14 },
  dayRow: { flexDirection: 'row', alignItems: 'center', padding: 6, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#f0f0f0' },
  dayRowToday: { backgroundColor: '#f0fff4', borderRadius: 10 },
  dayCol: { width: 52, alignItems: 'center' },
  dayLabel: { fontSize: 10, fontWeight: '700', color: '#888', textTransform: 'uppercase' },
  dayNum: { fontSize: 18, fontWeight: '800', color: '#1a1a1a' },
  dayCell: { flex: 1, backgroundColor: '#fafafa', borderRadius: 10, padding: 10 },
  dayWorkoutName: { fontSize: 13, fontWeight: '700', color: '#1a1a1a' },
  dayMuscle: { fontSize: 10, color: '#888', marginTop: 1 },
  dayExercises: { fontSize: 10, color: '#aaa', marginTop: 3 },
  restCell: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  restText: { fontSize: 12, color: '#aaa' },
  applyBtn: { marginLeft: 8, padding: 8 },
  plansSection: { marginTop: 24 },
  sectionTitle: { fontSize: 12, fontWeight: '700', color: '#888', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 8 },
  planRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 8 },
  planRowActive: { borderWidth: 1.5, borderColor: '#2ecc7155' },
  planRowLeft: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  planRowName: { fontSize: 14, fontWeight: '600', color: '#1a1a1a' },
  planRowMeta: { fontSize: 11, color: '#888', marginTop: 1, textTransform: 'capitalize' },
  planRowBtns: { flexDirection: 'row', gap: 6 },
  smallBtn: { backgroundColor: '#f0f0f0', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  smallBtnDanger: { backgroundColor: '#fdecea' },
  smallBtnText: { fontSize: 11, fontWeight: '700', color: '#555' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modal: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#1a1a1a' },
  modalLabel: { fontSize: 12, fontWeight: '700', color: '#888', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 12, marginBottom: 6 },
  chipRow: { flexDirection: 'row', gap: 8 },
  chipRowWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { backgroundColor: '#f5f5f5', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: 'transparent' },
  chipActive: { backgroundColor: '#fdf6e3', borderColor: '#c8a96e' },
  chipText: { fontSize: 13, color: '#666', fontWeight: '600' },
  chipTextActive: { color: '#8a6d2f' },
  sliderRow: { flexDirection: 'row', gap: 8 },
  dayPill: { flex: 1, backgroundColor: '#f5f5f5', borderRadius: 10, paddingVertical: 9, alignItems: 'center' },
  dayPillActive: { backgroundColor: '#085041' },
  dayPillText: { fontSize: 14, fontWeight: '700', color: '#888' },
  dayPillTextActive: { color: '#9FE1CB' },
  input: {
    borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 10, padding: 12,
    fontSize: 15, backgroundColor: '#fafafa', color: '#222', marginBottom: 8,
  },
  smallInput: { width: 62, textAlign: 'center' },
  exTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  addExBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, padding: 4 },
  addExText: { fontSize: 13, color: '#085041', fontWeight: '600' },
  exRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  removeEx: { padding: 8 },
});