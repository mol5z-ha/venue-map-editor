/**
 * Lottery Custom Hook
 * 3層構造抽選の状態管理・関係者ロック・3種CSV出力
 */

import { useState, useCallback } from 'react';
import type { SeatBlock, LotteryApplication, LotteryAssignment, StagePosition, WinnerInfo, LockedSeat, SeatQuality } from '@/types/venue';
import type { Customer, CustomerTag } from '@/types/customer';
import type { Seat as LotterySeat, Application, LotteryConfig, LotteryResult, ScoreUpdate } from '@/core/lottery';
import { assignSeats, calculateScoreUpdates } from '@/core/lottery';

// 色パレット
const GROUP_COLORS = [
  '#3b82f6', '#22c55e', '#a855f7', '#f97316', '#ec4899',
  '#14b8a6', '#f59e0b', '#6366f1', '#84cc16', '#06b6d4',
];
const INVITATION_COLOR = '#ca8a04';
const RELATION_COLOR = '#a855f7';
const RESCUE_COLOR = '#22d3ee';

// 日本人名のダミーデータ
const JAPANESE_SURNAMES = [
  '山田', '田中', '佐藤', '鈴木', '高橋', '渡辺', '伊藤', '中村', '小林', '加藤',
  '吉田', '山本', '松本', '井上', '木村', '林', '清水', '山崎', '森', '池田',
  '橋本', '阿部', '石川', '前田', '藤田', '小川', '岡田', '後藤', '長谷川', '村上',
];
const JAPANESE_FIRST_NAMES = [
  '太郎', '花子', '一郎', '美咲', '健太', '愛', '翔太', '結衣', '大輔', '陽子',
  '拓也', '真由美', '直樹', '麻衣', '和也', '由美', '雄太', '恵', '達也', '智子',
  '隆', '裕子', '誠', '香織', '浩二', '明美', '秀樹', '久美子', '正', '幸子',
];
const PREFECTURES_CITIES = [
  { pref: '東京都', cities: ['渋谷区', '新宿区', '港区', '世田谷区', '目黒区', '品川区'] },
  { pref: '神奈川県', cities: ['横浜市中区', '横浜市西区', '川崎市川崎区', '藤沢市'] },
  { pref: '大阪府', cities: ['大阪市北区', '大阪市中央区', '堺市堺区', '東大阪市'] },
  { pref: '愛知県', cities: ['名古屋市中区', '名古屋市中村区', '豊田市', '一宮市'] },
  { pref: '埼玉県', cities: ['さいたま市大宮区', '川口市', '川越市', '所沢市'] },
  { pref: '千葉県', cities: ['千葉市中央区', '船橋市', '松戸市', '柏市'] },
  { pref: '福岡県', cities: ['福岡市博多区', '福岡市中央区', '北九州市小倉北区'] },
  { pref: '北海道', cities: ['札幌市中央区', '札幌市北区', '旭川市', '函館市'] },
];

function generateJapaneseName(): string {
  const surname = JAPANESE_SURNAMES[Math.floor(Math.random() * JAPANESE_SURNAMES.length)];
  const firstName = JAPANESE_FIRST_NAMES[Math.floor(Math.random() * JAPANESE_FIRST_NAMES.length)];
  return `${surname} ${firstName}`;
}

function generateJapaneseAddress(): string {
  const prefCity = PREFECTURES_CITIES[Math.floor(Math.random() * PREFECTURES_CITIES.length)];
  const city = prefCity.cities[Math.floor(Math.random() * prefCity.cities.length)];
  return `${prefCity.pref}${city}${Math.floor(Math.random() * 5) + 1}-${Math.floor(Math.random() * 30) + 1}-${Math.floor(Math.random() * 20) + 1}`;
}

function generateMemberId(index: number, prefix: string): string {
  return `${prefix}${String(index + 1).padStart(6, '0')}`;
}

/** タグの移行: 旧タグ → 新タグ */
function migrateTag(tag: string): CustomerTag {
  const lower = tag.toLowerCase();
  if (lower === 'invitation' || lower === 'vip' || lower === 'premium' || lower === 'gold' || lower === '優待券') return 'invitation';
  if (lower === 'relation' || lower === '関係者') return 'relation';
  if (lower === 'fanclub' || lower === 'regular' || lower === 'ファンクラブ' || lower === '一般') return 'fanclub';
  return 'fanclub';
}

