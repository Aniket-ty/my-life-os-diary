import React, { useEffect, useState, useRef } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  TextInput, RefreshControl, Alert,
} from 'react-native';
import { useDiaryStore } from '../../stores/diaryStore';
import { Ionicons } from '@expo/vector-icons';
import moment from 'moment';
import FloatingAIButton from '../../components/ai/FloatingAIButton';
import GlobalAISheet from '../../components/ai/GlobalAISheet';
import Screen from '../../components/ui/Screen';
import PageHeader from '../../components/ui/PageHeader';
import GlassCard from '../../components/ui/GlassCard';
import Badge from '../../components/ui/Badge';
import {
  colors, spacing, radii, overlays, shadow,
} from '../../theme';

const MOODS = {
  happy: '😊', sad: '😢', angry: '😠', anxious: '😰',
  excited: '🤩', calm: '😌', tired: '😴', grateful: '🙏',
};

export default function DiaryListScreen({ navigation }) {
  const { entries, loading, fetchEntries, deleteEntry } = useDiaryStore();
  const [search, setSearch] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const aiSheetRef = useRef(null);
  useEffect(() => {
    fetchEntries();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchEntries();
    setRefreshing(false);
  };

  const confirmDelete = (id) => {
    Alert.alert('Delete Entry', 'Are you sure? This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteEntry(id) },
    ]);
  };

  const filtered = entries.filter((e) =>
    e.content?.toLowerCase().includes(search.toLowerCase()) ||
    e.title?.toLowerCase().includes(search.toLowerCase())
  );

  const renderEntry = ({ item }) => (
    <TouchableOpacity
      style={styles.cardTouch}
      onPress={() => navigation.navigate('DiaryEntry', { id: item.id })}
      activeOpacity={0.85}
    >
      <GlassCard style={styles.entryCard}>
        <View style={styles.cardTop}>
          <Badge tone="gold">{moment(item.entryDate).format('dddd, MMMM D')}</Badge>
          {item.isPinned && (
            <Ionicons name="bookmark" size={14} color={colors.gold} />
          )}
        </View>

        {item.title ? (
          <Text style={styles.titleText} numberOfLines={1}>{item.title}</Text>
        ) : null}

        <Text style={styles.contentPreview} numberOfLines={3}>
          {item.content}
        </Text>

        <View style={styles.cardFooter}>
          <View style={styles.footerLeft}>
            {item.mood ? (
              <Text style={styles.moodEmoji}>{MOODS[item.mood] || '📝'}</Text>
            ) : null}
            {item.attachments?.length > 0 && (
              <View style={styles.attachBadge}>
                <Ionicons name="paperclip" size={11} color={colors.textMuted} />
                <Text style={styles.attachCount}>{item.attachments.length}</Text>
              </View>
            )}
          </View>
          <TouchableOpacity onPress={() => confirmDelete(item.id)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} style={styles.deleteBtn}>
            <Ionicons name="trash-outline" size={16} color={colors.rose} />
          </TouchableOpacity>
        </View>
      </GlassCard>
    </TouchableOpacity>
  );

  return (
    <Screen style={styles.container}>
      <View style={styles.topArea}>
        <PageHeader
          title="My Diary"
          subtitle={`${entries.length} ${entries.length === 1 ? 'entry' : 'entries'} in your journal`}
          icon={<Ionicons name="book" size={22} color={colors.gold300} />}
          accent={colors.gold}
          action={
            <TouchableOpacity
              style={styles.addButton}
              onPress={() => navigation.navigate('DiaryWrite', { mode: 'create' })}
            >
              <Ionicons name="create-outline" size={22} color={colors.void} />
            </TouchableOpacity>
          }
        />

        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={16} color={colors.textFaint} style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search entries..."
            placeholderTextColor={colors.textFaint}
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')}>
              <Ionicons name="close-circle" size={16} color={colors.textFaint} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderEntry}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.gold} />}
        ListEmptyComponent={
          <GlassCard style={styles.empty}>
            <Text style={styles.emptyEmoji}>📖</Text>
            <Text style={styles.emptyText}>No entries yet</Text>
            <Text style={styles.emptySubText}>Tap the pencil to write your first entry</Text>
          </GlassCard>
        }
      />
      <FloatingAIButton onPress={() => aiSheetRef.current?.expand()} />
      <GlobalAISheet sheetRef={aiSheetRef} context="diary" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.void },
  topArea: {
    paddingHorizontal: spacing.xl,
    paddingTop: 56,
    paddingBottom: spacing.md,
  },
  addButton: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.gold,
    alignItems: 'center', justifyContent: 'center',
    ...shadow.glow(colors.gold),
  },
  searchBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: overlays.faint,
    borderWidth: 1, borderColor: overlays.border,
    borderRadius: radii.md,
    paddingHorizontal: 14, paddingVertical: 10,
  },
  searchInput: { flex: 1, fontSize: 14, color: colors.text },
  list: { paddingHorizontal: spacing.xl, paddingBottom: 110, paddingTop: 4 },
  cardTouch: { marginBottom: spacing.lg },
  entryCard: {
    borderLeftWidth: 3,
    borderLeftColor: colors.gold,
    ...shadow.card,
  },
  cardTop: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    marginBottom: 10,
  },
  titleText: {
    fontSize: 16, fontWeight: '700', color: colors.gold300,
    marginBottom: 6,
  },
  contentPreview: {
    fontSize: 14, color: colors.textMuted, lineHeight: 22,
  },
  cardFooter: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginTop: 14,
  },
  footerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  moodEmoji: { fontSize: 16 },
  attachBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: overlays.soft, borderRadius: radii.pill,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  attachCount: { fontSize: 11, color: colors.textMuted, fontWeight: '600' },
  deleteBtn: {
    backgroundColor: 'rgba(244,63,94,0.1)',
    borderRadius: radii.sm,
    padding: 6,
  },
  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 18, fontWeight: '600', color: colors.textSoft, marginBottom: 6 },
  emptySubText: { fontSize: 13, color: colors.textMuted, textAlign: 'center' },
});