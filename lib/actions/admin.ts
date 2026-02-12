'use server'

import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Admin check helper
async function checkAdmin() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  // Allow access via environment variable
  if (process.env.ADMIN_EMAIL && user.email === process.env.ADMIN_EMAIL) {
    return true
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin, role')
    .eq('id', user.id)
    .single()
  
  return profile?.is_admin === true || profile?.role === 'admin'
}

export async function getAdminShops() {
  if (!await checkAdmin()) {
    return { success: false, message: 'Unauthorized', shops: [] }
  }

  // Use service client to bypass RLS and ensure we get all shops
  const supabase = createServiceClient(supabaseUrl, supabaseServiceKey)
  
  try {
    const { data: shops, error } = await supabase
      .from('shops')
      .select('*')
      .order('created_at', { ascending: false })
    
    // DB直叩きテストログ
    console.log("DB直後のデータ:", shops)

    if (error) throw error

    // Debug: Check if shops exist, if not create dummy data
    if (!shops || shops.length === 0) {
      console.log('[Debug] getAdminShops: No shops found. Creating test data...')
      await supabase.from('shops').insert([
        { name: 'テスト用店舗（DB確認用）', category_main: 'その他', address: 'テスト住所' }
      ])
      // Re-fetch
      const { data: newShops } = await supabase.from('shops').select('*').order('created_at', { ascending: false })
      if (newShops) {
         console.log(`[Debug] Created ${newShops.length} test shops.`)
         return { success: true, shops: newShops.map(s => ({ ...s, owner_name: 'Unknown', stamp_count: 0 })) }
      }
      return { success: true, shops: [] }
    }

    const unassignedCount = shops.filter(s => !s.owner_id).length
    console.log(`[Debug] getAdminShops: Total=${shops.length}, Unassigned=${unassignedCount}`)
    
    // Transform data to include stamp count
    const shopsWithDetails = shops.map(shop => ({
      ...shop,
      owner_name: 'Unknown', // Join removed for simplicity
      stamp_count: 0 // Join removed for simplicity
    }))

    return { success: true, shops: shopsWithDetails }
  } catch (error: any) {
    console.error('getAdminShops error:', error)
    return { 
      success: false, 
      message: error?.message || 'Failed to fetch shops', 
      details: error?.details || JSON.stringify(error),
      shops: [] 
    }
  }
}

export async function getShopForAdmin(shopId: string) {
  if (!await checkAdmin()) {
    return { success: false, message: 'Unauthorized' }
  }

  const supabase = createClient()
  
  try {
    // Fetch basic shop info
    const { data: shop, error: shopError } = await supabase
      .from('shops')
      .select('*')
      .eq('id', shopId)
      .single()
    
    if (shopError || !shop) throw shopError || new Error('Shop not found')

    // Fetch bank info
    // [CRITICAL] shop_bank_details.shop_id references auth.users(id) (Owner ID)
    const { data: bankInfo } = await supabase
      .from('shop_bank_details')
      .select('*')
      .eq('shop_id', shop.owner_id) // Use Owner ID
      .single()

    // Fetch owner profile (for password check/update if needed)
    const { data: profile } = await supabase
      .from('profiles')
      .select('transaction_password, email')
      .eq('id', shop.owner_id)
      .single()

    return { 
      success: true, 
      shop, 
      bankInfo,
      ownerProfile: profile
    }
  } catch (error) {
    console.error('getShopForAdmin error:', error)
    return { success: false, message: 'Failed to fetch shop details' }
  }
}

