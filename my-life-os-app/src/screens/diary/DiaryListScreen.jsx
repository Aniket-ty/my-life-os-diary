import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  TextInput, StatusBar, RefreshControl, Alert,
} from 'react-native';
import { useDiaryStore } from '../../stores/diaryStore';
import { Ionicons } from '@expo/vector-icons';
import moment from 'moment';
import { useRef } from 'react';
import FloatingAIButton from '../../components/ai/FloatingAIButton';
import GlobalAISheet from '../../components/ai/GlobalAISheet';


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
      style={styles.paperCard}
      onPress={() => navigation.navigate('DiaryEntry', { id: item.id })}
      activeOpacity={0.85}
    >
      {/* Torn paper top edge */}
      <View style={styles.tornTop} />

      {/* Pin dot */}
      {item.isPinned && (
        <View style={styles.pinDot}>
          <Ionicons name="bookmark" size={14} color="#e74c3c" />
        </View>
      )}

      {/* Date */}
      <Text style={styles.dateText}>
        {moment(item.entryDate).format('dddd, MMMM D')}
      </Text>

      {/* Title */}
      {item.title ? (
        <Text style={styles.titleText} numberOfLines={1}>{item.title}</Text>
      ) : null}

      {/* Content preview */}
      <Text style={styles.contentPreview} numberOfLines={3}>
        {item.content}
      </Text>

      {/* Footer row */}
      <View style={styles.cardFooter}>
        <View style={styles.footerLeft}>
          {item.mood ? (
            <Text style={styles.moodEmoji}>{MOODS[item.mood] || '📝'}</Text>
          ) : null}
          {item.attachments?.length > 0 && (
            <View style={styles.attachBadge}>
              <Ionicons name="paperclip" size={11} color="#888" />
              <Text style={styles.attachCount}>{item.attachments.length}</Text>
            </View>
          )}
        </View>
        <TouchableOpacity onPress={() => confirmDelete(item.id)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="trash-outline" size={16} color="#ccc" />
        </TouchableOpacity>
      </View>

      {/* Ruled lines */}
      {[0, 1, 2, 3, 4].map((i) => (
        <View key={i} style={[styles.ruledLine, { top: 72 + i * 22 }]} />
      ))}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#fdf6e3" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Diary</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('DiaryWrite', { mode: 'create' })}
        >
          <Ionicons name="create-outline" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchBox}>
        <Ionicons name="search-outline" size={16} color="#aaa" style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search entries..."
          placeholderTextColor="#bbb"
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={16} color="#bbb" />
          </TouchableOpacity>
        )}
      </View>

      {/* List */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderEntry}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#c8a96e" />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyEmoji}>📖</Text>
            <Text style={styles.emptyText}>No entries yet</Text>
            <Text style={styles.emptySubText}>Tap the pencil to write your first entry</Text>
          </View>
        }
      />
      <FloatingAIButton onPress={() => aiSheetRef.current?.expand()} />
 <GlobalAISheet sheetRef={aiSheetRef} context="diary" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fdf6e3' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 30, fontWeight: '700', color: '#3d2b1f',
    fontFamily: 'serif',
  },
  addButton: {
    backgroundColor: '#c8a96e', borderRadius: 22,
    width: 44, height: 44, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#c8a96e', shadowOpacity: 0.4, shadowRadius: 8, shadowOffset: { width: 0, height: 4 },
  },
  searchBox: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', marginHorizontal: 20, marginBottom: 16,
    borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
    shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, shadowOffset: { width: 0, height: 2 },
  },
  searchInput: { flex: 1, fontSize: 14, color: '#333' },
  list: { paddingHorizontal: 20, paddingBottom: 100 },

  paperCard: {
    backgroundColor: '#fffef5',
    borderRadius: 4,
    padding: 16,
    paddingTop: 20,
    marginBottom: 20,
    minHeight: 160,
    shadowColor: '#8B7355',
    shadowOpacity: 0.15,
    shadowRadius: 6,
    shadowOffset: { width: 2, height: 4 },
    elevation: 3,
    borderLeftWidth: 3,
    borderLeftColor: '#f5a623',
    overflow: 'hidden',
  },
  tornTop: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 4,
    backgroundColor: '#f0e6c8',
  },
  pinDot: { position: 'absolute', top: 10, right: 12 },
  dateText: {
    fontSize: 11, color: '#a0856c', fontWeight: '600',
    letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 6,
  },
  titleText: {
    fontSize: 16, fontWeight: '700', color: '#3d2b1f',
    fontFamily: 'serif', marginBottom: 6,
  },
  contentPreview: {
    fontSize: 14, color: '#5a4a3a', lineHeight: 22,
    fontFamily: 'serif', zIndex: 1,
  },
  ruledLine: {
    position: 'absolute', left: 16, right: 16, height: 1,
    backgroundColor: '#e8dcc8', opacity: 0.6,
  },
  cardFooter: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginTop: 12,
  },
  footerLeft: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  moodEmoji: { fontSize: 16 },
  attachBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: '#f0e6c8', borderRadius: 10,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  attachCount: { fontSize: 11, color: '#888' },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyText: { fontSize: 18, fontWeight: '600', color: '#8B7355', marginBottom: 6 },
  emptySubText: { fontSize: 13, color: '#aaa', textAlign: 'center' },
});
// Add these imports at the top of DiaryListScreen.jsx:
// import { useRef } from 'react';
// import FloatingAIButton from '../../components/ai/FloatingAIButton';
// import GlobalAISheet from '../../components/ai/GlobalAISheet';
//
// Add inside the component:
// const aiSheetRef = useRef(null);
//
// Add before the closing </View>:
// <FloatingAIButton onPress={() => aiSheetRef.current?.expand()} />
// <GlobalAISheet sheetRef={aiSheetRef} context="diary" />
