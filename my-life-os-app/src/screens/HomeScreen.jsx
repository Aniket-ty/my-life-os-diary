import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Modal, ActivityIndicator } from 'react-native';
import { useAuthStore } from '../stores/authStore';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../components/ui/Screen';
import GlassCard from '../components/ui/GlassCard';
import { colors, radii, tint, type as typ, overlays } from '../theme';
import { expenseService } from '../services/expenseService';
import { offlineSyncService } from '../services/offlineSyncService';

const MODULES = [
  { name: 'Diary', description: 'Thoughts, moods & moments', icon: 'book-outline', screen: 'DiaryList' },
  { name: 'Fitness', description: 'Workouts, food & progress', icon: 'barbell-outline', screen: 'FitnessList' },
  { name: 'Workout Plan', description: 'Your weekly schedule', icon: 'calendar-outline', screen: 'WorkoutPlanner' },
  { name: 'Coach', description: 'Ask anything, act faster', icon: 'sparkles-outline', screen: 'AIChat' },
  { name: 'To-Do', description: 'Tasks, priorities & habits', icon: 'checkbox-outline', screen: 'TodoList' },
  { name: 'Body Scan', description: 'Track your progress', icon: 'scan-outline', screen: 'BodyScan' },
  { name: 'Expenses', description: 'Spending, splits & receipts', icon: 'wallet-outline', screen: 'ExpenseList' },
];

