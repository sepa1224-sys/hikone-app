import { createClient } from '@/lib/supabase/client'
import { createClient as createServiceClient } from '@supabase/supabase-js'

// Service Role Client for bypassing RLS
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export interface VerificationStatus {
  isVerified: boolean
  verificationCount: number
  hasVerified: boolean // Current user has verified this target user
  canVerify: boolean   // Current user can verify this target user (same school, not self, not yet verified)
}

/**
 * Get verification status for a target user
 */
export async function getVerificationStatus(targetUserId: string): Promise<VerificationStatus> {
  const supabase = createClient(cookies())
  
  const { data: { user } } = await supabase.auth.getUser()
  const currentUserId = user?.id

  // Use Service Role to get accurate counts and status regardless of RLS
  const adminClient = createServiceClient(supabaseUrl, supabaseServiceKey)

  // 1. Get Target User Profile
  const { data: targetProfile, error: targetError } = await adminClient
    .from('profiles')
    .select('verified_status, school_id')
    .eq('id', targetUserId)
    .single()

  if (targetError || !targetProfile) {
    console.error('Target profile not found:', targetError)
    return { isVerified: false, verificationCount: 0, hasVerified: false, canVerify: false }
  }

  // 2. Get Verification Count
  const { count, error: countError } = await adminClient
    .from('student_verifications')
    .select('*', { count: 'exact', head: true })
    .eq('target_id', targetUserId)

  // 3. Check if current user has verified
  let hasVerified = false
  let canVerify = false

  if (currentUserId) {
    // Check if current user has already verified
    const { data: verification } = await adminClient
      .from('student_verifications')
      .select('id')
      .eq('validator_id', currentUserId)
      .eq('target_id', targetUserId)
      .single()
    
    hasVerified = !!verification

    // Check if current user can verify (same school, not self)
    if (currentUserId !== targetUserId && !hasVerified) {
      const { data: currentProfile } = await adminClient
        .from('profiles')
        .select('school_id')
        .eq('id', currentUserId)
        .single()
      
      // Both must have a school_id and it must be the same
      if (currentProfile?.school_id && targetProfile.school_id && currentProfile.school_id === targetProfile.school_id) {
        canVerify = true
      }
    }
  }

  return {
    isVerified: targetProfile.verified_status === 'verified',
    verificationCount: count || 0,
    hasVerified,
    canVerify
  }
}

/**
 * Verify a student
 */
export async function verifyStudent(targetUserId: string) {
  const supabase = createClient(cookies())
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, message: 'ログインが必要です' }
  }

  const currentUserId = user.id
  const adminClient = createServiceClient(supabaseUrl, supabaseServiceKey)

  try {
    // 1. Validation (Double check)
    const status = await getVerificationStatus(targetUserId)
    
    if (!status.canVerify) {
      return { success: false, message: 'このユーザーを認証できません（学校が異なるか、既に認証済みです）' }
    }

    // 2. Insert Verification Record
    const { error: insertError } = await adminClient
      .from('student_verifications')
      .insert({
        validator_id: currentUserId,
        target_id: targetUserId
      })

    if (insertError) {
      console.error('Verification insert error:', insertError)
      return { success: false, message: '認証処理に失敗しました' }
    }

    // 3. Award Points to Validator (100pt)
    const POINTS_REWARD = 100
    
    // Get current points
    const { data: validatorProfile } = await adminClient
      .from('profiles')
      .select('points')
      .eq('id', currentUserId)
      .single()
    
    const currentPoints = validatorProfile?.points || 0
    
    // Update points
    await adminClient
      .from('profiles')
      .update({ points: currentPoints + POINTS_REWARD })
      .eq('id', currentUserId)
    
    // Log history
    await adminClient
      .from('point_history')
      .insert({
        user_id: currentUserId,
        amount: POINTS_REWARD,
        type: 'bonus', // or 'social_verification' if available
        description: '学生認証協力ボーナス',
        created_at: new Date().toISOString()
      })

    // 4. Update Target Status if threshold reached
    // Re-fetch count
    const { count } = await adminClient
      .from('student_verifications')
      .select('*', { count: 'exact', head: true })
      .eq('target_id', targetUserId)
    
    if ((count || 0) >= 3) {
      await adminClient
        .from('profiles')
        .update({ verified_status: 'verified' })
        .eq('id', targetUserId)
    }

    return { success: true, message: '認証しました！100ポイント獲得しました。' }

  } catch (error: any) {
    console.error('Verification process error:', error)
    return { success: false, message: '予期しないエラーが発生しました' }
  }
}

/**
 * Verify a student using QR code
 * QR Format: student-verification:{userId}:{timestamp}
 */
export async function verifyStudentWithQR(qrData: string) {
  try {
    // 1. Parse QR Data
    const parts = qrData.split(':')
    if (parts.length !== 3 || parts[0] !== 'student-verification') {
      return { success: false, message: '無効なQRコードです' }
    }

    const targetUserId = parts[1]
    const timestamp = parseInt(parts[2], 10)

    // 2. Validate Timestamp (valid for 10 minutes)
    const now = Date.now()
    const diff = now - timestamp
    const TEN_MINUTES = 10 * 60 * 1000

    if (isNaN(timestamp) || diff < 0 || diff > TEN_MINUTES) {
      return { success: false, message: 'QRコードの有効期限が切れています。再生成してください。' }
    }

    // 3. Call existing verification logic
    return await verifyStudent(targetUserId)

  } catch (error) {
    console.error('QR verification error:', error)
    return { success: false, message: 'QRコードの処理中にエラーが発生しました' }
  }
}
