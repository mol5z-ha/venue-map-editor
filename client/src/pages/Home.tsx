/**
 * Home Page - Venue Map Editor
 * 3層構造抽選対応
 */

import { useState } from 'react';
import { VenueCanvas } from '@/components/VenueCanvas';
import { BlockGenerator } from '@/components/BlockGenerator';
import { BlockList } from '@/components/BlockList';
import { BackgroundUploader } from '@/components/BackgroundUploader';
import { DataPanel } from '@/components/DataPanel';
import { ModeToolbar } from '@/components/ModeToolbar';
import LotteryPanel from '@/components/LotteryPanel';
import { WinnersList } from '@/components/WinnersList';
import { CustomerManager } from '@/components/CustomerManager';
import { useVenueEditor } from '@/hooks/useVenueEditor';
import { useLottery } from '@/hooks/useLottery';
import { useCustomerDB } from '@/hooks/useCustomerDB';
import { useAuth } from '@/contexts/AuthContext';
import type { Customer } from '@/types/customer';
import { MapPin, LayoutGrid, Users, LogOut } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';
import { toast } from 'sonner';

type MainTab = 'venue' | 'customers';

export default function Home() {
  const [mainTab, setMainTab] = useState<MainTab>('venue');
  const { user, signOut } = useAuth();

  const {
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
  } = useVenueEditor();

  const {
    applications,
    assignments,
    stagePosition,
    skillWeight,
    seatAssignmentMap,
    lockedSeats,
    lockingState,
    lastResult,
    setStagePosition,
    setSkillWeight,
    loadFromCustomers,
    runLottery,
    reset: resetLottery,
    getWinnersList,
    startLocking,
    cancelLocking,
    handleLockSeatClick,
    unlockCustomer,
    exportWinnersCSV,
    exportLosersCSV,
    exportNextEventCSV,
  } = useLottery();

  const { customers, reload: reloadCustomers } = useCustomerDB();

  // 抽選モードでのロック配置中は座席クリックをロック処理に流す
  const handleSeatClickForCanvas = (blockId: string, seatId: string) => {
    if (mode === 'lottery' && lockingState) {
      handleLockSeatClick(seatId);
    } else {
      handleSeatClick(blockId, seatId);
    }
  };

  // ロック済み全座席IDセット（キャンバス表示用）
  const lockedSeatIdsSet = new Set(lockedSeats.flatMap((ls) => ls.seatIds));
  // 配置途中の座席も含める
  if (lockingState) {
    for (const id of lockingState.placedSeatIds) {
      lockedSeatIdsSet.add(id);
    }
  }

  const handleLoadFromCustomers = (selectedCustomers: Customer[], groupSizes: Map<string, number>) => {
    loadFromCustomers(selectedCustomers, groupSizes);
    toast.success(`${selectedCustomers.length}名の顧客を応募者として読み込みました`);
  };

  const handleRunLottery = () => {
    if (blocks.length === 0) {
      toast.error('座席ブロックがありません');
      return;
    }
    const result = runLottery(blocks);
    if (result) {
      const total = result.stats.tier1Count + result.stats.tier2Count + result.stats.tier3Count;
      toast.success(
        `抽選完了: ${total}件当選 (T1:${result.stats.tier1Count} / T2:${result.stats.tier2Count} / T3:${result.stats.tier3Count}) / 落選:${result.unassigned.length}件`,
      );
    } else {
      toast.error('抽選に失敗しました');
    }
  };

  const handleResetLottery = () => {
    resetLottery();
    toast.info('抽選結果をリセットしました');
  };

  const handleExportWinnersCSV = () => {
    exportWinnersCSV(blocks);
    toast.success('当選者CSVをダウンロードしました');
  };

  const handleExportLosersCSV = () => {
    exportLosersCSV();
    toast.success('落選者CSVをダウンロードしました');
  };

  const handleExportNextEventCSV = () => {
    exportNextEventCSV();
    toast.success('次回用CSVをダウンロードしました');
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      toast.success('ログアウトしました');
    } catch {
      toast.error('ログアウトに失敗しました');
    }
  };

  const winners = getWinnersList(blocks);
  const isLotteryMode = mode === 'lottery';

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Header */}
      <header className="h-14 bg-card border-b border-border flex items-center px-5 shrink-0 z-50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center shadow-sm">
            <MapPin className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="font-bold text-foreground leading-tight tracking-tight">Venue Map Editor</h1>
            <p className="text-[11px] text-muted-foreground/70">座席表レイアウト作成ツール</p>
          </div>
        </div>

        <div className="ml-8 flex items-center gap-1 bg-muted/40 rounded-xl p-1">
          <button
            onClick={() => { setMainTab('venue'); reloadCustomers(); }}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
              mainTab === 'venue'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
            座席表
          </button>
          <button
            onClick={() => { setMainTab('customers'); reloadCustomers(); }}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-sm font-semibold transition-all duration-200 ${
              mainTab === 'customers'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Users className="w-4 h-4" />
            顧客リスト
            {customers.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold mono bg-primary/10 text-primary">
                {customers.length}
              </span>
            )}
          </button>
        </div>

        <div className="ml-auto flex items-center gap-3">
          <ThemeToggle />
          {user && (
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground/70 hidden sm:inline">{user.email}</span>
              <button
                onClick={handleSignOut}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground border border-border hover:border-border/80 rounded-lg transition-all duration-200"
              >
                <LogOut className="w-3.5 h-3.5" />
                ログアウト
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      {mainTab === 'venue' ? (
        <div className="flex-1 flex overflow-hidden">
          {/* 左サイドバー */}
          <aside className="w-72 bg-sidebar border-r border-sidebar-border p-3 overflow-y-auto shrink-0 z-40">
            <div className="space-y-3">
              {!isLotteryMode && (
                <>
                  <BlockGenerator onAddBlock={addBlock} />
                  <BlockList
                    blocks={blocks}
                    selectedBlockId={selectedBlockId}
                    onSelectBlock={selectBlock}
                    onDeleteBlock={deleteBlock}
                    onRotateBlock={updateBlockRotation}
                    onRenameBlock={updateBlockName}
                    onSkewBlock={updateBlockSkewX}
                    onStaggerBlock={updateBlockStaggerX}
                    onSaveSnapshot={saveSnapshot}
                  />
                  <BackgroundUploader
                    backgroundImage={backgroundImage}
                    onSetBackground={setBackgroundImage}
                    onUpdateOpacity={updateBackgroundOpacity}
                  />
                  <DataPanel
                    onExport={exportData}
                    onImport={importData}
                    onClear={clearAll}
                    hasData={blocks.length > 0}
                  />
                </>
              )}

              {isLotteryMode && (
                <LotteryPanel
                  applications={applications}
                  assignments={assignments}
                  skillWeight={skillWeight}
                  customers={customers}
                  lastResult={lastResult}
                  lockedSeats={lockedSeats}
                  lockingState={lockingState}
                  onRunLottery={handleRunLottery}
                  onReset={handleResetLottery}
                  onSkillWeightChange={setSkillWeight}
                  onLoadFromCustomers={handleLoadFromCustomers}
                  onStartLocking={startLocking}
                  onCancelLocking={cancelLocking}
                  onUnlockCustomer={unlockCustomer}
                />
              )}
            </div>
          </aside>

          {/* 中央キャンバス */}
          <main className="flex-1 relative bg-background overflow-hidden">
            <VenueCanvas
              blocks={blocks}
              backgroundImage={backgroundImage}
              selectedBlockId={selectedBlockId}
              mode={mode}
              scale={scale}
              onSelectBlock={selectBlock}
              onUpdateBlockPosition={updateBlockPosition}
              onUpdateBlockRotation={updateBlockRotation}
              onUpdateBlockScale={updateBlockScale}
              onSeatClick={handleSeatClickForCanvas}
              onScaleChange={setScale}
              onSaveSnapshot={saveSnapshot}
              stagePosition={stagePosition}
              onStagePositionChange={setStagePosition}
              seatAssignmentMap={seatAssignmentMap}
              isLocking={!!lockingState}
              lockedSeatIds={lockedSeatIdsSet}
            />

            {blocks.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center max-w-md px-8">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-5 shadow-sm">
                    <MapPin className="w-8 h-8 text-primary" />
                  </div>
                  <h2 className="text-xl font-bold text-foreground mb-2 tracking-tight">座席ブロックを追加しましょう</h2>
                  <p className="text-muted-foreground/70 text-sm leading-relaxed">
                    左側のパネルから行数・列数を指定して<br />ブロックを追加してください。
                  </p>
                </div>
              </div>
            )}

            <ModeToolbar mode={mode} onModeChange={setMode} stats={stats} onUndo={undo} canUndo={canUndo} />
          </main>

          {/* 右サイドバー（抽選モード時のみ） */}
          {isLotteryMode && (
            <aside className="w-96 bg-sidebar border-l border-sidebar-border shrink-0 flex flex-col overflow-hidden z-40 transition-all duration-300 ease-in-out">
              <WinnersList
                winners={winners}
                applications={applications}
                assignments={assignments}
                onExportWinnersCSV={handleExportWinnersCSV}
                onExportLosersCSV={handleExportLosersCSV}
                onExportNextEventCSV={handleExportNextEventCSV}
              />
            </aside>
          )}
        </div>
      ) : (
        <CustomerManager />
      )}
    </div>
  );
}