function customerToApplication(customer: Customer, groupSize: number): LotteryApplication {
  const normalizedTags = customer.tags.map((t) => migrateTag(t as string));
  const isInvitation = normalizedTags.includes('invitation');
  const isRelation = normalizedTags.includes('relation');

  return {
    id: customer.id,
    groupSize,
    isInvitation,
    isRelation,
    pastScore: customer.totalScore,
    lastResult: customer.lastResult,
    memberId: customer.memberId,
    name: customer.name,
    address: customer.address || '',
    tags: normalizedTags,
  };
}

/** BOM付きCSVダウンロードのヘルパー */
function downloadCSV(filename: string, headers: string[], rows: string[][]): void {
  const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')),
  ].join('\n');

  const bom = '\uFEFF';
  const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Tier名変換
function getTierLabel(tier: 0 | 1 | 2 | 3): string {
  switch (tier) {
    case 0: return '関係者枠';
    case 1: return '優待券枠';
    case 2: return '救済枠';
    case 3: return 'バトル枠';
  }
}

// 座席品質名変換
function getQualityLabel(q?: SeatQuality): string {
  if (!q) return '-';
  const labels: Record<SeatQuality, string> = {
    top: '神席', good: '良席', normal: '普通席', back: '後方席', far: '最後方',
  };
  return labels[q];
}

/** 関係者ロック配置中の状態 */
interface LockingState {
  customer: Customer;
  remainingSeats: number;
  placedSeatIds: string[];
}

interface UseLotteryReturn {
  applications: LotteryApplication[];
  assignments: LotteryAssignment[];
  stagePosition: StagePosition;
  skillWeight: number;
  seatAssignmentMap: Map<string, LotteryAssignment>;
  lockedSeats: LockedSeat[];
  lastResult: LotteryResult | null;
  scoreUpdates: ScoreUpdate[];
  lockingState: LockingState | null;

  setStagePosition: (position: StagePosition) => void;
  setSkillWeight: (weight: number) => void;
  generateMockData: () => void;
  loadFromCustomers: (customers: Customer[], groupSizes?: Map<string, number>) => void;
  setApplications: (apps: LotteryApplication[]) => void;
  runLottery: (blocks: SeatBlock[]) => LotteryResult | null;
  reset: () => void;
  getAssignmentForSeat: (seatId: string) => LotteryAssignment | undefined;
  getWinnersList: (blocks: SeatBlock[]) => WinnerInfo[];

  startLocking: (customer: Customer) => void;
  cancelLocking: () => void;
  handleLockSeatClick: (seatId: string) => void;
  unlockCustomer: (customerId: string) => void;

  exportWinnersCSV: (blocks: SeatBlock[], eventName?: string) => void;
  exportLosersCSV: (eventName?: string) => void;
  exportNextEventCSV: (eventName?: string) => void;
}

