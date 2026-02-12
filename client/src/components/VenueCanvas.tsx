/**
 * VenueCanvas Component - Main Konva canvas for venue editing
 * Blueprint Technical Design System
 * 
 * React標準化: 
 * - 空の状態はJSX条件付きレンダリングで表示
 * - 手動DOM操作は行わない
 * 
 * ツールチップ座標: pointerPosをそのまま使用（containerRectは加算しない）
 */

import { Stage, Layer, Line, Image as KonvaImage } from 'react-konva';
import { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import type Konva from 'konva';
import type { SeatBlock as SeatBlockType, EditorMode, BackgroundImage, StagePosition, LotteryAssignment } from '@/types/venue';
import { SeatBlock } from './SeatBlock';
import StageMarker from './StageMarker';
import { SeatTooltip } from './SeatTooltip';

interface VenueCanvasProps {
  blocks: SeatBlockType[];
  selectedBlockId: string | null;
  mode: EditorMode;
  backgroundImage: BackgroundImage | null;
  scale: number;
  onSelectBlock: (blockId: string | null) => void;
  onUpdateBlockPosition: (blockId: string, x: number, y: number) => void;
  onUpdateBlockRotation: (blockId: string, rotation: number) => void;
  onUpdateBlockScale: (blockId: string, scaleX: number, scaleY: number) => void;
  onSeatClick: (blockId: string, seatId: string) => void;
  onScaleChange: (scale: number) => void;
  onSaveSnapshot?: () => void;
  // Lottery props
  stagePosition?: StagePosition;
  onStagePositionChange?: (position: StagePosition) => void;
  seatAssignmentMap?: Map<string, LotteryAssignment>;
  isLocking?: boolean;
  lockedSeatIds?: Set<string>;
}

// Grid settings
const GRID_COLOR_DARK = 'rgba(0, 212, 255, 0.1)';
const GRID_COLOR_LIGHT = 'rgba(0, 140, 130, 0.12)';
const GRID_SIZE = 50;

// ツールチップの状態
interface TooltipState {
  visible: boolean;
  assignment: LotteryAssignment | null;
  x: number;
  y: number;
}

export function VenueCanvas({
  blocks,
  selectedBlockId,
  mode,
  backgroundImage,
  scale,
  onSelectBlock,
  onUpdateBlockPosition,
  onUpdateBlockRotation,
  onUpdateBlockScale,
  onSeatClick,
  onScaleChange,
  onSaveSnapshot,
  stagePosition,
  onStagePositionChange,
  seatAssignmentMap,
  isLocking,
  lockedSeatIds,
}: VenueCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<Konva.Stage>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 600 });
  const [stagePos, setStagePos] = useState({ x: 0, y: 0 });
  const [bgImage, setBgImage] = useState<HTMLImageElement | null>(null);
  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains('dark'));
  const isPanning = useRef(false);
  const panStart = useRef({ x: 0, y: 0 });
  const stagePosStart = useRef({ x: 0, y: 0 });

  // ツールチップの状態
  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false,
    assignment: null,
    x: 0,
    y: 0,
  });

  // Observe dark mode class changes
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.classList.contains('dark'));
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  // Update dimensions on resize
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight,
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Load background image
  useEffect(() => {
    if (backgroundImage?.src) {
      const img = new window.Image();
      img.src = backgroundImage.src;
      img.onload = () => setBgImage(img);
    } else {
      setBgImage(null);
    }
  }, [backgroundImage?.src]);

  // Wheel zoom handler
  const handleWheel = useCallback((e: Konva.KonvaEventObject<WheelEvent>) => {
    e.evt.preventDefault();
    
    const stage = stageRef.current;
    if (!stage) return;

    const oldScale = scale;
    const pointer = stage.getPointerPosition();
    if (!pointer) return;

    const mousePointTo = {
      x: (pointer.x - stagePos.x) / oldScale,
      y: (pointer.y - stagePos.y) / oldScale,
    };

    const scaleBy = 1.1;
    const newScale = e.evt.deltaY > 0 ? oldScale / scaleBy : oldScale * scaleBy;
    const clampedScale = Math.max(0.1, Math.min(5, newScale));

    const newPos = {
      x: pointer.x - mousePointTo.x * clampedScale,
      y: pointer.y - mousePointTo.y * clampedScale,
    };

    setStagePos(newPos);
    onScaleChange(clampedScale);
  }, [scale, stagePos, onScaleChange]);

  // Stage click handler (deselect) - only when clicking on stage itself
  const handleStageClick = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    const clickedOnEmpty = e.target === e.target.getStage();
    if (clickedOnEmpty) {
      onSelectBlock(null);
    }
  }, [onSelectBlock]);

  // Panning for all non-normal modes (premium, disable, lottery)
  const handleMouseDown = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    const clickedOnEmpty = e.target === e.target.getStage();
    if (!clickedOnEmpty) return;

    const stage = stageRef.current;
    if (!stage) return;
    const pos = stage.getPointerPosition();
    if (!pos) return;

    // Non-normal modes: start panning on empty background
    if (mode !== 'normal') {
      isPanning.current = true;
      panStart.current = { x: pos.x, y: pos.y };
      stagePosStart.current = { x: stagePos.x, y: stagePos.y };
    }
  }, [mode, stagePos]);

  const handleMouseMove = useCallback((e: Konva.KonvaEventObject<MouseEvent>) => {
    const stage = stageRef.current;
    if (!stage) return;
    const pos = stage.getPointerPosition();
    if (!pos) return;

    // Panning in non-normal modes
    if (isPanning.current) {
      const dx = pos.x - panStart.current.x;
      const dy = pos.y - panStart.current.y;
      setStagePos({
        x: stagePosStart.current.x + dx,
        y: stagePosStart.current.y + dy,
      });
    }
  }, []);

  const handleMouseUp = useCallback(() => {
    isPanning.current = false;
  }, []);

  // Generate grid lines (memoized, theme-aware)
  const gridWidth = 5000;
  const gridColor = isDark ? GRID_COLOR_DARK : GRID_COLOR_LIGHT;
  const gridLines: React.ReactNode[] = useMemo(() => {
    const lines: React.ReactNode[] = [];
    for (let i = -gridWidth; i <= gridWidth; i += GRID_SIZE) {
      lines.push(
        <Line
          key={`v-${i}`}
          points={[i, -gridWidth, i, gridWidth]}
          stroke={gridColor}
          strokeWidth={0.5}
        />
      );
      lines.push(
        <Line
          key={`h-${i}`}
          points={[-gridWidth, i, gridWidth, i]}
          stroke={gridColor}
          strokeWidth={0.5}
        />
      );
    }
    return lines;
  }, [gridColor]);

  // Handle seat click wrapper
  const handleSeatClickWrapper = useCallback((blockId: string, seatId: string) => {
    onSeatClick(blockId, seatId);
  }, [onSeatClick]);

  // 座席ホバー時のツールチップ表示コールバック
  // pointerPosをそのまま使用（containerRectは加算しない）
  const handleSeatHover = useCallback((
    seatId: string | null,
    assignment: LotteryAssignment | null,
    x: number,
    y: number
  ) => {
    if (seatId && assignment) {
      setTooltip({
        visible: true,
        assignment,
        x,
        y,
      });
    } else {
      setTooltip({
        visible: false,
        assignment: null,
        x: 0,
        y: 0,
      });
    }
  }, []);

  // 抽選結果があるかどうか
  const hasLotteryResults = seatAssignmentMap && seatAssignmentMap.size > 0;

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-background overflow-hidden"
      style={{ cursor: mode !== 'normal' ? 'grab' : 'default' }}
    >
      {/* Konva Stage */}
      <Stage
        ref={stageRef}
        width={dimensions.width}
        height={dimensions.height}
        scaleX={scale}
        scaleY={scale}
        x={stagePos.x}
        y={stagePos.y}
        draggable={mode === 'normal'}
        onWheel={handleWheel}
        onClick={handleStageClick}
        onTap={(e) => {
          if (e.target === e.target.getStage()) {
            onSelectBlock(null);
          }
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onDragEnd={(e) => {
          if (e.target === stageRef.current) {
            setStagePos({ x: e.target.x(), y: e.target.y() });
          }
        }}
      >
        {/* Grid layer */}
        <Layer listening={false}>
          {gridLines}
        </Layer>

        {/* Background image layer */}
        {bgImage && backgroundImage && (
          <Layer listening={false}>
            <KonvaImage
              image={bgImage}
              opacity={backgroundImage.opacity}
              x={0}
              y={0}
            />
          </Layer>
        )}

        {/* Seat blocks layer */}
        <Layer listening={true}>
          {blocks.map((block) => (
            <SeatBlock
              key={block.id}
              block={block}
              isSelected={block.id === selectedBlockId}
              mode={mode}
              isLocking={isLocking}
              lockedSeatIds={lockedSeatIds}
              onSelect={() => onSelectBlock(block.id)}
              onDragStart={onSaveSnapshot}
              onDragEnd={(x, y) => onUpdateBlockPosition(block.id, x, y)}
              onRotate={(rotation) => onUpdateBlockRotation(block.id, rotation)}
              onScale={(scaleX, scaleY) => onUpdateBlockScale(block.id, scaleX, scaleY)}
              onSeatClick={(seatId) => handleSeatClickWrapper(block.id, seatId)}
              seatAssignmentMap={seatAssignmentMap}
              onSeatHover={mode === 'lottery' && hasLotteryResults ? handleSeatHover : undefined}
            />
          ))}

          {/* Stage marker for lottery mode */}
          {mode === 'lottery' && stagePosition && onStagePositionChange && (
            <StageMarker
              position={stagePosition}
              onDragEnd={onStagePositionChange}
            />
          )}

        </Layer>
      </Stage>


      {/* Scale indicator */}
      <div className="absolute bottom-4 right-4 bg-card/80 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-border text-xs font-mono text-muted-foreground">
        {Math.round(scale * 100)}%
      </div>

      {/* Seat Tooltip - 抽選モードかつ結果がある場合のみ表示 */}
      {mode === 'lottery' && tooltip.visible && tooltip.assignment && (
        <SeatTooltip
          assignment={tooltip.assignment}
          x={tooltip.x}
          y={tooltip.y}
        />
      )}
    </div>
  );
}
