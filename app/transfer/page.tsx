'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { 
  Send, ChevronLeft, UserCircle, Coins, AlertCircle, 
  Check, X, Loader2, Sparkles, ArrowRight, QrCode, Camera
} from 'lucide-react'
import BottomNavigation from '@/components/BottomNavigation'
import { usePoints } from '@/lib/hooks/usePoints'
import { sendHikopo, getReceiverInfo } from '@/lib/actions/transfer'
import QRScanner from '@/components/QRScanner'

export default function TransferPage() {
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  
  // 送金フォーム
  const [receiverCode, setReceiverCode] = useState('')
  const [amount, setAmount] = useState('')
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)
  
  // 送金相手のプレビュー
  const [receiverPreview, setReceiverPreview] = useState<{
    found: boolean
    name?: string
    avatarUrl?: string
  } | null>(null)
  const [checkingReceiver, setCheckingReceiver] = useState(false)
  
  // 確認ダイアログ
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  
  // QRスキャナー
  const [showQRScanner, setShowQRScanner] = useState(false)
  const [scanToast, setScanToast] = useState<string | null>(null)
  
  // ポイント情報
  const { points, isLoading: pointsLoading, refetch: refetchPoints } = usePoints(currentUser?.id)
  
  // 認証チェック
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session?.user) {
          router.push('/')
          return
        }
        setCurrentUser(session.user)
      } catch (error) {
        console.error('認証エラー:', error)
        router.push('/')
      } finally {
        setLoading(false)
      }
    }
    checkAuth()
  }, [router])
  
  // 送金相手の確認（デバウンス付き）
  const checkReceiver = useCallback(async (code: string) => {
    if (code.length < 8) {
      setReceiverPreview(null)
      return
    }
    
    setCheckingReceiver(true)
    try {
      const info = await getReceiverInfo(code)
      setReceiverPreview(info)
    } catch {
      setReceiverPreview({ found: false })
    } finally {
      setCheckingReceiver(false)
    }
  }, [])
  
  // コード入力時のハンドラ
  useEffect(() => {
    const timer = setTimeout(() => {
      if (receiverCode.length >= 8) {
        checkReceiver(receiverCode)
      }
    }, 500)
    
    return () => clearTimeout(timer)
  }, [receiverCode, checkReceiver])
  
  // QRスキャン成功時
  const handleQRScanSuccess = useCallback((referralCode: string) => {
    setReceiverCode(referralCode)
    setShowQRScanner(false)
    
    // トースト表示
    setScanToast(`コード「${referralCode}」を読み取りました`)
    setTimeout(() => setScanToast(null), 3000)
    
    // 相手の情報を取得
    checkReceiver(referralCode)
  }, [checkReceiver])
  
  // 確認ダイアログを開く
  const handleOpenConfirm = () => {
    setResult(null)
    
    // バリデーション
    if (!receiverCode.trim()) {
      setResult({ success: false, message: '送り先のコードを入力してください' })
      return
    }
    if (!amount || parseInt(amount) <= 0) {
      setResult({ success: false, message: '送金額を入力してください' })
      return
    }
    if (parseInt(amount) > points) {
      setResult({ success: false, message: '残高が不足しています' })
      return
    }
    if (!receiverPreview?.found) {
      setResult({ success: false, message: '送り先のコードが見つかりません' })
      return
    }
    
    setShowConfirmDialog(true)
  }
  
  // 送金実行
  const handleSend = async () => {
    if (!currentUser?.id) return
    
    setShowConfirmDialog(false)
    setSending(true)
    setResult(null)
    
    try {
      const transferResult = await sendHikopo(
        currentUser.id,
        receiverCode.trim(),
        parseInt(amount)
      )
      
      setResult(transferResult)
      
      if (transferResult.success) {
        // 成功時：ポイントを再取得、フォームをリセット
        refetchPoints()
        setReceiverCode('')
        setAmount('')
        setReceiverPreview(null)
      }
    } catch (error) {
      console.error('送金エラー:', error)
      setResult({ success: false, message: '予期しないエラーが発生しました' })
    } finally {
      setSending(false)
    }
  }
  
  // クイック金額ボタン
  const quickAmounts = [100, 500, 1000]
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-4">🐱</div>
          <p className="font-black text-gray-400">読み込み中...</p>
        </div>
      </div>
    )
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-white">
      <div className="max-w-xl mx-auto p-6 pb-24">
        {/* ヘッダー */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => router.back()}
            className="p-2 bg-white rounded-full shadow-sm hover:bg-gray-50 transition-colors"
          >
            <ChevronLeft size={20} className="text-gray-600" />
          </button>
          <div>
            <h1 className="text-xl font-black text-gray-800">ひこポを送る</h1>
            <p className="text-xs text-gray-500 font-bold">友達にポイントをプレゼント</p>
          </div>
        </div>
        
        {/* 残高表示 */}
        <div className="bg-gradient-to-r from-amber-400 to-yellow-500 rounded-[2rem] p-6 text-white shadow-xl mb-6 relative overflow-hidden">
          <div className="absolute -top-8 -right-8 w-24 h-24 bg-white/10 rounded-full" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <Coins size={20} />
              <span className="text-sm font-bold text-white/80">保有ひこポ</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-black">
                {pointsLoading ? '...' : points.toLocaleString()}
              </span>
              <span className="text-lg font-bold">pt</span>
            </div>
          </div>
        </div>
        
        {/* 送金フォーム */}
        <div className="bg-white rounded-[2rem] p-6 shadow-lg border border-gray-100 space-y-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
              <Send size={24} className="text-amber-600" />
            </div>
            <div>
              <h2 className="text-lg font-black text-gray-800">送金する</h2>
              <p className="text-xs text-gray-500 font-bold">相手の招待コードを入力</p>
            </div>
          </div>
          
          {/* 送り先コード入力 */}
          <div className="space-y-2">
            <label className="text-sm font-black text-gray-700 flex items-center gap-2">
              <UserCircle size={16} className="text-amber-500" />
              送り先の招待コード
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={receiverCode}
                onChange={(e) => setReceiverCode(e.target.value.toUpperCase())}
                placeholder="8桁のコードを入力..."
                maxLength={8}
                className="flex-1 bg-gray-50 border-2 border-transparent rounded-xl px-4 py-3 font-black text-center tracking-widest text-lg focus:border-amber-400 focus:bg-white focus:outline-none transition-all"
              />
              <button
                onClick={() => setShowQRScanner(true)}
                className="px-4 py-3 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-xl font-black transition-all active:scale-95 flex items-center gap-2 shadow-lg"
                title="QRコードをスキャン"
              >
                <Camera size={20} />
                <span className="hidden sm:inline text-sm">QR</span>
              </button>
            </div>
            
            {/* 相手のプレビュー */}
            {checkingReceiver && (
              <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl">
                <Loader2 size={16} className="animate-spin text-gray-400" />
                <span className="text-sm text-gray-400 font-bold">確認中...</span>
              </div>
            )}
            {!checkingReceiver && receiverPreview && (
              <div className={`flex items-center gap-3 p-3 rounded-xl ${
                receiverPreview.found 
                  ? 'bg-green-50 border border-green-200' 
                  : 'bg-red-50 border border-red-200'
              }`}>
                {receiverPreview.found ? (
                  <>
                    {receiverPreview.avatarUrl ? (
                      <img 
                        src={receiverPreview.avatarUrl} 
                        alt="" 
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-green-200 rounded-full flex items-center justify-center">
                        <UserCircle size={24} className="text-green-600" />
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="text-sm font-black text-green-700">{receiverPreview.name}</p>
                      <p className="text-xs text-green-500 font-bold">送金先が見つかりました</p>
                    </div>
                    <Check size={20} className="text-green-500" />
                  </>
                ) : (
                  <>
                    <div className="w-10 h-10 bg-red-200 rounded-full flex items-center justify-center">
                      <AlertCircle size={24} className="text-red-500" />
                    </div>
                    <p className="text-sm font-black text-red-600">コードが見つかりません</p>
                  </>
                )}
              </div>
            )}
          </div>
          
          {/* 送金額入力 */}
          <div className="space-y-2">
            <label className="text-sm font-black text-gray-700 flex items-center gap-2">
              <Coins size={16} className="text-amber-500" />
              送金額
            </label>
            <div className="relative">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                min="1"
                max={points}
                className="w-full bg-gray-50 border-2 border-transparent rounded-xl px-4 py-3 pr-12 font-black text-2xl text-center focus:border-amber-400 focus:bg-white focus:outline-none transition-all"
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">pt</span>
            </div>
            
            {/* クイック金額ボタン */}
            <div className="flex gap-2">
              {quickAmounts.map((qa) => (
                <button
                  key={qa}
                  onClick={() => setAmount(String(Math.min(qa, points)))}
                  disabled={points < qa}
                  className="flex-1 py-2 bg-amber-100 hover:bg-amber-200 disabled:bg-gray-100 disabled:text-gray-400 text-amber-700 rounded-lg font-black text-sm transition-colors"
                >
                  {qa.toLocaleString()}
                </button>
              ))}
              <button
                onClick={() => setAmount(String(points))}
                disabled={points <= 0}
                className="flex-1 py-2 bg-amber-500 hover:bg-amber-600 disabled:bg-gray-300 text-white rounded-lg font-black text-sm transition-colors"
              >
                全額
              </button>
            </div>
          </div>
          
          {/* 結果メッセージ */}
          {result && (
            <div className={`p-4 rounded-xl text-center ${
              result.success 
                ? 'bg-green-50 border border-green-200' 
                : 'bg-red-50 border border-red-200'
            }`}>
              <p className={`text-sm font-black ${
                result.success ? 'text-green-700' : 'text-red-700'
              }`}>
                {result.message}
              </p>
            </div>
          )}
          
          {/* 送金ボタン */}
          <button
            onClick={handleOpenConfirm}
            disabled={sending || !receiverCode.trim() || !amount || parseInt(amount) <= 0}
            className="w-full bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 disabled:from-gray-300 disabled:to-gray-400 text-white py-4 rounded-2xl font-black text-lg shadow-xl shadow-amber-200 active:scale-95 disabled:active:scale-100 transition-all flex items-center justify-center gap-3"
          >
            {sending ? (
              <>
                <Loader2 size={24} className="animate-spin" />
                送金中...
              </>
            ) : (
              <>
                <Send size={24} />
                送金する
              </>
            )}
          </button>
          
          {/* 注意書き */}
          <div className="pt-4 border-t border-gray-100">
            <p className="text-[10px] text-gray-400 text-center leading-relaxed">
              ※ 送金したポイントは取り消しできません<br/>
              ※ 送金相手の招待コードをご確認ください
            </p>
          </div>
        </div>
      </div>
      
      {/* 確認ダイアログ */}
      {showConfirmDialog && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6">
          {/* オーバーレイ */}
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowConfirmDialog(false)}
          />
          
          {/* ダイアログ */}
          <div className="relative bg-white rounded-[2rem] p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Sparkles size={32} className="text-amber-500" />
              </div>
              <h3 className="text-xl font-black text-gray-800 mb-2">送金の確認</h3>
              <p className="text-sm text-gray-500 font-bold">以下の内容で送金しますか？</p>
            </div>
            
            {/* 送金内容 */}
            <div className="bg-gray-50 rounded-2xl p-4 mb-6 space-y-3">
              {/* 送り先 */}
              <div className="flex items-center gap-3">
                {receiverPreview?.avatarUrl ? (
                  <img 
                    src={receiverPreview.avatarUrl} 
                    alt="" 
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 bg-amber-200 rounded-full flex items-center justify-center">
                    <UserCircle size={28} className="text-amber-600" />
                  </div>
                )}
                <div className="flex-1">
                  <p className="text-xs text-gray-500 font-bold">送り先</p>
                  <p className="text-sm font-black text-gray-800">{receiverPreview?.name || 'ユーザー'}</p>
                </div>
              </div>
              
              {/* 矢印 */}
              <div className="flex justify-center">
                <ArrowRight size={20} className="text-gray-300" />
              </div>
              
              {/* 金額 */}
              <div className="text-center">
                <p className="text-xs text-gray-500 font-bold mb-1">送金額</p>
                <p className="text-3xl font-black text-amber-600">
                  {parseInt(amount).toLocaleString()}<span className="text-lg ml-1">pt</span>
                </p>
              </div>
            </div>
            
            {/* ボタン */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setShowConfirmDialog(false)}
                className="py-3 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl font-black transition-colors flex items-center justify-center gap-2"
              >
                <X size={18} />
                キャンセル
              </button>
              <button
                onClick={handleSend}
                className="py-3 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 text-white rounded-xl font-black transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                <Send size={18} />
                送金する
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* QRスキャナー */}
      {showQRScanner && (
        <QRScanner
          onScanSuccess={handleQRScanSuccess}
          onClose={() => setShowQRScanner(false)}
        />
      )}
      
      {/* スキャン成功トースト */}
      {scanToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9998] animate-in slide-in-from-top duration-300">
          <div className="bg-green-500 text-white px-6 py-3 rounded-2xl shadow-xl flex items-center gap-3">
            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
              <Check size={18} />
            </div>
            <span className="font-black text-sm">{scanToast}</span>
          </div>
        </div>
      )}
      
      <BottomNavigation />
    </div>
  )
}
