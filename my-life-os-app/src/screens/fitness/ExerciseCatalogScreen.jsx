import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  TextInput, ActivityIndicator, StatusBar, Modal, Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../stores/authStore';
import { colors, radii, tint, spacing, overlays, shadow } from '../../theme';

const BASE_URL = 'https://my-life-os-diary.onrender.com/api/v1';

const MUSCLE_COLORS = {
  chest: '#f43f5e',
  back: '#8b5cf6',
  shoulders: '#f59e0b',
  arms: '#f97316',
  legs: '#a3e635',
  core: '#10b981',
  cardio: '#38bdf8',
  glutes: '#f472b6',
};
function muscleColor(group = '') {
  const key = String(group).toLowerCase().split(' ')[0];
  return MUSCLE_COLORS[key] || colors.textMuted;
}

export default function ExerciseCatalogScreen({ navigation }) {
  const { accessToken } = useAuthStore();
  const [exercises, setExercises] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [selectedExercise, setSelectedExercise] = useState(null);
  const debounceTimer = useRef(null);

  const fetchExercises = useCallback(async (q = '') => {
    setLoading(true);
    try {
      const url = q.trim()
        ? `${BASE_URL}/fitness/exercises?q=${encodeURIComponent(q.trim())}&limit=60`
        : `${BASE_URL}/fitness/exercises?limit=60`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      });
      const data = await res.json();
      setExercises(Array.isArray(data) ? data : (data.exercises || []));
    } catch (e) {
      setExercises([]);
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => { fetchExercises(''); }, [fetchExercises]);

  const handleSearch = (text) => {
    setQuery(text);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => fetchExercises(text), 400);
  };

  const openYouTube = (exerciseName) => {
    const q = encodeURIComponent(`how to do ${exerciseName} exercise form tutorial`);
    Linking.openURL(`https://www.youtube.com/results?search_query=${q}`);
  };

  const renderExercise = ({ item }) => {
    const mc = muscleColor(item.muscleGroup);
    return (
      <TouchableOpacity style={styles.card} activeOpacity={0.8} onPress={() => setSelectedExercise(item)}>
        <View style={[styles.cardIcon, { backgroundColor: mc + '22', borderColor: mc + '55' }]}>
          <Ionicons name="barbell-outline" size={18} color={mc} />
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.cardName} numberOfLines={1}>{item.name}</Text>
          <View style={styles.cardMeta}>
            {item.muscleGroup ? (
              <View style={[styles.muscleTag, { backgroundColor: mc + '1a', borderColor: mc + '44' }]}>
                <Text style={[styles.muscleTagText, { color: mc }]}>{item.muscleGroup}</Text>
              </View>
            ) : null}
            {item.equipmentType ? (
              <Text style={styles.equipText} numberOfLines={1}>· {item.equipmentType}</Text>
            ) : null}
          </View>
        </View>
        <Ionicons name="chevron-forward" size={16} color={colors.textFaint} />
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.void} />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerTitle}>
          <Text style={styles.titleText}>Exercise Library</Text>
          <Text style={styles.subtitleText}>Browse & learn any exercise</Text>
        </View>
      </View>

      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={17} color={colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search exercises, muscles..."
          placeholderTextColor={colors.textFaint}
          value={query}
          onChangeText={handleSearch}
          autoCorrect={false}
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => handleSearch('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="close-circle" size={16} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={colors.volt400} />
          <Text style={styles.loadingText}>Loading exercises...</Text>
        </View>
      ) : (
        <FlatList
          data={exercises}
          keyExtractor={(item) => item.id || item.name}
          renderItem={renderExercise}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <Ionicons name="search-outline" size={40} color={colors.textFaint} />
              <Text style={styles.emptyText}>No exercises found</Text>
              <Text style={styles.emptySubText}>Try a different search term</Text>
            </View>
          }
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}

      <Modal visible={!!selectedExercise} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setSelectedExercise(null)}>
        {selectedExercise && (
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setSelectedExercise(null)} style={styles.modalClose}>
                <Ionicons name="close" size={20} color={colors.text} />
              </TouchableOpacity>
              <Text style={styles.modalTitle} numberOfLines={2}>{selectedExercise.name}</Text>
            </View>
            <View style={styles.modalBody}>
              <View style={styles.modalBadges}>
                {selectedExercise.muscleGroup && (
                  <View style={[styles.bigBadge, { backgroundColor: muscleColor(selectedExercise.muscleGroup) + '1a', borderColor: muscleColor(selectedExercise.muscleGroup) + '44' }]}>
                    <Ionicons name="body-outline" size={14} color={muscleColor(selectedExercise.muscleGroup)} />
                    <Text style={[styles.bigBadgeText, { color: muscleColor(selectedExercise.muscleGroup) }]}>{selectedExercise.muscleGroup}</Text>
                  </View>
                )}
                {selectedExercise.equipmentType && (
                  <View style={styles.bigBadge}>
                    <Ionicons name="barbell-outline" size={14} color={colors.textMuted} />
                    <Text style={styles.bigBadgeText}>{selectedExercise.equipmentType}</Text>
                  </View>
                )}
                {selectedExercise.difficulty && (
                  <View style={[styles.bigBadge, { borderColor: colors.amber + '55', backgroundColor: colors.amber + '1a' }]}>
                    <Ionicons name="flash-outline" size={14} color={colors.amber} />
                    <Text style={[styles.bigBadgeText, { color: colors.amber }]}>{selectedExercise.difficulty}</Text>
                  </View>
                )}
              </View>

              {(selectedExercise.recommendedSets || selectedExercise.recommendedReps) && (
                <View style={styles.setsCard}>
                  <Text style={styles.setsCardLabel}>Recommended</Text>
                  <Text style={styles.setsCardValue}>{selectedExercise.recommendedSets || 3} sets × {selectedExercise.recommendedReps || '10'} reps</Text>
                  {selectedExercise.restSec && <Text style={styles.setsCardSub}>· {selectedExercise.restSec}s rest between sets</Text>}
                </View>
              )}

              {selectedExercise.instructions && (
                <View style={styles.instructionsCard}>
                  <Text style={styles.instructionsTitle}>How to do it</Text>
                  <Text style={styles.instructionsText}>{selectedExercise.instructions}</Text>
                </View>
              )}

              {selectedExercise.formCues && selectedExercise.formCues.length > 0 && (
                <View style={styles.instructionsCard}>
                  <Text style={styles.instructionsTitle}>Form cues</Text>
                  {selectedExercise.formCues.map((cue, i) => (
                    <View key={i} style={styles.cueRow}>
                      <Ionicons name="checkmark-circle" size={14} color={colors.volt400} style={{ marginTop: 2 }} />
                      <Text style={styles.cueText}>{cue}</Text>
                    </View>
                  ))}
                </View>
              )}

              <TouchableOpacity style={styles.youtubeBtn} activeOpacity={0.85} onPress={() => openYouTube(selectedExercise.name)}>
                <View style={styles.youtubeBtnIcon}>
                  <Ionicons name="logo-youtube" size={20} color="#FF0000" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.youtubeBtnTitle}>Watch on YouTube</Text>
                  <Text style={styles.youtubeBtnSub}>"{selectedExercise.name} form tutorial"</Text>
                </View>
                <Ionicons name="open-outline" size={16} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.void },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingTop: 56, paddingHorizontal: spacing.xl, paddingBottom: spacing.md,
    borderBottomWidth: 1, borderBottomColor: overlays.borderSoft,
  },
  backBtn: {
    width: 38, height: 38, borderRadius: radii.pill,
    backgroundColor: overlays.faint, borderWidth: 1, borderColor: overlays.border,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: { flex: 1 },
  titleText: { fontSize: 20, fontWeight: '800', color: colors.white, letterSpacing: -0.5 },
  subtitleText: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    marginHorizontal: spacing.xl, marginVertical: spacing.md,
    backgroundColor: colors.surface, borderRadius: radii.pill,
    borderWidth: 1, borderColor: colors.edge,
    paddingHorizontal: 14, paddingVertical: 10,
  },
  searchInput: { flex: 1, fontSize: 14, color: colors.text, paddingVertical: 0 },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: colors.textMuted, fontSize: 14 },
  list: { paddingHorizontal: spacing.xl, paddingBottom: 40, paddingTop: 4 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  cardIcon: { width: 40, height: 40, borderRadius: radii.md, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  cardBody: { flex: 1 },
  cardName: { fontSize: 14, fontWeight: '700', color: colors.text },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3, flexWrap: 'wrap' },
  muscleTag: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: radii.sm, borderWidth: 1 },
  muscleTagText: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  equipText: { fontSize: 11, color: colors.textFaint },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: overlays.borderSoft },
  emptyWrap: { alignItems: 'center', paddingTop: 60, gap: 10 },
  emptyText: { fontSize: 16, fontWeight: '700', color: colors.white },
  emptySubText: { fontSize: 13, color: colors.textMuted },
  modalContainer: { flex: 1, backgroundColor: colors.void },
  modalHeader: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    paddingTop: 56, paddingHorizontal: spacing.xl, paddingBottom: spacing.lg,
    borderBottomWidth: 1, borderBottomColor: overlays.borderSoft,
  },
  modalClose: {
    width: 36, height: 36, borderRadius: radii.pill,
    backgroundColor: overlays.faint, borderWidth: 1, borderColor: overlays.border,
    alignItems: 'center', justifyContent: 'center', marginTop: 2,
  },
  modalTitle: { flex: 1, fontSize: 22, fontWeight: '800', color: colors.white, letterSpacing: -0.5, lineHeight: 28 },
  modalBody: { flex: 1, padding: spacing.xl, gap: spacing.md },
  modalBadges: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  bigBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: overlays.soft, borderRadius: radii.md, borderWidth: 1,
    borderColor: overlays.border, paddingHorizontal: 10, paddingVertical: 6,
  },
  bigBadgeText: { fontSize: 12, fontWeight: '600', color: colors.textMuted },
  setsCard: {
    backgroundColor: colors.volt400 + '14', borderRadius: radii.xl,
    borderWidth: 1, borderColor: colors.volt400 + '40', padding: 14, gap: 2,
  },
  setsCardLabel: { fontSize: 10, fontWeight: '700', color: colors.volt400, textTransform: 'uppercase', letterSpacing: 1 },
  setsCardValue: { fontSize: 20, fontWeight: '800', color: colors.white, marginTop: 2 },
  setsCardSub: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  instructionsCard: {
    backgroundColor: colors.surface, borderRadius: radii.xl,
    borderWidth: 1, borderColor: colors.edge, padding: 14, gap: 8,
  },
  instructionsTitle: { fontSize: 12, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.8 },
  instructionsText: { fontSize: 14, color: colors.textSoft, lineHeight: 21 },
  cueRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  cueText: { flex: 1, fontSize: 13, color: colors.textSoft, lineHeight: 19 },
  youtubeBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#FF000014', borderRadius: radii.xl,
    borderWidth: 1, borderColor: '#FF000033', padding: 14, marginTop: 4,
  },
  youtubeBtnIcon: {
    width: 40, height: 40, borderRadius: radii.md,
    backgroundColor: '#FF000020', alignItems: 'center', justifyContent: 'center',
  },
  youtubeBtnTitle: { fontSize: 14, fontWeight: '700', color: colors.white },
  youtubeBtnSub: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
});
