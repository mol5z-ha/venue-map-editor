/**
 * useCustomerDB Hook
 * IndexedDBを使用した顧客データの永続化
 */

import { useState, useEffect, useCallback } from 'react';
import type { Customer, CustomerInput, CustomerUpdate } from '@/types/customer';

const DB_NAME = 'VenueMapEditorDB';
const DB_VERSION = 1;
const STORE_NAME = 'customers';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(new Error('Failed to open database'));
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('memberId', 'memberId', { unique: true });
        store.createIndex('name', 'name', { unique: false });
        store.createIndex('totalScore', 'totalScore', { unique: false });
      }
    };
  });
}

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function useCustomerDB() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 既存データのマイグレーション（新規フィールドのデフォルト値設定）
  const migrateCustomer = (raw: Record<string, unknown>): Customer => {
    const c = raw as unknown as Customer;
    return {
      ...c,
      groupSize: c.groupSize ?? 1,
      lastResult: c.lastResult ?? undefined,
      tags: Array.isArray(c.tags) ? c.tags : ['fanclub'],
    };
  };

  // 全件取得
  const getAll = useCallback(async (): Promise<Customer[]> => {
    try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();

        request.onsuccess = () => {
          resolve((request.result as Record<string, unknown>[]).map(migrateCustomer));
        };

        request.onerror = () => {
          reject(new Error('Failed to get customers'));
        };
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return [];
    }
  }, []);

  // memberIdで顧客を検索
  const findByMemberId = useCallback(async (memberId: string): Promise<Customer | null> => {
    try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const index = store.index('memberId');
        const request = index.get(memberId);

        request.onsuccess = () => {
          resolve(request.result || null);
        };

        request.onerror = () => {
          reject(new Error('Failed to find customer'));
        };
      });
    } catch (err) {
      return null;
    }
  }, []);

  // 追加
  const add = useCallback(async (input: CustomerInput): Promise<Customer | null> => {
    try {
      const db = await openDB();
      const now = new Date().toISOString();
      const customer: Customer = {
        ...input,
        id: generateUUID(),
        createdAt: now,
        updatedAt: now,
      };

      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.add(customer);

        request.onsuccess = () => {
          setCustomers((prev) => [...prev, customer]);
          resolve(customer);
        };

        request.onerror = () => {
          reject(new Error('Failed to add customer'));
        };
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    }
  }, []);

  // 更新
  const update = useCallback(async (id: string, updates: CustomerUpdate): Promise<Customer | null> => {
    try {
      const db = await openDB();
      
      // 既存データを取得
      const existing = await new Promise<Customer | undefined>((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(id);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(new Error('Failed to get customer'));
      });

      if (!existing) {
        throw new Error('Customer not found');
      }

      const updated: Customer = {
        ...existing,
        ...updates,
        updatedAt: new Date().toISOString(),
      };

      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put(updated);

        request.onsuccess = () => {
          setCustomers((prev) =>
            prev.map((c) => (c.id === id ? updated : c))
          );
          resolve(updated);
        };

        request.onerror = () => {
          reject(new Error('Failed to update customer'));
        };
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return null;
    }
  }, []);

  // 削除
  const remove = useCallback(async (id: string): Promise<boolean> => {
    try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.delete(id);

        request.onsuccess = () => {
          setCustomers((prev) => prev.filter((c) => c.id !== id));
          resolve(true);
        };

        request.onerror = () => {
          reject(new Error('Failed to delete customer'));
        };
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    }
  }, []);

  // 一括追加（インポート用）
  const bulkAdd = useCallback(async (inputs: CustomerInput[]): Promise<number> => {
    try {
      const db = await openDB();
      const now = new Date().toISOString();
      let addedCount = 0;

      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      for (const input of inputs) {
        const customer: Customer = {
          ...input,
          id: generateUUID(),
          createdAt: now,
          updatedAt: now,
        };

        const request = store.add(customer);
        request.onsuccess = () => {
          addedCount++;
        };
      }

      return new Promise((resolve) => {
        transaction.oncomplete = () => {
          getAll().then(setCustomers);
          resolve(addedCount);
        };
        transaction.onerror = () => {
          resolve(addedCount);
        };
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return 0;
    }
  }, [getAll]);

  // CSVインポート用: Upsert (memberIdで既存なら更新、なければ新規作成)
  const importCustomers = useCallback(async (inputs: CustomerInput[]): Promise<{ added: number; updated: number }> => {
    try {
      const db = await openDB();
      const now = new Date().toISOString();
      let addedCount = 0;
      let updatedCount = 0;

      // 既存の顧客をmemberIdでマップ化
      const existingCustomers = await getAll();
      const memberIdMap = new Map<string, Customer>();
      for (const c of existingCustomers) {
        memberIdMap.set(c.memberId, c);
      }

      const transaction = db.transaction(STORE_NAME, 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      for (const input of inputs) {
        const existing = memberIdMap.get(input.memberId);

        if (existing) {
          // 更新
          const updated: Customer = {
            ...existing,
            ...input,
            id: existing.id,
            createdAt: existing.createdAt,
            updatedAt: now,
          };
          store.put(updated);
          updatedCount++;
        } else {
          // 新規作成
          const customer: Customer = {
            ...input,
            id: generateUUID(),
            createdAt: now,
            updatedAt: now,
          };
          store.add(customer);
          addedCount++;
        }
      }

      return new Promise((resolve) => {
        transaction.oncomplete = () => {
          getAll().then(setCustomers);
          resolve({ added: addedCount, updated: updatedCount });
        };
        transaction.onerror = () => {
          resolve({ added: addedCount, updated: updatedCount });
        };
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return { added: 0, updated: 0 };
    }
  }, [getAll]);

  // 全件削除
  const clearAll = useCallback(async (): Promise<boolean> => {
    try {
      const db = await openDB();
      return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.clear();

        request.onsuccess = () => {
          setCustomers([]);
          resolve(true);
        };

        request.onerror = () => {
          reject(new Error('Failed to clear customers'));
        };
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      return false;
    }
  }, []);

  // 初期読み込み
  useEffect(() => {
    setLoading(true);
    getAll()
      .then(setCustomers)
      .finally(() => setLoading(false));
  }, [getAll]);

  // リロード
  const reload = useCallback(async () => {
    setLoading(true);
    const data = await getAll();
    setCustomers(data);
    setLoading(false);
  }, [getAll]);

  return {
    customers,
    loading,
    error,
    add,
    update,
    remove,
    bulkAdd,
    importCustomers,
    clearAll,
    reload,
    findByMemberId,
  };
}
