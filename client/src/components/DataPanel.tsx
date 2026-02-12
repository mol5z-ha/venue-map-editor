/**
 * DataPanel Component - Save/Load venue data
 * Blueprint Technical Design System
 */

import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Download, Upload, FileJson, Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { loadVenueData } from '@/lib/venueUtils';
import type { SeatBlock } from '@/types/venue';

interface DataPanelProps {
  onExport: (name: string) => void;
  onImport: (blocks: SeatBlock[]) => void;
  onClear: () => void;
  hasData: boolean;
}

export function DataPanel({ onExport, onImport, onClear, hasData }: DataPanelProps) {
  const [venueName, setVenueName] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExport = () => {
    onExport(venueName || 'venue-data');
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const data = await loadVenueData(file);
      onImport(data.blocks);
      setVenueName(data.name);
    } catch (error) {
      alert('JSONファイルの読み込みに失敗しました');
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
          <FileJson className="w-4 h-4 text-primary" />
        </div>
        <h3 className="font-bold text-sm text-foreground">データ管理</h3>
      </div>

      <div className="space-y-3">
        <div>
          <Label htmlFor="venueName" className="text-xs font-medium text-muted-foreground">
            会場名
          </Label>
          <Input
            id="venueName"
            type="text"
            placeholder="例: 東京ドーム"
            value={venueName}
            onChange={(e) => setVenueName(e.target.value)}
            className="mt-1"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="default"
            size="sm"
            className="shadow-sm"
            onClick={handleExport}
            disabled={!hasData}
          >
            <Download className="w-3.5 h-3.5 mr-1.5" />
            保存
          </Button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileChange}
            className="hidden"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="w-3.5 h-3.5 mr-1.5" />
            読込
          </Button>
        </div>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-destructive/70 hover:text-destructive hover:bg-destructive/10 text-xs"
              disabled={!hasData}
            >
              <Trash2 className="w-3.5 h-3.5 mr-1.5" />
              すべてクリア
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>データをクリアしますか？</AlertDialogTitle>
              <AlertDialogDescription>
                すべてのブロックと背景画像が削除されます。この操作は取り消せません。
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>キャンセル</AlertDialogCancel>
              <AlertDialogAction
                onClick={onClear}
                className="bg-destructive hover:bg-destructive/90"
              >
                クリア
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
