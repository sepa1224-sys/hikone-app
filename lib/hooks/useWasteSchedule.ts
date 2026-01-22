'use client'

import useSWR from 'swr'
import { createClient } from '@supabase/supabase-js'
import { HikoneWasteMaster } from '@/components/home/WasteScheduleCard'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabase = createClient(supabaseUrl, supabaseAnonKey)

// 必要なカラムのみを指定（パフォーマンス最適化）
const WASTE_SCHEDULE_COLUMNS = [
  'area_key',
  'burnable',
  'cans_and_metal',
  'glass_bottles',
  'pet_bottles',
  'landfill_waste'
].join(',')

// SWR用のフェッチャー関数
// ★★★ 4. city カラムも検索対象に追加（ilike で部分一致）★★★
const fetchWasteSchedule = async (areaKey: string): Promise<HikoneWasteMaster | null> => {
  if (!areaKey) return null
  
  console.log(`🗑️ [SWR] ゴミ収集スケジュール取得開始: ${areaKey}`)
  
  // 1. area_key で完全一致検索（必要なカラムのみ取得）
  const { data: exactMatch, error: exactError } = await supabase
    .from('hikone_waste_master')
    .select(WASTE_SCHEDULE_COLUMNS)
    .eq('area_key', areaKey)
    .single()
  
  if (exactMatch) {
    console.log(`🗑️ [SWR] area_key 完全一致でヒット:`, exactMatch)
    return exactMatch as HikoneWasteMaster
  }
  
  // 2. area_key で部分一致検索（エリア名の一部でもヒットする）
  const firstPart = areaKey.split('・')[0]
  const { data: partialMatch, error: partialError } = await supabase
    .from('hikone_waste_master')
    .select(WASTE_SCHEDULE_COLUMNS)
    .ilike('area_key', `%${firstPart}%`)
    .limit(1)
    .single()
  
  if (partialMatch) {
    console.log(`🗑️ [SWR] area_key 部分一致でヒット:`, partialMatch)
    return partialMatch as HikoneWasteMaster
  }
  
  // ★★★ 3. city カラムでも検索（userCity と部分一致）★★★
  // city カラムがある場合、そちらでも検索を試みる
  try {
    const { data: cityMatch, error: cityError } = await supabase
      .from('hikone_waste_master')
      .select(WASTE_SCHEDULE_COLUMNS)
      .ilike('city', `%${firstPart}%`)
      .limit(1)
      .single()
    
    if (cityMatch && !cityError) {
      console.log(`🗑️ [SWR] city 部分一致でヒット:`, cityMatch)
      return cityMatch as HikoneWasteMaster
    }
  } catch (e) {
    // city カラムが存在しない場合はスキップ
    console.log(`🗑️ [SWR] city カラム検索スキップ（カラムが存在しない可能性）`)
  }
  
  // ★★★ 4. 最終フォールバック: 彦根市のデフォルトエリアを返す ★★★
  // 何もヒットしない場合、彦根市の最初のエリアを返す
  try {
    const { data: fallbackMatch, error: fallbackError } = await supabase
      .from('hikone_waste_master')
      .select(WASTE_SCHEDULE_COLUMNS)
      .ilike('area_key', '%彦根%')
      .limit(1)
      .single()
    
    if (fallbackMatch && !fallbackError) {
      console.log(`🗑️ [SWR] フォールバック（彦根市デフォルト）でヒット:`, fallbackMatch)
      return fallbackMatch as HikoneWasteMaster
    }
  } catch (e) {
    console.log(`🗑️ [SWR] フォールバック検索も失敗`)
  }
  
  console.log(`🗑️ [SWR] スケジュールが見つかりません（area_key: ${areaKey}）`)
  return null
}

/**
 * ゴミ収集スケジュールをSWRでキャッシュして取得するカスタムフック
 * 
 * @param areaKey - ユーザーが選択したエリアキー（例: "城南・城陽..."）
 * @returns { data, error, isLoading, mutate }
 * 
 * キャッシュ戦略:
 * - revalidateOnFocus: false - タブ切り替え時に再取得しない
 * - revalidateOnReconnect: false - 再接続時に再取得しない
 * - dedupingInterval: 3600000 (1時間) - 同じキーのリクエストを1時間重複排除
 * - staleTime: Infinity - キャッシュは常に最新として扱う（手動で更新するまで）
 */
export function useWasteSchedule(areaKey: string | null) {
  const { data, error, isLoading, mutate } = useSWR(
    // キーがnullの場合はフェッチしない
    areaKey ? `waste-schedule:${areaKey}` : null,
    () => fetchWasteSchedule(areaKey!),
    {
      // キャッシュ最適化オプション
      revalidateOnFocus: false,      // タブフォーカス時の再取得を無効化
      revalidateOnReconnect: false,  // 再接続時の再取得を無効化
      dedupingInterval: 3600000,     // 1時間は同じリクエストを重複排除
      revalidateIfStale: false,      // staleデータでも自動再取得しない
      // エラー時のリトライ
      errorRetryCount: 2,
      errorRetryInterval: 3000,
      // ログ
      onSuccess: (data) => {
        if (data) {
          console.log(`🗑️ [SWR] キャッシュ保存成功: ${areaKey}`)
        }
      },
      onError: (err) => {
        console.error(`🗑️ [SWR] 取得エラー:`, err)
      }
    }
  )
  
  return {
    wasteSchedule: data ?? null,
    error,
    isLoading,
    // 手動で再取得したい場合に使用
    refetch: () => mutate()
  }
}

/**
 * プロフィール更新後にキャッシュを更新するためのヘルパー
 */
export async function prefetchWasteSchedule(areaKey: string): Promise<HikoneWasteMaster | null> {
  return fetchWasteSchedule(areaKey)
}
