import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../stores/authStore';
import Screen from '../../components/ui/Screen';
import Button from '../../components/ui/Button';
import GlassCard from '../../components/ui/GlassCard';
import Input from '../../components/ui/Input';
import { colors, radii, shadow, spacing, tint, type as typ } from '../../theme';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuthStore();

  const handleLogin = async () => {
    if (!email || !password) return Alert.alert('Error', 'Fill in all fields');
    setLoading(true);
    try {
      await login(email.trim(), password);
    } catch (e) {
      Alert.alert('Login failed', e?.response?.data?.error || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.hero}>
          <View style={styles.logo}>
            <Ionicons name="command-outline" size={30} color={colors.white} />
          </View>
          <Text style={[typ.display, styles.title]}>
            My <Text style={styles.accent}>Life</Text> OS
          </Text>
          <Text style={styles.tagline}>
            Your personal operating system. Diary, fitness, AI — all in one beautiful place.
          </Text>
        </View>

        <GlassCard strong style={styles.card}>
          <Input
            label="Email"
            placeholder="you@example.com"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            icon={<Ionicons name="mail-outline" size={16} color={colors.textFaint} />}
            style={styles.field}
          />
          <Input
            label="Password"
            placeholder="Your password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            icon={<Ionicons name="lock-closed-outline" size={16} color={colors.textFaint} />}
            style={styles.field}
          />
          <Button
            variant="primary"
            size="lg"
            loading={loading}
            onPress={handleLogin}
            icon={<Ionicons name="arrow-forward" size={18} />}
            style={styles.submit}
          >
            Sign in
          </Button>
          <TouchableOpacity style={styles.linkWrap} onPress={() => navigation.navigate('Register')}>
            <Text style={styles.linkMuted}>
              Don't have an account? <Text style={styles.link}>Register</Text>
            </Text>
          </TouchableOpacity>
        </GlassCard>

        <View style={styles.footer}>
          <View style={styles.chip}>
            <Ionicons name="sparkles-outline" size={13} color={colors.violet} />
            <Text style={styles.chipText}>AI Coach</Text>
          </View>
          <View style={styles.dot} />
          <View style={styles.chip}>
            <Ionicons name="barbell-outline" size={13} color={colors.emerald} />
            <Text style={styles.chipText}>Fitness</Text>
          </View>
          <View style={styles.dot} />
          <View style={styles.chip}>
            <Ionicons name="book-outline" size={13} color={colors.gold300} />
            <Text style={styles.chipText}>Diary</Text>
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.xxxl,
  },
  hero: { alignItems: 'center', marginBottom: spacing.xxxl },
  logo: {
    width: 64,
    height: 64,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: tint(colors.violet, 0.28),
    borderWidth: 1,
    borderColor: tint(colors.indigo, 0.45),
    ...shadow.glow(colors.violet),
  },
  title: { textAlign: 'center', marginTop: spacing.lg },
  accent: { color: colors.gold300 },
  tagline: { ...typ.bodyMuted, textAlign: 'center', marginTop: spacing.sm, maxWidth: 300 },
  card: { marginBottom: spacing.xxl },
  field: { marginBottom: spacing.lg },
  submit: { marginTop: spacing.xs, width: '100%' },
  linkWrap: { marginTop: spacing.xl, alignItems: 'center' },
  linkMuted: { ...typ.small, color: colors.textFaint },
  link: { color: colors.violet, fontWeight: '700' },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
  },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  chipText: { fontSize: 11, fontWeight: '600', color: colors.textFaint },
  dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.edge },
});