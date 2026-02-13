'use server'

import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// --- Helper Functions ---

async function checkAdminPermission(supabase: any, userId: string): Promise<boolean> {
  // 1. Check Environment Variable
  const { data: { user } } = await supabase.auth.admin.getUserById(userId)
  if (process.env.ADMIN_EMAIL && user?.email === process.env.ADMIN_EMAIL) {
    return true
  }

  // 2. Check Profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin, role')
    .eq('id', userId)
    .single()

  return profile?.is_admin === true || profile?.role === 'admin'
}

/**
 * 店舗ターゲット特定ロジック
 * 
 * [重要] 2026-02-12 暗黙的ID解決の実装
 * - 管理者代理 (impersonateShopIdあり): 指定されたIDの店舗を取得し、権限チェックを行う。
 * - 店舗オーナー (通常ログイン): ログインユーザーのID (owner_id) に紐づく店舗を自動特定する。
 *   これにより、フロントエンドから shopId を渡す必要がなくなり、undefined エラーを防ぐ。
 */
async function getShopTarget(supabase: any, userId: string, impersonateShopId?: string) {
  if (impersonateShopId) {
    // 1. Get shop info to check owner
    const { data: shop } = await supabase
      .from('shops')
      .select('id, owner_id')
      .eq('id', impersonateShopId)
      .single()

    if (!shop) {
      console.log(`[Debug] Shop not found for ID: ${impersonateShopId}`)
      return null
    }

    // 2. Allow if the user is the owner of the shop
    if (shop.owner_id === userId) {
      return shop
    }

    // 3. Check admin permission for others
    const isAdmin = await checkAdminPermission(supabase, userId)
    if (!isAdmin) {
      throw new Error('Unauthorized impersonation attempt')
    }
    console.log(`[ADMIN] Accessing shop: ${impersonateShopId} by Admin: ${userId}`)
    return shop
  } else {
    // Implicit resolution: Find shop owned by this user
    const { data: shop } = await supabase
      .from('shops')
      .select('id, owner_id')
      .eq('owner_id', userId)
      .single()
    return shop
  }
}

// --- Main Actions ---

export async function processPayment(userId: string, customerId: string, amount: number) {
  // Use Service Role Key for privileged operations like point manipulation
  const supabase = createServiceClient(supabaseUrl, supabaseServiceKey)

  try {
    // 0. Get Shop ID
    const { data: shop, error: shopError } = await supabase
      .from('shops')
      .select('id')
      .eq('owner_id', userId)
      .single()
    
    if (shopError || !shop) {
      return { success: false, message: 'Shop information not found' }
    }
    const shopId = shop.id

    // 1. Check customer existence and balance
    const { data: customer, error: fetchError } = await supabase
      .from('profiles')
      .select('points')
      .eq('id', customerId)
      .single()

    if (fetchError || !customer) {
      return { success: false, message: 'Customer not found' }
    }

    if ((customer.points || 0) < amount) {
      return { success: false, message: 'Insufficient point balance' }
    }

    // 2. Transaction processing
    // Deduct points
    const newPoints = (customer.points || 0) - amount
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ points: newPoints })
      .eq('id', customerId)

    if (updateError) {
      console.error('Points update error:', updateError)
      return { success: false, message: 'Failed to update points' }
    }

    // Record point history (for user display)
    await supabase.from('point_history').insert({
      user_id: customerId,
      amount: -amount,
      type: 'used', // 'earned' | 'used'
      reason: 'Shop Payment'
    })

    // 3. Record shop transaction history
    const { error: insertError } = await supabase
      .from('shop_transactions')
      .insert({
        shop_id: shopId,
        customer_id: customerId,
        amount: amount
      })

    if (insertError) {
      console.error('Transaction log error:', insertError)
      // Points are deducted but log failed. Treating as success but logging error.
    }

    return { success: true, message: 'Payment completed', newPoints }
  } catch (error: any) {
    console.error('Payment processing error:', error)
    return { success: false, message: 'Unexpected error occurred' }
  }
}

