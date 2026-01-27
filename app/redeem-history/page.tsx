'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Gift, ArrowLeft, Clock, CheckCircle2, XCircle, Package, Copy, Check } from 'lucide-react'
import { useAuth } from '@/components/AuthProvider'
import { supabase } from '@/lib/supabase'
import { getGiftExchangeType } from '@/lib/constants/giftExchangeTypes'
import BottomNavigation from '@/components/BottomNavigation'

interface RedeemHistory {
  id: string
  user_id: string
  gift_card_type: string
  points_amount: number
  status: 'pending' | 'approved' | 'rejected' | 'sent'
  gift_code?: string
  created_at: string
  updated_at?: string
}

export default function RedeemHistoryPage() {
  const router = useRouter()
  const { user: authUser } = useAuth()
  const [history, setHistory] = useState<RedeemHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copiedCodeId, setCopiedCodeId] = useState<string | null>(null)
  
  // AbortError対策: 実行済みフラグとAbortController
  const isFetchingRef = useRef(false)
  const abortControllerRef = useRef<AbortController | null>(null)
  const isMountedRef = useRef(true)

  // 交換履歴を取得
  useEffect(() => {
    // アンマウント後のステート更新を防ぐためのフラグ
    let isMounted = true

    // 既に取得中の場合はスキップ
    if (isFetchingRef.current) {
      console.log('📜 [RedeemHistory] 既に取得中のためスキップ')
      return
    }

    async function fetchHistory() {
      if (!authUser?.id) {
        if (isMounted && isMountedRef.current) {
          setLoading(false)
        }
        return
      }

      // 前回のリクエストをキャンセル
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }

      // 新しいAbortControllerを作成
      const abortController = new AbortController()
      abortControllerRef.current = abortController
      isFetchingRef.current = true

      try {
        if (isMounted && isMountedRef.current) {
          setLoading(true)
          setError(null) // エラー状態をリセット
        }

        // デバッグ: ユーザーIDを確認
        console.log('📜 [RedeemHistory] データ取得開始:', {
          userId: authUser.id,
          userIdType: typeof authUser.id
        })

        const { data, error: fetchError } = await supabase
          .from('gift_exchange_requests')
          .select('*')
          .eq('user_id', authUser.id)
          .order('created_at', { ascending: false })

        // DBから届いた生データをログ出力
        console.log('📜 [RedeemHistory] DBから届いた生データ:', {
          data,
          dataLength: data?.length || 0,
          dataType: Array.isArray(data) ? 'array' : typeof data,
          error: fetchError,
          errorCode: fetchError?.code,
          errorMessage: fetchError?.message
        })

        // リクエストがキャンセルされた場合は処理を中断
        if (abortController.signal.aborted || !isMounted) {
          return
        }

        // エラーチェック（AbortErrorは無視）
        if (fetchError) {
          // AbortErrorの場合は無視（何もしない）
          if (fetchError.name === 'AbortError') {
            return
          }
          
          // RLSの影響確認: データが取得できない場合のヒント
          if (fetchError.code === 'PGRST301' || fetchError.code === '42501' || fetchError.message?.includes('permission')) {
            console.warn('⚠️ [RedeemHistory] RLSポリシーの影響の可能性があります。')
            console.warn('⚠️ [RedeemHistory] 確認事項: auth.uid() = user_id の条件が正しく設定されているか確認してください。')
            console.warn('⚠️ [RedeemHistory] 現在のユーザーID:', authUser.id)
          }
          
          throw fetchError
        }

        // データが空の場合のデバッグ情報
        if (!data || data.length === 0) {
          console.warn('⚠️ [RedeemHistory] データが0件です。')
          console.warn('⚠️ [RedeemHistory] 確認事項:')
          console.warn('  1. gift_exchange_requestsテーブルにデータが存在するか')
          console.warn('  2. user_idカラムの値が現在のユーザーIDと一致しているか')
          console.warn('  3. RLSポリシーで auth.uid() = user_id の条件が設定されているか')
          console.warn('  4. 現在のユーザーID:', authUser.id)
          
          // 全件取得を試行（デバッグ用）
          const { data: allData, error: allError } = await supabase
            .from('gift_exchange_requests')
            .select('id, user_id, points_amount, status, created_at')
            .limit(10)
          
          if (!allError && allData) {
            console.log('📜 [RedeemHistory] デバッグ: 全件取得結果（最大10件）:', allData)
            console.log('📜 [RedeemHistory] デバッグ: テーブル内のuser_id一覧:', allData.map((item: any) => item.user_id))
          }
        }

        // アンマウント済みの場合は状態更新をスキップ
        if (isMounted && isMountedRef.current) {
          setHistory(data || [])
          setError(null)
          
          // データ取得成功のログ
          console.log('✅ [RedeemHistory] データ取得成功:', {
            count: data?.length || 0,
            items: data?.map((item: any) => ({
              id: item.id,
              gift_card_type: item.gift_card_type,
              points_amount: item.points_amount,
              status: item.status,
              has_gift_code: !!item.gift_code
            }))
          })
        }
      } catch (err: any) {
        // AbortErrorは完全に無視（正常なキャンセル）- 何もしない
        if (err?.name === 'AbortError' || abortController.signal.aborted || !isMounted) {
          return
        }
        
        // AbortError以外のエラーのみログ出力
        console.error('❌ [RedeemHistory] 履歴取得エラー:', err)
        
        // アンマウント済みの場合は状態更新をスキップ
        if (isMounted && isMountedRef.current) {
          setHistory([])
          setError('履歴の取得に失敗しました。しばらく待ってから再度お試しください。')
        }
      } finally {
        isFetchingRef.current = false
        if (isMounted && isMountedRef.current) {
          setLoading(false)
        }
      }
    }

    fetchHistory()

    // クリーンアップ
    return () => {
      isMounted = false // アンマウントフラグをfalseに設定
      isMountedRef.current = false
      
      // 進行中のリクエストを安全にキャンセル
      if (abortControllerRef.current) {
        try {
          // リクエストが既に完了している可能性があるため、try-catchで保護
          if (!abortControllerRef.current.signal.aborted) {
            abortControllerRef.current.abort()
          }
        } catch (err: any) {
          // AbortErrorの場合は無視（既にキャンセル済みの可能性）
          if (err?.name !== 'AbortError') {
            console.error('📜 [RedeemHistory] リクエストキャンセルエラー:', err)
          }
        } finally {
          abortControllerRef.current = null
        }
      }
      isFetchingRef.current = false
    }
  }, [authUser?.id])

  // コードをコピー
  const handleCopyCode = async (code: string, id: string) => {
    try {
      await navigator.clipboard.writeText(code)
      setCopiedCodeId(id)
      setTimeout(() => setCopiedCodeId(null), 2000)
    } catch (err) {
      console.error('コピーエラー:', err)
      alert('コピーに失敗しました')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 pb-20">
      {/* ヘッダー */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft size={24} className="text-gray-700" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center">
              <Gift size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black text-gray-900">交換履歴</h1>
              <p className="text-xs text-gray-500 font-bold">申請したギフトの状態を確認</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {loading ? (
          <div className="bg-white rounded-2xl p-8 shadow-lg text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 font-bold">読み込み中...</p>
          </div>
        ) : error ? (
          <div className="bg-white rounded-2xl p-8 shadow-lg text-center">
            <XCircle size={48} className="text-red-400 mx-auto mb-4" />
            <p className="text-gray-700 font-black mb-2">エラーが発生しました</p>
            <p className="text-sm text-gray-500 font-bold mb-4">{error}</p>
            <button
              onClick={() => {
                setError(null)
                setLoading(true)
                // 再取得をトリガーするためにauthUser?.idを依存配列に含めているので、強制的に再実行
                window.location.reload()
              }}
              className="px-6 py-3 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-xl font-black transition-all active:scale-95"
            >
              再読み込み
            </button>
          </div>
        ) : history.length === 0 ? (
          <div className="bg-white rounded-2xl p-8 shadow-lg text-center">
            <Gift size={48} className="text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 font-bold">交換履歴がありません</p>
            <button
              onClick={() => router.push('/redeem')}
              className="mt-4 px-6 py-3 bg-gradient-to-r from-orange-500 to-red-600 text-white rounded-xl font-black transition-all active:scale-95"
            >
              ポイント交換所へ
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {history.map((item) => {
              const exchangeType = getGiftExchangeType(item.gift_card_type)
              const statusConfig = {
                pending: { label: '申請中', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
                approved: { label: '承認済み', color: 'bg-blue-100 text-blue-800', icon: CheckCircle2 },
                rejected: { label: '却下', color: 'bg-red-100 text-red-800', icon: XCircle },
                sent: { label: '送付済み', color: 'bg-green-100 text-green-800', icon: Package }
              }
              const status = statusConfig[item.status]

              return (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl p-6 shadow-lg border border-gray-200"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{exchangeType?.icon || '🎁'}</span>
                      <div>
                        <p className="text-lg font-black text-gray-900">
                          {exchangeType?.name || item.gift_card_type}
                        </p>
                        <p className="text-sm text-gray-500 font-bold">
                          {item.points_amount.toLocaleString()} pt
                        </p>
                      </div>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-lg text-xs font-black flex items-center gap-1 ${status.color}`}
                    >
                      <status.icon size={14} />
                      {status.label}
                    </span>
                  </div>

                  {/* ギフトコード表示（承認済みまたは送付済みの場合） */}
                  {item.gift_code && (item.status === 'approved' || item.status === 'sent') && (
                    <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-xl p-4 mb-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold text-purple-700 mb-1">ギフトコード</p>
                          <p className="text-lg font-black text-purple-900 font-mono">
                            {item.gift_code}
                          </p>
                        </div>
                        <button
                          onClick={() => handleCopyCode(item.gift_code!, item.id)}
                          className="p-2 bg-purple-100 hover:bg-purple-200 rounded-lg transition-colors"
                        >
                          {copiedCodeId === item.id ? (
                            <Check size={20} className="text-green-600" />
                          ) : (
                            <Copy size={20} className="text-purple-600" />
                          )}
                        </button>
                      </div>
                      {copiedCodeId === item.id && (
                        <p className="text-xs text-green-600 font-bold mt-2 text-center">
                          コピーしました！
                        </p>
                      )}
                    </div>
                  )}

                  <p className="text-xs text-gray-400 font-bold">
                    申請日: {new Date(item.created_at).toLocaleString('ja-JP')}
                  </p>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <BottomNavigation />
    </div>
  )
}
