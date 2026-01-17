'use client'

import { useState, useEffect } from 'react'
import { getTrainTimetables, TrainTimetable } from '@/lib/supabase'
import { Train, Clock, MapPin, CalendarDays, ChevronRight } from 'lucide-react'
import BottomNavigation from '@/components/BottomNavigation'

const HIKONE_STATIONS = ['彦根', '南彦根', '河瀬', '稲枝', '彦根口', '高宮']
const DESTINATIONS = ['京都', '米原', '多賀大社前', '近江八幡']

export default function IdoPage() {
  const [selectedStation, setSelectedStation] = useState(HIKONE_STATIONS[0])
  const [selectedDest, setSelectedDest] = useState(DESTINATIONS[0])
  const [isWeekday, setIsWeekday] = useState(true)
  const [timetables, setTimetables] = useState<TrainTimetable[]>([])
  const [loading, setLoading] = useState(true)
  const [currentTime, setCurrentTime] = useState('')

  // 現在時刻の更新
  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now.getHours().toString().padStart(2, '0') + ":" + now.getMinutes().toString().padStart(2, '0'));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // データの取得
  useEffect(() => {
    async function load() {
      setLoading(true)
      try {
        const data = await getTrainTimetables(selectedStation, selectedDest)
        const filtered = data.filter(t => t.is_weekday === isWeekday)
        setTimetables(filtered)
      } catch (error) {
        console.error('データ取得エラー:', error)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [selectedStation, selectedDest, isWeekday])

  return (
    <div className="max-w-md mx-auto p-4 pb-24 bg-slate-50 min-h-screen">
      <header className="mb-4 flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-black text-blue-900 flex items-center gap-2">
            <Train className="w-6 h-6" /> 移動
          </h1>
        </div>
        <div className="text-right">
          <span className="text-xs font-mono bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-bold">
            現在 {currentTime}
          </span>
        </div>
      </header>

      {/* 平日/土日切り替え */}
      <div className="flex bg-gray-200 p-1 rounded-xl mb-4">
        <button 
          onClick={() => setIsWeekday(true)} 
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${isWeekday ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}
        >
          平日
        </button>
        <button 
          onClick={() => setIsWeekday(false)} 
          className={`flex-1 py-2 text-xs font-bold rounded-lg transition ${!isWeekday ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500'}`}
        >
          土日祝
        </button>
      </div>

      {/* 駅選択 */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-blue-50 mb-6">
        <label className="text-[10px] font-black text-blue-400 mb-2 block uppercase">出発駅を選択</label>
        <div className="flex flex-wrap gap-2">
          {HIKONE_STATIONS.map(s => (
            <button 
              key={s} 
              onClick={() => setSelectedStation(s)} 
              className={`px-3 py-1.5 rounded-full text-xs font-bold ${selectedStation === s ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'}`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* 時刻表リスト */}
      <div className="space-y-2">
        {loading ? (
          <div className="text-center py-10 text-gray-400 text-sm font-bold animate-pulse">読み込み中...</div>
        ) : timetables.length > 0 ? (
          timetables.map((t) => {
            const depTime = t.departure_time.slice(0, 5);
            const isPast = depTime < currentTime;
            return (
              <div key={t.id} className={`flex items-center justify-between p-4 rounded-2xl bg-white border transition ${isPast ? 'opacity-40' : 'border-blue-100 shadow-sm'}`}>
                <div className="flex items-center gap-4">
                  <span className={`text-2xl font-mono font-black ${isPast ? 'text-gray-400' : 'text-blue-900'}`}>{depTime}</span>
                  <div>
                    <div className="text-[10px] font-black text-gray-400">{t.line_name}</div>
                    <div className="text-xs font-bold text-gray-700">{t.destination_station}行</div>
                  </div>
                </div>
                <span className={`text-[10px] px-2 py-1 rounded font-black ${t.train_type === '新快速' ? 'bg-orange-500 text-white' : 'bg-blue-50 text-blue-600'}`}>
                  {t.train_type}
                </span>
              </div>
            )
          })
        ) : (
          <div className="bg-white rounded-2xl p-8 text-center border-2 border-dashed border-gray-100 text-gray-400 text-sm font-bold">
            データがありません
          </div>
        )}
      </div>
      
      {/* 下部ナビゲーション */}
      <BottomNavigation />
    </div>
  )
}