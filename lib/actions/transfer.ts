'use client'

import { supabase } from '@/lib/supabase'

// 送金結果の型定義
export interface TransferResult {
  success: boolean
  message: string
  error?: string
  newBalance?: number
}

/**
 * ひこポを送金する関数
 * 
 * Supabase の RPC 関数 `transfer_hikopo` を呼び出して送金処理を行う
 * 
 * @param senderId - 送金者のユーザーID
 * @param receiverReferralCode - 受取人の招待コード（8桁）
 * @param amount - 送金額（ポイント）
 * @returns { success, message, error?, newBalance? }
 */
export async function sendHikopo(
  senderId: string,
  receiverReferralCode: string,
  amount: number
): Promise<TransferResult> {
  try {
    // バリデーション
    if (!senderId) {
      return { success: false, message: 'ログインが必要です', error: 'NOT_LOGGED_IN' }
    }
    
    if (!receiverReferralCode || receiverReferralCode.trim().length === 0) {
      return { success: false, message: '送り先のコードを入力してください', error: 'EMPTY_CODE' }
    }
    
    if (!amount || amount <= 0) {
      return { success: false, message: '送金額は1以上で入力してください', error: 'INVALID_AMOUNT' }
    }
    
    if (!Number.isInteger(amount)) {
      return { success: false, message: '送金額は整数で入力してください', error: 'NOT_INTEGER' }
    }
    
    const code = receiverReferralCode.trim().toUpperCase()
    
    console.log(`💸 [送金] 開始: ${senderId} → ${code} (${amount}pt)`)
    
    // Supabase RPC 関数を呼び出し
    const { data, error } = await supabase.rpc('transfer_hikopo', {
      sender_id: senderId,
      receiver_referral_code: code,
      amount: amount
    })
    
    if (error) {
      console.error('💸 [送金] RPCエラー:', error)
      
      // エラーメッセージを日本語に変換
      const errorMessage = translateError(error.message)
      return { success: false, message: errorMessage, error: error.code || 'RPC_ERROR' }
    }
    
    console.log(`💸 [送金] 成功: 新残高=${data}pt`)
    
    return {
      success: true,
      message: `🎉 ${amount}ポイントを送りました！`,
      newBalance: data
    }
    
  } catch (error: any) {
    console.error('💸 [送金] 予期しないエラー:', error)
    return { 
      success: false, 
      message: '予期しないエラーが発生しました', 
      error: 'UNKNOWN_ERROR' 
    }
  }
}

/**
 * エラーメッセージを日本語に変換
 */
function translateError(message: string): string {
  if (message.includes('Insufficient balance')) {
    return '残高が不足しています'
  }
  if (message.includes('Receiver not found')) {
    return '送り先のコードが見つかりません'
  }
  if (message.includes('Cannot send to yourself')) {
    return '自分自身には送金できません'
  }
  if (message.includes('Amount must be positive')) {
    return '送金額は1以上で入力してください'
  }
  if (message.includes('Sender not found')) {
    return 'ユーザー情報が見つかりません'
  }
  return message || '送金に失敗しました'
}

/**
 * 送金相手の情報を取得（プレビュー用）
 */
export async function getReceiverInfo(referralCode: string): Promise<{
  found: boolean
  name?: string
  avatarUrl?: string
}> {
  try {
    if (!referralCode || referralCode.trim().length === 0) {
      return { found: false }
    }
    
    const code = referralCode.trim().toUpperCase()
    
    const { data, error } = await supabase
      .from('profiles')
      .select('full_name, avatar_url')
      .eq('referral_code', code)
      .single()
    
    if (error || !data) {
      return { found: false }
    }
    
    return {
      found: true,
      name: data.full_name || 'ユーザー',
      avatarUrl: data.avatar_url || undefined
    }
  } catch {
    return { found: false }
  }
}
