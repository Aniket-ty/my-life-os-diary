import React, { useCallback, useRef, useMemo, useState, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import BottomSheet, {
  BottomSheetFlatList,
  BottomSheetScrollView,
} from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import { useAIStore } from '../../stores/aiStore';
import moment from 'moment';

// ─── Constants ───────────────────────────────────────────────────────────────

const CONTEXTS = {
  general: {
    label: '✦ General',
    sub: 'Your Personal Coach',
    chips: [
      { icon: '🍗', text: 'Calories in chicken breast?' },
      { icon: '💪', text: 'Give me a chest workout' },
      { icon: '🔥', text: 'Best foods for fat loss?' },
      { icon: '📊', text: 'How to improve my BWI score?' },
    ],
  },
  fitness: {
    label: '💪 Fitness',
    sub: 'Fitness & Nutrition Coach',
    chips: [
      { icon: '🏋️', text: 'Give me a full chest workout' },
      { icon: '🥗', text: 'What should I eat for lunch?' },
      { icon: '🥚', text: 'How many calories in 2 eggs?' },
      { icon: '📅', text: 'Plan my workout week' },
    ],
  },
  diary: {
    label: '📓 Diary',
    sub: 'Diary & Reflection Coach',
    chips: [
      { icon: '✍️', text: 'Write a diary entry for today' },
      { icon: '😌', text: 'Summarise my mood this week' },
      { icon: '🪞', text: 'Give me a reflection prompt' },
      { icon: '🏃', text: 'Write about my workout today' },
    ],
  },
  todo: {
    label: '✅ Tasks',
    sub: 'Productivity Coach',
    chips: [
      { icon: '🗓️', text: 'Create a workout routine for this week' },
      { icon: '🔔', text: 'Add a daily protein reminder' },
      { icon: '🌅', text: 'Plan my morning routine tasks' },
      { icon: '🌱', text: 'What habits should I build?' },
    ],
  },
};

const CONTEXT_KEYS = Object.keys(CONTEXTS);

// ─── Sub-components ───────────────────────────────────────────────────────────

function ContextTabs({ active, onChange }) {
  return (
    <View style={styles.tabsRow}>
      {CONTEXT_KEYS.map((key) => (
        <TouchableOpacity
          key={key}
          style={[styles.tab, active === key && styles.tabActive]}
          onPress={() => onChange(key)}
          activeOpacity={0.7}
        >
          <Text style={[styles.tabText, active === key && styles.tabTextActive]}>
            {CONTEXTS[key].label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function MessageBubble({ item }) {
  const isUser = item.role === 'user';
  const displayContent = item.content.replace(/\[Context:.*?\]\n/s, '');
  return (
    <View style={[styles.msgRow, isUser && styles.msgRowUser]}>
      {!isUser && (
        <View style={styles.msgAvatar}>
          <Ionicons name="sparkles" size={10} color="#a78bfa" />
        </View>
      )}
      <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAI]}>
        <Text style={[styles.bubbleText, isUser && styles.bubbleTextUser]}>
          {displayContent}
        </Text>
        <Text style={[styles.bubbleTime, isUser && styles.bubbleTimeUser]}>
          {moment(item.createdAt).format('HH:mm')}
        </Text>
      </View>
    </View>
  );
}

function TypingIndicator() {
  return (
    <View style={styles.typingRow}>
      <View style={styles.msgAvatar}>
        <Ionicons name="sparkles" size={10} color="#a78bfa" />
      </View>
      <View style={styles.typingBubble}>
        <ActivityIndicator size="small" color="#8b5cf6" />
        <Text style={styles.typingText}>Thinking…</Text>
      </View>
    </View>
  );
}

function ActionCard({ pendingAction, onConfirm, onDismiss }) {
  if (!pendingAction) return null;
  const isFood = pendingAction.type === 'log_food';
  return (
    <View style={styles.actionCard}>
      <View style={styles.actionHeader}>
        <Ionicons name="add-circle" size={14} color="#10b981" />
        <Text style={styles.actionTitle}>
          {isFood ? '🥗 Add to nutrition log?' : '💪 Add to workout journal?'}
        </Text>
      </View>
      <Text style={styles.actionDetail}>
        {isFood
          ? `${pendingAction.data?.foodName} — ${pendingAction.data?.calories} kcal`
          : `${pendingAction.data?.workoutName} · ${pendingAction.data?.exercises?.length} exercise(s)`}
      </Text>
      <View style={styles.actionBtns}>
        <TouchableOpacity style={styles.btnDismiss} onPress={onDismiss} activeOpacity={0.7}>
          <Text style={styles.btnDismissText}>Not now</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btnConfirm} onPress={onConfirm} activeOpacity={0.8}>
          <Text style={styles.btnConfirmText}>✅ Add it</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function GlobalAISheet({ sheetRef, context = 'general', contextData = {} }) {
  const { messages, loading, pendingAction, sendMessage, confirmAction, dismissAction } =
    useAIStore();

  const [input, setInput] = useState('');
  const [activeContext, setActiveContext] = useState(
    CONTEXT_KEYS.includes(context) ? context : 'general'
  );

  const flatListRef = useRef(null);
  const snapPoints = useMemo(() => ['60%', '92%'], []);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (messages.length > 0) {
      // Small delay ensures layout is complete before scrolling
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    const contextMsg =
      Object.keys(contextData).length > 0
        ? `[Context: ${JSON.stringify(contextData)}]\n${text}`
        : text;
    await sendMessage(contextMsg);
  }, [input, loading, contextData, sendMessage]);

  const handleConfirm = useCallback(async () => {
    const ok = await confirmAction(pendingAction);
    if (ok) {
      Alert.alert(
        '✅ Done!',
        pendingAction?.type === 'log_food'
          ? 'Food added to your nutrition log!'
          : 'Workout added to your journal!'
      );
    }
  }, [pendingAction, confirmAction]);

  const canSend = input.trim().length > 0 && !loading;

  const renderItem = useCallback(({ item }) => <MessageBubble item={item} />, []);
  const keyExtractor = useCallback((item) => item.id, []);

  // ── Suggestion chips (shown when no messages) ──────────────────────────────
  // Rendered as ListHeaderComponent so they live INSIDE BottomSheetFlatList
  // and never conflict with its scroll context.
  const chips = CONTEXTS[activeContext]?.chips ?? CONTEXTS.general.chips;

  const ListHeader = useCallback(() => (
    <View style={styles.suggestionsWrap}>
      <Text style={styles.suggestLabel}>QUICK PROMPTS</Text>
      <View style={styles.chipsGrid}>
        {chips.map((chip) => (
          <TouchableOpacity
            key={chip.text}
            style={styles.chip}
            onPress={() => setInput(chip.text)}
            activeOpacity={0.7}
          >
            <Text style={styles.chipIcon}>{chip.icon}</Text>
            <Text style={styles.chipText}>{chip.text}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  ), [chips]);

  // ── Fixed header & footer rendered outside FlatList ───────────────────────
  const Header = (
    <>
      {/* Sheet header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.aiAvatar}>
            <Ionicons name="sparkles" size={15} color="#a78bfa" />
            <View style={styles.statusDot} />
          </View>
          <View>
            <Text style={styles.headerTitle}>AI Assistant</Text>
            <Text style={styles.headerSub}>{CONTEXTS[activeContext].sub}</Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={() => sheetRef.current?.close()}
          style={styles.closeBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="close" size={14} color="#565680" />
        </TouchableOpacity>
      </View>

      {/* Context tabs */}
      <ContextTabs active={activeContext} onChange={setActiveContext} />
    </>
  );

  const Footer = (
    <>
      {loading && <TypingIndicator />}
      <ActionCard
        pendingAction={pendingAction}
        onConfirm={handleConfirm}
        onDismiss={dismissAction}
      />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            placeholder="Ask anything…"
            placeholderTextColor="#565680"
            value={input}
            onChangeText={setInput}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[styles.sendBtn, !canSend && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!canSend}
            activeOpacity={0.8}
          >
            <Ionicons name="send" size={15} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </>
  );

  // ── KEY FIX: BottomSheetFlatList is the ROOT child of BottomSheet ─────────
  // No BottomSheetView wrapper. Header/Footer are rendered as stickyHeader
  // via ListHeaderComponent / with a wrapping View outside the sheet content.
  return (
    <BottomSheet
      ref={sheetRef}
      index={-1}
      snapPoints={snapPoints}
      enablePanDownToClose
      backgroundStyle={styles.sheetBg}
      handleIndicatorStyle={styles.handle}
      keyboardBehavior="extend"
      keyboardBlurBehavior="restore"
    >
      {/* Fixed top section — sits outside the scrollable area */}
      {Header}

      {/*
        BottomSheetFlatList is the DIRECT child of BottomSheet (no BottomSheetView).
        This is the correct pattern from @gorhom/bottom-sheet docs.
        When there are no messages, ListHeaderComponent renders the chips.
        When there are messages, it renders messages + chips header above them.
      */}
      <BottomSheetFlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        // Show chips above messages (or alone when messages=[])
        ListHeaderComponent={messages.length === 0 ? ListHeader : null}
        contentContainerStyle={[
          styles.messageList,
          messages.length === 0 && styles.messageListEmpty,
        ]}
        onContentSizeChange={() =>
          flatListRef.current?.scrollToEnd({ animated: true })
        }
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      />

      {/* Fixed bottom section — input + action card + typing */}
      {Footer}
    </BottomSheet>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  sheetBg: { backgroundColor: '#0c0c14' },
  handle: { backgroundColor: '#252538' },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1e1e30',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  aiAvatar: {
    width: 36, height: 36,
    borderRadius: 12,
    backgroundColor: '#1a0f3e',
    borderWidth: 1.5, borderColor: '#8b5cf6',
    alignItems: 'center', justifyContent: 'center',
    position: 'relative',
  },
  statusDot: {
    position: 'absolute',
    bottom: -2, right: -2,
    width: 8, height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
    borderWidth: 2, borderColor: '#0c0c14',
  },
  headerTitle: { fontSize: 14, fontWeight: '700', color: '#f0eeff', letterSpacing: -0.2 },
  headerSub: { fontSize: 10, color: '#a78bfa', marginTop: 1 },
  closeBtn: {
    width: 28, height: 28,
    borderRadius: 8,
    backgroundColor: '#12121e',
    borderWidth: 1, borderColor: '#252538',
    alignItems: 'center', justifyContent: 'center',
  },

  // Context tabs
  tabsRow: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1e1e30',
  },
  tab: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#252538',
    backgroundColor: 'transparent',
  },
  tabActive: {
    backgroundColor: 'rgba(139,92,246,0.08)',
    borderColor: '#8b5cf6',
  },
  tabText: { fontSize: 11, fontWeight: '500', color: '#565680' },
  tabTextActive: { color: '#a78bfa' },

  // Suggestions
  suggestionsWrap: { padding: 16 },
  suggestLabel: {
    fontSize: 10,
    color: '#565680',
    letterSpacing: 1,
    marginBottom: 12,
    fontWeight: '600',
  },
  chipsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    width: '47%',
    backgroundColor: '#12121e',
    borderWidth: 1,
    borderColor: '#252538',
    borderRadius: 12,
    padding: 12,
  },
  chipIcon: { fontSize: 18, marginBottom: 6 },
  chipText: { fontSize: 11, color: '#9090b8', fontWeight: '500', lineHeight: 16 },

  // Messages
  messageList: { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 8, gap: 10 },
  messageListEmpty: { flexGrow: 1 },
  msgRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 7,
    marginBottom: 2,
  },
  msgRowUser: { flexDirection: 'row-reverse' },
  msgAvatar: {
    width: 24, height: 24,
    borderRadius: 8,
    backgroundColor: '#1a0f3e',
    borderWidth: 1, borderColor: '#8b5cf6',
    alignItems: 'center', justifyContent: 'center',
  },
  bubble: {
    maxWidth: '72%',
    borderRadius: 16,
    padding: 10,
    borderWidth: 1,
  },
  bubbleAI: {
    backgroundColor: '#1a1a2e',
    borderColor: '#252538',
    borderBottomLeftRadius: 4,
  },
  bubbleUser: {
    backgroundColor: '#6d28d9',
    borderColor: 'rgba(139,92,246,0.3)',
    borderBottomRightRadius: 4,
  },
  bubbleText: { fontSize: 13, color: '#d4d0f0', lineHeight: 19 },
  bubbleTextUser: { color: '#ede9fe' },
  bubbleTime: { fontSize: 9, color: '#565680', marginTop: 4, textAlign: 'right' },
  bubbleTimeUser: { color: 'rgba(237,233,254,0.5)' },

  // Typing
  typingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#1a1a2e',
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    padding: 10,
    borderWidth: 1,
    borderColor: '#252538',
  },
  typingText: { fontSize: 12, color: '#565680' },

  // Action card
  actionCard: {
    margin: 12,
    backgroundColor: 'rgba(16,185,129,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(16,185,129,0.3)',
    borderRadius: 14,
    padding: 12,
  },
  actionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  actionTitle: { fontSize: 12, fontWeight: '700', color: '#10b981' },
  actionDetail: { fontSize: 11, color: '#9090b8', marginBottom: 10, paddingLeft: 20 },
  actionBtns: { flexDirection: 'row', gap: 8 },
  btnDismiss: {
    flex: 1, padding: 8, borderRadius: 8, alignItems: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1, borderColor: '#252538',
  },
  btnDismissText: { fontSize: 12, fontWeight: '600', color: '#565680' },
  btnConfirm: {
    flex: 1, padding: 8, borderRadius: 8, alignItems: 'center',
    backgroundColor: '#10b981',
  },
  btnConfirmText: { fontSize: 12, fontWeight: '700', color: '#052e16' },

  // Input bar
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#1e1e30',
  },
  input: {
    flex: 1,
    backgroundColor: '#12121e',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 9,
    color: '#f0eeff',
    fontSize: 13,
    borderWidth: 1,
    borderColor: '#252538',
    maxHeight: 80,
    lineHeight: 18,
  },
  sendBtn: {
    width: 38, height: 38,
    borderRadius: 12,
    backgroundColor: '#8b5cf6',
    alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: '#252538' },
});