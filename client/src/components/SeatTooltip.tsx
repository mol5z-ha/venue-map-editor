/**
 * SeatTooltip Component
 * 抽選結果のツールチップ表示
 * 
 * Blueprint Technical Design System
 * - 黒背景に白文字
 * - pointer-events-none で操作の邪魔にならない
 * - VenueCanvas内のrelativeコンテナに配置されるため、absoluteで位置指定
 */

import type { LotteryAssignment, SeatQuality } from '@/types/venue';

interface SeatTooltipProps {
  assignment: LotteryAssignment;
  x: number;
  y: number;
}

const TIER_LABELS: Record<number, { label: string; color: string }> = {
  0: { label: '関係者', color: 'text-purple-400' },
  1: { label: '優待券', color: 'text-yellow-600' },
  2: { label: '救済', color: 'text-cyan-400' },
  3: { label: 'バトル', color: 'text-blue-400' },
};

const QUALITY_LABELS: Record<SeatQuality, { label: string; color: string }> = {
  top: { label: '神席', color: 'text-yellow-400' },
  good: { label: '良席', color: 'text-green-400' },
  normal: { label: '普通席', color: 'text-blue-400' },
  back: { label: '後方席', color: 'text-orange-400' },
  far: { label: '最後方', color: 'text-red-400' },
};

export function SeatTooltip({ assignment, x, y }: SeatTooltipProps) {
  const tierInfo = TIER_LABELS[assignment.tier] ?? TIER_LABELS[3];
  const displayName = assignment.name || assignment.applicationId;

  return (
    <div
      className="absolute z-50 pointer-events-none"
      style={{
        left: x + 12,
        top: y - 8,
        transform: 'translateY(-100%)',
      }}
    >
      <div className="bg-gray-900/95 text-white text-xs rounded-lg px-3 py-2 shadow-lg border border-gray-700 min-w-[160px]">
        {/* メイン: 氏名 */}
        <div className="flex items-center gap-2 mb-1.5 pb-1.5 border-b border-gray-700">
          <div
            className="w-2.5 h-2.5 rounded-full shrink-0"
            style={{ backgroundColor: assignment.color }}
          />
          <span className="font-semibold truncate">{displayName}</span>
        </div>

        {/* サブ: 会員番号 */}
        {assignment.memberId && (
          <div className="flex justify-between items-center mb-1">
            <span className="text-gray-400">会員番号:</span>
            <span className="font-mono text-gray-300">{assignment.memberId}</span>
          </div>
        )}

        {/* Tier */}
        <div className="flex justify-between items-center mb-1">
          <span className="text-gray-400">Tier:</span>
          <span className={tierInfo.color + ' font-medium'}>{tierInfo.label}</span>
        </div>

        {/* 座席品質 */}
        {assignment.seatQuality && (
          <div className="flex justify-between items-center mb-1">
            <span className="text-gray-400">座席:</span>
            <span className={QUALITY_LABELS[assignment.seatQuality].color + ' font-medium'}>
              {QUALITY_LABELS[assignment.seatQuality].label}
            </span>
          </div>
        )}

        {/* グループサイズ */}
        {assignment.groupSize > 1 && (
          <div className="flex justify-between items-center mb-1">
            <span className="text-gray-400">人数:</span>
            <span>{assignment.groupSize}名</span>
          </div>
        )}

        {/* スコア */}
        <div className="flex justify-between items-center">
          <span className="text-gray-400">スコア:</span>
          <span className="font-mono">{assignment.pastScore.toFixed(1)}</span>
        </div>
      </div>

      {/* 吹き出しの矢印 */}
      <div
        className="absolute left-3 bottom-0 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-l-transparent border-r-transparent border-t-gray-900/95"
        style={{ transform: 'translateY(100%)' }}
      />
    </div>
  );
}
