import { NextRequest, NextResponse } from 'next/server'

const ODPT_API_BASE = 'https://api.odpt.jp/api/v4'

// ステップ4: フォールバック（一時的にハードコード）
const FALLBACK_TOKEN = '6i7bm9sauna68506eqc3s0qv13uhnn70yx6qrqvn8aznjnqzydv365fa0smcc5fy'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const lineName = searchParams.get('lineName')

    if (!lineName) {
      return NextResponse.json(
        { error: '路線名が必要です' },
        { status: 400 }
      )
    }

    // ステップ1, 3: サーバー側で環境変数を読み込む
    const apiKey = process.env.NEXT_PUBLIC_ODPT_ACCESS_TOKEN || process.env.ODPT_ACCESS_TOKEN || FALLBACK_TOKEN

    // ステップ2: デバッグ用ログ
    console.log("Token check (train-info):", !!apiKey)

    try {
      // odpt:TrainInformation で運行情報を取得
      const response = await fetch(
        `${ODPT_API_BASE}/odpt:TrainInformation?odpt:railway=${encodeURIComponent(lineName)}&acl:consumerKey=${apiKey}`
      )

      if (!response.ok) {
        // 運行情報がない場合は空配列を返す（エラーではない）
        return NextResponse.json({ trainInfo: [] })
      }

      const data = await response.json()
      
      if (!data || data.length === 0) {
        return NextResponse.json({ trainInfo: [] })
      }

      const trainInfo = data.map((info: any) => ({
        lineName: info['odpt:railway']?.replace(/^.*:/, '') || lineName,
        status: info['odpt:trainInformationStatus'] || 'normal',
        message: info['odpt:trainInformationText']?.[0] || undefined
      }))

      return NextResponse.json({ trainInfo })
    } catch (error: any) {
      console.error('運行情報取得エラー:', error)
      // エラーでも空配列を返す（運行情報は必須ではない）
      return NextResponse.json({ trainInfo: [] })
    }
  } catch (error: any) {
    console.error('APIエラー:', error)
    return NextResponse.json({ trainInfo: [] })
  }
}
