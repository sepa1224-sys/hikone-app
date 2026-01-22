'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { 
  Send, ChevronLeft, UserCircle, Coins, AlertCircle, 
  Check, X, Loader2, Sparkles, ArrowRight, QrCode, Camera,
  Train, Clock, MapPin, RefreshCw, Navigation, Calendar
} from 'lucide-react'
import BottomNavigation from '@/components/BottomNavigation'
import { usePoints } from '@/lib/hooks/usePoints'
import { sendHikopo, getReceiverInfo } from '@/lib/actions/transfer'
import QRScanner from '@/components/QRScanner'
import { useAuth } from '@/components/AuthProvider'

export default function TransferPage() {
  const router = useRouter()
  
  // AuthProvider から認証状態を取得
  const { session, user: authUser, loading: authLoading } = useAuth()
  
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
  
  // 🆕 タブ管理
  const [activeTab, setActiveTab] = useState<'transfer' | 'timetable' | 'route'>('transfer')
  
  // 🆕 時刻表関連のState
  const [selectedStation, setSelectedStation] = useState<string>('odpt.Station:JR-West.Tokaido.Hikone')
  const [timetableData, setTimetableData] = useState<any>(null)
  const [timetableLoading, setTimetableLoading] = useState(false)
  const [timetableError, setTimetableError] = useState<string | null>(null)
  const [currentTime, setCurrentTime] = useState<string>('')
  
  // 🆕 経路検索関連のState
  const [departureTime, setDepartureTime] = useState<string>('')
  const [routeLoading, setRouteLoading] = useState(false)
  const [routes, setRoutes] = useState<any[]>([])
  const [routeError, setRouteError] = useState<string | null>(null)
  const [startLocation, setStartLocation] = useState<{ lat: number; lon: number } | null>(null)
  const [goalLocation, setGoalLocation] = useState<{ lat: number; lon: number } | null>(null)
  
  // 🆕 現在時刻を更新
  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      const hours = now.getHours().toString().padStart(2, '0')
      const minutes = now.getMinutes().toString().padStart(2, '0')
      setCurrentTime(`${hours}:${minutes}`)
    }
    
    updateTime()
    const interval = setInterval(updateTime, 1000) // 1秒ごとに更新
    
    return () => clearInterval(interval)
  }, [])
  
  // 🆕 出発時刻の初期化
  useEffect(() => {
    const now = new Date()
    // datetime-local形式に変換（YYYY-MM-DDTHH:mm）
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    const hours = String(now.getHours()).padStart(2, '0')
    const minutes = String(now.getMinutes()).padStart(2, '0')
    setDepartureTime(`${year}-${month}-${day}T${hours}:${minutes}`)
  }, [])
  
  // 🆕 現在地を取得
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('位置情報が利用できません')
      return
    }
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setStartLocation({
          lat: position.coords.latitude,
          lon: position.coords.longitude
        })
      },
      (error) => {
        console.error('位置情報取得エラー:', error)
        alert('位置情報の取得に失敗しました')
      }
    )
  }
  
  // 🆕 現在時刻に設定
  const setToCurrentTime = () => {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    const hours = String(now.getHours()).padStart(2, '0')
    const minutes = String(now.getMinutes()).padStart(2, '0')
    setDepartureTime(`${year}-${month}-${day}T${hours}:${minutes}`)
  }
  
  // 🆕 経路検索を実行
  const searchRoute = async () => {
    if (!startLocation || !goalLocation) {
      setRouteError('出発地と到着地を設定してください')
      return
    }
    
    setRouteLoading(true)
    setRouteError(null)
    
    try {
      // 出発時刻をUnix timestampに変換
      const depTime = new Date(departureTime).getTime() / 1000
      
      const params = new URLSearchParams({
        startLat: startLocation.lat.toString(),
        startLon: startLocation.lon.toString(),
        goalLat: goalLocation.lat.toString(),
        goalLon: goalLocation.lon.toString(),
        departure_time: depTime.toString()
      })
      
      const response = await fetch(`/api/transport/route?${params.toString()}`)
      const data = await response.json()
      
      if (data.routes && data.routes.length > 0) {
        setRoutes(data.routes)
      } else {
        setRouteError(data.msg || '経路が見つかりませんでした')
        setRoutes([])
      }
    } catch (error: any) {
      console.error('経路検索エラー:', error)
      setRouteError('経路検索に失敗しました')
      setRoutes([])
    } finally {
      setRouteLoading(false)
    }
  }
  
  // 🆕 主要駅のリスト
  // 注意: 駅IDは路線ごとに異なるため、正しいIDを使用（Tokaido=東海道線）
  const STATIONS = [
    { id: 'odpt.Station:JR-West.Tokaido.Hikone', name: '彦根', operator: 'odpt.Operator:JR-West' },
    { id: 'odpt.Station:JR-West.Tokaido.Maibara', name: '米原', operator: 'odpt.Operator:JR-West' },
    { id: 'odpt.Station:JR-West.Tokaido.Kyoto', name: '京都', operator: 'odpt.Operator:JR-West' },
    { id: 'odpt.Station:JR-West.Tokaido.Osaka', name: '大阪', operator: 'odpt.Operator:JR-West' },
    { id: 'odpt.Station:JR-West.Tokaido.MinamiHikone', name: '南彦根', operator: 'odpt.Operator:JR-West' },
    { id: 'odpt.Station:JR-West.Tokaido.Kawase', name: '河瀬', operator: 'odpt.Operator:JR-West' },
  ]
  
  // 🆕 時刻表を取得する関数
  const fetchTimetable = async (stationId: string) => {
    setTimetableLoading(true)
    setTimetableError(null)
    
    try {
      const station = STATIONS.find(s => s.id === stationId)
      const stationName = station?.name || '彦根'
      
      // GTFSデータを優先的に使用（stationNameパラメータ）
      const params = new URLSearchParams({
        stationName: stationName
      })
      
      // GTFSデータが取得できない場合のフォールバック用パラメータ
      if (station?.operator) {
        params.append('station', stationId)
        params.append('operator', station.operator)
      }
      
      const response = await fetch(`/api/timetable?${params.toString()}`)
      const data = await response.json()
      
      if (data.success && data.timetables && data.timetables.length > 0) {
        setTimetableData(data.timetables[0])
      } else {
        setTimetableError(data.message || '時刻表が見つかりませんでした')
        setTimetableData(null)
      }
    } catch (error: any) {
      console.error('時刻表取得エラー:', error)
      setTimetableError('時刻表の取得に失敗しました')
      setTimetableData(null)
    } finally {
      setTimetableLoading(false)
    }
  }
  
  // 🆕 列車種別のラベルを取得
  const getTrainTypeLabel = (trainType: string | null): string => {
    if (!trainType) return '普通'
    
    const typeMap: Record<string, string> = {
      'Local': '普通',
      'Rapid': '快速',
      'Express': '急行',
      'LimitedExpress': '特急',
      'SemiExpress': '準急',
      'RapidExpress': '快速急行',
      'SpecialRapid': '新快速',
      'CommuterRapid': '通勤快速',
      'CommuterLimitedExpress': '通勤特急',
    }
    
    return typeMap[trainType] || trainType
  }
  
  // 🆕 駅選択時に時刻表を取得
  useEffect(() => {
    if (activeTab === 'timetable' && selectedStation) {
      fetchTimetable(selectedStation)
      
      // 1分ごとに自動更新
      const interval = setInterval(() => {
        fetchTimetable(selectedStation)
      }, 60000) // 60秒
      
      return () => clearInterval(interval)
    }
  }, [activeTab, selectedStation])
  
  // AuthProvider の状態が確定したら認証チェック
  useEffect(() => {
    console.log('💸 [Transfer] 認証状態:', { authLoading, hasSession: !!session })
    
    // AuthProvider がまだローディング中なら何もしない
    if (authLoading) return
    
    // セッションがない場合はログインページへ
    if (!session || !authUser) {
      console.log('💸 [Transfer] セッションなし → ログインページへ')
      router.push('/login')
      return
    }
    
    // セッションがある場合
    console.log('💸 [Transfer] セッション確認OK')
    setCurrentUser(authUser)
    setLoading(false)
  }, [authLoading, session, authUser, router])
  
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
    
    // バリデーション（分かりやすい日本語エラーメッセージ）
    if (!receiverCode.trim()) {
      setResult({ success: false, message: '📝 送り先の招待コードを入力してください' })
      return
    }
    
    if (receiverCode.trim().length < 8 || receiverCode.trim().length > 12) {
      setResult({ success: false, message: '🔢 招待コードは8〜12桁で入力してください' })
      return
    }
    
    if (!amount || parseInt(amount) <= 0) {
      setResult({ success: false, message: '💰 送金額を1ポイント以上で入力してください' })
      return
    }
    
    if (parseInt(amount) > points) {
      setResult({ success: false, message: `😢 ヒコポが足りません！現在の残高は ${points.toLocaleString()} ポイントです` })
      return
    }
    
    if (!receiverPreview?.found) {
      setResult({ success: false, message: '🔍 送り先のコードが見つかりません。コードを確認してください' })
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
          <div className="flex-1">
            <h1 className="text-xl font-black text-gray-800">
              {activeTab === 'transfer' ? 'ひこポを送る' : 
               activeTab === 'timetable' ? '時刻表' : '移動'}
            </h1>
            <p className="text-xs text-gray-500 font-bold">
              {activeTab === 'transfer' ? '友達にポイントをプレゼント' : 
               activeTab === 'timetable' ? '電車の時刻表を確認' : '経路を検索'}
            </p>
          </div>
        </div>
        
        {/* 🆕 タブ切り替え */}
        <div className="flex gap-2 mb-6 bg-white rounded-2xl p-1 shadow-lg border border-gray-100">
          <button
            onClick={() => setActiveTab('transfer')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-black text-sm transition-all ${
              activeTab === 'transfer'
                ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-white shadow-md'
                : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            <Send size={18} />
            送金
          </button>
          <button
            onClick={() => setActiveTab('timetable')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-black text-sm transition-all ${
              activeTab === 'timetable'
                ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-white shadow-md'
                : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            <Train size={18} />
            時刻表
          </button>
          <button
            onClick={() => setActiveTab('route')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-black text-sm transition-all ${
              activeTab === 'route'
                ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-white shadow-md'
                : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            <Navigation size={18} />
            移動
          </button>
        </div>
        
        {/* コンテンツエリア */}
        {activeTab === 'transfer' ? (
          <>
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
                placeholder="招待コードを入力..."
                maxLength={12}
                className="flex-1 bg-white border-2 border-gray-200 rounded-xl px-4 py-3 font-black text-center tracking-widest text-lg text-gray-900 placeholder:text-gray-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 focus:outline-none transition-all"
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
                className="w-full bg-white border-2 border-gray-200 rounded-xl px-4 py-3 pr-12 font-black text-2xl text-center text-gray-900 placeholder:text-gray-400 focus:border-amber-400 focus:bg-white focus:ring-2 focus:ring-amber-200 focus:outline-none transition-all"
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
          </>
        ) : activeTab === 'timetable' ? (
          /* 🆕 時刻表タブ */
          <div className="space-y-4">
            {/* 駅選択 */}
            <div className="bg-white rounded-[2rem] p-4 shadow-lg border border-gray-100">
              <label className="text-sm font-black text-gray-700 flex items-center gap-2 mb-3">
                <MapPin size={16} className="text-amber-500" />
                駅を選択
              </label>
              <div className="grid grid-cols-2 gap-2">
                {STATIONS.map((station) => (
                  <button
                    key={station.id}
                    onClick={() => setSelectedStation(station.id)}
                    className={`py-3 px-4 rounded-xl font-black text-sm transition-all ${
                      selectedStation === station.id
                        ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-white shadow-md scale-105'
                        : 'bg-gray-50 text-gray-600 hover:bg-amber-50'
                    }`}
                  >
                    {station.name}
                  </button>
                ))}
              </div>
            </div>
            
            {/* 時刻表表示 */}
            <div className="bg-white rounded-[2rem] p-6 shadow-lg border border-gray-100">
              {timetableLoading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <Loader2 size={32} className="animate-spin text-amber-500 mb-4" />
                  <p className="text-sm font-black text-gray-500">時刻表を取得中...</p>
                </div>
              ) : timetableError ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <AlertCircle size={32} className="text-red-500 mb-4" />
                  <p className="text-sm font-black text-red-600">{timetableError}</p>
                  <button
                    onClick={() => fetchTimetable(selectedStation)}
                    className="mt-4 px-4 py-2 bg-amber-500 text-white rounded-xl font-black text-sm hover:bg-amber-600 transition-colors"
                  >
                    再試行
                  </button>
                </div>
              ) : timetableData && timetableData.nextTrains && timetableData.nextTrains.length > 0 ? (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                        <Train size={24} className="text-amber-600" />
                      </div>
                      <div>
                        <h2 className="text-lg font-black text-gray-800">{timetableData.stationName}駅</h2>
                        <div className="flex items-center gap-2">
                          <p className="text-xs text-gray-500 font-bold">{timetableData.operator}</p>
                          {currentTime && (
                            <>
                              <span className="text-xs text-gray-300">•</span>
                              <p className="text-xs text-gray-500 font-bold flex items-center gap-1">
                                <Clock size={10} />
                                {currentTime}
                              </p>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => fetchTimetable(selectedStation)}
                      disabled={timetableLoading}
                      className="p-2 bg-amber-100 hover:bg-amber-200 rounded-xl transition-colors disabled:opacity-50"
                      title="更新"
                    >
                      <RefreshCw size={18} className={`text-amber-600 ${timetableLoading ? 'animate-spin' : ''}`} />
                    </button>
                  </div>
                  
                  <div className="space-y-3">
                    {timetableData.nextTrains.map((train: any, index: number) => (
                      <div
                        key={index}
                        className="bg-gradient-to-r from-amber-50 to-yellow-50 rounded-2xl p-4 border border-amber-100"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center">
                              <Clock size={20} className="text-white" />
                            </div>
                            <div>
                              <p className="text-2xl font-black text-gray-900">
                                {train.departureTime || train.arrivalTime || '--:--'}
                              </p>
                              {train.minutesUntilDeparture !== null && train.minutesUntilDeparture >= 0 && (
                                <p className="text-xs font-black text-amber-600">
                                  {train.minutesUntilDeparture === 0 ? 'まもなく' : 
                                   train.minutesUntilDeparture < 60 ? `${train.minutesUntilDeparture}分後` :
                                   `${Math.floor(train.minutesUntilDeparture / 60)}時間${train.minutesUntilDeparture % 60}分後`}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            {train.trainType && (
                              <span className="inline-block px-3 py-1 bg-amber-500 text-white rounded-full text-[10px] font-black mb-1">
                                {getTrainTypeLabel(train.trainType)}
                              </span>
                            )}
                            {train.trainName && (
                              <p className="text-xs font-black text-gray-600">{train.trainName}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <ArrowRight size={14} className="text-gray-400" />
                          <p className="text-sm font-black text-gray-700">
                            {train.destinationStation && train.destinationStation.length > 0
                              ? train.destinationStation[0]
                              : '行先不明'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-12">
                  <Train size={32} className="text-gray-400 mb-4" />
                  <p className="text-sm font-black text-gray-500">時刻表データがありません</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          /* 🆕 移動タブ */
          <div className="space-y-4">
            {/* 時刻設定 */}
            <div className="bg-white rounded-[2rem] p-6 shadow-lg border border-gray-100">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                  <Calendar size={24} className="text-amber-600" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-gray-800">出発時刻</h2>
                  <p className="text-xs text-gray-500 font-bold">経路検索の出発時刻を設定</p>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="relative">
                  <input
                    type="datetime-local"
                    value={departureTime}
                    onChange={(e) => setDepartureTime(e.target.value)}
                    className="w-full bg-white border-2 border-gray-200 rounded-xl px-4 py-3 font-black text-gray-900 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 focus:outline-none transition-all"
                  />
                </div>
                
                <button
                  onClick={setToCurrentTime}
                  className="w-full py-2 bg-amber-100 hover:bg-amber-200 text-amber-700 rounded-xl font-black text-sm transition-colors flex items-center justify-center gap-2"
                >
                  <Clock size={16} />
                  現在時刻に設定
                </button>
              </div>
            </div>
            
            {/* 位置設定 */}
            <div className="bg-white rounded-[2rem] p-6 shadow-lg border border-gray-100 space-y-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                  <MapPin size={24} className="text-amber-600" />
                </div>
                <div>
                  <h2 className="text-lg font-black text-gray-800">位置設定</h2>
                  <p className="text-xs text-gray-500 font-bold">出発地と到着地を設定</p>
                </div>
              </div>
              
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-black text-gray-700 mb-2 block">出発地</label>
                  <div className="flex gap-2">
                    <button
                      onClick={getCurrentLocation}
                      className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-black text-sm transition-colors flex items-center gap-2"
                    >
                      <Navigation size={16} />
                      現在地
                    </button>
                    {startLocation && (
                      <div className="flex-1 px-4 py-2 bg-gray-50 rounded-xl text-sm font-black text-gray-700">
                        {startLocation.lat.toFixed(4)}, {startLocation.lon.toFixed(4)}
                      </div>
                    )}
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-black text-gray-700 mb-2 block">到着地</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        // デフォルトで彦根駅を設定
                        setGoalLocation({ lat: 35.2746, lon: 136.2522 })
                      }}
                      className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-black text-sm transition-colors"
                    >
                      彦根駅
                    </button>
                    {goalLocation && (
                      <div className="flex-1 px-4 py-2 bg-gray-50 rounded-xl text-sm font-black text-gray-700">
                        {goalLocation.lat.toFixed(4)}, {goalLocation.lon.toFixed(4)}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
            
            {/* 経路検索ボタン */}
            <button
              onClick={searchRoute}
              disabled={routeLoading || !startLocation || !goalLocation}
              className="w-full bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 disabled:from-gray-300 disabled:to-gray-400 text-white py-4 rounded-2xl font-black text-lg shadow-xl shadow-amber-200 active:scale-95 disabled:active:scale-100 transition-all flex items-center justify-center gap-3"
            >
              {routeLoading ? (
                <>
                  <Loader2 size={24} className="animate-spin" />
                  検索中...
                </>
              ) : (
                <>
                  <Navigation size={24} />
                  経路を検索
                </>
              )}
            </button>
            
            {/* エラー表示 */}
            {routeError && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <div className="flex items-center gap-2">
                  <AlertCircle size={20} className="text-red-500" />
                  <p className="text-sm font-black text-red-700">{routeError}</p>
                </div>
              </div>
            )}
            
            {/* 経路結果 */}
            {routes.length > 0 && (
              <div className="space-y-3">
                <h3 className="text-lg font-black text-gray-800">検索結果</h3>
                {routes.map((route, index) => (
                  <div
                    key={index}
                    className="bg-gradient-to-r from-amber-50 to-yellow-50 rounded-2xl p-4 border border-amber-100"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-sm font-black text-gray-600">出発</p>
                        <p className="text-lg font-black text-gray-900">
                          {new Date(route.summary.start_time).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <ArrowRight size={20} className="text-gray-400" />
                      <div>
                        <p className="text-sm font-black text-gray-600">到着</p>
                        <p className="text-lg font-black text-gray-900">
                          {new Date(route.summary.arrival_time).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black text-gray-600">所要時間</p>
                        <p className="text-lg font-black text-amber-600">
                          {route.summary.move.time}分
                        </p>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      {route.sections.map((section: any, secIndex: number) => (
                        <div key={secIndex} className="flex items-center gap-2 text-sm">
                          {section.type === 'transit' && section.transit ? (
                            <>
                              <Train size={16} className="text-amber-600" />
                              <span className="font-black text-gray-700">
                                {section.transit.line.name} {section.transit.from.name} → {section.transit.to.name}
                              </span>
                            </>
                          ) : section.type === 'walk' && section.walk ? (
                            <>
                              <MapPin size={16} className="text-gray-400" />
                              <span className="font-black text-gray-600">{section.walk.instruction}</span>
                            </>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
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
