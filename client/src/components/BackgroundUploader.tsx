/**
 * BackgroundUploader Component - Upload and configure background image
 * Blueprint Technical Design System
 */

import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Image, Upload, X } from 'lucide-react';
import type { BackgroundImage } from '@/types/venue';

interface BackgroundUploaderProps {
  backgroundImage: BackgroundImage | null;
  onSetBackground: (image: BackgroundImage | null) => void;
  onUpdateOpacity: (opacity: number) => void;
}

export function BackgroundUploader({
  backgroundImage,
  onSetBackground,
  onUpdateOpacity,
}: BackgroundUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('画像ファイルを選択してください');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new window.Image();
      img.onload = () => {
        onSetBackground({
          src: event.target?.result as string,
          width: img.width,
          height: img.height,
          opacity: 0.5,
        });
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
          <Image className="w-4 h-4 text-primary" />
        </div>
        <h3 className="font-bold text-sm text-foreground">背景画像</h3>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileChange}
        className="hidden"
      />

      {!backgroundImage ? (
        <button
          className="w-full border-2 border-dashed border-border rounded-lg p-6 hover:border-primary/50 hover:bg-primary/5 transition-all group"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="w-5 h-5 text-muted-foreground group-hover:text-primary mx-auto mb-2 transition-colors" />
          <p className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">画像をアップロード</p>
          <p className="text-[10px] text-muted-foreground/50 mt-1">JPG / PNG / WebP</p>
        </button>
      ) : (
        <div className="space-y-3">
          <div className="relative aspect-video bg-muted/30 rounded-lg overflow-hidden border border-border">
            <img
              src={backgroundImage.src}
              alt="Background preview"
              className="w-full h-full object-contain"
              style={{ opacity: backgroundImage.opacity }}
            />
            <Button
              variant="destructive"
              size="icon"
              className="absolute top-1.5 right-1.5 h-6 w-6 rounded-full shadow-md"
              onClick={() => onSetBackground(null)}
            >
              <X className="w-3 h-3" />
            </Button>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs font-medium text-muted-foreground">不透明度</Label>
              <span className="mono text-xs font-bold text-primary">
                {Math.round(backgroundImage.opacity * 100)}%
              </span>
            </div>
            <Slider
              value={[backgroundImage.opacity]}
              min={0.1}
              max={1}
              step={0.05}
              onValueChange={([value]) => onUpdateOpacity(value)}
              className="w-full"
            />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[10px] text-muted-foreground mono">
              {backgroundImage.width} x {backgroundImage.height}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-3 h-3 mr-1" />
              変更
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
