'use client'

import { useState, useEffect } from 'react'
import { Train, MapPin, Search, Clock, ArrowUpDown, Bus, History, AlertCircle, X } from 'lucide-react'
import BottomNavigation from '@/components/BottomNavigation'

const HIKONYAN_IMAGE = "https://kawntunevmabyxqmhqnv.supabase.co/storage/v1/object/public/images/hikonyan.png"

// 1段目: 彦根エリア
const HIKONE_STATIONS = {
  jr: ['彦根', '南彦根', '河瀬', '稲枝'],
  omi: ['ひこね芹川', '彦根口', '高宮', '鳥居本', 'フジテック前']
}

// 2段目: 周辺主要駅
const NEARBY_STATIONS = ['米原', '長浜', '安土', '近江八幡', '野洲', '守山', '草津', '栗東', '瀬田']

// 3段目: 広域エリアの駅
const REGIONAL_STATIONS: Record<string, string[]> = {
  '滋賀県（その他）': ['大津', '石山', '膳所', '南草津', '堅田', '比叡山坂本'],
  '大阪': ['大阪', '新大阪', '天王寺', '梅田', '難波', '京橋', '鶴橋'],
  '京都': ['京都', '山科', '伏見', '宇治', '亀岡', '園部'],
  '愛知': ['名古屋', '豊橋', '岡崎', '一宮', '岐阜', '大垣']
}

// 駅名から駅IDを検索するマッピング（既知の駅）
// 修正: JR西日本の東海道本線（琵琶湖線）は TokaidoSanyo を使用
const STATION_ID_MAP: Record<string, string> = {
  '彦根': 'odpt.Station:JR-West.TokaidoSanyo.Hikone',
  '南彦根': 'odpt.Station:JR-West.TokaidoSanyo.MinamiHikone',
  '河瀬': 'odpt.Station:JR-West.TokaidoSanyo.Kawase',
  '稲枝': 'odpt.Station:JR-West.TokaidoSanyo.Inae',
  'ひこね芹川': 'odpt.Station:Omi-Railway.Ohmi-Main.HikoneSerikawa',
  '彦根口': 'odpt.Station:Omi-Railway.Ohmi-Main.Hikoneguchi',
  '高宮': 'odpt.Station:Omi-Railway.Ohmi-Main.Takamiya',
  '鳥居本': 'odpt.Station:Omi-Railway.Ohmi-Main.ToriiMoto',
  'フジテック前': 'odpt.Station:Omi-Railway.Ohmi-Main.FujitecMae',
  '米原': 'odpt.Station:JR-West.TokaidoSanyo.Maibara',
  '長浜': 'odpt.Station:JR-West.Hokuriku.Nagahama',
  '草津': 'odpt.Station:JR-West.TokaidoSanyo.Kusatsu',
  '京都': 'odpt.Station:JR-West.TokaidoSanyo.Kyoto',
  '大阪': 'odpt.Station:JR-West.TokaidoSanyo.Osaka',
  '名古屋': 'odpt.Station:JR-Central.Tokaido.Nagoya'
}

interface RouteSection {
  type: string
  lineName?: string
  from?: string
  to?: string
  departureTime?: string
  arrivalTime?: string
  trainType?: string
  duration?: number
  distance?: number
}

interface Route {
  departure: string
  arrival: string
  duration: number
  fare: number
  transfers: number
  sections: RouteSection[]
}

interface SearchHistoryItem {
  departure: string
  arrival: string
}

