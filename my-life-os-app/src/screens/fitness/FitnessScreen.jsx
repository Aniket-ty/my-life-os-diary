import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  StatusBar, RefreshControl, Alert, ActivityIndicator,
} from 'react-native';
import { useFitnessStore } from '../../stores/fitnessStore';
import { useBodyScanStore } from '../../stores/bodyScanStore';
import { Ionicons } from '@expo/vector-icons';
import moment from 'moment';
import NutritionBar from '../../components/fitness/NutritionBar';
import FloatingAIButton from '../../components/ai/FloatingAIButton';
import GlobalAISheet from '../../components/ai/GlobalAISheet';
import PageHeader from '../../components/ui/PageHeader';
import GlassCard from '../../components/ui/GlassCard';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import { colors, spacing, radii, tint, overlays, shadow } from '../../theme';

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'];
const MEAL_ICONS = { breakfast: '🌅', lunch: '☀️', dinner: '🌙', snack: '🍎' };

export default function FitnessScreen({ navigation }) {
  const { workouts, summary, nutrition, goals, loading,
    fetchWorkouts, fetchSummary, fetchNutrition, fetchGoals,
    deleteWorkout, updateWorkout, deleteFood } = useFitnessStore();

  const [today] = useState(moment().format('YYYY-MM-DD'));
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('workouts');
  const aiSheetRef = useRef(null);
  const { scans: bodyScans, fetchScans: fetchBodyScans } = useBodyScanStore();
  const [scanChecked, setScanChecked] = useState(false);

  useEffect(() => {
    loadAll();
    fetchBodyScans().then(() => setScanChecked(true));
  }, []);

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
      <StatusBar barStyle="light-content" backgroundColor={colors.void} />

      <View style={styles.pageTop}>
        <PageHeader
          title="Fitness"
          subtitle="Workouts, nutrition & daily goals"
          icon={<Ionicons name="barbell" size={22} />}
          accent={colors.emerald}
          action={
            <View style={styles.headerButtons}>
              <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.navigate('WorkoutPlanner')}>
                <Ionicons name="calendar-outline" size={15} color={colors.emerald} />
                <Text style={styles.headerBtnText}>Plan</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.headerBtn, styles.headerBtnRose]} onPress={() => navigation.navigate('BodyScan')}>
                <Ionicons name="scan-outline" size={15} color={colors.rose} />
                <Text style={[styles.headerBtnText, styles.headerBtnTextRose]}>Body Scan</Text>
              </TouchableOpacity>
            </View>
          }
        />
      </View>

      {!scanChecked ? (
        <View style={styles.gateWrap}>
          <ActivityIndicator size="large" color={colors.emerald} />
        </View>
      ) : (!bodyScans || bodyScans.length === 0) ? (
        <View style={styles.gateWrap}>
          <GlassCard strong style={styles.gateCard}>
            <View style={[styles.gateIcon, { backgroundColor: tint(colors.rose, 0.16), borderColor: tint(colors.rose, 0.35) }]}>
              <Ionicons name="scan-outline" size={28} color={colors.rose} />
            </View>
            <Text style={styles.gateTitle}>Complete your body scan first</Text>
            <Text style={styles.gateSub}>
              Nutrition targets (calories, protein, carbs, fat) are calculated from your body measurements.
              Log a quick body scan to unlock your personalized targets.
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
      ) : (
      <>
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
            <Ionicons
              name={tab === 'workouts' ? 'barbell-outline' : 'nutrition-outline'}
              size={15}
              color={activeTab === tab ? colors.emerald : colors.textMuted}
            />
            <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab === 'workouts' ? 'Workouts' : 'Nutrition'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.emerald} />}
        showsVerticalScrollIndicator={false}
      >
        {activeTab === 'workouts' ? (
          <>
            {workouts.length === 0 ? (
              <View style={styles.empty}>
                <GlassCard style={styles.emptyCard} padded={false}>
                  <View style={styles.emptyInner}>
                    <Ionicons name="barbell" size={34} color={tint(colors.emerald, 0.7)} />
                    <Text style={styles.emptyTitle}>No workouts today</Text>
                    <Text style={styles.emptySubText}>Tap + to add an exercise</Text>
                    <Button
                      size="sm"
                      variant="secondary"
                      onPress={() => navigation.navigate('WorkoutPlanner')}
                      icon={<Ionicons name="calendar" size={14} color={colors.emerald} />}
                      style={styles.emptyBtn}
                      textStyle={{ color: colors.emerald }}
                    >
                      Open Workout Planner
                    </Button>
                  </View>
                </GlassCard>
              </View>
            ) : (
              workouts.map((workout) => (
                <GlassCard
                  key={workout.id}
                  style={[styles.workoutCard, workout.status === 'completed' && styles.workoutCardDone]}
                >
                  <View style={styles.workoutHeader}>
                    <TouchableOpacity
                      style={[styles.statusBadge, workout.status === 'completed' && styles.statusDone]}
                      onPress={() => toggleWorkoutStatus(workout)}
                    >
                      <Ionicons
                        name={workout.status === 'completed' ? 'checkmark-circle' : 'time-outline'}
                        size={15}
                        color={workout.status === 'completed' ? colors.emerald : colors.amber}
                      />
                      <Text style={[styles.statusText, workout.status === 'completed' && { color: colors.emerald }]}>
                        {workout.status}
                      </Text>
                    </TouchableOpacity>
                    <Badge tone={workout.status === 'completed' ? 'emerald' : 'slate'}>
                      {workout.status}
                    </Badge>
                    <TouchableOpacity onPress={() => confirmDeleteWorkout(workout.id)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                      <Ionicons name="trash-outline" size={16} color={colors.textFaint} />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.workoutName} numberOfLines={1}>{workout.name}</Text>
                  <View style={styles.metaRow}>
                    {workout.durationMin && (
                      <View style={styles.metaItem}>
                        <Ionicons name="timer-outline" size={12} color={colors.textMuted} />
                        <Text style={styles.workoutMeta}>{workout.durationMin} min</Text>
                      </View>
                    )}
                    {workout.totalCaloriesBurned && (
                      <View style={styles.metaItem}>
                        <Ionicons name="flame-outline" size={12} color={colors.orange} />
                        <Text style={styles.workoutMeta}>{workout.totalCaloriesBurned} kcal</Text>
                      </View>
                    )}
                    {workout.exercises?.length > 0 && (
                      <View style={styles.metaItem}>
                        <Ionicons name="list-outline" size={12} color={colors.textMuted} />
                        <Text style={styles.workoutMeta}>{workout.exercises.length} exercises</Text>
                      </View>
                    )}
                  </View>
                  {workout.exercises?.length > 0 && (
                    <View style={styles.exerciseChips}>
                      {workout.exercises.map((ex, i) => (
                        <View key={i} style={styles.exerciseChip}>
                          <Text style={styles.exerciseChipText} numberOfLines={1}>
                            {ex.exerciseName}
                            {ex.sets ? ` · ${ex.sets}×${ex.reps ?? ''}` : ''}
                            {ex.weightKg ? ` · ${ex.weightKg} kg` : ''}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                </GlassCard>
              ))
            )}
          </>
        ) : (
          MEAL_TYPES.map((meal) => {
            const items = nutrition.filter((n) => n.mealType === meal);
            return (
              <GlassCard key={meal} style={styles.mealSection} padded={false}>
                <View style={styles.mealHeader}>
                  <View style={styles.mealHeaderLeft}>
                    <Text style={styles.mealEmoji}>{MEAL_ICONS[meal]}</Text>
                    <Text style={styles.mealTitle}>{meal.charAt(0).toUpperCase() + meal.slice(1)}</Text>
                  </View>
                  <Text style={styles.mealCalories}>{items.reduce((s, i) => s + i.calories, 0)} kcal</Text>
                </View>
                {items.length === 0
                  ? <Text style={styles.mealEmpty}>Nothing logged yet</Text>
                  : items.map((item) => (
                    <View key={item.id} style={styles.foodRow}>
                      <View style={styles.foodInfo}>
                        <View style={styles.foodNameRow}>
                          <Text style={styles.foodName} numberOfLines={1}>{item.foodName}</Text>
                          {item.aiSuggested && <Badge tone="violet" style={styles.aiBadge}>Suggested</Badge>}
                        </View>
                        <View style={styles.foodMacros}>
                          {item.quantity && <Text style={styles.foodQty} numberOfLines={1}>{item.quantity}</Text>}
                          {item.proteinG ? <View style={styles.macroChip}><Text style={styles.macroVal}>P {item.proteinG}g</Text></View> : null}
                          {item.carbsG ? <View style={styles.macroChip}><Text style={styles.macroVal}>C {item.carbsG}g</Text></View> : null}
                          {item.fatG ? <View style={styles.macroChip}><Text style={styles.macroVal}>F {item.fatG}g</Text></View> : null}
                        </View>
                      </View>
                      <Text style={styles.foodCal}>{item.calories}</Text>
                      <TouchableOpacity onPress={() => deleteFood(item.id)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                        <Ionicons name="close-circle-outline" size={18} color={colors.textFaint} />
                      </TouchableOpacity>
                    </View>
                  ))
                }
              </GlassCard>
            );
          })
        )}
      </ScrollView>

      {/* FAB for adding workout/food */}
      <TouchableOpacity
        style={styles.addFab}
        onPress={() => navigation.navigate(activeTab === 'workouts' ? 'AddWorkout' : 'LogFood')}
      >
        <Ionicons name="add" size={26} color={colors.white} />
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
      </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.void },
  pageTop: { paddingTop: 56, paddingHorizontal: spacing.xl },
  headerButtons: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  headerBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: tint(colors.emerald, 0.12), borderColor: tint(colors.emerald, 0.35),
    borderWidth: 1, borderRadius: radii.pill, paddingHorizontal: 10, paddingVertical: 6,
  },
  headerBtnText: { color: colors.emerald, fontSize: 12, fontWeight: '600' },
  headerBtnRose: { backgroundColor: tint(colors.rose, 0.1), borderColor: tint(colors.rose, 0.3) },
  headerBtnTextRose: { color: colors.rose },
  gateWrap: {
    flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28,
  },
  gateCard: {
    alignItems: 'center', alignSelf: 'stretch', paddingVertical: 36,
  },
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
  tabs: {
    flexDirection: 'row', marginHorizontal: spacing.xl, marginBottom: spacing.sm,
    backgroundColor: colors.surface, borderRadius: radii.pill, padding: 4,
    borderWidth: 1, borderColor: colors.edge,
  },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 9, borderRadius: radii.pill },
  tabActive: { backgroundColor: tint(colors.emerald, 0.16) },
  tabText: { fontSize: 13, color: colors.textMuted, fontWeight: '600' },
  tabTextActive: { color: colors.emerald },
  scroll: { paddingHorizontal: spacing.xl, paddingBottom: 130, paddingTop: spacing.sm },
  workoutCard: { marginBottom: spacing.md, padding: spacing.lg },
  workoutCardDone: {
    backgroundColor: tint(colors.emerald, 0.05), borderColor: tint(colors.emerald, 0.35),
  },
  workoutHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: overlays.mid, borderRadius: radii.pill,
    paddingHorizontal: spacing.sm, paddingVertical: 4, borderWidth: 1, borderColor: colors.edge,
  },
  statusDone: { backgroundColor: tint(colors.emerald, 0.14), borderColor: tint(colors.emerald, 0.4) },
  statusText: { fontSize: 12, color: colors.amber, textTransform: 'capitalize', fontWeight: '600' },
  workoutName: { fontSize: 18, fontWeight: '700', color: colors.white, marginBottom: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, flexWrap: 'wrap' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  workoutMeta: { fontSize: 12, color: colors.textMuted },
  exerciseChips: {
    flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm,
    marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: overlays.borderSoft,
  },
  exerciseChip: {
    backgroundColor: overlays.faint, borderRadius: radii.sm,
    paddingHorizontal: spacing.sm, paddingVertical: 5, maxWidth: '48%',
  },
  exerciseChipText: { fontSize: 11, color: colors.textSoft, fontWeight: '500' },
  empty: { paddingTop: 40 },
  emptyCard: { alignItems: 'center', justifyContent: 'center', paddingVertical: 36 },
  emptyInner: { alignItems: 'center' },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: colors.text, marginTop: spacing.md, marginBottom: 6 },
  emptySubText: { fontSize: 13, color: colors.textFaint, textAlign: 'center' },
  emptyBtn: {
    marginTop: spacing.xl, backgroundColor: tint(colors.emerald, 0.1), borderColor: tint(colors.emerald, 0.35),
  },
  mealSection: { marginBottom: spacing.md, padding: spacing.lg },
  mealHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm },
  mealHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  mealEmoji: { fontSize: 15 },
  mealTitle: { fontSize: 15, fontWeight: '700', color: colors.white },
  mealCalories: { fontSize: 13, color: colors.emerald, fontWeight: '600' },
  mealEmpty: { fontSize: 13, color: colors.textFaint, fontStyle: 'italic', paddingTop: spacing.sm },
  foodRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: spacing.sm, borderTopWidth: 1, borderTopColor: overlays.borderSoft, gap: spacing.sm,
  },
  foodInfo: { flex: 1, minWidth: 0 },
  foodNameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  aiBadge: { paddingHorizontal: 6, paddingVertical: 2 },
  foodName: { fontSize: 14, color: colors.text, fontWeight: '600', flexShrink: 1 },
  foodMacros: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 3, flexWrap: 'wrap' },
  foodQty: { fontSize: 11, color: colors.textFaint, maxWidth: 120 },
  macroChip: {
    backgroundColor: tint(colors.emerald, 0.12), borderRadius: radii.sm,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  macroVal: { fontSize: 11, color: colors.emerald, fontWeight: '600' },
  foodCal: { fontSize: 15, fontWeight: '700', color: colors.white, minWidth: 48, textAlign: 'right' },
  addFab: {
    position: 'absolute', bottom: 92, right: 24,
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: colors.emerald, alignItems: 'center', justifyContent: 'center',
    ...shadow.glow(colors.emerald),
  },
});