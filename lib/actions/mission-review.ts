'use server'

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabase = createClient(supabaseUrl, supabaseServiceKey)

export async function approveSubmission(submissionId: string, userId: string, points: number, missionTitle: string) {
  try {
    // 1. ステータス更新
    const { error: updateError } = await supabase
      .from('mission_submissions')
      .update({ status: 'approved' })
      .eq('id', submissionId)

    if (updateError) throw updateError

    // 2. ポイント付与
    const { data: profile } = await supabase
      .from('profiles')
      .select('points')
      .eq('id', userId)
      .single()

    const currentPoints = profile?.points || 0
    const newPoints = currentPoints + points

    const { error: pointError } = await supabase
      .from('profiles')
      .update({ points: newPoints })
      .eq('id', userId)

    if (pointError) throw pointError

    // 3. 履歴記録
    await supabase
      .from('point_history')
      .insert({
        user_id: userId,
        amount: points,
        reason: `ミッション完了(承認): ${missionTitle}`,
        type: 'earned',
        created_at: new Date().toISOString()
      })

    return { success: true }
  } catch (error: any) {
    console.error('Approve Error:', error)
    return { success: false, error: error.message }
  }
}

export async function rejectSubmission(submissionId: string, reason: string) {
  try {
    const { error } = await supabase
      .from('mission_submissions')
      .update({ 
        status: 'rejected',
        reviewer_comment: reason
      })
      .eq('id', submissionId)

    if (error) throw error
    return { success: true }
  } catch (error: any) {
    console.error('Reject Error:', error)
    return { success: false, error: error.message }
  }
}

export async function getPendingSubmissions() {
  const { data, error } = await supabase
    .from('mission_submissions')
    .select(`
      *,
      mission:monthly_missions(title, points),
      user:profiles(full_name, avatar_url)
    `)
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Fetch Error:', error)
    return []
  }

  return data
}
