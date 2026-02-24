import { createClient } from '@/lib/supabase/client'

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
    const supabase = createClient()

    // 1. Fetch Current Profile (to check for immutable fields and completion)
    const { data: profile, error: fetchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Profile fetch error:', fetchError)
      return { success: false, message: 'プロフィールの取得に失敗しました', bonusAwarded: false }
    }

    // 3. Validate Immutable Fields
    if (profile && profile.birthday && data.birthday && data.birthday !== profile.birthday) {
      return { success: false, message: '生年月日は一度設定すると変更できません', bonusAwarded: false }
    }

    // 4. Update Profile
    const { error: updateError } = await supabase
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

    // 5. Check Completion Status
    // If profile didn't exist before update (unlikely for updateProfile but possible if row missing), fetch again or use merged data.
    // However, since we used supabaseAdmin to update, we can't easily get the return data without another query or using select() in update.
    // Let's just fetch the updated profile to be sure, or use the merged data if we trust it.
    // Since we need to check *all* fields, fetching again is safest to ensure DB state.
    const { data: updatedProfile, error: refetchError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (refetchError || !updatedProfile) {
      return { success: true, message: 'プロフィールを更新しました', bonusAwarded: false }
    }

    // Check if already awarded
    if (updatedProfile.is_profile_completed) {
      revalidatePath('/profile')
      return { success: true, message: 'プロフィールを更新しました', bonusAwarded: false }
    }

    // Check completion criteria
    const isComplete = checkProfileCompletion(updatedProfile)

    if (isComplete) {
      // Award Bonus
      // 1. Update is_profile_completed
      // 2. Add points
      // 3. Add point history
      
      // Use transaction-like logic or sequential updates
      const { error: flagError } = await supabase
        .from('profiles')
        .update({ 
          is_profile_completed: true,
          points: (updatedProfile.points || 0) + COMPLETION_BONUS_POINTS
        })
        .eq('id', userId)

      if (flagError) {
        console.error('Bonus flag update error:', flagError)
        // Check if it failed, if so, just return success for update
        return { success: true, message: 'プロフィールを更新しました（ボーナス付与失敗）', bonusAwarded: false }
      }

      // Add history
      await supabase.from('point_history').insert({
        user_id: userId,
        amount: COMPLETION_BONUS_POINTS,
        type: 'earned',
        description: 'プロフィール入力完了ボーナス',
        created_at: new Date().toISOString()
      })

      return { 
        success: true, 
        message: 'プロフィールを更新しました', 
        bonusAwarded: true,
        pointsAwarded: COMPLETION_BONUS_POINTS
      }
    }

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
  const supabase = createClient()
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
