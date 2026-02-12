/**
 * Venue Editor Custom Hook
 * Blueprint Technical Design System
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import type { SeatBlock, EditorMode, BackgroundImage, BlockGeneratorForm } from '@/types/venue';
import { createSeatBlock, exportVenueData, downloadJson, getSeatStats, calcSeatPosition } from '@/lib/venueUtils';

const MAX_UNDO_HISTORY = 50;

interface UseVenueEditorReturn {
  // State
  blocks: SeatBlock[];
  selectedBlockId: string | null;
  mode: EditorMode;
  backgroundImage: BackgroundImage | null;
  scale: number;
  
  // Actions
  setMode: (mode: EditorMode) => void;
  addBlock: (form: BlockGeneratorForm) => void;
  deleteBlock: (blockId: string) => void;
  updateBlockPosition: (blockId: string, x: number, y: number) => void;
  updateBlockRotation: (blockId: string, rotation: number) => void;
  updateBlockScale: (blockId: string, scaleX: number, scaleY: number) => void;
  updateBlockName: (blockId: string, name: string) => void;
  updateBlockSkewX: (blockId: string, skewX: number) => void;
  updateBlockStaggerX: (blockId: string, staggerX: number) => void;
  updateBlockCurveRadius: (blockId: string, curveRadius: number) => void;
  selectBlock: (blockId: string | null) => void;
  
  // Seat actions
  handleSeatClick: (blockId: string, seatId: string) => void;

  // Background
  setBackgroundImage: (image: BackgroundImage | null) => void;
  updateBackgroundOpacity: (opacity: number) => void;
  
  // Scale
  setScale: (scale: number) => void;
  
  // Export/Import
  exportData: (name?: string) => void;
  importData: (blocks: SeatBlock[]) => void;
  clearAll: () => void;

  // Undo
  undo: () => void;
  canUndo: boolean;
  saveSnapshot: () => void;

  // Stats
  stats: ReturnType<typeof getSeatStats>;
}

export function useVenueEditor(): UseVenueEditorReturn {
  const [blocks, setBlocks] = useState<SeatBlock[]>([]);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [mode, setModeState] = useState<EditorMode>('normal');
  const [backgroundImage, setBackgroundImage] = useState<BackgroundImage | null>(null);
  const [scale, setScale] = useState(1);

  const modeRef = useRef<EditorMode>('normal');

  // Undo history
  const undoHistoryRef = useRef<SeatBlock[][]>([]);
  const blocksRef = useRef<SeatBlock[]>(blocks);
  blocksRef.current = blocks;

  const pushHistory = useCallback(() => {
    undoHistoryRef.current = [
      ...undoHistoryRef.current.slice(-(MAX_UNDO_HISTORY - 1)),
      blocksRef.current.map(b => ({ ...b, seats: b.seats.map(s => ({ ...s })) })),
    ];
  }, []);

  const [canUndo, setCanUndo] = useState(false);
  const updateCanUndo = useCallback(() => {
    setCanUndo(undoHistoryRef.current.length > 0);
  }, []);

  const undo = useCallback(() => {
    const history = undoHistoryRef.current;
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    undoHistoryRef.current = history.slice(0, -1);
    setBlocks(previous);
    updateCanUndo();
  }, [updateCanUndo]);

  // Set mode with debug logging
  const setMode = useCallback((newMode: EditorMode) => {
    console.log('setMode called:', newMode, 'current:', modeRef.current);
    modeRef.current = newMode;
    setModeState(newMode);
  }, []);

  // Add a new block
  const addBlock = useCallback((form: BlockGeneratorForm) => {
    pushHistory();
    const newBlock = createSeatBlock(form, 200, 200);
    setBlocks(prev => [...prev, newBlock]);
    setSelectedBlockId(newBlock.id);
    updateCanUndo();
  }, [pushHistory, updateCanUndo]);

  // Delete a block
  const deleteBlock = useCallback((blockId: string) => {
    pushHistory();
    setBlocks(prev => prev.filter(b => b.id !== blockId));
    if (selectedBlockId === blockId) {
      setSelectedBlockId(null);
    }
    updateCanUndo();
  }, [selectedBlockId, pushHistory, updateCanUndo]);

  // Save a snapshot for undo (call before starting continuous operations like drag/rotate/scale)
  const saveSnapshot = useCallback(() => {
    pushHistory();
    updateCanUndo();
  }, [pushHistory, updateCanUndo]);

  // Update block position
  const updateBlockPosition = useCallback((blockId: string, x: number, y: number) => {
    setBlocks(prev => prev.map(block =>
      block.id === blockId ? { ...block, x, y } : block
    ));
  }, []);

  // Update block rotation (saveSnapshot should be called before slider/drag starts)
  const updateBlockRotation = useCallback((blockId: string, rotation: number) => {
    setBlocks(prev => prev.map(block =>
      block.id === blockId ? { ...block, rotation } : block
    ));
  }, []);

  // Update block scale - store scale values directly (Konva standard behavior)
  const updateBlockScale = useCallback((blockId: string, scaleX: number, scaleY: number) => {
    setBlocks(prev => prev.map(block =>
      block.id === blockId ? { ...block, scaleX, scaleY } : block
    ));
  }, []);

  // Update block name
  const updateBlockName = useCallback((blockId: string, name: string) => {
    pushHistory();
    setBlocks(prev => prev.map(block =>
      block.id === blockId ? { ...block, name } : block
    ));
    updateCanUndo();
  }, [pushHistory, updateCanUndo]);

  // 座席位置を再計算するヘルパー
  const recalcSeats = (block: SeatBlock, overrides: Partial<Pick<SeatBlock, 'skewX' | 'staggerX' | 'curveRadius'>>) => {
    const spacing = block.seatSize + block.seatGap;
    const skew = overrides.skewX ?? block.skewX ?? 0;
    const stagger = overrides.staggerX ?? block.staggerX ?? 0;
    const curve = overrides.curveRadius ?? block.curveRadius ?? 0;
    return block.seats.map(seat => {
      const { localX, localY } = calcSeatPosition(seat.row, seat.col, block.cols, spacing, skew, stagger, curve);
      return { ...seat, localX, localY };
    });
  };

  // Update block skewX - recalculate seat positions
  const updateBlockSkewX = useCallback((blockId: string, skewX: number) => {
    setBlocks(prev => prev.map(block => {
      if (block.id !== blockId) return block;
      return { ...block, skewX, seats: recalcSeats(block, { skewX }) };
    }));
  }, []);

  // Update block staggerX - recalculate seat positions
  const updateBlockStaggerX = useCallback((blockId: string, staggerX: number) => {
    setBlocks(prev => prev.map(block => {
      if (block.id !== blockId) return block;
      return { ...block, staggerX, seats: recalcSeats(block, { staggerX }) };
    }));
  }, []);

  // Update block curveRadius - recalculate seat positions
  const updateBlockCurveRadius = useCallback((blockId: string, curveRadius: number) => {
    setBlocks(prev => prev.map(block => {
      if (block.id !== blockId) return block;
      return { ...block, curveRadius, seats: recalcSeats(block, { curveRadius }) };
    }));
  }, []);

  // Select a block
  const selectBlock = useCallback((blockId: string | null) => {
    setSelectedBlockId(blockId);
  }, []);

  // Handle seat click based on current mode
  const handleSeatClick = useCallback((blockId: string, seatId: string) => {
    const currentMode = modeRef.current;
    console.log('handleSeatClick called:', blockId, seatId, 'mode:', currentMode);

    if (currentMode !== 'disable' && currentMode !== 'premium') {
      console.log('Mode is not disable or premium, ignoring click');
      return;
    }

    pushHistory();
    setBlocks(prev => prev.map(block => {
      if (block.id !== blockId) return block;

      return {
        ...block,
        seats: block.seats.map(seat => {
          if (seat.id !== seatId) return seat;

          if (currentMode === 'disable') {
            console.log('Toggling disabled for seat:', seatId, 'current:', seat.isDisabled);
            return { ...seat, isDisabled: !seat.isDisabled };
          } else if (currentMode === 'premium') {
            console.log('Toggling premium for seat:', seatId, 'current:', seat.isPremium);
            return { ...seat, isPremium: !seat.isPremium };
          }
          return seat;
        }),
      };
    }));
    updateCanUndo();
  }, [pushHistory, updateCanUndo]);

  // Background image opacity
  const updateBackgroundOpacity = useCallback((opacity: number) => {
    setBackgroundImage(prev => prev ? { ...prev, opacity } : null);
  }, []);

  // Export data
  const exportData = useCallback((name?: string) => {
    const data = exportVenueData(blocks, 1920, 1080, name);
    downloadJson(data, `${name || 'venue'}-${Date.now()}.json`);
  }, [blocks]);

  // Import data
  const importData = useCallback((importedBlocks: SeatBlock[]) => {
    pushHistory();
    setBlocks(importedBlocks);
    setSelectedBlockId(null);
    updateCanUndo();
  }, [pushHistory, updateCanUndo]);

  // Clear all
  const clearAll = useCallback(() => {
    pushHistory();
    setBlocks([]);
    setSelectedBlockId(null);
    setBackgroundImage(null);
    updateCanUndo();
  }, [pushHistory, updateCanUndo]);

  // Ctrl+Z keyboard shortcut for undo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo]);

  // Calculate stats
  const stats = getSeatStats(blocks);

  return {
    blocks,
    selectedBlockId,
    mode,
    backgroundImage,
    scale,
    setMode,
    addBlock,
    deleteBlock,
    updateBlockPosition,
    updateBlockRotation,
    updateBlockScale,
    updateBlockName,
    updateBlockSkewX,
    updateBlockStaggerX,
    updateBlockCurveRadius,
    selectBlock,
    handleSeatClick,
    setBackgroundImage,
    updateBackgroundOpacity,
    setScale,
    exportData,
    importData,
    clearAll,
    undo,
    canUndo,
    saveSnapshot,
    stats,
  };
}
