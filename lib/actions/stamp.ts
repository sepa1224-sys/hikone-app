'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// 距離計算用 (Haversine formula)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3 // 地球の半径 (メートル)
  const phi1 = (lat1 * Math.PI) / 180
  const phi2 = (lat2 * Math.PI) / 180
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c
}

export async function grantStamp(shopId: string, userLat: number, userLng: number) {
  const supabase = createClient()
  const serviceClient = createServiceClient(supabaseUrl, supabaseServiceKey)

  try {
    // 1. ユーザー認証チェック
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return { success: false, message: 'ログインが必要です' }
    }

    // 2. 店舗の位置情報を取得
    const { data: shop, error: shopError } = await serviceClient
      .from('shops')
      .select('latitude, longitude, name')
      .eq('id', shopId)
      .single()

    if (shopError || !shop) {
      return { success: false, message: '店舗情報が見つかりません' }
    }

    if (shop.latitude === null || shop.longitude === null) {
      return { success: false, message: '店舗の位置情報が登録されていません' }
    }

    // 3. 距離チェック (50m以内)
    const distance = calculateDistance(userLat, userLng, shop.latitude, shop.longitude)
    console.log(`[Stamp Debug] User: (${userLat}, ${userLng}), Shop: (${shop.latitude}, ${shop.longitude}), Distance: ${distance}m`)

    if (distance > 50) {
      return { 
        success: false, 
        message: `店舗からの距離が遠すぎます（現在地から約${Math.round(distance)}m）。店舗に近づいて再度お試しください。` 
      }
    }

    // 4. スタンプ付与 (24時間制限はDBトリガーでチェック)
    const { error: insertError } = await serviceClient
      .from('user_stamps')
      .insert({
        user_id: user.id,
        shop_id: shopId,
      })

    if (insertError) {
      console.error('Stamp insert error:', insertError)
      // トリガーエラーのハンドリング
      if (insertError.message.includes('スタンプは1日1回')) {
        return { success: false, message: 'この店舗のスタンプは1日1回までです。明日またお越しください！' }
      }
      return { success: false, message: 'スタンプの付与に失敗しました' }
    }

    return { success: true, message: 'スタンプを獲得しました！', shopName: shop.name }
  } catch (error: any) {
    console.error('Grant stamp error:', error)
    return { success: false, message: '予期せぬエラーが発生しました' }
  }
}

export async function getStampCard(shopId: string) {
  const supabase = createClient()
  
  try {
    // スタンプカード設定と店舗情報を取得
    const { data: card, error } = await supabase
      .from('stamp_cards')
      .select(`
        *,
        shops (
          name,
          image_url
        )
      `)
      .eq('shop_id', shopId)
      .single()

    if (error) {
      // カード未設定の場合はnullを返す
      return { success: false, message: 'スタンプカードが見つかりません' }
    }

    return { success: true, card }
  } catch (error) {
    return { success: false, message: 'エラーが発生しました' }
  }
}

export async function getUserStamps(shopId: string) {
  const supabase = createClient()

  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, message: 'ログインが必要です' }

    const { data: stamps, error } = await supabase
      .from('user_stamps')
      .select('*')
      .eq('user_id', user.id)
      .eq('shop_id', shopId)
      .order('stamped_at', { ascending: false })

    if (error) {
      console.error('Fetch user stamps error:', error)
      return { success: false, message: 'スタンプ履歴の取得に失敗しました' }
    }

    return { success: true, stamps }
  } catch (error) {
    return { success: false, message: 'エラーが発生しました' }
  }
}

// ユーザーが持っているスタンプカード一覧を取得
export async function getMyStampCards() {
  const supabase = createClient()
  
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, message: 'ログインが必要です' }

    // 全スタンプ履歴を取得
    const { data: stamps, error } = await supabase
      .from('user_stamps')
      .select(`
        shop_id,
        stamped_at,
        shops (
          id,
          name,
          thumbnail_url
        )
      `)
      .eq('user_id', user.id)
      .order('stamped_at', { ascending: false })

    if (error) throw error

    // 店舗ごとに集計
    const cardsMap = new Map<string, any>()

    for (const stamp of stamps || []) {
      const shop = (stamp as any).shops
      if (!shop) continue

      if (!cardsMap.has(shop.id)) {
        cardsMap.set(shop.id, {
          shopId: shop.id,
          shopName: shop.name,
          thumbnailUrl: shop.thumbnail_url,
          lastStampedAt: stamp.stamped_at,
          stampCount: 0
        })
      }
      
      const card = cardsMap.get(shop.id)
      card.stampCount += 1
    }

    const cards = Array.from(cardsMap.values())

    return { success: true, cards }
  } catch (error) {
    console.error('getMyStampCards error:', error)
    return { success: false, message: 'スタンプカードの取得に失敗しました' }
  }
}