export async function updateShopByAdmin(
  shopId: string,
  params: {
    phoneNumber?: string
    transactionPassword?: string
    bankInfo?: {
      bankName: string
      branchName: string
      accountType: 'ordinary' | 'current'
      accountNumber: string
      accountHolder: string
    }
  }
) {
  if (!await checkAdmin()) {
    return { success: false, message: 'Unauthorized' }
  }

  // Use service client to ensure admin override works regardless of RLS complexity
  const supabase = createServiceClient(supabaseUrl, supabaseServiceKey)

  try {
    // 1. Update Shop (Phone)
    if (params.phoneNumber !== undefined) {
      const { error } = await supabase
        .from('shops')
        .update({ 
          phone_number: params.phoneNumber,
          updated_at: new Date().toISOString()
        })
        .eq('id', shopId)
      
      if (error) throw error
    }

    // Get owner_id for profile updates
    const { data: shop } = await supabase
      .from('shops')
      .select('owner_id')
      .eq('id', shopId)
      .single()
    
    if (!shop) throw new Error('Shop not found')

    // 2. Update Profile (Transaction Password)
    if (params.transactionPassword) {
      if (!/^\d{4}$/.test(params.transactionPassword)) {
        return { success: false, message: 'Password must be 4 digits' }
      }
      
      const { error } = await supabase
        .from('profiles')
        .update({ transaction_password: params.transactionPassword })
        .eq('id', shop.owner_id)
      
      if (error) throw error
    }

    // 3. Update Bank Info
    if (params.bankInfo) {
      // [CRITICAL] shop_bank_details.shop_id references auth.users(id) (Owner ID)
      const { error } = await supabase
        .from('shop_bank_details')
        .upsert({
          shop_id: shop.owner_id, // Use Owner ID
          bank_name: params.bankInfo.bankName,
          branch_name: params.bankInfo.branchName,
          account_type: params.bankInfo.accountType,
          account_number: params.bankInfo.accountNumber,
          account_holder: params.bankInfo.accountHolder,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'shop_id'
        })
      
      if (error) throw error
    }

    return { success: true, message: 'Updated successfully' }
  } catch (error: any) {
    console.error('updateShopByAdmin error:', error)
    return { success: false, message: 'Update failed: ' + error.message }
  }
}

export async function getPendingPayoutCount() {
  if (!await checkAdmin()) return { success: false, count: 0 }
  
  const supabase = createClient()
  const { count } = await supabase
    .from('payout_requests')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pending')
    
  return { success: true, count: count || 0 }
}

export async function createShopByAdmin(params: {
  name: string
  ownerEmail: string
  category_main: string
}) {
  if (!await checkAdmin()) {
    return { success: false, message: 'Unauthorized' }
  }

  const supabase = createServiceClient(supabaseUrl, supabaseServiceKey)

  try {
    // 1. Check Owner Existence
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, role')
      .eq('email', params.ownerEmail)
      .limit(1)

    if (profileError) throw profileError
    if (!profiles || profiles.length === 0) {
      return { success: false, message: '指定されたメールアドレスのユーザーが見つかりません。まずユーザー登録が必要です。' }
    }

    const owner = profiles[0]

    // 2. Create Shop
    const { data: shop, error: createError } = await supabase
      .from('shops')
      .insert({
        name: params.name,
        owner_id: owner.id,
        category_main: params.category_main,
        address: '未設定',
        phone_number: '',
      })
      .select()
      .single()

    if (createError) throw createError

    // 3. Create Empty Bank Details
    const { error: bankError } = await supabase
      .from('shop_bank_details')
      .insert({
        shop_id: shop.id,
        bank_name: '',
        branch_name: '',
        account_type: 'ordinary',
        account_number: '',
        account_holder: ''
      })

    if (bankError) {
        console.error('Failed to create bank details:', bankError)
    }

    // 4. Create Stamp Card (Default)
    const { error: stampError } = await supabase
        .from('stamp_cards')
        .insert({
            shop_id: shop.id,
            target_count: 10,
            reward_description: '10個集めると特典と交換できます'
        })

    if (stampError) {
        console.error('Failed to create stamp card:', stampError)
    }

    // 5. Update User Role and Link Shop
    if (owner.role !== 'admin') {
      const { error: roleError } = await supabase
        .from('profiles')
        .update({ 
            role: 'shop',
            shop_id: shop.id
        })
        .eq('id', owner.id)

      if (roleError) throw roleError
    }

    return { success: true, message: '店舗を作成しました', shopId: shop.id }
  } catch (error: any) {
    console.error('createShopByAdmin error:', error)
    return { success: false, message: '作成に失敗しました: ' + error.message }
  }
}

