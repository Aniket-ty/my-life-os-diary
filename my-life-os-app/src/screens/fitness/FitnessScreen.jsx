import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  StatusBar, RefreshControl, Alert, ActivityIndicator,
  TextInput, KeyboardAvoidingView, Platform, Dimensions,
} from 'react-native';
import { useFitnessStore } from '../../stores/fitnessStore';
import { useWorkoutPlanStore } from '../../stores/workoutPlanStore';
import { useBodyScanStore } from '../../stores/bodyScanStore';
import { aiAPI } from '../../services/aiService';
import { Ionicons } from '@expo/vector-icons';
import moment from 'moment';
import NutritionBar from '../../components/fitness/NutritionBar';
import FloatingAIButton from '../../components/ai/FloatingAIButton';
import GlobalAISheet from '../../components/ai/GlobalAISheet';
import PageHeader from '../../components/ui/PageHeader';
import GlassCard from '../../components/ui/GlassCard';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import { colors, spacing, radii, type as typ, tint, overlays, shadow } from '../../theme';

const MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snack'];
const MEAL_ICONS = { breakfast: '🌅', lunch: '☀️', dinner: '🌙', snack: '🍎' };
const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function FitnessScreen({ navigation, route }) {
  const { workouts, summary, nutrition, goals, loading,
    fetchWorkouts, fetchSummary, fetchNutrition, fetchGoals,
    deleteWorkout, updateWorkout, deleteFood } = useFitnessStore();

  const { plans, activePlan, fetchPlans: fetchWorkoutPlans, applyDay } = useWorkoutPlanStore();
  const { scans: bodyScans, fetchScans: fetchBodyScans } = useBodyScanStore();

  const initialTab = route?.params?.tab || 'activity';
  const [activeTab, setActiveTab] = useState(
    ['activity', 'planner', 'bodyscan'].includes(initialTab) ? initialTab : 'activity'
  ); // 'activity' | 'planner' | 'bodyscan'
  const [activitySubTab, setActivitySubTab] = useState('workouts'); // 'workouts' | 'nutrition'
  const [today] = useState(moment().format('YYYY-MM-DD'));
  const [refreshing, setRefreshing] = useState(false);
  const [scanChecked, setScanChecked] = useState(false);
  const aiSheetRef = useRef(null);

  useEffect(() => {
    loadAll();
    fetchBodyScans().then(() => setScanChecked(true));
    fetchWorkoutPlans().catch(() => {});
  }, []);

  const loadAll = async () => {
    await Promise.all([
      fetchWorkouts(today),
      fetchSummary(today),
      fetchNutrition(today),
      fetchGoals(),
      fetchWorkoutPlans(),
    ]);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadAll();
    setRefreshing(false);
  };

  const toggleWorkoutStatus = async (workout) => {
    const newStatus = workout.status === 'completed' ? 'planned' : 'completed';
    await updateWorkout(workout.id, { ...workout, status: newStatus });
  };

  const confirmDeleteWorkout = (id) => {
    Alert.alert('Delete Workout', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteWorkout(id) },
    ]);
  };

  const handleApplyDayToToday = async (day) => {
    if (!activePlan) return;
    try {
      await applyDay(activePlan.id, day.id, moment().format('YYYY-MM-DD'));
      await fetchWorkouts(today);
      Alert.alert('Workout Added', `"${day.workoutName || 'Workout'}" was added to today's activity log!`);
    } catch (e) {
      Alert.alert('Error', e.message || 'Could not add workout to today.');
    }
  };

  const latestScan = bodyScans && bodyScans.length > 0 ? bodyScans[0] : null;
  const baselineScan = bodyScans && bodyScans.length > 1 ? bodyScans[bodyScans.length - 1] : null;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.void} />

      <View style={styles.pageTop}>
        <PageHeader
          title="Fitness"
          subtitle="Workouts, workout plan & body scan"
          icon={<Ionicons name="barbell" size={22} />}
          accent={colors.volt400}
          action={
            activeTab === 'activity' ? (
              <View style={styles.headerButtons}>
                <TouchableOpacity
                  style={styles.headerBtn}
                  onPress={() => navigation.navigate(activitySubTab === 'workouts' ? 'AddWorkout' : 'LogFood')}
                >
                  <Ionicons name="add" size={16} color={colors.volt400} />
                  <Text style={styles.headerBtnText}>{activitySubTab === 'workouts' ? 'Workout' : 'Food'}</Text>
                </TouchableOpacity>
              </View>
            ) : null
          }
        />

        {/* 3 Unified Fitness Hub Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hubTabsScroll}>
          {[
            { id: 'activity', label: 'Activity & Logs', icon: 'barbell-outline' },
            { id: 'planner', label: 'Workout Plan', icon: 'calendar-outline' },
            { id: 'bodyscan', label: 'Body Scan', icon: 'scan-outline' },
          ].map((tab) => (
            <TouchableOpacity
              key={tab.id}
              style={[styles.hubTab, activeTab === tab.id && styles.hubTabActive]}
              onPress={() => setActiveTab(tab.id)}
              activeOpacity={0.8}
            >
              <Ionicons
                name={tab.icon}
                size={15}
                color={activeTab === tab.id ? colors.white : colors.textMuted}
              />
              <Text style={[styles.hubTabText, activeTab === tab.id && styles.hubTabTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {!scanChecked ? (
        <View style={styles.gateWrap}>
          <ActivityIndicator size="large" color={colors.volt400} />
        </View>
      ) : (!bodyScans || bodyScans.length === 0) ? (
        <View style={styles.gateWrap}>
          <GlassCard strong style={styles.gateCard}>
            <View style={[styles.gateIcon, { backgroundColor: tint(colors.rose, 0.16), borderColor: tint(colors.rose, 0.35) }]}>
              <Ionicons name="scan-outline" size={28} color={colors.rose} />
            </View>
            <Text style={styles.gateTitle}>Complete your body scan first</Text>
            <Text style={styles.gateSub}>
              Nutrition targets and workout plans are calculated from your body measurements.
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
          {/* TAB 1: ACTIVITY & LOGS */}
          {activeTab === 'activity' && (
            <>
              <NutritionBar summary={summary} goals={goals} />

              {/* Workouts / Nutrition Sub-tabs */}
              <View style={styles.subTabs}>
                {['workouts', 'nutrition'].map((tab) => (
                  <TouchableOpacity
                    key={tab}
                    style={[styles.subTab, activitySubTab === tab && styles.subTabActive]}
                    onPress={() => setActivitySubTab(tab)}
                  >
                    <Ionicons
                      name={tab === 'workouts' ? 'barbell-outline' : 'nutrition-outline'}
                      size={14}
                      color={activitySubTab === tab ? colors.volt400 : colors.textMuted}
                    />
                    <Text style={[styles.subTabText, activitySubTab === tab && styles.subTabTextActive]}>
                      {tab === 'workouts' ? 'Today\'s Workouts' : 'Nutrition Log'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <ScrollView
                contentContainerStyle={styles.scroll}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.volt400} />}
                showsVerticalScrollIndicator={false}
              >
                {activitySubTab === 'workouts' ? (
                  <>
                    {/* Gym Quick Actions */}
                    <View style={styles.gymActions}>
                      <TouchableOpacity
                        style={[styles.gymActionCard, { borderColor: tint(colors.volt400, 0.4) }]}
                        activeOpacity={0.8}
                        onPress={() => navigation.navigate('ExerciseCatalog')}
                      >
                        <View style={[styles.gymActionIcon, { backgroundColor: tint(colors.volt500, 0.18) }]}>
                          <Ionicons name="library-outline" size={22} color={colors.volt400} />
                        </View>
                        <Text style={styles.gymActionTitle}>Exercise Library</Text>
                        <Text style={styles.gymActionSub}>Browse 200+ exercises</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.gymActionCard, { borderColor: tint(colors.violet, 0.4) }]}
                        activeOpacity={0.8}
                        onPress={() => navigation.navigate('VoiceAssistant')}
                      >
                        <View style={[styles.gymActionIcon, { backgroundColor: tint(colors.violet, 0.18) }]}>
                          <Ionicons name="scan-outline" size={22} color={colors.violet} />
                        </View>
                        <Text style={styles.gymActionTitle}>Scan Machine</Text>
                        <Text style={styles.gymActionSub}>Identify gym equipment</Text>
                      </TouchableOpacity>
                    </View>

                    {workouts.length === 0 ? (
                      <View style={styles.empty}>
                        <GlassCard style={styles.emptyCard} padded={false}>
                          <View style={styles.emptyInner}>
                            <Ionicons name="barbell" size={34} color={tint(colors.volt400, 0.7)} />
                            <Text style={styles.emptyTitle}>No workouts logged today</Text>
                            <Text style={styles.emptySubText}>Pick from your workout plan or add a custom workout</Text>
                            <View style={styles.emptyActions}>
                              <Button
                                size="sm"
                                variant="secondary"
                                onPress={() => setActiveTab('planner')}
                                icon={<Ionicons name="calendar" size={14} color={colors.volt400} />}
                                style={styles.emptyBtn}
                                textStyle={{ color: colors.volt300 }}
                              >
                                View Workout Plan
                              </Button>
                              <Button
                                size="sm"
                                onPress={() => navigation.navigate('AddWorkout')}
                                icon={<Ionicons name="add" size={14} />}
                                style={styles.primaryAddBtn}
                              >
                                Add Workout
                              </Button>
                            </View>
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
            </>
          )}

          {/* TAB 2: WORKOUT PLAN */}
          {activeTab === 'planner' && (
            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
              <View style={styles.plannerHeaderCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.plannerTitle}>Weekly AI Workout Schedule</Text>
                  <Text style={styles.plannerSubtitle}>
                    {activePlan ? `${activePlan.name} · ${activePlan.daysPerWeek || 5} days/wk` : 'Custom structured schedule'}
                  </Text>
                </View>
                <Button
                  size="sm"
                  onPress={() => navigation.navigate('WorkoutPlanner')}
                  style={styles.openPlannerBtn}
                  icon={<Ionicons name="sparkles" size={14} />}
                >
                  Edit / Generate
                </Button>
              </View>

              {activePlan?.days && activePlan.days.length > 0 ? (
                <GlassCard padded={false} style={styles.weekCard}>
                  {Array.from({ length: 7 }, (_, i) => {
                    const d = moment().startOf('week').add(i, 'days');
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
                          <View style={styles.dayCell}>
                            <Text style={styles.dayWorkoutName} numberOfLines={1}>{day.workoutName || 'Workout'}</Text>
                            <Text style={styles.dayMuscle} numberOfLines={1}>{day.muscleGroup}</Text>
                            <View style={{ marginTop: 4, gap: 2 }}>
                              {day.exercises?.slice(0, 3).map((ex, exi) => (
                                <Text key={exi} style={styles.dayExercises} numberOfLines={1}>
                                  • {ex.name} <Text style={styles.exSubText}>({ex.sets || 3}×{ex.reps || '10'}{ex.restSec ? ` · ${ex.restSec}s` : ''})</Text>
                                </Text>
                              ))}
                            </View>
                          </View>
                        )}
                        {!day?.restDay && day && (
                          <TouchableOpacity
                            style={styles.applyBtn}
                            onPress={() => handleApplyDayToToday(day)}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                          >
                            <Ionicons name="checkmark-circle-outline" size={24} color={colors.volt400} />
                          </TouchableOpacity>
                        )}
                      </View>
                    );
                  })}
                </GlassCard>
              ) : (
                <GlassCard style={styles.emptyCard}>
                  <Ionicons name="calendar-outline" size={36} color={colors.volt400} />
                  <Text style={styles.emptyTitle}>No workout plan active</Text>
                  <Text style={styles.emptySubText}>Generate a personalized weekly schedule with target splits and duration.</Text>
                  <Button
                    size="md"
                    onPress={() => navigation.navigate('WorkoutPlanner')}
                    style={styles.primaryAddBtn}
                    icon={<Ionicons name="sparkles" size={16} />}
                  >
                    Create Workout Plan
                  </Button>
                </GlassCard>
              )}
            </ScrollView>
          )}

          {/* TAB 3: BODY SCAN */}
          {activeTab === 'bodyscan' && (
            <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
              <View style={styles.scanHeaderRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.plannerTitle}>Body Scan & Measurements</Text>
                  <Text style={styles.plannerSubtitle}>Track body composition, weight and circumference</Text>
                </View>
                <Button
                  size="sm"
                  onPress={() => navigation.navigate('BodyScan')}
                  style={styles.openPlannerBtn}
                  icon={<Ionicons name="scan" size={14} />}
                >
                  Full Scan Hub
                </Button>
              </View>

              {latestScan ? (
                <View style={styles.scanMetricsGrid}>
                  <GlassCard style={styles.metricCard}>
                    <Text style={styles.metricLabel}>Weight</Text>
                    <Text style={styles.metricValue}>{Number(latestScan.weight).toFixed(1)} <Text style={styles.metricUnit}>kg</Text></Text>
                    {baselineScan && (
                      <Text style={styles.metricDelta}>
                        {(Number(latestScan.weight) - Number(baselineScan.weight)).toFixed(1)} kg from start
                      </Text>
                    )}
                  </GlassCard>

                  <GlassCard style={styles.metricCard}>
                    <Text style={styles.metricLabel}>Body Fat</Text>
                    <Text style={styles.metricValue}>
                      {latestScan.bodyFatPct != null ? `${Number(latestScan.bodyFatPct).toFixed(1)}%` : '—'}
                    </Text>
                    <Text style={styles.metricDelta}>Target: 12-15%</Text>
                  </GlassCard>

                  <GlassCard style={styles.metricCard}>
                    <Text style={styles.metricLabel}>Muscle Mass</Text>
                    <Text style={styles.metricValue}>
                      {latestScan.muscleMassKg != null ? `${Number(latestScan.muscleMassKg).toFixed(1)} kg` : '—'}
                    </Text>
                    <Text style={styles.metricDelta}>Lean tissue</Text>
                  </GlassCard>

                  <GlassCard style={styles.metricCard}>
                    <Text style={styles.metricLabel}>Bio Age / BMR</Text>
                    <Text style={styles.metricValue}>
                      {latestScan.bmr ? `${latestScan.bmr} kcal` : latestScan.bioAge ? `${latestScan.bioAge} yrs` : '—'}
                    </Text>
                    <Text style={styles.metricDelta}>Metabolic rate</Text>
                  </GlassCard>
                </View>
              ) : null}

              <Button
                size="md"
                onPress={() => navigation.navigate('BodyScan')}
                style={styles.primaryAddBtn}
                icon={<Ionicons name="add-circle-outline" size={16} />}
              >
                Log New Scan Entry
              </Button>
            </ScrollView>
          )}

          {/* Global AI Sheet Trigger */}
          <FloatingAIButton onPress={() => aiSheetRef.current?.present()} />
          <GlobalAISheet
            sheetRef={aiSheetRef}
            context="fitness"
            contextData={{
              todayCalories: summary?.totals?.calories || 0,
              calorieGoal: Number(summary?.goals?.dailyCalories) || 2097,
              caloriesLeft: Math.max((Number(summary?.goals?.dailyCalories) || 2097) - (summary?.totals?.calories || 0), 0),
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
    backgroundColor: tint(colors.volt, 0.14), borderColor: tint(colors.volt, 0.35),
    borderWidth: 1, borderRadius: radii.pill, paddingHorizontal: 12, paddingVertical: 6,
  },
  headerBtnText: { color: colors.volt300, fontSize: 12, fontWeight: '700' },
  hubTabsScroll: { flexDirection: 'row', gap: 8, paddingVertical: 10, marginTop: 4 },
  hubTab: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: colors.card, borderRadius: radii.pill,
    paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: colors.edge,
  },
  hubTabActive: {
    backgroundColor: colors.volt500, borderColor: colors.volt500,
    ...shadow.glow(colors.volt500),
  },
  hubTabText: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
  hubTabTextActive: { color: colors.white, fontWeight: '700' },
  subTabs: {
    flexDirection: 'row', paddingHorizontal: spacing.xl, gap: 10, marginBottom: 8,
  },
  subTab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 8, borderRadius: radii.md, backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.edge,
  },
  subTabActive: {
    backgroundColor: tint(colors.volt, 0.12), borderColor: colors.volt400,
  },
  subTabText: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
  subTabTextActive: { color: colors.volt300, fontWeight: '700' },
  scroll: { paddingHorizontal: spacing.xl, paddingBottom: 80, paddingTop: 4 },
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
  empty: { marginTop: spacing.md },
  gymActions: {
    flexDirection: 'row', gap: 10, marginBottom: spacing.md,
  },
  gymActionCard: {
    flex: 1, backgroundColor: colors.card, borderRadius: radii.xl,
    borderWidth: 1, padding: 14, alignItems: 'center', gap: 8,
  },
  gymActionIcon: {
    width: 44, height: 44, borderRadius: radii.lg,
    alignItems: 'center', justifyContent: 'center',
  },
  gymActionTitle: { fontSize: 13, fontWeight: '700', color: colors.white, textAlign: 'center' },
  gymActionSub: { fontSize: 11, color: colors.textMuted, textAlign: 'center' },
  emptyCard: { alignItems: 'center', justifyContent: 'center', paddingVertical: 32 },
  emptyInner: { alignItems: 'center', paddingHorizontal: 16 },
  emptyTitle: { fontSize: 16, fontWeight: '800', color: colors.white, marginTop: spacing.md },
  emptySubText: { fontSize: 12, color: colors.textMuted, textAlign: 'center', marginTop: 4, lineHeight: 18 },
  emptyActions: { flexDirection: 'row', gap: 8, marginTop: spacing.lg },
  emptyBtn: { borderColor: colors.volt400 },
  primaryAddBtn: {
    backgroundColor: colors.volt500, borderColor: colors.volt500,
    shadowColor: colors.volt500, marginTop: spacing.md,
  },
  workoutCard: {
    marginBottom: spacing.sm, borderRadius: radii.xl, borderWidth: 1, borderColor: colors.edge,
  },
  workoutCardDone: { borderColor: tint(colors.emerald, 0.4), backgroundColor: tint(colors.emerald, 0.04) },
  workoutHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: radii.pill, backgroundColor: tint(colors.amber, 0.12),
  },
  statusDone: { backgroundColor: tint(colors.emerald, 0.15) },
  statusText: { fontSize: 11, fontWeight: '700', color: colors.amber, textTransform: 'capitalize' },
  workoutName: { fontSize: 15, fontWeight: '700', color: colors.white },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 6 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  workoutMeta: { fontSize: 12, color: colors.textMuted },
  exerciseChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  exerciseChip: {
    backgroundColor: colors.surface, paddingHorizontal: 8, paddingVertical: 4, borderRadius: radii.sm,
    borderWidth: 1, borderColor: colors.edge,
  },
  exerciseChipText: { fontSize: 11, color: colors.textSoft },
  mealSection: { marginBottom: spacing.sm, borderRadius: radii.xl, overflow: 'hidden' },
  mealHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 14, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.edge,
  },
  mealHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  mealEmoji: { fontSize: 16 },
  mealTitle: { fontSize: 14, fontWeight: '700', color: colors.white },
  mealCalories: { fontSize: 13, fontWeight: '700', color: colors.volt300 },
  mealEmpty: { padding: 14, fontSize: 12, color: colors.textFaint, textAlign: 'center' },
  foodRow: {
    flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: overlays.borderSoft, gap: 8,
  },
  foodInfo: { flex: 1 },
  foodNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  foodName: { fontSize: 13, fontWeight: '600', color: colors.text },
  aiBadge: { paddingHorizontal: 6, paddingVertical: 2 },
  foodMacros: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 },
  foodQty: { fontSize: 11, color: colors.textFaint },
  macroChip: { backgroundColor: overlays.soft, paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4 },
  macroVal: { fontSize: 10, color: colors.textMuted, fontWeight: '600' },
  foodCal: { fontSize: 13, fontWeight: '700', color: colors.textSoft },
  plannerHeaderCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: 14, borderRadius: radii.xl, backgroundColor: colors.card,
    borderWidth: 1, borderColor: colors.edge, marginBottom: spacing.sm,
  },
  plannerTitle: { fontSize: 15, fontWeight: '700', color: colors.white },
  plannerSubtitle: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  openPlannerBtn: {
    backgroundColor: colors.volt500, borderColor: colors.volt500,
  },
  weekCard: {
    backgroundColor: colors.surface, borderRadius: radii.xl, padding: spacing.sm,
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
  dayWorkoutName: { fontSize: 13, fontWeight: '700', color: colors.white },
  dayMuscle: { fontSize: 11, color: colors.textFaint, marginTop: 2 },
  dayExercises: { fontSize: 11, color: colors.textSoft },
  exSubText: { color: colors.textFaint, fontSize: 10 },
  restCell: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  applyBtn: { marginLeft: spacing.sm, padding: spacing.xs },
  scanHeaderRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  scanMetricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: spacing.md },
  metricCard: {
    width: (Dimensions.get('window').width - 40 - 10) / 2, padding: 14, borderRadius: radii.xl,
  },
  metricLabel: { ...typ.label, fontSize: 10 },
  metricValue: { fontSize: 20, fontWeight: '800', color: colors.white, marginTop: 4 },
  metricUnit: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
  metricDelta: { fontSize: 11, color: colors.volt400, marginTop: 4, fontWeight: '600' },
});