import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, FlatList, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native';
import { useAIStore } from '../../stores/aiStore';
import { Ionicons } from '@expo/vector-icons';
import moment from 'moment';
import PageHeader from '../../components/ui/PageHeader';
import GlassCard from '../../components/ui/GlassCard';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import { colors, overlays, radii, shadow, spacing, tint } from '../../theme';

const SUGGESTIONS = [
  'How many calories in 100g chicken breast?',
  'What muscles does bench press work?',
  'Give me a 3-day workout plan',
  'Best foods for muscle gain?',
];

export default function AIChatScreen({ navigation }) {
  const { messages, loading, pendingAction, sendMessage, confirmAction, dismissAction, clearChat } = useAIStore();
  const [input, setInput] = useState('');
  const flatListRef = useRef(null);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput('');
    await sendMessage(text);
  };

  const handleConfirmAction = async () => {
    const ok = await confirmAction(pendingAction);
    const type = pendingAction?.type;
    if (ok) {
      Alert.alert(
        '✅ Done!',
        type === 'log_food' ? 'Food added to your nutrition log!' : 'Workout added to your journal!'
      );
    }
  };

  const renderMessage = ({ item }) => {
    const isUser = item.role === 'user';
    return (
      <View style={[styles.msgRow, isUser && styles.msgRowUser]}>
        {!isUser && (
          <View style={styles.aiAvatar}>
            <Ionicons name="mic" size={14} color={colors.volt400} />
          </View>
        )}
        <View style={[styles.bubble, isUser ? styles.bubbleUser : styles.bubbleAI]}>
          <Text style={[styles.bubbleText, isUser && styles.bubbleTextUser]}>
            {item.content}
          </Text>
          <Text style={[styles.bubbleTime, isUser && styles.bubbleTimeUser]}>
            {moment(item.createdAt).format('HH:mm')}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      <View style={styles.navBar}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={styles.backBtn}
        >
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      <View style={styles.page}>
        <PageHeader
          title="Coach"
          subtitle="Fitness & Nutrition Coach"
          icon={
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <Ionicons name="sparkles" size={18} color={colors.volt300} />
              <Ionicons name="mic" size={19} color={colors.volt400} />
            </View>
          }
          accent={colors.volt500}
          action={
            <Button
              variant="ghost"
              size="sm"
              icon={<Ionicons name="trash-outline" size={14} color={colors.textMuted} />}
              onPress={() => Alert.alert('Clear Chat', 'Clear all messages?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Clear', style: 'destructive', onPress: clearChat },
              ])}
            >
              Clear
            </Button>
          }
        />
      </View>

      <GlassCard strong style={styles.chatCard} padded={false}>
        {messages.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={[styles.emptyAvatar, { flexDirection: 'row', gap: 6, width: 80, borderRadius: 24 }]}>
              <Ionicons name="sparkles" size={24} color={colors.white} />
              <Ionicons name="mic" size={24} color={colors.white} />
            </View>
            <Text style={styles.emptyTitle}>Your fitness coach</Text>
            <Text style={styles.emptySubText}>Ask me anything about food, exercises, or your health goals</Text>
            <View style={styles.suggestions}>
              {SUGGESTIONS.map((s) => (
                <TouchableOpacity key={s} style={styles.suggestionChip} onPress={() => { setInput(s); }}>
                  <Text style={styles.suggestionText}>{s}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : (
          <FlatList
            ref={flatListRef}
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={renderMessage}
            style={styles.flatList}
            contentContainerStyle={styles.messageList}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          />
        )}

        {loading && (
          <View style={styles.typingRow}>
            <View style={styles.aiAvatar}>
              <Ionicons name="sparkles" size={14} color={colors.violet} />
            </View>
            <View style={styles.typingBubble}>
              <ActivityIndicator size="small" color={colors.violet} />
              <Text style={styles.typingText}>Thinking...</Text>
            </View>
          </View>
        )}

        {pendingAction && (
          <GlassCard strong style={styles.actionCard}>
            <View style={styles.actionCardHeader}>
              <Ionicons name="add-circle" size={18} color={colors.emerald} />
              <Text style={styles.actionCardTitle}>
                {pendingAction.type === 'log_food' ? '🥗 Add to Nutrition Log?' : '💪 Add to Workout Journal?'}
              </Text>
            </View>
            {pendingAction.type === 'log_food' && (
              <Text style={styles.actionCardDetail}>
                {pendingAction.data?.foodName} — {pendingAction.data?.calories} kcal
                {pendingAction.data?.proteinG ? ` · ${pendingAction.data.proteinG}g protein` : ''}
              </Text>
            )}
            {pendingAction.type === 'add_workout' && (
              <Text style={styles.actionCardDetail}>
                {pendingAction.data?.workoutName} · {pendingAction.data?.exercises?.length} exercise(s)
              </Text>
            )}
            <View style={styles.actionBtns}>
              <Button
                variant="secondary"
                size="sm"
                style={styles.actionBtn}
                textStyle={styles.actionConfirmText}
                onPress={handleConfirmAction}
              >
                ✅ Add it
              </Button>
              <Button
                variant="ghost"
                size="sm"
                style={styles.actionBtn}
                textStyle={styles.actionDismissText}
                onPress={dismissAction}
              >
                Not now
              </Button>
            </View>
          </GlassCard>
        )}

        <View style={styles.inputBar}>
          <Input
            style={styles.inputWrap}
            inputStyle={styles.inputField}
            placeholder="Ask about food, exercises..."
            value={input}
            onChangeText={setInput}
            multiline
            maxLength={500}
            onSubmitEditing={handleSend}
          />
          <Button
            size="icon"
            variant="primary"
            style={styles.sendBtn}
            disabled={!input.trim() || loading}
            onPress={handleSend}
            icon={<Ionicons name="send" size={18} color={colors.white} />}
          />
        </View>
      </GlassCard>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.void },
  navBar: { paddingTop: 56, paddingHorizontal: spacing.lg, paddingBottom: spacing.xs },
  backBtn: {
    width: 40, height: 40, borderRadius: radii.pill,
    backgroundColor: overlays.faint, borderWidth: 1, borderColor: overlays.border,
    alignItems: 'center', justifyContent: 'center',
  },
  page: { paddingHorizontal: spacing.xl },
  chatCard: { flex: 1, marginHorizontal: spacing.lg, marginBottom: spacing.lg, overflow: 'hidden' },
  flatList: { flex: 1 },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.xxxl },
  emptyAvatar: {
    width: 72, height: 72, borderRadius: radii.xl,
    backgroundColor: colors.violet, alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.lg, ...shadow.glow(colors.violet),
  },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: colors.white, marginBottom: spacing.sm },
  emptySubText: { fontSize: 14, color: colors.textMuted, textAlign: 'center', marginBottom: spacing.xxl, lineHeight: 20 },
  suggestions: { gap: spacing.sm, width: '100%' },
  suggestionChip: {
    backgroundColor: tint(colors.violet, 0.1), borderRadius: radii.md, padding: spacing.md,
    borderWidth: 1, borderColor: tint(colors.violet, 0.3),
  },
  suggestionText: { color: colors.violet, fontSize: 13, fontWeight: '500' },
  messageList: { padding: spacing.lg, paddingBottom: spacing.sm, flexGrow: 1 },
  msgRow: { flexDirection: 'row', alignItems: 'flex-end', marginBottom: spacing.md, gap: spacing.sm },
  msgRowUser: { flexDirection: 'row-reverse' },
  aiAvatar: {
    width: 28, height: 28, borderRadius: radii.sm,
    backgroundColor: tint(colors.violet, 0.18), alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: colors.violet,
  },
  bubble: {
    maxWidth: '78%', borderRadius: radii.lg, padding: spacing.md,
    borderWidth: 1,
  },
  bubbleAI: {
    backgroundColor: colors.card, borderColor: colors.edge,
    borderBottomLeftRadius: 4,
  },
  bubbleUser: {
    backgroundColor: tint(colors.violet, 0.15), borderColor: tint(colors.violet, 0.4),
    borderBottomLeftRadius: radii.lg, borderBottomRightRadius: 4,
  },
  bubbleText: { fontSize: 14, color: colors.textSoft, lineHeight: 20 },
  bubbleTextUser: { color: colors.white },
  bubbleTime: { fontSize: 10, color: colors.textFaint, marginTop: spacing.xs, textAlign: 'right' },
  bubbleTimeUser: { color: tint(colors.white, 0.6) },
  typingRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingHorizontal: spacing.lg, paddingBottom: spacing.sm },
  typingBubble: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.card, borderRadius: radii.lg, padding: spacing.md,
    borderWidth: 1, borderColor: colors.edge,
  },
  typingText: { color: colors.textMuted, fontSize: 13 },
  actionCard: { marginHorizontal: spacing.md, marginBottom: spacing.md, borderColor: tint(colors.violet, 0.35) },
  actionCardHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xs },
  actionCardTitle: { fontSize: 14, fontWeight: '700', color: colors.white },
  actionCardDetail: { fontSize: 13, color: colors.textMuted, marginBottom: spacing.md },
  actionBtns: { flexDirection: 'row', gap: spacing.md },
  actionBtn: { flex: 1 },
  actionDismissText: { color: colors.textMuted },
  actionConfirmText: { color: colors.emerald, fontWeight: '700' },
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: spacing.sm,
    paddingHorizontal: spacing.lg, paddingVertical: spacing.md,
    borderTopWidth: 1, borderTopColor: colors.edge,
    paddingBottom: Platform.OS === 'ios' ? 30 : spacing.md,
  },
  inputWrap: { flex: 1 },
  inputField: { minHeight: 40, maxHeight: 100, borderRadius: radii.pill, paddingHorizontal: spacing.lg },
  sendBtn: { borderRadius: radii.pill },
});