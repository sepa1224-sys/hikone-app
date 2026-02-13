'use server'

import { createClient } from '@supabase/supabase-js'
import { revalidatePath } from 'next/cache'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

// Service Role Client (for point updates)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

// Regular Client (for auth check)
// Note: In Server Actions, we usually create a client with cookies, 
// but for simple checks we can use the admin client if we verify the user ID passed matches the session.
// However, strictly speaking, we should verify the session. 
// For now, I'll rely on the caller to pass the ID and I'll verify the session inside.
import { cookies } from 'next/headers'
import { createServerClient, type CookieOptions } from '@supabase/ssr'

async function createSupabaseServerClient() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
      },
    }
  )
}

export interface ProfileUpdateData {
  full_name?: string
  gender?: string
  birthday?: string
  prefecture?: string
  location?: string
  region?: string
  city?: string
  selected_area?: string
  detail_area?: string
  nearest_station?: string
  interests?: string[]
  is_student?: boolean | null
  user_type?: string
  university_name?: string
  school_name?: string
  faculty?: string
  grade?: string
  school_id?: string
}

export interface UpdateProfileResult {
  success: boolean
  message: string
  bonusAwarded: boolean
  pointsAwarded?: number
  error?: string
}

const COMPLETION_BONUS_POINTS = 200

export async function updateProfile(userId: string, data: ProfileUpdateData): Promise<UpdateProfileResult> {
  try {
    const supabase = await createSupabaseServerClient()
    
    // 1. Verify Authentication
    const { data: { session } } = await supabase.auth.getSession()
    if (!session || session.user.id !== userId) {
      return { success: false, message: 'Unauthorized', bonusAwarded: false }
    }

    // 2. Update Profile
    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        ...data,
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)

    if (updateError) {
      console.error('Profile update error:', updateError)
      return { success: false, message: 'プロフィールの更新に失敗しました', bonusAwarded: false, error: updateError.message }
    }

    // 3. Check Completion Status
    // Fetch the updated profile to check all fields (including ones not in `data`)
    const { data: profile, error: fetchError } = await supabaseAdmin
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (fetchError || !profile) {
      return { success: true, message: 'プロフィールを更新しました', bonusAwarded: false }
    }

    // Check if already awarded
    if (profile.is_profile_completed) {
      revalidatePath('/profile')
      return { success: true, message: 'プロフィールを更新しました', bonusAwarded: false }
    }

    // Check completion criteria
    const isComplete = checkProfileCompletion(profile)

    if (isComplete) {
      // Award Bonus
      // 1. Update is_profile_completed
      // 2. Add points
      // 3. Add point history
      
      // Use transaction-like logic or sequential updates
      const { error: flagError } = await supabaseAdmin
        .from('profiles')
        .update({ 
          is_profile_completed: true,
          points: (profile.points || 0) + COMPLETION_BONUS_POINTS
        })
        .eq('id', userId)

      if (flagError) {
        console.error('Bonus flag update error:', flagError)
        // Check if it failed, if so, just return success for update
        return { success: true, message: 'プロフィールを更新しました（ボーナス付与失敗）', bonusAwarded: false }
      }

      // Add history
      await supabaseAdmin.from('point_history').insert({
        user_id: userId,
        amount: COMPLETION_BONUS_POINTS,
        type: 'earned',
        description: 'プロフィール入力完了ボーナス',
        created_at: new Date().toISOString()
      })

      revalidatePath('/profile')
      return { 
        success: true, 
        message: 'プロフィールを更新しました', 
        bonusAwarded: true,
        pointsAwarded: COMPLETION_BONUS_POINTS
      }
    }

    revalidatePath('/profile')
    return { success: true, message: 'プロフィールを更新しました', bonusAwarded: false }

  } catch (e) {
    console.error('Unexpected error in updateProfile:', e)
    return { success: false, message: '予期しないエラーが発生しました', bonusAwarded: false }
  }
}

// Helper to check completion
function checkProfileCompletion(profile: any): boolean {
  // Required fields for everyone
  const basicFields = [
    'full_name',
    'gender',
    'birthday', // assuming it's stored as string or date
    'prefecture', // or location
    'city',
    'nearest_station',
    'user_type'
  ]

  for (const field of basicFields) {
    if (!profile[field] || (typeof profile[field] === 'string' && profile[field].trim() === '')) {
      // Special case: location vs prefecture
      if (field === 'prefecture' && profile['location']) continue
      return false
    }
  }

  // Interests check
  if (!profile.interests || !Array.isArray(profile.interests) || profile.interests.length === 0) {
    return false
  }

  // Student specific checks
  if (profile.user_type === '大学生') {
    if (!profile.university_name) return false
    if (!profile.faculty) return false
    if (!profile.grade) return false
  } else if (profile.user_type === '高校生' || profile.user_type === '専門学生') {
    if (!profile.school_name && !profile.university_name) return false
    if (!profile.grade) return false
  }

  return true
}

export async function getProfileCompletionStatus(userId: string) {
  const supabase = await createSupabaseServerClient()
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', userId).single()
  
  if (!profile) return { progress: 0, isComplete: false }

  let filledCount = 0
  let totalCount = 0

  // Define fields to track
  const trackingFields = [
    { key: 'full_name', label: 'お名前' },
    { key: 'gender', label: '性別' },
    { key: 'birthday', label: '生年月日' },
    { key: 'prefecture', label: '都道府県' },
    { key: 'city', label: '市区町村' },
    { key: 'nearest_station', label: '最寄り駅' },
    { key: 'interests', label: '興味関心' },
    { key: 'user_type', label: '職業・属性' }
  ]

  // Add student fields if applicable
  if (profile.user_type === '大学生') {
    trackingFields.push(
      { key: 'university_name', label: '大学名' },
      { key: 'faculty', label: '学部' },
      { key: 'grade', label: '学年' }
    )
  } else if (profile.user_type === '高校生' || profile.user_type === '専門学生') {
    trackingFields.push(
      { key: 'school_name', label: '学校名' }, // mapped from university_name or school_name
      { key: 'grade', label: '学年' }
    )
  }

  totalCount = trackingFields.length

  for (const item of trackingFields) {
    const val = profile[item.key]
    if (item.key === 'interests') {
      if (Array.isArray(val) && val.length > 0) filledCount++
    } else if (item.key === 'school_name') {
       if (profile.school_name || profile.university_name) filledCount++
    } else {
      if (val && String(val).trim() !== '') filledCount++
    }
  }

  return {
    progress: Math.round((filledCount / totalCount) * 100),
    isComplete: filledCount === totalCount,
    isAwarded: profile.is_profile_completed
  }
}
