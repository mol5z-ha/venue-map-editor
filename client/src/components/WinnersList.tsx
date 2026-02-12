/**
 * WinnersList Component
 * 当選者/落選者リスト表示 + 3種CSVエクスポート
 * 3層構造対応: Tier表示、座席品質表示
 */

import { useState, useMemo } from 'react';
import { Download, Trophy, User, MapPin, CreditCard, Frown, Crown, Heart, Swords, Shield, FileDown, Users, ArrowUp } from 'lucide-react';
import type { WinnerInfo, LotteryApplication, LotteryAssignment, SeatQuality } from '@/types/venue';

type ListTab = 'winners' | 'losers';

interface WinnersListProps {
  winners: WinnerInfo[];
  applications: LotteryApplication[];
  assignments: LotteryAssignment[];
  onExportWinnersCSV: () => void;
  onExportLosersCSV: () => void;
  onExportNextEventCSV: () => void;
}

const QUALITY_CONFIG: Record<SeatQuality, { label: string; bg: string; text: string }> = {
  top: { label: '神席', bg: 'bg-amber-500/15', text: 'text-amber-500' },
  good: { label: '良席', bg: 'bg-emerald-500/15', text: 'text-emerald-500' },
  normal: { label: '普通席', bg: 'bg-sky-500/15', text: 'text-sky-500' },
  back: { label: '後方席', bg: 'bg-orange-500/15', text: 'text-orange-500' },
  far: { label: '最後方', bg: 'bg-rose-500/15', text: 'text-rose-500' },
};

const TIER_CONFIG: Record<number, { label: string; icon: typeof Crown; bg: string; text: string; border: string }> = {
  0: { label: '関係者', icon: Shield, bg: 'bg-purple-500/15', text: 'text-purple-400', border: 'border-purple-500/30' },
  1: { label: '優待券', icon: Crown, bg: 'bg-yellow-600/15', text: 'text-yellow-600', border: 'border-yellow-600/30' },
  2: { label: '救済', icon: Heart, bg: 'bg-cyan-500/15', text: 'text-cyan-400', border: 'border-cyan-500/30' },
  3: { label: 'バトル', icon: Swords, bg: 'bg-blue-500/15', text: 'text-blue-400', border: 'border-blue-500/30' },
};

