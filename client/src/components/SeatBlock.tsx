/**
 * SeatBlock Component - Konva Group for seat block rendering
 * Blueprint Technical Design System
 * 
 * リサイズロジック: Konva標準方式
 * - onTransformEndでscaleX, scaleYをそのまま保存
 * - width/heightは変更しない
 * 
 * 無効化席: listening={false} でクリック透過
 * ブロック背景: listening={isSelected} で未選択時はクリック貫通
 */

import { Group, Circle, Rect, Transformer, Line } from 'react-konva';
import { useRef, useEffect, useCallback, useState } from 'react';
import type { SeatBlock as SeatBlockType, EditorMode, LotteryAssignment } from '@/types/venue';
import type Konva from 'konva';

interface SeatBlockProps {
  block: SeatBlockType;
  isSelected: boolean;
  mode: EditorMode;
  isLocking?: boolean;  // 関係者ロック配置中かどうか
  lockedSeatIds?: Set<string>;  // ロック済み座席IDセット
  onSelect: () => void;
  onDragStart?: () => void;
  onDragEnd: (x: number, y: number) => void;
  onRotate: (rotation: number) => void;
  onScale: (scaleX: number, scaleY: number) => void;
  onSeatClick: (seatId: string) => void;
  seatAssignmentMap?: Map<string, LotteryAssignment>;
  onSeatHover?: (seatId: string | null, assignment: LotteryAssignment | null, x: number, y: number) => void;
}

// Blueprint Technical color palette
const COLORS = {
  seatNormal: '#4a5568',
  seatPremium: '#d69e2e',
  seatDisabled: '#4a5568',
  seatHover: '#718096',
  seatStroke: '#2d3748',
  premiumStroke: '#b7791f',
  disabledStroke: '#1a202c',
  blockBorder: '#00d4ff',
  blockBorderInactive: '#4a5568',
  xMark: '#e53e3e',
};

