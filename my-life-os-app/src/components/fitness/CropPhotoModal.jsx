import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Modal, View, Text, Image, StyleSheet, PanResponder, ActivityIndicator,
} from 'react-native';
import { manipulateAsync } from 'expo-image-manipulator';
import Button from '../ui/Button';
import { colors, radii, spacing } from '../../theme';

const HANDLE = 26;
const MIN_SIZE = 60;

function clamp(v, min, max) {
  return Math.min(Math.max(v, min), max);
}

export default function CropPhotoModal({ visible, imageUri, onCancel, onCropped }) {
  const [layout, setLayout] = useState({ width: 0, height: 0 });
  const [img, setImg] = useState(null);
  const [crop, setCrop] = useState(null);
  const [processing, setProcessing] = useState(false);
  const cropRef = useRef({ x: 0, y: 0, w: 0, h: 0 });
  const gesture = useRef(null);

  useEffect(() => {
    if (!visible || !imageUri) return;
    setImg(null);
    setCrop(null);
    setProcessing(false);
    Image.getSize(
      imageUri,
      (w, h) => setImg({ w, h }),
      () => setImg({ w: 1600, h: 1200 }),
    );
  }, [visible, imageUri]);

  const display = useMemo(() => {
    if (!layout.width || !layout.height || !img) return null;
    let w = layout.width;
    let h = (w * img.h) / img.w;
    if (h > layout.height) {
      h = layout.height;
      w = (h * img.w) / img.h;
    }
    return { offsetX: (layout.width - w) / 2, offsetY: (layout.height - h) / 2, w, h };
  }, [layout, img]);

  useEffect(() => {
    if (!display) return;
    const side = Math.min(display.w, display.h) * 0.9;
    const box = {
      x: display.offsetX + (display.w - side) / 2,
      y: display.offsetY + (display.h - side) / 2,
      w: side,
      h: side,
    };
    cropRef.current = box;
    setCrop(box);
  }, [display]);

  const hit = (p, r) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;

  const nearCorner = (p, c) => Math.hypot(p.x - c.x, p.y - c.y) <= HANDLE;

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (evt) => {
          if (!display) {
            gesture.current = null;
            return;
          }
          const { locationX, locationY } = evt.nativeEvent;
          const p = { x: locationX, y: locationY };
          const c = cropRef.current;
          const corners = {
            tl: { x: c.x, y: c.y },
            tr: { x: c.x + c.w, y: c.y },
            bl: { x: c.x, y: c.y + c.h },
            br: { x: c.x + c.w, y: c.y + c.h },
          };
          for (const key of ['tl', 'tr', 'bl', 'br']) {
            if (nearCorner(p, corners[key])) {
              gesture.current = { mode: key, sx: locationX, sy: locationY, ox: c.x, oy: c.y, ow: c.w, oh: c.h };
              return;
            }
          }
          if (hit(p, c)) {
            gesture.current = { mode: 'move', sx: locationX, sy: locationY, ox: c.x, oy: c.y };
            return;
          }
          gesture.current = null;
        },
        onPanResponderMove: (evt) => {
          const g = gesture.current;
          if (!g || !display) return;
          const { locationX, locationY } = evt.nativeEvent;
          const dx = locationX - g.sx;
          const dy = locationY - g.sy;
          const L = display.offsetX;
          const T = display.offsetY;
          const R = display.offsetX + display.w;
          const B = display.offsetY + display.h;
          let box = { ...cropRef.current };
          if (g.mode === 'move') {
            box.x = clamp(g.ox + dx, L, R - box.w);
            box.y = clamp(g.oy + dy, T, B - box.h);
          } else if (g.mode === 'tl') {
            const nx = clamp(g.ox + dx, L, g.ox + g.ow - MIN_SIZE);
            const ny = clamp(g.oy + dy, T, g.oy + g.oh - MIN_SIZE);
            box = { x: nx, y: ny, w: g.ox + g.ow - nx, h: g.oy + g.oh - ny };
          } else if (g.mode === 'tr') {
            const nx = clamp(g.ox + g.ow + dx, g.ox + MIN_SIZE, R);
            const ny = clamp(g.oy + dy, T, g.oy + g.oh - MIN_SIZE);
            box = { x: g.ox, y: ny, w: nx - g.ox, h: g.oy + g.oh - ny };
          } else if (g.mode === 'bl') {
            const nx = clamp(g.ox + dx, L, g.ox + g.ow - MIN_SIZE);
            const ny = clamp(g.oy + g.oh + dy, g.oy + MIN_SIZE, B);
            box = { x: nx, y: g.oy, w: g.ox + g.ow - nx, h: ny - g.oy };
          } else if (g.mode === 'br') {
            const nx = clamp(g.ox + g.ow + dx, g.ox + MIN_SIZE, R);
            const ny = clamp(g.oy + g.oh + dy, g.oy + MIN_SIZE, B);
            box = { x: g.ox, y: g.oy, w: nx - g.ox, h: ny - g.oy };
          }
          cropRef.current = box;
          setCrop({ ...box });
        },
        onPanResponderRelease: () => {
          gesture.current = null;
        },
        onPanResponderTerminate: () => {
          gesture.current = null;
        },
      }),
    [display],
  );

  const applyCrop = async () => {
    if (!display || !crop || !img) return;
    setProcessing(true);
    try {
      const scale = img.w / display.w;
      const r = cropRef.current;
      const result = await manipulateAsync(
        imageUri,
        [
          {
            crop: {
              originX: Math.max(0, Math.round((r.x - display.offsetX) * scale)),
              originY: Math.max(0, Math.round((r.y - display.offsetY) * scale)),
              width: Math.max(1, Math.round(r.w * scale)),
              height: Math.max(1, Math.round(r.h * scale)),
            },
          },
        ],
        { compress: 0.85, format: 'jpeg' },
      );
      onCropped(result);
    } catch {
      onCropped(null);
    } finally {
      setProcessing(false);
    }
  };

  const corners = crop
    ? [
        { key: 'tl', cx: crop.x, cy: crop.y },
        { key: 'tr', cx: crop.x + crop.w, cy: crop.y },
        { key: 'bl', cx: crop.x, cy: crop.y + crop.h },
        { key: 'br', cx: crop.x + crop.w, cy: crop.y + crop.h },
      ]
    : [];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <Text style={styles.title}>Crop your food photo</Text>
        <Text style={styles.subtitle}>Drag the box or resize its corners, then tap Done.</Text>

        <View style={styles.canvas} onLayout={(e) => setLayout(e.nativeEvent.layout)} {...panResponder.panHandlers}>
          {img && display ? (
            <>
              <Image
                source={{ uri: imageUri }}
                style={{
                  position: 'absolute',
                  left: display.offsetX,
                  top: display.offsetY,
                  width: display.w,
                  height: display.h,
                }}
                resizeMode="stretch"
              />
              {crop && (
                <>
                  <View style={[styles.dim, { top: 0, left: 0, right: 0, height: crop.y }]} />
                  <View style={[styles.dim, { top: crop.y + crop.h, left: 0, right: 0, bottom: 0 }]} />
                  <View style={[styles.dim, { top: crop.y, height: crop.h, left: 0, width: crop.x }]} />
                  <View style={[styles.dim, { top: crop.y, height: crop.h, right: 0, left: crop.x + crop.w }]} />
                  <View style={[styles.cropBox, { left: crop.x, top: crop.y, width: crop.w, height: crop.h }]}>
                    {corners.map((cn) => (
                      <View
                        key={cn.key}
                        style={[
                          styles.handle,
                          cn.key === 'tl' && styles.hTl,
                          cn.key === 'tr' && styles.hTr,
                          cn.key === 'bl' && styles.hBl,
                          cn.key === 'br' && styles.hBr,
                        ]}
                      />
                    ))}
                  </View>
                </>
              )}
            </>
          ) : (
            <ActivityIndicator color={colors.gold} style={styles.spinner} />
          )}
        </View>

        <View style={styles.actions}>
          <Button variant="ghost" size="lg" onPress={processing ? undefined : onCancel} style={styles.cancelBtn}>
            Cancel
          </Button>
          <Button variant="primary" size="lg" loading={processing} onPress={applyCrop} style={styles.doneBtn}>
            Done — Analyze
          </Button>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    padding: spacing.xl,
    paddingTop: 64,
  },
  title: { fontSize: 18, fontWeight: '800', color: colors.white, textAlign: 'center' },
  subtitle: { fontSize: 12, color: colors.textMuted, textAlign: 'center', marginTop: 4, marginBottom: spacing.lg },
  canvas: {
    flex: 1,
    backgroundColor: '#000',
    borderRadius: radii.lg,
    overflow: 'hidden',
    position: 'relative',
  },
  spinner: { flex: 1 },
  dim: { position: 'absolute', backgroundColor: 'rgba(0,0,0,0.55)' },
  cropBox: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: colors.white,
    borderRadius: 4,
  },
  handle: {
    position: 'absolute',
    width: 26,
    height: 26,
    borderWidth: 3,
    borderColor: colors.white,
    backgroundColor: colors.gold,
    borderRadius: radii.pill,
  },
  hTl: { top: -14, left: -14 },
  hTr: { top: -14, right: -14 },
  hBl: { bottom: -14, left: -14 },
  hBr: { bottom: -14, right: -14 },
  actions: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg },
  cancelBtn: { flex: 1 },
  doneBtn: { flex: 1 },
});