export default function IdoPage() {
  const [departure, setDeparture] = useState<string>('')
  const [arrival, setArrival] = useState<string>('')
  const [routes, setRoutes] = useState<Route[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')
  const [currentTime, setCurrentTime] = useState('')
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([])
  const [isRegionalModalOpen, setIsRegionalModalOpen] = useState(false)
  const [selectedRegion, setSelectedRegion] = useState<string>('滋賀県（その他）')

  // 現在時刻の更新
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date()
      setCurrentTime(now.getHours().toString().padStart(2, '0') + ":" + now.getMinutes().toString().padStart(2, '0'))
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // 検索履歴をローカルストレージから読み込み
  useEffect(() => {
    const saved = localStorage.getItem('transport_search_history')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        setSearchHistory(parsed)
      } catch (e) {
        console.error('履歴読み込みエラー:', e)
      }
    }
  }, [])

  // 観光モードとの連動
  useEffect(() => {
    const mode = localStorage.getItem('app_mode')
    const selectedCityId = localStorage.getItem('selected_city_id')
    
    if (mode === 'tourist' && selectedCityId) {
      const cityData: Record<string, any> = {
        hikone: { name: '彦根市' },
        nagahama: { name: '長浜市' },
        tsuruga: { name: '敦賀市' }
      }
      
      const cityName = cityData[selectedCityId]?.name
      if (cityName && !arrival) {
        const stationMap: Record<string, string> = {
          '彦根市': '彦根',
          '長浜市': '長浜',
          '敦賀市': '敦賀'
        }
        if (stationMap[cityName]) {
          setArrival(stationMap[cityName])
        }
      }
    }
  }, [])

  // 出発駅をクイックセレクト（出発地の入力欄に入力するだけ）
  // ステップ5: UIへの反映 - クイックセレクト時に「駅」を付加
  const handleDepartureSelect = (station: string) => {
    // 「駅」が含まれていない場合は「駅」を追加
    const stationWithEki = station.includes('駅') ? station : `${station}駅`
    setDeparture(stationWithEki)
    setError('')
    setRoutes([])
  }

  // 到着駅をクイックセレクト
  // ステップ5: UIへの反映 - クイックセレクト時に「駅」を付加
  const handleArrivalSelect = (station: string) => {
    // 「駅」が含まれていない場合は「駅」を追加
    const stationWithEki = station.includes('駅') ? station : `${station}駅`
    setArrival(stationWithEki)
    setError('')
  }

  // 履歴から選択（出発→到着の組み合わせ）
  const handleHistorySelect = (item: SearchHistoryItem) => {
    setDeparture(item.departure)
    setArrival(item.arrival)
    setError('')
  }

  // 検索実行（NAVITIME Route APIを使用）
  const handleSearch = async () => {
    if (!departure.trim()) {
      setError('出発地を入力してください')
      return
    }

    if (!arrival.trim()) {
      setError('到着地を入力してください')
      return
    }

    setLoading(true)
    setError('')
    setRoutes([])

    try {
      // NAVITIME Route APIで経路検索
      const response = await fetch(
        `/api/transport/route?start=${encodeURIComponent(departure)}&goal=${encodeURIComponent(arrival)}&start_time=${encodeURIComponent(currentTime)}`
      )

      if (!response.ok) {
        const errorData = await response.json()
        const errorMessage = errorData.error || '経路検索に失敗しました'
        
        // ステップ4: 究極のデバッグ - APIの生のメッセージを表示
        let fullErrorMessage = errorMessage
        if (errorData.apiMessage) {
          fullErrorMessage += `\n\n[API詳細] ${errorData.apiMessage}`
        }
        if (errorData.apiErrorDetail) {
          fullErrorMessage += `\n${errorData.apiErrorDetail}`
        }
        
        // エラーメッセージが既にひこにゃん風ならそのまま使用
        if (errorMessage.includes('ニャ')) {
          setError(fullErrorMessage)
        } else {
          setError(`そんな場所は見当たらないニャ... もっと詳しく教えてほしいニャ！${errorData.apiMessage ? `\n\n[API詳細] ${errorData.apiMessage}` : ''}`)
        }
        return
      }

      const data = await response.json()
      
      if (!data.routes || data.routes.length === 0) {
        setError('経路が見つからなかったニャ... 出発地と到着地を確認してニャ！')
        return
      }

      setRoutes(data.routes)

      // 履歴に追加（出発→到着の組み合わせ）
      const historyItem: SearchHistoryItem = { departure, arrival }
      const newHistory = [historyItem, ...searchHistory.filter(
        item => !(item.departure === departure && item.arrival === arrival)
      )].slice(0, 5)
      setSearchHistory(newHistory)
      localStorage.setItem('transport_search_history', JSON.stringify(newHistory))
    } catch (error: any) {
      console.error('検索エラー:', error)
      setError('通信に失敗したニャ... もう一度お試しください')
    } finally {
      setLoading(false)
    }
  }

  // 出発地と到着地を入れ替え
  const handleSwap = () => {
    const temp = departure
    setDeparture(arrival)
    setArrival(temp)
    setError('')
  }

  // 広域エリアの駅を選択
  // ステップ5: UIへの反映 - クイックセレクト時に「駅」を付加
  const handleRegionalStationSelect = (station: string) => {
    // 「駅」が含まれていない場合は「駅」を追加
    const stationWithEki = station.includes('駅') ? station : `${station}駅`
    setArrival(stationWithEki)
    setIsRegionalModalOpen(false)
    setError('')
  }

  return (
    <div className="max-w-md mx-auto p-4 pb-24 bg-slate-50 min-h-screen">
      <header className="mb-4">
        <h1 className="text-2xl font-black text-blue-900 flex items-center gap-2 mb-2">
          <Train className="w-6 h-6" /> 移動
        </h1>
        <div className="flex items-center justify-between">
          <p className="text-xs text-gray-500 font-bold">
            出発地から到着地まで経路を検索
          </p>
          <span className="text-xs font-mono bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-bold">
            {currentTime}
          </span>
        </div>
      </header>

      {/* 1. 検索欄（最上部、コンパクト） */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-blue-50 mb-3">
        <div className="space-y-3">
          {/* 出発地 */}
          <div>
            <label className="text-[10px] font-black text-blue-400 mb-1 block uppercase">
              出発
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
              <input
                type="text"
                value={departure}
                onChange={(e) => {
                  setDeparture(e.target.value)
                  setError('')
                }}
                placeholder="出発地（駅名・施設名など）"
                className="w-full bg-gray-50 border-2 border-transparent rounded-lg py-2 pl-10 pr-8 font-bold text-sm text-gray-700 focus:border-blue-400 focus:bg-white focus:outline-none transition-all"
              />
            </div>
          </div>

          {/* 入れ替えボタン */}
          <div className="flex justify-center -my-1">
            <button
              onClick={handleSwap}
              className="p-1.5 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
            >
              <ArrowUpDown size={14} className="text-gray-600" />
            </button>
          </div>

          {/* 到着地 */}
          <div>
            <label className="text-[10px] font-black text-blue-400 mb-1 block uppercase">
              到着
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" size={16} />
              <input
                type="text"
                value={arrival}
                onChange={(e) => {
                  setArrival(e.target.value)
                  setError('')
                }}
                placeholder="到着地（駅名・施設名など）"
                className="w-full bg-gray-50 border-2 border-transparent rounded-lg py-2 pl-10 pr-8 font-bold text-sm text-gray-700 focus:border-blue-400 focus:bg-white focus:outline-none transition-all"
              />
            </div>
          </div>

          {/* 検索ボタン */}
          <button
            onClick={handleSearch}
            disabled={loading || !departure.trim()}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white py-3 rounded-lg font-black shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 text-sm"
          >
            {loading ? (
              <>
                <div className="animate-spin">🐱</div>
                <span>ひこにゃんが地図を広げて調べてるニャ...</span>
              </>
            ) : (
              <>
                <Search size={16} />
                <span>経路を検索</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 2. 履歴セクション（検索欄の直下） */}
      {searchHistory.length > 0 && (
        <div className="mb-3">
          <label className="text-[10px] font-black text-blue-400 mb-2 block uppercase flex items-center gap-1">
            <History size={12} />
            最近の検索
          </label>
          <div className="flex flex-wrap gap-2">
            {searchHistory.map((item, index) => (
              <button
                key={index}
                onClick={() => handleHistorySelect(item)}
                className="px-3 py-1.5 rounded-full text-xs font-bold bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200 transition-all"
              >
                {item.departure} → {item.arrival}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 3. 3段構成のクイックセレクト */}
      <div className="mb-4 space-y-3">
        {/* 1段目: 彦根エリア */}
        <div>
          <label className="text-[10px] font-black text-blue-400 mb-2 block uppercase">彦根エリア</label>
          <div className="space-y-2">
            <div>
              <span className="text-[9px] font-bold text-gray-400 mb-1 block">JR</span>
              <div className="flex flex-wrap gap-2">
                {HIKONE_STATIONS.jr.map(station => (
                  <button
                    key={station}
                    onClick={() => handleDepartureSelect(station)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                      departure === station
                        ? 'bg-blue-600 text-white shadow-md scale-105'
                        : 'bg-white text-gray-700 border border-gray-200 hover:bg-blue-50'
                    }`}
                  >
                    {station}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <span className="text-[9px] font-bold text-gray-400 mb-1 block">近江鉄道</span>
              <div className="flex flex-wrap gap-2">
                {HIKONE_STATIONS.omi.map(station => (
                  <button
                    key={station}
                    onClick={() => handleDepartureSelect(station)}
                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                      departure === station
                        ? 'bg-blue-600 text-white shadow-md scale-105'
                        : 'bg-white text-gray-700 border border-gray-200 hover:bg-blue-50'
                    }`}
                  >
                    {station}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 2段目: 周辺主要駅 */}
        <div>
          <label className="text-[10px] font-black text-blue-400 mb-2 block uppercase">周辺主要駅</label>
          <div className="flex flex-wrap gap-2">
            {NEARBY_STATIONS.map(station => (
              <button
                key={station}
                onClick={() => handleArrivalSelect(station)}
                className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                  arrival === station
                    ? 'bg-orange-500 text-white shadow-md scale-105'
                    : 'bg-white text-gray-700 border border-gray-200 hover:bg-orange-50'
                }`}
              >
                {station}
              </button>
            ))}
          </div>
        </div>

        {/* 3段目: 広域選択ボタン */}
        <div>
          <button
            onClick={() => setIsRegionalModalOpen(true)}
            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white py-3 rounded-lg font-black shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 text-sm"
          >
            <MapPin size={16} />
            <span>他のエリアの駅を選ぶ</span>
          </button>
        </div>
      </div>

      {/* エラーメッセージ */}
      {error && (
        <div className="bg-red-50 border-2 border-red-200 rounded-xl p-4 mb-4 flex items-start gap-3">
          <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={20} />
          <div className="flex-1">
            <div className="text-sm font-black text-red-800 mb-1">エラー</div>
            <div className="text-xs font-bold text-red-600 whitespace-pre-line">{error}</div>
            {/* APIの生のエラーメッセージがある場合は小さく表示 */}
            {error.includes('[API詳細]') && (
              <div className="text-[10px] text-red-500 mt-2 p-2 bg-red-100 rounded border border-red-200 font-mono">
                {error.split('[API詳細]')[1]}
              </div>
            )}
          </div>
        </div>
      )}

      {/* 経路検索結果 */}
      {routes.length > 0 && (
        <div className="space-y-3">
          <div className="bg-gradient-to-r from-blue-100 to-purple-100 border-2 border-blue-300 rounded-2xl p-4 shadow-lg relative overflow-hidden mb-4">
            <div className="absolute -top-2 -right-2 w-16 h-16 bg-blue-200/30 rounded-full blur-xl" />
            <div className="relative z-10 flex items-start gap-3">
              <img 
                src={HIKONYAN_IMAGE} 
                alt="ひこにゃん" 
                className="w-12 h-12 flex-shrink-0 object-contain"
              />
              <div className="flex-1">
                <div className="text-sm font-black text-gray-800 mb-1">
                  {routes.length}件の経路が見つかったニャ！
                </div>
              </div>
            </div>
          </div>

          {routes.map((route, routeIndex) => {
            const durationMinutes = Math.floor(route.duration / 60)
            const durationHours = Math.floor(durationMinutes / 60)
            const durationText = durationHours > 0 
              ? `${durationHours}時間${durationMinutes % 60}分`
              : `${durationMinutes}分`

            return (
              <div
                key={routeIndex}
                className={`bg-white rounded-2xl p-5 shadow-lg border-2 transition-all hover:scale-[1.02] ${
                  routeIndex === 0
                    ? 'border-orange-400 bg-gradient-to-br from-orange-50 to-white'
                    : 'border-blue-200 hover:border-blue-300'
                }`}
              >
                {/* 経路概要 */}
                <div className="flex items-center justify-between mb-4 pb-4 border-b">
                  <div>
                    <div className="text-xs font-black text-gray-400 uppercase mb-1">総所要時間</div>
                    <div className="text-2xl font-black text-gray-800">{durationText}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-black text-gray-400 uppercase mb-1">運賃</div>
                    <div className="text-xl font-black text-blue-600">{route.fare}円</div>
                  </div>
                  {route.transfers > 0 && (
                    <div className="text-right">
                      <div className="text-xs font-black text-gray-400 uppercase mb-1">乗換</div>
                      <div className="text-lg font-black text-orange-600">{route.transfers}回</div>
                    </div>
                  )}
                </div>

                {/* 経路ステップ */}
                <div className="space-y-2">
                  {route.sections.map((section, sectionIndex) => (
                    <div key={sectionIndex} className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        section.type === 'walk' 
                          ? 'bg-gray-300 text-gray-700'
                          : 'bg-blue-500 text-white'
                      }`}>
                        {section.type === 'walk' ? '🚶' : section.type === 'bus' ? '🚌' : '🚃'}
                      </div>
                      <div className="flex-1">
                        {section.type === 'walk' ? (
                          <div className="text-sm font-bold text-gray-700">
                            徒歩{Math.floor((section.duration || 0) / 60)}分
                            {section.distance ? ` (${Math.floor((section.distance || 0) / 1000)}km)` : ''}
                          </div>
                        ) : (
                          <>
                            <div className="text-xs font-black text-gray-400 uppercase mb-1">
                              {section.lineName || '電車'}
                            </div>
                            <div className="text-sm font-black text-gray-800 mb-1">
                              {section.from} → {section.to}
                            </div>
                            {section.departureTime && section.arrivalTime && (
                              <div className="text-xs font-bold text-gray-600">
                                {section.departureTime}発 → {section.arrivalTime}着
                              </div>
                            )}
                            {section.trainType && (
                              <div className="mt-1">
                                <span className={`text-[10px] px-2 py-1 rounded-full font-black ${
                                  section.trainType.includes('快速') || section.trainType.includes('新快速')
                                    ? 'bg-orange-500 text-white'
                                    : 'bg-blue-100 text-blue-700'
                                }`}>
                                  {section.trainType}
                                </span>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* 4. 「他のエリア」ポップアップ */}
      {isRegionalModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col">
            {/* ヘッダー */}
            <div className="flex items-center justify-between p-4 border-b">
              <h2 className="text-lg font-black text-gray-800">他のエリアの駅を選ぶ</h2>
              <button
                onClick={() => setIsRegionalModalOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={20} className="text-gray-600" />
              </button>
            </div>

            {/* タブ */}
            <div className="flex border-b overflow-x-auto">
              {Object.keys(REGIONAL_STATIONS).map(region => (
                <button
                  key={region}
                  onClick={() => setSelectedRegion(region)}
                  className={`px-4 py-3 text-sm font-bold whitespace-nowrap transition-colors ${
                    selectedRegion === region
                      ? 'bg-blue-600 text-white border-b-2 border-blue-600'
                      : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {region}
                </button>
              ))}
            </div>

            {/* 駅リスト */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="grid grid-cols-2 gap-2">
                {REGIONAL_STATIONS[selectedRegion].map(station => (
                  <button
                    key={station}
                    onClick={() => handleRegionalStationSelect(station)}
                    className="px-4 py-3 rounded-lg text-sm font-bold bg-white border-2 border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-all text-left"
                  >
                    {station}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 下部ナビゲーション */}
      <BottomNavigation />
    </div>
  )
}