export function SeatBlock({
  block,
  isSelected,
  mode,
  isLocking,
  lockedSeatIds,
  onSelect,
  onDragStart,
  onDragEnd,
  onRotate,
  onScale,
  onSeatClick,
  seatAssignmentMap,
  onSeatHover,
}: SeatBlockProps) {
  const groupRef = useRef<Konva.Group>(null);
  const transformerRef = useRef<Konva.Transformer>(null);
  const [hoveredSeatId, setHoveredSeatId] = useState<string | null>(null);

  // Attach transformer when selected
  useEffect(() => {
    if (isSelected && transformerRef.current && groupRef.current) {
      transformerRef.current.nodes([groupRef.current]);
      transformerRef.current.getLayer()?.batchDraw();
    }
  }, [isSelected]);

  const spacing = block.seatSize + block.seatGap;
  const skewX = block.skewX ?? 0;
  const staggerX = block.staggerX ?? 0;
  const totalSkew = (block.rows - 1) * skewX;
  const hasNonLinear = staggerX !== 0;

  // Bounding box from actual seat positions
  let minSeatX = 0, maxSeatX = 0, minSeatY = 0, maxSeatY = 0;
  if (block.seats.length > 0) {
    minSeatX = Infinity; maxSeatX = -Infinity; minSeatY = Infinity; maxSeatY = -Infinity;
    for (const s of block.seats) {
      minSeatX = Math.min(minSeatX, s.localX);
      maxSeatX = Math.max(maxSeatX, s.localX + block.seatSize);
      minSeatY = Math.min(minSeatY, s.localY);
      maxSeatY = Math.max(maxSeatY, s.localY + block.seatSize);
    }
  }
  const blockWidth = hasNonLinear ? (maxSeatX - minSeatX) : block.cols * spacing - block.seatGap;
  const blockHeight = hasNonLinear ? (maxSeatY - minSeatY) : block.rows * spacing - block.seatGap;

  const handleDragEnd = useCallback((e: Konva.KonvaEventObject<DragEvent>) => {
    onDragEnd(e.target.x(), e.target.y());
  }, [onDragEnd]);

  // シンプルなTransformEnd: スケールをそのまま保存
  const handleTransformEnd = useCallback(() => {
    const node = groupRef.current;
    if (!node) return;
    
    // スケールと回転をそのまま保存（width/heightは変更しない）
    onScale(node.scaleX(), node.scaleY());
    onRotate(node.rotation());
    onDragEnd(node.x(), node.y());
  }, [onScale, onRotate, onDragEnd]);

  const getCursor = useCallback(() => {
    if (mode === 'disable') return 'crosshair';
    if (mode === 'premium') return 'pointer';
    if (mode === 'lottery') return isLocking ? 'pointer' : 'default';
    return 'move';
  }, [mode, isLocking]);

  // ブロッククリック: 常にonSelectを呼ぶ
  const handleGroupClick = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    e.cancelBubble = true;
    onSelect();
  }, [onSelect]);

  return (
    <>
      <Group
        ref={groupRef}
        x={block.x}
        y={block.y}
        rotation={block.rotation}
        scaleX={block.scaleX}
        scaleY={block.scaleY}
        draggable={mode === 'normal'}
        onClick={handleGroupClick}
        onTap={(e) => {
          e.cancelBubble = true;
          onSelect();
        }}
        onDragStart={() => onDragStart?.()}
        onDragEnd={handleDragEnd}
      >
        {/* Block background/border */}
        {skewX === 0 && !hasNonLinear ? (
          <Rect
            x={minSeatX - 8}
            y={minSeatY - 8}
            width={blockWidth + 16}
            height={blockHeight + 16}
            fill="transparent"
            stroke={isSelected ? COLORS.blockBorder : COLORS.blockBorderInactive}
            strokeWidth={isSelected ? 2 : 1}
            dash={isSelected ? undefined : [5, 5]}
            cornerRadius={4}
            shadowColor={isSelected ? COLORS.blockBorder : 'transparent'}
            shadowBlur={isSelected ? 15 : 0}
            shadowOpacity={0.5}
            listening={isSelected}
            hitStrokeWidth={isSelected ? 20 : 0}
          />
        ) : hasNonLinear ? (
          /* 非線形配置（千鳥・扇形）: バウンディングボックスで表示 */
          <Rect
            x={minSeatX - 8}
            y={minSeatY - 8}
            width={blockWidth + 16}
            height={blockHeight + 16}
            fill="transparent"
            stroke={isSelected ? COLORS.blockBorder : COLORS.blockBorderInactive}
            strokeWidth={isSelected ? 2 : 1}
            dash={isSelected ? undefined : [5, 5]}
            cornerRadius={4}
            shadowColor={isSelected ? COLORS.blockBorder : 'transparent'}
            shadowBlur={isSelected ? 15 : 0}
            shadowOpacity={0.5}
            listening={isSelected}
            hitStrokeWidth={isSelected ? 20 : 0}
          />
        ) : (
          <Line
            points={(() => {
              const pad = 8;
              return [
                -pad, -pad,
                blockWidth + pad, -pad,
                blockWidth + pad + totalSkew, blockHeight + pad,
                totalSkew - pad, blockHeight + pad,
              ];
            })()}
            closed
            fill="transparent"
            stroke={isSelected ? COLORS.blockBorder : COLORS.blockBorderInactive}
            strokeWidth={isSelected ? 2 : 1}
            dash={isSelected ? undefined : [5, 5]}
            shadowColor={isSelected ? COLORS.blockBorder : 'transparent'}
            shadowBlur={isSelected ? 15 : 0}
            shadowOpacity={0.5}
            listening={isSelected}
            hitStrokeWidth={isSelected ? 20 : 0}
          />
        )}

        {/* Render seats */}
        {block.seats.map((seat) => {
          const isDisabled = seat.isDisabled;
          const isHovered = hoveredSeatId === seat.id;
          const assignment = seatAssignmentMap?.get(seat.id);
          const isLockedSeat = lockedSeatIds?.has(seat.id) ?? false;

          let baseFillColor = seat.isPremium ? COLORS.seatPremium : COLORS.seatNormal;
          let strokeColor = seat.isPremium ? COLORS.premiumStroke : COLORS.seatStroke;

          // ロック済み座席は紫色で表示
          if (isLockedSeat) {
            baseFillColor = '#a855f7';
            strokeColor = '#7c3aed';
          } else if (assignment) {
            // 抽選結果がある場合はその色を使用
            baseFillColor = assignment.color;
            strokeColor = '#ffffff';
          } else if (isDisabled) {
            baseFillColor = COLORS.seatDisabled;
            strokeColor = COLORS.disabledStroke;
          }

          const fillColor = isHovered && mode !== 'normal' && !isLockedSeat ? COLORS.seatHover : baseFillColor;
          const opacity = isDisabled ? 0.2 : 1;
          
          const centerX = seat.localX + block.seatSize / 2;
          const centerY = seat.localY + block.seatSize / 2;
          const xMarkSize = block.seatSize * 0.35;

          // 無効化席はlistening={false}でクリック透過
          // ただし、無効化モードの時は無効化された席もクリックイベントを受け取る（解除のため）
          const shouldListen = !isDisabled || mode === 'disable';

          return (
            <Group key={seat.id} listening={shouldListen}>
              <Circle
                x={centerX}
                y={centerY}
                radius={block.seatSize / 2}
                fill={fillColor}
                stroke={strokeColor}
                strokeWidth={1.5}
                opacity={opacity}
                shadowColor={isLockedSeat ? '#a855f7' : seat.isPremium && !isDisabled ? COLORS.seatPremium : 'transparent'}
                shadowBlur={isLockedSeat ? 10 : seat.isPremium && !isDisabled ? 8 : 0}
                shadowOpacity={isLockedSeat ? 0.8 : 0.6}
                hitStrokeWidth={10}
                listening={shouldListen}
                perfectDrawEnabled={false}
                onClick={(e) => {
                  // Normalモードなら何もしない（親のGroupにイベントを渡す＝ブロック選択させる）
                  if (mode === 'normal') return;

                  // それ以外のモード（premium, disable, lottery）は座席クリック処理
                  e.cancelBubble = true;
                  onSeatClick(seat.id);
                }}
                onTap={(e) => {
                  if (mode === 'normal') return;
                  e.cancelBubble = true;
                  onSeatClick(seat.id);
                }}
                onMouseEnter={(e) => {
                  const stage = e.target.getStage();
                  if (stage) {
                    stage.container().style.cursor = getCursor();
                  }
                  
                  if (mode !== 'normal') {
                    setHoveredSeatId(seat.id);
                  }
                  
                  // 抽選モードでassignmentがある場合、ツールチップ表示のためにコールバック
                  if (mode === 'lottery' && assignment && onSeatHover) {
                    const pointerPos = stage?.getPointerPosition();
                    if (pointerPos) {
                      onSeatHover(seat.id, assignment, pointerPos.x, pointerPos.y);
                    }
                  }
                }}
                onMouseMove={(e) => {
                  // 抽選モードでホバー中にマウスが動いた場合、座標を更新
                  if (mode === 'lottery' && assignment && onSeatHover && hoveredSeatId === seat.id) {
                    const stage = e.target.getStage();
                    const pointerPos = stage?.getPointerPosition();
                    if (pointerPos) {
                      onSeatHover(seat.id, assignment, pointerPos.x, pointerPos.y);
                    }
                  }
                }}
                onMouseLeave={(e) => {
                  const stage = e.target.getStage();
                  if (stage) {
                    stage.container().style.cursor = 'default';
                  }
                  setHoveredSeatId(null);
                  
                  // ツールチップを非表示
                  if (mode === 'lottery' && onSeatHover) {
                    onSeatHover(null, null, 0, 0);
                  }
                }}
              />
              
              {/* X mark for disabled seats - listening={false}でクリック透過 */}
              {isDisabled && (
                <>
                  <Line
                    points={[
                      centerX - xMarkSize,
                      centerY - xMarkSize,
                      centerX + xMarkSize,
                      centerY + xMarkSize,
                    ]}
                    stroke={COLORS.xMark}
                    strokeWidth={2}
                    opacity={0.7}
                    listening={false}
                  />
                  <Line
                    points={[
                      centerX + xMarkSize,
                      centerY - xMarkSize,
                      centerX - xMarkSize,
                      centerY + xMarkSize,
                    ]}
                    stroke={COLORS.xMark}
                    strokeWidth={2}
                    opacity={0.7}
                    listening={false}
                  />
                </>
              )}
            </Group>
          );
        })}
      </Group>

      {/* Transformer for rotation and resize */}
      {isSelected && mode === 'normal' && (
        <Transformer
          ref={transformerRef}
          rotateEnabled={true}
          resizeEnabled={true}
          keepRatio={false}
          enabledAnchors={['top-left', 'top-center', 'top-right', 'middle-left', 'middle-right', 'bottom-left', 'bottom-center', 'bottom-right']}
          borderStroke={COLORS.blockBorder}
          borderStrokeWidth={2}
          anchorStroke={COLORS.blockBorder}
          anchorFill="#1a1f36"
          anchorSize={10}
          anchorCornerRadius={2}
          onTransformStart={() => onDragStart?.()}
          onTransformEnd={handleTransformEnd}
        />
      )}
    </>
  );
}