export async function getShopStats(userId: string) {
  const supabase = createServiceClient(supabaseUrl, supabaseServiceKey)
  
  try {
    // 1. Get Profile (points, role)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('points, role')
      .eq('id', userId)
      .single()

    if (profileError || !profile) {
      console.error('Profile fetch error:', profileError)
      return { success: false, error: 'Profile fetch failed' }
    }

    // Role check
    if (profile.role !== 'shop') {
      return { success: false, error: 'Unauthorized' }
    }

    // 2. Get Shop Info
    const { data: shop, error: shopError } = await supabase
      .from('shops')
      .select('id')
      .eq('owner_id', userId)
      .single()
    
    if (shopError || !shop) {
      return {
        success: true,
        stats: {
          currentPoints: profile.points || 0,
          todayCustomers: 0
        }
      }
    }

    // 3. Calculate today's customers
    const today = new Date()
    today.setUTCHours(0, 0, 0, 0)
    
    const { data: transactions, error: txError } = await supabase
      .from('shop_transactions')
      .select('customer_id')
      .eq('shop_id', shop.id)
      .gte('created_at', today.toISOString())

    if (txError) {
      console.error('Stats fetch error:', txError)
    }

    // Unique customers count
    const uniqueCustomers = transactions 
      ? new Set(transactions.map(tx => tx.customer_id)).size 
      : 0

    return {
      success: true,
      stats: {
        currentPoints: profile.points || 0,
        todayCustomers: uniqueCustomers
      }
    }
  } catch (error: any) {
    console.error('Stats processing error:', error)
    return { success: false, error: 'Internal server error' }
  }
}

// --- Shop Settings & Payouts ---

// Get shop details (bank info, etc.)
export async function getShopDetails(userId: string, impersonateShopId?: string) {
  const supabase = createServiceClient(supabaseUrl, supabaseServiceKey)
  try {
    const shop = await getShopTarget(supabase, userId, impersonateShopId)
    
    if (!shop) return { success: false, message: 'Shop not found' }

    // [CRITICAL] shop_bank_details.shop_id references auth.users(id) (Owner ID)
    const { data, error } = await supabase
      .from('shop_bank_details')
      .select('*')
      .eq('shop_id', shop.owner_id) // Use Owner ID
      .single()
    
    if (error && error.code !== 'PGRST116') { // PGRST116: no rows returned
       console.error('getShopDetails error:', error)
    }

    return { success: true, data }
  } catch (error) {
    console.error('getShopDetails error:', error)
    return { success: false }
  }
}

// Get all data for shop settings screen
export async function getShopSettings(userId: string, impersonateShopId?: string) {
  const supabase = createServiceClient(supabaseUrl, supabaseServiceKey)
  try {
    const shop = await getShopTarget(supabase, userId, impersonateShopId)
    if (!shop) return { success: false, message: 'Shop not found' }

    // 1. Shop Basic Info
    const { data: shopData } = await supabase
      .from('shops')
      .select('id, name, address, phone_number, phone, thumbnail_url, gallery_urls, owner_id, opening_hours, category_main, category_sub, meal_type, price_range')
      .eq('id', shop.id)
      .single()

    // 2. Bank Details
    // [CRITICAL] Foreign Key for shop_bank_details references auth.users(id), NOT shops(id).
    // Therefore, we must use owner_id to fetch bank details.
    const { data: bankData } = await supabase
      .from('shop_bank_details')
      .select('*')
      .eq('shop_id', shop.owner_id) // Use owner_id instead of shop.id
      .single()

    // 3. Profile Info (Transaction Password)
    // For Admin proxy, get the shop owner's info
    const targetUserId = shop.owner_id
    const { data: profileData } = await supabase
      .from('profiles')
      .select('transaction_password')
      .eq('id', targetUserId)
      .single()

    return {
      success: true,
      data: {
        shop: shopData,
        bank: bankData,
        profile: profileData
      }
    }
  } catch (error) {
    console.error('getShopSettings error:', error)
    return { success: false, message: 'Failed to fetch data' }
  }
}

