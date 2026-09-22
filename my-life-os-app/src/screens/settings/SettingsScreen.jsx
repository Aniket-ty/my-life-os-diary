import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Alert, Pressable, TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../stores/authStore';
import Screen from '../../components/ui/Screen';
import PageHeader from '../../components/ui/PageHeader';
import GlassCard from '../../components/ui/GlassCard';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import CountryPhoneInput from '../../components/ui/CountryPhoneInput';
import { colors, radii, tint, overlays, type as typ } from '../../theme';

const ACTIVITY_LEVELS = [
  { value: 'sedentary', label: 'Sedentary', sub: 'Little / no exercise' },
  { value: 'light', label: 'Light', sub: '1–3 days/wk' },
  { value: 'moderate', label: 'Moderate', sub: '3–5 days/wk' },
  { value: 'veryActive', label: 'Very Active', sub: '6–7 days/wk' },
  { value: 'extraActive', label: 'Extra Active', sub: 'Physical job / 2x/day' },
];

const FITNESS_GOALS = [
  { value: 'fatLoss', label: 'Fat Loss', icon: 'flame-outline' },
  { value: 'maintain', label: 'Maintain', icon: 'shield-outline' },
  { value: 'muscleGain', label: 'Muscle Gain', icon: 'barbell-outline' },
  { value: 'endurance', label: 'Endurance', icon: 'speedometer-outline' },
];

