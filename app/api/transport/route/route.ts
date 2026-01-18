import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const key = process.env.GOOGLE_MAPS_API_KEY || ''
  const { searchParams } = new URL(request.url)
  
  // ===== 座標を直接取得（Place ID は使用しない）=====
  const startLat = searchParams.get('startLat')
  const startLon = searchParams.get('startLon')
  const goalLat = searchParams.get('goalLat')
  const goalLon = searchParams.get('goalLon')
  
  // origin と destination は「緯度,経度」の文字列形式
  const origin = startLat && startLon ? `${startLat},${startLon}` : '35.2746,136.2522'
  const destination = goalLat && goalLon ? `${goalLat},${goalLon}` : '34.9858,135.7588'
  
  console.log('')
  console.log('========================================')
  console.log('🚃 経路検索API')
  console.log('========================================')
  console.log('📍 出発:', origin)
  console.log('📍 到着:', destination)
  
  // ===== シンプルな時刻計算 =====
  // 検索した瞬間の時刻をそのまま送る
  let departureTime = Math.floor(new Date().getTime() / 1000)
  let isFirstTrain = false
  
  console.log('🕐 出発時刻(Unix):', departureTime)

  // Google API呼び出し関数
  const callGoogleAPI = async (depTime: number) => {
    const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${destination}&mode=transit&departure_time=${depTime}&alternatives=true&language=ja&region=jp&key=${key}`
    console.log('🔗 API URL:', url.replace(key, 'KEY_HIDDEN'))
    const res = await fetch(url, { cache: 'no-store' })
    return res.json()
  }

  // 経路データ整形関数
  const formatRoutes = (data: any) => {
    return data.routes.map((route: any) => {
      const leg = route.legs[0]
      return {
        summary: {
          start_time: leg.departure_time?.value * 1000 || Date.now(),
          arrival_time: leg.arrival_time?.value * 1000 || Date.now(),
          move: {
            time: Math.round(leg.duration.value / 60),
            distance: leg.distance.value,
            transfer_count: leg.steps.filter((s: any) => s.travel_mode === 'TRANSIT').length - 1
          },
          fare: { total: leg.fare?.value || 0 }
        },
        sections: leg.steps.map((s: any) => ({
          type: s.travel_mode === 'TRANSIT' ? 'transit' : 'walk',
          transit: s.transit_details ? {
            line: { name: s.transit_details.line.short_name || s.transit_details.line.name },
            from: { name: s.transit_details.departure_stop.name },
            to: { name: s.transit_details.arrival_stop.name }
          } : null,
          walk: s.travel_mode !== 'TRANSIT' ? { 
            instruction: s.html_instructions?.replace(/<[^>]*>?/gm, '') || '徒歩',
            duration: s.duration.text 
          } : null
        }))
      }
    })
  }

  try {
    // 1回目: 現在時刻で検索
    let data = await callGoogleAPI(departureTime)
    
    if (data.status === 'OK' && data.routes?.length > 0) {
      console.log('✅ 経路取得成功:', data.routes.length, '件')
      return NextResponse.json({ routes: formatRoutes(data), isFirstTrain: false })
    }
    
    // 結果がない場合: 現在時刻 + 5時間（始発時間帯）で再検索
    console.log('⚠️ 結果なし → 始発時間帯で再検索')
    const firstTrainTime = departureTime + (5 * 60 * 60) // +5時間
    isFirstTrain = true
    
    data = await callGoogleAPI(firstTrainTime)
    
    if (data.status === 'OK' && data.routes?.length > 0) {
      console.log('✅ 始発経路取得成功:', data.routes.length, '件')
      return NextResponse.json({ routes: formatRoutes(data), isFirstTrain: true })
    }
    
    // それでもダメな場合
    console.error('❌ 経路なし:', data.status)
    return NextResponse.json({ routes: [], isFirstTrain: true, msg: '経路が見つかりませんでした' })

  } catch (e: any) {
    console.error('❌ Error:', e.message)
    return NextResponse.json({ error: 'FETCH_FAILED', message: e.message }, { status: 500 })
  }
}