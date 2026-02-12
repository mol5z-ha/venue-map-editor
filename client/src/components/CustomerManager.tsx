/**
 * CustomerManager Component
 * 顧客データ管理UI
 */

import { useState, useMemo, useRef } from 'react';
import { useCustomerDB } from '@/hooks/useCustomerDB';
import type { Customer, CustomerInput, CustomerTag } from '@/types/customer';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Search,
  Plus,
  Upload,
  Download,
  Pencil,
  Trash2,
  Users,
  Loader2,
  AlertCircle,
  History,
} from 'lucide-react';
import { toast } from 'sonner';

// ダミーデータ生成用
const SAMPLE_NAMES = [
  '山田太郎', '佐藤花子', '鈴木一郎', '田中美咲', '高橋健太',
  '伊藤由美', '渡辺大輔', '中村真理', '小林翔太', '加藤恵子',
  '吉田誠', '山本裕子', '松本拓也', '井上明美', '木村浩二',
  '林美穂', '斎藤康平', '清水幸子', '山口達也', '阿部奈々',
];

const SAMPLE_ADDRESSES = [
  '東京都渋谷区神南1-2-3',
  '大阪府大阪市北区梅田4-5-6',
  '神奈川県横浜市中区元町7-8-9',
  '愛知県名古屋市中区栄10-11-12',
  '福岡県福岡市博多区中洲13-14-15',
  '北海道札幌市中央区大通16-17-18',
  '京都府京都市下京区四条19-20-21',
  '兵庫県神戸市中央区三宮22-23-24',
  '広島県広島市中区紙屋町25-26-27',
  '宮城県仙台市青葉区一番町28-29-30',
];

const TAGS = [
  { value: 'invitation' as const, label: '優待券', color: 'bg-yellow-600/20 text-yellow-700 dark:text-yellow-500' },
  { value: 'relation' as const, label: '関係者', color: 'bg-purple-500/20 text-purple-400' },
  { value: 'fanclub' as const, label: 'ファンクラブ', color: 'bg-orange-500/20 text-orange-400' },
];

function generateMemberId(): string {
  const prefix = ['M', 'V', 'G'][Math.floor(Math.random() * 3)];
  const num = Math.floor(Math.random() * 900000) + 100000;
  return `${prefix}-${num}`;
}

function generateDummyCustomer(): CustomerInput {
  const name = SAMPLE_NAMES[Math.floor(Math.random() * SAMPLE_NAMES.length)];
  const address = SAMPLE_ADDRESSES[Math.floor(Math.random() * SAMPLE_ADDRESSES.length)];

  // タグ: 10% 優待券, 5% 関係者, 85% ファンクラブ
  const r = Math.random();
  let tag: CustomerTag = 'fanclub';
  if (r < 0.10) tag = 'invitation';
  else if (r < 0.15) tag = 'relation';

  // スコアは1.0〜10.0のリアルな範囲
  const totalScore = Math.round((Math.random() * 9 + 1) * 10) / 10;

  // グループサイズ: 1人(70%), 2人(20%), 3人(7%), 4人(3%)
  const gr = Math.random();
  let groupSize = 1;
  if (gr > 0.97) groupSize = 4;
  else if (gr > 0.90) groupSize = 3;
  else if (gr > 0.70) groupSize = 2;

  // 前回結果: undefined(70%), win(20%), lose(10%)
  const lr = Math.random();
  const lastResult: 'win' | 'lose' | undefined =
    lr < 0.10 ? 'lose' : lr < 0.30 ? 'win' : undefined;

  return {
    memberId: generateMemberId(),
    name,
    email: `${name.toLowerCase().replace(/\s/g, '.')}@example.com`,
    address,
    tags: [tag],
    history: [],
    totalScore,
    groupSize,
    lastResult,
    lastVisit: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
  };
}

// CSVパース関数
function parseCSV(csvText: string): { headers: string[]; rows: string[][] } {
  const lines = csvText.trim().split(/\r?\n/);
  if (lines.length === 0) {
    return { headers: [], rows: [] };
  }

  // ヘッダー行をパース
  const headers = parseCSVLine(lines[0]);
  
  // データ行をパース
  const rows: string[][] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line) {
      rows.push(parseCSVLine(line));
    }
  }

  return { headers, rows };
}

