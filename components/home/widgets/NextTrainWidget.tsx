'use client'

import { useState, useEffect } from 'react'
import { Train, Clock, MapPin, AlertCircle, RefreshCw } from 'lucide-react'
import { Skeleton } from '@/components/Skeleton'

interface TrainInfo {
  departureTime: string
  destinationStation: string[]
  trainType: string | null
  minutesUntilDeparture: number | null
  trainName: string | null
}

interface TimetableData {
  stationName: string
  nextTrains: TrainInfo[]
}

interface NextTrainWidgetProps {
  stationName?: string
}

export default function NextTrainWidget({ stationName = '彦根' }: NextTrainWidgetProps) {
  const [data, setData] = useState<TimetableData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchTimetable = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const res = await fetch(`/api/timetable?stationName=${encodeURIComponent(stationName)}`)
      if (!res.ok) throw new Error('時刻表の取得に失敗しました')
      
      const json = await res.json()
      if (!json.success || !json.timetables || json.timetables.length === 0) {
        throw new Error('時刻表データが見つかりません')
      }

      setData({
        stationName: json.timetables[0].stationName,
        nextTrains: json.timetables[0].nextTrains
      })
    } catch (err) {
      console.error(err)
      setError('時刻表を読み込めませんでした')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTimetable()
    
    // 1分ごとに更新
    const interval = setInterval(fetchTimetable, 60000)
    return () => clearInterval(interval)
  }, [stationName])

  if (loading && !data) {
    return (
      <div className="bg-white rounded-[2rem] p-4 shadow-sm border border-gray-100 min-h-[160px]">
        <div className="flex items-center gap-2 mb-3">
          <Train size={16} className="text-blue-500" />
          <h2 className="text-xs font-black text-gray-800">Next Train</h2>
        </div>
        <div className="space-y-3">
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-12 w-full rounded-xl" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-[2rem] p-4 shadow-sm border border-gray-100 min-h-[160px] flex flex-col items-center justify-center text-center">
        <AlertCircle className="text-gray-300 mb-2" size={24} />
        <p className="text-xs text-gray-500 font-bold mb-2">{error}</p>
        <button 
          onClick={fetchTimetable}
          className="text-[10px] bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-full font-bold text-gray-600 transition-colors flex items-center gap-1"
        >
          <RefreshCw size={10} />
          再読み込み
        </button>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-[2rem] p-4 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Train size={16} className="text-blue-500" />
          <h2 className="text-xs font-black text-gray-800">Next Train</h2>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-gray-400 font-bold">
          <MapPin size={10} />
          <span>{data?.stationName}発</span>
        </div>
      </div>

      <div className="space-y-2">
        {data?.nextTrains.slice(0, 3).map((train, idx) => (
          <div key={idx} className="flex items-center justify-between bg-blue-50/50 rounded-xl p-3 border border-blue-100">
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="text-lg font-black text-gray-800 font-mono leading-none">
                  {train.departureTime}
                </span>
                {train.minutesUntilDeparture !== null && (
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    train.minutesUntilDeparture <= 10 ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'
                  }`}>
                    あと{train.minutesUntilDeparture}分
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1 mt-1">
                <span className="text-[10px] font-bold text-gray-500">
                  {train.destinationStation.join('・')}行
                </span>
                {train.trainType && (
                  <span className="text-[9px] bg-gray-200 text-gray-600 px-1 rounded">
                    {train.trainType}
                  </span>
                )}
              </div>
            </div>
            {idx === 0 && (
              <div className="animate-pulse">
                <div className="w-2 h-2 bg-blue-500 rounded-full" />
              </div>
            )}
          </div>
        ))}
        
        {(!data?.nextTrains || data.nextTrains.length === 0) && (
          <div className="text-center py-4 text-xs text-gray-400 font-bold">
            運行予定なし
          </div>
        )}
      </div>
    </div>
  )
}
