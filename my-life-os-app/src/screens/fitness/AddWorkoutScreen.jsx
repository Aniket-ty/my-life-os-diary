import React, { useState } from 'react';
import {
  View, Text, TextInput, ScrollView, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useFitnessStore } from '../../stores/fitnessStore';
import { Ionicons } from '@expo/vector-icons';
import moment from 'moment';
import Input from '../../components/ui/Input';
import GlassCard from '../../components/ui/GlassCard';
import { colors, spacing, radii, type as typ, tint, overlays } from '../../theme';

const emptyExercise = () => ({ exerciseName: '', sets: '', reps: '', weightKg: '' });

export default function AddWorkoutScreen({ navigation }) {
  const { createWorkout } = useFitnessStore();
  const [name, setName] = useState('');
  const [status, setStatus] = useState('planned');
  const [durationMin, setDurationMin] = useState('');
  const [notes, setNotes] = useState('');
  const [exercises, setExercises] = useState([emptyExercise()]);
  const [saving, setSaving] = useState(false);

  const updateExercise = (index, field, value) => {
    setExercises((prev) => prev.map((ex, i) => i === index ? { ...ex, [field]: value } : ex));
  };

  const addExercise = () => setExercises((prev) => [...prev, emptyExercise()]);
  const removeExercise = (index) => setExercises((prev) => prev.filter((_, i) => i !== index));

  const handleSave = async () => {
    if (!name.trim()) return Alert.alert('Required', 'Please enter a workout name.');
    const validExercises = exercises
      .filter((ex) => ex.exerciseName.trim())
      .map((ex) => ({
        exerciseName: ex.exerciseName.trim(),
        sets: ex.sets ? Number(ex.sets) : null,
        reps: ex.reps || null,
        weightKg: ex.weightKg ? Number(ex.weightKg) : null,
      }));

    setSaving(true);
    try {
      await createWorkout({
        name: name.trim(),
        workoutDate: moment().format('YYYY-MM-DD'),
        status,
        durationMin: durationMin ? Number(durationMin) : null,
        notes: notes.trim() || null,
        exercises: validExercises,
      });
      navigation.goBack();
    } catch (e) {
      Alert.alert('Error', 'Could not save workout.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Workout</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          {saving
            ? <ActivityIndicator size="small" color={colors.emerald} />
            : <Text style={styles.saveText}>Save</Text>
          }
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

        {/* Workout name */}
        <Input label="Workout Name *" value={name} onChangeText={setName} placeholder="e.g. Chest Day, Morning Run" style={styles.fieldSpacing} />

        {/* Status */}
        <Text style={styles.label}>Status</Text>
        <View style={styles.statusRow}>
          {['planned', 'completed'].map((s) => (
            <TouchableOpacity
              key={s}
              style={[styles.statusBtn, status === s && styles.statusBtnActive]}
              onPress={() => setStatus(s)}
            >
              <Ionicons
                name={s === 'planned' ? 'time-outline' : 'checkmark-circle'}
                size={15}
                color={status === s ? colors.emerald : colors.textMuted}
              />
              <Text style={[styles.statusBtnText, status === s && styles.statusBtnTextActive]}>
                {s === 'planned' ? 'Planned' : 'Completed'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Duration */}
        <Input label="Duration (minutes)" value={durationMin} onChangeText={setDurationMin} placeholder="e.g. 45" keyboardType="numeric" style={styles.fieldSpacing} />

        {/* Exercises */}
        <View style={styles.exercisesHeader}>
          <Text style={styles.label}>Exercises</Text>
          <TouchableOpacity onPress={addExercise} style={styles.addExBtn}>
            <Ionicons name="add-circle" size={20} color={colors.emerald} />
            <Text style={styles.addExText}>Add</Text>
          </TouchableOpacity>
        </View>

        {exercises.map((ex, i) => (
          <GlassCard key={i} style={styles.exerciseCard} padded={false}>
            <View style={styles.exerciseCardHeader}>
              <Text style={styles.exerciseNum}>Exercise {i + 1}</Text>
              {exercises.length > 1 && (
                <TouchableOpacity onPress={() => removeExercise(i)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <Ionicons name="close-circle" size={18} color={colors.rose} />
                </TouchableOpacity>
              )}
            </View>
            <Input
              value={ex.exerciseName}
              onChangeText={(v) => updateExercise(i, 'exerciseName', v)}
              placeholder="Exercise name (e.g. Bench Press)"
            />
            <View style={styles.exRow}>
              <View style={styles.exField}>
                <Text style={styles.exFieldLabel}>Sets</Text>
                <TextInput
                  style={styles.exSmallInput}
                  placeholder="Sets"
                  placeholderTextColor={colors.textFaint}
                  value={ex.sets}
                  onChangeText={(v) => updateExercise(i, 'sets', v)}
                  keyboardType="numeric"
                />
              </View>
              <View style={styles.exField}>
                <Text style={styles.exFieldLabel}>Reps</Text>
                <TextInput
                  style={styles.exSmallInput}
                  placeholder="Reps"
                  placeholderTextColor={colors.textFaint}
                  value={ex.reps}
                  onChangeText={(v) => updateExercise(i, 'reps', v)}
                />
              </View>
              <View style={styles.exField}>
                <Text style={styles.exFieldLabel}>kg</Text>
                <TextInput
                  style={styles.exSmallInput}
                  placeholder="kg"
                  placeholderTextColor={colors.textFaint}
                  value={ex.weightKg}
                  onChangeText={(v) => updateExercise(i, 'weightKg', v)}
                  keyboardType="numeric"
                />
              </View>
            </View>
          </GlassCard>
        ))}

        {/* Notes */}
        <Input label="Notes" value={notes} onChangeText={setNotes} placeholder="Any notes about this workout..." multiline style={styles.fieldSpacing} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.void },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.xl, paddingTop: 56, paddingBottom: spacing.lg,
    backgroundColor: colors.void,
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: colors.white },
  saveText: { fontSize: 16, color: colors.emerald, fontWeight: '700' },
  scroll: { padding: spacing.xl, paddingBottom: 60 },
  label: { ...typ.label, marginTop: spacing.lg, marginBottom: spacing.sm },
  fieldSpacing: { marginTop: spacing.sm },
  statusRow: { flexDirection: 'row', gap: spacing.sm },
  statusBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    padding: 12, borderRadius: radii.md, backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.edge,
  },
  statusBtnActive: { borderColor: colors.emerald, backgroundColor: tint(colors.emerald, 0.14) },
  statusBtnText: { color: colors.textMuted, fontWeight: '600' },
  statusBtnTextActive: { color: colors.emerald },
  exercisesHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.md },
  addExBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  addExText: { color: colors.emerald, fontWeight: '600' },
  exerciseCard: {
    backgroundColor: colors.card, borderRadius: radii.lg, padding: spacing.lg,
    marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.edge,
  },
  exerciseCardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm },
  exerciseNum: { color: colors.emerald, fontWeight: '700', fontSize: 13 },
  exRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  exField: { flex: 1 },
  exFieldLabel: { fontSize: 11, color: colors.textFaint, fontWeight: '600', marginBottom: 3, textTransform: 'uppercase', letterSpacing: 0.4 },
  exSmallInput: {
    backgroundColor: overlays.faint, borderRadius: radii.sm, padding: 10,
    color: colors.text, fontSize: 13, textAlign: 'center', borderWidth: 1, borderColor: overlays.border,
  },
});