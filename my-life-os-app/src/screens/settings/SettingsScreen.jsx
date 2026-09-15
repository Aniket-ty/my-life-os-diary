import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, StatusBar,
  TextInput, Alert, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../stores/authStore';

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
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldValue}>{value || '—'}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8f9fa" />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="chevron-back" size={24} color="#3d2b1f" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionTitle}>Profile</Text>
        <View style={styles.card}>
          {field('Name', user?.name)}
          {field('Email', user?.email)}
          {field('Age', user?.age)}
          {field('Height', user?.heightCm ? `${user.heightCm} cm` : null)}
          {field('Activity level', user?.activityLevel?.replace(/([A-Z])/g, ' $1'))}
          {field('Fitness goal', user?.fitnessGoal)}
        </View>

        <Text style={styles.sectionTitle}>Session</Text>
        <TouchableOpacity style={styles.cardRow} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#e74c3c" />
          <Text style={styles.logoutText}>Sign out</Text>
        </TouchableOpacity>

        <Text style={[styles.sectionTitle, { color: '#e74c3c' }]}>Danger zone</Text>
        <View style={[styles.card, styles.dangerCard]}>
          {!showDanger ? (
            <TouchableOpacity style={styles.dangerBtn} onPress={confirmDelete}>
              <Ionicons name="trash-outline" size={18} color="#fff" />
              <Text style={styles.dangerBtnText}>Delete my account</Text>
            </TouchableOpacity>
          ) : (
            <View>
              <Text style={styles.dangerNote}>
                Type <Text style={{ fontWeight: '800', color: '#e74c3c' }}>{user?.email}</Text> to confirm, then enter your password.
              </Text>
              <TextInput
                style={styles.input} placeholder="Confirm email" value={confirmEmail}
                onChangeText={setConfirmEmail} autoCapitalize="none" keyboardType="email-address"
                placeholderTextColor="#bbb"
              />
              <TextInput
                style={styles.input} placeholder="Password" value={password}
                onChangeText={setPassword} secureTextEntry placeholderTextColor="#bbb"
              />
              <TouchableOpacity style={[styles.dangerBtn, { marginTop: 6 }]} onPress={handleDelete} disabled={busy}>
                {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.dangerBtnText}>Permanently delete account</Text>}
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelDanger} onPress={() => setShowDanger(false)} disabled={busy}>
                <Text style={styles.cancelDangerText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8f9fa' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 12,
  },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1a1a1a' },
  scroll: { paddingHorizontal: 20, paddingBottom: 40 },
  sectionTitle: {
    fontSize: 12, fontWeight: '700', color: '#888',
    textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 20, marginBottom: 8,
  },
  card: { backgroundColor: '#fff', borderRadius: 14, padding: 6, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, elevation: 1 },
  field: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 11, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#eee' },
  fieldLabel: { fontSize: 13, color: '#888' },
  fieldValue: { fontSize: 13, fontWeight: '600', color: '#1a1a1a', textTransform: 'capitalize' },
  cardRow: { backgroundColor: '#fff', borderRadius: 14, flexDirection: 'row', alignItems: 'center', gap: 10, padding: 16 },
  logoutText: { fontSize: 15, color: '#e74c3c', fontWeight: '600' },
  dangerCard: { padding: 10 },
  dangerBtn: { backgroundColor: '#e74c3c', borderRadius: 10, padding: 14, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 },
  dangerBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  dangerNote: { fontSize: 12, color: '#666', marginBottom: 12, lineHeight: 18 },
  input: {
    borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 10, padding: 13,
    fontSize: 15, backgroundColor: '#fafafa', color: '#222', marginBottom: 10,
  },
  cancelDanger: { marginTop: 10, alignItems: 'center', padding: 6 },
  cancelDangerText: { color: '#888', fontSize: 14, fontWeight: '600' },
});