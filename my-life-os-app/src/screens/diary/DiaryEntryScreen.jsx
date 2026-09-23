import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator,
} from 'react-native';
import { useDiaryStore } from '../../stores/diaryStore';
import { Ionicons } from '@expo/vector-icons';
import moment from 'moment';
import AttachmentStrip from '../../components/diary/AttachmentStrip';
import Screen from '../../components/ui/Screen';
import GlassCard from '../../components/ui/GlassCard';
import Badge from '../../components/ui/Badge';
import {
  colors, spacing, radii, overlays, tint, shadow,
} from '../../theme';

const MOODS = {
  happy: '😊', sad: '😢', angry: '😠', anxious: '😰',
  excited: '🤩', calm: '😌', tired: '😴', grateful: '🙏',
};

export default function DiaryEntryScreen({ navigation, route }) {
  const { id } = route.params;
  const { fetchEntry, deleteEntry } = useDiaryStore();
  const [entry, setEntry] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEntry();
  }, [id]);

  const loadEntry = async () => {
    setLoading(true);
    const data = await fetchEntry(id);
    setEntry(data);
    setLoading(false);
  };

  const confirmDelete = () => {
    Alert.alert('Delete Entry', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete', style: 'destructive',
        onPress: async () => {
          await deleteEntry(id);
          navigation.goBack();
        },
      },
    ]);
  };

  if (loading) {
    return (
      <Screen style={styles.center}>
        <ActivityIndicator size="large" color={colors.gold} />
      </Screen>
    );
  }

  if (!entry) {
    return (
      <Screen style={styles.center}>
        <Text style={styles.notFound}>Entry not found.</Text>
      </Screen>
    );
  }

  return (
    <Screen style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => navigation.navigate('DiaryWrite', { mode: 'edit', id: entry.id })}
          >
            <Ionicons name="pencil-outline" size={18} color={colors.gold300} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={confirmDelete}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="trash-outline" size={18} color={colors.rose} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <GlassCard style={styles.paper}>
          <View style={styles.metaRow}>
            <Badge tone="gold">{moment(entry.entryDate).format('dddd, MMMM D, YYYY')}</Badge>
            {entry.mood && (
              <Text style={styles.moodEmoji}>{MOODS[entry.mood]}</Text>
            )}
          </View>

          {entry.title && (
            <Text style={styles.title}>{entry.title}</Text>
          )}

          <View style={styles.divider} />

          <Text style={styles.content}>
            {entry.content
              ? entry.content
              : (entry.attachments || []).some((a) =>
                  a.fileName?.toLowerCase().startsWith('handwriting_')
                )
              ? '✍️ Handwritten entry — see drawing below'
              : ''}
          </Text>

          {entry.attachments?.length > 0 && (
            <AttachmentStrip attachments={entry.attachments} />
          )}
        </GlassCard>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.void },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.void },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: spacing.xl, paddingTop: 56, paddingBottom: spacing.md,
  },
  headerRight: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  editBtn: {
    backgroundColor: tint(colors.gold, 0.15),
    borderWidth: 1, borderColor: tint(colors.gold, 0.35),
    borderRadius: radii.sm,
    padding: 7,
  },
  deleteBtn: {
    backgroundColor: 'rgba(244,63,94,0.1)',
    borderRadius: radii.sm,
    padding: 7,
  },
  scrollContent: { padding: spacing.xl, paddingBottom: 60 },
  paper: { ...shadow.card },
  metaRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginBottom: spacing.lg,
  },
  moodEmoji: { fontSize: 22 },
  title: {
    fontSize: 24, fontWeight: '800', color: colors.gold300,
    marginBottom: spacing.lg,
  },
  divider: {
    height: 1, backgroundColor: overlays.border,
    marginBottom: spacing.xl,
  },
  content: {
    fontSize: 15, color: colors.text, lineHeight: 28,
  },
  notFound: { color: colors.textMuted, fontSize: 14 },
});