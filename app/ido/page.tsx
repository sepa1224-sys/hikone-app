'use client'

import { useState, useEffect } from 'react'
import { 
  Train, MapPin, Search, Clock, ArrowUpDown, AlertCircle, 
  ArrowLeft, ArrowRight, RefreshCw
} from 'lucide-react'
import BottomNavigation from '@/components/BottomNavigation'
import { supabase } from '@/lib/supabase'

const QUICK_STATIONS = {
  hikone: ['彦根', '南彦根', '河瀬', '稲枝', 'ひこね芹川', '彦根口', '高宮', '鳥居本', 'フジテック前'],
  major: ['米原', '長浜', '安土', '近江八幡', '野洲', '草津', '京都']
}

// 修正ポイント：Google Directions APIで確実にヒットする Place ID を定義
const STATION_DATA: Record<string, { lat: number; lon: number; id: string }> = {
  '彦根': { lat: 35.2746, lon: 136.2522, id: 'ChIJqSwSmsjUA2ARUaJr69Vmcc4' },
  '南彦根': { lat: 35.2467, lon: 136.2361, id: 'ChIJV4Y763HVA2ARp0Y3uGz9YgQ' },
  '河瀬': { lat: 35.2206, lon: 136.2217, id: 'ChIJN6r3qD_XA2AR72Fv-qjC1mE' },
  '稲枝': { lat: 35.1983, lon: 136.2069, id: 'ChIJP46O24vWA2ARFm9Y6v7O82E' },
  '草津': { lat: 35.0222, lon: 135.9593, id: 'ChIJtz4xbz9yAWAREwliauTa0LQ' },
  '京都': { lat: 34.9858, lon: 135.7588, id: 'ChIJ0eJ88pOnAWARn3oV1S68CIs' },
  '米原': { lat: 35.3147, lon: 136.2908, id: 'ChIJz-S8C-3VA2ARf6WkI6yvL8g' },
  '近江八幡': { lat: 35.1281, lon: 136.0986, id: 'ChIJs9kG9KDyA2AR3fW4zI785rE' },
}