// Link shop via invitation code
export async function claimShop(userId: string, invitationCode: string) {
  const supabase = createServiceClient(supabaseUrl, supabaseServiceKey)
  
  try {
    // 1. Verify invitation code
    const { data: invitation, error: inviteError } = await supabase
      .from('shop_invitations')
      .select('*')
      .eq('invitation_code', invitationCode)
      .eq('is_used', false)
      .single()
      
    if (inviteError || !invitation) {
      return { success: false, message: 'Invalid or used invitation code' }
    }
    
    // 2. Update Shop Info (Overwrite owner_id)
    const { error: shopError } = await supabase
      .from('shops')
      .update({ 
        owner_id: userId
      })
      .eq('id', invitation.shop_id)
      
    if (shopError) throw shopError
    
    // 3. Mark invitation as used
    const { error: usedError } = await supabase
      .from('shop_invitations')
      .update({ is_used: true })
      .eq('id', invitation.id)
      
    if (usedError) throw usedError

    // 4. Update User Profile (role=shop, set shop_id)
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ 
        role: 'shop',
        shop_id: invitation.shop_id
      })
      .eq('id', userId)

    if (profileError) throw profileError
    
    return { success: true, message: 'Shop linking completed' }
  } catch (error) {
    console.error('claimShop error:', error)
    return { success: false, message: 'Processing failed' }
  }
}

// Update shop details
export async function updateShopDetails(userId: string, details: any, impersonateShopId?: string) {
  const supabase = createServiceClient(supabaseUrl, supabaseServiceKey)
  try {
    const shop = await getShopTarget(supabase, userId, impersonateShopId)
    
    if (!shop) return { success: false, message: 'Shop not found' }

    if (impersonateShopId) {
      console.log(`[ADMIN] Updating shop details: ${shop.id} by Admin: ${userId}`)
    } else {
      console.log('[Debug] updateShopDetails: Saving with ShopID', {
        ownerId: userId,
        shopId: shop.id
      })
    }

    // Use upsert
    const { error } = await supabase
      .from('shop_bank_details')
      .upsert({
        shop_id: shop.id,
        ...details,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'shop_id'
      })
    
    if (error) throw error

    return { success: true, message: 'Settings saved' }
  } catch (error) {
    console.error('updateShopDetails error:', error)
    return { success: false, message: 'Failed to save settings' }
  }
}

// Get current balance (available for payout)
export async function getShopBalance(userId: string) {
  const supabase = createServiceClient(supabaseUrl, supabaseServiceKey)
  try {
    // 1. Get current points
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('points')
      .eq('id', userId)
      .single()

    if (profileError || !profile) {
      console.error('Profile fetch error:', profileError)
      return { success: false, balance: 0 }
    }

    const currentPoints = profile.points || 0

    // Get Shop ID
    const { data: shop } = await supabase
      .from('shops')
      .select('id')
      .eq('owner_id', userId)
      .single()
    
    if (!shop) return { success: true, balance: currentPoints, currentPoints, lockedAmount: 0 }

    // 2. Get pending and approved but unpaid requests
    const { data: activeRequests, error: activeError } = await supabase
      .from('payout_requests')
      .select('amount')
      .eq('shop_id', shop.id)
      .in('status', ['pending', 'approved'])
    
    if (activeError) throw activeError
    
    const lockedAmount = activeRequests?.reduce((sum, req) => sum + req.amount, 0) || 0

    // Available balance = Current Points - Locked Amount
    const availableBalance = currentPoints - lockedAmount

    return { 
      success: true, 
      balance: availableBalance,
      currentPoints,
      lockedAmount
    }
  } catch (error) {
    console.error('getShopBalance error:', error)
    return { success: false, balance: 0 }
  }
}

// Update transaction password
export async function updateTransactionPassword(userId: string, password: string, impersonateShopId?: string) {
  const supabase = createServiceClient(supabaseUrl, supabaseServiceKey)
  try {
    if (!/^\d{4}$/.test(password)) {
      return { success: false, message: 'Password must be 4 digits' }
    }

    let targetUserId = userId

    if (impersonateShopId) {
       const shop = await getShopTarget(supabase, userId, impersonateShopId)
       if (shop && shop.owner_id) {
         targetUserId = shop.owner_id
         console.log(`[ADMIN] Updating transaction password for user: ${targetUserId} by Admin: ${userId}`)
       } else {
         return { success: false, message: 'Shop owner not found' }
       }
    }

    const { error } = await supabase
      .from('profiles')
      .update({ transaction_password: password })
      .eq('id', targetUserId)
    
    if (error) throw error

    return { success: true, message: 'Transaction password set' }
  } catch (error) {
    console.error('updateTransactionPassword error:', error)
    return { success: false, message: 'Failed to set password' }
  }
}

