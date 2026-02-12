/**
 * LotteryPanel - 抽選モード用サイドパネル
 * 3層構造対応: Tier統計、skillWeight設定、救済枠表示
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Dices, Play, RotateCcw, Users, Crown, Database, Search, Check, Shield, Swords, Heart, Zap, TrendingUp, Lock, X, MapPin, UserCheck } from 'lucide-react';
import type { LotteryApplication, LotteryAssignment, LockedSeat } from '@/types/venue';
import type { Customer } from '@/types/customer';
import type { LotteryResult } from '@/core/lottery';

/** 関係者ロック配置中の状態 */
interface LockingState {
  customer: Customer;
  remainingSeats: number;
  placedSeatIds: string[];
}

interface LotteryPanelProps {
  applications: LotteryApplication[];
  assignments: LotteryAssignment[];
  skillWeight: number;
  customers: Customer[];
  lastResult: LotteryResult | null;
  lockedSeats: LockedSeat[];
  lockingState: LockingState | null;
  onRunLottery: () => void;
  onReset: () => void;
  onSkillWeightChange: (value: number) => void;
  onLoadFromCustomers: (customers: Customer[], groupSizes: Map<string, number>) => void;
  onStartLocking: (customer: Customer) => void;
  onCancelLocking: () => void;
  onUnlockCustomer: (customerId: string) => void;
}