export default function IdoPage() {
  const [departure, setDeparture] = useState('')
  const [arrival, setArrival] = useState('')
  const [focusedField, setFocusedField] = useState<'dep' | 'arr'>('dep')
  const [routes, setRoutes] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [searchDate, setSearchDate] = useState('')
  const [searchTime, setSearchTime] = useState('')
  const [isCached, setIsCached] = useState(false) // キャッシュから取得したかどうか
  const [isFirstTrain, setIsFirstTrain] = useState(false) // 始発表示フラグ

  useEffect(() => {
    const now = new Date()
    setSearchDate(now.toISOString().split('T')[0])
    setSearchTime(now.toTimeString().slice(0, 5))
  }, [])

  const formatTime = (time: any) => {
    if (!time) return "--:--"
    const date = new Date(time)
    return date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
  }

  // ===== キャッシュ戦略: DB保存型 =====
  const handleSearch = async (forceRefresh = false) => {
    const cleanDep = departure.replace('駅', '')
    const cleanArr = arrival.replace('駅', '')
    const start = STATION_DATA[cleanDep]
    const goal = STATION_DATA[cleanArr]
    
    if (!start || !goal) { 
      setError('リストにある主要駅（彦根、草津、京都、米原など）を選択してください')
      return 
    }

    setLoading(true)
    setError('')
    setIsCached(false)
    setIsFirstTrain(false)

    try {
      // ===== 1. キャッシュ優先: Supabase から検索 =====
      if (!forceRefresh) {
        console.log('🔍 キャッシュを検索中...')
        const now = new Date().toISOString()
        
        const { data: cachedData, error: cacheError } = await supabase
          .from('train_routes')
          .select('*')
          .eq('departure_station', cleanDep)
          .eq('arrival_station', cleanArr)
          .gt('valid_until', now) // valid_until が現在時刻より後
          .order('created_at', { ascending: false })
          .limit(1)
        
        if (!cacheError && cachedData && cachedData.length > 0) {
          console.log('✅ キャッシュヒット！DBから経路を取得')
          const cached = cachedData[0]
          
          // route_data を復元
          const routeData = typeof cached.route_data === 'string' 
            ? JSON.parse(cached.route_data) 
            : cached.route_data
          
          setRoutes(routeData || [])
          setIsCached(true)
          setLoading(false)
          return
        }
        console.log('📭 キャッシュなし、APIを呼び出します')
      } else {
        console.log('🔄 強制更新モード: キャッシュを無視してAPIを呼び出します')
      }

      // ===== 2. API取得: キャッシュがない場合のみ =====
      // シンプルに座標だけを送る（Place ID は使用しない）
      console.log('[API] 経路検索パラメータ:', { cleanDep, cleanArr, start, goal })
      
      const params = new URLSearchParams({
        startLat: start.lat.toString(),
        startLon: start.lon.toString(),
        goalLat: goal.lat.toString(),
        goalLon: goal.lon.toString(),
      })
      
      const res = await fetch(`/api/transport/route?${params.toString()}`)
      const data = await res.json()

      if (res.ok && data.routes && data.routes.length > 0) {
        setRoutes(data.routes)
        setError('')
        
        // 始発フラグを設定
        if (data.isFirstTrain) {
          setIsFirstTrain(true)
        }
        
        // ===== 3. DB保存: 取得した経路をキャッシュとして保存 =====
        const validUntil = new Date()
        validUntil.setHours(validUntil.getHours() + 1) // 1時間後
        
        const { error: saveError } = await supabase
          .from('train_routes')
          .insert({
            departure_station: cleanDep,
            arrival_station: cleanArr,
            route_data: data.routes,
            valid_until: validUntil.toISOString(),
          })
        
        if (saveError) {
          console.error('❌ キャッシュ保存失敗:', saveError.message)
        } else {
          console.log('✅ 経路をDBにキャッシュ保存完了（有効期限: 1時間）')
        }
      } else if (res.ok && data.routes && data.routes.length === 0) {
        setRoutes([])
        setError('指定された時間の経路は見つかりませんでした。別の時間を試してください')
      } else {
        setError(data.error || '経路が見つかりませんでした。時刻を少し遅らせてみてください。')
        setRoutes([])
      }
    } catch (e) { 
      console.error('通信エラー:', e)
      setError('通信エラーが発生しました') 
    } finally { 
      setLoading(false) 
    }
  }

  return (
    <div className="max-w-md mx-auto bg-[#F8F9FB] min-h-screen pb-24 font-sans text-slate-800">
      <div className="bg-white p-6 pt-10 rounded-b-[40px] shadow-sm border-b border-gray-100">
        <div className="flex items-center gap-4 mb-8">
          <ArrowLeft className="text-blue-500 cursor-pointer" />
          <Train className="text-blue-600" size={32} />
          <h1 className="text-2xl font-black tracking-tight">彦根おでかけナビ</h1>
        </div>

        <div className="flex items-center gap-2 mb-6 relative">
          <div className="flex-1 space-y-3">
            <div className={`relative transition-all ${focusedField === 'dep' ? 'scale-[1.02]' : ''}`}>
              <input 
                value={departure} 
                onFocus={() => setFocusedField('dep')} 
                onChange={e => setDeparture(e.target.value)}
                className="w-full bg-[#EDF1F7] rounded-full py-3.5 px-12 font-bold focus:outline-none focus:ring-2 focus:ring-blue-400 text-black placeholder:text-slate-400" 
                placeholder="出発駅" 
              />
              <MapPin className="absolute left-4 top-4 text-blue-500" size={20} />
            </div>
            <div className={`relative transition-all ${focusedField === 'arr' ? 'scale-[1.02]' : ''}`}>
              <input 
                value={arrival} 
                onFocus={() => setFocusedField('arr')} 
                onChange={e => setArrival(e.target.value)}
                className="w-full bg-[#EDF1F7] rounded-full py-3.5 px-12 font-bold focus:outline-none focus:ring-2 focus:ring-green-400 text-black placeholder:text-slate-400" 
                placeholder="到着駅" 
              />
              <MapPin className="absolute left-4 top-4 text-green-500" size={20} />
            </div>
          </div>
          <button 
            onClick={() => {setDeparture(arrival); setArrival(departure)}} 
            className="bg-white p-2.5 rounded-full shadow-lg absolute left-[45%] z-10 border border-gray-100 active:scale-95 transition-transform"
          >
            <ArrowUpDown size={18} className="text-blue-600" />
          </button>
        </div>

        <button 
          onClick={() => handleSearch(false)} 
          disabled={loading} 
          className="w-full bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-4 rounded-full font-black text-lg shadow-xl flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-70"
        >
          {loading ? "時刻表を照会中..." : <><Search size={20}/> 時刻表・経路を検索</>}
        </button>
      </div>

      <div className="p-6">
        <h2 className="text-xs font-black text-slate-400 mb-3 ml-2 uppercase tracking-widest">主な周辺駅</h2>
        <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
          {[...QUICK_STATIONS.hikone, ...QUICK_STATIONS.major].map(s => (
            <button 
              key={s} 
              onClick={() => {
                const name = s.endsWith('駅') ? s : `${s}駅`;
                if (focusedField === 'dep') { 
                  setDeparture(name); 
                  setFocusedField('arr'); 
                } else { 
                  setArrival(name); 
                }
              }} 
              className="px-5 py-2 rounded-full border-2 border-gray-100 bg-white text-xs font-black whitespace-nowrap shadow-sm active:bg-blue-50 transition-all hover:border-blue-200"
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="px-6 space-y-6">
        {/* キャッシュから取得した場合の表示 */}
        {isCached && routes.length > 0 && (
          <div className="p-3 bg-green-50 text-green-700 rounded-xl text-center text-xs font-bold flex items-center justify-center gap-2 border border-green-200">
            <Clock size={14} />
            キャッシュから取得しました（高速表示）
          </div>
        )}

        {/* 始発表示の場合のメッセージ */}
        {isFirstTrain && routes.length > 0 && (
          <div className="p-4 bg-amber-50 text-amber-700 rounded-2xl text-center font-bold flex flex-col items-center gap-2 border border-amber-200">
            <div className="flex items-center gap-2">
              <AlertCircle size={18} />
              本日の運行は終了しました
            </div>
            <div className="text-xs font-medium opacity-80">
              始発（5:00以降）の情報を表示しています
            </div>
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-center font-bold flex items-center justify-center gap-2 border border-red-100">
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        {routes.map((route, idx) => (
          <div key={idx} className="bg-white rounded-[35px] overflow-hidden shadow-xl border border-gray-50">
            <div className="bg-slate-800 p-6 text-white">
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                  <Clock size={14} className="text-blue-400" />
                  <span className="text-[10px] font-black px-2 py-0.5 rounded bg-blue-500/20 text-blue-400">最速</span>
                </div>
                <div className="text-xl font-black text-green-400">¥{route.summary?.fare?.total || '---'}</div>
              </div>
              <div className="flex items-center justify-between">
                <div className="text-3xl font-black tracking-tighter flex items-center">
                  {formatTime(route.summary.start_time)}
                  <div className="flex flex-col items-center mx-3">
                    <ArrowRight size={16} className="text-blue-500" />
                  </div>
                  {formatTime(route.summary.arrival_time)}
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-bold opacity-50">所要時間</div>
                  <div className="text-lg font-black text-blue-400">{route.summary.move.time}分</div>
                </div>
              </div>
            </div>

            <div className="p-6 relative">
              <div className="space-y-8">
                {route.sections.map((section: any, sIdx: number) => (
                  <div key={sIdx} className="flex gap-6">
                    <div className="w-12 h-12 bg-white border-4 border-blue-600 rounded-2xl flex items-center justify-center text-blue-600 shrink-0">
                      <Train size={24} />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-black text-slate-800 bg-blue-50 px-3 py-1 rounded-lg inline-block mb-2">
                        {section.transit?.line?.name || "JR 琵琶湖線"}
                      </div>
                      <div className="text-xs font-black text-slate-600">
                        {section.transit?.from?.name} <span className="mx-1 opacity-30">→</span> {section.transit?.to?.name}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}

        {/* 最新の情報に更新ボタン */}
        {routes.length > 0 && (
          <div className="pt-4 pb-2">
            <button
              onClick={() => handleSearch(true)}
              disabled={loading}
              className="w-full py-3 text-xs font-bold text-gray-500 bg-gray-100 hover:bg-gray-200 rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              最新の情報に更新（キャッシュを無視してAPIを叩く）
            </button>
          </div>
        )}
      </div>

      <BottomNavigation />
    </div>
  )
}