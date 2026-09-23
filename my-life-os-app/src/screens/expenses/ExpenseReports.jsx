import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { BarChart, LineChart } from 'react-native-chart-kit';
import GlassCard from '../../components/ui/GlassCard';
import { colors, radii } from '../../theme';

const screenWidth = Dimensions.get('window').width;

export default function ExpenseReports({ summary }) {
  if (!summary) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>Loading reports...</Text>
      </View>
    );
  }

  const currency = summary.currency || 'INR';
  
  // Prepare data for line chart (7 day trend)
  const dailyData = summary.dailyTrend || [];
  const lineLabels = dailyData.length > 0 ? dailyData.map(d => d.date.slice(5)) : ['No Data'];
  const lineValues = dailyData.length > 0 ? dailyData.map(d => d.total) : [0];

  // Prepare data for bar chart (categories)
  const categoryData = summary.thisMonth?.categories || [];
  const barLabels = categoryData.length > 0 ? categoryData.slice(0, 4).map(c => c.category.substring(0, 6)) : ['No Data'];
  const barValues = categoryData.length > 0 ? categoryData.slice(0, 4).map(c => c.amount) : [0];

  const chartConfig = {
    backgroundColor: 'transparent',
    backgroundGradientFrom: '#1e293b',
    backgroundGradientFromOpacity: 0,
    backgroundGradientTo: '#1e293b',
    backgroundGradientToOpacity: 0,
    color: (opacity = 1) => `rgba(139, 92, 246, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(148, 163, 184, ${opacity})`,
    strokeWidth: 2,
    barPercentage: 0.7,
    useShadowColorFromDataset: false,
    propsForDots: { r: '4', strokeWidth: '2', stroke: colors.violet },
  };

  const barChartConfig = {
    ...chartConfig,
    color: (opacity = 1) => `rgba(16, 185, 129, ${opacity})`,
  };

  return (
    <View style={styles.container}>
      <GlassCard style={styles.card}>
        <Text style={styles.cardTitle}>7-Day Spending Trend</Text>
        <LineChart
          data={{
            labels: lineLabels,
            datasets: [{ data: lineValues }],
          }}
          width={screenWidth - 72}
          height={200}
          chartConfig={chartConfig}
          bezier
          style={styles.chartStyle}
          yAxisLabel={currency === 'INR' ? '₹' : '$'}
          segments={4}
        />
      </GlassCard>

      <GlassCard style={styles.card}>
        <Text style={styles.cardTitle}>Top Categories (This Month)</Text>
        {categoryData.length > 0 ? (
          <BarChart
            data={{
              labels: barLabels,
              datasets: [{ data: barValues }],
            }}
            width={screenWidth - 72}
            height={220}
            chartConfig={barChartConfig}
            style={styles.chartStyle}
            yAxisLabel={currency === 'INR' ? '₹' : '$'}
            showValuesOnTopOfBars
            fromZero
          />
        ) : (
          <Text style={styles.noDataText}>No category data yet</Text>
        )}
      </GlassCard>

      <GlassCard style={styles.card}>
        <Text style={styles.cardTitle}>Largest Expenses</Text>
        {summary.largestExpenses?.length > 0 ? (
          summary.largestExpenses.map((exp, i) => (
            <View key={exp.id || i} style={styles.listItem}>
              <View style={{ flex: 1 }}>
                <Text style={styles.listTitle}>{exp.title}</Text>
                <Text style={styles.listSub}>{exp.category} • {exp.expenseDate?.slice(0, 10)}</Text>
              </View>
              <Text style={styles.listAmount}>-{currency} {Number(exp.amount).toFixed(2)}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.noDataText}>No large expenses recorded</Text>
        )}
      </GlassCard>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 16, paddingBottom: 20 },
  empty: { padding: 40, alignItems: 'center' },
  emptyText: { color: colors.textMuted },
  card: { padding: 16, borderRadius: radii.xl },
  cardTitle: { fontSize: 16, fontWeight: '700', color: colors.white, marginBottom: 16 },
  chartStyle: { marginVertical: 8, borderRadius: 16, marginLeft: -10 },
  noDataText: { color: colors.textMuted, textAlign: 'center', paddingVertical: 20 },
  listItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  listTitle: { color: colors.white, fontSize: 14, fontWeight: '500' },
  listSub: { color: colors.textMuted, fontSize: 12, marginTop: 2 },
  listAmount: { color: colors.rose, fontSize: 14, fontWeight: '700' },
});
