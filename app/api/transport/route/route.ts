import { NextRequest, NextResponse } from 'next/server'
import { getStationTimetable, getNextTrains, type StationTimetableParams } from '@/lib/transportApi'

/**
 * 座標から最寄り駅を探す
 */
interface Station {
  id: string
  name: string
  lat: number
  lon: number
  operator: string
}

// 主要駅のデータベース（彦根周辺・京都・大阪）
// 注意: 駅IDは路線ごとに異なるため、正しいIDを使用（Tokaido=東海道線）
const STATIONS_DB: Station[] = [
  { id: 'odpt.Station:JR-West.Tokaido.Hikone', name: '彦根', lat: 35.2746, lon: 136.2522, operator: 'odpt.Operator:JR-West' },
  { id: 'odpt.Station:JR-West.Tokaido.MinamiHikone', name: '南彦根', lat: 35.2467, lon: 136.2361, operator: 'odpt.Operator:JR-West' },
  { id: 'odpt.Station:JR-West.Tokaido.Kawase', name: '河瀬', lat: 35.2206, lon: 136.2217, operator: 'odpt.Operator:JR-West' },
  { id: 'odpt.Station:JR-West.Tokaido.Inae', name: '稲枝', lat: 35.1983, lon: 136.2069, operator: 'odpt.Operator:JR-West' },
  { id: 'odpt.Station:JR-West.Tokaido.Maibara', name: '米原', lat: 35.3147, lon: 136.2908, operator: 'odpt.Operator:JR-West' },
  { id: 'odpt.Station:JR-West.Tokaido.Kusatsu', name: '草津', lat: 35.0222, lon: 135.9593, operator: 'odpt.Operator:JR-West' },
  { id: 'odpt.Station:JR-West.Tokaido.Kyoto', name: '京都', lat: 34.9858, lon: 135.7588, operator: 'odpt.Operator:JR-West' },
  { id: 'odpt.Station:JR-West.Tokaido.Osaka', name: '大阪', lat: 34.7024, lon: 135.4959, operator: 'odpt.Operator:JR-West' },
]

/**
 * 2点間の距離を計算（ハバーサインの公式）
 */
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371 // 地球の半径（km）
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

/**
 * 座標から最寄り駅を探す
 */
function findNearestStation(lat: number, lon: number): Station | null {
  let nearest: Station | null = null
  let minDistance = Infinity
  
  for (const station of STATIONS_DB) {
    const distance = calculateDistance(lat, lon, station.lat, station.lon)
    if (distance < minDistance) {
      minDistance = distance
      nearest = station
    }
  }
  
  return nearest
}

/**
 * 時刻文字列（"HH:MM"）を分に変換
 */
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

/**
 * 分を時刻文字列（"HH:MM"）に変換
 */
function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60) % 24
  const mins = minutes % 60
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
}

