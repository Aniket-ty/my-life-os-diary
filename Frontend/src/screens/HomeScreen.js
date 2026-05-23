import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useAuthStore } from '../stores/authStore';

export default function HomeScreen() {
  const { user, logout } = useAuthStore();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome, {user?.name} 👋</Text>
      <Text style={styles.sub}>My Life OS is ready.</Text>
      <TouchableOpacity style={styles.btn} onPress={logout}>
        <Text style={styles.btnText}>Log out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff' },
  title: { fontSize: 22, fontWeight: '600', marginBottom: 8 },
  sub: { fontSize: 15, color: '#888', marginBottom: 40 },
  btn: { paddingHorizontal: 24, paddingVertical: 12, backgroundColor: '#085041', borderRadius: 10 },
  btnText: { color: '#9FE1CB', fontWeight: '600' },
});
