import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const DEFAULT_GOALS = { dailyCalories: 2097, proteinG: 150, carbsG: 150, fatG: 89 };

export default function NutritionBar({ summary, goals }) {
  const goalData = goals || summary?.goals || {};
  const computed = {
    dailyCalories: Number(goalData.dailyCalories) || DEFAULT_GOALS.dailyCalories,
    proteinG: Number(goalData.proteinG) || DEFAULT_GOALS.proteinG,
    carbsG: Number(goalData.carbsG) || DEFAULT_GOALS.carbsG,
    fatG: Number(goalData.fatG) || DEFAULT_GOALS.fatG,
  };
  const cal = summary?.totals?.calories || 0;
  const protein = summary?.totals?.proteinG || 0;
  const carbs = summary?.totals?.carbsG || 0;
  const fat = summary?.totals?.fatG || 0;

  const calPct = Math.min((cal / computed.dailyCalories) * 100, 100);
  const calLeft = Math.max(computed.dailyCalories - cal, 0);
  const calColor = calPct > 100 ? '#e74c3c' : calPct > 80 ? '#f39c12' : '#2ecc71';

  return (
    <View style={styles.container}>
      {/* Calorie bar */}
      <View style={styles.calRow}>
        <Text style={styles.calConsumed}>{cal} kcal</Text>
        <Text style={styles.calLeft}>{calLeft > 0 ? `${calLeft} kcal left` : 'Goal reached! 🎉'}</Text>
      </View>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: `${calPct}%`, backgroundColor: calColor }]} />
      </View>
      <Text style={styles.calGoal}>Daily goal: {computed.dailyCalories} kcal (from your scan)</Text>

      {/* Macro bars */}
      <View style={styles.macroRow}>
        {[
          { label: 'Protein', value: protein, goal: computed.proteinG, unit: 'g', color: '#e74c3c' },
          { label: 'Carbs', value: carbs, goal: computed.carbsG, unit: 'g', color: '#f39c12' },
          { label: 'Fat', value: fat, goal: computed.fatG, unit: 'g', color: '#9b59b6' },
        ].map((m) => {
          const pct = Math.min((m.value / m.goal) * 100, 100);
          return (
            <View key={m.label} style={styles.macroItem}>
              <View style={styles.macroBarTrack}>
                <View style={[styles.macroBarFill, { height: `${pct}%`, backgroundColor: m.color }]} />
              </View>
              <Text style={[styles.macroValue, { color: m.color }]}>
                {Math.round(m.value)}{m.unit}
              </Text>
              <Text style={styles.macroGoal}>/ {m.goal}{m.unit}</Text>
              <Text style={styles.macroLabel}>{m.label}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1a1a2e', borderRadius: 16, padding: 16,
    margin: 16, borderWidth: 1, borderColor: '#2a2a3e',
  },
  calRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  calConsumed: { fontSize: 22, fontWeight: '800', color: '#fff' },
  calLeft: { fontSize: 13, color: '#888', alignSelf: 'flex-end' },
  barTrack: { height: 8, backgroundColor: '#2a2a3e', borderRadius: 4, overflow: 'hidden', marginBottom: 4 },
  barFill: { height: '100%', borderRadius: 4 },
  calGoal: { fontSize: 10, color: '#444', marginBottom: 14 },
  macroRow: { flexDirection: 'row', gap: 12, justifyContent: 'space-around' },
  macroItem: { alignItems: 'center', flex: 1 },
  macroBarTrack: {
    width: 8, height: 60, backgroundColor: '#2a2a3e',
    borderRadius: 4, overflow: 'hidden', marginBottom: 4,
    justifyContent: 'flex-end',
  },
  macroBarFill: { width: '100%', borderRadius: 4 },
  macroValue: { fontSize: 13, fontWeight: '700' },
  macroGoal: { fontSize: 10, color: '#555' },
  macroLabel: { fontSize: 10, color: '#888', textTransform: 'uppercase', letterSpacing: 0.3, marginTop: 2 },
});
