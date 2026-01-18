import { NextRequest, NextResponse } from 'next/server'

// Google Directions API を呼び出す関数
async function fetchDirections(
  origin: string, 
  destination: string, 
  departureTime: string, 
  key: string
): Promise<any> {
  const googleUrl = new URL('https://maps.googleapis.com/maps/api/directions/json')
  googleUrl.searchParams.set('origin', origin)
  googleUrl.searchParams.set('destination', destination)
  googleUrl.searchParams.set('mode', 'transit')
  googleUrl.searchParams.set('departure_time', departureTime)
  googleUrl.searchParams.set('alternatives', 'true')
  googleUrl.searchParams.set('language', 'ja')
  googleUrl.searchParams.set('region', 'jp')
  googleUrl.searchParams.set('key', key)
  
  const fullUrl = googleUrl.toString()
  console.log('🔗 Google API リクエスト:', fullUrl.replace(key, 'API_KEY_HIDDEN'))
  
  const res = await fetch(fullUrl, { 
    cache: 'no-store',
    headers: { 'Cache-Control': 'no-cache' } 
  })
  return res.json()
}

// 経路データを整形する関数
function formatRoutes(data: any) {
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

export async function GET(request: NextRequest) {
  const key = process.env.GOOGLE_MAPS_API_KEY || ''
  const { searchParams } = new URL(request.url)
  
  const startLat = searchParams.get('startLat')
  const startLon = searchParams.get('startLon')
  const goalLat = searchParams.get('goalLat')
  const goalLon = searchParams.get('goalLon')
  
  console.log('')
  console.log('========================================')
  console.log('🚃 経路検索API呼び出し')
  console.log('========================================')
  
  // ===== 座標ベースの検索 =====
  const originParam = startLat && startLon 
    ? `${startLat},${startLon}` 
    : '35.2746,136.2522'
  const destinationParam = goalLat && goalLon 
    ? `${goalLat},${goalLon}` 
    : '34.9858,135.7588'
  
  console.log('📍 出発地:', originParam)
  console.log('📍 目的地:', destinationParam)
  
  // ===== 現在時刻をチェック =====
  const now = new Date()
  const currentHour = now.getHours()
  const isLateNight = currentHour >= 0 && currentHour < 5 // 深夜0時〜4時
  
  // 通常の出発時刻（現在時刻+10分）
  let departureTime = Math.floor((Date.now() + 600000) / 1000).toString()
  let isFirstTrainMode = false
  
  // 深夜の場合は始発モードに
  if (isLateNight) {
    console.log('🌙 深夜帯のため、始発検索モードに切り替えます')
    isFirstTrainMode = true
  }

  try {
    // ===== 1回目の検索（通常時刻） =====
    if (!isFirstTrainMode) {
      console.log('🕐 通常検索:', departureTime)
      const data = await fetchDirections(originParam, destinationParam, departureTime, key)
      
      if (data.status === "OK" && data.routes.length > 0) {
        console.log('✅ 経路取得成功！ルート数:', data.routes.length)
        return NextResponse.json({ 
          routes: formatRoutes(data),
          isFirstTrain: false
        })
      }
      
      // ZERO_RESULTS の場合、始発モードで再検索
      console.log('⚠️ 通常検索で結果なし、始発検索に切り替えます')
      isFirstTrainMode = true
    }
    
    // ===== 始発検索（朝5:00） =====
    if (isFirstTrainMode) {
      // 翌日の朝5:00を計算
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      tomorrow.setHours(5, 0, 0, 0)
      const firstTrainTime = Math.floor(tomorrow.getTime() / 1000).toString()
      
      console.log('🌅 始発検索:', firstTrainTime, '(明日 05:00)')
      const data = await fetchDirections(originParam, destinationParam, firstTrainTime, key)
      
      if (data.status === "OK" && data.routes.length > 0) {
        console.log('✅ 始発経路取得成功！ルート数:', data.routes.length)
        return NextResponse.json({ 
          routes: formatRoutes(data),
          isFirstTrain: true  // 始発フラグ
        })
      }
      
      // それでもダメな場合
      console.error('❌ 始発検索でも結果なし:', data.status)
      return NextResponse.json({ 
        routes: [], 
        status: data.status,
        isFirstTrain: true,
        msg: '経路が見つかりませんでした'
      })
    }
    
    return NextResponse.json({ routes: [], msg: '経路が見つかりませんでした' })

  } catch (e: any) {
    console.error("❌ Fetch Error:", e)
    return NextResponse.json({ error: "FETCH_FAILED", message: e.message }, { status: 500 })
  }
}