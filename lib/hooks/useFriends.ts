'use client'

import useSWR from 'swr'
import { supabase } from '@/lib/supabase'

// フレンド情報の型定義
export interface Friend {
  id: string
  friend_id: string
  full_name: string | null
  avatar_url: string | null
  referral_code: string | null
  created_at: string
}

// フレンドリスト取得用のフェッチャー
const fetchFriends = async (userId: string): Promise<Friend[]> => {
  if (!userId) return []
  
  console.log(`👥 [SWR] フレンドリスト取得開始: ${userId}`)
  
  const { data, error } = await supabase
    .from('friends')
    .select(`
      id,
      friend_id,
      created_at,
      profiles!friends_friend_id_fkey (
        full_name,
        avatar_url,
        referral_code
      )
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  
  if (error) {
    console.error(`👥 [SWR] フレンドリスト取得エラー:`, error)
    return []
  }
  
  // データを整形
  const friends: Friend[] = (data || []).map((item: any) => ({
    id: item.id,
    friend_id: item.friend_id,
    full_name: item.profiles?.full_name || null,
    avatar_url: item.profiles?.avatar_url || null,
    referral_code: item.profiles?.referral_code || null,
    created_at: item.created_at
  }))
  
  console.log(`👥 [SWR] フレンドリスト取得成功: ${friends.length}人`)
  return friends
}

/**
 * フレンドリストをSWRでキャッシュして取得するカスタムフック
 */
export function useFriends(userId: string | null) {
  const { data, error, isLoading, mutate } = useSWR(
    userId ? `friends:${userId}` : null,
    () => fetchFriends(userId!),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 60000,
      revalidateIfStale: false,
      errorRetryCount: 2,
      errorRetryInterval: 3000,
    }
  )
  
  return {
    friends: data ?? [],
    error,
    isLoading,
    refetch: () => mutate()
  }
}

// フレンド追加結果の型
export interface AddFriendResult {
  success: boolean
  message: string
  friend?: Friend
}

/**
 * 招待コードでユーザーを検索
 */
export async function searchUserByCode(referralCode: string): Promise<{
  found: boolean
  userId?: string
  name?: string
  avatarUrl?: string
}> {
  try {
    if (!referralCode || referralCode.trim().length === 0) {
      return { found: false }
    }
    
    const code = referralCode.trim().toUpperCase()
    
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url')
      .eq('referral_code', code)
      .single()
    
    if (error || !data) {
      return { found: false }
    }
    
    return {
      found: true,
      userId: data.id,
      name: data.full_name || 'ユーザー',
      avatarUrl: data.avatar_url || undefined
    }
  } catch {
    return { found: false }
  }
}

/**
 * フレンドを追加
 */
export async function addFriend(
  userId: string,
  friendReferralCode: string
): Promise<AddFriendResult> {
  try {
    if (!userId) {
      return { success: false, message: 'ログインが必要です' }
    }
    
    if (!friendReferralCode || friendReferralCode.trim().length === 0) {
      return { success: false, message: '招待コードを入力してください' }
    }
    
    const code = friendReferralCode.trim().toUpperCase()
    
    // 1. 招待コードでユーザーを検索
    const { data: friendProfile, error: searchError } = await supabase
      .from('profiles')
      .select('id, full_name, avatar_url, referral_code')
      .eq('referral_code', code)
      .single()
    
    if (searchError || !friendProfile) {
      return { success: false, message: 'このコードのユーザーが見つかりません' }
    }
    
    // 2. 自分自身を追加しようとしていないかチェック
    if (friendProfile.id === userId) {
      return { success: false, message: '自分自身をフレンドに追加できません' }
    }
    
    // 3. 既にフレンドかチェック
    const { data: existing } = await supabase
      .from('friends')
      .select('id')
      .eq('user_id', userId)
      .eq('friend_id', friendProfile.id)
      .single()
    
    if (existing) {
      return { success: false, message: '既にフレンドに追加されています' }
    }
    
    // 4. フレンドを追加
    const { data: newFriend, error: insertError } = await supabase
      .from('friends')
      .insert({
        user_id: userId,
        friend_id: friendProfile.id
      })
      .select()
      .single()
    
    if (insertError) {
      console.error('フレンド追加エラー:', insertError)
      return { success: false, message: 'フレンドの追加に失敗しました' }
    }
    
    return {
      success: true,
      message: `${friendProfile.full_name || 'ユーザー'}さんをフレンドに追加しました！`,
      friend: {
        id: newFriend.id,
        friend_id: friendProfile.id,
        full_name: friendProfile.full_name,
        avatar_url: friendProfile.avatar_url,
        referral_code: friendProfile.referral_code,
        created_at: newFriend.created_at
      }
    }
  } catch (error) {
    console.error('フレンド追加エラー:', error)
    return { success: false, message: '予期しないエラーが発生しました' }
  }
}

/**
 * フレンドを削除
 */
export async function removeFriend(
  userId: string,
  friendId: string
): Promise<{ success: boolean; message: string }> {
  try {
    if (!userId || !friendId) {
      return { success: false, message: 'パラメータが不正です' }
    }
    
    const { error } = await supabase
      .from('friends')
      .delete()
      .eq('user_id', userId)
      .eq('friend_id', friendId)
    
    if (error) {
      console.error('フレンド削除エラー:', error)
      return { success: false, message: 'フレンドの削除に失敗しました' }
    }
    
    return { success: true, message: 'フレンドを削除しました' }
  } catch (error) {
    console.error('フレンド削除エラー:', error)
    return { success: false, message: '予期しないエラーが発生しました' }
  }
}
