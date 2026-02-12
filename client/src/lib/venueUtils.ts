/**
 * Venue Map Editor - Utility Functions
 * Blueprint Technical Design System
 */

import { nanoid } from 'nanoid';
import type { Seat, SeatBlock, VenueData, BlockGeneratorForm } from '@/types/venue';

/**
 * 座席の localX, localY を計算（skewX, staggerX 対応）
 *
 * staggerX: 偶数行（0, 2, 4...）のオフセット
 *   正の値 → 偶数行が右にずれる
 *   負の値 → 偶数行が左にずれる
 *   奇数行（1, 3, 5...）は基準位置のまま
 *
 * curveRadius: 扇形配置（未実装・将来用。現在は無視される）
 */
export function calcSeatPosition(
  row: number,
  col: number,
  cols: number,
  spacing: number,
  skewX: number,
  staggerX: number,
  _curveRadius: number,
): { localX: number; localY: number } {
  // 直線配置: skewX + staggerX
  // staggerX: 偶数行（0, 2, 4...）をオフセット。正=右、負=左
  const staggerOffset = (row % 2 === 0) ? staggerX : 0;
  return {
    localX: col * spacing + row * skewX + staggerOffset,
    localY: row * spacing,
  };
}

/**
 * Generate seats for a block based on rows and columns
 */
export function generateSeats(
  rows: number,
  cols: number,
  seatSize: number,
  seatGap: number,
  skewX: number = 0,
  staggerX: number = 0,
  curveRadius: number = 0,
): Seat[] {
  const seats: Seat[] = [];
  const spacing = seatSize + seatGap;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const { localX, localY } = calcSeatPosition(row, col, cols, spacing, skewX, staggerX, curveRadius);
      seats.push({
        id: nanoid(8),
        row,
        col,
        localX,
        localY,
        isPremium: false,
        isDisabled: false,
      });
    }
  }

  return seats;
}

/**
 * Create a new seat block
 */
export function createSeatBlock(
  form: BlockGeneratorForm,
  x: number = 100,
  y: number = 100
): SeatBlock {
  return {
    id: nanoid(8),
    name: form.name || `Block ${Date.now()}`,
    x,
    y,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    rows: form.rows,
    cols: form.cols,
    seatSize: form.seatSize,
    seatGap: form.seatGap,
    skewX: form.skewX || 0,
    staggerX: form.staggerX || 0,
    curveRadius: form.curveRadius || 0,
    seats: generateSeats(form.rows, form.cols, form.seatSize, form.seatGap, form.skewX || 0, form.staggerX || 0, form.curveRadius || 0),
  };
}

/**
 * Calculate block dimensions
 */
export function getBlockDimensions(block: SeatBlock): { width: number; height: number } {
  // 座席が存在する場合、実際の座標から算出
  if (block.seats.length > 0) {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const seat of block.seats) {
      minX = Math.min(minX, seat.localX);
      maxX = Math.max(maxX, seat.localX + block.seatSize);
      minY = Math.min(minY, seat.localY);
      maxY = Math.max(maxY, seat.localY + block.seatSize);
    }
    return {
      width: maxX - minX,
      height: maxY - minY,
    };
  }
  const spacing = block.seatSize + block.seatGap;
  return {
    width: block.cols * spacing - block.seatGap,
    height: block.rows * spacing - block.seatGap,
  };
}

/**
 * Transform local seat coordinates to canvas coordinates
 */
export function seatToCanvasCoords(
  seat: Seat,
  block: SeatBlock
): { x: number; y: number } {
  const rad = (block.rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  // Rotate around block origin
  const rotatedX = seat.localX * cos - seat.localY * sin;
  const rotatedY = seat.localX * sin + seat.localY * cos;

  return {
    x: block.x + rotatedX,
    y: block.y + rotatedY,
  };
}

/**
 * Check if a point is inside a seat (circle)
 */
export function isPointInSeat(
  px: number,
  py: number,
  seat: Seat,
  block: SeatBlock
): boolean {
  if (seat.isDisabled) return false;

  const { x, y } = seatToCanvasCoords(seat, block);
  const radius = block.seatSize / 2;
  const centerX = x + radius;
  const centerY = y + radius;

  const dx = px - centerX;
  const dy = py - centerY;

  return dx * dx + dy * dy <= radius * radius;
}

/**
 * Check if a seat is within a selection rectangle
 */
export function isSeatInSelection(
  seat: Seat,
  block: SeatBlock,
  selectionRect: { x: number; y: number; width: number; height: number }
): boolean {
  if (seat.isDisabled) return false;

  const { x, y } = seatToCanvasCoords(seat, block);
  const seatCenterX = x + block.seatSize / 2;
  const seatCenterY = y + block.seatSize / 2;

  // Normalize selection rect (handle negative width/height from drag direction)
  const rectX = selectionRect.width < 0 ? selectionRect.x + selectionRect.width : selectionRect.x;
  const rectY = selectionRect.height < 0 ? selectionRect.y + selectionRect.height : selectionRect.y;
  const rectW = Math.abs(selectionRect.width);
  const rectH = Math.abs(selectionRect.height);

  return (
    seatCenterX >= rectX &&
    seatCenterX <= rectX + rectW &&
    seatCenterY >= rectY &&
    seatCenterY <= rectY + rectH
  );
}

/**
 * Export venue data to JSON
 */
export function exportVenueData(
  blocks: SeatBlock[],
  canvasWidth: number,
  canvasHeight: number,
  name: string = 'Untitled Venue'
): VenueData {
  return {
    version: '1.0',
    name,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    canvasWidth,
    canvasHeight,
    blocks,
  };
}

/**
 * Download JSON data as file
 */
export function downloadJson(data: VenueData, filename: string = 'venue-data.json'): void {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Load venue data from JSON file
 */
export function loadVenueData(file: File): Promise<VenueData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string) as VenueData;
        resolve(data);
      } catch (error) {
        reject(new Error('Invalid JSON file'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}

/**
 * Get seat statistics
 */
export function getSeatStats(blocks: SeatBlock[]): {
  total: number;
  active: number;
  disabled: number;
  premium: number;
  normal: number;
} {
  let total = 0;
  let disabled = 0;
  let premium = 0;

  for (const block of blocks) {
    for (const seat of block.seats) {
      total++;
      if (seat.isDisabled) {
        disabled++
      } else if (seat.isPremium) {
        premium++;
      }
    }
  }

  const active = total - disabled;
  const normal = active - premium;

  return { total, active, disabled, premium, normal };
}
