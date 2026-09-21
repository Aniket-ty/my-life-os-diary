import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../../components/ui/Screen';
import GlassCard from '../../components/ui/GlassCard';
import { colors, radii, tint, type as typ, overlays } from '../../theme';
import { expenseService } from '../../services/expenseService';
import { useAuthStore } from '../../stores/authStore';

const CATEGORIES = [
  'Food', 'Transport', 'Shopping', 'Bills', 'Entertainment',
  'Health', 'Fitness', 'Education', 'Travel', 'Groceries', 'Rent', 'Other',
];

const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AED', 'JPY', 'CAD', 'AUD', 'SGD'];

export default function AddExpenseScreen({ navigation, route }) {
  const initialGroupId = route.params?.groupId;
  const { user } = useAuthStore();

  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('INR');
  const [category, setCategory] = useState('Food');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [groupId, setGroupId] = useState(initialGroupId || '');
  const [paidById, setPaidById] = useState('');
  const [groups, setGroups] = useState([]);
  const [splitType, setSplitType] = useState('EQUAL');
  const [loading, setLoading] = useState(false);

  // Quick member invite state
  const [showAddMemberBox, setShowAddMemberBox] = useState(false);
  const [newMemberContact, setNewMemberContact] = useState('');
  const [invitingMember, setInvitingMember] = useState(false);

  useEffect(() => {
    expenseService.getGroups().then(setGroups).catch(() => {});
  }, []);

  useEffect(() => {
    if (user?.id && !paidById) {
      setPaidById(user.id);
    }
  }, [user]);

  const selectedGroup = groups.find((g) => g.id === groupId);
  const groupMembers = selectedGroup?.members || [];

  const handleAddMemberToGroup = async () => {
    if (!newMemberContact.trim() || !groupId) return;
    try {
      setInvitingMember(true);
      const contact = newMemberContact.trim();
      const isPhone = /^\+?[\d\s-]{7,15}$/.test(contact);
      const payload = isPhone ? { phoneNumber: contact } : { email: contact };
      const res = await expenseService.addMember(groupId, payload);
      if (res?.pending) {
        Alert.alert('Invite Sent', res.message || 'Invitation sent to friend via email/SMS!');
      } else {
        Alert.alert('Success', 'Friend added to group split!');
      }
      setNewMemberContact('');
      setShowAddMemberBox(false);
      const updated = await expenseService.getGroups();
      setGroups(updated);
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to add member to group');
    } finally {
      setInvitingMember(false);
    }
  };

  const handleSave = async () => {
    const numAmt = parseFloat(amount);
    if (!title.trim() || isNaN(numAmt) || numAmt <= 0) {
      Alert.alert('Validation Error', 'Please enter a valid title and positive amount.');
      return;
    }

    try {
      setLoading(true);
      await expenseService.createExpense({
        title: title.trim(),
        amount: numAmt,
        currency,
        category,
        expenseDate,
        notes: notes.trim() || undefined,
        groupId: groupId || undefined,
        paidById: groupId && paidById ? paidById : undefined,
        splitType: groupId ? splitType : undefined,
      });

      Alert.alert('Success', 'Expense recorded successfully!');
      navigation.goBack();
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to record expense');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={22} color={colors.textSoft} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Expense</Text>
        <View style={{ width: 38 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Title */}
        <GlassCard style={styles.card}>
          <Text style={styles.label}>TITLE / DESCRIPTION</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="e.g. Dinner with Friends"
            placeholderTextColor={colors.textFaint}
            style={styles.input}
          />
        </GlassCard>

        {/* Currency & Amount */}
        <GlassCard style={styles.card}>
          <Text style={styles.label}>AMOUNT</Text>
          <View style={styles.amountRow}>
            <View style={styles.currencyBox}>
              <Text style={styles.currencyText}>{currency}</Text>
            </View>
            <TextInput
              value={amount}
              onChangeText={setAmount}
              placeholder="0.00"
              keyboardType="decimal-pad"
              placeholderTextColor={colors.textFaint}
              style={[styles.input, styles.amountInput]}
            />
          </View>

          {/* Quick Currency Selector */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.currencyScroll}>
            {CURRENCIES.map((c) => (
              <TouchableOpacity
                key={c}
                onPress={() => setCurrency(c)}
                style={[
                  styles.currencyPill,
                  currency === c && { backgroundColor: colors.violet },
                ]}
              >
                <Text
                  style={[
                    styles.currencyPillText,
                    currency === c && { color: colors.white },
                  ]}
                >
                  {c}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </GlassCard>

        {/* Category Pills */}
        <GlassCard style={styles.card}>
          <Text style={styles.label}>CATEGORY</Text>
          <View style={styles.catGrid}>
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat}
                onPress={() => setCategory(cat)}
                style={[
                  styles.catPill,
                  category === cat && { backgroundColor: tint(colors.violet, 0.25), borderColor: colors.violet },
                ]}
              >
                <Text
                  style={[
                    styles.catText,
                    category === cat && { color: colors.white, fontWeight: '700' },
                  ]}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </GlassCard>

        {/* Group Option */}
        <GlassCard style={styles.card}>
          <Text style={styles.label}>GROUP SPLIT (OPTIONAL)</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }}>
            <TouchableOpacity
              onPress={() => setGroupId('')}
              style={[
                styles.groupPill,
                !groupId && { backgroundColor: colors.violet },
              ]}
            >
              <Text style={[styles.groupPillText, !groupId && { color: colors.white }]}>
                Personal (None)
              </Text>
            </TouchableOpacity>

            {groups.map((g) => (
              <TouchableOpacity
                key={g.id}
                onPress={() => setGroupId(g.id)}
                style={[
                  styles.groupPill,
                  groupId === g.id && { backgroundColor: colors.violet },
                ]}
              >
                <Text
                  style={[
                    styles.groupPillText,
                    groupId === g.id && { color: colors.white },
                  ]}
                >
                  {g.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Split Mode & Group Members if Group Selected */}
          {groupId ? (
            <View style={styles.splitBox}>
              <Text style={styles.splitTitle}>Split Method:</Text>
              <View style={styles.splitRow}>
                {['EQUAL', 'EXACT', 'PERCENTAGE', 'SHARES'].map((st) => (
                  <TouchableOpacity
                    key={st}
                    onPress={() => setSplitType(st)}
                    style={[
                      styles.splitBtn,
                      splitType === st && { backgroundColor: colors.violet },
                    ]}
                  >
                    <Text
                      style={[
                        styles.splitBtnText,
                        splitType === st && { color: colors.white },
                      ]}
                    >
                      {st}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Paid By Selector */}
              <View style={styles.sectionDivider}>
                <Text style={styles.splitTitle}>Paid By:</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 4 }}>
                  {groupMembers.map((m) => {
                    const isMe = m.id === user?.id;
                    const isSelected = paidById === m.id || (!paidById && isMe);
                    return (
                      <TouchableOpacity
                        key={m.id}
                        onPress={() => setPaidById(m.id)}
                        style={[
                          styles.payerPill,
                          isSelected && { backgroundColor: tint(colors.emerald, 0.25), borderColor: colors.emerald },
                        ]}
                      >
                        <Text style={[styles.payerPillText, isSelected && { color: colors.emerald, fontWeight: '700' }]}>
                          {isMe ? `${m.name} (You)` : m.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Group Members List */}
              <View style={styles.sectionDivider}>
                <View style={styles.membersHeaderRow}>
                  <Text style={styles.splitTitle}>
                    Splitting Among ({groupMembers.length} members):
                  </Text>
                  <TouchableOpacity
                    onPress={() => setShowAddMemberBox(!showAddMemberBox)}
                    style={styles.addMemberToggleBtn}
                  >
                    <Ionicons
                      name={showAddMemberBox ? 'close' : 'person-add-outline'}
                      size={14}
                      color={colors.violet}
                    />
                    <Text style={styles.addMemberToggleText}>
                      {showAddMemberBox ? 'Cancel' : 'Invite by Phone/Email'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Quick Add / Invite Friend Box */}
                {showAddMemberBox && (
                  <View style={styles.quickInviteBox}>
                    <Text style={styles.quickInviteLabel}>
                      Invite friend by phone (+1, +44, +91, +971, etc.) or email (Non-app users receive SMS/Email invite link):
                    </Text>
                    <View style={styles.quickInviteRow}>
                      <TextInput
                        value={newMemberContact}
                        onChangeText={setNewMemberContact}
                        placeholder="Phone (+1..., +91...) or Email"
                        placeholderTextColor={colors.textFaint}
                        style={styles.quickInviteInput}
                        autoCapitalize="none"
                      />
                      <TouchableOpacity
                        style={styles.quickInviteBtn}
                        onPress={handleAddMemberToGroup}
                        disabled={invitingMember || !newMemberContact.trim()}
                      >
                        {invitingMember ? (
                          <ActivityIndicator size="small" color={colors.white} />
                        ) : (
                          <Text style={styles.quickInviteBtnText}>Invite</Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                <View style={styles.membersPillsRow}>
                  {groupMembers.map((m) => (
                    <View key={m.id} style={styles.memberTag}>
                      <Ionicons name="person-circle-outline" size={14} color={colors.violet} />
                      <Text style={styles.memberTagName}>
                        {m.id === user?.id ? `${m.name} (You)` : m.name}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          ) : null}
        </GlassCard>

        {/* Notes */}
        <GlassCard style={styles.card}>
          <Text style={styles.label}>NOTES</Text>
          <TextInput
            value={notes}
            onChangeText={setNotes}
            placeholder="Optional context or memo"
            placeholderTextColor={colors.textFaint}
            style={styles.input}
          />
        </GlassCard>

        {/* Save Button */}
        <TouchableOpacity
          style={styles.saveBtn}
          onPress={handleSave}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color={colors.white} />
          ) : (
            <Text style={styles.saveBtnText}>Save Expense</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 50,
    paddingBottom: 14,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: radii.md,
    backgroundColor: overlays.soft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: { ...typ.h2, fontSize: 18, color: colors.white },
  scroll: { paddingHorizontal: 20, paddingBottom: 60, gap: 14 },
  card: { padding: 16, borderRadius: radii.lg },
  label: { fontSize: 11, fontWeight: '700', color: colors.textMuted, letterSpacing: 1, marginBottom: 8 },
  input: {
    color: colors.white,
    fontSize: 15,
    paddingVertical: 6,
  },
  amountRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  currencyBox: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.md,
    backgroundColor: overlays.mid,
  },
  currencyText: { fontSize: 14, fontWeight: '700', color: colors.violet },
  amountInput: { flex: 1, fontSize: 24, fontWeight: '800' },
  currencyScroll: { marginTop: 12 },
  currencyPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.full,
    backgroundColor: overlays.mid,
    marginRight: 8,
  },
  currencyPillText: { fontSize: 11, fontWeight: '600', color: colors.textMuted },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catPill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radii.md,
    backgroundColor: overlays.soft,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  catText: { fontSize: 12, color: colors.textSoft },
  groupPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radii.full,
    backgroundColor: overlays.mid,
    marginRight: 8,
  },
  groupPillText: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
  splitBox: { marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: overlays.borderSoft },
  splitTitle: { fontSize: 11, color: colors.textMuted, marginBottom: 6 },
  splitRow: { flexDirection: 'row', gap: 6 },
  splitBtn: {
    flex: 1,
    paddingVertical: 6,
    borderRadius: radii.md,
    backgroundColor: overlays.mid,
    alignItems: 'center',
  },
  splitBtnText: { fontSize: 10, fontWeight: '700', color: colors.textMuted },
  sectionDivider: { marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: overlays.borderSoft },
  payerPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radii.md,
    backgroundColor: overlays.soft,
    marginRight: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  payerPillText: { fontSize: 12, color: colors.textSoft },
  membersHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  addMemberToggleBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 2 },
  addMemberToggleText: { fontSize: 11, fontWeight: '700', color: colors.violet },
  quickInviteBox: {
    backgroundColor: tint(colors.violet, 0.08),
    padding: 10,
    borderRadius: radii.md,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: tint(colors.violet, 0.2),
  },
  quickInviteLabel: { fontSize: 10, color: colors.textMuted, marginBottom: 6 },
  quickInviteRow: { flexDirection: 'row', gap: 8 },
  quickInviteInput: {
    flex: 1,
    backgroundColor: overlays.strong,
    color: colors.white,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radii.sm,
    fontSize: 12,
  },
  quickInviteBtn: {
    backgroundColor: colors.violet,
    paddingHorizontal: 14,
    borderRadius: radii.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickInviteBtnText: { color: colors.white, fontSize: 12, fontWeight: '700' },
  membersPillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  memberTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radii.full,
    backgroundColor: overlays.soft,
  },
  memberTagName: { fontSize: 11, color: colors.textSoft },
  saveBtn: {
    backgroundColor: colors.violet,
    paddingVertical: 16,
    borderRadius: radii.xl,
    alignItems: 'center',
    marginTop: 10,
  },
  saveBtnText: { fontSize: 15, fontWeight: '700', color: colors.white },
});