// Request Payout
export async function requestPayout(userId: string, amount: number, password: string) {
  const supabase = createServiceClient(supabaseUrl, supabaseServiceKey)
  try {
    // Verify password
    const { data: profile, error: passError } = await supabase
      .from('profiles')
      .select('transaction_password')
      .eq('id', userId)
      .single()
    
    if (passError || !profile) {
      return { success: false, message: 'Failed to fetch user info' }
    }

    if (!profile.transaction_password) {
      return { success: false, message: 'Transaction password not set. Please register from settings.' }
    }

    if (profile.transaction_password !== password) {
      return { success: false, message: 'Incorrect password' }
    }

    // Get Shop ID
    const { data: shop, error: shopError } = await supabase
      .from('shops')
      .select('id')
      .eq('owner_id', userId)
      .single()

    if (shopError || !shop) {
      return { success: false, message: 'Shop info not found' }
    }
    const shopId = shop.id

    // Check balance
    const { balance } = await getShopBalance(userId)
    if (balance < amount) {
      return { success: false, message: 'Insufficient balance' }
    }

    // Get Bank Info (Snapshot)
    // [CRITICAL] shop_bank_details.shop_id references auth.users(id) (Owner ID)
    const { data: shopDetails } = await supabase
      .from('shop_bank_details')
      .select('*')
      .eq('shop_id', userId) // Use Owner ID (userId)
      .single()
    
    if (!shopDetails || !shopDetails.account_number) {
      return { success: false, message: 'Bank account info not set' }
    }

    // Create Request
    const { error } = await supabase
      .from('payout_requests')
      .insert({
        shop_id: userId, // Use Owner ID (userId) instead of Shop ID
        amount: amount,
        status: 'pending',
        bank_info: shopDetails // Snapshot
      })
    
    if (error) throw error

    return { success: true, message: 'Payout request accepted' }
  } catch (error) {
    console.error('requestPayout error:', error)
    return { success: false, message: 'Request failed' }
  }
}

// Get Payout Requests History
export async function getPayoutRequests(userId: string) {
  const supabase = createServiceClient(supabaseUrl, supabaseServiceKey)
  try {
    // [UPDATE] Query by Owner ID directly, as payout_requests.shop_id now references profiles(id)
    const { data, error } = await supabase
      .from('payout_requests')
      .select('*')
      .eq('shop_id', userId) // Use Owner ID
      .order('created_at', { ascending: false })
    
    if (error) throw error

    return { success: true, requests: data }
  } catch (error) {
    console.error('getPayoutRequests error:', error)
    return { success: false, requests: [] }
  }
}