export default function SettingsScreen({ navigation }) {
  const { user, logout, updateProfile, deleteAccount } = useAuthStore();

  // Profile Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [phoneNumber, setPhoneNumber] = useState(user?.phoneNumber || '');
  const [age, setAge] = useState(user?.age != null ? String(user?.age) : '');
  const [heightCm, setHeightCm] = useState(user?.heightCm != null ? String(user?.heightCm) : '');
  const [activityLevel, setActivityLevel] = useState(user?.activityLevel || 'moderate');
  const [fitnessGoal, setFitnessGoal] = useState(user?.fitnessGoal || 'maintain');

  // Danger Zone State
  const [showDanger, setShowDanger] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
      setPhoneNumber(user.phoneNumber || '');
      setAge(user.age != null ? String(user.age) : '');
      setHeightCm(user.heightCm != null ? String(user.heightCm) : '');
      setActivityLevel(user.activityLevel || 'moderate');
      setFitnessGoal(user.fitnessGoal || 'maintain');
    }
  }, [user]);

  const handleResetForm = () => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
      setPhoneNumber(user.phoneNumber || '');
      setAge(user.age != null ? String(user.age) : '');
      setHeightCm(user.heightCm != null ? String(user.heightCm) : '');
      setActivityLevel(user.activityLevel || 'moderate');
      setFitnessGoal(user.fitnessGoal || 'maintain');
    }
    setIsEditing(false);
  };

  const handleSaveProfile = async () => {
    if (!name.trim()) {
      return Alert.alert('Missing Name', 'Please provide your full name.');
    }
    if (!email.trim()) {
      return Alert.alert('Missing Email', 'Please provide a valid email address.');
    }

    setSavingProfile(true);
    try {
      await updateProfile({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        phoneNumber: phoneNumber.trim() || null,
        age: age ? Number(age) : null,
        heightCm: heightCm ? Number(heightCm) : null,
        activityLevel,
        goal: fitnessGoal,
      });
      setIsEditing(false);
      Alert.alert('Profile Updated', 'Your user details have been saved successfully.');
    } catch (e) {
      Alert.alert('Could not update profile', e?.response?.data?.error || 'Please try again.');
    } finally {
      setSavingProfile(false);
    }
  };

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

  const field = (label, value, icon, isHighlight = false) => (
    <View key={label} style={[styles.tile, isHighlight && styles.tileHighlight]}>
      <View style={styles.tileHeader}>
        {icon ? <Ionicons name={icon} size={12} color={isHighlight ? colors.volt400 : colors.textFaint} /> : null}
        <Text style={[styles.tileLabel, isHighlight && { color: colors.volt300 }]}>{label}</Text>
      </View>
      <Text style={[styles.tileValue, isHighlight && { color: colors.volt300 }]} numberOfLines={1}>
        {value || '—'}
      </Text>
    </View>
  );

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <PageHeader
          title="Settings"
          subtitle="Your profile, security and account"
          icon={<Ionicons name="settings-outline" />}
          accent={colors.volt}
        />

        {/* Profile Card */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionHeading}>
            <Ionicons name="person-outline" size={16} color={colors.volt400} />  Profile Details
          </Text>
          {!isEditing ? (
            <TouchableOpacity
              style={styles.editBtn}
              onPress={() => setIsEditing(true)}
              activeOpacity={0.7}
            >
              <Ionicons name="pencil-outline" size={13} color={colors.volt300} />
              <Text style={styles.editBtnText}>Edit Details</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={handleResetForm}
              activeOpacity={0.7}
            >
              <Ionicons name="close-outline" size={14} color={colors.textMuted} />
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          )}
        </View>

        {!isEditing ? (
          <GlassCard strong style={styles.grid}>
            {field('Full Name', user?.name, 'person-outline')}
            {field('Email Address', user?.email, 'mail-outline')}
            {field('Mobile Number', user?.phoneNumber ? user.phoneNumber : 'Not set', 'call-outline', !!user?.phoneNumber)}
            {field('Age', user?.age ? `${user.age} yrs` : null, 'calendar-outline')}
            {field('Height', user?.heightCm ? `${user.heightCm} cm` : null, 'resize-outline')}
            {field('Activity Level', user?.activityLevel?.replace(/([A-Z])/g, ' $1'), 'flash-outline')}
            {field('Fitness Goal', user?.fitnessGoal, 'fitness-outline')}
          </GlassCard>
        ) : (
          <GlassCard strong style={styles.editCard}>
            <Input
              label="Full Name"
              placeholder="Your full name"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />

            <Input
              label="Email Address"
              placeholder="your.email@example.com"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />

            <CountryPhoneInput
              label="Mobile Number"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              placeholder="98765 43210"
            />
            <Text style={styles.fieldHint}>
              Used for shared group expense invites and notifications.
            </Text>

            <View style={styles.rowTwo}>
              <View style={{ flex: 1 }}>
                <Input
                  label="Age"
                  placeholder="e.g. 26"
                  value={age}
                  onChangeText={setAge}
                  keyboardType="numeric"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Input
                  label="Height (cm)"
                  placeholder="e.g. 178"
                  value={heightCm}
                  onChangeText={setHeightCm}
                  keyboardType="numeric"
                />
              </View>
            </View>

            {/* Activity Level Selector */}
            <Text style={styles.inputLabel}>Activity Level</Text>
            <View style={styles.chipsContainer}>
              {ACTIVITY_LEVELS.map((item) => {
                const active = activityLevel === item.value;
                return (
                  <TouchableOpacity
                    key={item.value}
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() => setActivityLevel(item.value)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.chipLabel, active && styles.chipLabelActive]}>{item.label}</Text>
                    <Text style={[styles.chipSub, active && styles.chipSubActive]}>{item.sub}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Fitness Goal Selector */}
            <Text style={[styles.inputLabel, { marginTop: 12 }]}>Fitness Goal</Text>
            <View style={styles.chipsRow}>
              {FITNESS_GOALS.map((item) => {
                const active = fitnessGoal === item.value;
                return (
                  <TouchableOpacity
                    key={item.value}
                    style={[styles.goalChip, active && styles.goalChipActive]}
                    onPress={() => setFitnessGoal(item.value)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={item.icon}
                      size={14}
                      color={active ? colors.white : colors.textMuted}
                    />
                    <Text style={[styles.goalChipText, active && styles.goalChipTextActive]}>
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.editActions}>
              <Button
                variant="outline"
                onPress={handleResetForm}
                disabled={savingProfile}
                style={{ flex: 1 }}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                loading={savingProfile}
                icon={<Ionicons name="save-outline" />}
                onPress={handleSaveProfile}
                style={{ flex: 1.4 }}
              >
                Save Changes
              </Button>
            </View>
          </GlassCard>
        )}

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
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 24,
    marginBottom: 12,
  },
  sectionHeading: {
    ...typ.h2,
    fontSize: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: tint(colors.volt, 0.15),
    borderWidth: 1,
    borderColor: tint(colors.volt, 0.35),
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.md,
  },
  editBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.volt300,
  },
  cancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: overlays.soft,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.md,
  },
  cancelBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
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
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.03)',
  },
  tileHighlight: {
    borderColor: tint(colors.volt, 0.25),
    backgroundColor: tint(colors.volt, 0.06),
  },
  tileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  tileLabel: { fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.8, color: colors.textFaint },
  tileValue: { marginTop: 4, fontSize: 14, fontWeight: '600', color: colors.white, textTransform: 'capitalize' },
  editCard: {
    padding: 16,
    gap: 8,
  },
  rowTwo: {
    flexDirection: 'row',
    gap: 12,
  },
  fieldHint: {
    fontSize: 10,
    color: colors.textFaint,
    marginTop: -8,
    marginBottom: 8,
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginTop: 6,
    marginBottom: 8,
  },
  chipsContainer: {
    gap: 6,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: radii.md,
    backgroundColor: overlays.soft,
    borderWidth: 1,
    borderColor: overlays.borderSoft,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  chipActive: {
    backgroundColor: tint(colors.volt, 0.18),
    borderColor: colors.volt,
  },
  chipLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSoft,
  },
  chipLabelActive: {
    color: colors.white,
    fontWeight: '700',
  },
  chipSub: {
    fontSize: 11,
    color: colors.textFaint,
  },
  chipSubActive: {
    color: colors.volt300,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  goalChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: radii.md,
    backgroundColor: overlays.soft,
    borderWidth: 1,
    borderColor: overlays.borderSoft,
  },
  goalChipActive: {
    backgroundColor: tint(colors.volt, 0.2),
    borderColor: colors.volt,
  },
  goalChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textMuted,
  },
  goalChipTextActive: {
    color: colors.white,
    fontWeight: '700',
  },
  editActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: overlays.borderSoft,
  },
  dangerCard: {
    borderRadius: radii.xxl,
    borderWidth: 1,
    borderColor: tint(colors.rose, 0.25),
    backgroundColor: tint(colors.rose, 0.04),
    padding: 20,
    marginTop: 12,
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