/**
 * 経路検索（ODPT APIベース）
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  
  // 座標を取得
  const startLat = parseFloat(searchParams.get('startLat') || '35.2746')
  const startLon = parseFloat(searchParams.get('startLon') || '136.2522')
  const goalLat = parseFloat(searchParams.get('goalLat') || '34.9858')
  const goalLon = parseFloat(searchParams.get('goalLon') || '135.7588')
  
  // 出発時刻を取得（Unix timestamp、オプション）
  const departureTimeParam = searchParams.get('departure_time')
  const departureTime = departureTimeParam 
    ? new Date(parseInt(departureTimeParam) * 1000)
    : new Date()
  
  console.log('')
  console.log('========================================')
  console.log('🚃 経路検索API (ODPT)')
  console.log('========================================')
  console.log('📍 出発座標:', startLat, startLon)
  console.log('📍 到着座標:', goalLat, goalLon)
  console.log('🕐 出発時刻:', departureTime.toISOString())
  
  try {
    // 1. 座標から最寄り駅を探す
    const startStation = findNearestStation(startLat, startLon)
    const goalStation = findNearestStation(goalLat, goalLon)
    
    if (!startStation || !goalStation) {
      return NextResponse.json({ 
        routes: [], 
        msg: '最寄り駅が見つかりませんでした' 
      })
    }
    
    console.log('🚉 出発駅:', startStation.name)
    console.log('🚉 到着駅:', goalStation.name)
    
    // 同じ駅の場合は徒歩のみ
    if (startStation.id === goalStation.id) {
      const walkDistance = calculateDistance(startLat, startLon, goalLat, goalLon) * 1000 // メートル
      const walkTime = Math.round(walkDistance / 80) // 時速4.8km（分速80m）で計算
      
      return NextResponse.json({
        routes: [{
          summary: {
            start_time: departureTime.getTime(),
            arrival_time: departureTime.getTime() + walkTime * 60 * 1000,
            move: {
              time: walkTime,
              distance: Math.round(walkDistance),
              transfer_count: 0
            },
            fare: { total: 0 }
          },
          sections: [{
            type: 'walk',
            walk: {
              instruction: `${startStation.name}駅から徒歩`,
              duration: `${walkTime}分`
            },
            transit: null
          }]
        }],
        isFirstTrain: false
      })
    }
    
    // 2. 出発駅の時刻表を取得
    const now = new Date()
    const dayOfWeek = now.getDay()
    const calendar = dayOfWeek === 0 
      ? 'odpt.Calendar:Holiday' 
      : dayOfWeek === 6 
      ? 'odpt.Calendar:Saturday' 
      : 'odpt.Calendar:Weekday'
    
    const timetableParams: StationTimetableParams = {
      operator: startStation.operator as any,
      station: startStation.id,
      calendar: calendar
    }
    
    console.log('📋 時刻表取得:', timetableParams)
    
    const timetables = await getStationTimetable(timetableParams)
    
    if (!timetables || timetables.length === 0) {
      const stationId = timetableParams.station || '未指定'
      console.warn(`⚠️ [Route API] ID: ${stationId} のデータが見つかりません。IDが間違っている可能性があります`)
      console.warn(`   リクエストパラメータ:`, timetableParams)
      
      return NextResponse.json({ 
        routes: [], 
        msg: '時刻表が見つかりませんでした' 
      })
    }
    
    // 3. 到着駅への直通列車を探す
    const currentTimeMinutes = departureTime.getHours() * 60 + departureTime.getMinutes()
    const routes: any[] = []
    
    for (const timetable of timetables) {
      // 到着駅名でフィルタリング（部分一致）
      const goalStationName = goalStation.name
      
      for (const train of timetable.trains) {
        if (!train.departureTime) continue
        
        const depTimeMinutes = timeToMinutes(train.departureTime)
        
        // 出発時刻が指定時刻以降
        if (depTimeMinutes < currentTimeMinutes) continue
        
        // 行先に到着駅が含まれているか確認
        const hasDestination = train.destinationStation.some(dest => 
          dest.includes(goalStationName) || goalStationName.includes(dest)
        )
        
        if (hasDestination) {
          // 到着時刻を計算（簡易版：出発時刻 + 平均所要時間）
          // 実際のAPIでは、各駅の到着時刻を取得する必要がある
          const estimatedTravelMinutes = 60 // 仮の所要時間（分）
          const arrTimeMinutes = depTimeMinutes + estimatedTravelMinutes
          
          const depTime = new Date(departureTime)
          depTime.setHours(Math.floor(depTimeMinutes / 60), depTimeMinutes % 60, 0, 0)
          
          const arrTime = new Date(depTime)
          arrTime.setMinutes(arrTime.getMinutes() + estimatedTravelMinutes)
          
          routes.push({
            summary: {
              start_time: depTime.getTime(),
              arrival_time: arrTime.getTime(),
              move: {
                time: estimatedTravelMinutes,
                distance: calculateDistance(
                  startStation.lat, startStation.lon,
                  goalStation.lat, goalStation.lon
                ) * 1000, // メートル
                transfer_count: 0
              },
              fare: { total: 0 } // ODPT APIでは運賃情報がない場合がある
            },
            sections: [
              {
                type: 'walk',
                walk: {
                  instruction: '出発地から徒歩',
                  duration: '5分'
                },
                transit: null
              },
              {
                type: 'transit',
                transit: {
                  line: { name: train.trainType || '普通' },
                  from: { name: startStation.name },
                  to: { name: goalStation.name }
                },
                walk: null
              },
              {
                type: 'walk',
                walk: {
                  instruction: '到着地まで徒歩',
                  duration: '5分'
                },
                transit: null
              }
            ]
          })
          
          // 最大3件まで
          if (routes.length >= 3) break
        }
      }
      
      if (routes.length >= 3) break
    }
    
    if (routes.length === 0) {
      // 結果がない場合、次の日の始発で再検索
      const nextDay = new Date(departureTime)
      nextDay.setDate(nextDay.getDate() + 1)
      nextDay.setHours(5, 0, 0, 0) // 5時（始発時間帯）
      
      return NextResponse.json({ 
        routes: [], 
        isFirstTrain: true,
        msg: '現在時刻以降の直通列車が見つかりませんでした。始発時間帯で再検索してください。' 
      })
    }
    
    console.log('✅ 経路取得成功:', routes.length, '件')
    return NextResponse.json({ 
      routes, 
      isFirstTrain: false 
    })
    
  } catch (error: any) {
    console.error('❌ 経路検索エラー:', error)
    return NextResponse.json({ 
      error: 'FETCH_FAILED', 
      message: error.message || '経路検索に失敗しました' 
    }, { status: 500 })
  }
}