// Update Shop Basic Info
export async function updateShopBasicInfo(
  userId: string, 
  params: {
    name?: string
    address?: string
    phoneNumber?: string
    phone?: string // Public phone number
    transactionPassword?: string
    categoryMain?: string
    categorySub?: string
    mealType?: string
    priceRange?: string
    bankInfo?: any
  },
  impersonateShopId?: string
) {
  const supabase = createServiceClient(supabaseUrl, supabaseServiceKey)
  
  try {
    // 0. Get Shop ID
    const shop = await getShopTarget(supabase, userId, impersonateShopId)
    
    if (!shop) {
      console.error('Shop not found for owner:', userId)
      return { success: false, message: 'Shop info not found' }
    }

    // Check Admin Permission
    let isAdmin = false
    if (impersonateShopId) {
      isAdmin = true // Checked in getShopTarget
    } else {
      isAdmin = await checkAdminPermission(supabase, userId)
    }

    if (impersonateShopId) {
      console.log(`[ADMIN] Updating shop basic info: ${shop.id} by Admin: ${userId}`)
    } else {
      console.log('[Debug] updateShopBasicInfo: Saving with ShopID', {
        ownerId: userId,
        shopId: shop.id,
        areSame: shop.id === userId,
        isAdmin
      })
    }

    // 1. Update Shop Info (shops)
    const shopUpdateData: any = {
      updated_at: new Date().toISOString()
    }

    if (params.phoneNumber !== undefined) {
      shopUpdateData.phone_number = params.phoneNumber
    }

    if (params.phone !== undefined) {
      shopUpdateData.phone = params.phone
    }

    if (params.categoryMain !== undefined) shopUpdateData.category_main = params.categoryMain
    if (params.categorySub !== undefined) shopUpdateData.category_sub = params.categorySub
    if (params.mealType !== undefined) shopUpdateData.meal_type = params.mealType
    if (params.priceRange !== undefined) shopUpdateData.price_range = params.priceRange

    if (isAdmin) {
      if (params.name) shopUpdateData.name = params.name
      if (params.address) shopUpdateData.address = params.address
    }

    if (shop) {
      const { error: shopError } = await supabase
        .from('shops')
        .update(shopUpdateData)
        .eq('id', shop.id)
      
      if (shopError) {
        console.error('Shop update error:', shopError)
      }
    }

    // 2. Update Profile (Transaction Password)
    if (params.transactionPassword) {
      if (!/^\d{4}$/.test(params.transactionPassword)) {
        return { success: false, message: 'Transaction password must be 4 digits' }
      }
      
      const targetUserId = impersonateShopId && shop.owner_id ? shop.owner_id : userId

      const { error: profileError } = await supabase
        .from('profiles')
        .update({ transaction_password: params.transactionPassword })
        .eq('id', targetUserId)
      
      if (profileError) {
        console.error('Profile update error:', profileError)
        throw profileError
      }
    }

    // 3. Bank Info Update - Deprecated warning
    if (params.bankInfo) {
      console.warn('[Deprecated] Bank info update in updateShopBasicInfo is deprecated. Use updateShopBankInfo instead.')
    }
    
    return { success: true, message: 'Basic info saved' }
  } catch (error: any) {
    console.error('updateShopBasicInfo error:', error)
    return { success: false, message: 'Save failed: ' + error.message }
  }
}

// Update Shop Opening Hours
export async function updateShopOpeningHours(
  userId: string,
  openingHours: any, // JSON object or string
  impersonateShopId?: string
) {
  const supabase = createServiceClient(supabaseUrl, supabaseServiceKey)
  
  try {
    const shop = await getShopTarget(supabase, userId, impersonateShopId)
    
    if (!shop) {
      return { success: false, message: 'Shop info not found' }
    }

    if (impersonateShopId) {
      console.log(`[ADMIN] Updating opening hours: ${shop.id} by Admin: ${userId}`)
    } else {
      console.log('[Debug] updateShopOpeningHours: Saving with ShopID', {
        ownerId: userId,
        shopId: shop.id
      })
    }

    // Ensure openingHours is an object for JSONB column
    let hoursData = openingHours
    if (typeof openingHours === 'string') {
      try {
        hoursData = JSON.parse(openingHours)
      } catch (e) {
        console.warn('Failed to parse openingHours string, saving as is (might fail if column is jsonb)')
      }
    }

    const { error } = await supabase
      .from('shops')
      .update({ 
        opening_hours: hoursData,
        updated_at: new Date().toISOString()
      })
      .eq('id', shop.id)
    
    if (error) {
      console.error('Opening hours update error:', error)
      return { success: false, message: 'Save failed: ' + error.message }
    }

    return { success: true, message: 'Opening hours saved' }
  } catch (error: any) {
    console.error('updateShopOpeningHours error:', error)
    return { success: false, message: 'Save failed: ' + error.message }
  }
}