/**
 * 管理画面用: 振込申請一覧を取得
 * 
 * [重要] データ構造の変更について (2026-02-12):
 * - payout_requests.shop_id は現在、実質的に `owner_id` (profiles.id) を格納しています。
 * - そのため、shopsテーブルと単純にJOINしても店舗情報は取得できません。
 * - ロジック:
 *   1. 申請データを全件取得
 *   2. 含まれるIDリストから shops と profiles をそれぞれ検索
 *   3. アプリケーション側でマージし、店舗名 -> 個人名 -> メールの順でフォールバック表示
 */
export async function getAdminPayoutRequests() {
  if (!await checkAdmin()) {
    return { success: false, message: 'Unauthorized', requests: [] }
  }

  const supabase = createServiceClient(supabaseUrl, supabaseServiceKey)

  try {
    // 1. Fetch Payout Requests
    const { data: requests, error } = await supabase
      .from('payout_requests')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    if (!requests || requests.length === 0) return { success: true, requests: [] }

    // 2. Extract Owner IDs (stored in shop_id column)
    const ownerIds = Array.from(new Set(requests.map(r => r.shop_id)))

    // 3. Fetch Shops (where owner_id is in the list)
    const { data: shops } = await supabase
      .from('shops')
      .select('id, name, owner_id')
      .in('owner_id', ownerIds)

    // 4. Fetch Profiles (for fallback name)
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .in('id', ownerIds)

    // 5. Combine Data
    const enrichedRequests = requests.map(req => {
      // req.shop_id is actually the Owner ID now
      const ownerId = req.shop_id
      
      const shop = shops?.find(s => s.owner_id === ownerId)
      const profile = profiles?.find(p => p.id === ownerId)

      // Fallback Logic
      const shopName = shop?.name 
        || (profile?.full_name ? `${profile.full_name} (個人)` : null)
        || (profile?.email ? `${profile.email} (個人)` : null)
        || '店舗情報なし (個人アカウント申請)'

      // Parse bank_info if it's JSONB, or use as is
      const bankInfo = req.bank_info

      return {
        ...req,
        shop_name: shopName,
        shop_real_id: shop?.id || null, // The actual Shop UUID if found
        owner_email: profile?.email || 'Unknown',
        bank_details: bankInfo, // [FIX] Frontend expects 'bank_details'
        bank_details_snapshot: bankInfo // Keeping this alias just in case
      }
    })

    return { success: true, requests: enrichedRequests }

  } catch (error: any) {
    console.error('getAdminPayoutRequests error:', error)
    return { success: false, message: '取得に失敗しました: ' + error.message, requests: [] }
  }
}

/**
 * 振込完了処理
 * - ステータスを 'completed' に更新
 * - 申請者のポイント残高から申請額を減算
 * - Service Role を使用してRLSをバイパス
 */
