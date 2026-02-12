/**
 * Venue Map Editor - Type Definitions
 * Blueprint Technical Design System
 */

// Individual seat within a block
export interface Seat {
  id: string;
  row: number;
  col: number;
  localX: number; // Position relative to block origin
  localY: number;
  isPremium: boolean;
  isDisabled: boolean; // Disabled seats are shown as semi-transparent with X mark
}

// A block of seats (rectangular grid)
export interface SeatBlock {
  id: string;
  name: string;
  x: number; // Block position on canvas
  y: number;
  rotation: number; // Rotation angle in degrees
  scaleX: number; // Horizontal scale factor
  scaleY: number; // Vertical scale factor
  rows: number;
  cols: number;
  seatSize: number; // Diameter of each seat
  seatGap: number; // Gap between seats
  skewX: number; // 行ごとの横方向オフセット量（px）: 各行のlocalXに row*skewX を加算
  staggerX: number; // 千鳥配置: 奇数行の横オフセット量（px）。典型的には spacing/2
  curveRadius: number; // 扇形配置: 0=直線、正の値=円弧の半径（px）。大きいほど緩やかなカーブ
  seats: Seat[];
}

// Background image configuration
export interface BackgroundImage {
  src: string;
  width: number;
  height: number;
  opacity: number;
}

// Editor mode types
export type EditorMode = 'normal' | 'premium' | 'disable' | 'lottery';

/** 座席品質の相対評価 */
export type SeatQuality = 'top' | 'good' | 'normal' | 'back' | 'far';

// Lottery application with customer information
export interface LotteryApplication {
  id: string;
  groupSize: number;
  isInvitation: boolean;
  isRelation: boolean;
  pastScore: number;
  lastResult?: 'win' | 'lose'; // 前回結果（救済判定用）
  // Customer information
  memberId: string;
  name: string;
  address: string;
  tags: string[];
}

// Lottery assignment result
export interface LotteryAssignment {
  applicationId: string;
  seatIds: string[];
  totalScore: number;
  color: string; // Display color for visualization
  isInvitation: boolean; // 優待券ステータス
  isRelation: boolean;
  groupSize: number; // Group size for tooltip display
  pastScore: number; // Past score for tooltip display
  tier: 0 | 1 | 2 | 3; // 0=関係者ロック, 1=優待券, 2=救済, 3=バトル
  seatQuality?: SeatQuality;
  // Customer information for CSV export
  memberId: string;
  name: string;
  address: string;
}

// 関係者ロック
export interface LockedSeat {
  seatId: string;       // 基準座席ID
  customerId: string;
  customerName: string;
  groupSize: number;
  seatIds: string[];    // グループ全員の座席ID配列
}

// Stage position for lottery
export interface StagePosition {
  x: number;
  y: number;
}

// Selection rectangle for drag selection
export interface SelectionRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Canvas state
export interface CanvasState {
  scale: number;
  offsetX: number;
  offsetY: number;
}

// Complete venue data for export/import
export interface VenueData {
  version: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  canvasWidth: number;
  canvasHeight: number;
  blocks: SeatBlock[];
  backgroundImage?: BackgroundImage;
}

// Block generator form data
export interface BlockGeneratorForm {
  name: string;
  rows: number;
  cols: number;
  seatSize: number;
  seatGap: number;
  skewX: number; // 行ごとの横方向オフセット量（px）
  staggerX: number; // 千鳥配置オフセット量（px）
  curveRadius: number; // 扇形配置の半径（px）: 0=直線
}

// Winner information for CSV export
export interface WinnerInfo {
  memberId: string;
  name: string;
  address: string;
  seatLabel: string; // e.g., "A-1-5" (Block-Row-Col)
  attribute: string; // VIP / 関係者 / 救済 / 一般
  score: number;
  tier: 0 | 1 | 2 | 3;
  seatQuality?: SeatQuality;
  pastScore: number;
  groupSize: number;
}
