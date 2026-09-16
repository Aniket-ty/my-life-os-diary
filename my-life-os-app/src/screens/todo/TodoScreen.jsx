import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  RefreshControl, Alert, Modal,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import { useTodoStore } from '../../stores/todoStore';
import { Ionicons } from '@expo/vector-icons';
import moment from 'moment';
import Screen from '../../components/ui/Screen';
import PageHeader from '../../components/ui/PageHeader';
import GlassCard from '../../components/ui/GlassCard';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Badge from '../../components/ui/Badge';
import FloatingAIButton from '../../components/ai/FloatingAIButton';
import GlobalAISheet from '../../components/ai/GlobalAISheet';
import { colors, overlays, radii, shadow, spacing, tint, type as typ } from '../../theme';

const PRIORITIES = ['low', 'medium', 'high'];
const PRIORITY_COLORS = { low: colors.sky, medium: colors.amber, high: colors.rose };
const CATEGORIES = ['fitness', 'health', 'work', 'personal', 'other'];

export default function TodoScreen() {
  const { todos, loading, fetchTodos, createTodo, deleteTodo, completeTodo, uncompleteTodo } = useTodoStore();
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [category, setCategory] = useState('personal');
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchTodos(); }, []);
  const aiSheetRef = useRef(null);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchTodos();
    setRefreshing(false);
  };

  const handleCreate = async () => {
    if (!title.trim()) return Alert.alert('Required', 'Please enter a task title.');
    setSaving(true);
    try {
      await createTodo({ title: title.trim(), description: description.trim() || null, priority, category });
      setTitle(''); setDescription(''); setPriority('medium'); setCategory('personal');
      setShowModal(false);
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = async (todo) => {
    if (todo.isCompleted) await uncompleteTodo(todo.id);
    else await completeTodo(todo.id);
  };

  const confirmDelete = (id) => {
    Alert.alert('Delete Task', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteTodo(id) },
    ]);
  };

  const filtered = todos.filter((t) => {
    if (filter === 'active') return !t.isCompleted;
    if (filter === 'done') return t.isCompleted;
    if (CATEGORIES.includes(filter)) return t.category === filter;
    return true;
  });

  const pending = todos.filter((t) => !t.isCompleted).length;

  const renderTodo = ({ item }) => (
    <TouchableOpacity
      style={styles.todoPress}
      onLongPress={() => confirmDelete(item.id)}
      activeOpacity={0.85}
    >
      <GlassCard style={[styles.todoCard, item.isCompleted && styles.todoCardDone]} padded={false}>
        <View style={[styles.priorityStrip, { backgroundColor: PRIORITY_COLORS[item.priority] }]} />

        <View style={styles.todoContent}>
          <TouchableOpacity
            style={styles.checkbox}
            onPress={() => handleToggle(item)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <View style={[styles.checkCircle, item.isCompleted && styles.checkCircleDone]}>
              {item.isCompleted && <Ionicons name="checkmark" size={14} color={colors.white} />}
            </View>
          </TouchableOpacity>

          <View style={styles.todoText}>
            <Text style={[styles.todoTitle, item.isCompleted && styles.todoTitleDone]}>
              {item.title}
            </Text>
            {item.description ? (
              <Text style={styles.todoDesc} numberOfLines={1}>{item.description}</Text>
            ) : null}
            <View style={styles.todoMeta}>
              {item.category && (
                <Badge tone="slate">{item.category}</Badge>
              )}
              {item.dueDate && (
                <Text style={styles.dueDate}>
                  📅 {moment(item.dueDate).format('MMM D')}
                </Text>
              )}
              {item.isRecurring && (
                <Badge tone="violet">🔁 {item.recurPattern}</Badge>
              )}
            </View>
          </View>

          <TouchableOpacity onPress={() => confirmDelete(item.id)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="trash-outline" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        </View>
      </GlassCard>
    </TouchableOpacity>
  );

  return (
    <Screen>
      <View style={styles.page}>
        <PageHeader
          title="To-Do"
          subtitle={`${pending} task${pending !== 1 ? 's' : ''} remaining`}
          icon={<Ionicons name="checkbox-outline" size={22} color={colors.sky} />}
          accent={colors.sky}
          action={
            <Button
              size="md"
              icon={<Ionicons name="add" size={18} />}
              onPress={() => setShowModal(true)}
              style={styles.addBtn}
            >
              Add task
            </Button>
          }
        />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={styles.filterContent}>
        {['all', 'active', 'done', ...CATEGORIES].map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterChip, filter === f && styles.filterChipActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderTodo}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.sky} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <View style={styles.emptyBadge}>
              <Ionicons name="checkmark-done" size={30} color={colors.sky} />
            </View>
            <Text style={styles.emptyText}>All clear!</Text>
            <Text style={styles.emptySubText}>Tap + to add a new task</Text>
          </View>
        }
      />

      <Modal visible={showModal} animationType="slide" transparent>
        <KeyboardAvoidingView style={styles.modalOverlay} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Task</Text>
              <TouchableOpacity onPress={() => setShowModal(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close" size={22} color={colors.text} />
              </TouchableOpacity>
            </View>

            <Input
              label="Task title"
              value={title}
              onChangeText={setTitle}
              placeholder="Task title *"
              autoFocus
              style={styles.modalField}
            />
            <Input
              label="Description"
              value={description}
              onChangeText={setDescription}
              placeholder="Description (optional)"
              multiline
              inputStyle={{ minHeight: 60 }}
              style={styles.modalField}
            />

            <Text style={styles.modalLabel}>Priority</Text>
            <View style={styles.priorityRow}>
              {PRIORITIES.map((p) => (
                <TouchableOpacity
                  key={p}
                  style={[styles.priorityBtn, priority === p && { borderColor: PRIORITY_COLORS[p], backgroundColor: tint(PRIORITY_COLORS[p], 0.15) }]}
                  onPress={() => setPriority(p)}
                >
                  <Text style={[styles.priorityBtnText, priority === p && { color: PRIORITY_COLORS[p] }]}>
                    {p.charAt(0).toUpperCase() + p.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.modalLabel}>Category</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll} contentContainerStyle={styles.catContent}>
              {CATEGORIES.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[styles.categoryBtn, category === c && styles.categoryBtnActive]}
                  onPress={() => setCategory(c)}
                >
                  <Text style={[styles.categoryBtnText, category === c && styles.categoryBtnTextActive]}>
                    {c.charAt(0).toUpperCase() + c.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Button size="lg" onPress={handleCreate} disabled={saving} style={styles.createBtn}>
              {saving
                ? <ActivityIndicator color={colors.white} />
                : <Text style={styles.createBtnText}>Add Task</Text>
              }
            </Button>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <FloatingAIButton onPress={() => aiSheetRef.current?.expand()} />
      <GlobalAISheet sheetRef={aiSheetRef} context="todo" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  page: { paddingTop: 56, paddingHorizontal: spacing.xl },
  addBtn: { backgroundColor: colors.sky, borderColor: colors.sky, ...shadow.glow(colors.sky) },
  filterScroll: { maxHeight: 52 },
  filterContent: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md, gap: spacing.sm },
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: radii.pill,
    backgroundColor: overlays.faint, borderWidth: 1, borderColor: colors.edge,
  },
  filterChipActive: { backgroundColor: colors.sky, borderColor: colors.sky },
  filterText: { fontSize: 13, color: colors.textMuted, fontWeight: '600' },
  filterTextActive: { color: colors.void, fontWeight: '700' },
  list: { paddingHorizontal: spacing.lg, paddingBottom: 100, paddingTop: spacing.xs },
  todoPress: { borderRadius: radii.lg, marginBottom: spacing.md },
  todoCard: { borderRadius: radii.lg, flexDirection: 'row', overflow: 'hidden' },
  todoCardDone: { opacity: 0.5 },
  priorityStrip: { width: 4 },
  todoContent: { flex: 1, flexDirection: 'row', alignItems: 'center', padding: spacing.lg, gap: spacing.md },
  checkbox: { padding: 2 },
  checkCircle: {
    width: 24, height: 24, borderRadius: radii.pill,
    borderWidth: 2, borderColor: colors.edge,
    alignItems: 'center', justifyContent: 'center',
  },
  checkCircleDone: { backgroundColor: colors.sky, borderColor: colors.sky },
  todoText: { flex: 1 },
  todoTitle: { fontSize: 15, fontWeight: '600', color: colors.white, marginBottom: 2 },
  todoTitleDone: { textDecorationLine: 'line-through', color: colors.textFaint },
  todoDesc: { fontSize: 12, color: colors.textMuted, marginBottom: spacing.xs },
  todoMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flexWrap: 'wrap' },
  dueDate: { fontSize: 11, color: colors.textMuted },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyBadge: {
    width: 64, height: 64, borderRadius: radii.pill,
    backgroundColor: tint(colors.sky, 0.15), borderWidth: 1, borderColor: tint(colors.sky, 0.3),
    alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg,
  },
  emptyText: { fontSize: 18, fontWeight: '600', color: colors.white, marginBottom: 6 },
  emptySubText: { fontSize: 13, color: colors.textFaint },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.7)' },
  modal: {
    backgroundColor: colors.abyss, borderTopLeftRadius: radii.xxl, borderTopRightRadius: radii.xxl,
    padding: spacing.xxl, paddingBottom: 40,
  },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xl },
  modalTitle: { ...typ.h2 },
  modalField: { marginBottom: spacing.lg },
  modalLabel: { ...typ.label, marginBottom: spacing.sm },
  priorityRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.lg },
  priorityBtn: {
    flex: 1, padding: 10, borderRadius: radii.md, alignItems: 'center',
    borderWidth: 1, borderColor: colors.edge, backgroundColor: overlays.faint,
  },
  priorityBtnText: { fontSize: 13, color: colors.textMuted, fontWeight: '600' },
  catScroll: { marginBottom: spacing.xl },
  catContent: { gap: spacing.sm },
  categoryBtn: {
    paddingHorizontal: 14, paddingVertical: spacing.sm, borderRadius: radii.pill,
    backgroundColor: overlays.faint, borderWidth: 1, borderColor: colors.edge,
  },
  categoryBtnActive: { backgroundColor: tint(colors.sky, 0.15), borderColor: colors.sky },
  categoryBtnText: { fontSize: 13, color: colors.textMuted, fontWeight: '600' },
  categoryBtnTextActive: { color: colors.sky },
  createBtn: { backgroundColor: colors.sky, borderColor: colors.sky, ...shadow.glow(colors.sky) },
  createBtnText: { color: colors.white, fontWeight: '700', fontSize: 16 },
});