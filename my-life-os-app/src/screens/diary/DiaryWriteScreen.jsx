import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Alert, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { useDiaryStore } from '../../stores/diaryStore';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import { Ionicons } from '@expo/vector-icons';
import moment from 'moment';
import AttachmentStrip from '../../components/diary/AttachmentStrip';
import { MobileHandwritingCanvas } from '../../components/diary/MobileHandwritingCanvas';
import Screen from '../../components/ui/Screen';
import GlassCard from '../../components/ui/GlassCard';
import Input from '../../components/ui/Input';
import Button from '../../components/ui/Button';
import {
  colors, spacing, radii, overlays, tint, shadow,
} from '../../theme';

const MOODS = [
  { key: 'happy', emoji: '😊' }, { key: 'sad', emoji: '😢' },
  { key: 'excited', emoji: '🤩' }, { key: 'calm', emoji: '😌' },
  { key: 'anxious', emoji: '😰' }, { key: 'angry', emoji: '😠' },
  { key: 'tired', emoji: '😴' }, { key: 'grateful', emoji: '🙏' },
];

export default function DiaryWriteScreen({ navigation, route }) {
  const { mode, id } = route.params || {};
  const isEdit = mode === 'edit' && !!id;
  const { createEntry, updateEntry, fetchEntry, uploadMedia, deleteMedia } = useDiaryStore();

  const [inputMode, setInputMode] = useState('type');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [mood, setMood] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pendingAttachments, setPendingAttachments] = useState([]);
  const [existingDrawing, setExistingDrawing] = useState(null);
  const canvasRef = useRef(null);
  const scrollRef = useRef(null);

  const isDrawingAttachment = (a) =>
    !!a && !!a.fileName && a.fileName.toLowerCase().startsWith('handwriting_');

  const writeDrawingToCache = async (base64) => {
    const file = new File(Paths.cache, `handwriting_${Date.now()}.png`);
    file.create();
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    file.write(bytes);
    return file.uri;
  };

  useEffect(() => {
    if (!isEdit) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const entry = await fetchEntry(id);
        if (cancelled || !entry) return;
        setTitle(entry.title || '');
        setContent(entry.content || '');
        setMood(entry.mood || null);
        const drawing = (entry.attachments || []).find((a) => isDrawingAttachment(a));
        setExistingDrawing(drawing ? { id: drawing.id, uri: drawing.cloudinaryUrl } : null);
        if (drawing) {
          setInputMode((entry.content || '').trim() ? 'mixed' : 'stylus');
        }
        setPendingAttachments((entry.attachments || [])
          .filter((a) => !isDrawingAttachment(a))
          .map((a) => ({
            id: a.id, uri: a.cloudinaryUrl, cloudinaryUrl: a.cloudinaryUrl,
            type: a.mediaType, name: a.fileName || '',
          })));
      } catch {
        if (!cancelled) Alert.alert('Error', 'Could not load entry.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [isEdit, id]);

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
    let drawingPng = null;
    if (canvasRef.current) {
      drawingPng = await canvasRef.current.exportPng();
    }

    if (!content.trim() && !drawingPng) {
      Alert.alert('Empty entry', 'Please write or draw something before saving.');
      return;
    }

    setSaving(true);
    try {
      const entryData = {
        title: title.trim() || null,
        // Provide fallback text so backend doesn't reject a purely handwritten entry
        content: content.trim() || (drawingPng ? '[Handwritten Entry]' : ''),
        mood,
        entryDate: moment().format('YYYY-MM-DD'),
      };

      const entry = isEdit
        ? await updateEntry(id, entryData)
        : await createEntry(entryData);

      // Save the pen drawing as an image attachment (no text conversion).
      // On edit, the previous drawing image is replaced with the new one.
      if (entry?.id) {
        if (drawingPng) {
          if (existingDrawing) {
            await deleteMedia(entry.id, existingDrawing.id);
          }
          try {
            const drawingUri = await writeDrawingToCache(drawingPng.base64);
            await uploadMedia(
              entry.id,
              drawingUri,
              'photo',
              `handwriting_${Date.now()}.png`,
              'image/png',
            );
          } catch {
            if (!isEdit) Alert.alert('Almost there', 'Entry saved, but your drawing could not be uploaded.');
          }
        } else if (existingDrawing) {
          // Canvas was cleared — remove the old drawing
          await deleteMedia(entry.id, existingDrawing.id);
        }

        const newAttachments = pendingAttachments.filter((a) => !a.id);
        for (const att of newAttachments) {
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
    <Screen style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboard}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={colors.gold} />
          </View>
        ) : (
        <>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerDate}>{moment().format('MMMM D, YYYY')}</Text>
          <Button
            onPress={handleSave}
            disabled={saving}
            loading={saving}
            size="sm"
            style={styles.saveBtn}
            textStyle={styles.saveBtnText}
          >
            Save
          </Button>
        </View>

        {/* Input Mode Switcher (Type / Stylus / Both) */}
        <View style={styles.modeContainer}>
          <View style={styles.modeBar}>
            <TouchableOpacity
              style={[styles.modeTab, inputMode === 'type' && styles.modeTabActive]}
              onPress={() => setInputMode('type')}
            >
              <Ionicons name="keypad-outline" size={13} color={inputMode === 'type' ? colors.void : colors.textMuted} />
              <Text style={[styles.modeText, inputMode === 'type' && styles.modeTextActive]}>Type</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeTab, inputMode === 'stylus' && styles.modeTabActive]}
              onPress={() => setInputMode('stylus')}
            >
              <Ionicons name="create-outline" size={13} color={inputMode === 'stylus' ? colors.void : colors.textMuted} />
              <Text style={[styles.modeText, inputMode === 'stylus' && styles.modeTextActive]}>Stylus / Pen</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modeTab, inputMode === 'mixed' && styles.modeTabActive]}
              onPress={() => setInputMode('mixed')}
            >
              <Ionicons name="layers-outline" size={13} color={inputMode === 'mixed' ? colors.void : colors.textMuted} />
              <Text style={[styles.modeText, inputMode === 'mixed' && styles.modeTextActive]}>Both</Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          ref={scrollRef}
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          scrollEnabled={inputMode === 'type'}
        >
          <GlassCard style={styles.paper}>
            <Input
              style={styles.fieldGap}
              inputStyle={styles.titleInput}
              placeholder="Title (optional)"
              placeholderTextColor={colors.textFaint}
              value={title}
              onChangeText={setTitle}
              maxLength={100}
            />

            {(inputMode === 'type' || inputMode === 'mixed') && (
              <Input
                inputStyle={[styles.contentInput, inputMode === 'mixed' && { minHeight: 140 }]}
                placeholder={inputMode === 'mixed' ? 'Typed reflection…' : "What's on your mind today?"}
                placeholderTextColor={colors.textFaint}
                value={content}
                onChangeText={setContent}
                multiline
                autoFocus={inputMode === 'type'}
              />
            )}

            {(inputMode === 'stylus' || inputMode === 'mixed') && (
              <View style={styles.canvasContainer}>
                {inputMode === 'mixed' && (
                  <Text style={styles.sectionLabel}>✍️ Stylus / Pen Drawing</Text>
                )}
                <MobileHandwritingCanvas
                  ref={canvasRef}
                  height={inputMode === 'stylus' ? 420 : 280}
                  imageUri={existingDrawing?.uri}
                />
              </View>
            )}

            {pendingAttachments.length > 0 && (
              <AttachmentStrip
                attachments={pendingAttachments}
                onRemove={removeAttachment}
                pending
              />
            )}
          </GlassCard>
        </ScrollView>

        <View style={styles.toolbar}>
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

          <View style={styles.attachRow}>
            <TouchableOpacity style={styles.attachBtn} onPress={pickPhoto}>
              <Ionicons name="image-outline" size={22} color={colors.gold} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.attachBtn} onPress={pickVideo}>
              <Ionicons name="videocam-outline" size={22} color={colors.gold} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.attachBtn} onPress={pickAudio}>
              <Ionicons name="musical-notes-outline" size={22} color={colors.gold} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.attachBtn} onPress={pickDocument}>
              <Ionicons name="document-text-outline" size={22} color={colors.gold} />
            </TouchableOpacity>
          </View>
        </View>
        </>
        )}
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.void },
  keyboard: { flex: 1 },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.xl, paddingTop: 56, paddingBottom: spacing.md,
  },
  headerDate: { fontSize: 13, color: colors.textMuted, fontWeight: '600', letterSpacing: 0.3 },
  modeContainer: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing.sm,
  },
  modeBar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: radii.pill,
    padding: 3,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  modeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 6,
    borderRadius: radii.pill,
  },
  modeTabActive: {
    backgroundColor: colors.gold,
  },
  modeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
  },
  modeTextActive: {
    color: colors.void,
    fontWeight: '700',
  },
  canvasContainer: {
    marginTop: 8,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.gold300,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  saveBtn: {
    backgroundColor: colors.gold,
    borderColor: colors.gold,
    shadowColor: colors.gold,
  },
  saveBtnText: { color: colors.void },
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.xl, paddingBottom: 40 },
  paper: {
    padding: spacing.xl,
    ...shadow.card,
  },
  fieldGap: { marginBottom: spacing.lg },
  titleInput: { fontSize: 20, fontWeight: '700', color: colors.white },
  contentInput: { minHeight: 360, fontSize: 15, lineHeight: 24 },
  toolbar: {
    backgroundColor: colors.abyss,
    borderTopWidth: 1, borderTopColor: overlays.border,
    paddingBottom: Platform.OS === 'ios' ? 30 : 12,
    paddingTop: 10,
  },
  moodScroll: { paddingHorizontal: spacing.lg, marginBottom: 8 },
  moodBtn: {
    padding: 6, borderRadius: radii.pill, marginRight: 6,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1, borderColor: 'transparent',
  },
  moodBtnActive: {
    backgroundColor: tint(colors.gold, 0.2),
    borderColor: colors.gold,
  },
  moodEmoji: { fontSize: 22 },
  attachRow: {
    flexDirection: 'row', paddingHorizontal: spacing.lg, gap: spacing.sm,
  },
  attachBtn: {
    backgroundColor: overlays.soft,
    borderRadius: radii.md,
    padding: 10,
    borderWidth: 1, borderColor: overlays.borderSoft,
  },
});