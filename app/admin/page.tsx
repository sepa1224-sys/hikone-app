'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSystemSettings } from '@/lib/hooks/useSystemSettings'
import { supabase } from '@/lib/supabase'
import { Settings, TrendingUp, Save, AlertCircle, CheckCircle, Gift, Package, XCircle, CheckCircle2, Clock } from 'lucide-react'
import { GIFT_EXCHANGE_TYPES, getGiftExchangeType } from '@/lib/constants/giftExchangeTypes'
import { useAuth } from '@/components/AuthProvider'

interface GiftExchangeRequest {
  id: string
  user_id: string
  gift_card_type: string
  points_amount: number
  status: 'pending' | 'approved' | 'rejected' | 'sent'
  gift_code?: string // ギフトコード
  created_at: string
  updated_at?: string
  user?: {
    full_name?: string
    email?: string
  }
}

export default function AdminDashboard() {
  const router = useRouter()
  const { user: authUser, profile: authProfile, loading: authLoading } = useAuth()
  const { settings, loading: settingsLoading, updateBasePointRate } = useSystemSettings()
  const [monthlyPoints, setMonthlyPoints] = useState<number>(0)
  const [loadingPoints, setLoadingPoints] = useState(true)
  const [newPointRate, setNewPointRate] = useState<string>('')
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  
  // ギフト交換申請関連
  const [giftRequests, setGiftRequests] = useState<GiftExchangeRequest[]>([])
  const [loadingGiftRequests, setLoadingGiftRequests] = useState(true)
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected' | 'sent'>('pending') // デフォルトを 'pending' に設定
  const [approvingRequestId, setApprovingRequestId] = useState<string | null>(null)
  const [giftCodeInput, setGiftCodeInput] = useState<string>('')
  
  // 管理者権限チェック
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)
  const [checkingAdmin, setCheckingAdmin] = useState(true)

  // 管理者権限チェック
  useEffect(() => {
    if (authLoading) return
    
    if (!authUser) {
      router.push('/')
      return
    }

    if (authProfile) {
      if (authProfile.is_admin !== true) {
        router.push('/')
        return
      }
      setIsAdmin(true)
      setCheckingAdmin(false)
    }
  }, [authUser, authProfile, authLoading, router])

  // 今月発行された合計ポイントを取得
  useEffect(() => {
    async function fetchMonthlyPoints() {
      try {
        setLoadingPoints(true)
        const now = new Date()
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

        const { data, error } = await supabase
          .from('point_history')
          .select('amount')
          .gte('created_at', firstDayOfMonth.toISOString())
          .lte('created_at', lastDayOfMonth.toISOString())

        if (error) throw error

        // 今月発行されたポイントの合計を計算
        const total = data?.reduce((sum, item) => sum + (item.amount || 0), 0) || 0
        setMonthlyPoints(total)
      } catch (err) {
        console.error('❌ [Admin] 月間ポイント取得エラー:', err)
        setMonthlyPoints(0)
      } finally {
        setLoadingPoints(false)
      }
    }

    fetchMonthlyPoints()
  }, [])

  // 設定が読み込まれたら、フォームの初期値を設定
  useEffect(() => {
    if (settings && !newPointRate) {
      setNewPointRate(settings.base_point_rate.toString())
    }
  }, [settings, newPointRate])

  // ギフト交換申請を取得
  useEffect(() => {
    async function fetchGiftRequests() {
      try {
        setLoadingGiftRequests(true)
        let query = supabase
          .from('gift_exchange_requests')
          .select(`
            *,
            profiles:user_id (
              full_name,
              email
            )
          `)
          .order('created_at', { ascending: false })

        if (filterStatus !== 'all') {
          query = query.eq('status', filterStatus)
        }

        const { data, error } = await query

        if (error) throw error

        // ユーザー情報を結合
        const requestsWithUser = (data || []).map((req: any) => ({
          ...req,
          user: req.profiles || null
        }))

        setGiftRequests(requestsWithUser)
      } catch (err) {
        console.error('❌ [Admin] ギフト申請取得エラー:', err)
        setGiftRequests([])
      } finally {
        setLoadingGiftRequests(false)
      }
    }

    fetchGiftRequests()
  }, [filterStatus])

  // ステータスを更新
  const handleUpdateStatus = async (requestId: string, newStatus: 'pending' | 'approved' | 'rejected' | 'sent', giftCode?: string) => {
    try {
      const updateData: any = {
        status: newStatus,
        updated_at: new Date().toISOString()
      }

      // 承認時はギフトコードも保存
      if (newStatus === 'approved' && giftCode) {
        updateData.gift_code = giftCode.trim()
      }

      const { error } = await supabase
        .from('gift_exchange_requests')
        .update(updateData)
        .eq('id', requestId)

      if (error) throw error

      // リストを更新
      setGiftRequests(prev =>
        prev.map(req =>
          req.id === requestId
            ? { ...req, status: newStatus, gift_code: giftCode || req.gift_code, updated_at: new Date().toISOString() }
            : req
        )
      )

      // 承認処理のモーダルを閉じる
      setApprovingRequestId(null)
      setGiftCodeInput('')
    } catch (err) {
      console.error('❌ [Admin] ステータス更新エラー:', err)
      alert('ステータスの更新に失敗しました')
    }
  }

  // 承認処理（ギフトコード入力）
  const handleApprove = (requestId: string) => {
    setApprovingRequestId(requestId)
    setGiftCodeInput('')
  }

  // 承認を確定
  const handleConfirmApprove = async () => {
    if (!approvingRequestId || !giftCodeInput.trim()) {
      alert('ギフトコードを入力してください')
      return
    }

    await handleUpdateStatus(approvingRequestId, 'approved', giftCodeInput.trim())
  }

  // 設定保存処理
  const handleSave = async () => {
    const rate = parseFloat(newPointRate)
    if (isNaN(rate) || rate < 0) {
      setSaveMessage({ type: 'error', text: '有効な数値を入力してください' })
      setTimeout(() => setSaveMessage(null), 3000)
      return
    }

    setSaving(true)
    setSaveMessage(null)

    const success = await updateBasePointRate(rate)
    if (success) {
      setSaveMessage({ type: 'success', text: '設定を保存しました' })
      setTimeout(() => setSaveMessage(null), 3000)
    } else {
      setSaveMessage({ type: 'error', text: '設定の保存に失敗しました' })
      setTimeout(() => setSaveMessage(null), 3000)
    }

    setSaving(false)
  }

  // 消化率を計算
  const monthlyLimit = settings?.monthly_point_limit || 100000
  const usageRate = monthlyLimit > 0 ? (monthlyPoints / monthlyLimit) * 100 : 0
  const remainingPoints = monthlyLimit - monthlyPoints

  // 管理者権限チェック中または権限がない場合は何も表示しない（リダイレクト中）
  if (checkingAdmin || authLoading || isAdmin === false || !authUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">アクセス権限を確認中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* ヘッダー */}
        <div className="mb-8">
          <h1 className="text-4xl font-black text-gray-900 mb-2 flex items-center gap-3">
            <Settings size={40} className="text-blue-600" />
            管理者ダッシュボード
          </h1>
          <p className="text-gray-600">システム設定とポイント発行状況を管理します</p>
        </div>

        {/* ローディング状態 */}
        {(settingsLoading || loadingPoints) && (
          <div className="bg-white rounded-2xl p-8 shadow-lg text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">データを読み込み中...</p>
          </div>
        )}

        {/* メインコンテンツ */}
        {!settingsLoading && !loadingPoints && (
          <>
            {/* 今月の発行済みポイントカード */}
            <div className="bg-white rounded-2xl p-6 shadow-lg mb-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-black text-gray-900 flex items-center gap-2">
                  <TrendingUp size={28} className="text-blue-600" />
                  今月の発行済みポイント
                </h2>
                <span className="text-sm font-bold text-gray-500">
                  {new Date().getFullYear()}年{new Date().getMonth() + 1}月
                </span>
              </div>

              {/* プログレスバー */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-3xl font-black text-gray-900">
                    {monthlyPoints.toLocaleString()}
                  </span>
                  <span className="text-lg font-bold text-gray-600">
                    / {monthlyLimit.toLocaleString()} pt
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-6 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      usageRate >= 90
                        ? 'bg-red-500'
                        : usageRate >= 70
                        ? 'bg-yellow-500'
                        : 'bg-blue-500'
                    }`}
                    style={{ width: `${Math.min(usageRate, 100)}%` }}
                  />
                </div>
                <div className="flex items-center justify-between mt-2 text-sm">
                  <span className={`font-bold ${
                    usageRate >= 90
                      ? 'text-red-600'
                      : usageRate >= 70
                      ? 'text-yellow-600'
                      : 'text-blue-600'
                  }`}>
                    消化率: {usageRate.toFixed(1)}%
                  </span>
                  <span className="text-gray-600">
                    残り: {remainingPoints.toLocaleString()} pt
                  </span>
                </div>
              </div>

              {/* 警告表示 */}
              {usageRate >= 90 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                  <AlertCircle size={20} className="text-red-600 mt-0.5" />
                  <div>
                    <p className="font-bold text-red-900">警告</p>
                    <p className="text-sm text-red-700">
                      月間発行上限に近づいています。設定の見直しを検討してください。
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* 設定変更フォーム */}
            <div className="bg-white rounded-2xl p-6 shadow-lg">
              <h2 className="text-2xl font-black text-gray-900 mb-6 flex items-center gap-2">
                <Settings size={28} className="text-blue-600" />
                ポイント単価設定
              </h2>

              <div className="space-y-4">
                {/* 現在の設定表示 */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-sm font-bold text-gray-600 mb-1">現在の設定</p>
                  <p className="text-2xl font-black text-gray-900">
                    {settings?.base_point_rate || 15} pt/km
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    最終更新: {settings?.updated_at
                      ? new Date(settings.updated_at).toLocaleString('ja-JP')
                      : '未設定'}
                  </p>
                </div>

                {/* 入力フォーム */}
                <div>
                  <label htmlFor="pointRate" className="block text-sm font-bold text-gray-700 mb-2">
                    新しいポイント単価 (pt/km)
                  </label>
                  <input
                    id="pointRate"
                    type="number"
                    min="0"
                    step="0.1"
                    value={newPointRate}
                    onChange={(e) => setNewPointRate(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200 text-lg font-bold"
                    placeholder="例: 15"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    1kmあたりのポイント数を設定します
                  </p>
                </div>

                {/* 保存ボタン */}
                <button
                  onClick={handleSave}
                  disabled={saving || !newPointRate}
                  className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-black text-lg flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg"
                >
                  {saving ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      保存中...
                    </>
                  ) : (
                    <>
                      <Save size={20} />
                      設定を保存
                    </>
                  )}
                </button>

                {/* 保存メッセージ */}
                {saveMessage && (
                  <div
                    className={`rounded-lg p-4 flex items-center gap-3 ${
                      saveMessage.type === 'success'
                        ? 'bg-green-50 border border-green-200'
                        : 'bg-red-50 border border-red-200'
                    }`}
                  >
                    {saveMessage.type === 'success' ? (
                      <CheckCircle size={20} className="text-green-600" />
                    ) : (
                      <AlertCircle size={20} className="text-red-600" />
                    )}
                    <p
                      className={`font-bold ${
                        saveMessage.type === 'success' ? 'text-green-900' : 'text-red-900'
                      }`}
                    >
                      {saveMessage.text}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* ギフト交換申請管理 */}
            <div className="bg-white rounded-2xl p-6 shadow-lg mt-6">
              <h2 className="text-2xl font-black text-gray-900 mb-6 flex items-center gap-2">
                <Gift size={28} className="text-orange-600" />
                ギフト交換申請管理
              </h2>

              {/* フィルター */}
              <div className="flex gap-2 mb-6 flex-wrap">
                {(['all', 'pending', 'approved', 'rejected', 'sent'] as const).map((status) => (
                  <button
                    key={status}
                    onClick={() => setFilterStatus(status)}
                    className={`px-4 py-2 rounded-lg font-black text-sm transition-all ${
                      filterStatus === status
                        ? status === 'pending'
                          ? 'bg-yellow-500 text-white'
                          : status === 'approved'
                          ? 'bg-blue-500 text-white'
                          : status === 'rejected'
                          ? 'bg-red-500 text-white'
                          : status === 'sent'
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-800 text-white'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {status === 'all' && 'すべて'}
                    {status === 'pending' && '申請中'}
                    {status === 'approved' && '承認済み'}
                    {status === 'rejected' && '却下'}
                    {status === 'sent' && '送付済み'}
                  </button>
                ))}
              </div>

              {/* 申請一覧 */}
              {loadingGiftRequests ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
                  <p className="mt-4 text-gray-600">読み込み中...</p>
                </div>
              ) : giftRequests.length === 0 ? (
                <div className="text-center py-8">
                  <Package size={48} className="text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 font-bold">申請がありません</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {giftRequests.map((request) => {
                    const exchangeType = getGiftExchangeType(request.gift_card_type)
                    const statusConfig = {
                      pending: { label: '申請中', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
                      approved: { label: '承認済み', color: 'bg-blue-100 text-blue-800', icon: CheckCircle2 },
                      rejected: { label: '却下', color: 'bg-red-100 text-red-800', icon: XCircle },
                      sent: { label: '送付済み', color: 'bg-green-100 text-green-800', icon: Package }
                    }
                    const status = statusConfig[request.status]

                    return (
                      <div
                        key={request.id}
                        className="border-2 border-gray-200 rounded-xl p-4 hover:border-gray-300 transition-all"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <span className="text-2xl">{exchangeType?.icon || '🎁'}</span>
                              <div>
                                <p className="font-black text-gray-900">{exchangeType?.name || request.gift_card_type}</p>
                                <p className="text-xs text-gray-500 font-bold">
                                  {request.user?.full_name || request.user?.email || 'ユーザー不明'}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-4 mt-2">
                              <span className="text-lg font-black text-gray-900">
                                {request.points_amount.toLocaleString()} pt
                              </span>
                              <span
                                className={`px-3 py-1 rounded-lg text-xs font-black flex items-center gap-1 ${status.color}`}
                              >
                                <status.icon size={14} />
                                {status.label}
                              </span>
                            </div>
                            <p className="text-xs text-gray-400 mt-2 font-bold">
                              申請日: {new Date(request.created_at).toLocaleString('ja-JP')}
                            </p>
                          </div>
                        </div>

                        {/* ギフトコード表示（承認済みの場合） */}
                        {request.status === 'approved' && request.gift_code && (
                          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                            <p className="text-xs font-bold text-blue-700 mb-1">ギフトコード</p>
                            <p className="text-sm font-black text-blue-900 font-mono">{request.gift_code}</p>
                          </div>
                        )}

                        {/* ステータス変更ボタン */}
                        <div className="flex gap-2 flex-wrap">
                          {request.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleApprove(request.id)}
                                className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-black text-sm transition-colors flex items-center gap-2"
                              >
                                <CheckCircle2 size={16} />
                                承認
                              </button>
                              <button
                                onClick={() => handleUpdateStatus(request.id, 'rejected')}
                                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-black text-sm transition-colors flex items-center gap-2"
                              >
                                <XCircle size={16} />
                                却下
                              </button>
                            </>
                          )}
                          {request.status === 'approved' && (
                            <button
                              onClick={() => handleUpdateStatus(request.id, 'sent')}
                              className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-black text-sm transition-colors flex items-center gap-2"
                            >
                              <Package size={16} />
                              送付済みにする
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* ギフトコード入力モーダル */}
            {approvingRequestId && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
                <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
                  <h3 className="text-xl font-black text-gray-900 mb-4">ギフトコードを入力</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="text-sm font-bold text-gray-700 mb-2 block">
                        ギフトコード
                      </label>
                      <input
                        type="text"
                        value={giftCodeInput}
                        onChange={(e) => setGiftCodeInput(e.target.value)}
                        placeholder="ギフトコードを入力してください"
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg font-black focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                        autoFocus
                      />
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => {
                          setApprovingRequestId(null)
                          setGiftCodeInput('')
                        }}
                        className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-black transition-colors"
                      >
                        キャンセル
                      </button>
                      <button
                        onClick={handleConfirmApprove}
                        disabled={!giftCodeInput.trim()}
                        className="flex-1 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white rounded-lg font-black transition-colors"
                      >
                        承認する
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
