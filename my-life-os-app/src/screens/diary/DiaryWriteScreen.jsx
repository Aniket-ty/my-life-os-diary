import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, ScrollView, TouchableOpacity,
  StyleSheet, Alert, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { useDiaryStore } from '../../stores/diaryStore';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { Ionicons } from '@expo/vector-icons';
import moment from 'moment';
import AttachmentStrip from '../../components/diary/AttachmentStrip';

const MOODS = [
  { key: 'happy', emoji: '😊' }, { key: 'sad', emoji: '😢' },
  { key: 'excited', emoji: '🤩' }, { key: 'calm', emoji: '😌' },
  { key: 'anxious', emoji: '😰' }, { key: 'angry', emoji: '😠' },
  { key: 'tired', emoji: '😴' }, { key: 'grateful', emoji: '🙏' },
];

export default function DiaryWriteScreen({ navigation, route }) {
  const { mode, id } = route.params || {};
  const { createEntry, uploadMedia } = useDiaryStore();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [mood, setMood] = useState(null);
  const [saving, setSaving] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState([]);
  const scrollRef = useRef(null);

  const pickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow photo access in settings.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
    });
    if (!result.canceled) {
      const asset = result.assets[0];
      setPendingAttachments((prev) => [
        ...prev,
        { uri: asset.uri, type: 'photo', name: asset.fileName || `photo_${Date.now()}.jpg`, preview: asset.uri },
      ]);
    }
  };

  const pickVideo = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      quality: 0.8,
    });
    if (!result.canceled) {
      const asset = result.assets[0];
      setPendingAttachments((prev) => [
        ...prev,
        { uri: asset.uri, type: 'video', name: asset.fileName || `video_${Date.now()}.mp4` },
      ]);
    }
  };

  const pickDocument = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'],
      copyToCacheDirectory: true,
    });
    if (!result.canceled && result.assets?.[0]) {
      const asset = result.assets[0];
      setPendingAttachments((prev) => [
        ...prev,
        {
          uri: asset.uri,
          type: 'document',
          name: asset.name || `document_${Date.now()}.pdf`,
          mimeType: asset.mimeType || 'application/pdf',
        },
      ]);
    }
  };

  const pickAudio = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'audio/*',
      copyToCacheDirectory: true,
    });
    if (!result.canceled && result.assets?.[0]) {
      const asset = result.assets[0];
      setPendingAttachments((prev) => [
        ...prev,
        { uri: asset.uri, type: 'audio', name: asset.name || `audio_${Date.now()}.m4a`, mimeType: asset.mimeType || 'audio/m4a' },
      ]);
    }
  };

  const removeAttachment = (index) => {
    setPendingAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!content.trim()) {
      Alert.alert('Empty entry', 'Please write something before saving.');
      return;
    }
    setSaving(true);
    try {
      const entry = await createEntry({
        title: title.trim() || null,
        content: content.trim(),
        mood,
        entryDate: moment().format('YYYY-MM-DD'),
      });

      if (entry?.id && pendingAttachments.length > 0) {
        for (const att of pendingAttachments) {
          await uploadMedia(entry.id, att.uri, att.type, att.name, att.mimeType);
        }
      }

      navigation.goBack();
    } catch (e) {
      Alert.alert('Error', 'Could not save entry. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <Ionicons name="chevron-back" size={24} color="#3d2b1f" />
        </TouchableOpacity>
        <Text style={styles.headerDate}>{moment().format('MMMM D, YYYY')}</Text>
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
          {saving
            ? <ActivityIndicator size="small" color="#fff" />
            : <Text style={styles.saveBtnText}>Save</Text>
          }
        </TouchableOpacity>
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Paper sheet */}
        <View style={styles.paper}>
          {/* Ruled lines (decorative) */}
          {Array.from({ length: 20 }).map((_, i) => (
            <View key={i} style={[styles.ruledLine, { top: 120 + i * 28 }]} />
          ))}

          {/* Red margin line */}
          <View style={styles.marginLine} />

          {/* Title input */}
          <TextInput
            style={styles.titleInput}
            placeholder="Title (optional)"
            placeholderTextColor="#c9b99a"
            value={title}
            onChangeText={setTitle}
            maxLength={100}
          />

          {/* Content input */}
          <TextInput
            style={styles.contentInput}
            placeholder="Dear Diary..."
            placeholderTextColor="#c9b99a"
            value={content}
            onChangeText={setContent}
            multiline
            textAlignVertical="top"
            autoFocus
          />

          {/* Attachments strip (paperclip style) */}
          {pendingAttachments.length > 0 && (
            <AttachmentStrip
              attachments={pendingAttachments}
              onRemove={removeAttachment}
              pending
            />
          )}
        </View>
      </ScrollView>

      {/* Bottom toolbar */}
      <View style={styles.toolbar}>
        {/* Mood picker */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.moodScroll}>
          {MOODS.map((m) => (
            <TouchableOpacity
              key={m.key}
              style={[styles.moodBtn, mood === m.key && styles.moodBtnActive]}
              onPress={() => setMood(mood === m.key ? null : m.key)}
            >
              <Text style={styles.moodEmoji}>{m.emoji}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Attach buttons */}
        <View style={styles.attachRow}>
          <TouchableOpacity style={styles.attachBtn} onPress={pickPhoto}>
            <Ionicons name="image-outline" size={22} color="#8B7355" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.attachBtn} onPress={pickVideo}>
            <Ionicons name="videocam-outline" size={22} color="#8B7355" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.attachBtn} onPress={pickAudio}>
            <Ionicons name="musical-notes-outline" size={22} color="#8B7355" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.attachBtn} onPress={pickDocument}>
            <Ionicons name="document-text-outline" size={22} color="#8B7355" />
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fdf6e3' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 56, paddingBottom: 12,
    backgroundColor: '#fdf6e3',
  },
  headerDate: { fontSize: 15, color: '#8B7355', fontWeight: '500', fontFamily: 'serif' },
  saveBtn: {
    backgroundColor: '#c8a96e', borderRadius: 16,
    paddingHorizontal: 18, paddingVertical: 7,
  },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  scroll: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40 },

  paper: {
    backgroundColor: '#fffef5',
    borderRadius: 4,
    padding: 20,
    paddingLeft: 52,
    minHeight: 600,
    shadowColor: '#8B7355',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    shadowOffset: { width: 2, height: 4 },
    elevation: 4,
    overflow: 'hidden',
    position: 'relative',
  },
  ruledLine: {
    position: 'absolute', left: 52, right: 20,
    height: 1, backgroundColor: '#e8dcc8',
  },
  marginLine: {
    position: 'absolute', left: 44, top: 0, bottom: 0,
    width: 1.5, backgroundColor: '#f5a62360',
  },
  titleInput: {
    fontSize: 20, fontWeight: '700', color: '#3d2b1f',
    fontFamily: 'serif', marginBottom: 16,
    paddingVertical: 4,
  },
  contentInput: {
    fontSize: 15, color: '#3d2b1f',
    fontFamily: 'serif', lineHeight: 28,
    minHeight: 400,
  },

  toolbar: {
    backgroundColor: '#fff',
    borderTopWidth: 1, borderTopColor: '#f0e6d0',
    paddingBottom: Platform.OS === 'ios' ? 30 : 12,
    paddingTop: 10,
  },
  moodScroll: { paddingHorizontal: 16, marginBottom: 8 },
  moodBtn: {
    padding: 6, borderRadius: 20, marginRight: 4,
    backgroundColor: '#fdf6e3',
  },
  moodBtnActive: { backgroundColor: '#f5e6c8', borderWidth: 1.5, borderColor: '#c8a96e' },
  moodEmoji: { fontSize: 22 },
  attachRow: {
    flexDirection: 'row', paddingHorizontal: 16, gap: 8,
  },
  attachBtn: {
    backgroundColor: '#fdf6e3', borderRadius: 10,
    padding: 10, borderWidth: 1, borderColor: '#e8dcc8',
  },
});
