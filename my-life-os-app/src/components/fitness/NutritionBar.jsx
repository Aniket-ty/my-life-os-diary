import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, radii } from '../../theme';

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
  const calColor = calPct > 100 ? colors.rose : calPct > 80 ? colors.amber : colors.emerald;

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
          { label: 'Protein', value: protein, goal: computed.proteinG, unit: 'g', color: colors.rose },
          { label: 'Carbs', value: carbs, goal: computed.carbsG, unit: 'g', color: colors.amber },
          { label: 'Fat', value: fat, goal: computed.fatG, unit: 'g', color: colors.violet },
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
    backgroundColor: colors.card, borderRadius: radii.xl, padding: 16,
    margin: 16, borderWidth: 1, borderColor: colors.edge,
  },
  calRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  calConsumed: { fontSize: 22, fontWeight: '800', color: colors.white },
  calLeft: { fontSize: 13, color: colors.textMuted, alignSelf: 'flex-end' },
  barTrack: { height: 8, backgroundColor: colors.edge, borderRadius: 4, overflow: 'hidden', marginBottom: 4 },
  barFill: { height: '100%', borderRadius: 4 },
  calGoal: { fontSize: 10, color: colors.textFaint, marginBottom: 14 },
  macroRow: { flexDirection: 'row', gap: 12, justifyContent: 'space-around' },
  macroItem: { alignItems: 'center', flex: 1 },
  macroBarTrack: {
    width: 8, height: 60, backgroundColor: colors.edge,
    borderRadius: 4, overflow: 'hidden', marginBottom: 4,
    justifyContent: 'flex-end',
  },
  macroBarFill: { width: '100%', borderRadius: 4 },
  macroValue: { fontSize: 13, fontWeight: '700' },
  macroGoal: { fontSize: 10, color: colors.textFaint },
  macroLabel: { fontSize: 10, color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.3, marginTop: 2 },
});
