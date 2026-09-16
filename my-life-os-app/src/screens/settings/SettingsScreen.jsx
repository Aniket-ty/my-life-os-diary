import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Alert, Pressable,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../stores/authStore';
import Screen from '../../components/ui/Screen';
import PageHeader from '../../components/ui/PageHeader';
import GlassCard from '../../components/ui/GlassCard';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { colors, radii, tint, type as typ } from '../../theme';

export default function SettingsScreen({ navigation }) {
  const { user, logout, deleteAccount } = useAuthStore();
  const [showDanger, setShowDanger] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
  };

  const confirmDelete = () => {
    Alert.alert(
      'Delete your account?',
      'This permanently deletes your account, all diary entries, body scans, workouts and attached media. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Continue', style: 'destructive', onPress: () => setShowDanger(true) },
      ]
    );
  };

  const handleDelete = async () => {
    if (confirmEmail.trim().toLowerCase() !== user?.email?.toLowerCase()) {
      return Alert.alert('Email mismatch', `Type ${user?.email} to confirm.`);
    }
    if (!password) return Alert.alert('Password required', 'Enter your password to confirm.');
    setBusy(true);
    try {
      await deleteAccount(password);
      navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
    } catch (e) {
      Alert.alert('Could not delete account', e?.response?.data?.error || 'Please try again.');
    } finally {
      setBusy(false);
    }
  };

  const field = (label, value) => (
    <View key={label} style={styles.tile}>
      <Text style={styles.tileLabel}>{label}</Text>
      <Text style={styles.tileValue}>{value || '—'}</Text>
    </View>
  );

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <PageHeader
          title="Settings"
          subtitle="Your profile, security and account"
          icon={<Ionicons name="settings-outline" />}
          accent={colors.violet}
        />

        <Text style={styles.sectionHeading}>
          <Ionicons name="person-outline" size={16} color={colors.violet} />  Profile
        </Text>
        <GlassCard strong style={styles.grid}>
          {field('Name', user?.name)}
          {field('Email', user?.email)}
          {field('Age', user?.age)}
          {field('Height', user?.heightCm ? `${user.heightCm} cm` : null)}
          {field('Activity level', user?.activityLevel?.replace(/([A-Z])/g, ' $1'))}
          {field('Fitness goal', user?.fitnessGoal)}
        </GlassCard>

        <Text style={styles.sectionHeading}>
          <Ionicons name="shield-checkmark-outline" size={16} color={colors.emerald} />  Session
        </Text>
        <GlassCard strong>
          <Button
            variant="outline"
            icon={<Ionicons name="log-out-outline" />}
            onPress={handleLogout}
          >
            Sign out of this device
          </Button>
        </GlassCard>

        <Text style={[styles.sectionHeading, { color: colors.rose }]}>
          <Ionicons name="warning-outline" size={16} color={colors.rose} />  Danger zone
        </Text>
        <View style={styles.dangerCard}>
          <Text style={styles.dangerDesc}>
            Permanently deletes your account, all diary entries, body scans, workout history and attached media. This cannot be undone.
          </Text>

          {!showDanger ? (
            <Button
              variant="danger"
              icon={<Ionicons name="trash-outline" />}
              onPress={confirmDelete}
            >
              Delete my account
            </Button>
          ) : (
            <View style={styles.dangerInner}>
              <Text style={styles.dangerNote}>
                Type <Text style={{ fontWeight: '800' }}>{user?.email}</Text> to confirm, then enter your password.
              </Text>
              <Input
                label="Confirm email"
                placeholder={user?.email}
                value={confirmEmail}
                onChangeText={setConfirmEmail}
                autoCapitalize="none"
                keyboardType="email-address"
              />
              <Input
                label="Password"
                placeholder="Your password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
              <View style={styles.dangerActions}>
                <Button variant="danger" loading={busy} onPress={handleDelete}>
                  Permanently delete
                </Button>
                <Pressable onPress={() => setShowDanger(false)} disabled={busy} style={styles.cancelDanger}>
                  <Text style={styles.cancelDangerText}>Cancel</Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 60 },
  sectionHeading: {
    ...typ.h2,
    fontSize: 16,
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 12,
    gap: 6,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  tile: {
    flexGrow: 1,
    flexBasis: '45%',
    minWidth: 130,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: radii.lg,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  tileLabel: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.8, color: colors.textFaint },
  tileValue: { marginTop: 2, fontSize: 14, fontWeight: '600', color: colors.white, textTransform: 'capitalize' },
  dangerCard: {
    borderRadius: radii.xxl,
    borderWidth: 1,
    borderColor: tint(colors.rose, 0.25),
    backgroundColor: tint(colors.rose, 0.04),
    padding: 20,
  },
  dangerDesc: { ...typ.small, color: colors.textMuted, marginBottom: 16, lineHeight: 20 },
  dangerInner: { gap: 12 },
  dangerNote: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fda4af',
    backgroundColor: tint(colors.rose, 0.06),
    borderWidth: 1,
    borderColor: tint(colors.rose, 0.3),
    borderRadius: radii.lg,
    padding: 12,
  },
  dangerActions: { flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  cancelDanger: { paddingVertical: 10, paddingHorizontal: 12 },
  cancelDangerText: { color: colors.textMuted, fontSize: 14, fontWeight: '600' },
});
