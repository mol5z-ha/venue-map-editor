/**
 * Customer Data Types
 * 顧客管理システムの型定義
 */

/** 顧客タグ（3種類のみ） */
export type CustomerTag = 'invitation' | 'relation' | 'fanclub';

export interface WinHistory {
  eventId: string;
  eventName: string;
  date: string;
  seatInfo: string;
  score: number;
}

export interface Customer {
  id: string;
  memberId: string;
  name: string;
  email?: string;
  address?: string;
  tags: CustomerTag[];
  history: WinHistory[];
  totalScore: number;
  groupSize: number;              // 同伴者数（本人含む、1〜10）
  lastResult?: 'win' | 'lose';    // 前回の抽選結果（Tier 2 救済判定に使用）
  lastVisit: Date | string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export type CustomerInput = Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>;

export type CustomerUpdate = Partial<CustomerInput>;
