'use client'

import useSWR from 'swr'
import { supabase } from '@/lib/supabase'
import { HikoneWasteMaster } from '@/components/home/WasteScheduleCard'

// 必要なカラムのみを指定（パフォーマンス最適化）
const WASTE_SCHEDULE_COLUMNS = [
  'area_key',
  'burnable',
  'cans_and_metal',
  'glass_bottles',
  'pet_bottles',
  'landfill_waste'
].join(',')

// エリア名を正規化する関数（空白除去、全角・半角統一など）
const normalizeAreaName = (areaName: string): string => {
  return areaName
    .trim()
    .replace(/\s+/g, '') // 空白を除去
    .replace(/[・･]/g, '・') // 全角・半角の中点を統一
}

// エリア名から検索キーワードを生成する関数
const generateSearchKeywords = (areaName: string): string[] => {
  const normalized = normalizeAreaName(areaName)
  const keywords: string[] = [normalized] // 元の文字列
  
  // 「・」で分割して、各部分も検索キーワードに追加
  const parts = normalized.split('・')
  keywords.push(...parts) // 各部分を追加
  
  // 最初の部分（例：「城南」）を優先的に使用
  if (parts.length > 0 && parts[0]) {
    keywords.push(parts[0])
  }
  
  return keywords.filter((k, i, arr) => arr.indexOf(k) === i) // 重複除去
}

// SWR用のフェッチャー関数
// プロフィールの selected_area や detail_area から正しい area_key を導き出す
const fetchWasteSchedule = async (areaKey: string): Promise<HikoneWasteMaster | null> => {
  if (!areaKey) {
    console.log(`🗑️ [SWR] エリアキーが空のためスキップ`)
    return null
  }
  
  console.log(`🗑️ [SWR] ゴミ収集スケジュール取得開始: ${areaKey}`)
  
  // ★ 3秒でタイムアウト（モバイルでのハング防止）
  const timeoutPromise = new Promise<null>((resolve) =>
    setTimeout(() => {
      console.log(`🗑️ [SWR] タイムアウト発生 - フォールバック使用`)
      resolve(null)
    }, 3000)
  )
  
  const fetchPromise = (async (): Promise<HikoneWasteMaster | null> => {
    try {
  
  // 検索キーワードを生成
  const searchKeywords = generateSearchKeywords(areaKey)
  console.log(`🗑️ [SWR] 生成された検索キーワード:`, searchKeywords)
  
  // 1. area_key で完全一致検索（正規化後の文字列で検索）
  const normalizedAreaKey = normalizeAreaName(areaKey)
  const { data: exactMatch, error: exactError } = await supabase
    .from('hikone_waste_master')
    .select(WASTE_SCHEDULE_COLUMNS)
    .eq('area_key', normalizedAreaKey)
    .single()
  
  if (exactMatch && !exactError) {
    console.log(`🗑️ [SWR] area_key 完全一致でヒット:`, exactMatch)
    return exactMatch as HikoneWasteMaster
  }
  
  // 2. area_key で部分一致検索（各キーワードで検索）
  for (const keyword of searchKeywords) {
    if (!keyword || keyword.trim() === '') continue
    
    console.log(`🗑️ [SWR] 部分一致検索を試行: "${keyword}"`)
    const { data: partialMatch, error: partialError } = await supabase
      .from('hikone_waste_master')
      .select(WASTE_SCHEDULE_COLUMNS)
      .ilike('area_key', `%${keyword}%`)
      .limit(1)
      .maybeSingle()
    
    if (partialMatch && !partialError) {
      console.log(`🗑️ [SWR] area_key 部分一致でヒット（キーワード: "${keyword}"）:`, partialMatch)
      return partialMatch as HikoneWasteMaster
    }
  }
  
  // 3. area_key で逆方向の部分一致検索（DBのarea_keyがプロフィールのエリア名を含むかチェック）
  // 例：プロフィールが「城南」で、DBが「城南・城陽・若葉・高宮」の場合
  for (const keyword of searchKeywords) {
    if (!keyword || keyword.trim() === '') continue
    
    console.log(`🗑️ [SWR] 逆方向部分一致検索を試行: "${keyword}"`)
    // DBのarea_keyがプロフィールのキーワードを含むかチェック
    const { data: reverseMatch, error: reverseError } = await supabase
      .from('hikone_waste_master')
      .select(WASTE_SCHEDULE_COLUMNS)
      .ilike('area_key', `%${keyword}%`)
      .limit(1)
      .maybeSingle()
    
    if (reverseMatch && !reverseError) {
      console.log(`🗑️ [SWR] 逆方向部分一致でヒット（キーワード: "${keyword}"）:`, reverseMatch)
      return reverseMatch as HikoneWasteMaster
    }
  }
  
  // 4. 全件取得して、手動でマッチング（最後の手段）
  console.log(`🗑️ [SWR] 全件取得して手動マッチングを試行`)
  const { data: allAreas, error: allError } = await supabase
    .from('hikone_waste_master')
    .select(WASTE_SCHEDULE_COLUMNS)
    .limit(20) // 彦根市のエリア数は限られているので20件で十分
  
  if (allAreas && !allError) {
    // 各エリア名とプロフィールのエリア名を比較
    for (const area of allAreas) {
      const dbAreaKey = normalizeAreaName(area.area_key || '')
      const profileAreaKey = normalizedAreaKey
      
      // 完全一致
      if (dbAreaKey === profileAreaKey) {
        console.log(`🗑️ [SWR] 手動マッチング（完全一致）でヒット:`, area)
        return area as HikoneWasteMaster
      }
      
      // 相互に含まれるかチェック
      if (dbAreaKey.includes(profileAreaKey) || profileAreaKey.includes(dbAreaKey)) {
        console.log(`🗑️ [SWR] 手動マッチング（相互包含）でヒット:`, area)
        return area as HikoneWasteMaster
      }
      
      // キーワードのいずれかが含まれるかチェック
      for (const keyword of searchKeywords) {
        if (dbAreaKey.includes(keyword) || keyword.includes(dbAreaKey)) {
          console.log(`🗑️ [SWR] 手動マッチング（キーワード包含）でヒット:`, area)
          return area as HikoneWasteMaster
        }
      }
    }
  }
  
  // 5. 最終フォールバック: 彦根市のデフォルトエリアを返す
  console.log(`🗑️ [SWR] フォールバック検索を試行`)
  try {
    const { data: fallbackMatch, error: fallbackError } = await supabase
      .from('hikone_waste_master')
      .select(WASTE_SCHEDULE_COLUMNS)
      .limit(1)
      .maybeSingle()
    
    if (fallbackMatch && !fallbackError) {
      console.log(`🗑️ [SWR] フォールバック（最初のエリア）でヒット:`, fallbackMatch)
      return fallbackMatch as HikoneWasteMaster
    }
  } catch (e) {
    console.log(`🗑️ [SWR] フォールバック検索も失敗:`, e)
  }
  
      console.error(`🗑️ [SWR] スケジュールが見つかりません（area_key: ${areaKey}）`)
      return null
    } catch (error) {
      console.error(`🗑️ [SWR] フェッチ中にエラー発生:`, error)
      return null
    }
  })()
  
  // タイムアウトかフェッチの早い方を返す
  return Promise.race([fetchPromise, timeoutPromise])
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
    // ★ 重要: スケルトンをブロックしないよう、常に false を返す
    // 実際のロード状態は内部で管理し、データがない場合は null を返す
    isLoading: false,
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
