import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  TextInput,
  Alert,
  Modal,
  ActivityIndicator,
  Share,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../../components/ui/Screen';
import GlassCard from '../../components/ui/GlassCard';
import { colors, radii, tint, type as typ, overlays } from '../../theme';
import { expenseService } from '../../services/expenseService';
import { useAuthStore } from '../../stores/authStore';

export default function GroupDetailScreen({ route, navigation }) {
  const { groupId, groupName } = route.params;
  const { user } = useAuthStore();

  const [group, setGroup] = useState(null);
  const [activeTab, setActiveTab] = useState('balances');
  const [loading, setLoading] = useState(true);

  // Settle modal state
  const [settleModalVisible, setSettleModalVisible] = useState(false);
  const [settlePayer, setSettlePayer] = useState('');
  const [settlePayee, setSettlePayee] = useState('');
  const [settleAmount, setSettleAmount] = useState('');
  const [settling, setSettling] = useState(false);

  // Add member modal state
  const [addMemberModalVisible, setAddMemberModalVisible] = useState(false);
  const [memberContact, setMemberContact] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchingUsers, setSearchingUsers] = useState(false);
  const [addingMember, setAddingMember] = useState(false);

  const loadGroup = async () => {
    try {
      setLoading(true);
      const data = await expenseService.getGroupById(groupId);
      setGroup(data);
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to load group details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGroup();
  }, [groupId]);

  const handleShareStatement = async () => {
    if (!group) return;
    const balancesStr = (group.balances || [])
      .map((b) => `${b.name}: ${b.net > 0 ? `gets back ₹${b.net.toFixed(2)}` : b.net < 0 ? `owes ₹${Math.abs(b.net).toFixed(2)}` : 'settled'}`)
      .join('\n');
    const settlementsStr = (group.suggestedSettlements || [])
      .map((s) => `${s.fromName} -> ${s.toName}: ₹${s.amount.toFixed(2)}`)
      .join('\n');
    const message = `📊 Trip & Group Summary: ${group.name}\nTotal Spent: ${group.defaultCurrency} ${group.totalSpent?.toFixed(0) || '0'}\n\n--- Member Balances ---\n${balancesStr}\n\n--- Suggested Settlements ---\n${settlementsStr || 'All settled up!'}`;
    try {
      await Share.share({ message, title: `${group.name} Summary` });
    } catch (e) {
      console.warn(e);
    }
  };

  const handleSearchContact = async (val) => {
    setMemberContact(val);
    if (val.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    try {
      setSearchingUsers(true);
      const users = await expenseService.searchUsers(val);
      const existingIds = new Set(group?.members?.map((m) => m.id) || []);
      setSearchResults(users.filter((u) => !existingIds.has(u.id)));
    } catch {
      setSearchResults([]);
    } finally {
      setSearchingUsers(false);
    }
  };

  const handleAddMember = async (targetUser = null) => {
    try {
      setAddingMember(true);
      if (targetUser) {
        await expenseService.addMember(groupId, { userId: targetUser.id });
        Alert.alert('Success', `${targetUser.name} added to group!`);
      } else {
        if (!memberContact.trim()) return;
        const isPhone = /^\+?[\d\s-]{7,15}$/.test(memberContact.trim());
        const payload = isPhone
          ? { phoneNumber: memberContact.trim() }
          : { email: memberContact.trim() };
        const res = await expenseService.addMember(groupId, payload);
        if (res?.pending) {
          Alert.alert('Invite Sent', res.message || 'Invitation sent to friend via email/SMS!');
        } else {
          Alert.alert('Success', 'Member added!');
        }
      }
      setAddMemberModalVisible(false);
      setMemberContact('');
      setSearchResults([]);
      loadGroup();
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to add member');
    } finally {
      setAddingMember(false);
    }
  };

  const openSettleModal = (fromId, toId, defaultAmt) => {
    setSettlePayer(fromId || user?.id || '');
    setSettlePayee(toId || '');
    setSettleAmount(defaultAmt != null ? String(defaultAmt) : '');
    setSettleModalVisible(true);
  };

  const handleRecordSettlement = async () => {
    const amt = parseFloat(settleAmount);
    if (!settlePayer || !settlePayee || isNaN(amt) || amt <= 0) {
      Alert.alert('Error', 'Please select both members and a valid positive amount.');
      return;
    }

    try {
      setSettling(true);
      await expenseService.createSettlement({
        groupId,
        fromUserId: settlePayer,
        toUserId: settlePayee,
        amount: amt,
        currency: group?.defaultCurrency || 'INR',
      });
      Alert.alert('Success', 'Payment recorded!');
      setSettleModalVisible(false);
      loadGroup();
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to record payment');
    } finally {
      setSettling(false);
    }
  };

  if (loading || !group) {
    return (
      <Screen>
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={colors.violet} size="large" />
        </View>
      </Screen>
    );
  }

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
        <Text style={styles.headerTitle} numberOfLines={1}>{group.name}</Text>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          <TouchableOpacity
            onPress={handleShareStatement}
            style={styles.backBtn}
            activeOpacity={0.7}
            accessibilityLabel="Export & Share"
          >
            <Ionicons name="share-outline" size={18} color={colors.textSoft} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setAddMemberModalVisible(true)}
            style={styles.backBtn}
            activeOpacity={0.7}
            accessibilityLabel="Add Member"
          >
            <Ionicons name="person-add-outline" size={18} color={colors.textSoft} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Group Hero Card */}
        <GlassCard style={styles.heroCard}>
          <View style={styles.heroRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroTitle}>{group.name}</Text>
              <Text style={styles.heroSub}>
                {group.members?.length || 0} members • Total Spent: {group.defaultCurrency} {group.totalSpent?.toFixed(0) || '0'}
              </Text>
            </View>
            <TouchableOpacity
              style={styles.addExpBtn}
              onPress={() => navigation.navigate('AddExpense', { groupId: group.id })}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={18} color={colors.white} />
              <Text style={styles.addExpBtnText}>Expense</Text>
            </TouchableOpacity>
          </View>
        </GlassCard>

        {/* Tab Selector */}
        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'balances' && styles.tabActive]}
            onPress={() => setActiveTab('balances')}
          >
            <Text style={[styles.tabText, activeTab === 'balances' && styles.tabTextActive]}>
              Balances
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'expenses' && styles.tabActive]}
            onPress={() => setActiveTab('expenses')}
          >
            <Text style={[styles.tabText, activeTab === 'expenses' && styles.tabTextActive]}>
              Expenses ({group.expenses?.length || 0})
            </Text>
          </TouchableOpacity>
        </View>

        {/* TAB 1: Balances & Simplified Settlements */}
        {activeTab === 'balances' && (
          <View style={styles.listContainer}>
            {/* Suggested minimal transfers */}
            {group.suggestedSettlements?.length > 0 ? (
              <GlassCard style={styles.settleContainer}>
                <Text style={styles.settleTitle}>SUGGESTED SETTLEMENTS</Text>
                {group.suggestedSettlements.map((s, i) => (
                  <View key={i} style={styles.settleRow}>
                    <View style={styles.settleNames}>
                      <Text style={styles.nameText}>{s.fromName}</Text>
                      <Ionicons name="arrow-forward" size={13} color={colors.textFaint} />
                      <Text style={styles.nameText}>{s.toName}</Text>
                    </View>
                    <View style={styles.settleRight}>
                      <Text style={styles.settleAmt}>
                        {group.defaultCurrency} {s.amount.toFixed(0)}
                      </Text>
                      <TouchableOpacity
                        style={styles.settlePill}
                        onPress={() => openSettleModal(s.fromUserId, s.toUserId, s.amount)}
                      >
                        <Text style={styles.settlePillText}>Settle</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </GlassCard>
            ) : (
              <GlassCard style={styles.emptyCard}>
                <Ionicons name="checkmark-circle-outline" size={32} color={colors.emerald} />
                <Text style={styles.emptyTitle}>All Settled Up!</Text>
                <Text style={styles.emptySubtitle}>No outstanding balances in this group.</Text>
              </GlassCard>
            )}

            {/* Individual member balances */}
            <Text style={styles.sectionHeader}>MEMBER STATUS</Text>
            {group.balances?.map((b) => (
              <GlassCard key={b.userId} style={styles.memberCard}>
                <View>
                  <Text style={styles.memberName}>{b.name}</Text>
                  <Text style={styles.memberSub}>
                    Paid: {group.defaultCurrency} {b.paid.toFixed(0)}
                  </Text>
                </View>
                <Text
                  style={[
                    styles.memberNet,
                    b.net > 0.01
                      ? { color: colors.emerald }
                      : b.net < -0.01
                      ? { color: colors.rose }
                      : { color: colors.textMuted },
                  ]}
                >
                  {b.net > 0.01
                    ? `+${group.defaultCurrency} ${b.net.toFixed(0)}`
                    : b.net < -0.01
                    ? `-${group.defaultCurrency} ${Math.abs(b.net).toFixed(0)}`
                    : 'Settled'}
                </Text>
              </GlassCard>
            ))}
          </View>
        )}

        {/* TAB 2: Group Expenses */}
        {activeTab === 'expenses' && (
          <View style={styles.listContainer}>
            {group.expenses?.length === 0 ? (
              <GlassCard style={styles.emptyCard}>
                <Text style={styles.emptyTitle}>No expenses yet</Text>
              </GlassCard>
            ) : (
              group.expenses?.map((exp) => (
                <GlassCard key={exp.id} style={styles.expItemCard}>
                  <View>
                    <Text style={styles.expTitle}>{exp.title}</Text>
                    <Text style={styles.expSub}>
                      Paid by {exp.paidBy?.name || 'Member'} • {exp.expenseDate?.slice(0, 10)}
                    </Text>
                  </View>
                  <Text style={styles.expAmt}>
                    {exp.currency} {Number(exp.amount).toFixed(2)}
                  </Text>
                </GlassCard>
              ))
            )}
          </View>
        )}
      </ScrollView>

      {/* Settle Up Modal */}
      <Modal visible={settleModalVisible} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Record Payment</Text>
            <Text style={styles.label}>AMOUNT ({group.defaultCurrency})</Text>
            <TextInput
              value={settleAmount}
              onChangeText={setSettleAmount}
              placeholder="0.00"
              keyboardType="decimal-pad"
              placeholderTextColor={colors.textFaint}
              style={styles.modalInput}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setSettleModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmBtn}
                onPress={handleRecordSettlement}
                disabled={settling}
              >
                {settling ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <Text style={styles.confirmBtnText}>Save Payment</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Member Modal */}
      <Modal visible={addMemberModalVisible} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add or Invite Member</Text>
            <Text style={styles.label}>SEARCH BY PHONE (ANY COUNTRY), EMAIL, OR NAME</Text>
            <TextInput
              value={memberContact}
              onChangeText={handleSearchContact}
              placeholder="+1 415 555 2671, +91 98765 43210, or email"
              autoCapitalize="none"
              placeholderTextColor={colors.textFaint}
              style={styles.modalInput}
            />
            <Text style={styles.modalSubHint}>
              Supports any country code (+1, +44, +91, +971, +65, etc.). Non-app users receive an invite link.
            </Text>

            {/* Search Results Dropdown */}
            {searchResults.length > 0 && (
              <View style={styles.searchList}>
                <Text style={styles.searchHeader}>REGISTERED APP USERS</Text>
                {searchResults.map((u) => (
                  <TouchableOpacity
                    key={u.id}
                    style={styles.searchUserRow}
                    onPress={() => handleAddMember(u)}
                  >
                    <View>
                      <Text style={styles.searchUserName}>{u.name}</Text>
                      <Text style={styles.searchUserContact}>
                        {u.phoneNumber ? `📞 ${u.phoneNumber} • ` : ''}{u.email}
                      </Text>
                    </View>
                    <Ionicons name="person-add" size={16} color={colors.violet} />
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => {
                  setAddMemberModalVisible(false);
                  setMemberContact('');
                  setSearchResults([]);
                }}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmBtn}
                onPress={() => handleAddMember()}
                disabled={addingMember}
              >
                {addingMember ? (
                  <ActivityIndicator color={colors.white} />
                ) : (
                  <Text style={styles.confirmBtnText}>
                    {/^\+?[\d\s-]{7,15}$/.test(memberContact.trim()) ? 'Invite via SMS' : 'Invite / Add'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  headerTitle: { ...typ.h2, fontSize: 18, color: colors.white, flex: 1, textAlign: 'center', marginHorizontal: 8 },
  scroll: { paddingHorizontal: 20, paddingBottom: 60, gap: 14 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  heroCard: { padding: 18, borderRadius: radii.xl },
  heroRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroTitle: { fontSize: 18, fontWeight: '800', color: colors.white },
  heroSub: { fontSize: 12, color: colors.textMuted, marginTop: 4 },
  addExpBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.violet,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radii.md,
  },
  addExpBtnText: { fontSize: 12, fontWeight: '700', color: colors.white },
  tabRow: { flexDirection: 'row', backgroundColor: overlays.faint, borderRadius: radii.lg, padding: 4 },
  tab: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: radii.md },
  tabActive: { backgroundColor: overlays.strong },
  tabText: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  tabTextActive: { color: colors.white },
  listContainer: { gap: 10 },
  settleContainer: { padding: 16, borderRadius: radii.lg, borderLeftWidth: 3, borderLeftColor: colors.emerald },
  settleTitle: { fontSize: 10, fontWeight: '800', color: colors.emerald, letterSpacing: 1, marginBottom: 10 },
  settleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 6 },
  settleNames: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  nameText: { fontSize: 13, fontWeight: '700', color: colors.white },
  settleRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  settleAmt: { fontSize: 14, fontWeight: '800', color: colors.emerald },
  settlePill: {
    backgroundColor: tint(colors.emerald, 0.2),
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.full,
  },
  settlePillText: { fontSize: 11, fontWeight: '700', color: colors.emerald },
  emptyCard: { padding: 24, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 14, fontWeight: '700', color: colors.white, marginTop: 8 },
  emptySubtitle: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  sectionHeader: { fontSize: 11, fontWeight: '700', color: colors.textMuted, letterSpacing: 1, marginTop: 10 },
  memberCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderRadius: radii.lg },
  memberName: { fontSize: 14, fontWeight: '700', color: colors.white },
  memberSub: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  memberNet: { fontSize: 14, fontWeight: '800' },
  expItemCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderRadius: radii.lg },
  expTitle: { fontSize: 14, fontWeight: '700', color: colors.white },
  expSub: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  expAmt: { fontSize: 14, fontWeight: '800', color: colors.white },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: colors.card, borderRadius: radii.xl, padding: 20, borderWidth: 1, borderColor: overlays.border },
  modalTitle: { fontSize: 18, fontWeight: '700', color: colors.white, marginBottom: 14 },
  label: { fontSize: 11, fontWeight: '700', color: colors.textMuted, letterSpacing: 1, marginBottom: 6 },
  modalInput: {
    backgroundColor: overlays.mid,
    borderRadius: radii.md,
    padding: 12,
    color: colors.white,
    fontSize: 16,
    marginBottom: 8,
  },
  modalSubHint: {
    fontSize: 11,
    color: colors.textFaint,
    marginBottom: 14,
    lineHeight: 16,
  },
  modalButtons: { flexDirection: 'row', gap: 10, justifyContent: 'flex-end' },
  cancelBtn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: radii.md, backgroundColor: overlays.soft },
  cancelBtnText: { color: colors.textSoft, fontWeight: '600' },
  confirmBtn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: radii.md, backgroundColor: colors.violet },
  confirmBtnText: { color: colors.white, fontWeight: '700' },
  searchList: {
    backgroundColor: 'rgba(0,0,0,0.4)',
    borderRadius: radii.md,
    padding: 8,
    marginBottom: 14,
    maxHeight: 150,
  },
  searchHeader: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.textMuted,
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  searchUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: radii.sm,
    backgroundColor: overlays.soft,
    marginBottom: 4,
  },
  searchUserName: { fontSize: 13, fontWeight: '700', color: colors.white },
  searchUserContact: { fontSize: 11, color: colors.textMuted },
});
