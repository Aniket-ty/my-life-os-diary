import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, Image,
} from 'react-native';
import { useDiaryStore } from '../../stores/diaryStore';
import { Ionicons } from '@expo/vector-icons';
import moment from 'moment';
import AttachmentStrip from '../../components/diary/AttachmentStrip';

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
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#c8a96e" />
      </View>
    );
  }

  if (!entry) {
    return (
      <View style={styles.center}>
        <Text style={{ color: '#8B7355' }}>Entry not found.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={24} color="#3d2b1f" />
        </TouchableOpacity>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => navigation.navigate('DiaryWrite', { mode: 'edit', id: entry.id })}
          >
            <Ionicons name="pencil-outline" size={18} color="#8B7355" />
          </TouchableOpacity>
          <TouchableOpacity onPress={confirmDelete}>
            <Ionicons name="trash-outline" size={18} color="#e74c3c" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Paper */}
        <View style={styles.paper}>
          {Array.from({ length: 18 }).map((_, i) => (
            <View key={i} style={[styles.ruledLine, { top: 100 + i * 28 }]} />
          ))}
          <View style={styles.marginLine} />

          {/* Date & mood */}
          <View style={styles.metaRow}>
            <Text style={styles.dateText}>
              {moment(entry.entryDate).format('dddd, MMMM D, YYYY')}
            </Text>
            {entry.mood && (
              <Text style={styles.moodEmoji}>{MOODS[entry.mood]}</Text>
            )}
          </View>

          {/* Title */}
          {entry.title && (
            <Text style={styles.title}>{entry.title}</Text>
          )}

          {/* Content */}
          <Text style={styles.content}>{entry.content}</Text>

          {/* Attachments */}
          {entry.attachments?.length > 0 && (
            <AttachmentStrip attachments={entry.attachments} />
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fdf6e3' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fdf6e3' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 12,
  },
  headerRight: { flexDirection: 'row', gap: 16, alignItems: 'center' },
  editBtn: {
    backgroundColor: '#f5edd8', borderRadius: 8,
    padding: 6,
  },
  scrollContent: { padding: 20, paddingBottom: 60 },
  paper: {
    backgroundColor: '#fffef5',
    borderRadius: 4, padding: 20, paddingLeft: 52,
    minHeight: 500,
    shadowColor: '#8B7355', shadowOpacity: 0.15,
    shadowRadius: 8, shadowOffset: { width: 2, height: 4 },
    elevation: 4, overflow: 'hidden', position: 'relative',
  },
  ruledLine: {
    position: 'absolute', left: 52, right: 20,
    height: 1, backgroundColor: '#e8dcc8',
  },
  marginLine: {
    position: 'absolute', left: 44, top: 0, bottom: 0,
    width: 1.5, backgroundColor: '#f5a62360',
  },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  dateText: { fontSize: 11, color: '#a0856c', fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase' },
  moodEmoji: { fontSize: 20 },
  title: {
    fontSize: 20, fontWeight: '700', color: '#3d2b1f',
    fontFamily: 'serif', marginBottom: 12,
  },
  content: {
    fontSize: 15, color: '#3d2b1f',
    fontFamily: 'serif', lineHeight: 28,
  },
});
