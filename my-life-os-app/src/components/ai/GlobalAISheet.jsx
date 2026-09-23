import React, { useCallback, useRef, useMemo, useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity,
  StyleSheet, ActivityIndicator, Alert,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import BottomSheetModal, {
  BottomSheetFlatList,
} from '@gorhom/bottom-sheet';
import { Ionicons } from '@expo/vector-icons';
import { useAIStore } from '../../stores/aiStore';
import moment from 'moment';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { colors, radii, spacing, tint } from '../../theme';

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
          <Ionicons name="sparkles" size={10} color={colors.purple} />
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
        <Ionicons name="sparkles" size={10} color={colors.purple} />
      </View>
      <View style={styles.typingBubble}>
        <ActivityIndicator size="small" color={colors.violet} />
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
        <Ionicons name="add-circle" size={14} color={colors.emerald} />
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

export default function GlobalAISheet({ sheetRef, context = 'general', contextData = {} }) {
  const { messages, loading, pendingAction, sendMessage, confirmAction, dismissAction } =
    useAIStore();

  const [input, setInput] = useState('');
  const [activeContext, setActiveContext] = useState(
    CONTEXT_KEYS.includes(context) ? context : 'general'
  );

  const flatListRef = useRef(null);
  const snapPoints = useMemo(() => ['60%', '92%'], []);

  useEffect(() => {
    if (messages.length > 0) {
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

  const Header = (
    <>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.aiAvatar}>
            <Ionicons name="sparkles" size={15} color={colors.purple} />
            <View style={styles.statusDot} />
          </View>
          <View>
            <Text style={styles.headerTitle}>Coach</Text>
            <Text style={styles.headerSub}>{CONTEXTS[activeContext].sub}</Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={() => sheetRef.current?.dismiss()}
          style={styles.closeBtn}
          activeOpacity={0.7}
        >
          <Ionicons name="close" size={14} color={colors.textFaint} />
        </TouchableOpacity>
      </View>

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
          <Input
            style={styles.inputWrap}
            inputStyle={styles.input}
            placeholder="Ask anything…"
            value={input}
            onChangeText={setInput}
            multiline
            maxLength={500}
          />
          <Button
            size="icon"
            variant="primary"
            style={[styles.sendBtn, !canSend && styles.sendBtnDisabled]}
            disabled={!canSend}
            onPress={handleSend}
            icon={<Ionicons name="send" size={15} color={colors.white} />}
          />
        </View>
      </KeyboardAvoidingView>
    </>
  );

  return (
    <BottomSheetModal
      ref={sheetRef}
      snapPoints={snapPoints}
      enablePanDownToClose
      backgroundStyle={styles.sheetBg}
      handleIndicatorStyle={styles.handle}
      keyboardBehavior="extend"
      keyboardBlurBehavior="restore"
    >
      {Header}

      <BottomSheetFlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
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

      {Footer}
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  sheetBg: { backgroundColor: colors.abyss, borderTopLeftRadius: radii.xxl, borderTopRightRadius: radii.xxl },
  handle: { backgroundColor: colors.edge },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.edge,
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  aiAvatar: {
    width: 36, height: 36,
    borderRadius: radii.md,
    backgroundColor: tint(colors.violet, 0.18),
    borderWidth: 1.5, borderColor: colors.violet,
    alignItems: 'center', justifyContent: 'center',
    position: 'relative',
  },
  statusDot: {
    position: 'absolute',
    bottom: -2, right: -2,
    width: 8, height: 8,
    borderRadius: 4,
    backgroundColor: colors.emerald,
    borderWidth: 2, borderColor: colors.abyss,
  },
  headerTitle: { fontSize: 14, fontWeight: '700', color: colors.text, letterSpacing: -0.2 },
  headerSub: { fontSize: 10, color: colors.purple, marginTop: 1 },
  closeBtn: {
    width: 28, height: 28,
    borderRadius: radii.sm,
    backgroundColor: colors.surface,
    borderWidth: 1, borderColor: colors.edge,
    alignItems: 'center', justifyContent: 'center',
  },

  tabsRow: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.edge,
  },
  tab: {
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.edge,
    backgroundColor: 'transparent',
  },
  tabActive: {
    backgroundColor: tint(colors.violet, 0.1),
    borderColor: colors.violet,
  },
  tabText: { fontSize: 11, fontWeight: '500', color: colors.textFaint },
  tabTextActive: { color: colors.purple },

  suggestionsWrap: { padding: spacing.lg },
  suggestLabel: {
    fontSize: 10,
    color: colors.textFaint,
    letterSpacing: 1,
    marginBottom: spacing.md,
    fontWeight: '600',
  },
  chipsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chip: {
    width: '47%',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.edge,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  chipIcon: { fontSize: 18, marginBottom: 6 },
  chipText: { fontSize: 11, color: colors.textMuted, fontWeight: '500', lineHeight: 16 },

  messageList: { paddingHorizontal: 14, paddingTop: spacing.md, paddingBottom: spacing.sm, gap: 10 },
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
    borderRadius: radii.sm,
    backgroundColor: tint(colors.violet, 0.18),
    borderWidth: 1, borderColor: colors.violet,
    alignItems: 'center', justifyContent: 'center',
  },
  bubble: {
    maxWidth: '72%',
    borderRadius: radii.lg,
    padding: 10,
    borderWidth: 1,
  },
  bubbleAI: {
    backgroundColor: colors.card,
    borderColor: colors.edge,
    borderBottomLeftRadius: 4,
  },
  bubbleUser: {
    backgroundColor: tint(colors.violet, 0.16),
    borderColor: tint(colors.violet, 0.35),
    borderBottomRightRadius: 4,
  },
  bubbleText: { fontSize: 13, color: colors.textSoft, lineHeight: 19 },
  bubbleTextUser: { color: colors.white },
  bubbleTime: { fontSize: 9, color: colors.textFaint, marginTop: 4, textAlign: 'right' },
  bubbleTimeUser: { color: tint(colors.white, 0.5) },

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
    gap: spacing.sm,
    backgroundColor: colors.card,
    borderRadius: radii.lg,
    borderBottomLeftRadius: 4,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.edge,
  },
  typingText: { fontSize: 12, color: colors.textFaint },

  actionCard: {
    margin: spacing.md,
    backgroundColor: tint(colors.emerald, 0.08),
    borderWidth: 1,
    borderColor: tint(colors.emerald, 0.3),
    borderRadius: radii.lg,
    padding: spacing.md,
  },
  actionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  actionTitle: { fontSize: 12, fontWeight: '700', color: colors.emerald },
  actionDetail: { fontSize: 11, color: colors.textMuted, marginBottom: 10, paddingLeft: 20 },
  actionBtns: { flexDirection: 'row', gap: spacing.sm },
  btnDismiss: {
    flex: 1, padding: spacing.sm, borderRadius: radii.sm, alignItems: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1, borderColor: colors.edge,
  },
  btnDismissText: { fontSize: 12, fontWeight: '600', color: colors.textFaint },
  btnConfirm: {
    flex: 1, padding: spacing.sm, borderRadius: radii.sm, alignItems: 'center',
    backgroundColor: colors.emerald,
  },
  btnConfirmText: { fontSize: 12, fontWeight: '700', color: colors.void },

  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.edge,
  },
  inputWrap: { flex: 1 },
  input: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    paddingHorizontal: 14,
    paddingVertical: 9,
    color: colors.text,
    fontSize: 13,
    borderWidth: 1,
    borderColor: colors.edge,
    maxHeight: 80,
    minHeight: 34,
    lineHeight: 18,
  },
  sendBtn: {
    width: 38, height: 38,
    borderRadius: radii.md,
    backgroundColor: colors.violet,
    alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: colors.edge },
});