// Update Shop Bank Info (Dedicated Function - Service Role & Explicit Upsert)
export async function updateShopBankInfo(
  bankInfo: {
    bankName: string
    branchName: string
    accountType: 'ordinary' | 'current'
    accountNumber: string
    accountHolder: string
  },
  impersonateShopId?: string
) {
  // Always use Service Role Key to bypass RLS
  const supabase = createServiceClient(supabaseUrl, supabaseServiceKey)
  const serverClient = createServerClient()
  
  try {
    // 0. Authenticate User
    const { data: { user }, error: authError } = await serverClient.auth.getUser()
    if (authError || !user) {
      return { success: false, message: 'Authentication required' }
    }
    const userId = user.id

    console.log('[Debug] updateShopBankInfo called', { 
      userId,
      impersonateShopId 
    })

    // 2. Resolve Shop and Owner ID
    // We need both Shop ID (for context/logging) and Owner ID (for shop_bank_details FK)
    let targetShopId: string | undefined
    let targetOwnerId: string | undefined

    // Check Admin Permission first if impersonateShopId is provided
    if (impersonateShopId) {
      const isAdmin = await checkAdminPermission(supabase, userId)
      if (isAdmin) {
        targetShopId = impersonateShopId
        console.log(`[ADMIN] Bank info update for shop ${targetShopId} by admin ${userId}`)
      } else {
        console.warn(`[Security] Unauthorized impersonation attempt by ${userId}`)
      }
    }

    // If no targetShopId yet (normal user or failed admin check), resolve from owner_id
    if (!targetShopId) {
      const { data: shop } = await supabase
        .from('shops')
        .select('id, owner_id')
        .eq('owner_id', userId)
        .single()
      
      if (shop) {
        targetShopId = shop.id
        targetOwnerId = shop.owner_id // Should be same as userId
        console.log(`[Owner] Resolved shop ${targetShopId} for owner ${userId}`)
      }
    }

    if (!targetShopId) {
      return { success: false, message: 'Shop not found for this account' }
    }

    // Ensure we have targetOwnerId (especially for Admin case)
    if (!targetOwnerId) {
      const { data: shop } = await supabase
        .from('shops')
        .select('owner_id, name')
        .eq('id', targetShopId)
        .single()
        
      if (!shop) {
         return { success: false, message: 'Target shop does not exist' }
      }
      targetOwnerId = shop.owner_id
      
      console.log('[Debug] Resolved OwnerID from ShopID:', {
        targetShopId,
        targetOwnerId,
        shopName: shop.name
      })
    }

    if (!targetOwnerId) {
      return { success: false, message: 'Shop has no owner assigned' }
    }

    console.log('[Debug] Final IDs for DB:', { targetShopId, targetOwnerId })

    // 3. Upsert Bank Info (shop_bank_details)
    // [CRITICAL] shop_bank_details.shop_id references auth.users(id) (Owner ID), NOT shops(id).
    // We must use targetOwnerId.
    const { error: bankError } = await supabase
      .from('shop_bank_details')
      .upsert({
        shop_id: targetOwnerId, // Use Owner ID
        bank_name: bankInfo.bankName,
        branch_name: bankInfo.branchName,
        account_type: bankInfo.accountType,
        account_number: bankInfo.accountNumber,
        account_holder: bankInfo.accountHolder,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'shop_id'
      })
    
    if (bankError) {
      console.error('Bank details update error:', bankError)
      throw bankError
    }

    return { success: true, message: 'Bank info saved' }
  } catch (error: any) {
    console.error('updateShopBankInfo error:', error)
    return { success: false, message: 'Failed to save bank info: ' + error.message }
  }
}

// Update Shop Images (Thumbnail, Gallery)
export async function updateShopImages(
  userId: string, 
  thumbnailUrl?: string, 
  galleryUrls?: string[],
  impersonateShopId?: string
) {
  const supabase = createServiceClient(supabaseUrl, supabaseServiceKey)
  try {
    const shop = await getShopTarget(supabase, userId, impersonateShopId)
    
    if (!shop) return { success: false, message: 'Shop not found' }

    if (impersonateShopId) {
       console.log(`[ADMIN] Updating shop images: ${shop.id} by Admin: ${userId}`)
    }

    const updateData: any = { updated_at: new Date().toISOString() }
    
    if (thumbnailUrl !== undefined) {
      updateData.thumbnail_url = thumbnailUrl
    }
    
    if (galleryUrls !== undefined) {
      updateData.gallery_urls = galleryUrls
    }

    const { error } = await supabase
      .from('shops')
      .update(updateData)
      .eq('id', shop.id)

    if (error) throw error
    return { success: true, message: 'Images updated' }
  } catch (error: any) {
    console.error('updateShopImages error:', error)
    return { success: false, message: 'Failed to update images' }
  }
}

