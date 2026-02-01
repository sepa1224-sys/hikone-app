'use server'

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

// 管理者権限（service_role）でクライアントを作成
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export interface SubmitResult {
  success: boolean
  message: string
  pointsAwarded?: number
  error?: string
}

/**
 * ミッション提出処理
 * @param userId ユーザーID
 * @param missionId ミッションID
 * @param type ミッションタイプ ('qr' | 'photo')
 * @param proof 証明データ (QRコードの値 または 画像URL)
 */
export async function submitMission(
  userId: string,
  missionId: string,
  type: 'qr' | 'photo',
  proof: string
): Promise<SubmitResult> {
  try {
    // 1. ミッション情報の取得
    const { data: mission, error: missionError } = await supabase
      .from('monthly_missions')
      .select('*')
      .eq('id', missionId)
      .single()

    if (missionError || !mission) {
      return { success: false, message: 'ミッションが見つかりません', error: 'MISSION_NOT_FOUND' }
    }

    // 2. 既に提出済みかチェック
    const { data: existing, error: checkError } = await supabase
      .from('mission_submissions')
      .select('id')
      .eq('user_id', userId)
      .eq('mission_id', missionId)
      .single()

    if (existing) {
      return { success: false, message: 'このミッションは既に完了しています', error: 'ALREADY_COMPLETED' }
    }

    // 3. QRコードの場合の検証
    // 今回は簡易的に「ミッションID」と「読み取ったコード」が一致するかで判定
    // ※実運用ではQRコード専用のカラムを用意するか、ハッシュ検証などを推奨
    if (type === 'qr') {
      if (proof !== missionId) {
        // デバッグ用: もし "hikonyan_mission_clear" などの共通コードならここで許可するロジックを入れる
        // 今回は厳密にID一致とする
        return { success: false, message: '無効なQRコードです', error: 'INVALID_QR' }
      }
    }

    // 4. 提出レコードの作成
    // QRの場合は即時承認(approved)、写真の場合は承認待ち(pending)
    const status = type === 'qr' ? 'approved' : 'pending'

    const { error: insertError } = await supabase
      .from('mission_submissions')
      .insert({
        user_id: userId,
        mission_id: missionId,
        status: status,
        image_url: type === 'photo' ? proof : null
      })

    if (insertError) {
      console.error('Submission Error:', insertError)
      return { success: false, message: '提出に失敗しました', error: insertError.message }
    }

    // 5. ポイント付与（QRの場合のみ即時付与）
    if (type === 'qr') {
      // プロフィールのポイントを加算
      // RPCがあればそれを使うが、ここでは直接加算する（トランザクションではないため厳密には不整合のリスクがあるが、今回は許容）
      // 理想: await supabase.rpc('increment_points', { user_id: userId, amount: mission.points })
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('points')
        .eq('id', userId)
        .single()
      
      const currentPoints = profile?.points || 0
      const newPoints = currentPoints + mission.points

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ points: newPoints })
        .eq('id', userId)

      if (updateError) {
        console.error('Point Update Error:', updateError)
        return { success: false, message: 'ポイント付与に失敗しました', error: updateError.message }
      }

      // ポイント履歴にも記録
      const { error: historyError } = await supabase
        .from('point_history')
        .insert({
          user_id: userId,
          amount: mission.points,
          reason: `ミッション完了: ${mission.title}`,
          type: 'earned', // 付与タイプ（earned, spentなど）
          created_at: new Date().toISOString()
        })
      
      if (historyError) {
        console.error('Point History Error:', historyError)
        // 履歴保存失敗は致命的ではないので続行
      }
      
      return { 
        success: true, 
        message: `ミッション完了！${mission.points}pt獲得しました！`,
        pointsAwarded: mission.points
      }
    } else {
      // 写真の場合
      return {
        success: true,
        message: '写真を提出しました！承認をお待ちください。'
      }
    }

  } catch (err: any) {
    console.error('Submit Mission Exception:', err)
    return { success: false, message: '予期せぬエラーが発生しました', error: err.message }
  }
}
