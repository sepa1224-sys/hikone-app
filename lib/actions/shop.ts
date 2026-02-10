'use server'

import { createClient } from '@supabase/supabase-js'
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

async function getShopTarget(supabase: any, userId: string, impersonateShopId?: string) {
  if (impersonateShopId) {
    const isAdmin = await checkAdminPermission(supabase, userId)
    if (!isAdmin) {
      throw new Error('Unauthorized impersonation attempt')
    }
    console.log(`[ADMIN] Accessing shop: ${impersonateShopId} by Admin: ${userId}`)
    
    const { data: shop } = await supabase
      .from('shops')
      .select('id, owner_id')
      .eq('id', impersonateShopId)
      .single()
      
    return shop
  } else {
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
  // ポイント操作などの特権処理のためService Role Keyを使用
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  try {
    // 0. 店舗IDの取得
    const { data: shop, error: shopError } = await supabase
      .from('shops')
      .select('id')
      .eq('owner_id', userId)
      .single()
    
    if (shopError || !shop) {
      return { success: false, message: '店舗情報が見つかりません' }
    }
    const shopId = shop.id

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

export async function getShopStats(userId: string) {
  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  
  try {
    // 1. プロフィール（ポイント・ロール）の取得
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('points, role')
      .eq('id', userId)
      .single()

    if (profileError || !profile) {
      console.error('Profile fetch error:', profileError)
      return { success: false, error: 'Profile fetch failed' }
    }

    // ロールチェック
    if (profile.role !== 'shop') {
      return { success: false, error: 'Unauthorized' }
    }

    // 2. 店舗情報の取得
    const { data: shop, error: shopError } = await supabase
      .from('shops')
      .select('id')
      .eq('owner_id', userId)
      .single()
    
    if (shopError || !shop) {
      // 店舗が紐付いていない場合でもポイント表示などは可能にするか？
      // ここでは店舗データがないと来店数は出せないので0を返す
      return {
        success: true,
        stats: {
          currentPoints: profile.points || 0,
          todayCustomers: 0
        }
      }
    }

    // 3. 本日の来店人数集計
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

    // ユニークな顧客数
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

// --- 店舗設定・振込関連 ---

// 店舗詳細（銀行口座情報など）の取得
export async function getShopDetails(userId: string, impersonateShopId?: string) {
  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  try {
    // 店舗ID取得
    const shop = await getShopTarget(supabase, userId, impersonateShopId)
    
    if (!shop) return { success: false, message: '店舗が見つかりません' }

    const { data, error } = await supabase
      .from('shop_bank_details')
      .select('*')
      .eq('shop_id', shop.id)
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

// 店舗設定画面用の一括データ取得
export async function getShopSettings(userId: string, impersonateShopId?: string) {
  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  try {
    const shop = await getShopTarget(supabase, userId, impersonateShopId)
    if (!shop) return { success: false, message: '店舗が見つかりません' }

    // 1. 店舗基本情報
    const { data: shopData } = await supabase
      .from('shops')
      .select('id, name, address, phone_number, thumbnail_url, gallery_urls, owner_id')
      .eq('id', shop.id)
      .single()

    // 2. 銀行口座情報
    const { data: bankData } = await supabase
      .from('shop_bank_details')
      .select('*')
      .eq('shop_id', shop.id)
      .single()

    // 3. プロフィール情報（決済パスワード）
    // Admin代理の場合は、ショップオーナーの情報を取得
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
    return { success: false, message: 'データ取得に失敗しました' }
  }
}

// 招待コードによる店舗紐付け
export async function claimShop(userId: string, invitationCode: string) {
  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  
  try {
    // 1. 招待コードの確認
    const { data: invitation, error: inviteError } = await supabase
      .from('shop_invitations')
      .select('*')
      .eq('invitation_code', invitationCode)
      .eq('is_used', false)
      .single()
      
    if (inviteError || !invitation) {
      return { success: false, message: '無効または使用済みの招待コードです' }
    }
    
    // 2. 店舗情報の更新 (owner_idの上書き)
    // ユーザー指示: 既にowner_idがあっても上書きする
    const { error: shopError } = await supabase
      .from('shops')
      .update({ 
        owner_id: userId
        // updated_at: new Date().toISOString() // カラム存在確認できていないため一旦除外
      })
      .eq('id', invitation.shop_id)
      
    if (shopError) throw shopError
    
    // 3. 招待コードの使用済みマーク
    const { error: usedError } = await supabase
      .from('shop_invitations')
      .update({ is_used: true })
      .eq('id', invitation.id)
      
    if (usedError) throw usedError

    // 4. ユーザープロフィールの更新 (role=shop, shop_id設定)
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ 
        role: 'shop',
        shop_id: invitation.shop_id
      })
      .eq('id', userId)

    if (profileError) throw profileError
    
    return { success: true, message: '店舗の紐付けが完了しました' }
  } catch (error) {
    console.error('claimShop error:', error)
    return { success: false, message: '処理に失敗しました' }
  }
}

// 店舗詳細の更新
export async function updateShopDetails(userId: string, details: any, impersonateShopId?: string) {
  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  try {
    const shop = await getShopTarget(supabase, userId, impersonateShopId)
    
    if (!shop) return { success: false, message: '店舗が見つかりません' }

    if (impersonateShopId) {
      console.log(`[ADMIN] Updating shop details: ${shop.id} by Admin: ${userId}`)
    } else {
      console.log('[Debug] updateShopDetails: Saving with ShopID', {
        ownerId: userId,
        shopId: shop.id
      })
    }

    // upsertを使用（存在しなければ作成、あれば更新）
    const { error } = await supabase
      .from('shop_bank_details')
      .upsert({
        shop_id: shop.id,
        ...details,
        updated_at: new Date().toISOString()
      })
    
    if (error) throw error

    return { success: true, message: '設定を保存しました' }
  } catch (error) {
    console.error('updateShopDetails error:', error)
    return { success: false, message: '設定の保存に失敗しました' }
  }
}

// 現在の残高（振込可能額）を取得
export async function getShopBalance(userId: string) {
  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  try {
    // 1. 現在のポイント（profiles.points）を取得
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

    // 店舗ID取得
    const { data: shop } = await supabase
      .from('shops')
      .select('id')
      .eq('owner_id', userId)
      .single()
    
    if (!shop) return { success: true, balance: currentPoints, currentPoints, lockedAmount: 0 }

    // 2. 申請中の金額（pending）および承認済みだが未振込（approved）を取得
    const { data: activeRequests, error: activeError } = await supabase
      .from('payout_requests')
      .select('amount')
      .eq('shop_id', shop.id)
      .in('status', ['pending', 'approved'])
    
    if (activeError) throw activeError
    
    const lockedAmount = activeRequests?.reduce((sum, req) => sum + req.amount, 0) || 0

    // 振込可能残高 = 現在の保有ポイント - ロック中の金額
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

// 決済用パスワードの設定・更新
export async function updateTransactionPassword(userId: string, password: string, impersonateShopId?: string) {
  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  try {
    if (!/^\d{4}$/.test(password)) {
      return { success: false, message: 'パスワードは4桁の数字で入力してください' }
    }

    let targetUserId = userId

    if (impersonateShopId) {
       // Impersonation for password update? 
       // If admin is updating shop settings, they might be updating the shop owner's transaction password?
       // This is tricky because transaction_password is on profiles table.
       // We need to find the owner of the shop.
       const shop = await getShopTarget(supabase, userId, impersonateShopId)
       if (shop && shop.owner_id) {
         targetUserId = shop.owner_id
         console.log(`[ADMIN] Updating transaction password for user: ${targetUserId} by Admin: ${userId}`)
       } else {
         return { success: false, message: '店舗オーナーが見つかりません' }
       }
    }

    const { error } = await supabase
      .from('profiles')
      .update({ transaction_password: password })
      .eq('id', targetUserId)
    
    if (error) throw error

    return { success: true, message: '暗証番号を設定しました' }
  } catch (error) {
    console.error('updateTransactionPassword error:', error)
    return { success: false, message: '設定に失敗しました' }
  }
}

// 振込申請
export async function requestPayout(userId: string, amount: number, password: string) {
  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  try {
    // パスワード確認
    const { data: profile, error: passError } = await supabase
      .from('profiles')
      .select('transaction_password')
      .eq('id', userId)
      .single()
    
    if (passError || !profile) {
      return { success: false, message: 'ユーザー情報の取得に失敗しました' }
    }

    if (!profile.transaction_password) {
      return { success: false, message: '暗証番号が設定されていません。設定画面から登録してください。' }
    }

    if (profile.transaction_password !== password) {
      return { success: false, message: '暗証番号が間違っています' }
    }

    // 店舗ID取得
    const { data: shop, error: shopError } = await supabase
      .from('shops')
      .select('id')
      .eq('owner_id', userId)
      .single()

    if (shopError || !shop) {
      return { success: false, message: '店舗情報が見つかりません' }
    }
    const shopId = shop.id

    // 残高チェック
    const { balance } = await getShopBalance(userId)
    if (balance < amount) {
      return { success: false, message: '残高が不足しています' }
    }

    // 口座情報の取得（スナップショット用）
    const { data: shopDetails } = await supabase
      .from('shop_bank_details')
      .select('*')
      .eq('shop_id', shopId)
      .single()
    
    if (!shopDetails || !shopDetails.account_number) {
      return { success: false, message: '振込先口座情報が設定されていません' }
    }

    // 申請作成
    const { error } = await supabase
      .from('payout_requests')
      .insert({
        shop_id: shopId,
        amount: amount,
        status: 'pending',
        bank_info: shopDetails // スナップショット保存
      })
    
    if (error) throw error

    return { success: true, message: '振込申請を受け付けました' }
  } catch (error) {
    console.error('requestPayout error:', error)
    return { success: false, message: '申請に失敗しました' }
  }
}

// 振込申請履歴の取得
export async function getPayoutRequests(userId: string) {
  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  try {
    const { data: shop } = await supabase
      .from('shops')
      .select('id')
      .eq('owner_id', userId)
      .single()
    
    if (!shop) return { success: true, requests: [] }

    const { data, error } = await supabase
      .from('payout_requests')
      .select('*')
      .eq('shop_id', shop.id)
      .order('created_at', { ascending: false })
    
    if (error) throw error

    return { success: true, requests: data }
  } catch (error) {
    console.error('getPayoutRequests error:', error)
    return { success: false, requests: [] }
  }
}

// 店舗基本情報（住所・電話番号・パスワード・銀行口座）の更新
export async function updateShopBasicInfo(
  userId: string, 
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
  },
  impersonateShopId?: string
) {
  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  
  try {
    // 0. 店舗IDの取得
    const shop = await getShopTarget(supabase, userId, impersonateShopId)
    
    if (!shop) {
      console.error('Shop not found for owner:', userId)
      return { success: false, message: '店舗情報が見つかりません' }
    }

    if (impersonateShopId) {
      console.log(`[ADMIN] Updating shop basic info: ${shop.id} by Admin: ${userId}`)
    } else {
      console.log('[Debug] updateShopBasicInfo: Saving with ShopID', {
        ownerId: userId,
        shopId: shop.id,
        areSame: shop.id === userId
      })
    }

    // 1. 店舗情報 (shops) の更新 - 電話番号
    if (params.phoneNumber !== undefined && shop) {
      const { error: shopError } = await supabase
        .from('shops')
        .update({ 
          phone_number: params.phoneNumber,
          updated_at: new Date().toISOString()
        })
        .eq('id', shop.id)
      
      if (shopError) {
        console.error('Shop update error:', shopError)
      }
    }

    // 2. プロフィール (profiles) の更新 - 決済用パスワード
    if (params.transactionPassword) {
      if (!/^\d{4}$/.test(params.transactionPassword)) {
        return { success: false, message: '決済パスワードは4桁の数字で入力してください' }
      }
      
      // Admin代理の場合は、ショップのオーナーIDに対してパスワードを設定する
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

    // 3. 銀行口座情報 (shop_bank_details) の更新
    if (params.bankInfo && shop) {
      const { error: bankError } = await supabase
        .from('shop_bank_details')
        .upsert({
          shop_id: shop.id,
          bank_name: params.bankInfo.bankName,
          branch_name: params.bankInfo.branchName,
          account_type: params.bankInfo.accountType,
          account_number: params.bankInfo.accountNumber,
          account_holder: params.bankInfo.accountHolder,
          updated_at: new Date().toISOString()
        })
      
      if (bankError) {
        console.error('Bank details update error:', bankError)
        throw bankError
      }
    }
    
    return { success: true, message: '基本情報を保存しました' }
  } catch (error: any) {
    console.error('updateShopBasicInfo error:', error)
    return { success: false, message: '保存に失敗しました: ' + error.message }
  }
}

// 店舗画像の更新 (サムネイル、ギャラリー)
export async function updateShopImages(
  userId: string, 
  thumbnailUrl?: string, 
  galleryUrls?: string[],
  impersonateShopId?: string
) {
  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  try {
    const shop = await getShopTarget(supabase, userId, impersonateShopId)
    
    if (!shop) return { success: false, message: '店舗が見つかりません' }

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
    return { success: true, message: '画像を更新しました' }
  } catch (error: any) {
    console.error('updateShopImages error:', error)
    return { success: false, message: '画像の更新に失敗しました' }
  }
}

// 店舗画像のアップロード（Service Role使用）
export async function uploadShopImageAction(
  formData: FormData,
  impersonateShopId?: string
) {
  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  
  try {
    // 1. ユーザー認証 (Server Clientを使用)
    const serverClient = createServerClient()
    const { data: { user } } = await serverClient.auth.getUser()
    
    if (!user) {
      return { success: false, message: '認証されていません' }
    }

    // 2. 店舗IDの解決と権限チェック
    // getShopTargetはuserIdを受け取るが、ここでは認証済みユーザーIDを使用
    const shop = await getShopTarget(supabase, user.id, impersonateShopId)
    
    if (!shop) {
      return { success: false, message: '店舗が見つかりません' }
    }

    if (impersonateShopId) {
      console.log(`[ADMIN] Uploading image for shop: ${shop.id} by Admin: ${user.id}`)
    }

    // 3. ファイルの取得
    const file = formData.get('file') as File
    if (!file) {
      return { success: false, message: 'ファイルが選択されていません' }
    }

    // 4. アップロード処理
    // ファイル名を生成: {shopId}/{timestamp}.jpg
    const timestamp = Date.now()
    const fileName = `${shop.id}/${timestamp}.jpg`
    
    // ArrayBufferに変換
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

    // 5. 公開URLの取得
    const { data: { publicUrl } } = supabase.storage
      .from('shop-photos')
      .getPublicUrl(fileName)

    return { success: true, publicUrl }
  } catch (error: any) {
    console.error('uploadShopImageAction error:', error)
    return { success: false, message: 'アップロードに失敗しました: ' + error.message }
  }
}

// --- メニューアイテム管理 ---

export async function getMenuItems(userId: string, impersonateShopId?: string) {
  const supabase = createClient(supabaseUrl, supabaseServiceKey)
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
  } catch (error) {
    console.error('getMenuItems error:', error)
    return { success: false, data: [] }
  }
}

export async function upsertMenuItem(userId: string, item: any, impersonateShopId?: string) {
  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  try {
    const shop = await getShopTarget(supabase, userId, impersonateShopId)
    
    if (!shop) return { success: false, message: '店舗が見つかりません' }

    if (impersonateShopId) {
      console.log(`[ADMIN] Upserting menu item for shop: ${shop.id} by Admin: ${userId}`)
    }

    // shop_idを強制的に設定
    const itemWithShopId = { ...item, shop_id: shop.id }

    // idがない場合は新規作成、ある場合は更新
    const { data, error } = await supabase
      .from('menu_items')
      .upsert(itemWithShopId)
      .select()
      .single()
      
    if (error) throw error
    return { success: true, data }
  } catch (error) {
    console.error('upsertMenuItem error:', error)
    return { success: false }
  }
}

export async function deleteMenuItem(userId: string, itemId: string, impersonateShopId?: string) {
  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  try {
    const shop = await getShopTarget(supabase, userId, impersonateShopId)
    
    if (!shop) return { success: false }

    if (impersonateShopId) {
      console.log(`[ADMIN] Deleting menu item ${itemId} for shop: ${shop.id} by Admin: ${userId}`)
    }

    const { error } = await supabase
      .from('menu_items')
      .delete()
      .eq('id', itemId)
      .eq('shop_id', shop.id) // 所有権チェック
      
    if (error) throw error
    return { success: true }
  } catch (error) {
    console.error('deleteMenuItem error:', error)
    return { success: false }
  }
}

// --- スタンプカード設定 ---

export async function getShopStampSettings(userId: string, impersonateShopId?: string) {
  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  try {
    const shop = await getShopTarget(supabase, userId, impersonateShopId)
    if (!shop) return { success: false, message: '店舗が見つかりません' }

    // 店舗名も取得（バナー表示用）
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
      data: card, 
      shopId: shop.id,
      shopName: shopData?.name 
    }
  } catch (error) {
    console.error('getShopStampSettings error:', error)
    return { success: false, message: 'データ取得に失敗しました' }
  }
}

export async function updateShopStampSettings(
  userId: string, 
  settings: { target_count: number, reward_description: string }, 
  impersonateShopId?: string
) {
  const supabase = createClient(supabaseUrl, supabaseServiceKey)
  try {
    const shop = await getShopTarget(supabase, userId, impersonateShopId)
    if (!shop) return { success: false, message: '店舗が見つかりません' }

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

    return { success: true, message: '設定を保存しました' }
  } catch (error: any) {
    console.error('updateShopStampSettings error:', error)
    return { success: false, message: '保存に失敗しました' }
  }
}
