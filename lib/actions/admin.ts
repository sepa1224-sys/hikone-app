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
    return { success: false, message: 'Unauthorized' }
  }

  const supabase = createClient()
  
  try {
    const { data: shops, error } = await supabase
      .from('shops')
      .select(`
        *,
        profiles:owner_id (
          email,
          full_name
        ),
        stamp_cards (
          target_count
        )
      `)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    
    // Transform data to include stamp count
    const shopsWithDetails = shops.map(shop => ({
      ...shop,
      owner_name: shop.profiles?.full_name || 'Unknown',
      stamp_count: shop.stamp_cards?.[0]?.target_count || 0 // Assuming one card config per shop or taking first
    }))

    return { success: true, shops: shopsWithDetails }
  } catch (error) {
    console.error('getAdminShops error:', error)
    return { success: false, message: 'Failed to fetch shops' }
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
    const { data: bankInfo } = await supabase
      .from('shop_bank_details')
      .select('*')
      .eq('shop_id', shopId)
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
      const { error } = await supabase
        .from('shop_bank_details')
        .upsert({
          shop_id: shopId,
          bank_name: params.bankInfo.bankName,
          branch_name: params.bankInfo.branchName,
          account_type: params.bankInfo.accountType,
          account_number: params.bankInfo.accountNumber,
          account_holder: params.bankInfo.accountHolder,
          updated_at: new Date().toISOString()
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
  category: string
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
        category: params.category,
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

export async function getAdminPayoutRequests() {
  if (!await checkAdmin()) {
    return { success: false, message: 'Unauthorized' }
  }

  const supabase = createClient()

  try {
    const { data, error } = await supabase
      .from('payout_requests')
      .select(`
        *,
        shops (
          name
        )
      `)
      .order('created_at', { ascending: false })

    if (error) throw error

    // Transform data
    const requests = data.map(req => ({
      ...req,
      shop_name: req.shops?.name || 'Unknown Shop',
      bank_details: req.bank_info // snapshot data
    }))

    return { success: true, requests }
  } catch (error: any) {
    console.error('getAdminPayoutRequests error:', error)
    return { success: false, message: 'Failed to fetch payout requests' }
  }
}

export async function approvePayout(requestId: string, shopId: string, amount: number) {
    if (!await checkAdmin()) {
        return { success: false, message: 'Unauthorized' }
    }

    const supabase = createServiceClient(supabaseUrl, supabaseServiceKey)

    try {
        const { error } = await supabase
            .from('payout_requests')
            .update({
                status: 'paid',
                processed_at: new Date().toISOString()
            })
            .eq('id', requestId)

        if (error) throw error

        return { success: true, message: 'Payout approved successfully' }
    } catch (error: any) {
        console.error('approvePayout error:', error)
        return { success: false, message: 'Approval failed: ' + error.message }
    }
}

export async function generateInvitationCode(shopId: string) {
  try {
    const isAdmin = await checkAdmin()
    if (!isAdmin) {
      return { success: false, message: 'Unauthorized' }
    }

    // Generate a random 6-character code
    const code = Math.random().toString(36).substring(2, 8).toUpperCase()

    // In a real implementation, we would save this to the database
    // For now, we'll just return the code as a mock response
    // await supabase.from('shop_invitations').insert({ shop_id: shopId, code })

    return { success: true, code }
  } catch (error) {
    console.error('Error generating invitation code:', error)
    return { success: false, message: 'Failed to generate code' }
  }
}
