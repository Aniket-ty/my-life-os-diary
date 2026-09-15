import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  StatusBar, Modal, TextInput, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';
import { useBodyScanStore } from '../../stores/bodyScanStore';
import { fitnessAPI } from '../../services/fitnessService';
import { Ionicons } from '@expo/vector-icons';
import moment from 'moment';

const WIDTH = Dimensions.get('window').width - 40;

const BASELINE = {
  scanDate: '2026-04-08',
  weight: 90.0,
  bodyFatPct: 26.6,
  muscleMassKg: 36.5,
  leanBodyMassKg: 66.1,
  bmr: 1797,
  tee: 2767,
  visceralFat: 9,
  bwiScore: 7.4,
  bioAge: 23,
  proteinKg: 13.3,
};

export default function BodyScanScreen({ navigation }) {
  const { scans, loading, fetchScans, createScan, deleteScan } = useBodyScanStore();
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [report, setReport] = useState(null);
  const [form, setForm] = useState({
    weight: '', bodyFatPct: '', muscleMassKg: '',
    leanBodyMassKg: '', bmr: '', tee: '',
    visceralFat: '', bwiScore: '', bioAge: '', notes: '',
  });

  useEffect(() => {
    fetchScans();
    fitnessAPI.getReport(30).then(setReport).catch(() => {});
  }, []);

  useEffect(() => {
    if (!loading && scans.length === 0) {
      setShowModal(true);
    }
  }, [loading, scans.length]);

  const allScans = [
    { ...BASELINE, id: 'baseline', isBaseline: true },
    ...scans,
  ].sort((a, b) => new Date(a.scanDate) - new Date(b.scanDate));

  const latest = scans.length > 0 ? scans[0] : null;
  const baseline = BASELINE;

  const diff = (key) => {
    if (!latest) return null;
    const d = Number(latest[key]) - Number(baseline[key]);
    return d;
  };

  const diffColor = (key, lowerIsBetter = false) => {
    const d = diff(key);
    if (d === null) return '#888';
    if (d === 0) return '#888';
    if (lowerIsBetter) return d < 0 ? '#2ecc71' : '#e74c3c';
    return d > 0 ? '#2ecc71' : '#e74c3c';
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
        weight: '', bodyFatPct: '', muscleMassKg: '',
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
    backgroundColor: '#1a1a2e',
    backgroundGradientFrom: '#1a1a2e',
    backgroundGradientTo: '#1a1a2e',
    color: (opacity = 1) => color,
    labelColor: () => '#666',
    strokeWidth: 2,
    propsForDots: { r: '4', strokeWidth: '2', stroke: color },
  });

  const f = (val) => form[val];
  const s = (val) => (v) => setForm((prev) => ({ ...prev, [val]: v }));

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Body Scan Tracker</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => setShowModal(true)}>
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Baseline banner */}
        <View style={styles.baselineBanner}>
          <Ionicons name="scan-outline" size={16} color="#e74c3c" />
          <Text style={styles.baselineText}>
            Baseline: scan — 8 Apr 2026 · 90kg · 26.6% fat · BWI 7.4
          </Text>
        </View>

        {/* Progress vs baseline */}
        <Text style={styles.sectionTitle}>Progress vs Baseline</Text>
        <View style={styles.progressGrid}>
          {[
            { label: 'Weight', key: 'weight', unit: 'kg', lower: true },
            { label: 'Body Fat', key: 'bodyFatPct', unit: '%', lower: true },
            { label: 'Muscle', key: 'muscleMassKg', unit: 'kg', lower: false },
            { label: 'BWI Score', key: 'bwiScore', unit: '/10', lower: false },
          ].map((item) => (
            <View key={item.key} style={styles.progressCard}>
              <Text style={styles.progressLabel}>{item.label}</Text>
              <Text style={styles.progressBaseline}>
                {Number(baseline[item.key]).toFixed(1)}{item.unit}
              </Text>
              <Text style={[styles.progressDiff, { color: diffColor(item.key, item.lower) }]}>
                {latest ? `${diffText(item.key)}${item.unit}` : 'No new scan'}
              </Text>
              {latest && (
                <Text style={styles.progressCurrent}>
                  Now: {Number(latest[item.key] || baseline[item.key]).toFixed(1)}{item.unit}
                </Text>
              )}
            </View>
          ))}
        </View>

        {/* Goals from scan */}
        <Text style={styles.sectionTitle}>Your Targets (from scan)</Text>
        <View style={styles.targetsCard}>
          {[
            { label: 'Daily calories', value: '1997–2097 kcal', icon: '🔥' },
            { label: 'Protein', value: '150g (30%)', icon: '🥩' },
            { label: 'Carbs', value: '150g (30%)', icon: '🍚' },
            { label: 'Fat', value: '89g (40%)', icon: '🥑' },
            { label: 'Target body fat', value: '18–20%', icon: '📉' },
            { label: 'Target BWI', value: '8.0+ (optimal)', icon: '⭐' },
          ].map((t) => (
            <View key={t.label} style={styles.targetRow}>
              <Text style={styles.targetIcon}>{t.icon}</Text>
              <Text style={styles.targetLabel}>{t.label}</Text>
              <Text style={styles.targetValue}>{t.value}</Text>
            </View>
          ))}
        </View>

        {/* Charts */}
        {allScans.length > 1 && (
          <>
            <Text style={styles.sectionTitle}>Weight trend</Text>
            <LineChart
              data={chartData('weight')}
              width={WIDTH}
              height={160}
              chartConfig={chartConfig('#e74c3c')}
              bezier
              style={styles.chart}
              withInnerLines={false}
            />

            <Text style={styles.sectionTitle}>Body fat % trend</Text>
            <LineChart
              data={chartData('bodyFatPct')}
              width={WIDTH}
              height={160}
              chartConfig={chartConfig('#f39c12')}
              bezier
              style={styles.chart}
              withInnerLines={false}
            />

            <Text style={styles.sectionTitle}>Muscle mass trend</Text>
            <LineChart
              data={chartData('muscleMassKg')}
              width={WIDTH}
              height={160}
              chartConfig={chartConfig('#2ecc71')}
              bezier
              style={styles.chart}
              withInnerLines={false}
            />
          </>
        )}

        {/* Consistency Report */}
        {report && (
          <>
            <Text style={styles.sectionTitle}>Consistency Report</Text>
            <Text style={{ fontSize: 11, color: '#666', marginBottom: 12 }}>Last {report.period} days</Text>
            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 12 }}>
              <View style={styles.reportCard}>
                <Text style={styles.reportIcon}>💪</Text>
                <Text style={styles.reportValue}>{report.workouts.uniqueDays}/{report.period}</Text>
                <Text style={styles.reportLabel}>Workout Days</Text>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: `${report.workouts.consistencyPct}%`, backgroundColor: '#2ecc71' }]} />
                </View>
                <Text style={styles.reportDetail}>{report.workouts.consistencyPct}% consistency</Text>
              </View>
              <View style={styles.reportCard}>
                <Text style={styles.reportIcon}>🥗</Text>
                <Text style={styles.reportValue}>{report.nutrition.uniqueDays}/{report.period}</Text>
                <Text style={styles.reportLabel}>Nutrition Logs</Text>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: `${report.nutrition.loggingPct}%`, backgroundColor: '#f39c12' }]} />
                </View>
                <Text style={styles.reportDetail}>{report.nutrition.loggingPct}% logging</Text>
              </View>
            </View>
            <View style={styles.reportCardFull}>
              <Text style={styles.reportIcon}>✅</Text>
              <Text style={styles.reportValue}>{report.todos.completed}/{report.todos.total}</Text>
              <Text style={styles.reportLabel}>Tasks Completed</Text>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${report.todos.completionRate}%`, backgroundColor: '#3498db' }]} />
              </View>
              <Text style={styles.reportDetail}>{report.todos.completionRate}% completion rate</Text>
            </View>

            {/* Daily Activity Heatmap */}
            <Text style={styles.sectionTitle}>Daily Activity</Text>
            {report.activePlan && (
              <Text style={{ fontSize: 11, color: '#666', marginBottom: 8 }}>
                {report.activePlan.name} ({report.activePlan.daysPerWeek}d/wk)
              </Text>
            )}
            <View style={styles.heatmapGrid}>
              {report.dailyBreakdown.map((day) => {
                const score = (day.hasWorkout ? 1 : 0) + (day.hasNutrition ? 1 : 0);
                const colors = ['#2a2a3e', '#2ecc7144', '#2ecc7188'];
                return (
                  <View
                    key={day.date}
                    style={[styles.heatmapCell, { backgroundColor: colors[score] }]}
                  />
                );
              })}
            </View>
            <View style={styles.heatmapLegend}>
              <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#2a2a3e' }]} /><Text style={styles.legendText}>None</Text></View>
              <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#2ecc7144' }]} /><Text style={styles.legendText}>1 activity</Text></View>
              <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: '#2ecc7188' }]} /><Text style={styles.legendText}>Both</Text></View>
            </View>
          </>
        )}

        {/* Scan history */}
        <Text style={styles.sectionTitle}>Scan history</Text>
        {allScans.map((scan) => (
          <View key={scan.id} style={[styles.scanCard, scan.isBaseline && styles.scanCardBaseline]}>
            <View style={styles.scanCardHeader}>
              <View>
                <Text style={styles.scanDate}>
                  {moment(scan.scanDate).format('D MMM YYYY')}
                  {scan.isBaseline ? ' · Baseline' : ''}
                </Text>
                <Text style={styles.scanWeight}>{Number(scan.weight).toFixed(1)} kg</Text>
              </View>
              {!scan.isBaseline && (
                <TouchableOpacity onPress={() =>
                  Alert.alert('Delete', 'Delete this scan?', [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Delete', style: 'destructive', onPress: () => deleteScan(scan.id) },
                  ])
                }>
                  <Ionicons name="trash-outline" size={16} color="#666" />
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.scanStats}>
              {[
                { label: 'Fat', value: scan.bodyFatPct, unit: '%' },
                { label: 'Muscle', value: scan.muscleMassKg, unit: 'kg' },
                { label: 'BMR', value: scan.bmr, unit: 'kcal' },
                { label: 'BWI', value: scan.bwiScore, unit: '/10' },
              ].map((s) => s.value ? (
                <View key={s.label} style={styles.scanStat}>
                  <Text style={styles.scanStatValue}>{Number(s.value).toFixed(1)}{s.unit}</Text>
                  <Text style={styles.scanStatLabel}>{s.label}</Text>
                </View>
              ) : null)}
            </View>
            {scan.notes ? <Text style={styles.scanNotes}>{scan.notes}</Text> : null}
          </View>
        ))}
      </ScrollView>

      {/* Add Scan Modal */}
      <Modal visible={showModal} animationType="slide" transparent>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Log New Scan</Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={22} color="#fff" />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              {[
                { label: 'Weight (kg) *', key: 'weight' },
                { label: 'Body Fat %', key: 'bodyFatPct' },
                { label: 'Muscle Mass (kg)', key: 'muscleMassKg' },
                { label: 'Lean Body Mass (kg)', key: 'leanBodyMassKg' },
                { label: 'BMR (kcal)', key: 'bmr' },
                { label: 'TEE (kcal)', key: 'tee' },
                { label: 'Visceral Fat Level', key: 'visceralFat' },
                { label: 'BWI Score (/10)', key: 'bwiScore' },
                { label: 'Bio Age', key: 'bioAge' },
                { label: 'Protein (kg)', key: 'proteinKg' },
              ].map((field) => (
                <View key={field.key}>
                  <Text style={styles.modalLabel}>{field.label}</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="0"
                    placeholderTextColor="#444"
                    value={f(field.key)}
                    onChangeText={s(field.key)}
                    keyboardType="numeric"
                  />
                </View>
              ))}
              <Text style={styles.modalLabel}>Notes</Text>
              <TextInput
                style={[styles.modalInput, { minHeight: 60 }]}
                placeholder="Any notes about this scan..."
                placeholderTextColor="#444"
                value={form.notes}
                onChangeText={s('notes')}
                multiline
              />
              <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
                {saving
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={styles.saveBtnText}>Save Scan</Text>
                }
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f1a' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16, backgroundColor: '#1a1a2e',
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  addBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: '#e74c3c', alignItems: 'center', justifyContent: 'center',
  },
  scroll: { padding: 20, paddingBottom: 80 },
  baselineBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#1a0a0a', borderRadius: 10, padding: 12,
    borderWidth: 1, borderColor: '#e74c3c33', marginBottom: 20,
  },
  baselineText: { fontSize: 12, color: '#e74c3c', flex: 1 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#888', marginBottom: 12, marginTop: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  progressGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  progressCard: {
    backgroundColor: '#1a1a2e', borderRadius: 12, padding: 14,
    width: '47%', borderWidth: 1, borderColor: '#2a2a3e',
  },
  progressLabel: { fontSize: 11, color: '#666', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 4 },
  progressBaseline: { fontSize: 18, fontWeight: '700', color: '#fff', marginBottom: 4 },
  progressDiff: { fontSize: 16, fontWeight: '700', marginBottom: 2 },
  progressCurrent: { fontSize: 11, color: '#666' },
  targetsCard: {
    backgroundColor: '#1a1a2e', borderRadius: 12, padding: 14,
    borderWidth: 1, borderColor: '#2a2a3e', marginBottom: 20,
  },
  targetRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#2a2a3e' },
  targetIcon: { fontSize: 16, marginRight: 10 },
  targetLabel: { flex: 1, fontSize: 13, color: '#aaa' },
  targetValue: { fontSize: 13, color: '#fff', fontWeight: '600' },
  chart: { borderRadius: 12, marginBottom: 20 },
  scanCard: {
    backgroundColor: '#1a1a2e', borderRadius: 12, padding: 14,
    marginBottom: 10, borderWidth: 1, borderColor: '#2a2a3e',
  },
  scanCardBaseline: { borderColor: '#e74c3c33' },
  scanCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  scanDate: { fontSize: 12, color: '#888', marginBottom: 2 },
  scanWeight: { fontSize: 22, fontWeight: '700', color: '#fff' },
  scanStats: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  scanStat: { alignItems: 'center' },
  scanStatValue: { fontSize: 14, fontWeight: '700', color: '#fff' },
  scanStatLabel: { fontSize: 10, color: '#666', textTransform: 'uppercase' },
  scanNotes: { fontSize: 12, color: '#666', marginTop: 8, fontStyle: 'italic' },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.7)' },
  modal: {
    backgroundColor: '#1a1a2e', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, maxHeight: '90%',
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
  modalLabel: { fontSize: 12, color: '#888', fontWeight: '600', marginBottom: 4, marginTop: 12, textTransform: 'uppercase' },
  modalInput: {
    backgroundColor: '#0f0f1a', borderRadius: 10, padding: 12,
    color: '#fff', fontSize: 14, borderWidth: 1, borderColor: '#2a2a3e',
  },
  saveBtn: { backgroundColor: '#e74c3c', borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 20 },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  reportCard: {
    backgroundColor: '#1a1a2e', borderRadius: 12, padding: 14, flex: 1,
    borderWidth: 1, borderColor: '#2a2a3e',
  },
  reportCardFull: {
    backgroundColor: '#1a1a2e', borderRadius: 12, padding: 14, marginBottom: 12,
    borderWidth: 1, borderColor: '#2a2a3e',
  },
  reportIcon: { fontSize: 18, marginBottom: 4 },
  reportValue: { fontSize: 20, fontWeight: '700', color: '#fff', marginBottom: 2 },
  reportLabel: { fontSize: 11, color: '#888', textTransform: 'uppercase', marginBottom: 8 },
  reportDetail: { fontSize: 11, color: '#666', marginTop: 4 },
  progressBar: { height: 6, backgroundColor: '#2a2a3e', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: 6, borderRadius: 3 },
  heatmapGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginBottom: 8 },
  heatmapCell: { width: 24, height: 24, borderRadius: 4 },
  heatmapLegend: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 10, height: 10, borderRadius: 2 },
  legendText: { fontSize: 10, color: '#666' },
});
