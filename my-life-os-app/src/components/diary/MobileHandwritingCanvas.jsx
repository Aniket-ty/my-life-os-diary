import React, {
  useState,
  useRef,
  useImperativeHandle,
  forwardRef,
  useCallback,
} from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  PanResponder,
  ScrollView,
} from 'react-native';
import Svg, { Path, Line, Circle, Rect } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, tint } from '../../theme';

const PALETTE = [
  { name: 'Gold', color: '#c8a96e' },
  { name: 'White', color: '#ffffff' },
  { name: 'Cyan', color: '#38bdf8' },
  { name: 'Emerald', color: '#34d399' },
  { name: 'Rose', color: '#fb7185' },
  { name: 'Purple', color: '#c084fc' },
  { name: 'Yellow', color: '#facc15' },
  { name: 'Charcoal', color: '#1e293b' },
];

const STROKE_SIZES = {
  pen: [2, 4, 7],
  pencil: [1.5, 3, 5],
  highlighter: [16, 24, 34],
  eraser: [12, 22, 36],
};

export const MobileHandwritingCanvas = forwardRef(function MobileHandwritingCanvas(
  { height = 360, onStrokeChange },
  ref,
) {
  const [paths, setPaths] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  const [currentPoints, setCurrentPoints] = useState([]);
  const [tool, setTool] = useState('pen');
  const [color, setColor] = useState('#c8a96e');
  const [sizeIdx, setSizeIdx] = useState(1);
  const [paper, setPaper] = useState('lined');
  const [canvasLayout, setCanvasLayout] = useState({ width: 340, height });

  const activeWidth = STROKE_SIZES[tool][sizeIdx] || STROKE_SIZES[tool][1];

  const currentPointsRef = useRef([]);
  const toolRef = useRef(tool);
  const colorRef = useRef(color);
  const widthRef = useRef(activeWidth);
  const svgRef = useRef(null);

  toolRef.current = tool;
  colorRef.current = color;
  widthRef.current = activeWidth;

  const pointsToSvgPath = (pts) => {
    if (!pts || pts.length === 0) return '';
    if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y} L ${pts[0].x + 0.1} ${pts[0].y + 0.1}`;
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 1; i < pts.length; i++) {
      const p0 = pts[i - 1];
      const p1 = pts[i];
      const midX = (p0.x + p1.x) / 2;
      const midY = (p0.y + p1.y) / 2;
      d += ` Q ${p0.x} ${p0.y} ${midX} ${midY}`;
    }
    d += ` L ${pts[pts.length - 1].x} ${pts[pts.length - 1].y}`;
    return d;
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        const pt = { x: locationX, y: locationY };
        currentPointsRef.current = [pt];
        setCurrentPoints([pt]);
      },
      onPanResponderMove: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        const pt = { x: locationX, y: locationY };
        currentPointsRef.current = [...currentPointsRef.current, pt];
        setCurrentPoints(currentPointsRef.current);
      },
      onPanResponderRelease: () => {
        const pts = currentPointsRef.current;
        if (pts.length > 0) {
          const newPath = {
            id: Date.now().toString() + Math.random(),
            points: pts,
            d: pointsToSvgPath(pts),
            tool: toolRef.current,
            color: toolRef.current === 'eraser' ? '#12121c' : colorRef.current,
            strokeWidth: widthRef.current,
            opacity: toolRef.current === 'highlighter' ? 0.35 : toolRef.current === 'pencil' ? 0.7 : 1,
          };
          setPaths((prev) => {
            const next = [...prev, newPath];
            onStrokeChange?.(next.length > 0);
            return next;
          });
          setRedoStack([]);
        }
        currentPointsRef.current = [];
        setCurrentPoints([]);
      },
      onPanResponderTerminate: () => {
        currentPointsRef.current = [];
        setCurrentPoints([]);
      },
    }),
  ).current;

  const handleUndo = useCallback(() => {
    if (paths.length === 0) return;
    const last = paths[paths.length - 1];
    setPaths((prev) => {
      const next = prev.slice(0, -1);
      onStrokeChange?.(next.length > 0);
      return next;
    });
    setRedoStack((prev) => [...prev, last]);
  }, [paths, onStrokeChange]);

  const handleRedo = useCallback(() => {
    if (redoStack.length === 0) return;
    const last = redoStack[redoStack.length - 1];
    setRedoStack((prev) => prev.slice(0, -1));
    setPaths((prev) => {
      const next = [...prev, last];
      onStrokeChange?.(next.length > 0);
      return next;
    });
  }, [redoStack, onStrokeChange]);

  const handleClear = useCallback(() => {
    setPaths([]);
    setRedoStack([]);
    setCurrentPoints([]);
    onStrokeChange?.(false);
  }, [onStrokeChange]);

  // Rasterize the drawing to a PNG base64 so it can be transcribed to text
  const exportPng = useCallback(
    () =>
      new Promise((resolve) => {
        if (paths.length === 0) {
          resolve(null);
          return;
        }
        try {
          const node = svgRef.current;
          if (!node) {
            resolve(null);
            return;
          }
          node.toDataURL((base64) => {
            if (!base64) {
              resolve(null);
              return;
            }
            // Some platforms may prepend a data-URI prefix; strip it if present
            const clean = base64.includes(',') ? base64.split(',')[1] : base64;
            resolve({ base64: clean, mimeType: 'image/png' });
          });
        } catch {
          resolve(null);
        }
      }),
    [paths],
  );

  useImperativeHandle(ref, () => ({
    hasStrokes: paths.length > 0,
    isEmpty: () => paths.length === 0,
    clear: handleClear,
    exportPng,
  }));

  const currentPathD = pointsToSvgPath(currentPoints);
  const currentOpacity = tool === 'highlighter' ? 0.35 : tool === 'pencil' ? 0.7 : 1;
  const currentColor = tool === 'eraser' ? '#12121c' : color;

  return (
    <View style={styles.container}>
      {/* Stylus Toolbar */}
      <View style={styles.toolbar}>
        {/* Tool selector */}
        <View style={styles.toolGroup}>
          <TouchableOpacity
            style={[styles.toolBtn, tool === 'pen' && styles.toolBtnActive]}
            onPress={() => setTool('pen')}
          >
            <Ionicons name="create-outline" size={16} color={tool === 'pen' ? colors.void : colors.text} />
            <Text style={[styles.toolText, tool === 'pen' && styles.toolTextActive]}>Pen</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.toolBtn, tool === 'pencil' && styles.toolBtnActive]}
            onPress={() => setTool('pencil')}
          >
            <Ionicons name="pencil-outline" size={16} color={tool === 'pencil' ? colors.void : colors.text} />
            <Text style={[styles.toolText, tool === 'pencil' && styles.toolTextActive]}>Pencil</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.toolBtn, tool === 'highlighter' && styles.toolBtnActive]}
            onPress={() => setTool('highlighter')}
          >
            <Ionicons name="brush-outline" size={16} color={tool === 'highlighter' ? colors.void : colors.text} />
            <Text style={[styles.toolText, tool === 'highlighter' && styles.toolTextActive]}>Highlight</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.toolBtn, tool === 'eraser' && styles.toolBtnActive]}
            onPress={() => setTool('eraser')}
          >
            <Ionicons name="cut-outline" size={16} color={tool === 'eraser' ? colors.void : colors.text} />
            <Text style={[styles.toolText, tool === 'eraser' && styles.toolTextActive]}>Eraser</Text>
          </TouchableOpacity>
        </View>

        {/* History actions */}
        <View style={styles.actionGroup}>
          <TouchableOpacity
            style={[styles.actionBtn, paths.length === 0 && styles.btnDisabled]}
            onPress={handleUndo}
            disabled={paths.length === 0}
          >
            <Ionicons name="arrow-undo-outline" size={16} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, redoStack.length === 0 && styles.btnDisabled]}
            onPress={handleRedo}
            disabled={redoStack.length === 0}
          >
            <Ionicons name="arrow-redo-outline" size={16} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionBtn} onPress={handleClear}>
            <Ionicons name="trash-outline" size={16} color={colors.rose} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Secondary Controls: Sizes & Colors */}
      <View style={styles.subToolbar}>
        {/* Stroke Sizes */}
        <View style={styles.sizeGroup}>
          {STROKE_SIZES[tool].map((w, idx) => (
            <TouchableOpacity
              key={w}
              style={[styles.sizeBtn, sizeIdx === idx && styles.sizeBtnActive]}
              onPress={() => setSizeIdx(idx)}
            >
              <View
                style={[
                  styles.sizeDot,
                  { width: Math.max(3, Math.min(14, w * 0.7)), height: Math.max(3, Math.min(14, w * 0.7)) },
                ]}
              />
            </TouchableOpacity>
          ))}
        </View>

        {/* Paper style selector */}
        <View style={styles.paperGroup}>
          <TouchableOpacity
            style={[styles.paperBtn, paper === 'lined' && styles.paperBtnActive]}
            onPress={() => setPaper('lined')}
          >
            <Ionicons name="menu-outline" size={14} color={paper === 'lined' ? colors.gold : colors.textMuted} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.paperBtn, paper === 'blank' && styles.paperBtnActive]}
            onPress={() => setPaper('blank')}
          >
            <Ionicons name="square-outline" size={14} color={paper === 'blank' ? colors.gold : colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Color Palette (hidden for eraser) */}
        {tool !== 'eraser' && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.colorScroll}>
            {PALETTE.map((p) => (
              <TouchableOpacity
                key={p.color}
                style={[
                  styles.colorDot,
                  { backgroundColor: p.color },
                  color === p.color && styles.colorDotActive,
                ]}
                onPress={() => setColor(p.color)}
              />
            ))}
          </ScrollView>
        )}
      </View>

      {/* Drawing Canvas Area */}
      <View
        style={[styles.canvasWrap, { height }]}
        onLayout={(e) => {
          const { width: w, height: h } = e.nativeEvent.layout;
          setCanvasLayout({ width: w, height: h });
        }}
        {...panResponder.panHandlers}
      >
        <Svg ref={svgRef} width={canvasLayout.width} height={canvasLayout.height} style={StyleSheet.absoluteFill}>
          {/* Background */}
          <Rect width={canvasLayout.width} height={canvasLayout.height} fill="#12121c" />

          {/* Paper template lines */}
          {paper === 'lined' && (
            <>
              <Line
                x1={36}
                y1={0}
                x2={36}
                y2={canvasLayout.height}
                stroke="rgba(244,63,94,0.3)"
                strokeWidth={1.5}
              />
              {Array.from({ length: Math.floor(canvasLayout.height / 30) }).map((_, i) => (
                <Line
                  key={i}
                  x1={0}
                  y1={(i + 1) * 30}
                  x2={canvasLayout.width}
                  y2={(i + 1) * 30}
                  stroke="rgba(255,255,255,0.07)"
                  strokeWidth={1}
                />
              ))}
            </>
          )}

          {/* Committed strokes */}
          {paths.map((p) => (
            <Path
              key={p.id}
              d={p.d}
              stroke={p.color}
              strokeWidth={p.strokeWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              opacity={p.opacity || 1}
            />
          ))}

          {/* Real-time active drawing stroke */}
          {currentPoints.length > 0 && currentPathD ? (
            <Path
              d={currentPathD}
              stroke={currentColor}
              strokeWidth={activeWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              opacity={currentOpacity}
            />
          ) : null}
        </Svg>

        <View style={styles.watermark}>
          <Text style={styles.watermarkText}>✍️ Stylus & Touch Pen</Text>
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    borderRadius: radii.lg,
    overflow: 'hidden',
    backgroundColor: '#0c0c14',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    marginTop: 10,
  },
  toolbar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 8,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
  },
  toolGroup: {
    flexDirection: 'row',
    gap: 4,
  },
  toolBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: radii.sm,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  toolBtnActive: {
    backgroundColor: colors.gold,
  },
  toolText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textMuted,
  },
  toolTextActive: {
    color: colors.void,
    fontWeight: '700',
  },
  actionGroup: {
    flexDirection: 'row',
    gap: 4,
  },
  actionBtn: {
    padding: 6,
    borderRadius: radii.sm,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  btnDisabled: {
    opacity: 0.3,
  },
  subToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: 'rgba(255,255,255,0.02)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.04)',
    gap: 8,
  },
  sizeGroup: {
    flexDirection: 'row',
    gap: 4,
    paddingRight: 6,
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.08)',
  },
  sizeBtn: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  sizeBtnActive: {
    borderWidth: 1.5,
    borderColor: colors.gold,
    backgroundColor: tint(colors.gold, 0.2),
  },
  sizeDot: {
    borderRadius: 10,
    backgroundColor: colors.text,
  },
  paperGroup: {
    flexDirection: 'row',
    gap: 2,
    paddingRight: 6,
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.08)',
  },
  paperBtn: {
    padding: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  paperBtnActive: {
    backgroundColor: tint(colors.gold, 0.2),
    borderWidth: 1,
    borderColor: colors.gold,
  },
  colorScroll: {
    flex: 1,
  },
  colorDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: 8,
  },
  colorDotActive: {
    borderWidth: 2,
    borderColor: colors.white,
    transform: [{ scale: 1.2 }],
  },
  canvasWrap: {
    position: 'relative',
    overflow: 'hidden',
  },
  watermark: {
    position: 'absolute',
    bottom: 8,
    right: 12,
    pointerEvents: 'none',
  },
  watermarkText: {
    fontSize: 10,
    color: 'rgba(255,255,255,0.2)',
    fontWeight: '600',
  },
});
