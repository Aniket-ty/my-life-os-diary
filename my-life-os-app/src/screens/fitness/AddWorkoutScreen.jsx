import React, { useState } from 'react';
import {
  View, Text, TextInput, ScrollView, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useFitnessStore } from '../../stores/fitnessStore';
import { Ionicons } from '@expo/vector-icons';
import moment from 'moment';

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
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Workout</Text>
        <TouchableOpacity onPress={handleSave} disabled={saving}>
          {saving
            ? <ActivityIndicator size="small" color="#2ecc71" />
            : <Text style={styles.saveText}>Save</Text>
          }
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        {/* Workout name */}
        <Text style={styles.label}>Workout Name *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Chest Day, Morning Run"
          placeholderTextColor="#444"
          value={name}
          onChangeText={setName}
        />

        {/* Status */}
        <Text style={styles.label}>Status</Text>
        <View style={styles.statusRow}>
          {['planned', 'completed'].map((s) => (
            <TouchableOpacity
              key={s}
              style={[styles.statusBtn, status === s && styles.statusBtnActive]}
              onPress={() => setStatus(s)}
            >
              <Text style={[styles.statusBtnText, status === s && styles.statusBtnTextActive]}>
                {s === 'planned' ? '📋 Planned' : '✅ Completed'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Duration */}
        <Text style={styles.label}>Duration (minutes)</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. 45"
          placeholderTextColor="#444"
          value={durationMin}
          onChangeText={setDurationMin}
          keyboardType="numeric"
        />

        {/* Exercises */}
        <View style={styles.exercisesHeader}>
          <Text style={styles.label}>Exercises</Text>
          <TouchableOpacity onPress={addExercise} style={styles.addExBtn}>
            <Ionicons name="add-circle" size={22} color="#2ecc71" />
            <Text style={styles.addExText}>Add</Text>
          </TouchableOpacity>
        </View>

        {exercises.map((ex, i) => (
          <View key={i} style={styles.exerciseCard}>
            <View style={styles.exerciseCardHeader}>
              <Text style={styles.exerciseNum}>Exercise {i + 1}</Text>
              {exercises.length > 1 && (
                <TouchableOpacity onPress={() => removeExercise(i)}>
                  <Ionicons name="close-circle" size={18} color="#e74c3c" />
                </TouchableOpacity>
              )}
            </View>
            <TextInput
              style={styles.input}
              placeholder="Exercise name (e.g. Bench Press)"
              placeholderTextColor="#444"
              value={ex.exerciseName}
              onChangeText={(v) => updateExercise(i, 'exerciseName', v)}
            />
            <View style={styles.exRow}>
              <TextInput
                style={[styles.input, styles.exSmall]}
                placeholder="Sets"
                placeholderTextColor="#444"
                value={ex.sets}
                onChangeText={(v) => updateExercise(i, 'sets', v)}
                keyboardType="numeric"
              />
              <TextInput
                style={[styles.input, styles.exSmall]}
                placeholder="Reps"
                placeholderTextColor="#444"
                value={ex.reps}
                onChangeText={(v) => updateExercise(i, 'reps', v)}
              />
              <TextInput
                style={[styles.input, styles.exSmall]}
                placeholder="kg"
                placeholderTextColor="#444"
                value={ex.weightKg}
                onChangeText={(v) => updateExercise(i, 'weightKg', v)}
                keyboardType="numeric"
              />
            </View>
          </View>
        ))}

        {/* Notes */}
        <Text style={styles.label}>Notes</Text>
        <TextInput
          style={[styles.input, styles.notesInput]}
          placeholder="Any notes about this workout..."
          placeholderTextColor="#444"
          value={notes}
          onChangeText={setNotes}
          multiline
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f1a' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16,
    backgroundColor: '#1a1a2e',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  saveText: { fontSize: 16, color: '#2ecc71', fontWeight: '700' },
  scroll: { padding: 20, paddingBottom: 60 },
  label: { fontSize: 13, color: '#888', fontWeight: '600', marginBottom: 6, marginTop: 16, textTransform: 'uppercase', letterSpacing: 0.5 },
  input: {
    backgroundColor: '#1a1a2e', borderRadius: 10, padding: 14,
    color: '#fff', fontSize: 15, borderWidth: 1, borderColor: '#2a2a3e', marginBottom: 4,
  },
  notesInput: { minHeight: 80, textAlignVertical: 'top' },
  statusRow: { flexDirection: 'row', gap: 10 },
  statusBtn: {
    flex: 1, padding: 12, borderRadius: 10, alignItems: 'center',
    backgroundColor: '#1a1a2e', borderWidth: 1, borderColor: '#2a2a3e',
  },
  statusBtnActive: { borderColor: '#2ecc71', backgroundColor: '#0d2818' },
  statusBtnText: { color: '#666', fontWeight: '600' },
  statusBtnTextActive: { color: '#2ecc71' },
  exercisesHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 },
  addExBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  addExText: { color: '#2ecc71', fontWeight: '600' },
  exerciseCard: {
    backgroundColor: '#1a1a2e', borderRadius: 12, padding: 14,
    marginBottom: 10, borderWidth: 1, borderColor: '#2a2a3e',
  },
  exerciseCardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  exerciseNum: { color: '#2ecc71', fontWeight: '700', fontSize: 13 },
  exRow: { flexDirection: 'row', gap: 8 },
  exSmall: { flex: 1 },
});