export default function HomeScreen({ navigation }) {
  const { user } = useAuthStore();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifModalVisible, setNotifModalVisible] = useState(false);
  const [markingAllRead, setMarkingAllRead] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);

  const loadNotifications = async () => {
    try {
      const data = await expenseService.getNotifications();
      setNotifications(data?.notifications || []);
      setUnreadCount(data?.unreadCount || 0);
    } catch {
      // silently handle background error
    }
  };

  const checkSyncStatus = async () => {
    try {
      const online = await offlineSyncService.isOnline();
      setIsOnline(online);
      const pending = await offlineSyncService.getPendingCount();
      setPendingSyncCount(pending);
      if (online && pending > 0) {
        await offlineSyncService.flushQueue();
        const updated = await offlineSyncService.getPendingCount();
        setPendingSyncCount(updated);
      }
      if (online) {
        offlineSyncService.fetchAndCacheSnapshot();
      }
    } catch {}
  };

  useEffect(() => {
    loadNotifications();
    checkSyncStatus();
    const unsubscribe = navigation.addListener('focus', () => {
      loadNotifications();
      checkSyncStatus();
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
      console.error('Failed to mark all read:', err);
    } finally {
      setMarkingAllRead(false);
    }
  };

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <GlassCard style={styles.hero}>
          <View style={styles.heroRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.greeting}>{greeting.toUpperCase()}</Text>
              <Text style={styles.name}>
                {user?.name?.split(' ')[0] || 'Friend'}, welcome back
              </Text>
              <Text style={styles.subtitle}>
                Everything in one place — pick up right where you left off.
              </Text>

              {/* Real-time Cloud Sync / Offline Status */}
              <View style={styles.syncStatusRow}>
                {!isOnline ? (
                  <View style={styles.statusBadge}>
                    <Ionicons name="cloud-offline-outline" size={13} color={colors.amber} />
                    <Text style={[styles.statusBadgeText, { color: colors.amber }]}>
                      Offline Mode {pendingSyncCount > 0 ? `(${pendingSyncCount} saved)` : ''}
                    </Text>
                  </View>
                ) : pendingSyncCount > 0 ? (
                  <TouchableOpacity
                    onPress={checkSyncStatus}
                    style={styles.statusBadge}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="sync-outline" size={13} color={colors.sky} />
                    <Text style={[styles.statusBadgeText, { color: colors.sky }]}>
                      Syncing {pendingSyncCount} items...
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.statusBadge}>
                    <View style={[styles.syncedDot, { backgroundColor: colors.volt }]} />
                    <Text style={[styles.statusBadgeText, { color: colors.textMuted }]}>Cloud Synced</Text>
                  </View>
                )}
              </View>
            </View>

            <View style={styles.headerActions}>
              <TouchableOpacity
                style={[styles.actionHeaderBtn, styles.voiceBtn]}
                onPress={() => navigation.navigate('VoiceAssistant')}
                activeOpacity={0.8}
                accessibilityLabel="Voice Assistant"
              >
                <Ionicons name="mic" size={19} color={colors.volt400} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionHeaderBtn}
                onPress={() => setNotifModalVisible(true)}
                activeOpacity={0.8}
                accessibilityLabel="Notifications"
              >
                <Ionicons name="notifications-outline" size={19} color={colors.textSoft} />
                {unreadCount > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionHeaderBtn}
                onPress={() => navigation.navigate('Settings')}
                activeOpacity={0.8}
                accessibilityLabel="Settings"
              >
                <Ionicons name="settings-outline" size={19} color={colors.textSoft} />
              </TouchableOpacity>
            </View>
          </View>
        </GlassCard>

        {/* Voice Assistant Quick-Access */}
        <TouchableOpacity
          style={styles.voiceAiBanner}
          onPress={() => navigation.navigate('VoiceAssistant')}
          activeOpacity={0.85}
        >
          <View style={styles.voiceAiIconBox}>
            <Ionicons name="mic" size={18} color={colors.void} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.voiceAiTitle}>Voice Assistant</Text>
            <Text style={styles.voiceAiSubtitle}>
              Navigate, create tasks, or log bills by speaking
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Your modules</Text>
        <View style={styles.grid}>
          {MODULES.map((mod) => (
            <TouchableOpacity
              key={mod.name}
              style={styles.card}
              onPress={() => navigation.navigate(mod.screen)}
              activeOpacity={0.85}
            >
              <View style={styles.iconCircle}>
                <Ionicons name={mod.icon} size={22} color={colors.volt400} />
              </View>
              <View style={styles.cardText}>
                <Text style={styles.cardName}>{mod.name}</Text>
                <Text style={styles.cardDesc}>{mod.description}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
            </TouchableOpacity>
          ))}
        </View>

        <GlassCard style={styles.quoteCard}>
          <Text style={styles.quoteText}>"The secret of getting ahead is getting started."</Text>
          <Text style={styles.quoteAuthor}>— Mark Twain</Text>
        </GlassCard>
      </ScrollView>

      {/* Notification Center Modal */}
      <Modal visible={notifModalVisible} transparent animationType="slide">
        <View style={styles.modalBackdrop}>
          <GlassCard style={styles.notifModalCard} strong={false}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Ionicons name="notifications" size={20} color={colors.volt400} />
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
                  onPress={() => setNotifModalVisible(false)}
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
                  <Text style={styles.notifEmptySub}>
                    Settlements, bill splits, tasks and friend invites will appear here
                  </Text>
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
                          : { backgroundColor: tint(colors.volt, 0.15) },
                      ]}
                    >
                      <Ionicons
                        name={
                          n.type === 'settlement'
                            ? 'cash-outline'
                            : n.type === 'invite'
                            ? 'people-outline'
                            : n.type === 'task'
                            ? 'checkbox-outline'
                            : 'receipt-outline'
                        }
                        size={18}
                        color={
                          n.type === 'settlement'
                            ? colors.emerald
                            : n.type === 'invite'
                            ? colors.amber
                            : colors.volt400
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
                    {!n.isRead && <View style={[styles.unreadDot, { backgroundColor: colors.volt }]} />}
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
  scroll: { paddingHorizontal: 20, paddingTop: 56, paddingBottom: 60 },
  hero: { marginBottom: 14 },
  heroRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  greeting: { fontSize: 12, fontWeight: '700', letterSpacing: 2, color: colors.volt400 },
  name: { ...typ.h1, marginTop: 4, fontSize: 26 },
  subtitle: { ...typ.bodyMuted, marginTop: 6, lineHeight: 20 },
  syncStatusRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.edge,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radii.pill,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  syncedDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionHeaderBtn: {
    width: 38,
    height: 38,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.edge,
    position: 'relative',
  },
  voiceBtn: {
    backgroundColor: tint(colors.volt, 0.12),
    borderColor: tint(colors.volt, 0.3),
  },
  badge: {
    position: 'absolute',
    top: 3,
    right: 3,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: colors.rose,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: colors.white,
    fontSize: 9,
    fontWeight: '800',
  },
  voiceAiBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.edge,
    borderRadius: radii.xl,
    padding: 14,
    marginBottom: 24,
  },
  voiceAiIconBox: {
    width: 38,
    height: 38,
    borderRadius: radii.lg,
    backgroundColor: colors.volt500,
    alignItems: 'center',
    justifyContent: 'center',
  },
  voiceAiTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.white,
  },
  voiceAiSubtitle: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
    lineHeight: 16,
  },
  sectionTitle: { ...typ.h2, marginBottom: 14 },
  grid: { gap: 12 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.edge,
    backgroundColor: colors.card,
    padding: 16,
    gap: 14,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.edge,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardText: { flex: 1, minWidth: 0 },
  cardName: { fontSize: 16, fontWeight: '700', color: colors.white, marginBottom: 3 },
  cardDesc: { fontSize: 13, color: colors.textMuted },
  quoteCard: {
    marginTop: 24,
  },
  quoteText: { fontSize: 14, color: colors.textSoft, fontStyle: 'italic', lineHeight: 22, marginBottom: 8 },
  quoteAuthor: { fontSize: 12, color: colors.textFaint, fontWeight: '600' },

  // Notification Modal
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  notifModalCard: {
    borderTopLeftRadius: radii.xxl,
    borderTopRightRadius: radii.xxl,
    padding: 20,
    maxHeight: '75%',
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderColor: colors.edge,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: overlays.border,
  },
  modalTitle: { ...typ.h3, color: colors.white },
  markAllBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radii.md,
    backgroundColor: tint(colors.volt, 0.15),
  },
  markAllText: { fontSize: 11, fontWeight: '700', color: colors.volt400 },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: radii.md,
    backgroundColor: overlays.soft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifList: { marginTop: 10 },
  notifEmpty: { alignItems: 'center', paddingVertical: 40, gap: 8 },
  notifEmptyText: { fontSize: 15, fontWeight: '700', color: colors.white },
  notifEmptySub: { fontSize: 12, color: colors.textMuted, textAlign: 'center', paddingHorizontal: 20 },
  notifItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: overlays.faint,
  },
  notifItemUnread: {
    backgroundColor: tint(colors.volt, 0.07),
    borderRadius: radii.md,
    paddingHorizontal: 8,
  },
  notifIconBox: {
    width: 34,
    height: 34,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  notifContent: { flex: 1 },
  notifTitle: { fontSize: 13, fontWeight: '700', color: colors.white },
  notifMessage: { fontSize: 12, color: colors.textSoft, marginTop: 2, lineHeight: 16 },
  notifTime: { fontSize: 10, color: colors.textFaint, marginTop: 4 },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
  },
});