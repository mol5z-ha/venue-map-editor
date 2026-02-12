/**
 * StageMarker - ドラッグ可能なステージ位置マーカー
 * Blueprint Technical Design
 */

import { useRef, useEffect } from 'react';
import { Group, Rect, Text, Line } from 'react-konva';
import type Konva from 'konva';
import type { StagePosition } from '@/types/venue';

interface StageMarkerProps {
  position: StagePosition;
  onDragEnd: (position: StagePosition) => void;
}

export default function StageMarker({ position, onDragEnd }: StageMarkerProps) {
  const groupRef = useRef<Konva.Group>(null);

  const markerWidth = 120;
  const markerHeight = 40;

  const handleDragEnd = (e: Konva.KonvaEventObject<DragEvent>) => {
    const node = e.target;
    onDragEnd({
      x: node.x() + markerWidth / 2,
      y: node.y() + markerHeight / 2,
    });
  };

  return (
    <Group
      ref={groupRef}
      x={position.x - markerWidth / 2}
      y={position.y - markerHeight / 2}
      draggable
      onDragEnd={handleDragEnd}
    >
      {/* 背景 */}
      <Rect
        width={markerWidth}
        height={markerHeight}
        fill="#1a1a2e"
        stroke="#00d4aa"
        strokeWidth={2}
        cornerRadius={8}
        shadowColor="#00d4aa"
        shadowBlur={15}
        shadowOpacity={0.5}
      />

      {/* STAGEテキスト */}
      <Text
        text="STAGE"
        x={0}
        y={0}
        width={markerWidth}
        height={markerHeight}
        align="center"
        verticalAlign="middle"
        fontSize={16}
        fontFamily="JetBrains Mono, monospace"
        fontStyle="bold"
        fill="#00d4aa"
        listening={false}
      />

      {/* 方向指示線（下向き矢印） */}
      <Line
        points={[
          markerWidth / 2, markerHeight + 5,
          markerWidth / 2 - 10, markerHeight + 20,
          markerWidth / 2, markerHeight + 15,
          markerWidth / 2 + 10, markerHeight + 20,
          markerWidth / 2, markerHeight + 5,
        ]}
        fill="#00d4aa"
        closed
        opacity={0.7}
        listening={false}
      />

      {/* ドラッグヒント */}
      <Text
        text="ドラッグで移動"
        x={0}
        y={-18}
        width={markerWidth}
        align="center"
        fontSize={10}
        fontFamily="sans-serif"
        fill="#00d4aa"
        opacity={0.6}
        listening={false}
      />
    </Group>
  );
}
