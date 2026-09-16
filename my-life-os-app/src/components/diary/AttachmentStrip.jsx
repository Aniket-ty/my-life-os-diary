import React from 'react';
import {
  View, Text, Image, ScrollView, TouchableOpacity, StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, tint } from '../../theme';

export default function AttachmentStrip({ attachments, onRemove, pending = false }) {
  return (
    <View style={styles.container}>
      <View style={styles.clipRow}>
        <Ionicons name="attach" size={14} color={colors.gold300} />
        <Text style={styles.clipLabel}>Attached</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {attachments.map((att, index) => {
          const type = att.type || att.mediaType;
          return (
          <View key={index} style={styles.attachItem}>
            {/* Paperclip visual */}
            <View style={styles.paperclip}>
              <View style={styles.paperclipInner} />
            </View>

            {type === 'photo' && (att.preview || att.cloudinaryUrl) ? (
              <Image source={{ uri: att.preview || att.cloudinaryUrl }} style={styles.thumbImage} />
            ) : (
              <View style={styles.thumbGeneric}>
                <Ionicons
                  name={type === 'audio' ? 'musical-notes' : type === 'video' ? 'videocam' : 'document'}
                  size={22}
                  color={colors.gold300}
                />
                <Text style={styles.thumbLabel} numberOfLines={1}>
                  {type === 'audio' ? 'Audio' : type === 'video' ? 'Video' : 'File'}
                </Text>
              </View>
            )}

            {/* Remove button (only when pending / editing) */}
            {onRemove && (
              <TouchableOpacity style={styles.removeBtn} onPress={() => onRemove(index)}>
                <Ionicons name="close-circle" size={16} color={colors.rose} />
              </TouchableOpacity>
            )}
          </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 20,
    borderTopWidth: 1,
    borderTopColor: colors.edge,
    paddingTop: 12,
  },
  clipRow: {
    flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8,
  },
  clipLabel: { fontSize: 11, color: colors.gold300, fontWeight: '600', letterSpacing: 0.5 },

  attachItem: { marginRight: 12, alignItems: 'center', position: 'relative' },

  paperclip: {
    width: 14, height: 28,
    borderWidth: 2, borderColor: tint(colors.gold, 0.6),
    borderRadius: 7, marginBottom: -8,
    alignSelf: 'center', zIndex: 2,
    backgroundColor: colors.card,
  },
  paperclipInner: {
    width: 6, height: 16,
    borderWidth: 2, borderColor: tint(colors.gold, 0.6),
    borderRadius: 3, margin: 2,
    backgroundColor: 'transparent',
  },

  thumbImage: {
    width: 72, height: 72,
    borderRadius: radii.sm,
    borderWidth: 1, borderColor: colors.edge,
  },
  thumbGeneric: {
    width: 72, height: 72,
    borderRadius: radii.sm,
    backgroundColor: tint(colors.gold, 0.10),
    borderWidth: 1, borderColor: colors.edge,
    alignItems: 'center', justifyContent: 'center', gap: 4,
  },
  thumbLabel: { fontSize: 10, color: colors.gold300 },
  removeBtn: {
    position: 'absolute', top: 20, right: -6, zIndex: 3,
    backgroundColor: colors.card, borderRadius: 10,
  },
});
