/**
 * ModeToolbar Component - Bottom toolbar for mode switching
 * Blueprint Technical Design System
 * * Update: Layout fix
 * - Changed position from 'fixed' to 'absolute' to contain it within the canvas area
 * - Removed backdrop blur and adjusted borders for seamless integration
 */

import { Button } from '@/components/ui/button';
import { MousePointer2, Star, Ban, HelpCircle, Dices, Undo2 } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { EditorMode } from '@/types/venue';

interface ModeToolbarProps {
  mode: EditorMode;
  onModeChange: (mode: EditorMode) => void;
  stats: {
    total: number;
    active: number;
    disabled: number;
    premium: number;
    normal: number;
  };
  onUndo: () => void;
  canUndo: boolean;
}

const modes: { id: EditorMode; label: string; icon: React.ReactNode; description: string }[] = [
  {
    id: 'normal',
    label: '通常モード',
    icon: <MousePointer2 className="w-5 h-5" />,
    description: 'ブロックの移動・回転ができます',
  },
  {
    id: 'premium',
    label: 'プレミアム設定',
    icon: <Star className="w-5 h-5" />,
    description: 'クリックでプレミアム席を設定/解除',
  },
  {
    id: 'disable',
    label: '無効化モード',
    icon: <Ban className="w-5 h-5" />,
    description: '座席をクリックして無効化/有効化（通路など）。もう一度クリックで復活',
  },
  {
    id: 'lottery',
    label: '抽選モード',
    icon: <Dices className="w-5 h-5" />,
    description: 'ステージ位置を設定して座席抽選を実行',
  },
];

export function ModeToolbar({ mode, onModeChange, stats, onUndo, canUndo }: ModeToolbarProps) {
  return (
    // Changed fixed -> absolute to stay inside main canvas container
    <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-auto max-w-[90%] z-50">
      <div className="bg-card/80 backdrop-blur-md border border-border rounded-full shadow-lg px-6 py-2">
        <div className="flex items-center gap-6">
          
          {/* Mode buttons group */}
          <div className="flex items-center gap-1">
            {modes.map((m) => (
              <Tooltip key={m.id}>
                <TooltipTrigger asChild>
                  <Button
                    variant={mode === m.id ? 'default' : 'ghost'}
                    size="sm"
                    className={`
                      rounded-full px-4 h-9 gap-2 transition-all duration-200
                      ${mode === m.id 
                        ? 'shadow-md' 
                        : 'text-muted-foreground hover:text-foreground'
                      }
                      ${m.id === 'premium' && mode === m.id
                        ? 'bg-[#d69e2e] hover:bg-[#b7791f] text-black ring-2 ring-[#d69e2e]/20'
                        : ''
                      }
                      ${m.id === 'disable' && mode === m.id
                        ? 'bg-orange-600 hover:bg-orange-700 ring-2 ring-orange-600/20'
                        : ''
                      }
                      ${m.id === 'lottery' && mode === m.id
                        ? 'bg-emerald-600 hover:bg-emerald-700 ring-2 ring-emerald-600/20'
                        : ''
                      }
                    `}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onModeChange(m.id);
                    }}
                  >
                    {m.icon}
                    <span className="hidden sm:inline font-medium">{m.label}</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs mb-2">
                  <p className="font-medium">{m.label}</p>
                  <p className="text-xs text-muted-foreground mt-1">{m.description}</p>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>

          {/* Undo button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="rounded-full px-3 h-9 gap-2 text-muted-foreground hover:text-foreground disabled:opacity-30"
                disabled={!canUndo}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onUndo();
                }}
              >
                <Undo2 className="w-5 h-5" />
                <span className="hidden sm:inline text-xs">元に戻す</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="mb-2">
              <p className="font-medium">元に戻す</p>
              <p className="text-xs text-muted-foreground mt-1">Ctrl+Z</p>
            </TooltipContent>
          </Tooltip>

          {/* Divider */}
          <div className="h-6 w-px bg-border" />

          {/* Minimal Stats */}
          <div className="flex items-center gap-3 text-xs whitespace-nowrap">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-[#d69e2e]" />
              <span className="mono font-medium">{stats.premium}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-muted-foreground">計:</span>
              <span className="mono font-medium text-foreground">{stats.active}</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
