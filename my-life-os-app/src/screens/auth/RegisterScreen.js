import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../stores/authStore';
import Screen from '../../components/ui/Screen';
import Button from '../../components/ui/Button';
import GlassCard from '../../components/ui/GlassCard';
import Input from '../../components/ui/Input';
import { colors, radii, shadow, spacing, tint, type as typ } from '../../theme';

export default function RegisterScreen({ navigation }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuthStore();

  const handleRegister = async () => {
    if (!name || !email || !password) return Alert.alert('Error', 'Fill in all fields');
    if (password.length < 8) return Alert.alert('Error', 'Password must be at least 8 characters');
    setLoading(true);
    try {
      await register(email.trim(), password, name.trim());
    } catch (e) {
      Alert.alert('Registration failed', e?.response?.data?.error || 'Something went wrong');
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
          <Text style={[typ.display, styles.title]}>Create account</Text>
          <Text style={styles.tagline}>Get started with My Life OS</Text>
        </View>

        <GlassCard strong style={styles.card}>
          <Input
            label="Name"
            placeholder="Your name"
            value={name}
            onChangeText={setName}
            icon={<Ionicons name="person-outline" size={16} color={colors.textFaint} />}
            style={styles.field}
          />
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
            placeholder="Password (min 8 chars)"
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
            onPress={handleRegister}
            icon={<Ionicons name="arrow-forward" size={18} />}
            style={styles.submit}
          >
            Create account
          </Button>
          <TouchableOpacity style={styles.linkWrap} onPress={() => navigation.navigate('Login')}>
            <Text style={styles.linkMuted}>
              Already have an account? <Text style={styles.link}>Sign in</Text>
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
  tagline: { ...typ.bodyMuted, textAlign: 'center', marginTop: spacing.sm },
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