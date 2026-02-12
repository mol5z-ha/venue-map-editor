/**
 * BlockList Component - List of created seat blocks
 * Blueprint Technical Design System
 */

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Layers, Trash2, RotateCw, Pencil, Check, FlipHorizontal2, AlignHorizontalSpaceAround } from 'lucide-react';
import type { SeatBlock } from '@/types/venue';

interface BlockListProps {
  blocks: SeatBlock[];
  selectedBlockId: string | null;
  onSelectBlock: (blockId: string) => void;
  onDeleteBlock: (blockId: string) => void;
  onRotateBlock: (blockId: string, rotation: number) => void;
  onRenameBlock: (blockId: string, name: string) => void;
  onSkewBlock: (blockId: string, skewX: number) => void;
  onStaggerBlock: (blockId: string, staggerX: number) => void;
  onSaveSnapshot?: () => void;
}

export function BlockList({
  blocks,
  selectedBlockId,
  onSelectBlock,
  onDeleteBlock,
  onRotateBlock,
  onRenameBlock,
  onSkewBlock,
  onStaggerBlock,
  onSaveSnapshot,
}: BlockListProps) {
  const selectedBlock = blocks.find(b => b.id === selectedBlockId);
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const sliderSnapshotSaved = useRef(false);

  // Focus input when entering edit mode
  useEffect(() => {
    if (editingBlockId && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingBlockId]);

  const startRename = (blockId: string, currentName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingBlockId(blockId);
    setEditName(currentName);
  };

  const confirmRename = (blockId: string) => {
    const trimmed = editName.trim();
    if (trimmed) {
      onRenameBlock(blockId, trimmed);
    }
    setEditingBlockId(null);
  };

  const cancelRename = () => {
    setEditingBlockId(null);
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2.5 mb-3">
        <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
          <Layers className="w-4 h-4 text-primary" />
        </div>
        <h3 className="font-bold text-sm text-foreground">ブロック一覧</h3>
        <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground mono font-medium">
          {blocks.length}
        </span>
      </div>

      {blocks.length === 0 ? (
        <div className="text-center py-6">
          <Layers className="w-5 h-5 text-muted-foreground/40 mx-auto mb-1.5" />
          <p className="text-xs text-muted-foreground/60">ブロックがありません</p>
        </div>
      ) : (
        <div className="space-y-1.5 max-h-48 overflow-y-auto">
          {blocks.map((block) => {
            const activeSeats = block.seats.filter(s => !s.isDisabled).length;
            const premiumSeats = block.seats.filter(s => !s.isDisabled && s.isPremium).length;
            const isSelected = block.id === selectedBlockId;
            const isEditing = editingBlockId === block.id;
            const displayName = block.name || `Block ${block.id.slice(0, 4)}`;

            return (
              <div
                key={block.id}
                className={`
                  p-2.5 rounded-lg border cursor-pointer transition-all duration-150
                  ${isSelected
                    ? 'border-primary/50 bg-primary/5 shadow-sm'
                    : 'border-transparent bg-muted/30 hover:bg-muted/50'
                  }
                `}
                onClick={() => onSelectBlock(block.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    {isEditing ? (
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <Input
                          ref={inputRef}
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') confirmRename(block.id);
                            if (e.key === 'Escape') cancelRename();
                          }}
                          onBlur={() => confirmRename(block.id)}
                          className="h-6 text-xs px-1.5"
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            confirmRename(block.id);
                          }}
                        >
                          <Check className="w-3 h-3 text-emerald-500" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <p className="font-medium text-xs truncate">{displayName}</p>
                        {isSelected && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 shrink-0 opacity-60 hover:opacity-100"
                            onClick={(e) => startRename(block.id, displayName, e)}
                          >
                            <Pencil className="w-2.5 h-2.5" />
                          </Button>
                        )}
                      </div>
                    )}
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] text-muted-foreground mono">
                        {block.rows}x{block.cols}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {activeSeats}席
                      </span>
                      {premiumSeats > 0 && (
                        <span className="text-[10px] text-amber-500 font-medium">
                          {premiumSeats}
                        </span>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteBlock(block.id);
                    }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Rotation control for selected block */}
      {selectedBlock && (
        <div className="mt-3 pt-3 border-t border-border">
          <div className="flex items-center gap-2 mb-2">
            <RotateCw className="w-3.5 h-3.5 text-muted-foreground" />
            <Label className="text-xs font-medium text-muted-foreground">回転</Label>
            <span className="ml-auto mono text-xs font-bold text-primary">
              {Math.round(selectedBlock.rotation)}°
            </span>
          </div>
          <Slider
            value={[selectedBlock.rotation]}
            min={0}
            max={360}
            step={1}
            onValueChange={([value]) => {
              if (!sliderSnapshotSaved.current) {
                sliderSnapshotSaved.current = true;
                onSaveSnapshot?.();
              }
              onRotateBlock(selectedBlock.id, value);
            }}
            onValueCommit={() => {
              sliderSnapshotSaved.current = false;
            }}
            onPointerUp={() => {
              sliderSnapshotSaved.current = false;
            }}
            className="w-full"
          />
          <div className="flex justify-between mt-1.5">
            {[0, 45, 90, 135, 180].map((angle) => (
              <Button
                key={angle}
                variant="ghost"
                size="sm"
                className="h-5 px-1.5 text-[10px] mono text-muted-foreground hover:text-foreground"
                onClick={() => {
                  onSaveSnapshot?.();
                  onRotateBlock(selectedBlock.id, angle);
                }}
              >
                {angle}°
              </Button>
            ))}
          </div>

          {/* Skew control */}
          <div className="mt-3 pt-3 border-t border-border">
            <div className="flex items-center gap-2 mb-2">
              <FlipHorizontal2 className="w-3.5 h-3.5 text-muted-foreground" />
              <Label className="text-xs font-medium text-muted-foreground">傾き</Label>
              <span className="ml-auto mono text-xs font-bold text-primary">
                {selectedBlock.skewX ?? 0}px
              </span>
            </div>
            <Slider
              value={[selectedBlock.skewX ?? 0]}
              min={-30}
              max={30}
              step={1}
              onValueChange={([value]) => {
                if (!sliderSnapshotSaved.current) {
                  sliderSnapshotSaved.current = true;
                  onSaveSnapshot?.();
                }
                onSkewBlock(selectedBlock.id, value);
              }}
              onValueCommit={() => {
                sliderSnapshotSaved.current = false;
              }}
              onPointerUp={() => {
                sliderSnapshotSaved.current = false;
              }}
              className="w-full"
            />
            <div className="flex justify-between mt-1.5">
              {[-20, -10, 0, 10, 20].map((skew) => (
                <Button
                  key={skew}
                  variant="ghost"
                  size="sm"
                  className="h-5 px-1.5 text-[10px] mono text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    onSaveSnapshot?.();
                    onSkewBlock(selectedBlock.id, skew);
                  }}
                >
                  {skew}
                </Button>
              ))}
            </div>
          </div>

          {/* Stagger control (千鳥配置) - 双方向: 中央=0, 右=偶数行右ズレ, 左=偶数行左ズレ */}
          <div className="mt-3 pt-3 border-t border-border">
            <div className="flex items-center gap-2 mb-2">
              <AlignHorizontalSpaceAround className="w-3.5 h-3.5 text-muted-foreground" />
              <Label className="text-xs font-medium text-muted-foreground">千鳥</Label>
              <span className="ml-auto mono text-xs font-bold text-primary">
                {(selectedBlock.staggerX ?? 0) === 0 ? 'OFF' : `${selectedBlock.staggerX ?? 0}px`}
              </span>
            </div>
            {(() => {
              const halfSpacing = Math.round((selectedBlock.seatSize + selectedBlock.seatGap) / 2);
              const maxVal = halfSpacing + 10;
              return (
                <>
                  <Slider
                    value={[selectedBlock.staggerX ?? 0]}
                    min={-maxVal}
                    max={maxVal}
                    step={1}
                    onValueChange={([value]) => {
                      if (!sliderSnapshotSaved.current) {
                        sliderSnapshotSaved.current = true;
                        onSaveSnapshot?.();
                      }
                      onStaggerBlock(selectedBlock.id, value);
                    }}
                    onValueCommit={() => {
                      sliderSnapshotSaved.current = false;
                    }}
                    onPointerUp={() => {
                      sliderSnapshotSaved.current = false;
                    }}
                    className="w-full"
                  />
                  <div className="flex justify-between mt-1.5">
                    {[-Math.round(halfSpacing / 2), 0, Math.round(halfSpacing / 2)].map((v) => (
                      <Button
                        key={v}
                        variant="ghost"
                        size="sm"
                        className="h-5 px-1.5 text-[10px] mono text-muted-foreground hover:text-foreground"
                        onClick={() => {
                          onSaveSnapshot?.();
                          onStaggerBlock(selectedBlock.id, v);
                        }}
                      >
                        {v === 0 ? 'OFF' : `${v > 0 ? '+' : ''}${v}px`}
                      </Button>
                    ))}
                  </div>
                </>
              );
            })()}
          </div>

          {/* 扇形配置は一旦削除。再設計後に追加予定 */}
        </div>
      )}
    </div>
  );
}