// Upload Shop Image (Service Role)
export async function uploadShopImageAction(
  formData: FormData,
  impersonateShopId?: string
) {
  // Use Service Role for Storage if needed, or stick to RLS? 
  // Code history suggests Service Role.
  const supabase = createServiceClient(supabaseUrl, supabaseServiceKey)
  
  try {
    // 1. User Auth (Use Server Client to get current user)
    const serverClient = createServerClient()
    const { data: { user } } = await serverClient.auth.getUser()
    
    if (!user) {
      return { success: false, message: 'Not authenticated' }
    }

    // 2. Resolve Shop ID and Check Permission
    const shop = await getShopTarget(supabase, user.id, impersonateShopId)
    
    if (!shop) {
      return { success: false, message: 'Shop not found' }
    }

    if (impersonateShopId) {
      console.log(`[ADMIN] Uploading image for shop: ${shop.id} by Admin: ${user.id}`)
    }

    // 3. Get File
    const file = formData.get('file') as File
    if (!file) {
      return { success: false, message: 'No file selected' }
    }

    // 4. Upload
    const timestamp = Date.now()
    const fileName = `${shop.id}/${timestamp}.jpg`
    
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const { error: uploadError } = await supabase.storage
      .from('shop-photos')
      .upload(fileName, buffer, {
        contentType: file.type || 'image/jpeg',
        upsert: true
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      throw uploadError
    }

    // 5. Get Public URL
    const { data: { publicUrl } } = supabase.storage
      .from('shop-photos')
      .getPublicUrl(fileName)

    return { success: true, publicUrl }
  } catch (error: any) {
    console.error('uploadShopImageAction error:', error)
    return { success: false, message: 'Upload failed: ' + error.message }
  }
}

// --- Menu Item Management ---

export async function getMenuItems(userId: string, impersonateShopId?: string) {
  const supabase = createServiceClient(supabaseUrl, supabaseServiceKey)
  try {
    const shop = await getShopTarget(supabase, userId, impersonateShopId)
    
    if (!shop) return { success: true, data: [] }

    const { data, error } = await supabase
      .from('menu_items')
      .select('*')
      .eq('shop_id', shop.id)
      .order('sort_order', { ascending: true })
    
    if (error) throw error
    return { success: true, data }
  } catch (error: any) {
    console.error('getMenuItems error:', error)
    // Return empty array to prevent crash if table/columns missing
    return { success: true, data: [] }
  }
}

export async function upsertMenuItem(userId: string, item: any, impersonateShopId?: string) {
  const supabase = createServiceClient(supabaseUrl, supabaseServiceKey)
  try {
    const shop = await getShopTarget(supabase, userId, impersonateShopId)
    if (!shop) return { success: false, message: 'Shop not found' }

    // Prepare data
    // Extreme diet: Minimal payload
    const menuData: any = {
      shop_id: shop.id,
      name: item.name,
      price: parseInt(item.price),
      description: item.description,
      category: item.category,
      // is_available: item.is_available, // Column missing in DB
      // updated_at: new Date().toISOString() // Column missing in DB
    }

    if (item.image_url) {
      console.log('[upsertMenuItem] Saving image_url:', item.image_url)
      menuData.image_url = item.image_url
    }

    let error
    if (item.id) {
      // Update
      const { error: updateError } = await supabase
        .from('menu_items')
        .update(menuData)
        .eq('id', item.id)
      error = updateError
    } else {
      // Insert
      const { error: insertError } = await supabase
        .from('menu_items')
        .insert(menuData)
      error = insertError
    }

    if (error) throw error
    return { success: true, message: 'Menu saved' }
  } catch (error: any) {
    console.error('MENU_SAVE_ERROR:', JSON.stringify(error, null, 2))
    return { success: false, message: 'Save failed: ' + error.message }
  }
}

// Upload Menu Image (Service Role)
export async function uploadMenuImageAction(
  formData: FormData,
  impersonateShopId?: string
) {
  const supabase = createServiceClient(supabaseUrl, supabaseServiceKey)
  
  try {
    // 1. User Auth
    const serverClient = createServerClient()
    const { data: { user } } = await serverClient.auth.getUser()
    
    if (!user) {
      return { success: false, message: 'Not authenticated' }
    }

    // 2. Resolve Shop ID
    const shop = await getShopTarget(supabase, user.id, impersonateShopId)
    if (!shop) {
      return { success: false, message: 'Shop not found' }
    }

    // 3. Get File
    const file = formData.get('file') as File
    if (!file) {
      return { success: false, message: 'No file selected' }
    }

    // 4. Upload
    const timestamp = Date.now()
    // Use shop ID as folder to organize images
    const fileName = `${shop.id}/${timestamp}.jpg`
    
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const { error: uploadError } = await supabase.storage
      .from('menu-images')
      .upload(fileName, buffer, {
        contentType: file.type || 'image/jpeg',
        upsert: true
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      throw uploadError
    }

    // 5. Get Public URL
    const { data: { publicUrl } } = supabase.storage
      .from('menu-images')
      .getPublicUrl(fileName)

    console.log('[uploadMenuImageAction] Image uploaded successfully:', publicUrl)

    return { success: true, publicUrl }
  } catch (error: any) {
    console.error('uploadMenuImageAction error:', error)
    return { success: false, message: 'Upload failed: ' + error.message }
  }
}

export async function deleteMenuItem(userId: string, id: string, impersonateShopId?: string) {
  const supabase = createServiceClient(supabaseUrl, supabaseServiceKey)
  try {
    const shop = await getShopTarget(supabase, userId, impersonateShopId)
    
    if (!shop) return { success: false }

    if (impersonateShopId) {
      console.log(`[ADMIN] Deleting menu item ${id} for shop: ${shop.id} by Admin: ${userId}`)
    }

    const { error } = await supabase
      .from('menu_items')
      .delete()
      .eq('id', id)
      .eq('shop_id', shop.id)
      
    if (error) throw error
    return { success: true }
  } catch (error) {
    console.error('deleteMenuItem error:', error)
    return { success: false }
  }
}

// --- Stamp Card Settings ---

export async function getShopStampSettings(userId: string, impersonateShopId?: string) {
  const supabase = createServiceClient(supabaseUrl, supabaseServiceKey)
  try {
    const shop = await getShopTarget(supabase, userId, impersonateShopId)
    if (!shop) return { success: false, message: 'Shop not found' }

    // Get shop name too
    const { data: shopData } = await supabase
      .from('shops')
      .select('name')
      .eq('id', shop.id)
      .single()

    const { data: card, error } = await supabase
      .from('stamp_cards')
      .select('*')
      .eq('shop_id', shop.id)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('getShopStampSettings error:', error)
    }

    return { 
      success: true, 
      data: card || null, 
      shopId: shop.id,
      shopName: shopData?.name 
    }
  } catch (error) {
    console.error('getShopStampSettings error:', error)
    // Return null data to prevent crash
    return { success: true, data: null, shopId: null, shopName: null }
  }
}

export async function updateShopStampSettings(
  userId: string, 
  settings: { target_count: number, reward_description: string }, 
  impersonateShopId?: string
) {
  const supabase = createServiceClient(supabaseUrl, supabaseServiceKey)
  try {
    const shop = await getShopTarget(supabase, userId, impersonateShopId)
    if (!shop) return { success: false, message: 'Shop not found' }

    if (impersonateShopId) {
      console.log(`[ADMIN] Updating stamp settings: ${shop.id} by Admin: ${userId}`)
    }

    const { error } = await supabase
      .from('stamp_cards')
      .upsert({
        shop_id: shop.id,
        target_count: settings.target_count,
        reward_description: settings.reward_description,
        updated_at: new Date().toISOString()
      })
      
    if (error) throw error

    return { success: true, message: 'Settings saved' }
  } catch (error: any) {
    console.error('updateShopStampSettings error:', error)
    return { success: false, message: 'Failed to save' }
  }
}
