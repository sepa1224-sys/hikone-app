'use server'

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

export async function signUpWithAutoConfirm(email: string, password: string) {
  if (!supabaseServiceKey) {
    console.error('SUPABASE_SERVICE_ROLE_KEY is missing')
    return { success: false, message: 'Server configuration error' }
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  try {
    // Check if user already exists
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers()
    if (listError) throw listError

    const existingUser = users.find(u => u.email === email)
    if (existingUser) {
      if (existingUser.email_confirmed_at) {
        return { success: false, message: 'このメールアドレスは既に登録されています。ログインしてください。' }
      } else {
        // If exists but not confirmed, confirm it now (auto-fix)
        const { error: updateError } = await supabase.auth.admin.updateUserById(
          existingUser.id,
          { email_confirm: true }
        )
        if (updateError) throw updateError
        return { success: true, message: '既存のアカウントを有効化しました。ログインしてください。' }
      }
    }

    // Create new user with auto-confirm
    const { data: user, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    })

    if (createError) throw createError

    return { success: true, message: 'アカウントを作成しました。ログインしてください。' }

  } catch (error: any) {
    console.error('signUpWithAutoConfirm error:', error)
    return { success: false, message: error.message || 'アカウント作成に失敗しました' }
  }
}
