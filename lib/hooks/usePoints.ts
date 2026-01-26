'use client'

import useSWR from 'swr'
import { supabase } from '@/lib/supabase'

// ポイント関連のカラムのみを指定
const POINTS_COLUMNS = 'points, referral_code'

// ポイント履歴の型定義
export interface PointHistory {
  id: string
  user_id: string
  amount: number
  type: 'earn' | 'use' | 'referral' | 'bonus'
  description: string
  created_at: string
}

// ポイント情報の型定義
export interface PointsData {
  points: number
  referral_code: string | null
}

// SWR用のフェッチャー関数（ポイント情報）
const fetchPoints = async (userId: string): Promise<PointsData | null> => {
  if (!userId) return null
  
  console.log(`💰 [SWR] ポイント情報取得開始: ${userId}`)
  
  const { data, error } = await supabase
    .from('profiles')
    .select(POINTS_COLUMNS)
    .eq('id', userId)
    .single()
  
  if (error) {
    console.error(`💰 [SWR] ポイント取得エラー:`, error)
    return null
  }
  
  if (data) {
    console.log(`💰 [SWR] ポイント取得成功:`, data)
    // pointsがnullやundefinedの場合でも、数値として扱う（0ではなく実際の値を取得）
    const pointsValue = data.points != null ? Number(data.points) : 0
    console.log(`💰 [SWR] ポイント値（変換後）:`, pointsValue, '(元の値:', data.points, ')')
    return {
      points: pointsValue,
      referral_code: data.referral_code || null
    }
  }
  
  console.log(`💰 [SWR] データなし、デフォルト値を返す`)
  return { points: 0, referral_code: null }
}

// SWR用のフェッチャー関数（ポイント履歴）
const fetchPointHistory = async (userId: string): Promise<PointHistory[]> => {
  if (!userId) return []
  
  console.log(`💰 [SWR] ポイント履歴取得開始: ${userId}`)
  
  const { data, error } = await supabase
    .from('point_history')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(50)
  
  if (error) {
    console.error(`💰 [SWR] ポイント履歴取得エラー:`, error)
    return []
  }
  
  console.log(`💰 [SWR] ポイント履歴取得成功: ${data?.length || 0}件`)
  return data || []
}

/**
 * ポイント情報をSWRでキャッシュして取得するカスタムフック
 * 
 * @param userId - ユーザーID
 * @returns { points, referralCode, isLoading, error, refetch }
 */
export function usePoints(userId: string | null) {
  const { data, error, isLoading, mutate } = useSWR(
    userId ? `points:${userId}` : null,
    () => fetchPoints(userId!),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 60000, // 1分間は同じリクエストを重複排除
      revalidateIfStale: false,
      errorRetryCount: 2,
      errorRetryInterval: 3000,
    }
  )
  
  return {
    points: data?.points ?? 0,
    referralCode: data?.referral_code ?? null,
    error,
    isLoading,
    refetch: () => mutate()
  }
}

/**
 * ポイント履歴をSWRでキャッシュして取得するカスタムフック
 * 
 * @param userId - ユーザーID
 * @returns { history, isLoading, error, refetch }
 */
export function usePointHistory(userId: string | null) {
  const { data, error, isLoading, mutate } = useSWR(
    userId ? `point-history:${userId}` : null,
    () => fetchPointHistory(userId!),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 60000,
      revalidateIfStale: false,
      errorRetryCount: 2,
      errorRetryInterval: 3000,
    }
  )
  
  return {
    history: data ?? [],
    error,
    isLoading,
    refetch: () => mutate()
  }
}

/**
 * ポイント履歴のタイプに応じたアイコンと色を取得
 */
export function getPointHistoryStyle(type: PointHistory['type']) {
  switch (type) {
    case 'earn':
      return { icon: '🎯', color: 'text-green-600', bgColor: 'bg-green-100', label: '獲得' }
    case 'use':
      return { icon: '🎁', color: 'text-blue-600', bgColor: 'bg-blue-100', label: '使用' }
    case 'referral':
      return { icon: '👥', color: 'text-purple-600', bgColor: 'bg-purple-100', label: '招待' }
    case 'bonus':
      return { icon: '🎉', color: 'text-orange-600', bgColor: 'bg-orange-100', label: 'ボーナス' }
    default:
      return { icon: '💰', color: 'text-gray-600', bgColor: 'bg-gray-100', label: 'その他' }
  }
}
