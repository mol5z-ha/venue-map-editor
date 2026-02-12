/**
 * 3層構造抽選アルゴリズム (Tier System)
 *
 * 設計原則:
 * 1. 2回連続落選の構造的排除（Tier 2 救済枠）
 * 2. 連続後方席の回避（スコアシステム）
 * 3. エンタメ性の維持（Tier 3 に30%のランダム要素）
 *
 * 処理順序: Tier 1 (優待券/関係者) → Tier 2 (救済) → Tier 3 (バトル)
 */

import type { SeatQuality } from '@/types/venue';

// ============================================
// 型定義
// ============================================

export interface Seat {
  id: string;
  x: number;
  y: number;
  isPremium: boolean;
  isDisabled: boolean;
  row?: number;
  col?: number;
  blockId?: string;
}

export interface Application {
  id: string;
  groupSize: number;
  isInvitation: boolean;
  isRelation: boolean;
  pastScore: number;
  lastResult?: 'win' | 'lose';
  memberId?: string;
  name?: string;
  address?: string;
  tags?: string[];
}

export interface LotteryConfig {
  stagePosition: { x: number; y: number };
  skillWeight?: number;   // Tier 3 の実力の重み（デフォルト 0.70）
  randomFn?: () => number; // テスト用: 乱数関数の注入
}

export interface SeatWithScore extends Seat {
  score: number;
  distanceFromStage: number;
}

export interface Assignment {
  applicationId: string;
  seatIds: string[];
  totalScore: number;
  tier: 1 | 2 | 3;
  seatQuality?: SeatQuality;
}

export interface LotteryResult {
  assignments: Assignment[];
  unassigned: string[];
  stats: {
    totalSeats: number;
    availableSeats: number;
    totalApplications: number;
    totalPeopleAssigned: number;
    averageScore: number;
    tier1Count: number;
    tier2Count: number;
    tier3Count: number;
    tier2OverflowCount: number;
  };
}

// 横並び連番チャンク
interface SeatChunk {
  seats: SeatWithScore[];
  avgScore: number;
  blockId: string;
  row: number;
  startCol: number;
}

// ============================================
// ユーティリティ関数
// ============================================

function calculateDistance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

/** 座席スコアの計算: ステージに近いほど高スコア + プレミアム席ボーナス */
export function calculateSeatScore(
  seat: Seat,
  stagePosition: { x: number; y: number },
  maxDistance: number,
): SeatWithScore {
  const distance = calculateDistance(seat.x, seat.y, stagePosition.x, stagePosition.y);
  const distanceScore = Math.max(0, 100 - (distance / maxDistance) * 100);
  const premiumBonus = seat.isPremium ? 1000 : 0;

  return {
    ...seat,
    score: distanceScore + premiumBonus,
    distanceFromStage: distance,
  };
}

/**
 * 全座席から「同一ブロック・同一行で列番号が連続する座席のチャンク」を構築
 */
function buildAllChunks(seats: SeatWithScore[]): SeatChunk[] {
  const chunks: SeatChunk[] = [];

  const grouped = new Map<string, SeatWithScore[]>();
  for (const seat of seats) {
    const key = `${seat.blockId ?? 'default'}_${seat.row ?? 0}`;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(seat);
  }

  for (const [key, rowSeats] of Array.from(grouped.entries())) {
    const [blockId, rowStr] = key.split('_');
    const row = parseInt(rowStr, 10);

    rowSeats.sort((a, b) => (a.col ?? 0) - (b.col ?? 0));

    let chunkStart = 0;
    for (let i = 1; i <= rowSeats.length; i++) {
      const isEnd = i === rowSeats.length;
      const isBreak = !isEnd && (rowSeats[i].col ?? 0) !== (rowSeats[i - 1].col ?? 0) + 1;

      if (isEnd || isBreak) {
        const chunkSeats = rowSeats.slice(chunkStart, i);
        const avgScore = chunkSeats.reduce((sum, s) => sum + s.score, 0) / chunkSeats.length;

        chunks.push({ seats: chunkSeats, avgScore, blockId, row, startCol: chunkSeats[0].col ?? 0 });
        chunkStart = i;
      }
    }
  }

  return chunks;
}

/**
 * チャンクから指定サイズの連続部分を全パターン抽出
 */
