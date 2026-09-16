import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useAuthStore } from '../stores/authStore';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../components/ui/Screen';
import GlassCard from '../components/ui/GlassCard';
import { colors, radii, tint, type as typ } from '../theme';

const MODULES = [
  { name: 'My Diary', description: 'Write, reflect, attach memories', icon: 'book-outline', color: colors.gold, screen: 'DiaryList' },
  { name: 'Fitness Journal', description: 'Workouts, calories, progress', icon: 'barbell-outline', color: colors.emerald, screen: 'FitnessList' },
  { name: 'Workout Planner', description: 'Weekly AI-designed schedule', icon: 'calendar-outline', color: colors.teal, screen: 'WorkoutPlanner' },
  { name: 'AI Assistant', description: 'Chat about food, exercise & more', icon: 'sparkles-outline', color: colors.violet, screen: 'AIChat' },
  { name: 'To-Do & Reminders', description: 'Tasks, goals, daily habits', icon: 'checkbox-outline', color: colors.sky, screen: 'TodoList' },
  { name: 'Body Scan', description: 'Track weight, fat & muscle', icon: 'scan-outline', color: colors.rose, screen: 'BodyScan' },
];

export default function HomeScreen({ navigation }) {
  const { user } = useAuthStore();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <GlassCard style={styles.hero}>
          <View style={styles.heroRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.greeting}>{greeting.toUpperCase()}</Text>
              <Text style={styles.name}>
                {user?.name?.split(' ')[0] || 'Friend'}, welcome back 👋
              </Text>
              <Text style={styles.subtitle}>
                Here's your Life OS at a glance — every module is synced to your cloud.
              </Text>
            </View>
            <TouchableOpacity
              style={styles.settingsBtn}
              onPress={() => navigation.navigate('Settings')}
              activeOpacity={0.8}
            >
              <Ionicons name="settings-outline" size={20} color={colors.textSoft} />
            </TouchableOpacity>
          </View>
        </GlassCard>

        <Text style={styles.sectionTitle}>Your modules</Text>
        <View style={styles.grid}>
          {MODULES.map((mod) => (
            <TouchableOpacity
              key={mod.name}
              style={[styles.card, { borderColor: tint(mod.color, 0.25), backgroundColor: tint(mod.color, 0.08) }]}
              onPress={() => navigation.navigate(mod.screen)}
              activeOpacity={0.85}
            >
              <View style={[styles.iconCircle, { backgroundColor: tint(mod.color, 0.18) }]}>
                <Ionicons name={mod.icon} size={24} color={mod.color} />
              </View>
              <View style={styles.cardText}>
                <Text style={styles.cardName}>{mod.name}</Text>
                <Text style={styles.cardDesc}>{mod.description}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
            </TouchableOpacity>
          ))}
        </View>

        <GlassCard style={[styles.quoteCard, { borderLeftColor: colors.mint }]}>
          <Text style={styles.quoteText}>"The secret of getting ahead is getting started."</Text>
          <Text style={styles.quoteAuthor}>— Mark Twain</Text>
        </GlassCard>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 20, paddingTop: 56, paddingBottom: 60 },
  hero: { marginBottom: 24 },
  heroRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  greeting: { fontSize: 12, fontWeight: '700', letterSpacing: 2, color: colors.violet },
  name: { ...typ.h1, marginTop: 4, fontSize: 26 },
  subtitle: { ...typ.bodyMuted, marginTop: 6, lineHeight: 20 },
  settingsBtn: {
    width: 42,
    height: 42,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: colors.edge,
  },
  sectionTitle: { ...typ.h2, marginBottom: 14 },
  grid: { gap: 12 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radii.xl,
    borderWidth: 1,
    padding: 16,
    gap: 14,
  },
  iconCircle: {
    width: 50,
    height: 50,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardText: { flex: 1, minWidth: 0 },
  cardName: { fontSize: 16, fontWeight: '700', color: colors.white, marginBottom: 3 },
  cardDesc: { fontSize: 13, color: colors.textMuted },
  quoteCard: {
    marginTop: 24,
    borderLeftWidth: 3,
    borderLeftColor: colors.mint,
  },
  quoteText: { fontSize: 14, color: colors.textSoft, fontStyle: 'italic', lineHeight: 22, marginBottom: 8 },
  quoteAuthor: { fontSize: 12, color: colors.textFaint, fontWeight: '600' },
});
