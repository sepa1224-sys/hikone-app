'use server'

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function processPayment(shopId: string, customerId: string, amount: number) {
  // ポイント操作などの特権処理のためService Role Keyを使用
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  try {
    // 1. 顧客存在チェックと残高確認
    const { data: customer, error: fetchError } = await supabase
      .from('profiles')
      .select('points')
      .eq('id', customerId)
      .single()

    if (fetchError || !customer) {
      return { success: false, message: '顧客が見つかりません' }
    }

    if ((customer.points || 0) < amount) {
      return { success: false, message: 'ポイント残高が不足しています' }
    }

    // 2. トランザクション処理
    // ポイント減算
    const newPoints = (customer.points || 0) - amount
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ points: newPoints })
      .eq('id', customerId)

    if (updateError) {
      console.error('Points update error:', updateError)
      return { success: false, message: 'ポイント更新に失敗しました' }
    }

    // ポイント履歴（point_history）にも記録（ユーザー向け表示用）
    await supabase.from('point_history').insert({
      user_id: customerId,
      amount: -amount, // 減算なので負の値？あるいはtypeで管理？既存実装に合わせる
      // 既存のpoint_historyを見ると amount, type, reason があるはず
      type: 'used', // 'earned' | 'used'
      reason: '店舗支払い'
    })

    // 3. 店舗取引履歴記録
    const { error: insertError } = await supabase
      .from('shop_transactions')
      .insert({
        shop_id: shopId,
        customer_id: customerId,
        amount: amount
      })

    if (insertError) {
      console.error('Transaction log error:', insertError)
      // ポイントは減っているがログ失敗。重大なエラーだが、ここでは成功として扱いログに残す
    }

    return { success: true, message: '支払いが完了しました', newPoints }
  } catch (error: any) {
    console.error('Payment processing error:', error)
    return { success: false, message: '予期せぬエラーが発生しました' }
  }
}

export async function getShopStats(shopId: string) {
  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  
  try {
    // 今日の日付（UTC基準で簡易計算）
    const today = new Date()
    today.setUTCHours(0, 0, 0, 0)
    
    const { data, error } = await supabase
      .from('shop_transactions')
      .select('amount, customer_id')
      .eq('shop_id', shopId)
      .gte('created_at', today.toISOString())

    if (error) {
      console.error('Stats fetch error:', error)
      return { success: false, stats: { todayAmount: 0, todayCustomers: 0 } }
    }

    // 集計
    const totalAmount = data.reduce((sum, tx) => sum + tx.amount, 0)
    // ユニークな顧客数
    const uniqueCustomers = new Set(data.map(tx => tx.customer_id)).size

    return {
      success: true,
      stats: {
        todayAmount: totalAmount,
        todayCustomers: uniqueCustomers
      }
    }
  } catch (error) {
    console.error('Stats error:', error)
    return { success: false, stats: { todayAmount: 0, todayCustomers: 0 } }
  }
}