export function WinnersList({
  winners,
  applications,
  assignments,
  onExportWinnersCSV,
  onExportLosersCSV,
  onExportNextEventCSV,
}: WinnersListProps) {
  const [activeTab, setActiveTab] = useState<ListTab>('winners');

  const losers = useMemo(() => {
    const winnerIds = new Set(assignments.map((a) => a.applicationId));
    return applications.filter((app) => !winnerIds.has(app.id));
  }, [applications, assignments]);

  const isWinnersTab = activeTab === 'winners';

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="shrink-0 p-4 border-b border-border">
        {/* タブ切り替え */}
        <div className="flex items-center gap-1 bg-muted/40 rounded-xl p-1 mb-4">
          <button
            onClick={() => setActiveTab('winners')}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ${
              isWinnersTab
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Trophy className={`w-3.5 h-3.5 ${isWinnersTab ? 'text-amber-500' : ''}`} />
            当選者
            {winners.length > 0 && (
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold mono ${
                isWinnersTab
                  ? 'bg-emerald-500/15 text-emerald-600'
                  : 'bg-muted text-muted-foreground'
              }`}>
                {winners.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('losers')}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ${
              !isWinnersTab
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Frown className={`w-3.5 h-3.5 ${!isWinnersTab ? 'text-rose-500' : ''}`} />
            落選者
            {losers.length > 0 && (
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold mono ${
                !isWinnersTab
                  ? 'bg-rose-500/15 text-rose-600'
                  : 'bg-muted text-muted-foreground'
              }`}>
                {losers.length}
              </span>
            )}
          </button>
        </div>

        {/* CSVエクスポートボタン群 */}
        <div className="space-y-2">
          <button
            onClick={onExportWinnersCSV}
            disabled={winners.length === 0}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold bg-primary text-primary-foreground rounded-xl shadow-sm hover:shadow-md hover:bg-primary/90 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
          >
            <Download className="w-4 h-4" />
            発送用CSV（当選者）
          </button>
          <div className="flex gap-2">
            <button
              onClick={onExportLosersCSV}
              disabled={losers.length === 0}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium border border-border rounded-xl hover:bg-muted/50 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <FileDown className="w-3.5 h-3.5" />
              落選者CSV
            </button>
            <button
              onClick={onExportNextEventCSV}
              disabled={winners.length === 0}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-medium border border-border rounded-xl hover:bg-muted/50 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <FileDown className="w-3.5 h-3.5" />
              次回用CSV
            </button>
          </div>
        </div>
      </div>

      {/* Card List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {isWinnersTab ? (
          winners.length === 0 ? (
            <EmptyState type="winners" />
          ) : (
            winners.map((winner, index) => (
              <WinnerCard key={winner.memberId + index} winner={winner} />
            ))
          )
        ) : (
          losers.length === 0 ? (
            <EmptyState type="losers" />
          ) : (
            losers.map((loser, index) => (
              <LoserCard key={loser.id + index} loser={loser} />
            ))
          )
        )}
      </div>
    </div>
  );
}

function EmptyState({ type }: { type: 'winners' | 'losers' }) {
  return (
    <div className="text-center py-12">
      <div className="w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
        {type === 'winners' ? (
          <Trophy className="w-7 h-7 text-muted-foreground/40" />
        ) : (
          <Frown className="w-7 h-7 text-muted-foreground/40" />
        )}
      </div>
      <p className="text-sm font-medium text-muted-foreground/60">
        {type === 'winners' ? (
          <>抽選を実行すると<br />ここに当選者が表示されます</>
        ) : (
          <>落選者はいません</>
        )}
      </p>
    </div>
  );
}

function WinnerCard({ winner }: { winner: WinnerInfo }) {
  const tierCfg = TIER_CONFIG[winner.tier] ?? TIER_CONFIG[3];
  const TierIcon = tierCfg.icon;

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden hover:border-primary/40 transition-all duration-200 hover:shadow-sm">
      {/* 上段: 座席情報バー */}
      <div className="px-3 py-2 bg-primary/5 border-b border-border/50">
        <div className="flex items-center justify-between">
          <span className="font-mono font-bold text-primary text-sm tracking-wide">
            {winner.seatLabel}
          </span>
          <div className="flex items-center gap-1.5">
            {winner.seatQuality && (() => {
              const q = QUALITY_CONFIG[winner.seatQuality];
              return (
                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${q.bg} ${q.text}`}>
                  {q.label}
                </span>
              );
            })()}
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border flex items-center gap-1 ${tierCfg.bg} ${tierCfg.text} ${tierCfg.border}`}>
              <TierIcon className="w-2.5 h-2.5" />
              {tierCfg.label}
            </span>
          </div>
        </div>
      </div>

      {/* 中段: 氏名・会員番号 */}
      <div className="px-3 py-2.5 space-y-1.5">
        <div className="flex items-center gap-2">
          <User className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0" />
          <span className="text-sm font-semibold text-foreground truncate">{winner.name}</span>
          {winner.groupSize > 1 && (
            <span className="flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-blue-500/10 text-blue-500">
              <Users className="w-2.5 h-2.5" />
              {winner.groupSize}名
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <CreditCard className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0" />
          <span className="text-xs font-mono text-muted-foreground">{winner.memberId}</span>
        </div>
      </div>

      {/* 下段: 住所 */}
      {winner.address && (
        <div className="px-3 py-2 bg-muted/20 border-t border-border/50">
          <div className="flex items-start gap-2">
            <MapPin className="w-3 h-3 text-muted-foreground/50 shrink-0 mt-0.5" />
            <span className="text-[11px] text-muted-foreground leading-relaxed break-all">{winner.address}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function LoserCard({ loser }: { loser: LotteryApplication }) {
  const nextScore = Math.min(10, loser.pastScore + 6);

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden hover:border-rose-500/30 transition-all duration-200 hover:shadow-sm">
      {/* 上段: ステータスバー */}
      <div className="px-3 py-1.5 bg-rose-500/5 border-b border-border/50">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-rose-500 flex items-center gap-1">
            <Frown className="w-3 h-3" />
            落選
          </span>
          <span className="text-[10px] font-medium text-cyan-500 flex items-center gap-1">
            <Heart className="w-2.5 h-2.5" />
            次回: 救済枠で優先
          </span>
        </div>
      </div>

      {/* 中段: 人物情報 */}
      <div className="px-3 py-2.5 space-y-1.5">
        <div className="flex items-center gap-2">
          <User className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0" />
          <span className="text-sm font-semibold text-foreground truncate">{loser.name}</span>
          {loser.groupSize > 1 && (
            <span className="flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-md bg-blue-500/10 text-blue-500">
              <Users className="w-2.5 h-2.5" />
              {loser.groupSize}名
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <CreditCard className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0" />
          <span className="text-xs font-mono text-muted-foreground">{loser.memberId}</span>
        </div>

        {/* スコア変動 */}
        <div className="flex items-center gap-2 mt-1">
          <ArrowUp className="w-3 h-3 text-emerald-500 shrink-0" />
          <div className="flex items-center gap-1.5 text-[11px]">
            <span className="mono text-muted-foreground">{loser.pastScore.toFixed(1)}</span>
            <span className="text-muted-foreground/40">→</span>
            <span className="mono font-bold text-emerald-500">{nextScore.toFixed(1)}</span>
            <span className="text-emerald-500/70 text-[10px]">(+6.0)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