function getSubChunks(chunk: SeatChunk, size: number): SeatChunk[] {
  if (chunk.seats.length < size) return [];

  const subChunks: SeatChunk[] = [];
  for (let i = 0; i <= chunk.seats.length - size; i++) {
    const subSeats = chunk.seats.slice(i, i + size);
    const avgScore = subSeats.reduce((sum, s) => sum + s.score, 0) / subSeats.length;

    subChunks.push({
      seats: subSeats,
      avgScore,
      blockId: chunk.blockId,
      row: chunk.row,
      startCol: subSeats[0].col ?? 0,
    });
  }

  return subChunks;
}

/**
 * グループ座席の割り当て: 未割り当て席から最良の連続座席チャンクを選択
 *
 * 一人客の孤立防止:
 *   groupSize=1 の場合、既に配置済みの他の一人客の隣（8近傍）にある席を
 *   優先的に選ぶ。スコアが多少劣っても、近くに仲間がいる席を選ぶことで
 *   グループ客に囲まれて孤立するのを防ぐ。
 *   soloNeighborBonus を avgScore に加算して優先度を上げる。
 */
function findAndAllocateSeats(
  groupSize: number,
  scoredSeats: SeatWithScore[],
  assignedSeatIds: Set<string>,
  soloSeatIds?: Set<string>, // 既に配置済みの一人客の座席ID群
): SeatWithScore[] | null {
  const available = scoredSeats.filter((s) => !assignedSeatIds.has(s.id));
  if (available.length < groupSize) return null;

  const allChunks = buildAllChunks(available);
  const candidateChunks: SeatChunk[] = [];

  for (const chunk of allChunks) {
    candidateChunks.push(...getSubChunks(chunk, groupSize));
  }

  if (candidateChunks.length === 0) return null;

  // 一人客の場合: 既配置の一人客の隣にある席にボーナスを付与
  if (groupSize === 1 && soloSeatIds && soloSeatIds.size > 0) {
    // 座席IDからrow/col/blockIdを引けるマップ
    const seatMap = new Map<string, SeatWithScore>();
    for (const s of scoredSeats) seatMap.set(s.id, s);

    // グリッドマップ: blockId_row_col → seatId
    const gridMap = new Map<string, string>();
    for (const s of scoredSeats) {
      if (s.blockId !== undefined && s.row !== undefined && s.col !== undefined) {
        gridMap.set(`${s.blockId}_${s.row}_${s.col}`, s.id);
      }
    }

    // 一人客の隣接席IDセットを構築
    const soloAdjacentIds = new Set<string>();
    for (const soloId of Array.from(soloSeatIds)) {
      const seat = seatMap.get(soloId);
      if (!seat || seat.blockId === undefined || seat.row === undefined || seat.col === undefined) continue;
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          if (dr === 0 && dc === 0) continue;
          const nId = gridMap.get(`${seat.blockId}_${seat.row + dr}_${seat.col + dc}`);
          if (nId && !assignedSeatIds.has(nId)) {
            soloAdjacentIds.add(nId);
          }
        }
      }
    }

    // 隣接ボーナス: スコア上位20%相当の加点（一人客が固まりやすくなる）
    if (soloAdjacentIds.size > 0) {
      const maxScore = Math.max(...candidateChunks.map((c) => c.avgScore), 1);
      const bonus = maxScore * 0.2;

      for (const chunk of candidateChunks) {
        const seatId = chunk.seats[0]?.id;
        if (seatId && soloAdjacentIds.has(seatId)) {
          chunk.avgScore += bonus;
        }
      }
    }
  }

  candidateChunks.sort((a, b) => b.avgScore - a.avgScore);
  return candidateChunks[0].seats;
}

// ============================================
// ハイブリッド選出（Tier 3）
// ============================================

/**
 * 実力(skillWeight)% + 運(1-skillWeight)% のハイブリッド選出
 */
function hybridSelection(
  candidates: Application[],
  skillWeight: number,
  randomFn: () => number,
): Application[] {
  const selected: Application[] = [];
  const remaining = [...candidates];

  remaining.sort((a, b) => b.pastScore - a.pastScore);

  // 全候補者を順序付きで選出（座席割り当て時に落選判定）
  while (remaining.length > 0) {
    let chosen: Application;

    if (randomFn() < skillWeight) {
      chosen = remaining[0];
    } else {
      const randomIndex = Math.floor(randomFn() * remaining.length);
      chosen = remaining[randomIndex];
    }

    selected.push(chosen);
    remaining.splice(remaining.indexOf(chosen), 1);
  }

  return selected;
}