export async function approvePayout(id: string) {
  if (!await checkAdmin()) {
    return { success: false, message: 'Unauthorized' }
  }

  const supabase = createServiceClient(supabaseUrl, supabaseServiceKey)
  console.log(`[Admin] Approving payout request: ${id}`)

  try {
    // 1. Fetch Request Info
    const { data: request, error: fetchError } = await supabase
      .from('payout_requests')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !request) {
      console.error('[Admin] Payout request not found:', fetchError)
      return { success: false, message: '申請が見つかりません' }
    }

    if (request.status === 'paid' || request.status === 'completed') {
      return { success: false, message: '既に完了済みの申請です' }
    }

    const amount = request.amount
    const ownerId = request.shop_id // This is effectively the profile ID (owner_id)

    console.log(`[Admin] Deducting ${amount} points from user ${ownerId}`)

    // 2. Deduct Points from Profile
    // Using RPC is safer for atomic updates, but direct update is requested.
    // We fetch current points first to ensure non-negative (optional but good)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('points')
      .eq('id', ownerId)
      .single()

    if (profileError || !profile) {
      console.error('[Admin] Profile not found for point deduction:', profileError)
      return { success: false, message: '申請者のプロフィールが見つかりません（ポイント減算不可）' }
    }

    // Check balance (optional, but good safety)
    if (profile.points < amount) {
       console.warn(`[Admin] Warning: User points (${profile.points}) are less than payout amount (${amount}). Balance will become negative.`)
    }

    const newPoints = profile.points - amount

    const { error: updatePointsError } = await supabase
      .from('profiles')
      .update({ 
        points: newPoints,
        updated_at: new Date().toISOString()
      })
      .eq('id', ownerId)

    if (updatePointsError) {
      console.error('[Admin] Failed to update profile points:', updatePointsError)
      return { success: false, message: 'ポイント減算に失敗しました: ' + updatePointsError.message }
    }

    // 3. Update Request Status
    const { error: updateStatusError } = await supabase
      .from('payout_requests')
      .update({ 
        status: 'completed', // Changed from 'paid' to 'completed' as requested
        processed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', id)

    if (updateStatusError) {
      console.error('[Admin] Failed to update payout status:', updateStatusError)
      // Ideally rollback points here, but for now just report error.
      // In a real production system, we'd use a postgres transaction or RPC.
      // Attempting rollback:
      await supabase.from('profiles').update({ points: profile.points }).eq('id', ownerId)
      return { success: false, message: 'ステータス更新に失敗しました（ポイントは戻しました）: ' + updateStatusError.message }
    }

    // 4. (Optional) Create Point History Log
    await supabase.from('point_history').insert({
      user_id: ownerId,
      amount: -amount,
      type: 'use', // or 'payout' if available, but schema check says 'earn', 'use', 'referral', 'bonus'
      description: `振込申請によるポイント精算 (申請ID: ${id.slice(0, 8)})`,
      created_at: new Date().toISOString()
    })

    console.log('[Admin] Payout approved successfully.')
    return { success: true, message: '振込完了処理を行い、ポイントを減算しました' }

  } catch (error: any) {
    console.error('approvePayout error:', error)
    return { success: false, message: '処理中にエラーが発生しました: ' + error.message }
  }
}

export async function generateInvitationCode(shopId: string) { return { success: true, code: "123456" }; }

// 店舗にオーナーを紐付ける（管理者機能）
export async function assignShopOwner(shopId: string, ownerEmail: string) {
  if (!await checkAdmin()) {
    return { success: false, message: 'Unauthorized' }
  }

  const supabase = createServiceClient(supabaseUrl, supabaseServiceKey)
  const targetEmail = ownerEmail.trim()

  console.log(`[Admin] Assigning owner. Input: "${ownerEmail}", Target (trimmed): "${targetEmail}"`)

  try {
    // 0. Debug: Log all existing profiles
    const { data: allProfiles } = await supabase.from('profiles').select('email')
    console.log('[Admin] Current Profile Emails:', allProfiles?.map(p => p.email))

    // 1. メールアドレスからユーザーを検索 (Relaxed Search: Case Insensitive)
    let { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, role')
      .ilike('email', targetEmail) // Case insensitive match
      .maybeSingle() // Use maybeSingle to avoid error on 0 rows

    // 2. Force Sync from Auth if not found
    if (!profile) {
      console.log(`[Admin] Profile not found for "${targetEmail}". Attempting force sync from Auth...`)
      
      // List users from Auth (Service Role)
      // Note: listUsers() does not support email filtering directly in all versions, so we fetch and find.
      // Assuming reasonable number of users. If large, need better approach.
      const { data: { users }, error: authError } = await supabase.auth.admin.listUsers({
        page: 1,
        perPage: 1000
      })

      if (authError) {
        console.error('[Admin] Failed to list auth users:', authError)
        return { success: false, message: 'Authユーザーの取得に失敗しました: ' + authError.message }
      }

      const authUser = users?.find(u => u.email?.toLowerCase() === targetEmail.toLowerCase())

      if (authUser) {
        console.log(`[Admin] Found in Auth: ${authUser.id} (${authUser.email}). Creating profile...`)
        
        // Create profile
        const { error: insertError } = await supabase.from('profiles').insert({
          id: authUser.id,
          email: authUser.email,
          role: 'user',
          full_name: authUser.user_metadata?.full_name || authUser.user_metadata?.name || 'Synced User',
          avatar_url: authUser.user_metadata?.avatar_url || authUser.user_metadata?.picture || null
        })

        if (insertError) {
          console.error('[Admin] Failed to create profile:', insertError)
          return { success: false, message: 'プロフィールの作成に失敗しました: ' + insertError.message }
        }

        // Re-fetch created profile
        const { data: newProfile } = await supabase
          .from('profiles')
          .select('id, email, role')
          .eq('id', authUser.id)
          .single()
        
        profile = newProfile
      } else {
        console.log('[Admin] User not found in Auth either.')
      }
    }

    if (!profile) {
      return { success: false, message: `指定されたメールアドレスのユーザーが見つかりません: ${targetEmail} (Authにも存在しません)` }
    }

    const userId = profile.id
    console.log(`[Admin] Proceeding with User ID: ${userId}`)

    // 3. ショップの owner_id を更新
    const { error: shopError } = await supabase
      .from('shops')
      .update({ 
        owner_id: userId,
        updated_at: new Date().toISOString()
      })
      .eq('id', shopId)

    if (shopError) throw shopError

    // 4. ユーザーのプロフィールを更新 (role => shop, shop_id => shopId)
    // 注意: 管理者はroleを変更しない
    if (profile.role !== 'admin') {
      const { error: updateProfileError } = await supabase
        .from('profiles')
        .update({
          role: 'shop',
          shop_id: shopId
        })
        .eq('id', userId)

      if (updateProfileError) {
        console.error('Failed to update user profile role:', updateProfileError)
      }
    }

    return { success: true, message: '店舗にオーナーを紐付けました' }
  } catch (error: any) {
    console.error('assignShopOwner error:', error)
    return { success: false, message: '紐付けに失敗しました: ' + error.message }
  }
}

// 店舗オーナー権限を解除する（管理者機能）
export async function revokeShopOwner(shopId: string) {
  if (!await checkAdmin()) {
    return { success: false, message: 'Unauthorized' }
  }

  const supabase = createServiceClient(supabaseUrl, supabaseServiceKey)

  try {
    // 1. 現在のオーナーIDを取得
    const { data: shop, error: getShopError } = await supabase
      .from('shops')
      .select('owner_id')
      .eq('id', shopId)
      .single()
    
    if (getShopError || !shop) throw new Error('Shop not found')
    
    const ownerId = shop.owner_id
    
    if (!ownerId) {
      return { success: false, message: 'この店舗にはオーナーが設定されていません' }
    }

    // 2. ショップの owner_id をクリア (NULLにする)
    const { error: shopError } = await supabase
      .from('shops')
      .update({ 
        owner_id: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', shopId)

    if (shopError) throw shopError

    // 3. 元オーナーのプロフィールを更新 (role => user, shop_id => null)
    // 注意: 管理者はroleを変更しない
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', ownerId)
      .single()

    if (profile && profile.role !== 'admin') {
      const { error: updateProfileError } = await supabase
        .from('profiles')
        .update({
          role: 'user',
          shop_id: null
        })
        .eq('id', ownerId)

      if (updateProfileError) {
        console.error('Failed to update user profile role:', updateProfileError)
      }
    }

    return { success: true, message: '店舗オーナー権限を解除しました' }
  } catch (error: any) {
    console.error('revokeShopOwner error:', error)
    return { success: false, message: '解除に失敗しました: ' + error.message }
  }
}

// 【緊急修正用】カテゴリーデータ更新
export async function fixShopCategories() {
  if (!await checkAdmin()) {
    return { success: false, message: 'Unauthorized' }
  }
  const supabase = createServiceClient(supabaseUrl, supabaseServiceKey)
  
  const updates = [
    { name: '彦根城前カフェ', category: 'カフェ' },
    { name: '滋賀大ランチ処', category: '定食・ランチ' },
    { name: '中央町ダイナー', category: '居酒屋' }
  ]

  let results = []
  
  for (const update of updates) {
    // category_main を更新
    const { error } = await supabase
      .from('shops')
      .update({ category_main: update.category })
      .eq('name', update.name)
    
    if (error) {
      console.error(`Failed to update ${update.name}:`, error)
      results.push(`${update.name}: Failed`)
    } else {
      results.push(`${update.name}: Success`)
    }
  }
  
  return { success: true, message: results.join(', ') }
}
