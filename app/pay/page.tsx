'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { 
  Camera, QrCode, ChevronLeft, UserCircle, Coins, 
  AlertCircle, Check, Loader2, Sparkles, Send, X,
  RefreshCw, ArrowRight, User
} from 'lucide-react'
import QRCode from 'react-qr-code'
import { useAuth } from '@/components/AuthProvider'
import { usePoints } from '@/lib/hooks/usePoints'
import { sendHikopo, getReceiverInfo } from '@/lib/actions/transfer'
import QRScanner from '@/components/QRScanner'
import BottomNavigation from '@/components/BottomNavigation'

function PayPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user: authUser, profile: authProfile, loading: authLoading } = useAuth()
  const { points, isLoading: pointsLoading, refetch: refetchPoints } = usePoints(authUser?.id ?? null)

  const [mode, setMode] = useState<'scan' | 'my-qr'>('scan')
  const [showScanner, setShowScanner] = useState(false)
  const [receiverCode, setReceiverCode] = useState('')
  const [receiverPreview, setReceiverPreview] = useState<{
    found: boolean
    name?: string
    avatarUrl?: string
  } | null>(null)
  const [checkingReceiver, setCheckingReceiver] = useState(false)
  
  const [amount, setAmount] = useState('')
  const [paying, setPaying] = useState(false)
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [successAmount, setSuccessAmount] = useState('')
  const [successReceiver, setSuccessReceiver] = useState('')

  // 初期化：URLパラメータがあればセット
  useEffect(() => {
    const code = searchParams.get('code')
    if (code) {
      const upperCode = code.toUpperCase()
      setReceiverCode(upperCode)
      handleReceiverCheck(upperCode)
    } else if (mode === 'scan') {
      setShowScanner(true)
    }
  }, [searchParams, mode])

  // 受取人の確認
  const handleReceiverCheck = async (code: string) => {
    if (code.length < 8) return
    setCheckingReceiver(true)
    try {
      const info = await getReceiverInfo(code)
      setReceiverPreview(info)
    } catch {
      setReceiverPreview({ found: false })
    } finally {
      setCheckingReceiver(false)
    }
  }

  // スキャン成功時
  const handleScanSuccess = (code: string) => {
    setReceiverCode(code)
    setShowScanner(false)
    handleReceiverCheck(code)
  }

  // 支払い実行
  const handlePay = async () => {
    if (!authUser?.id || !receiverCode || !amount) return
    
    setPaying(true)
    setResult(null)
    setShowConfirm(false)
    
    try {
      const transferResult = await sendHikopo(
        authUser.id,
        receiverCode,
        parseInt(amount)
      )
      
      setResult(transferResult)
      if (transferResult.success) {
        refetchPoints()
        
        // 支払い完了音を再生
        const audio = new Audio('/sounds/payment.mp3')
        audio.play().catch(e => console.log('音声再生に失敗しました（ユーザー操作が必要な場合があります）:', e))
        
        setSuccessAmount(amount)
        setSuccessReceiver(receiverPreview?.name || '')
        setShowSuccess(true)
        
        // 5秒後にホーム画面へ
        setTimeout(() => router.push('/'), 5000)
      }
    } catch (error) {
      setResult({ success: false, message: '予期しないエラーが発生しました' })
    } finally {
      setPaying(false)
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="animate-spin text-red-500" size={40} />
      </div>
    )
  }

  if (!authUser) {
    router.push('/login')
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* ヘッダー */}
      <div className="bg-white px-4 py-4 border-b flex items-center gap-3 sticky top-0 z-50">
        <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
          <ChevronLeft size={24} />
        </button>
        <h1 className="text-xl font-black flex-1">ひこポで払う</h1>
        <div className="bg-red-50 px-3 py-1 rounded-full border border-red-100 flex items-center gap-1">
          <Coins size={14} className="text-red-500" />
          <span className="text-sm font-black text-red-600">
            {pointsLoading ? '...' : points.toLocaleString()}
          </span>
        </div>
      </div>

      <div className="max-w-md mx-auto p-6 space-y-6">
        {/* モード切り替え */}
        <div className="flex bg-gray-200 p-1 rounded-2xl">
          <button
            onClick={() => {
              setMode('scan')
              setShowScanner(true)
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-black text-sm transition-all ${
              mode === 'scan' ? 'bg-white shadow-sm text-red-600' : 'text-gray-500'
            }`}
          >
            <Camera size={18} />
            読み取る
          </button>
          <button
            onClick={() => setMode('my-qr')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-black text-sm transition-all ${
              mode === 'my-qr' ? 'bg-white shadow-sm text-red-600' : 'text-gray-500'
            }`}
          >
            <QrCode size={18} />
            見せる
          </button>
        </div>

        {/* メインエリア */}
        {mode === 'scan' ? (
          <div className="space-y-6">
            {!receiverCode ? (
              <div className="bg-white rounded-[2rem] p-8 shadow-xl border border-gray-100 text-center space-y-6">
                <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto">
                  <Camera size={40} className="text-red-500" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-gray-800">QRコードをスキャン</h2>
                  <p className="text-sm text-gray-500 font-bold">お店や相手のQRコードを読み取ります</p>
                </div>
                <button
                  onClick={() => setShowScanner(true)}
                  className="w-full bg-red-500 hover:bg-red-600 text-white py-4 rounded-2xl font-black text-lg shadow-lg active:scale-95 transition-all"
                >
                  カメラを起動する
                </button>
              </div>
            ) : (
              <div className="bg-white rounded-[2rem] p-6 shadow-xl border border-gray-100 space-y-6 animate-in slide-in-from-bottom duration-300">
                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  {checkingReceiver ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="animate-spin text-gray-400" size={20} />
                      <span className="text-sm font-bold text-gray-400">確認中...</span>
                    </div>
                  ) : receiverPreview?.found ? (
                    <>
                      {receiverPreview.avatarUrl ? (
                        <img src={receiverPreview.avatarUrl} className="w-12 h-12 rounded-full object-cover" />
                      ) : (
                        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                          <UserCircle size={28} className="text-red-500" />
                        </div>
                      )}
                      <div className="flex-1">
                        <p className="text-xs text-gray-500 font-bold">支払い先</p>
                        <p className="text-lg font-black text-gray-800">{receiverPreview.name}</p>
                      </div>
                      <Check size={24} className="text-green-500" />
                    </>
                  ) : (
                    <div className="flex items-center gap-2 text-red-500">
                      <AlertCircle size={20} />
                      <span className="text-sm font-black">無効なコードです</span>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <label className="text-sm font-black text-gray-700 flex items-center gap-2 ml-1">
                    <Coins size={16} className="text-red-500" />
                    支払う金額
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0"
                      className="w-full bg-gray-50 border-2 border-transparent focus:border-red-500 focus:bg-white rounded-2xl py-5 px-6 text-4xl font-black text-center transition-all outline-none"
                    />
                    <span className="absolute right-6 top-1/2 -translate-y-1/2 text-xl font-black text-gray-400">pt</span>
                  </div>
                </div>

                {result && (
                  <div className={`p-4 rounded-2xl text-center font-black ${
                    result.success ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'
                  }`}>
                    {result.message}
                  </div>
                )}

                <div className="grid grid-cols-1 gap-3">
                  <button
                    onClick={() => setShowConfirm(true)}
                    disabled={!receiverPreview?.found || !amount || parseInt(amount) <= 0 || paying || parseInt(amount) > points}
                    className="w-full bg-red-500 hover:bg-red-600 disabled:bg-gray-300 text-white py-5 rounded-2xl font-black text-xl shadow-xl shadow-red-200 active:scale-95 transition-all"
                  >
                    {paying ? <Loader2 className="animate-spin mx-auto" /> : '支払う'}
                  </button>
                  <button
                    onClick={() => {
                      setReceiverCode('')
                      setReceiverPreview(null)
                      setShowScanner(true)
                    }}
                    className="w-full py-3 text-gray-400 font-bold text-sm hover:text-gray-600 transition-colors"
                  >
                    スキャンし直す
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-[2.5rem] p-8 shadow-xl border border-gray-100 space-y-8 animate-in zoom-in-95 duration-300">
            <div className="text-center space-y-2">
              <h2 className="text-xl font-black text-gray-800">マイQRコード</h2>
              <p className="text-sm text-gray-500 font-bold text-pretty">
                相手にこのQRコードを読み取ってもらうと<br/>支払いを受けることができます
              </p>
            </div>

            <div className="relative flex justify-center">
              <div className="p-6 bg-gradient-to-br from-red-500 to-red-600 rounded-[2.5rem] shadow-2xl relative">
                <div className="bg-white p-5 rounded-[1.5rem] relative">
                  <QRCode
                    value={`hikopo:${authProfile?.referral_code}`}
                    size={200}
                    level="M"
                    fgColor="#1f2937"
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-12 h-12 bg-white rounded-xl shadow-md flex items-center justify-center border-2 border-red-500">
                      <span className="text-2xl">🐱</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-red-50 p-4 rounded-2xl border border-red-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm">
                  <User size={20} className="text-red-500" />
                </div>
                <div className="flex-1">
                  <p className="text-[10px] text-red-400 font-black uppercase tracking-widest">招待コード</p>
                  <p className="text-lg font-black text-gray-800 tracking-widest">{authProfile?.referral_code}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 支払い完了アニメーション・画面 */}
      {showSuccess && (
        <div className="fixed inset-0 z-[20000] bg-white flex flex-col items-center justify-center p-6 animate-in fade-in duration-500">
          <div className="w-full max-w-sm text-center space-y-8">
            <div className="relative">
              <div className="w-32 h-32 bg-green-100 rounded-full flex items-center justify-center mx-auto animate-bounce">
                <Check size={64} className="text-green-500" />
              </div>
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32">
                <Sparkles size={32} className="text-yellow-400 absolute -top-2 -right-2 animate-pulse" />
                <Sparkles size={24} className="text-yellow-300 absolute bottom-0 -left-4 animate-pulse delay-75" />
              </div>
            </div>

            <div className="space-y-2">
              <h2 className="text-3xl font-black text-gray-800">支払い完了</h2>
              <p className="text-gray-500 font-bold">ご利用ありがとうございました！</p>
            </div>

            <div className="bg-gray-50 rounded-3xl p-8 border-2 border-dashed border-gray-200 space-y-4">
              <div className="flex justify-between items-center text-sm text-gray-500 font-bold">
                <span>支払い先</span>
                <span className="text-gray-800">{successReceiver}</span>
              </div>
              <div className="pt-4 border-t border-gray-100 flex justify-between items-end">
                <span className="text-sm text-gray-500 font-bold pb-1">金額</span>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-red-600">{parseInt(successAmount).toLocaleString()}</span>
                  <span className="text-lg font-black text-red-600">pt</span>
                </div>
              </div>
            </div>

            <div className="pt-8">
              <button
                onClick={() => router.push('/')}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-600 py-4 rounded-2xl font-black transition-all"
              >
                ホームに戻る
              </button>
              <p className="text-xs text-gray-400 mt-4 animate-pulse">数秒後に自動で戻ります...</p>
            </div>
          </div>
        </div>
      )}

      {showConfirm && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-[2.5rem] p-8 w-full max-w-sm shadow-2xl animate-in zoom-in-95">
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Sparkles size={40} className="text-red-500" />
              </div>
              <h3 className="text-2xl font-black text-gray-800">支払いの確認</h3>
              <p className="text-sm text-gray-500 font-bold mt-2">
                {receiverPreview?.name}さんに<br/>
                <span className="text-red-600 font-black text-lg">{parseInt(amount).toLocaleString()} pt</span> を支払いますか？
              </p>
            </div>
            
            <div className="grid grid-cols-1 gap-3">
              <button
                onClick={handlePay}
                className="w-full bg-red-500 hover:bg-red-600 text-white py-4 rounded-2xl font-black text-lg shadow-xl shadow-red-200 active:scale-95 transition-all"
              >
                確定する
              </button>
              <button
                onClick={() => setShowConfirm(false)}
                className="w-full py-3 text-gray-400 font-bold text-sm"
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}

      {showScanner && (
        <QRScanner
          title="支払いスキャン"
          instruction="お店や相手のQRコードを枠内に入れてください"
          onScanSuccess={handleScanSuccess}
          onClose={() => setShowScanner(false)}
        />
      )}

      <BottomNavigation />
    </div>
  )
}

export default function PayPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="animate-spin text-red-500" size={40} />
      </div>
    }>
      <TransferWrapper />
    </Suspense>
  )
}

function TransferWrapper() {
  return <PayPageContent />
}
