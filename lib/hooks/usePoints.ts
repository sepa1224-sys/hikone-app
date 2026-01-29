'use client'

import useSWR from 'swr'
import { supabase } from '@/lib/supabase'

// ポイント関連のカラムのみを指定
const POINTS_COLUMNS = 'points, referral_code, is_student, school_name, is_official_student, grade'

// ポイント履歴の型定義
export interface PointHistory {
  id: string
  user_id: string
  amount: number
  type: 'earn' | 'use' | 'referral' | 'bonus'
  activity_type?: string // アクティビティタイプ（'running' など）
  distance?: number // 走行距離（キロメートル）
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
  
  // ★ 3秒でタイムアウト（モバイルでのハング防止）
  const timeoutPromise = new Promise<PointsData>((resolve) =>
    setTimeout(() => {
      console.log(`💰 [SWR] タイムアウト発生 - デフォルト値を使用`)
      resolve({ points: 0, referral_code: null })
    }, 3000)
  )
  
  const fetchPromise = (async (): Promise<PointsData> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(POINTS_COLUMNS)
        .eq('id', userId)
        .single()
      
      if (error) {
        console.error(`💰 [SWR] ポイント取得エラー:`, error)
        return { points: 0, referral_code: null }
      }
      
      if (data) {
        console.log(`💰 [SWR] ポイント取得成功:`, data)
        const pointsValue = data.points != null ? Number(data.points) : 0
        console.log(`💰 [SWR] ポイント値（変換後）:`, pointsValue, '(元の値:', data.points, ')')
        return {
          points: pointsValue,
          referral_code: data.referral_code || null
        }
      }
      
      console.log(`💰 [SWR] データなし、デフォルト値を返す`)
      return { points: 0, referral_code: null }
    } catch (error) {
      console.error(`💰 [SWR] フェッチ中にエラー発生:`, error)
      return { points: 0, referral_code: null }
    }
  })()
  
  // タイムアウトかフェッチの早い方を返す
  return Promise.race([fetchPromise, timeoutPromise])
}

// SWR用のフェッチャー関数（ポイント履歴）
const fetchPointHistory = async (userId: string): Promise<PointHistory[]> => {
  if (!userId) {
    console.log(`📜 [HistoryFetch] userIdが空のためスキップ`)
    return []
  }
  
  console.log(`📜 [HistoryFetch] 取得開始`)
  console.log(`📜 [HistoryFetch] ユーザーID: ${userId}`)
  console.log(`📜 [HistoryFetch] ユーザーID型確認:`, {
    userId,
    userIdType: typeof userId,
    userIdLength: userId?.length,
    isString: typeof userId === 'string'
  })
  
  // キャッシュを無効化して強制的に最新データを取得
  // activity_typeに関係なく全ての履歴を取得（runningタイプも含む）
  const { data, error } = await supabase
    .from('point_history')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(10) // テスト用に10件まで取得
  
  console.log(`📜 [HistoryFetch] 結果:`, data, 'エラー:', error)
  
  if (error) {
    console.error(`📜 [HistoryFetch] エラー詳細:`, {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint
    })
    return []
  }
  
  console.log(`📜 [HistoryFetch] 取得成功: ${data?.length || 0}件`)
  if (data && data.length > 0) {
    console.log(`📜 [HistoryFetch] 履歴サンプル（最初の3件）:`, data.slice(0, 3).map(item => ({
      id: item.id,
      user_id: item.user_id,
      amount: item.amount,
      type: item.type,
      activity_type: (item as any).activity_type,
      description: item.description,
      created_at: item.created_at
    })))
    // runningタイプの履歴が含まれているか確認
    const runningHistory = data.filter((item: any) => item.activity_type === 'running')
    console.log(`📜 [HistoryFetch] runningタイプの履歴: ${runningHistory.length}件`)
  } else {
    console.log(`📜 [HistoryFetch] 履歴が0件です`)
  }
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
    // ★ 重要: スケルトンをブロックしないよう、常に false を返す
    isLoading: false,
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
      revalidateOnFocus: true, // フォーカス時に再取得を有効化
      revalidateOnReconnect: true, // 再接続時に再取得を有効化
      dedupingInterval: 0, // キャッシュを無効化（常に最新データを取得）
      revalidateIfStale: true, // 古いデータでも再取得
      revalidateOnMount: true, // マウント時に必ず再取得
      refreshInterval: 0, // 自動更新は無効
      errorRetryCount: 2,
      errorRetryInterval: 3000,
    }
  )
  
  return {
    history: data ?? [],
    error,
    isLoading,
    refetch: () => mutate(undefined, { revalidate: true }) // 強制的に再取得
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