// ============================================
// 座席品質の判定（相対評価）
// ============================================

function assignSeatQuality(assignments: Assignment[]): void {
  const nonVipAssignments = assignments.filter((a) => a.tier !== 1);
  if (nonVipAssignments.length === 0) return;

  nonVipAssignments.sort((a, b) => b.totalScore - a.totalScore);

  const total = nonVipAssignments.length;
  for (let i = 0; i < total; i++) {
    const percentile = (i / total) * 100;
    if (percentile < 15) {
      nonVipAssignments[i].seatQuality = 'top';
    } else if (percentile < 40) {
      nonVipAssignments[i].seatQuality = 'good';
    } else if (percentile < 60) {
      nonVipAssignments[i].seatQuality = 'normal';
    } else if (percentile < 85) {
      nonVipAssignments[i].seatQuality = 'back';
    } else {
      nonVipAssignments[i].seatQuality = 'far';
    }
  }
}

// preventSoloIsolation は廃止。
// 代わりに findAndAllocateSeats の soloSeatIds パラメータで
// 一人客の配置時に既配置の一人客の隣を優先選択する。

// ============================================
// メイン抽選関数
// ============================================

export function assignSeats(
  seats: Seat[],
  applications: Application[],
  config: LotteryConfig,
): LotteryResult {
  const { stagePosition, skillWeight = 0.70 } = config;
  const randomFn = config.randomFn ?? Math.random;

  // Step 1: 無効化された席を除外
  const availableSeats = seats.filter((s) => !s.isDisabled);

  if (availableSeats.length === 0 || applications.length === 0) {
    return {
      assignments: [],
      unassigned: applications.map((a) => a.id),
      stats: {
        totalSeats: seats.length,
        availableSeats: 0,
        totalApplications: applications.length,
        totalPeopleAssigned: 0,
        averageScore: 0,
        tier1Count: 0,
        tier2Count: 0,
        tier3Count: 0,
        tier2OverflowCount: 0,
      },
    };
  }

  // Step 2: 最大距離を計算
  const maxDistance = Math.max(
    ...availableSeats.map((s) => calculateDistance(s.x, s.y, stagePosition.x, stagePosition.y)),
  ) || 1;

  // Step 3: 各座席のスコアを計算
  const scoredSeats = availableSeats.map((seat) =>
    calculateSeatScore(seat, stagePosition, maxDistance),
  );

  // Step 4: Tier分類
  const tier1Apps: Application[] = [];
  const tier2Apps: Application[] = [];
  const tier3Apps: Application[] = [];

  for (const app of applications) {
    if (app.isInvitation || app.isRelation) {
      tier1Apps.push(app);
    } else if (app.lastResult === 'lose') {
      tier2Apps.push(app);
    } else {
      tier3Apps.push(app);
    }
  }

  // Tier 1: 優待券/関係者内でシャッフル
  for (let i = tier1Apps.length - 1; i > 0; i--) {
    const j = Math.floor(randomFn() * (i + 1));
    [tier1Apps[i], tier1Apps[j]] = [tier1Apps[j], tier1Apps[i]];
  }

  // Tier 2: スコア降順
  tier2Apps.sort((a, b) => b.pastScore - a.pastScore);

  const assignments: Assignment[] = [];
  const assignedSeatIds = new Set<string>();
  const soloSeatIds = new Set<string>(); // 一人客の配置済み座席ID（孤立防止用）
  const unassigned: string[] = [];
  let tier2OverflowCount = 0;

  // 共通の配置ヘルパー
  const allocateApp = (app: Application, tier: 1 | 2 | 3): boolean => {
    const allocated = findAndAllocateSeats(
      app.groupSize, scoredSeats, assignedSeatIds,
      app.groupSize === 1 ? soloSeatIds : undefined,
    );
    if (allocated) {
      for (const seat of allocated) assignedSeatIds.add(seat.id);
      if (app.groupSize === 1) {
        for (const seat of allocated) soloSeatIds.add(seat.id);
      }
      assignments.push({
        applicationId: app.id,
        seatIds: allocated.map((s) => s.id),
        totalScore: allocated.reduce((sum, s) => sum + s.score, 0) / allocated.length,
        tier,
      });
      return true;
    }
    return false;
  };

  // Step 5: Tier 1 割り当て
  for (const app of tier1Apps) {
    if (!allocateApp(app, 1)) {
      unassigned.push(app.id);
    }
  }

  // Step 6: Tier 2 割り当て（救済枠）
  for (const app of tier2Apps) {
    if (!allocateApp(app, 2)) {
      unassigned.push(app.id);
      tier2OverflowCount++;
    }
  }

  // Step 7: Tier 3 ハイブリッド選出
  const tier3Selected = hybridSelection(tier3Apps, skillWeight, randomFn);

  for (const app of tier3Selected) {
    if (!allocateApp(app, 3)) {
      unassigned.push(app.id);
    }
  }

  // Step 8: 座席品質の判定（相対評価）
  assignSeatQuality(assignments);

  // Step 9: 統計情報
  const totalPeopleAssigned = assignments.reduce((sum, a) => sum + a.seatIds.length, 0);
  const averageScore =
    assignments.length > 0
      ? assignments.reduce((sum, a) => sum + a.totalScore, 0) / assignments.length
      : 0;

  return {
    assignments,
    unassigned,
    stats: {
      totalSeats: seats.length,
      availableSeats: availableSeats.length,
      totalApplications: applications.length,
      totalPeopleAssigned,
      averageScore,
      tier1Count: assignments.filter((a) => a.tier === 1).length,
      tier2Count: assignments.filter((a) => a.tier === 2).length,
      tier3Count: assignments.filter((a) => a.tier === 3).length,
      tier2OverflowCount,
    },
  };
}

