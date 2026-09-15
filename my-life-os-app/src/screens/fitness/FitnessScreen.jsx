import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  StatusBar, RefreshControl, Alert,
} from 'react-native';
import { useFitnessStore } from '../../stores/fitnessStore';
import { Ionicons } from '@expo/vector-icons';
import moment from 'moment';
import NutritionBar from '../../components/fitness/NutritionBar';
import FloatingAIButton from '../../components/ai/FloatingAIButton';
import GlobalAISheet from '../../components/ai/GlobalAISheet';

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'];
const MEAL_ICONS = { breakfast: '🌅', lunch: '☀️', dinner: '🌙', snack: '🍎' };

export default function FitnessScreen({ navigation }) {
  const { workouts, summary, nutrition, loading,
    fetchWorkouts, fetchSummary, fetchNutrition, fetchGoals,
    deleteWorkout, updateWorkout, deleteFood } = useFitnessStore();

  const [today] = useState(moment().format('YYYY-MM-DD'));
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('workouts');
  const aiSheetRef = useRef(null);

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    await Promise.all([
      fetchWorkouts(today),
      fetchSummary(today),
      fetchNutrition(today),
      fetchGoals(),
    ]);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAll();
    setRefreshing(false);
  };

  const toggleWorkoutStatus = async (workout) => {
    const newStatus = workout.status === 'planned' ? 'completed' : 'planned';
    await updateWorkout(workout.id, { ...workout, status: newStatus });
  };

  const confirmDeleteWorkout = (id) => {
    Alert.alert('Delete Workout', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteWorkout(id) },
    ]);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />

      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Fitness Journal</Text>
          <Text style={styles.headerDate}>{moment().format('dddd, MMMM D')}</Text>
        </View>
        <TouchableOpacity style={styles.scanBtn} onPress={() => navigation.navigate('BodyScan')}>
          <Ionicons name="scan-outline" size={16} color="#e74c3c" />
          <Text style={styles.scanBtnText}>Body Scan</Text>
        </TouchableOpacity>
      </View>

      {/* Smart Nutrition Bar */}
      <NutritionBar summary={summary} goals={goals} />

      {/* Tabs */}
      <View style={styles.tabs}>
        {['workouts', 'nutrition'].map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab === 'workouts' ? '💪 Workouts' : '🥗 Nutrition'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2ecc71" />}
      >
        {activeTab === 'workouts' ? (
          <>
            {workouts.length === 0 ? (
              <View style={styles.empty}>
                <Text style={styles.emptyEmoji}>🏋️</Text>
                <Text style={styles.emptyText}>No workouts today</Text>
                <Text style={styles.emptySubText}>Tap + or ask AI to plan your workout</Text>
              </View>
            ) : (
              workouts.map((workout) => (
                <View key={workout.id} style={styles.workoutCard}>
                  <View style={styles.workoutHeader}>
                    <TouchableOpacity
                      style={[styles.statusBadge, workout.status === 'completed' && styles.statusDone]}
                      onPress={() => toggleWorkoutStatus(workout)}
                    >
                      <Ionicons
                        name={workout.status === 'completed' ? 'checkmark-circle' : 'time-outline'}
                        size={16}
                        color={workout.status === 'completed' ? '#2ecc71' : '#f39c12'}
                      />
                      <Text style={[styles.statusText, workout.status === 'completed' && { color: '#2ecc71' }]}>
                        {workout.status}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => confirmDeleteWorkout(workout.id)}>
                      <Ionicons name="trash-outline" size={16} color="#666" />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.workoutName}>{workout.name}</Text>
                  {workout.durationMin && <Text style={styles.workoutMeta}>⏱ {workout.durationMin} min</Text>}
                  {workout.exercises?.length > 0 && (
                    <View style={styles.exerciseList}>
                      {workout.exercises.map((ex, i) => (
                        <View key={i} style={styles.exerciseRow}>
                          <Text style={styles.exerciseDot}>•</Text>
                          <Text style={styles.exerciseName}>{ex.exerciseName}</Text>
                          {ex.sets && ex.reps && <Text style={styles.exerciseMeta}>{ex.sets}×{ex.reps}</Text>}
                          {ex.weightKg && <Text style={styles.exerciseMeta}>{ex.weightKg}kg</Text>}
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              ))
            )}
          </>
        ) : (
          MEAL_TYPES.map((meal) => {
            const items = nutrition.filter((n) => n.mealType === meal);
            return (
              <View key={meal} style={styles.mealSection}>
                <View style={styles.mealHeader}>
                  <Text style={styles.mealTitle}>{MEAL_ICONS[meal]} {meal.charAt(0).toUpperCase() + meal.slice(1)}</Text>
                  <Text style={styles.mealCalories}>{items.reduce((s, i) => s + i.calories, 0)} kcal</Text>
                </View>
                {items.length === 0
                  ? <Text style={styles.mealEmpty}>Nothing logged yet</Text>
                  : items.map((item) => (
                    <View key={item.id} style={styles.foodRow}>
                      <View style={styles.foodInfo}>
                        <Text style={styles.foodName}>{item.foodName}</Text>
                        {item.quantity && <Text style={styles.foodQty}>{item.quantity}</Text>}
                      </View>
                      <View style={styles.foodRight}>
                        <Text style={styles.foodCal}>{item.calories} kcal</Text>
                        <TouchableOpacity onPress={() => deleteFood(item.id)}>
                          <Ionicons name="close-circle-outline" size={18} color="#666" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))
                }
              </View>
            );
          })
        )}
      </ScrollView>

      {/* FAB for adding workout/food */}
      <TouchableOpacity
        style={styles.addFab}
        onPress={() => navigation.navigate(activeTab === 'workouts' ? 'AddWorkout' : 'LogFood')}
      >
        <Ionicons name="add" size={26} color="#fff" />
      </TouchableOpacity>

      {/* AI floating button */}
      <FloatingAIButton onPress={() => aiSheetRef.current?.expand()} />

      {/* AI sheet with fitness context */}
      <GlobalAISheet
        sheetRef={aiSheetRef}
        context="fitness"
        contextData={{
          todayCalories: summary?.totals?.calories || 0,
          calorieGoal: Number(summary?.goals?.dailyCalories) || Number(goals?.dailyCalories) || 2097,
          caloriesLeft: Math.max(
            (Number(summary?.goals?.dailyCalories) || Number(goals?.dailyCalories) || 2097) - (summary?.totals?.calories || 0),
            0
          ),
          proteinLeft: Math.max(
            (Number(summary?.goals?.proteinG) || Number(goals?.proteinG) || 150) - (summary?.totals?.proteinG || 0),
            0
          ).toFixed(0),
          workoutsToday: workouts.length,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f1a' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 12, backgroundColor: '#1a1a2e',
  },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#fff' },
  headerDate: { fontSize: 12, color: '#888', marginTop: 2 },
  scanBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#1a0a0a', borderRadius: 16,
    paddingHorizontal: 12, paddingVertical: 6,
    borderWidth: 1, borderColor: '#e74c3c33',
  },
  scanBtnText: { color: '#e74c3c', fontSize: 12, fontWeight: '600' },
  tabs: {
    flexDirection: 'row', marginHorizontal: 16, marginBottom: 8,
    backgroundColor: '#1a1a2e', borderRadius: 12, padding: 4,
  },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10 },
  tabActive: { backgroundColor: '#2a2a3e' },
  tabText: { fontSize: 13, color: '#666', fontWeight: '600' },
  tabTextActive: { color: '#fff' },
  scroll: { paddingHorizontal: 16, paddingBottom: 120 },
  workoutCard: {
    backgroundColor: '#1a1a2e', borderRadius: 14, padding: 16,
    marginBottom: 12, borderWidth: 1, borderColor: '#2a2a3e',
  },
  workoutHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#2a2a3e', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4,
  },
  statusDone: { backgroundColor: '#0d2818' },
  statusText: { fontSize: 12, color: '#f39c12', textTransform: 'capitalize', fontWeight: '600' },
  workoutName: { fontSize: 18, fontWeight: '700', color: '#fff', marginBottom: 4 },
  workoutMeta: { fontSize: 12, color: '#666', marginBottom: 8 },
  exerciseList: { gap: 4 },
  exerciseRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  exerciseDot: { color: '#2ecc71' },
  exerciseName: { flex: 1, fontSize: 13, color: '#ccc' },
  exerciseMeta: { fontSize: 12, color: '#666' },
  mealSection: {
    backgroundColor: '#1a1a2e', borderRadius: 14, padding: 14,
    marginBottom: 12, borderWidth: 1, borderColor: '#2a2a3e',
  },
  mealHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  mealTitle: { fontSize: 15, fontWeight: '700', color: '#fff' },
  mealCalories: { fontSize: 13, color: '#2ecc71', fontWeight: '600' },
  mealEmpty: { fontSize: 13, color: '#444', fontStyle: 'italic' },
  foodRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 6, borderTopWidth: 1, borderTopColor: '#2a2a3e',
  },
  foodInfo: { flex: 1 },
  foodName: { fontSize: 14, color: '#ccc' },
  foodQty: { fontSize: 11, color: '#666' },
  foodRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  foodCal: { fontSize: 13, color: '#f39c12', fontWeight: '600' },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 18, fontWeight: '600', color: '#444', marginBottom: 6 },
  emptySubText: { fontSize: 13, color: '#333' },
  addFab: {
    position: 'absolute', bottom: 92, right: 24,
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: '#2ecc71', alignItems: 'center', justifyContent: 'center',
    shadowColor: '#2ecc71', shadowOpacity: 0.4, shadowRadius: 8, shadowOffset: { width: 0, height: 3 },
  },
});