export default function LotteryPanel({
  applications,
  assignments,
  skillWeight,
  customers,
  lastResult,
  lockedSeats,
  lockingState,
  onRunLottery,
  onReset,
  onSkillWeightChange,
  onLoadFromCustomers,
  onStartLocking,
  onCancelLocking,
  onUnlockCustomer,
}: LotteryPanelProps) {
  const [isCustomerSelectOpen, setIsCustomerSelectOpen] = useState(false);
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<Set<string>>(new Set());
  const [groupSizes, setGroupSizes] = useState<Map<string, number>>(new Map());
  const [searchQuery, setSearchQuery] = useState('');

  const invitationCount = applications.filter((a) => a.isInvitation).length;
  const relationCount = applications.filter((a) => a.isRelation).length;
  const rescueCount = applications.filter((a) => a.lastResult === 'lose' && !a.isInvitation && !a.isRelation).length;
  const totalPeople = applications.reduce((sum, a) => sum + a.groupSize, 0);

  // 関係者タグの顧客 (ロック済みは除外して薄く表示するため分ける)
  const relationCustomers = customers.filter((c) => c.tags.includes('relation'));
  const lockedCustomerIds = new Set(lockedSeats.map((ls) => ls.customerId));

  const openCustomerSelect = () => {
    setSelectedCustomerIds(new Set());
    setGroupSizes(new Map());
    setSearchQuery('');
    setIsCustomerSelectOpen(true);
  };

  const toggleCustomer = (customerId: string) => {
    const newSet = new Set(selectedCustomerIds);
    if (newSet.has(customerId)) {
      newSet.delete(customerId);
      const newSizes = new Map(groupSizes);
      newSizes.delete(customerId);
      setGroupSizes(newSizes);
    } else {
      newSet.add(customerId);
      const newSizes = new Map(groupSizes);
      newSizes.set(customerId, 1);
      setGroupSizes(newSizes);
    }
    setSelectedCustomerIds(newSet);
  };

  const updateGroupSize = (customerId: string, size: number) => {
    const newSizes = new Map(groupSizes);
    newSizes.set(customerId, Math.max(1, Math.min(10, size)));
    setGroupSizes(newSizes);
  };

  const toggleSelectAll = () => {
    if (selectedCustomerIds.size === filteredCustomers.length) {
      setSelectedCustomerIds(new Set());
      setGroupSizes(new Map());
    } else {
      const newSet = new Set(filteredCustomers.map((c) => c.id));
      const newSizes = new Map<string, number>();
      filteredCustomers.forEach((c) => newSizes.set(c.id, groupSizes.get(c.id) ?? c.groupSize ?? 1));
      setSelectedCustomerIds(newSet);
      setGroupSizes(newSizes);
    }
  };

  const handleLoadSelected = () => {
    const selectedCustomers = customers.filter((c) => selectedCustomerIds.has(c.id));
    onLoadFromCustomers(selectedCustomers, groupSizes);
    setIsCustomerSelectOpen(false);
  };

  const filteredCustomers = customers.filter((c) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      c.name.toLowerCase().includes(query) ||
      c.memberId.toLowerCase().includes(query) ||
      c.tags.some((t) => t.toLowerCase().includes(query))
    );
  });

  return (
    <>
      <div className="space-y-3">
        {/* ヘッダー */}
        <div className="flex items-center gap-2.5 px-1">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center">
            <Dices className="w-4.5 h-4.5 text-emerald-500" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-foreground">抽選モード</h3>
            <p className="text-[10px] text-muted-foreground">3層構造抽選アルゴリズム</p>
          </div>
        </div>

        {/* 関係者席固定セクション */}
        {relationCustomers.length > 0 && (
          <div className="rounded-xl border border-purple-500/30 bg-purple-500/5 p-3 space-y-2.5">
            <div className="flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-purple-500" />
              <h4 className="text-xs font-bold text-foreground">関係者席を固定</h4>
              {lockedSeats.length > 0 && (
                <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-purple-500/15 text-purple-500">
                  {lockedSeats.length}件
                </span>
              )}
            </div>

            {/* 配置中バナー */}
            {lockingState && (
              <div className="rounded-lg bg-purple-500/15 border border-purple-500/30 p-2.5 space-y-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3 h-3 text-purple-400 animate-pulse" />
                    <span className="text-[11px] font-bold text-purple-400">席を選択中...</span>
                  </div>
                  <button
                    onClick={onCancelLocking}
                    className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-0.5 transition-colors"
                  >
                    <X className="w-3 h-3" />
                    キャンセル
                  </button>
                </div>
                <div className="text-[11px] text-foreground">
                  <span className="font-semibold">{lockingState.customer.name}</span>
                  <span className="text-muted-foreground ml-1">
                    （残り <span className="font-bold text-purple-400 mono">{lockingState.remainingSeats}</span> 席）
                  </span>
                </div>
                {lockingState.placedSeatIds.length > 0 && (
                  <div className="text-[10px] text-muted-foreground">
                    配置済み: {lockingState.placedSeatIds.length} / {lockingState.customer.groupSize ?? 1}
                  </div>
                )}
              </div>
            )}

            {/* 関係者リスト */}
            {!lockingState && (
              <div className="space-y-1">
                {relationCustomers.map((customer) => {
                  const isLocked = lockedCustomerIds.has(customer.id);
                  const lockedInfo = lockedSeats.find((ls) => ls.customerId === customer.id);

                  return (
                    <div
                      key={customer.id}
                      className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-all ${
                        isLocked
                          ? 'bg-purple-500/10 border border-purple-500/20'
                          : 'hover:bg-muted/50 border border-transparent'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          {isLocked ? (
                            <UserCheck className="w-3 h-3 text-purple-400 shrink-0" />
                          ) : (
                            <Shield className="w-3 h-3 text-purple-400/50 shrink-0" />
                          )}
                          <span className={`font-medium truncate ${isLocked ? 'text-purple-400' : 'text-foreground'}`}>
                            {customer.name}
                          </span>
                          <span className="text-[10px] text-muted-foreground shrink-0">
                            {customer.groupSize ?? 1}名
                          </span>
                        </div>
                        {isLocked && lockedInfo && (
                          <div className="text-[10px] text-purple-400/70 ml-4.5 mt-0.5">
                            {lockedInfo.seatIds.length}席配置済み
                          </div>
                        )}
                      </div>

                      {isLocked ? (
                        <button
                          onClick={() => onUnlockCustomer(customer.id)}
                          className="text-[10px] text-muted-foreground hover:text-destructive px-1.5 py-0.5 rounded transition-colors shrink-0"
                          title="ロック解除"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      ) : (
                        <button
                          onClick={() => onStartLocking(customer)}
                          className="text-[10px] font-medium text-purple-500 hover:text-purple-400 px-2 py-0.5 rounded-md bg-purple-500/10 hover:bg-purple-500/20 transition-all shrink-0"
                        >
                          配置
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {!lockingState && relationCustomers.length > 0 && (
              <p className="text-[10px] text-muted-foreground/60 leading-relaxed">
                「配置」をクリック → キャンバス上の席をクリックして固定
              </p>
            )}
          </div>
        )}

        {/* 応募者統計 */}
        {applications.length > 0 ? (
          <div className="rounded-xl border border-border bg-card p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">応募者データ</span>
              <span className="text-xs font-bold text-foreground mono">{applications.length}件 / {totalPeople}名</span>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              <StatChip icon={Crown} label="優待券" count={invitationCount} color="yellow" />
              <StatChip icon={Shield} label="関係者" count={relationCount} color="purple" />
              <StatChip icon={Heart} label="救済" count={rescueCount} color="cyan" />
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border bg-muted/30 p-4 text-center">
            <Users className="w-5 h-5 text-muted-foreground mx-auto mb-1.5" />
            <p className="text-xs text-muted-foreground">応募者データがありません</p>
            <p className="text-[10px] text-muted-foreground/70 mt-0.5">顧客リストから読み込んでください</p>
          </div>
        )}

        {/* 実力の重み設定 */}
        <div className="rounded-xl border border-border bg-card p-3 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5 text-muted-foreground" />
              <Label className="text-xs font-medium text-muted-foreground">
                Tier 3 実力の重み
              </Label>
            </div>
            <span className="text-sm font-bold text-primary mono">
              {(skillWeight * 100).toFixed(0)}%
            </span>
          </div>
          <Slider
            value={[skillWeight * 100]}
            onValueChange={(v) => onSkillWeightChange(v[0] / 100)}
            min={0}
            max={100}
            step={10}
            className="w-full"
          />
          <div className="flex justify-between text-[10px] text-muted-foreground/60">
            <span>ランダム重視</span>
            <span>スコア重視</span>
          </div>
        </div>

        {/* アクションボタン */}
        <div className="space-y-1.5">
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-start gap-2.5 h-9 text-xs"
            onClick={openCustomerSelect}
            disabled={customers.length === 0}
          >
            <Database className="w-4 h-4 text-primary" />
            顧客リストから選択
            {customers.length > 0 && (
              <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                {customers.length}名
              </span>
            )}
          </Button>

          <Button
            size="sm"
            className="w-full gap-2.5 h-10 text-sm font-bold shadow-md hover:shadow-lg transition-all"
            onClick={onRunLottery}
            disabled={applications.length === 0}
          >
            <Play className="w-4 h-4" />
            抽選開始
          </Button>

          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2.5 h-8 text-xs text-muted-foreground hover:text-foreground"
            onClick={onReset}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            リセット
          </Button>
        </div>

        {/* 抽選結果 - Tier別統計 */}
        {lastResult && (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3 space-y-2.5">
            <div className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-emerald-500" />
              <h4 className="text-xs font-bold text-foreground">抽選結果</h4>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              <div className="rounded-lg bg-emerald-500/10 p-2 text-center">
                <div className="text-lg font-black text-emerald-600 dark:text-emerald-400 mono">
                  {lastResult.stats.tier1Count + lastResult.stats.tier2Count + lastResult.stats.tier3Count}
                </div>
                <div className="text-[10px] text-muted-foreground">当選件数</div>
              </div>
              <div className="rounded-lg bg-red-500/10 p-2 text-center">
                <div className="text-lg font-black text-red-600 dark:text-red-400 mono">
                  {lastResult.unassigned.length}
                </div>
                <div className="text-[10px] text-muted-foreground">落選件数</div>
              </div>
            </div>

            <div className="space-y-1">
              {lastResult.stats.tier1Count > 0 && (
                <ResultRow icon={Crown} label="Tier 1 (優待券)" count={lastResult.stats.tier1Count} color="text-yellow-600" />
              )}
              {lastResult.stats.tier2Count > 0 && (
                <ResultRow icon={Heart} label="Tier 2 (救済)" count={lastResult.stats.tier2Count} color="text-cyan-500" />
              )}
              {lastResult.stats.tier3Count > 0 && (
                <ResultRow icon={Swords} label="Tier 3 (バトル)" count={lastResult.stats.tier3Count} color="text-blue-500" />
              )}
            </div>

            {lastResult.stats.tier2OverflowCount > 0 && (
              <p className="text-[10px] text-orange-500 bg-orange-500/10 rounded-md px-2 py-1">
                救済枠溢れ: {lastResult.stats.tier2OverflowCount}件（次回も優先）
              </p>
            )}
          </div>
        )}

        {/* 操作説明 */}
        <p className="text-[10px] text-muted-foreground/60 px-1 leading-relaxed">
          STAGEマーカーをドラッグして良席判定の基準点を設定してください。
        </p>
      </div>

      {/* 顧客選択ダイアログ */}
      <Dialog open={isCustomerSelectOpen} onOpenChange={setIsCustomerSelectOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Database className="w-4 h-4 text-primary" />
              </div>
              顧客リストから応募者を選択
            </DialogTitle>
          </DialogHeader>

          <div className="flex items-center gap-2 py-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="名前・会員番号で検索..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
            </div>
            <Button variant="outline" size="sm" onClick={toggleSelectAll}>
              {selectedCustomerIds.size === filteredCustomers.length ? '全解除' : '全選択'}
            </Button>
          </div>

          <div className="flex items-center gap-3 text-sm text-muted-foreground pb-2 border-b">
            <span className="font-medium text-foreground">{selectedCustomerIds.size}名</span>
            <span>選択中</span>
            {selectedCustomerIds.size > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                総人数: {Array.from(selectedCustomerIds).reduce((sum, id) => sum + (groupSizes.get(id) ?? 1), 0)}名
              </span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto space-y-1 py-2">
            {filteredCustomers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">顧客データがありません</div>
            ) : (
              filteredCustomers.map((customer) => {
                const isSelected = selectedCustomerIds.has(customer.id);
                const tags = customer.tags;
                const isInvitation = tags.includes('invitation');
                const isRelation = tags.includes('relation');
                const isRescue = customer.lastResult === 'lose';

                return (
                  <div
                    key={customer.id}
                    className={`flex items-center gap-3 p-2.5 rounded-lg border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-primary/5 border-primary/40 shadow-sm'
                        : 'bg-transparent border-transparent hover:bg-muted/50'
                    }`}
                    onClick={() => toggleCustomer(customer.id)}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleCustomer(customer.id)}
                      onClick={(e) => e.stopPropagation()}
                    />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium text-sm truncate">{customer.name}</span>
                        {isInvitation && (
                          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-yellow-600/15 text-yellow-700 dark:text-yellow-500">優待券</span>
                        )}
                        {isRelation && (
                          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-500/15 text-purple-600 dark:text-purple-400">関係者</span>
                        )}
                        {isRescue && (
                          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/15 text-cyan-600 dark:text-cyan-400">救済</span>
                        )}
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        {customer.memberId} • スコア: {customer.totalScore}
                        {customer.lastResult && ` • 前回: ${customer.lastResult === 'win' ? '当選' : '落選'}`}
                      </div>
                    </div>

                    {isSelected && (
                      <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <Label className="text-[10px] text-muted-foreground whitespace-nowrap">人数</Label>
                        <Input
                          type="number"
                          min={1}
                          max={10}
                          value={groupSizes.get(customer.id) ?? customer.groupSize ?? 1}
                          onChange={(e) => updateGroupSize(customer.id, parseInt(e.target.value) || 1)}
                          className="w-14 h-7 text-center text-xs"
                        />
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          <DialogFooter className="border-t pt-4">
            <Button variant="outline" onClick={() => setIsCustomerSelectOpen(false)}>キャンセル</Button>
            <Button onClick={handleLoadSelected} disabled={selectedCustomerIds.size === 0} className="shadow-md">
              <Check className="w-4 h-4 mr-1.5" />
              {selectedCustomerIds.size}名を読み込む
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

/* サブコンポーネント */

function StatChip({ icon: Icon, label, count, color }: {
  icon: typeof Crown;
  label: string;
  count: number;
  color: 'yellow' | 'purple' | 'cyan';
}) {
  const colorMap = {
    yellow: 'bg-yellow-600/10 text-yellow-700 dark:text-yellow-500',
    purple: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
    cyan: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400',
  };
  return (
    <div className={`rounded-lg p-1.5 text-center ${colorMap[color]}`}>
      <Icon className="w-3 h-3 mx-auto mb-0.5" />
      <div className="text-xs font-bold mono">{count}</div>
      <div className="text-[9px] opacity-70">{label}</div>
    </div>
  );
}

function ResultRow({ icon: Icon, label, count, color }: {
  icon: typeof Crown;
  label: string;
  count: number;
  color: string;
}) {
  return (
    <div className="flex items-center justify-between text-xs">
      <div className={`flex items-center gap-1.5 ${color}`}>
        <Icon className="w-3 h-3" />
        <span className="font-medium">{label}</span>
      </div>
      <span className="font-bold mono">{count}件</span>
    </div>
  );
}
