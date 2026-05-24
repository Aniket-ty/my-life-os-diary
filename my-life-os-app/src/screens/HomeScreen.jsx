import { View, Text, TouchableOpacity, StyleSheet, ScrollView, StatusBar } from 'react-native';
import { useAuthStore } from '../stores/authStore';
import { Ionicons } from '@expo/vector-icons';

const MODULES = [
  { name: 'My Diary', description: 'Write, reflect, attach memories', icon: 'book-outline', color: '#c8a96e', bg: '#fffef5', border: '#f5a623', screen: 'DiaryList' },
  { name: 'Fitness Journal', description: 'Workouts, calories, progress', icon: 'barbell-outline', color: '#2ecc71', bg: '#f0fff4', border: '#2ecc71', screen: 'FitnessList' },
  { name: 'AI Assistant', description: 'Chat about food, exercise & more', icon: 'sparkles-outline', color: '#9b59b6', bg: '#fdf0ff', border: '#9b59b6', screen: 'AIChat' },
  { name: 'To-Do & Reminders', description: 'Tasks, goals, daily habits', icon: 'checkbox-outline', color: '#3498db', bg: '#f0f8ff', border: '#3498db', screen: 'TodoList' },
];

export default function HomeScreen({ navigation }) {
  const { user, logout } = useAuthStore();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{greeting},</Text>
            <Text style={styles.name}>{user?.name} 👋</Text>
          </View>
          <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
            <Ionicons name="log-out-outline" size={20} color="#888" />
          </TouchableOpacity>
        </View>
        <Text style={styles.subtitle}>What would you like to do today?</Text>
        <View style={styles.grid}>
          {MODULES.map((mod) => (
            <TouchableOpacity
              key={mod.name}
              style={[styles.card, { backgroundColor: mod.bg, borderLeftColor: mod.border }]}
              onPress={() => navigation.navigate(mod.screen)}
              activeOpacity={0.8}
            >
              <View style={[styles.iconCircle, { backgroundColor: mod.color + '22' }]}>
                <Ionicons name={mod.icon} size={26} color={mod.color} />
              </View>
              <View style={styles.cardText}>
                <Text style={styles.cardName}>{mod.name}</Text>
                <Text style={styles.cardDesc}>{mod.description}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#ccc" />
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.quoteCard}>
          <Text style={styles.quoteText}>"The secret of getting ahead is getting started."</Text>
          <Text style={styles.quoteAuthor}>— Mark Twain</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  scroll: { paddingHorizontal: 20, paddingBottom: 60 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingTop: 60, marginBottom: 6 },
  greeting: { fontSize: 15, color: '#888' },
  name: { fontSize: 26, fontWeight: '700', color: '#1a1a1a', marginTop: 2 },
  logoutBtn: { marginTop: 8, padding: 8, backgroundColor: '#fff', borderRadius: 10, borderWidth: 1, borderColor: '#eee' },
  subtitle: { fontSize: 14, color: '#aaa', marginBottom: 24 },
  grid: { gap: 14 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, padding: 16, borderLeftWidth: 4, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 2, gap: 14 },
  iconCircle: { width: 50, height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  cardText: { flex: 1 },
  cardName: { fontSize: 16, fontWeight: '700', color: '#1a1a1a', marginBottom: 3 },
  cardDesc: { fontSize: 13, color: '#888' },
  quoteCard: { marginTop: 28, backgroundColor: '#fff', borderRadius: 14, padding: 20, borderLeftWidth: 4, borderLeftColor: '#085041' },
  quoteText: { fontSize: 14, color: '#555', fontStyle: 'italic', lineHeight: 22, marginBottom: 8 },
  quoteAuthor: { fontSize: 12, color: '#aaa', fontWeight: '600' },
});