// CSV行をパース（ダブルクォート対応）
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        // エスケープされたダブルクォート
        current += '"';
        i++;
      } else if (char === '"') {
        // クォート終了
        inQuotes = false;
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        // クォート開始
        inQuotes = true;
      } else if (char === ',') {
        // フィールド区切り
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
  }

  // 最後のフィールド
  result.push(current.trim());

  return result;
}

// タグ文字列をパース（スペース区切りまたはカンマ区切り）
function parseTags(tagStr: string): string[] {
  if (!tagStr) return [];
  // カンマまたはスペースで分割
  return tagStr
    .split(/[,\s]+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);
}

export function CustomerManager() {
  const { customers, loading, error, add, update, remove, bulkAdd, importCustomers, clearAll } = useCustomerDB();
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState<Partial<CustomerInput>>({});
  const [isImporting, setIsImporting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBulkEditOpen, setIsBulkEditOpen] = useState(false);
  const [bulkTag, setBulkTag] = useState<CustomerTag | ''>('');
  const [bulkScore, setBulkScore] = useState<string>('');
  const [bulkGroupSize, setBulkGroupSize] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // タグ値→日本語ラベルのマッピング（検索用）
  const TAG_LABEL_MAP: Record<string, string[]> = {
    invitation: ['invitation', '優待券'],
    relation: ['relation', '関係者'],
    fanclub: ['fanclub', 'ファンクラブ'],
  };

  // フィルタリング
  const filteredCustomers = useMemo(() => {
    if (!searchQuery.trim()) return customers;
    const query = searchQuery.toLowerCase();
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(query) ||
        c.memberId.toLowerCase().includes(query) ||
        c.address?.toLowerCase().includes(query) ||
        c.tags.some((t) => {
          // タグ値そのもの + 日本語ラベルで検索
          const labels = TAG_LABEL_MAP[t] || [t];
          return labels.some((label) => label.toLowerCase().includes(query));
        })
    );
  }, [customers, searchQuery]);

  // フォームリセット
  const resetForm = () => {
    setFormData({});
    setEditingCustomer(null);
  };

  // 新規追加ダイアログを開く
  const openAddDialog = () => {
    resetForm();
    setFormData({
      memberId: generateMemberId(),
      name: '',
      email: '',
      address: '',
      tags: ['fanclub'] as CustomerTag[],
      history: [],
      totalScore: 5.0,
      groupSize: 1,
      lastResult: undefined,
      lastVisit: new Date().toISOString(),
    });
    setIsAddDialogOpen(true);
  };

  // 編集ダイアログを開く
  const openEditDialog = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({
      memberId: customer.memberId,
      name: customer.name,
      email: customer.email || '',
      address: customer.address || '',
      tags: customer.tags,
      history: customer.history,
      totalScore: customer.totalScore,
      groupSize: customer.groupSize ?? 1,
      lastResult: customer.lastResult,
      lastVisit: customer.lastVisit,
    });
    setIsAddDialogOpen(true);
  };

  // 保存
  const handleSave = async () => {
    if (!formData.name || !formData.memberId) {
      toast.error('氏名と会員番号は必須です');
      return;
    }

    const input: CustomerInput = {
      memberId: formData.memberId || '',
      name: formData.name || '',
      email: formData.email,
      address: formData.address,
      tags: (formData.tags || ['fanclub']) as CustomerTag[],
      history: formData.history || [],
      totalScore: formData.totalScore || 5.0,
      groupSize: formData.groupSize ?? 1,
      lastResult: formData.lastResult,
      lastVisit: formData.lastVisit || new Date().toISOString(),
    };

    if (editingCustomer) {
      const result = await update(editingCustomer.id, input);
      if (result) {
        toast.success('顧客情報を更新しました');
        setIsAddDialogOpen(false);
        resetForm();
      } else {
        toast.error('更新に失敗しました');
      }
    } else {
      const result = await add(input);
      if (result) {
        toast.success('顧客を追加しました');
        setIsAddDialogOpen(false);
        resetForm();
      } else {
        toast.error('追加に失敗しました');
      }
    }
  };

  // 削除
  const handleDelete = async (id: string) => {
    if (!confirm('この顧客を削除しますか？')) return;
    const result = await remove(id);
    if (result) {
      toast.success('顧客を削除しました');
    } else {
      toast.error('削除に失敗しました');
    }
  };

  // 複数選択: 個別トグル
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // 複数選択: 全選択/全解除
  const toggleSelectAll = () => {
    if (selectedIds.size === filteredCustomers.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredCustomers.map((c) => c.id)));
    }
  };

  // 一括編集ダイアログを開く
  const openBulkEdit = () => {
    setBulkTag('');
    setBulkScore('');
    setBulkGroupSize('');
    setIsBulkEditOpen(true);
  };

  // 一括編集を実行
  const handleBulkEdit = async () => {
    const ids = Array.from(selectedIds);
    let updatedCount = 0;

    for (const id of ids) {
      const updates: Partial<CustomerInput> = {};
      if (bulkTag) updates.tags = [bulkTag];
      if (bulkScore) updates.totalScore = parseFloat(bulkScore);
      if (bulkGroupSize) updates.groupSize = parseInt(bulkGroupSize);

      if (Object.keys(updates).length > 0) {
        const result = await update(id, updates);
        if (result) updatedCount++;
      }
    }

    toast.success(`${updatedCount}件の顧客を一括更新しました`);
    setIsBulkEditOpen(false);
    setSelectedIds(new Set());
  };

  // ダミーデータ生成
  const handleGenerateDummy = async () => {
    const dummies = Array.from({ length: 50 }, () => generateDummyCustomer());
    const count = await bulkAdd(dummies);
    toast.success(`${count}件のダミーデータを追加しました`);
  };

  // 全件削除
  const handleClearAll = async () => {
    if (!confirm('全ての顧客データを削除しますか？この操作は取り消せません。')) return;
    const result = await clearAll();
    if (result) {
      toast.success('全件削除しました');
    } else {
      toast.error('削除に失敗しました');
    }
  };

  // CSVエクスポート
  const handleExport = () => {
    const headers = ['会員番号', '氏名', 'メール', '住所', 'タグ', 'スコア', '人数', '前回結果', '最終来場日'];
    const rows = customers.map((c) => [
      c.memberId,
      c.name,
      c.email || '',
      c.address || '',
      c.tags.join(';'),
      c.totalScore.toString(),
      String(c.groupSize ?? 1),
      c.lastResult || '',
      typeof c.lastVisit === 'string' ? c.lastVisit.split('T')[0] : '',
    ]);

    const csv = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n');
    const bom = '\uFEFF';
    const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `customers_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('CSVをエクスポートしました');
  };

  // CSVインポート - ファイル選択をトリガー
  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  // CSVインポート - ファイル読み込み処理
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // ファイル入力をリセット（同じファイルを再選択できるように）
    event.target.value = '';

    setIsImporting(true);

    try {
      const text = await file.text();
      const { headers, rows } = parseCSV(text);

      if (headers.length === 0 || rows.length === 0) {
        toast.error('CSVファイルが空または不正な形式です');
        setIsImporting(false);
        return;
      }

      // ヘッダーのインデックスを取得（大文字小文字を無視）
      const headerMap: Record<string, number> = {};
      headers.forEach((h, i) => {
        headerMap[h.toLowerCase().trim()] = i;
      });

      // 必須カラムのチェック
      const memberIdIdx = headerMap['memberid'] ?? headerMap['会員番号'] ?? -1;
      const nameIdx = headerMap['name'] ?? headerMap['氏名'] ?? -1;

      if (memberIdIdx === -1 || nameIdx === -1) {
        toast.error('CSVには「memberId」と「name」（または「会員番号」と「氏名」）カラムが必要です');
        setIsImporting(false);
        return;
      }

      // オプションカラムのインデックス
      const tagsIdx = headerMap['tags'] ?? headerMap['タグ'] ?? -1;
      const addressIdx = headerMap['address'] ?? headerMap['住所'] ?? -1;
      const emailIdx = headerMap['email'] ?? headerMap['メール'] ?? -1;
      const scoreIdx = headerMap['score'] ?? headerMap['totalscore'] ?? headerMap['スコア'] ?? -1;
      const lastResultIdx = headerMap['lastresult'] ?? headerMap['前回結果'] ?? -1;
      const groupSizeIdx = headerMap['groupsize'] ?? headerMap['同伴者数'] ?? headerMap['人数'] ?? -1;

      // タグを新タグに移行
      const migrateImportTag = (tag: string): CustomerTag => {
        const lower = tag.toLowerCase().trim();
        if (lower === 'invitation' || lower === 'vip' || lower === 'premium' || lower === 'gold' || lower === '優待券') return 'invitation';
        if (lower === 'relation' || lower === '関係者') return 'relation';
        if (lower === 'fanclub' || lower === 'regular' || lower === 'ファンクラブ' || lower === '一般') return 'fanclub';
        return 'fanclub';
      };

      // CustomerInput配列に変換
      const inputs: CustomerInput[] = [];
      for (const row of rows) {
        const memberId = row[memberIdIdx]?.trim();
        const name = row[nameIdx]?.trim();

        if (!memberId || !name) continue;

        const rawTags = tagsIdx >= 0 ? parseTags(row[tagsIdx] || '') : [];
        const tags: CustomerTag[] = rawTags.length > 0 ? rawTags.map(migrateImportTag) : ['fanclub'];

        const lastResultRaw = lastResultIdx >= 0 ? row[lastResultIdx]?.trim().toLowerCase() : '';
        const lastResult: 'win' | 'lose' | undefined =
          lastResultRaw === 'win' ? 'win' : lastResultRaw === 'lose' ? 'lose' : undefined;

        const input: CustomerInput = {
          memberId,
          name,
          email: emailIdx >= 0 ? row[emailIdx]?.trim() || undefined : undefined,
          address: addressIdx >= 0 ? row[addressIdx]?.trim() || undefined : undefined,
          tags,
          history: [],
          totalScore: scoreIdx >= 0 ? parseFloat(row[scoreIdx]) || 5.0 : 5.0,
          groupSize: groupSizeIdx >= 0 ? parseInt(row[groupSizeIdx]) || 1 : 1,
          lastResult,
          lastVisit: new Date().toISOString(),
        };

        inputs.push(input);
      }

      if (inputs.length === 0) {
        toast.error('有効なデータが見つかりませんでした');
        setIsImporting(false);
        return;
      }

      // インポート実行
      const result = await importCustomers(inputs);
      toast.success(`インポート完了: ${result.added}件追加, ${result.updated}件更新`);
    } catch (err) {
      console.error('CSV import error:', err);
      toast.error('CSVの読み込みに失敗しました');
    } finally {
      setIsImporting(false);
    }
  };

  // タグのランク表示
  const getRankBadge = (tags: CustomerTag[]) => {
    if (tags.includes('invitation')) return <span className="px-2 py-0.5 rounded-full text-xs bg-yellow-600/20 text-yellow-700 dark:text-yellow-500">優待券</span>;
    if (tags.includes('relation')) return <span className="px-2 py-0.5 rounded-full text-xs bg-purple-500/20 text-purple-400">関係者</span>;
    return <span className="px-2 py-0.5 rounded-full text-xs bg-orange-500/20 text-orange-400">ファンクラブ</span>;
  };

  // 日付フォーマット
  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return '-';
    try {
      return new Date(dateStr).toLocaleDateString('ja-JP', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      });
    } catch {
      return dateStr.split('T')[0] || '-';
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <p className="text-destructive">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-background">
      {/* 非表示のファイル入力 */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Header */}
      <div className="border-b border-border p-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div className="flex items-center gap-3">
              <h2 className="font-semibold text-lg">顧客リスト</h2>
              {/* 総件数バッジ */}
              <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-muted text-foreground">
                {customers.length}名
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* 検索 */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="検索..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 w-64"
              />
            </div>

            {/* アクションボタン */}
            <Button variant="outline" size="sm" onClick={handleGenerateDummy}>
              ダミー生成
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="w-4 h-4 mr-1" />
              CSV
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleImportClick}
              disabled={isImporting}
            >
              {isImporting ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <Upload className="w-4 h-4 mr-1" />
              )}
              Import
            </Button>
            <Button size="sm" onClick={openAddDialog}>
              <Plus className="w-4 h-4 mr-1" />
              新規登録
            </Button>
          </div>
        </div>
      </div>

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="border-b border-border px-4 py-2 bg-primary/5 flex items-center gap-3">
          <span className="text-sm font-medium">{selectedIds.size}件選択中</span>
          <Button size="sm" variant="outline" onClick={openBulkEdit}>
            一括編集
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>
            選択解除
          </Button>
        </div>
      )}

      {/* Table */}
      <div className="flex-1 overflow-auto p-4">
        {filteredCustomers.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <Users className="w-16 h-16 mb-4 opacity-50" />
            <p className="text-lg font-medium">顧客データがありません</p>
          </div>
        ) : (
          <div className="border border-border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead className="w-10 text-center">
                    <Checkbox
                      checked={filteredCustomers.length > 0 && selectedIds.size === filteredCustomers.length}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead className="w-32">会員番号</TableHead>
                  <TableHead className="w-40">氏名</TableHead>
                  <TableHead className="w-24">ランク</TableHead>
                  <TableHead className="w-16 text-center">人数</TableHead>
                  <TableHead className="w-20 text-right">スコア</TableHead>
                  <TableHead>住所</TableHead>
                  <TableHead className="w-28">最終来場</TableHead>
                  <TableHead className="w-24 text-center">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCustomers.map((customer) => (
                  <TableRow
                    key={customer.id}
                    className={`hover:bg-muted/30 cursor-pointer ${selectedIds.has(customer.id) ? 'bg-primary/5' : ''}`}
                    onClick={() => openEditDialog(customer)}
                  >
                    <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedIds.has(customer.id)}
                        onCheckedChange={() => toggleSelect(customer.id)}
                      />
                    </TableCell>
                    <TableCell className="font-mono text-sm">{customer.memberId}</TableCell>
                    <TableCell className="font-medium">{customer.name}</TableCell>
                    <TableCell>{getRankBadge(customer.tags)}</TableCell>
                    <TableCell className="text-center font-mono text-sm">
                      {(customer.groupSize ?? 1) > 1 ? (
                        <span className="px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-500 text-xs font-semibold">
                          {customer.groupSize}名
                        </span>
                      ) : (
                        <span className="text-muted-foreground">1</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right font-mono">{customer.totalScore}</TableCell>
                    <TableCell className="text-sm text-muted-foreground truncate max-w-xs">
                      {customer.address || '-'}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(typeof customer.lastVisit === 'string' ? customer.lastVisit : customer.lastVisit?.toISOString())}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditDialog(customer);
                          }}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(customer.id);
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* 全件削除ボタン（デバッグ用） */}
      {customers.length > 0 && (
        <div className="border-t border-border p-2 flex justify-end">
          <Button variant="ghost" size="sm" className="text-destructive" onClick={handleClearAll}>
            全件削除
          </Button>
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{editingCustomer ? '顧客情報の編集' : '新規顧客登録'}</DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-4 py-4">
            {/* 基本情報フォーム */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="memberId">会員番号</Label>
                <Input
                  id="memberId"
                  value={formData.memberId || ''}
                  onChange={(e) => setFormData({ ...formData, memberId: e.target.value })}
                  placeholder="M-123456"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">氏名 *</Label>
                <Input
                  id="name"
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="山田太郎"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">メールアドレス</Label>
              <Input
                id="email"
                type="email"
                value={formData.email || ''}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="example@email.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">住所</Label>
              <Input
                id="address"
                value={formData.address || ''}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="東京都渋谷区..."
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="totalScore">スコア</Label>
                <Input
                  id="totalScore"
                  type="number"
                  value={formData.totalScore || 0}
                  onChange={(e) => setFormData({ ...formData, totalScore: parseFloat(e.target.value) || 5.0 })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="groupSize">人数（本人含む）</Label>
                <Input
                  id="groupSize"
                  type="number"
                  min={1}
                  max={10}
                  value={formData.groupSize ?? 1}
                  onChange={(e) => setFormData({ ...formData, groupSize: Math.max(1, Math.min(10, parseInt(e.target.value) || 1)) })}
                />
              </div>
              <div className="space-y-2">
                <Label>タグ</Label>
                <div className="flex flex-wrap gap-1">
                  {TAGS.map((tag) => (
                    <button
                      key={tag.value}
                      type="button"
                      className={`px-3 py-1 text-xs rounded-full border transition-colors whitespace-nowrap min-w-[3.5rem] ${
                        formData.tags?.includes(tag.value)
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-muted border-border hover:border-primary'
                      }`}
                      onClick={() => {
                        // 排他選択: 1つのタグのみ
                        setFormData({ ...formData, tags: [tag.value] });
                      }}
                    >
                      {tag.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 参加履歴セクション（編集時のみ表示） */}
            {editingCustomer && (
              <div className="pt-4 border-t border-border">
                <div className="flex items-center gap-2 mb-3">
                  <History className="w-4 h-4 text-muted-foreground" />
                  <Label className="text-sm font-medium">参加履歴</Label>
                  <span className="text-xs text-muted-foreground">
                    ({editingCustomer.history?.length || 0}件)
                  </span>
                </div>

                {editingCustomer.history && editingCustomer.history.length > 0 ? (
                  <div className="border border-border rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/30">
                          <TableHead className="text-xs py-2">日付</TableHead>
                          <TableHead className="text-xs py-2">イベント名</TableHead>
                          <TableHead className="text-xs py-2">座席</TableHead>
                          <TableHead className="text-xs py-2 text-right">スコア</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {editingCustomer.history.map((entry, index) => (
                          <TableRow key={index} className="text-sm">
                            <TableCell className="py-1.5 text-muted-foreground">
                              {formatDate(entry.date)}
                            </TableCell>
                            <TableCell className="py-1.5">
                              {entry.eventName || '-'}
                            </TableCell>
                            <TableCell className="py-1.5 font-mono text-xs">
                              {entry.seatInfo || '-'}
                            </TableCell>
                            <TableCell className="py-1.5 text-right font-mono">
                              {entry.score?.toFixed(1) || '-'}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="text-center py-6 text-muted-foreground text-sm border border-dashed border-border rounded-lg">
                    履歴なし
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="border-t pt-4">
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              キャンセル
            </Button>
            <Button onClick={handleSave}>
              {editingCustomer ? '更新' : '登録'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Edit Dialog */}
      <Dialog open={isBulkEditOpen} onOpenChange={setIsBulkEditOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>一括編集（{selectedIds.size}件）</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              変更したい項目のみ入力してください。空欄の項目は変更されません。
            </p>

            {/* タグ変更 */}
            <div className="space-y-2">
              <Label>タグ</Label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className={`px-3 py-1 text-xs rounded-full border transition-colors whitespace-nowrap ${
                    bulkTag === '' ? 'bg-muted border-border' : 'bg-muted border-border opacity-50'
                  }`}
                  onClick={() => setBulkTag('')}
                >
                  変更しない
                </button>
                {TAGS.map((tag) => (
                  <button
                    key={tag.value}
                    type="button"
                    className={`px-3 py-1 text-xs rounded-full border transition-colors whitespace-nowrap min-w-[3.5rem] ${
                      bulkTag === tag.value
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-muted border-border hover:border-primary'
                    }`}
                    onClick={() => setBulkTag(tag.value)}
                  >
                    {tag.label}
                  </button>
                ))}
              </div>
            </div>

            {/* スコア変更 */}
            <div className="space-y-2">
              <Label htmlFor="bulkScore">スコア</Label>
              <Input
                id="bulkScore"
                type="number"
                step="0.1"
                min="1"
                max="10"
                placeholder="変更しない"
                value={bulkScore}
                onChange={(e) => setBulkScore(e.target.value)}
              />
            </div>

            {/* 同伴者数変更 */}
            <div className="space-y-2">
              <Label htmlFor="bulkGroupSize">同伴者数</Label>
              <Input
                id="bulkGroupSize"
                type="number"
                min="1"
                max="10"
                placeholder="変更しない"
                value={bulkGroupSize}
                onChange={(e) => setBulkGroupSize(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsBulkEditOpen(false)}>
              キャンセル
            </Button>
            <Button onClick={handleBulkEdit}>
              {selectedIds.size}件を更新
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