// ============================================
// スコア計算（次回用CSV出力時に使用）
// ============================================

export interface ScoreUpdate {
  applicationId: string;
  currentScore: number;
  nextScore: number;
  change: number;
  seatQuality: SeatQuality | 'lose';
  lastResult: 'win' | 'lose';
}

export function calculateScoreUpdates(
  assignments: Assignment[],
  unassigned: string[],
  applications: Application[],
): ScoreUpdate[] {
  const updates: ScoreUpdate[] = [];

  const qualityChange: Record<SeatQuality, number> = {
    top: -4.0,
    good: -1.5,
    normal: 0,
    back: +1.5,
    far: +4.0,
  };
  const loseChange = +6.0;
  const minScore = 1.0;
  const maxScore = 10.0;

  for (const a of assignments) {
    const app = applications.find((ap) => ap.id === a.applicationId);
    if (!app) continue;

    if (app.isInvitation || app.isRelation) {
      updates.push({
        applicationId: a.applicationId,
        currentScore: app.pastScore,
        nextScore: app.pastScore,
        change: 0,
        seatQuality: a.seatQuality ?? 'normal',
        lastResult: 'win',
      });
      continue;
    }

    const quality = a.seatQuality ?? 'normal';
    const change = qualityChange[quality];
    const nextRaw = app.pastScore + change;
    const nextScore = Math.max(minScore, Math.min(maxScore, nextRaw));

    updates.push({
      applicationId: a.applicationId,
      currentScore: app.pastScore,
      nextScore,
      change: nextScore - app.pastScore,
      seatQuality: quality,
      lastResult: 'win',
    });
  }

  for (const id of unassigned) {
    const app = applications.find((ap) => ap.id === id);
    if (!app) continue;

    if (app.isInvitation || app.isRelation) {
      updates.push({
        applicationId: id,
        currentScore: app.pastScore,
        nextScore: app.pastScore,
        change: 0,
        seatQuality: 'lose',
        lastResult: 'lose',
      });
      continue;
    }

    const nextRaw = app.pastScore + loseChange;
    const nextScore = Math.max(minScore, Math.min(maxScore, nextRaw));

    updates.push({
      applicationId: id,
      currentScore: app.pastScore,
      nextScore,
      change: nextScore - app.pastScore,
      seatQuality: 'lose',
      lastResult: 'lose',
    });
  }

  return updates;
}

export default assignSeats;
