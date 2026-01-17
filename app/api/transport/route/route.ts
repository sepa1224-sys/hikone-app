import { NextRequest, NextResponse } from 'next/server'

// ステップ1: 地点ID取得 API（正しいエンドポイント）
const NAVITIME_TRANSPORT_NODE_API = 'https://navitime-route-totalnavi.p.rapidapi.com/transport_node'

// ステップ2: 経路検索 API
const NAVITIME_ROUTE_API = 'https://navitime-route-totalnavi.p.rapidapi.com/route_transit'

// フォールバックAPIキー
const FALLBACK_API_KEY = '457cf9cbadmsh41961ebd0cdbcedp14ffc8jsnbd02f2b02db1'

// 地点IDを取得するヘルパー関数
async function getLocationId(
  stationName: string,
  apiKey: string
): Promise<string> {
  const url = `${NAVITIME_TRANSPORT_NODE_API}?word=${encodeURIComponent(stationName)}`
  
  console.log('transport_node API Request URL:')
  console.log(url.replace(apiKey, 'TOKEN_HIDDEN'))
  console.log(`Parameters: word=${stationName}`)
  
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      'X-RapidAPI-Key': apiKey,
      'X-RapidAPI-Host': 'navitime-route-totalnavi.p.rapidapi.com',
      'Accept': 'application/json'
    },
    cache: 'no-store'
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error(`transport_node API Error: ${response.status}`, errorText)
    throw new Error(`地点IDの取得に失敗しました: ${response.status} - ${errorText}`)
  }

  const data = await response.json()
  
  if (!data || !data.items || data.items.length === 0 || !data.items[0].id) {
    throw new Error(`地点が見つかりませんでした: ${stationName}`)
  }

  const locationId = data.items[0].id
  console.log(`✓ 地点ID取得成功: ${locationId}`)
  
  return locationId
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    let start = searchParams.get('start')
    let goal = searchParams.get('goal')

    if (!start || !goal) {
      return NextResponse.json(
        { error: '出発地と到着地が必要です' },
        { status: 400 }
      )
    }

    // 検索キーワードの強制正規化（駅名に「駅」を付加）
    if (!start.endsWith('駅')) {
      start = `${start}駅`
    }
    if (!goal.endsWith('駅')) {
      goal = `${goal}駅`
    }

    // 時刻フォーマットの修正（現在の日付を結合して YYYY-MM-DDTHH:mm:ss 形式に）
    // 必ず new Date().toISOString().split('.')[0] を使用
    const startTime = new Date().toISOString().split('.')[0] // 2026-01-17T12:40:00

    // 楽天RapidAPIキーを取得
    const apiKey = process.env.RAKUTEN_RAPIDAPI_KEY || process.env.NEXT_PUBLIC_RAKUTEN_RAPIDAPI_KEY || FALLBACK_API_KEY

    try {
      // ステップ1: 地点IDの取得（出発地）
      console.log('========================================')
      console.log('Step 1: 地点IDの取得（出発地）')
      console.log(`検索ワード: ${start}`)
      console.log('========================================')

      let startId: string
      try {
        startId = await getLocationId(start, apiKey)
      } catch (error: any) {
        console.error('出発地の地点ID取得に失敗:', error)
        return NextResponse.json(
          { 
            error: `「${start}」がどこのことか分からなかったニャ... もっと詳しく教えてほしいニャ！`,
            details: 'Departure location not found'
          },
          { status: 404 }
        )
      }

      console.log(`取得した地点ID（出発地）: ${startId}`)
      console.log('========================================')

      // ステップ1: 地点IDの取得（到着地）
      console.log('========================================')
      console.log('Step 1: 地点IDの取得（到着地）')
      console.log(`検索ワード: ${goal}`)
      console.log('========================================')

      let goalId: string
      try {
        goalId = await getLocationId(goal, apiKey)
      } catch (error: any) {
        console.error('到着地の地点ID取得に失敗:', error)
        return NextResponse.json(
          { 
            error: `「${goal}」がどこのことか分からなかったニャ... もっと詳しく教えてほしいニャ！`,
            details: 'Arrival location not found'
          },
          { status: 404 }
        )
      }

      console.log(`取得した地点ID（到着地）: ${goalId}`)
      console.log('========================================')

      // ステップ2: 経路検索（地点IDを使用）
      const params = new URLSearchParams({
        start: startId, // ステップ1で取得したID
        goal: goalId,   // ステップ1で取得したID
        start_time: startTime, // 現在時刻をISO形式で（秒まで必須）
        search_type: 'departure' // 必須パラメータ
      })

      const routeUrl = `${NAVITIME_ROUTE_API}?${params.toString()}`

      // ログ出力
      console.log('========================================')
      console.log('Step 2: 経路検索')
      console.log('route_transit API Request URL:')
      console.log(routeUrl.replace(apiKey, 'TOKEN_HIDDEN'))
      console.log('Parameters:')
      console.log(`  start: ${startId}`)
      console.log(`  goal: ${goalId}`)
      console.log(`  start_time: ${startTime}`)
      console.log(`  search_type: departure`)
      console.log('========================================')

      const response = await fetch(routeUrl, {
        method: 'GET',
        headers: {
          'X-RapidAPI-Key': apiKey,
          'X-RapidAPI-Host': 'navitime-route-totalnavi.p.rapidapi.com',
          'Accept': 'application/json'
        },
        cache: 'no-store'
      })

      if (!response.ok) {
        let errorText = ''
        let errorJson: any = null
        
        try {
          errorText = await response.text()
          try {
            errorJson = JSON.parse(errorText)
          } catch {
            // JSONパースに失敗した場合は文字列のまま使用
          }
        } catch {
          errorText = 'Unknown error'
        }
        
        console.error('========================================')
        console.error('NAVITIME API Error:')
        console.error(`Status: ${response.status}`)
        console.error('Error Text:', errorText)
        console.error('Error JSON:', errorJson)
        console.error('========================================')

        // APIの生のメッセージを取得
        const apiMessage = errorJson?.message || errorJson?.error_detail || errorJson?.error || errorText
        const apiErrorDetail = errorJson?.error_detail || errorJson?.details || ''
        
        if (response.status === 404) {
          return NextResponse.json(
            { 
              error: 'そんな場所は見当たらないニャ... もっと詳しく教えてほしいニャ！',
              details: 'Location not found',
              apiMessage: apiMessage,
              apiErrorDetail: apiErrorDetail,
              rawError: errorText
            },
            { status: 404 }
          )
        }
        
        return NextResponse.json(
          { 
            error: '経路検索に失敗しました',
            details: errorText,
            apiMessage: apiMessage,
            apiErrorDetail: apiErrorDetail,
            rawError: errorText
          },
          { status: response.status }
        )
      }

      const data = await response.json()
      
      // NAVITIME APIのレスポンスを整形
      if (!data || !data.items || data.items.length === 0) {
        return NextResponse.json({
          routes: [],
          message: '経路が見つかりませんでした'
        })
      }

      // 経路情報を整形
      const routes = data.items.map((item: any) => {
        const sections: any[] = []
        
        // 各セクション（歩行、電車、バスなど）を処理
        if (item.sections) {
          item.sections.forEach((section: any) => {
            if (section.walk) {
              // 徒歩
              sections.push({
                type: 'walk',
                duration: section.walk.move?.time || 0,
                distance: section.walk.move?.distance || 0
              })
            } else if (section.transit) {
              // 公共交通機関（電車・バス）
              const transit = section.transit
              sections.push({
                type: transit.line?.type || 'train',
                lineName: transit.line?.name || '',
                from: transit.from?.name || '',
                to: transit.to?.name || '',
                departureTime: transit.from?.departure_time || '',
                arrivalTime: transit.to?.arrival_time || '',
                trainType: transit.line?.vehicle_type || '',
                direction: transit.line?.direction || ''
              })
            }
          })
        }

        return {
          departure: start,
          arrival: goal,
          duration: item.summary?.move?.time || 0,
          fare: item.summary?.fare?.total || 0,
          transfers: item.summary?.move?.transfer_count || 0,
          sections: sections
        }
      })

      return NextResponse.json({ routes })
    } catch (error: any) {
      console.error('========================================')
      console.error('NAVITIME API Error (詳細):')
      console.error('Error Message:', error.message)
      console.error('Error Name:', error.name)
      console.error('Error Stack:', error.stack)
      console.error('========================================')
      
      return NextResponse.json(
        { 
          error: '通信に失敗したニャ...',
          details: String(error),
          message: error.message || '経路検索に失敗しました'
        },
        { status: 500 }
      )
    }
  } catch (error: any) {
    console.error('========================================')
    console.error('APIエラー (詳細):')
    console.error('Error Message:', error.message)
    console.error('Error Name:', error.name)
    console.error('Error Stack:', error.stack)
    console.error('========================================')
    
    return NextResponse.json(
      { 
        error: 'サーバーエラーが発生しました',
        details: String(error),
        message: error.message || 'サーバーエラーが発生しました'
      },
      { status: 500 }
    )
  }
}
