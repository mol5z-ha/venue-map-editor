/**
 * BlockGenerator Component - Form for creating new seat blocks
 * Blueprint Technical Design System
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Grid3X3 } from 'lucide-react';
import type { BlockGeneratorForm } from '@/types/venue';

interface BlockGeneratorProps {
  onAddBlock: (form: BlockGeneratorForm) => void;
}

export function BlockGenerator({ onAddBlock }: BlockGeneratorProps) {
  const [form, setForm] = useState<BlockGeneratorForm>({
    name: '',
    rows: 5,
    cols: 10,
    seatSize: 20,
    seatGap: 4,
    skewX: 0, // 生成時は0固定、生成後にBlockListから調整
    staggerX: 0,
    curveRadius: 0,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (form.rows > 0 && form.cols > 0) {
      onAddBlock(form);
      setForm(prev => ({ ...prev, name: '' }));
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
          <Grid3X3 className="w-4 h-4 text-primary" />
        </div>
        <h3 className="font-bold text-sm text-foreground">ブロック追加</h3>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <Label htmlFor="blockName" className="text-xs font-medium text-muted-foreground">
            ブロック名
          </Label>
          <Input
            id="blockName"
            type="text"
            placeholder="例: A-Block"
            value={form.name}
            onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
            className="mt-1"
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label htmlFor="rows" className="text-xs font-medium text-muted-foreground">
              行数
            </Label>
            <Input
              id="rows"
              type="number"
              min={1}
              max={50}
              value={form.rows}
              onChange={(e) => setForm(prev => ({ ...prev, rows: parseInt(e.target.value) || 1 }))}
              className="mt-1 mono text-center"
            />
          </div>
          <div>
            <Label htmlFor="cols" className="text-xs font-medium text-muted-foreground">
              列数
            </Label>
            <Input
              id="cols"
              type="number"
              min={1}
              max={100}
              value={form.cols}
              onChange={(e) => setForm(prev => ({ ...prev, cols: parseInt(e.target.value) || 1 }))}
              className="mt-1 mono text-center"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label htmlFor="seatSize" className="text-xs font-medium text-muted-foreground">
              座席サイズ
            </Label>
            <Input
              id="seatSize"
              type="number"
              min={10}
              max={50}
              value={form.seatSize}
              onChange={(e) => setForm(prev => ({ ...prev, seatSize: parseInt(e.target.value) || 20 }))}
              className="mt-1 mono text-center"
            />
          </div>
          <div>
            <Label htmlFor="seatGap" className="text-xs font-medium text-muted-foreground">
              間隔
            </Label>
            <Input
              id="seatGap"
              type="number"
              min={0}
              max={20}
              value={form.seatGap}
              onChange={(e) => setForm(prev => ({ ...prev, seatGap: parseInt(e.target.value) || 0 }))}
              className="mt-1 mono text-center"
            />
          </div>
        </div>

        <div className="flex items-center justify-between pt-1 pb-1">
          <span className="text-xs text-muted-foreground">生成座席数</span>
          <span className="text-sm font-bold text-primary mono">{form.rows * form.cols} 席</span>
        </div>

        <Button type="submit" className="w-full shadow-sm hover:shadow-md transition-shadow" size="sm">
          <Plus className="w-4 h-4 mr-1.5" />
          ブロックを追加
        </Button>
      </form>
    </div>
  );
}
