import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  RefreshControl,
  Alert,
  Modal,
  Share,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../../components/ui/Screen';
import GlassCard from '../../components/ui/GlassCard';
import { colors, radii, tint, type as typ, overlays } from '../../theme';
import { expenseService } from '../../services/expenseService';

export default function ExpenseScreen({ navigation }) {
  const [activeTab, setActiveTab] = useState('expenses'); // 'expenses' | 'groups'
  const [summary, setSummary] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [groups, setGroups] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationModalVisible, setNotificationModalVisible] = useState(false);
  const [markingAllRead, setMarkingAllRead] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      setRefreshing(true);
      const [sum, expData, grpData, notifData] = await Promise.all([
        expenseService.getSummary().catch(() => null),
        expenseService.getExpenses({ limit: 40 }).catch(() => ({ expenses: [] })),
        expenseService.getGroups().catch(() => []),
        expenseService.getNotifications().catch(() => ({ notifications: [], unreadCount: 0 })),
      ]);
      setSummary(sum);
      setExpenses(expData?.expenses || []);
      setGroups(grpData || []);
      setNotifications(notifData?.notifications || []);
      setUnreadCount(notifData?.unreadCount || 0);
    } catch (err) {
      console.error('Error loading expenses:', err);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadData();
    });
    return unsubscribe;
  }, [navigation]);

  const handleMarkAsRead = async (notifId) => {
    try {
      await expenseService.markNotificationAsRead(notifId);
      setNotifications((prev) =>
        prev.map((n) => (n.id === notifId ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark read:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      setMarkingAllRead(true);
      await expenseService.markAllNotificationsAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      Alert.alert('Error', 'Failed to mark all as read');
    } finally {
      setMarkingAllRead(false);
    }
  };

  const handleShareStatement = async () => {
    try {
      const now = new Date();
      const monthYear = now.toLocaleString('default', { month: 'long', year: 'numeric' });
      const totalMonth = summary?.thisMonth?.total?.toFixed(2) || '0.00';
      const todayTotal = summary?.today?.total?.toFixed(2) || '0.00';

      let text = `📊 LIFE OS EXPENSE STATEMENT\nPeriod: ${monthYear}\n`;
      text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      text += `💰 Total Spent This Month: ₹${totalMonth}\n`;
      text += `📅 Today's Spending: ₹${todayTotal}\n\n`;

      if (expenses.length > 0) {
        text += `📝 RECENT TRANSACTIONS:\n`;
        expenses.slice(0, 15).forEach((e, idx) => {
          text += `${idx + 1}. ${e.title} - ${e.currency} ${Number(e.amount).toFixed(2)} (${e.category}) [${e.expenseDate?.slice(0, 10)}]\n`;
        });
        text += `\n`;
      }

      if (groups.length > 0) {
        text += `👥 SPLITWISE GROUP BALANCES:\n`;
        groups.forEach((g) => {
          const net = g.userNetBalance || 0;
          const status =
            net > 0.01
              ? `You are owed +₹${net.toFixed(2)}`
              : net < -0.01
              ? `You owe -₹${Math.abs(net).toFixed(2)}`
              : `Settled up`;
          text += `• ${g.name}: ${status}\n`;
        });
        text += `\n`;
      }

      text += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
      text += `Generated via Life OS Personal & Splitwise Finance`;

      await Share.share({
        title: `Expense Statement - ${monthYear}`,
        message: text,
      });
    } catch (err) {
      Alert.alert('Error', 'Unable to export statement');
    }
  };

  const handleDeleteExpense = (id, title) => {
    Alert.alert('Delete Expense', `Are you sure you want to delete "${title}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await expenseService.deleteExpense(id);
            setExpenses((prev) => prev.filter((e) => e.id !== id));
          } catch (err) {
            Alert.alert('Error', err.message || 'Failed to delete expense');
          }
        },
      },
    ]);
  };

  const currency = summary?.currency || 'INR';

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
        <Text style={styles.headerTitle}>Expense OS</Text>
        <View style={styles.headerRight}>
          <TouchableOpacity
            onPress={handleShareStatement}
            style={styles.headerIconBtn}
            activeOpacity={0.7}
            accessibilityLabel="Export statement"
          >
            <Ionicons name="share-outline" size={19} color={colors.textSoft} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setNotificationModalVisible(true)}
            style={styles.headerIconBtn}
            activeOpacity={0.7}
            accessibilityLabel="Notifications"
          >
            <Ionicons name="notifications-outline" size={19} color={colors.violet} />
            {unreadCount > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>
                  {unreadCount > 9 ? '9+' : unreadCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.navigate('VoiceAssistant')}
            style={styles.voiceHeaderBtn}
            activeOpacity={0.7}
          >
            <Ionicons name="mic-outline" size={19} color={colors.violet} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={loadData}
            tintColor={colors.violet}
          />
        }
      >
        {/* Top Metric Cards */}
        <View style={styles.metricsRow}>
          <GlassCard style={styles.metricCard}>
            <Text style={styles.metricLabel}>TODAY</Text>
            <Text style={styles.metricValue}>
              ₹{summary?.today?.total?.toFixed(0) || '0'}
            </Text>
          </GlassCard>

          <GlassCard style={styles.metricCard}>
            <Text style={styles.metricLabel}>THIS MONTH</Text>
            <Text style={[styles.metricValue, { color: colors.violet }]}>
              ₹{summary?.thisMonth?.total?.toFixed(0) || '0'}
            </Text>
          </GlassCard>
        </View>

        {/* Quick Action Buttons */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: tint(colors.violet, 0.15) }]}
            onPress={() => navigation.navigate('AddExpense')}
            activeOpacity={0.8}
          >
            <Ionicons name="add-circle" size={20} color={colors.violet} />
            <Text style={[styles.actionBtnText, { color: colors.violet }]}>Add Expense</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: tint(colors.sky, 0.15) }]}
            onPress={() => navigation.navigate('ScanBill')}
            activeOpacity={0.8}
          >
            <Ionicons name="scan-outline" size={20} color={colors.sky} />
            <Text style={[styles.actionBtnText, { color: colors.sky }]}>Scan Bill</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: tint(colors.emerald, 0.15) }]}
            onPress={() => navigation.navigate('VoiceAssistant')}
            activeOpacity={0.8}
          >
            <Ionicons name="mic" size={20} color={colors.emerald} />
            <Text style={[styles.actionBtnText, { color: colors.emerald }]}>Voice AI</Text>
          </TouchableOpacity>
        </View>

        {/* Tab Toggle */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'expenses' && styles.tabBtnActive]}
            onPress={() => setActiveTab('expenses')}
          >
            <Text style={[styles.tabText, activeTab === 'expenses' && styles.tabTextActive]}>
              Transactions ({expenses.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'groups' && styles.tabBtnActive]}
            onPress={() => setActiveTab('groups')}
          >
            <Text style={[styles.tabText, activeTab === 'groups' && styles.tabTextActive]}>
              Splitwise ({groups.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* TAB 1: Expenses List */}
        {activeTab === 'expenses' && (
          <View style={styles.listContainer}>
            {expenses.length === 0 ? (
              <GlassCard style={styles.emptyCard}>
                <Ionicons name="receipt-outline" size={36} color={colors.textFaint} />
                <Text style={styles.emptyTitle}>No expenses yet</Text>
                <Text style={styles.emptySubtitle}>
                  Add an expense or scan a receipt to get started.
                </Text>
              </GlassCard>
            ) : (
              expenses.map((exp) => (
                <GlassCard key={exp.id} style={styles.expenseCard}>
                  <View style={styles.expenseLeft}>
                    <View style={styles.catIcon}>
                      <Ionicons
                        name={
                          exp.category === 'Food'
                            ? 'fast-food-outline'
                            : exp.category === 'Transport'
                            ? 'car-outline'
                            : exp.category === 'Shopping'
                            ? 'bag-handle-outline'
                            : 'cash-outline'
                        }
                        size={20}
                        color={colors.rose}
                      />
                    </View>
                    <View style={styles.expenseInfo}>
                      <Text style={styles.expenseTitle} numberOfLines={1}>
                        {exp.title}
                      </Text>
                      <Text style={styles.expenseSub}>
                        {exp.category} • {exp.expenseDate?.slice(0, 10)}
                        {exp.group ? ` • ${exp.group.name}` : ''}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.expenseRight}>
                    <Text style={styles.expenseAmount}>
                      -{exp.currency} {Number(exp.amount).toFixed(2)}
                    </Text>
                    <TouchableOpacity
                      onPress={() => handleDeleteExpense(exp.id, exp.title)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Ionicons name="trash-outline" size={15} color={colors.textFaint} />
                    </TouchableOpacity>
                  </View>
                </GlassCard>
              ))
            )}
          </View>
        )}

        {/* TAB 2: Splitwise Groups */}
        {activeTab === 'groups' && (
          <View style={styles.listContainer}>
            {groups.length === 0 ? (
              <GlassCard style={styles.emptyCard}>
                <Ionicons name="people-outline" size={36} color={colors.textFaint} />
                <Text style={styles.emptyTitle}>No groups yet</Text>
                <Text style={styles.emptySubtitle}>
                  Create a group for trips, roommates, or shared outings.
                </Text>
              </GlassCard>
            ) : (
              groups.map((g) => {
                const net = g.userNetBalance || 0;
                return (
                  <TouchableOpacity
                    key={g.id}
                    onPress={() => navigation.navigate('GroupDetail', { groupId: g.id, groupName: g.name })}
                    activeOpacity={0.85}
                  >
                    <GlassCard style={styles.groupCard}>
                      <View style={styles.groupRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.groupName}>{g.name}</Text>
                          <Text style={styles.groupMembers}>
                            {g.memberCount} members • {g.totalExpenseCount || 0} expenses
                          </Text>
                        </View>

                        <View style={styles.balanceBadge}>
                          <Text
                            style={[
                              styles.balanceText,
                              net > 0.01
                                ? { color: colors.emerald }
                                : net < -0.01
                                ? { color: colors.rose }
                                : { color: colors.textMuted },
                            ]}
                          >
                            {net > 0.01
                              ? `+₹${net.toFixed(0)}`
                              : net < -0.01
                              ? `-₹${Math.abs(net).toFixed(0)}`
                              : 'Settled'}
                          </Text>
                        </View>
                      </View>
                    </GlassCard>
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        )}
      </ScrollView>

      {/* Notification Center Modal */}
      <Modal
        visible={notificationModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setNotificationModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <GlassCard style={styles.notifModalCard}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="notifications" size={20} color={colors.violet} />
                <Text style={styles.modalTitle}>Notifications</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                {unreadCount > 0 && (
                  <TouchableOpacity
                    onPress={handleMarkAllRead}
                    disabled={markingAllRead}
                    style={styles.markAllBtn}
                  >
                    <Text style={styles.markAllText}>
                      {markingAllRead ? 'Marking...' : 'Mark all read'}
                    </Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  onPress={() => setNotificationModalVisible(false)}
                  style={styles.closeBtn}
                >
                  <Ionicons name="close" size={20} color={colors.textSoft} />
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView style={styles.notifList} showsVerticalScrollIndicator={false}>
              {notifications.length === 0 ? (
                <View style={styles.notifEmpty}>
                  <Ionicons name="notifications-off-outline" size={36} color={colors.textFaint} />
                  <Text style={styles.notifEmptyText}>No notifications yet</Text>
                </View>
              ) : (
                notifications.map((n) => (
                  <TouchableOpacity
                    key={n.id}
                    style={[
                      styles.notifItem,
                      !n.isRead && styles.notifItemUnread,
                    ]}
                    onPress={() => handleMarkAsRead(n.id)}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.notifIconBox,
                        n.type === 'settlement'
                          ? { backgroundColor: tint(colors.emerald, 0.15) }
                          : n.type === 'invite'
                          ? { backgroundColor: tint(colors.amber, 0.15) }
                          : { backgroundColor: tint(colors.violet, 0.15) },
                      ]}
                    >
                      <Ionicons
                        name={
                          n.type === 'settlement'
                            ? 'cash-outline'
                            : n.type === 'invite'
                            ? 'people-outline'
                            : 'receipt-outline'
                        }
                        size={18}
                        color={
                          n.type === 'settlement'
                            ? colors.emerald
                            : n.type === 'invite'
                            ? colors.amber
                            : colors.violet
                        }
                      />
                    </View>
                    <View style={styles.notifContent}>
                      <Text style={styles.notifTitle}>{n.title}</Text>
                      <Text style={styles.notifMessage}>{n.message}</Text>
                      <Text style={styles.notifTime}>
                        {new Date(n.createdAt).toLocaleDateString()} • {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </View>
                    {!n.isRead && <View style={styles.unreadDot} />}
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </GlassCard>
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
  headerTitle: { ...typ.h2, fontSize: 18, color: colors.white },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerIconBtn: {
    width: 38,
    height: 38,
    borderRadius: radii.md,
    backgroundColor: overlays.soft,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  voiceHeaderBtn: {
    width: 38,
    height: 38,
    borderRadius: radii.md,
    backgroundColor: tint(colors.violet, 0.15),
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.rose,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  unreadBadgeText: {
    color: colors.white,
    fontSize: 9,
    fontWeight: '800',
  },
  scroll: { paddingHorizontal: 20, paddingBottom: 60 },
  metricsRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
  metricCard: { flex: 1, padding: 16, borderRadius: radii.lg },
  metricLabel: { fontSize: 11, fontWeight: '700', color: colors.textMuted, letterSpacing: 1 },
  metricValue: { fontSize: 22, fontWeight: '800', color: colors.white, marginTop: 4 },
  actionsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: radii.lg,
  },
  actionBtnText: { fontSize: 12, fontWeight: '700' },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: overlays.faint,
    borderRadius: radii.lg,
    padding: 4,
    marginBottom: 16,
  },
  tabBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: radii.md },
  tabBtnActive: { backgroundColor: overlays.strong },
  tabText: { fontSize: 13, fontWeight: '600', color: colors.textMuted },
  tabTextActive: { color: colors.white },
  listContainer: { gap: 10 },
  emptyCard: { padding: 32, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { ...typ.h3, marginTop: 12, color: colors.white },
  emptySubtitle: { ...typ.bodyMuted, textAlign: 'center', marginTop: 4 },
  expenseCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: radii.lg,
  },
  expenseLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  catIcon: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    backgroundColor: tint(colors.rose, 0.12),
    alignItems: 'center',
    justifyContent: 'center',
  },
  expenseInfo: { flex: 1 },
  expenseTitle: { fontSize: 14, fontWeight: '700', color: colors.white },
  expenseSub: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  expenseRight: { alignItems: 'flex-end', gap: 6 },
  expenseAmount: { fontSize: 14, fontWeight: '800', color: colors.rose },
  groupCard: { padding: 16, borderRadius: radii.lg },
  groupRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  groupName: { fontSize: 15, fontWeight: '700', color: colors.white },
  groupMembers: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  balanceBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: radii.full, backgroundColor: overlays.mid },
  balanceText: { fontSize: 13, fontWeight: '800' },

  // Notification Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  notifModalCard: {
    maxHeight: '80%',
    padding: 20,
    borderTopLeftRadius: radii.xxl,
    borderTopRightRadius: radii.xxl,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: overlays.borderSoft,
  },
  modalTitle: { ...typ.h3, color: colors.white },
  markAllBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radii.full,
    backgroundColor: tint(colors.violet, 0.15),
  },
  markAllText: { fontSize: 11, fontWeight: '700', color: colors.violet },
  closeBtn: { padding: 4 },
  notifList: { maxHeight: 400 },
  notifEmpty: { padding: 40, alignItems: 'center', justifyContent: 'center', gap: 8 },
  notifEmptyText: { color: colors.textMuted, fontSize: 14 },
  notifItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: radii.md,
    marginBottom: 6,
    backgroundColor: overlays.soft,
  },
  notifItemUnread: {
    backgroundColor: tint(colors.violet, 0.1),
    borderLeftWidth: 3,
    borderLeftColor: colors.violet,
  },
  notifIconBox: {
    width: 36,
    height: 36,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifContent: { flex: 1 },
  notifTitle: { fontSize: 13, fontWeight: '700', color: colors.white },
  notifMessage: { fontSize: 12, color: colors.textSoft, marginTop: 2 },
  notifTime: { fontSize: 10, color: colors.textMuted, marginTop: 4 },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.violet,
  },
});
