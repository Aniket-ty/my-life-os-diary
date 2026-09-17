import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Modal, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform, Dimensions,
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { useBodyScanStore } from '../../stores/bodyScanStore';
import { useAuthStore } from '../../stores/authStore';
import { fitnessAPI } from '../../services/fitnessService';
import { Ionicons } from '@expo/vector-icons';
import moment from 'moment';
import Screen from '../../components/ui/Screen';
import PageHeader from '../../components/ui/PageHeader';
import GlassCard from '../../components/ui/GlassCard';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { colors, overlays, radii, spacing, tint, type as typ } from '../../theme';

const WIDTH = Dimensions.get('window').width - 40;

export default function BodyScanScreen({ navigation }) {
  const { scans, loading, fetchScans, createScan, deleteScan } = useBodyScanStore();
  const profileHeight = useAuthStore.getState().user?.heightCm
    ? String(useAuthStore.getState().user.heightCm)
    : '';
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [report, setReport] = useState(null);
  const [goals, setGoals] = useState(null);
  const [form, setForm] = useState(() => ({
    weight: '', heightCm: profileHeight, bodyFatPct: '', muscleMassKg: '',
    leanBodyMassKg: '', bmr: '', tee: '',
    visceralFat: '', bwiScore: '', bioAge: '', notes: '',
  }));

  useEffect(() => {
    fetchScans();
    fitnessAPI.getReport(30).then(setReport).catch(() => {});
    fitnessAPI.getGoals().then(setGoals).catch(() => {});
  }, []);

  useEffect(() => {
    if (!loading && scans.length === 0) {
      setShowModal(true);
    }
  }, [loading, scans.length]);

  const allScans = [...scans].sort((a, b) => new Date(a.scanDate) - new Date(b.scanDate));

  const latest = scans.length > 0 ? scans[0] : null;
  const baseline = scans.length > 0 ? scans[scans.length - 1] : null;

  const diff = (key) => {
    if (!latest || !baseline) return null;
    const d = Number(latest[key]) - Number(baseline[key]);
    return Number.isNaN(d) ? null : d;
  };

  const diffColor = (key, lowerIsBetter = false) => {
    const d = diff(key);
    if (d === null) return colors.textFaint;
    if (d === 0) return colors.textFaint;
    if (lowerIsBetter) return d < 0 ? colors.emerald : colors.rose;
    return d > 0 ? colors.emerald : colors.rose;
  };

  const diffText = (key) => {
    const d = diff(key);
    if (d === null) return '—';
    return (d > 0 ? '+' : '') + d.toFixed(1);
  };

  const handleSave = async () => {
    if (!form.weight) return Alert.alert('Required', 'Weight is required.');
    setSaving(true);
    try {
      await createScan({
        ...form,
        scanDate: moment().format('YYYY-MM-DD'),
      });
      setForm({
        weight: '', heightCm: profileHeight, bodyFatPct: '', muscleMassKg: '',
        leanBodyMassKg: '', bmr: '', tee: '',
        visceralFat: '', bwiScore: '', bioAge: '', notes: '',
      });
      setShowModal(false);
    } finally {
      setSaving(false);
    }
  };

  const chartData = (key) => {
    const data = allScans.map((s) => Number(s[key]) || 0);
    const labels = allScans.map((s) => moment(s.scanDate).format('DD/MM'));
    return { labels, datasets: [{ data }] };
  };

  const chartConfig = (color) => ({
    backgroundColor: colors.surface,
    backgroundGradientFrom: colors.surface,
    backgroundGradientTo: colors.surface,
    decimalPlaces: 1,
    color: (opacity = 1) => color,
    labelColor: () => colors.textFaint,
    strokeWidth: 2,
    propsForDots: { r: '4', strokeWidth: '2', stroke: color },
    propsForBackgroundLines: { stroke: colors.edge, strokeWidth: 1 },
  });

  const f = (val) => form[val];
  const s = (val) => (v) => setForm((prev) => ({ ...prev, [val]: v }));

  const targets = goals && goals.dailyCalories
    ? [
        { label: 'Daily calories', value: `${goals.dailyCalories} kcal`, icon: '🔥' },
        { label: 'Protein', value: `${goals.proteinG}g`, icon: '🥩' },
        { label: 'Carbs', value: `${goals.carbsG}g`, icon: '🍚' },
        { label: 'Fat', value: `${goals.fatG}g`, icon: '🥑' },
      ]
    : latest && latest.tee != null
      ? [{ label: 'Maintenance calories (TEE)', value: `${latest.tee} kcal`, icon: '🔥' }]
      : [];

  return (
    <Screen>
      <View style={styles.navBar}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={styles.backBtn}
        >
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <PageHeader
          title="Body Scan"
          subtitle="Track your body's transformation over time"
          icon={<Ionicons name="scan-outline" size={22} color={colors.rose} />}
          accent={colors.rose}
          action={
            <Button
              size="md"
              variant="danger"
              icon={<Ionicons name="add" size={16} />}
              onPress={() => setShowModal(true)}
            >
              Add scan
            </Button>
          }
        />

        {baseline && (
          <View style={styles.baselineBanner}>
            <Ionicons name="scan-outline" size={16} color={colors.rose} />
            <Text style={styles.baselineText}>
              Baseline: {moment(baseline.scanDate).format('D MMM YYYY')} · {Number(baseline.weight).toFixed(1)}kg
              {baseline.bodyFatPct != null ? ` · ${Number(baseline.bodyFatPct).toFixed(1)}% fat` : ''}
              {baseline.bwiScore != null ? ` · BWI ${Number(baseline.bwiScore).toFixed(1)}` : ''}
            </Text>
          </View>
        )}

        <Text style={styles.sectionTitle}>Progress vs Baseline</Text>
        <View style={styles.progressGrid}>
          {[
            { label: 'Weight', key: 'weight', unit: 'kg', lower: true },
            { label: 'Body Fat', key: 'bodyFatPct', unit: '%', lower: true },
            { label: 'Muscle', key: 'muscleMassKg', unit: 'kg', lower: false },
            { label: 'BWI Score', key: 'bwiScore', unit: '/10', lower: false },
          ].map((item) => (
            <GlassCard key={item.key} style={styles.progressCard}>
              <Text style={styles.progressLabel}>{item.label}</Text>
              <Text style={styles.progressBaseline}>
                {baseline && baseline[item.key] != null
                  ? `${Number(baseline[item.key]).toFixed(1)}${item.unit}`
                  : '—'}
              </Text>
              <Text style={[styles.progressDiff, { color: diffColor(item.key, item.lower) }]}>
                {latest && baseline ? `${diffText(item.key)}${item.unit}` : 'No scan data yet'}
              </Text>
              {latest && latest[item.key] != null && baseline && (
                <Text style={styles.progressCurrent}>
                  Now: {Number(latest[item.key]).toFixed(1)}{item.unit}
                </Text>
              )}
            </GlassCard>
          ))}
        </View>

        <Text style={styles.sectionTitle}>Your Targets (from scan)</Text>
        <GlassCard style={styles.targetsCard}>
          {targets.length > 0 ? targets.map((t) => (
            <View key={t.label} style={styles.targetRow}>
              <Text style={styles.targetIcon}>{t.icon}</Text>
              <Text style={styles.targetLabel}>{t.label}</Text>
              <Text style={styles.targetValue}>{t.value}</Text>
            </View>
          )) : (
            <View style={styles.targetRow}>
              <Text style={styles.targetIcon}>📊</Text>
              <Text style={styles.targetLabel}>Log a body scan with your weight & height to get targets</Text>
            </View>
          )}
        </GlassCard>

        {allScans.length > 1 && (
          <>
            <Text style={styles.sectionTitle}>Weight trend</Text>
            <LineChart
              data={chartData('weight')}
              width={WIDTH}
              height={160}
              chartConfig={chartConfig(colors.rose)}
              bezier
              style={styles.chart}
            />

            <Text style={styles.sectionTitle}>Body fat % trend</Text>
            <LineChart
              data={chartData('bodyFatPct')}
              width={WIDTH}
              height={160}
              chartConfig={chartConfig(colors.orange)}
              bezier
              style={styles.chart}
            />

            <Text style={styles.sectionTitle}>Muscle mass trend</Text>
            <LineChart
              data={chartData('muscleMassKg')}
              width={WIDTH}
              height={160}
              chartConfig={chartConfig(colors.emerald)}
              bezier
              style={styles.chart}
            />
          </>
        )}

        {report && (
          <>
            <Text style={styles.sectionTitle}>Consistency Report</Text>
            <Text style={styles.reportPeriod}>Last {report.period} days</Text>
            <View style={styles.reportRow}>
              <GlassCard style={styles.reportCard}>
                <Text style={styles.reportIcon}>💪</Text>
                <Text style={styles.reportValue}>{report.workouts.uniqueDays}/{report.period}</Text>
                <Text style={styles.reportLabel}>Workout Days</Text>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: `${report.workouts.consistencyPct}%`, backgroundColor: colors.emerald }]} />
                </View>
                <Text style={styles.reportDetail}>{report.workouts.consistencyPct}% consistency</Text>
              </GlassCard>
              <GlassCard style={styles.reportCard}>
                <Text style={styles.reportIcon}>🥗</Text>
                <Text style={styles.reportValue}>{report.nutrition.uniqueDays}/{report.period}</Text>
                <Text style={styles.reportLabel}>Nutrition Logs</Text>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: `${report.nutrition.loggingPct}%`, backgroundColor: colors.orange }]} />
                </View>
                <Text style={styles.reportDetail}>{report.nutrition.loggingPct}% logging</Text>
              </GlassCard>
            </View>
            <GlassCard style={styles.reportCardFull}>
              <Text style={styles.reportIcon}>✅</Text>
              <Text style={styles.reportValue}>{report.todos.completed}/{report.todos.total}</Text>
              <Text style={styles.reportLabel}>Tasks Completed</Text>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${report.todos.completionRate}%`, backgroundColor: colors.sky }]} />
              </View>
              <Text style={styles.reportDetail}>{report.todos.completionRate}% completion rate</Text>
            </GlassCard>

            <Text style={styles.sectionTitle}>Daily Activity</Text>
            {report.activePlan && (
              <Text style={styles.reportPlan}>
                {report.activePlan.name} ({report.activePlan.daysPerWeek}d/wk)
              </Text>
            )}
            <View style={styles.heatmapGrid}>
              {report.dailyBreakdown.map((day) => {
                const score = (day.hasWorkout ? 1 : 0) + (day.hasNutrition ? 1 : 0);
                const cell = [colors.surface, tint(colors.emerald, 0.3), tint(colors.emerald, 0.6)];
                return (
                  <View
                    key={day.date}
                    style={[styles.heatmapCell, { backgroundColor: cell[score] }]}
                  />
                );
              })}
            </View>
            <View style={styles.heatmapLegend}>
              <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: colors.surface }]} /><Text style={styles.legendText}>None</Text></View>
              <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: tint(colors.emerald, 0.3) }]} /><Text style={styles.legendText}>1 activity</Text></View>
              <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: tint(colors.emerald, 0.6) }]} /><Text style={styles.legendText}>Both</Text></View>
            </View>
          </>
        )}

        <Text style={styles.sectionTitle}>Scan history</Text>
        {scans.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="scan-outline" size={30} color={colors.rose} />
            <Text style={styles.emptyText}>No scans yet. Log your first body scan.</Text>
          </View>
        ) : scans.map((scan) => (
          <GlassCard key={scan.id} style={styles.scanCard}>
            <View style={styles.scanCardHeader}>
              <View style={styles.scanIconTile}>
                <Ionicons name="scan-outline" size={16} color={colors.rose} />
              </View>
              <View style={styles.scanCardInfo}>
                <Text style={styles.scanDate}>
                  {moment(scan.scanDate).format('D MMM YYYY')}
                </Text>
                <Text style={styles.scanWeight}>{Number(scan.weight).toFixed(1)} kg</Text>
              </View>
              <TouchableOpacity
                onPress={() =>
                  Alert.alert('Delete', 'Delete this scan?', [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Delete', style: 'destructive', onPress: () => deleteScan(scan.id) },
                  ])
                }
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                style={styles.scanDelete}
              >
                <Ionicons name="trash-outline" size={16} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
            <View style={styles.scanStats}>
              {[
                { label: 'Fat', value: scan.bodyFatPct, unit: '%' },
                { label: 'Muscle', value: scan.muscleMassKg, unit: 'kg' },
                { label: 'BMR', value: scan.bmr, unit: 'kcal' },
                { label: 'BWI', value: scan.bwiScore, unit: '/10' },
              ].map((s) => s.value != null && (
                <View key={s.label} style={styles.scanStat}>
                  <Text style={styles.scanStatValue}>{Number(s.value).toFixed(1)}{s.unit}</Text>
                  <Text style={styles.scanStatLabel}>{s.label}</Text>
                </View>
              ))}
            </View>
            {scan.notes ? <Text style={styles.scanNotes}>{scan.notes}</Text> : null}
          </GlassCard>
        ))}
      </ScrollView>

      <Modal visible={showModal} animationType="slide" transparent>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Log New Scan</Text>
              <TouchableOpacity onPress={() => setShowModal(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close" size={22} color={colors.text} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              {[
                { label: 'Weight (kg) *', key: 'weight' },
                { label: 'Height (cm)', key: 'heightCm', note: 'Used to auto-calculate BMR, TEE & nutrition targets' },
                { label: 'Body Fat %', key: 'bodyFatPct' },
                { label: 'Muscle Mass (kg)', key: 'muscleMassKg' },
                { label: 'Lean Body Mass (kg)', key: 'leanBodyMassKg' },
                { label: 'BMR (kcal)', key: 'bmr', note: 'Leave blank to auto-calculate from weight + height' },
                { label: 'TEE (kcal)', key: 'tee', note: 'Leave blank to auto-calculate from weight + height' },
                { label: 'Visceral Fat Level', key: 'visceralFat' },
                { label: 'BWI Score (/10)', key: 'bwiScore' },
                { label: 'Bio Age', key: 'bioAge' },
                { label: 'Protein (kg)', key: 'proteinKg' },
              ].map((field) => (
                <View key={field.key} style={styles.modalField}>
                  {field.note ? (
                    <Text style={styles.modalNote}>{field.note}</Text>
                  ) : null}
                  <Input
                    label={field.label}
                    value={f(field.key)}
                    onChangeText={s(field.key)}
                    placeholder="0"
                    keyboardType="numeric"
                  />
                </View>
              ))}
              <Input
                label="Notes"
                value={form.notes}
                onChangeText={s('notes')}
                placeholder="Any notes about this scan..."
                multiline
                inputStyle={{ minHeight: 60 }}
              />
              <Button
                variant="danger"
                size="lg"
                onPress={handleSave}
                disabled={saving}
                style={styles.saveBtn}
              >
                {saving
                  ? <ActivityIndicator color={colors.white} />
                  : <Text style={styles.saveBtnText}>Save Scan</Text>
                }
              </Button>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  navBar: { paddingTop: 56, paddingHorizontal: spacing.lg, paddingBottom: spacing.xs },
  backBtn: {
    width: 40, height: 40, borderRadius: radii.pill,
    backgroundColor: overlays.faint, borderWidth: 1, borderColor: overlays.border,
    alignItems: 'center', justifyContent: 'center',
  },
  scroll: { padding: spacing.xl, paddingBottom: 80 },
  baselineBanner: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: tint(colors.rose, 0.1), borderRadius: radii.md, padding: spacing.md,
    borderWidth: 1, borderColor: tint(colors.rose, 0.3), marginBottom: spacing.xl,
  },
  baselineText: { fontSize: 12, color: colors.rose, flex: 1 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: colors.white, marginBottom: spacing.md, marginTop: spacing.sm },
  progressGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginBottom: spacing.xl },
  progressCard: { width: '47%', borderRadius: radii.md, padding: 14 },
  progressLabel: { fontSize: 10, color: colors.textFaint, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: spacing.xs, fontWeight: '700' },
  progressBaseline: { fontSize: 18, fontWeight: '700', color: colors.white, marginBottom: spacing.xs },
  progressDiff: { fontSize: 16, fontWeight: '700', marginBottom: 2 },
  progressCurrent: { fontSize: 11, color: colors.textFaint },
  targetsCard: { marginBottom: spacing.xl, padding: 14 },
  targetRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: overlays.borderSoft },
  targetIcon: { fontSize: 16, marginRight: spacing.sm },
  targetLabel: { flex: 1, fontSize: 13, color: colors.textMuted },
  targetValue: { fontSize: 13, color: colors.white, fontWeight: '600' },
  chart: { borderRadius: radii.lg, marginBottom: spacing.xl, borderWidth: 1, borderColor: colors.edge, overflow: 'hidden' },
  reportPeriod: { fontSize: 12, color: colors.textFaint, marginBottom: spacing.md },
  reportRow: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.md },
  reportCard: { flex: 1, padding: 14, borderRadius: radii.md },
  reportCardFull: { padding: 14, borderRadius: radii.md, marginBottom: spacing.md },
  reportIcon: { fontSize: 18, marginBottom: spacing.xs },
  reportValue: { fontSize: 20, fontWeight: '700', color: colors.white, marginBottom: 2 },
  reportLabel: { fontSize: 11, color: colors.textFaint, textTransform: 'uppercase', marginBottom: spacing.sm, fontWeight: '700' },
  reportDetail: { fontSize: 11, color: colors.textMuted, marginTop: spacing.xs },
  reportPlan: { fontSize: 12, color: colors.textFaint, marginBottom: spacing.sm },
  progressBar: { height: 6, backgroundColor: overlays.faint, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: 6, borderRadius: 3 },
  heatmapGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.sm },
  heatmapCell: { width: 24, height: 24, borderRadius: radii.xs },
  heatmapLegend: { flexDirection: 'row', gap: spacing.md, marginBottom: spacing.xl },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  legendDot: { width: 10, height: 10, borderRadius: 2 },
  legendText: { fontSize: 10, color: colors.textMuted },
  scanCard: { marginBottom: spacing.md, padding: spacing.lg, borderRadius: radii.lg },
  emptyCard: {
    alignItems: 'center', justifyContent: 'center', paddingVertical: 48, gap: spacing.sm,
    backgroundColor: overlays.faint, borderRadius: radii.lg, borderWidth: 1, borderColor: overlays.border,
  },
  emptyText: { fontSize: 13, color: colors.textMuted, textAlign: 'center' },
  scanCardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, marginBottom: spacing.md },
  scanIconTile: {
    width: 34, height: 34, borderRadius: radii.sm,
    backgroundColor: tint(colors.rose, 0.15), alignItems: 'center', justifyContent: 'center',
  },
  scanCardInfo: { flex: 1 },
  scanDate: { fontSize: 12, color: colors.textMuted, marginBottom: 2 },
  scanWeight: { fontSize: 22, fontWeight: '700', color: colors.white },
  scanDelete: { padding: spacing.xs },
  scanStats: { flexDirection: 'row', gap: spacing.lg, flexWrap: 'wrap' },
  scanStat: { alignItems: 'center' },
  scanStatValue: { fontSize: 14, fontWeight: '700', color: colors.white },
  scanStatLabel: { fontSize: 10, color: colors.textFaint, textTransform: 'uppercase' },
  scanNotes: { fontSize: 12, color: colors.textMuted, marginTop: spacing.sm, fontStyle: 'italic' },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.7)' },
  modal: {
    backgroundColor: colors.abyss, borderTopLeftRadius: radii.xxl, borderTopRightRadius: radii.xxl,
    padding: spacing.xxl, maxHeight: '90%',
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg },
  modalTitle: { ...typ.h2 },
  modalField: { marginBottom: spacing.lg },
  modalNote: { fontSize: 11, color: colors.textFaint, marginTop: spacing.md, marginBottom: spacing.sm },
  saveBtn: { marginTop: spacing.xl },
  saveBtnText: { color: colors.white, fontWeight: '700', fontSize: 15 },
});