export function useLottery(): UseLotteryReturn {
  const [applications, setApplications] = useState<LotteryApplication[]>([]);
  const [assignments, setAssignments] = useState<LotteryAssignment[]>([]);
  const [stagePosition, setStagePosition] = useState<StagePosition>({ x: 500, y: 50 });
  const [skillWeight, setSkillWeight] = useState(0.70);
  const [seatAssignmentMap, setSeatAssignmentMap] = useState<Map<string, LotteryAssignment>>(new Map());
  const [lockedSeats, setLockedSeats] = useState<LockedSeat[]>([]);
  const [lockingState, setLockingState] = useState<LockingState | null>(null);
  const [lastResult, setLastResult] = useState<LotteryResult | null>(null);
  const [scoreUpdates, setScoreUpdates] = useState<ScoreUpdate[]>([]);

  const generateMockData = useCallback(() => {
    const mockApplications: LotteryApplication[] = [];
    let invitationIndex = 0;
    let fanclubIndex = 0;

    const invitationCount = Math.floor(Math.random() * 21) + 30;
    for (let i = 0; i < invitationCount; i++) {
      mockApplications.push({
        id: `INV-${i + 1}`,
        groupSize: Math.random() > 0.7 ? 2 : 1,
        isInvitation: true,
        isRelation: false,
        pastScore: 5.0,
        lastResult: undefined,
        memberId: generateMemberId(invitationIndex++, 'V'),
        name: generateJapaneseName(),
        address: generateJapaneseAddress(),
        tags: ['invitation'],
      });
    }

    const fanclubCount = Math.floor(Math.random() * 101) + 500;
    for (let i = 0; i < fanclubCount; i++) {
      const rand = Math.random();
      let groupSize = 1;
      if (rand > 0.95) groupSize = 4;
      else if (rand > 0.85) groupSize = 3;
      else if (rand > 0.6) groupSize = 2;

      const lastResult: 'win' | 'lose' | undefined =
        Math.random() < 0.1 ? 'lose' : Math.random() < 0.5 ? 'win' : undefined;

      const pastScore = Math.round((Math.random() * 9 + 1) * 10) / 10;

      mockApplications.push({
        id: `User-${i + 1}`,
        groupSize,
        isInvitation: false,
        isRelation: false,
        pastScore,
        lastResult,
        memberId: generateMemberId(fanclubIndex++, 'M'),
        name: generateJapaneseName(),
        address: generateJapaneseAddress(),
        tags: ['fanclub'],
      });
    }

    setApplications(mockApplications);
    setAssignments([]);
    setSeatAssignmentMap(new Map());
    setLastResult(null);
    setScoreUpdates([]);
  }, []);

  const loadFromCustomers = useCallback((customers: Customer[], groupSizes?: Map<string, number>) => {
    const lockedCustomerIds = new Set(lockedSeats.map((ls) => ls.customerId));
    const filteredCustomers = customers.filter((c) => !lockedCustomerIds.has(c.id));

    const apps: LotteryApplication[] = filteredCustomers.map((customer) => {
      const groupSize = groupSizes?.get(customer.id) ?? customer.groupSize ?? 1;
      return customerToApplication(customer, groupSize);
    });
    setApplications(apps);
    setAssignments([]);
    setSeatAssignmentMap(new Map());
    setLastResult(null);
    setScoreUpdates([]);
  }, [lockedSeats]);

  const runLottery = useCallback((blocks: SeatBlock[]): LotteryResult | null => {
    if (applications.length === 0 || blocks.length === 0) return null;

    const lotterySeats: LotterySeat[] = [];
    for (const block of blocks) {
      for (const seat of block.seats) {
        const rad = (block.rotation * Math.PI) / 180;
        const scaledX = seat.localX * block.scaleX;
        const scaledY = seat.localY * block.scaleY;
        const rotatedX = scaledX * Math.cos(rad) - scaledY * Math.sin(rad);
        const rotatedY = scaledX * Math.sin(rad) + scaledY * Math.cos(rad);

        lotterySeats.push({
          id: seat.id,
          x: block.x + rotatedX,
          y: block.y + rotatedY,
          isPremium: seat.isPremium,
          isDisabled: seat.isDisabled,
          row: seat.row,
          col: seat.col,
          blockId: block.id,
        });
      }
    }

    // ロック済み座席を無効化
    const lockedSeatIds = new Set(lockedSeats.flatMap((ls) => ls.seatIds));
    for (const seat of lotterySeats) {
      if (lockedSeatIds.has(seat.id)) {
        seat.isDisabled = true;
      }
    }

    const config: LotteryConfig = { stagePosition, skillWeight };

    const lotteryApplications: Application[] = applications.map((app) => ({
      id: app.id,
      groupSize: app.groupSize,
      isInvitation: app.isInvitation,
      isRelation: app.isRelation,
      pastScore: app.pastScore,
      lastResult: app.lastResult,
      memberId: app.memberId,
      name: app.name,
      address: app.address,
      tags: app.tags,
    }));

    const result = assignSeats(lotterySeats, lotteryApplications, config);
    setLastResult(result);

    const updates = calculateScoreUpdates(result.assignments, result.unassigned, lotteryApplications);
    setScoreUpdates(updates);

    let colorIndex = 0;
    const newAssignments: LotteryAssignment[] = result.assignments.map((assignment) => {
      const app = applications.find((a) => a.id === assignment.applicationId);
      let color: string;
      if (app?.isInvitation) color = INVITATION_COLOR;
      else if (app?.isRelation) color = RELATION_COLOR;
      else if (assignment.tier === 2) color = RESCUE_COLOR;
      else color = GROUP_COLORS[colorIndex++ % GROUP_COLORS.length];

      return {
        applicationId: assignment.applicationId,
        seatIds: assignment.seatIds,
        totalScore: assignment.totalScore,
        color,
        isInvitation: app?.isInvitation ?? false,
        isRelation: app?.isRelation ?? false,
        groupSize: app?.groupSize ?? 1,
        pastScore: app?.pastScore ?? 0,
        tier: assignment.tier,
        seatQuality: assignment.seatQuality,
        memberId: app?.memberId ?? '',
        name: app?.name ?? '',
        address: app?.address ?? '',
      };
    });

    // ロック済み関係者を Tier 0 として統合
    for (const locked of lockedSeats) {
      newAssignments.unshift({
        applicationId: locked.customerId,
        seatIds: locked.seatIds,
        totalScore: 0,
        color: RELATION_COLOR,
        isInvitation: false,
        isRelation: true,
        groupSize: locked.groupSize,
        pastScore: 0,
        tier: 0,
        seatQuality: undefined,
        memberId: '',
        name: locked.customerName,
        address: '',
      });
    }

    setAssignments(newAssignments);

    const newMap = new Map<string, LotteryAssignment>();
    for (const assignment of newAssignments) {
      for (const seatId of assignment.seatIds) {
        newMap.set(seatId, assignment);
      }
    }
    setSeatAssignmentMap(newMap);

    return result;
  }, [applications, stagePosition, skillWeight, lockedSeats]);

  const reset = useCallback(() => {
    setApplications([]);
    setAssignments([]);
    setSeatAssignmentMap(new Map());
    setLockedSeats([]);
    setLockingState(null);
    setLastResult(null);
    setScoreUpdates([]);
  }, []);

  const getAssignmentForSeat = useCallback((seatId: string): LotteryAssignment | undefined => {
    return seatAssignmentMap.get(seatId);
  }, [seatAssignmentMap]);

  const getSeatLabel = useCallback((seatId: string, blocks: SeatBlock[]): string => {
    for (const block of blocks) {
      const seat = block.seats.find((s) => s.id === seatId);
      if (seat) return `${block.name}-${seat.row + 1}-${seat.col + 1}`;
    }
    return seatId;
  }, []);

  const getWinnersList = useCallback((blocks: SeatBlock[]): WinnerInfo[] => {
    return assignments.map((assignment) => {
      const seatLabels = assignment.seatIds.map((seatId) => getSeatLabel(seatId, blocks));

      let attribute: string;
      if (assignment.tier === 0) attribute = '関係者';
      else if (assignment.isInvitation) attribute = '優待券';
      else if (assignment.isRelation) attribute = '関係者';
      else if (assignment.tier === 2) attribute = '救済';
      else if (assignment.groupSize > 1) attribute = `Group(${assignment.groupSize}名)`;
      else attribute = 'ファンクラブ';

      return {
        memberId: assignment.memberId,
        name: assignment.name,
        address: assignment.address,
        seatLabel: seatLabels.join(', '),
        attribute,
        score: assignment.totalScore,
        tier: assignment.tier,
        seatQuality: assignment.seatQuality,
        pastScore: assignment.pastScore,
        groupSize: assignment.groupSize,
      };
    });
  }, [assignments, getSeatLabel]);

  /** 関係者のロック配置を開始 */
  const startLocking = useCallback((customer: Customer) => {
    const groupSize = customer.groupSize ?? 1;
    setLockingState({
      customer,
      remainingSeats: groupSize,
      placedSeatIds: [],
    });
  }, []);

  /** ロック配置をキャンセル（途中で配置した分も元に戻す） */
  const cancelLocking = useCallback(() => {
    if (lockingState && lockingState.placedSeatIds.length > 0) {
      // 途中で配置した分を取り消す
      const placedIds = new Set(lockingState.placedSeatIds);
      setLockedSeats((prev) => prev.filter((ls) => !placedIds.has(ls.seatId)));
    }
    setLockingState(null);
  }, [lockingState]);

  /** 抽選モードで席がクリックされた時のロック処理 */
  const handleLockSeatClick = useCallback((seatId: string) => {
    if (!lockingState) return;

    // 既にロック済みの座席かチェック
    const allLockedSeatIds = new Set(lockedSeats.flatMap((ls) => ls.seatIds));
    if (allLockedSeatIds.has(seatId)) return;

    // 今回の配置で既に選んだ座席かチェック
    if (lockingState.placedSeatIds.includes(seatId)) return;

    const newPlacedSeatIds = [...lockingState.placedSeatIds, seatId];
    const newRemaining = lockingState.remainingSeats - 1;

    if (newRemaining <= 0) {
      // 全席配置完了 → LockedSeatとして確定
      const baseSeatId = newPlacedSeatIds[0];
      setLockedSeats((prev) => [
        ...prev,
        {
          seatId: baseSeatId,
          customerId: lockingState.customer.id,
          customerName: lockingState.customer.name,
          groupSize: lockingState.customer.groupSize ?? 1,
          seatIds: newPlacedSeatIds,
        },
      ]);
      setLockingState(null);
    } else {
      // まだ残りあり → 状態更新
      setLockingState({
        ...lockingState,
        remainingSeats: newRemaining,
        placedSeatIds: newPlacedSeatIds,
      });
    }
  }, [lockingState, lockedSeats]);

  /** 関係者のロックを解除（customerId指定） */
  const unlockCustomer = useCallback((customerId: string) => {
    setLockedSeats((prev) => prev.filter((ls) => ls.customerId !== customerId));
  }, []);

  // ---- 3種CSV出力 ----

  const exportWinnersCSV = useCallback((blocks: SeatBlock[], eventName?: string) => {
    const winners = getWinnersList(blocks);
    const date = new Date().toISOString().slice(0, 10);
    const name = eventName || 'イベント';

    const headers = ['会員番号', '氏名', '人数', '当選座席', '属性', 'Tier', '座席品質', 'スコア', '住所'];
    const rows = winners.map((w) => [
      w.memberId, w.name, String(w.groupSize), w.seatLabel, w.attribute,
      getTierLabel(w.tier), getQualityLabel(w.seatQuality), w.score.toFixed(1), w.address,
    ]);

    downloadCSV(`発送用_当選者_${name}_${date}.csv`, headers, rows);
  }, [getWinnersList]);

  const exportLosersCSV = useCallback((eventName?: string) => {
    if (!lastResult) return;
    const date = new Date().toISOString().slice(0, 10);
    const name = eventName || 'イベント';

    const loserIds = new Set(lastResult.unassigned);
    const losers = applications.filter((app) => loserIds.has(app.id));

    const headers = ['会員番号', '氏名', '人数', '住所'];
    const rows = losers.map((l) => [l.memberId, l.name, String(l.groupSize), l.address]);

    downloadCSV(`発送用_落選者_${name}_${date}.csv`, headers, rows);
  }, [lastResult, applications]);

  const exportNextEventCSV = useCallback((eventName?: string) => {
    if (scoreUpdates.length === 0) return;
    const date = new Date().toISOString().slice(0, 10);
    const name = eventName || 'イベント';

    const headers = ['会員番号', '氏名', 'タグ', 'スコア', '前回結果', '同伴者数'];
    const rows: string[][] = [];

    for (const update of scoreUpdates) {
      const app = applications.find((a) => a.id === update.applicationId);
      if (!app) continue;

      rows.push([
        app.memberId, app.name, (app.tags ?? []).join(';'),
        update.nextScore.toFixed(1), update.lastResult, String(app.groupSize),
      ]);
    }

    downloadCSV(`顧客更新用_${name}_${date}.csv`, headers, rows);
  }, [scoreUpdates, applications]);

  return {
    applications, assignments, stagePosition, skillWeight, seatAssignmentMap,
    lockedSeats, lockingState, lastResult, scoreUpdates,
    setStagePosition, setSkillWeight, generateMockData, loadFromCustomers,
    setApplications, runLottery, reset, getAssignmentForSeat, getWinnersList,
    startLocking, cancelLocking, handleLockSeatClick, unlockCustomer,
    exportWinnersCSV, exportLosersCSV, exportNextEventCSV,
  };
}
