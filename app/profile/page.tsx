'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { User, MapPin, LogOut, Edit, Mail, Calendar, UserCircle, Heart, Cake, MessageSquare, ChevronRight, Gift, Copy, Check, Share2, ExternalLink, Ticket, Loader2, Send, Users, UserPlus, X, Trash2, Coins, ArrowRight, Sparkles, Search, QrCode } from 'lucide-react'
import ProfileRegistrationModal from '@/components/ProfileRegistrationModal'
import BottomNavigation from '@/components/BottomNavigation'
import { usePoints, usePointHistory, getPointHistoryStyle, PointHistory } from '@/lib/hooks/usePoints'
import { applyReferralCode } from '@/lib/actions/referral'
import { useFriends, addFriend, removeFriend, searchUserByCode, Friend } from '@/lib/hooks/useFriends'
import { sendHikopo } from '@/lib/actions/transfer'
import QRCode from 'react-qr-code'

export default function ProfilePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<any>(null)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [copied, setCopied] = useState(false)
  const [generatingCode, setGeneratingCode] = useState(false)
  
  // 招待コード入力用のステート
  const [inputReferralCode, setInputReferralCode] = useState('')
  const [applyingCode, setApplyingCode] = useState(false)
  const [applyResult, setApplyResult] = useState<{ success: boolean; message: string } | null>(null)
  
  // SWRでポイント情報を取得
  const { points, referralCode, isLoading: pointsLoading, refetch: refetchPoints } = usePoints(currentUser?.id)
  const { history: pointHistory, isLoading: historyLoading, refetch: refetchHistory } = usePointHistory(currentUser?.id)
  
  // フレンドリスト
  const { friends, isLoading: friendsLoading, refetch: refetchFriends } = useFriends(currentUser?.id)
  
  // フレンド追加用のステート
  const [showAddFriendModal, setShowAddFriendModal] = useState(false)
  const [friendSearchCode, setFriendSearchCode] = useState('')
  const [friendSearchResult, setFriendSearchResult] = useState<{
    found: boolean
    userId?: string
    name?: string
    avatarUrl?: string
  } | null>(null)
  const [searchingFriend, setSearchingFriend] = useState(false)
  const [addingFriend, setAddingFriend] = useState(false)
  const [addFriendResult, setAddFriendResult] = useState<{ success: boolean; message: string } | null>(null)
  
  // クイック送金モーダル用のステート
  const [showQuickSendModal, setShowQuickSendModal] = useState(false)
  const [quickSendTarget, setQuickSendTarget] = useState<Friend | null>(null)
  const [quickSendAmount, setQuickSendAmount] = useState('')
  const [quickSending, setQuickSending] = useState(false)
  const [quickSendResult, setQuickSendResult] = useState<{ success: boolean; message: string } | null>(null)

  useEffect(() => {
    fetchProfileData()
    
    // 認証状態の変更を監視
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        router.push('/')
      } else if (session?.user) {
        setCurrentUser(session.user)
        fetchProfileData()
      }
    })
    
    return () => {
      subscription.unsubscribe()
    }
  }, [])

  // 生年月日を読みやすい形式に整形する関数
  const formatBirthday = (birthday: string | null | undefined): string => {
    if (!birthday) return ''
    try {
      const date = new Date(birthday)
      const year = date.getFullYear()
      const month = date.getMonth() + 1
      const day = date.getDate()
      return `${year}年${month}月${day}日`
    } catch {
      return birthday
    }
  }

  // 居住地を組み合わせて表示する関数
  const formatLocation = (location: string | null | undefined, city: string | null | undefined): string => {
    if (!location && !city) return ''
    if (location && city) {
      return `${location} ${city}`
    }
    return location || city || ''
  }

  // プロフィールデータの取得
  const fetchProfileData = async () => {
    try {
      setLoading(true)
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.user) {
        router.push('/')
        setLoading(false)
        return
      }

      setCurrentUser(session.user)

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single()

      if (data) {
        setProfile(data)
      } else {
        // プロフィールがない場合でも、セッション情報を表示
        setProfile({
          id: session.user.id,
          full_name: session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'ユーザー',
          email: session.user.email,
          avatar_url: session.user.user_metadata?.avatar_url || null
        })
      }
    } catch (error) {
      console.error('Profile fetch error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    if (confirm('ログアウトしますか？')) {
      await supabase.auth.signOut()
      setProfile(null)
      setCurrentUser(null)
      router.push('/')
    }
  }
  
  // 招待コードをコピー
  const handleCopyCode = async () => {
    if (referralCode) {
      try {
        await navigator.clipboard.writeText(referralCode)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } catch (err) {
        console.error('コピー失敗:', err)
      }
    }
  }
  
  // LINEでシェア
  const handleShareLine = () => {
    if (!referralCode) return
    const appUrl = 'https://hikone-portal.app'
    const message = `彦根のゴミ出しアプリを始めたよ！この招待コード【${referralCode}】を入力すると、500ヒコポがもらえるよ！ ${appUrl}`
    const lineUrl = `https://line.me/R/msg/text/?${encodeURIComponent(message)}`
    window.open(lineUrl, '_blank')
  }
  
  // Xでシェア
  const handleShareX = () => {
    if (!referralCode) return
    const appUrl = 'https://hikone-portal.app'
    const message = `彦根のゴミ出しアプリを始めたよ！\n招待コード【${referralCode}】を入力すると500ヒコポもらえる！\n${appUrl}\n\n#彦根 #ひこにゃん #ゴミ出し`
    const xUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(message)}`
    window.open(xUrl, '_blank')
  }
  
  // 招待コードを発行する
  const handleGenerateCode = async () => {
    if (!currentUser?.id) return
    
    setGeneratingCode(true)
    try {
      // プロフィールを更新してトリガーでコードを生成させる
      // referral_code が null の場合、DB のトリガーが自動生成する
      const { error } = await supabase
        .from('profiles')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', currentUser.id)
      
      if (error) {
        console.error('コード発行エラー:', error)
        alert('コードの発行に失敗しました')
        return
      }
      
      // プロフィールとポイント情報を再取得
      await fetchProfileData()
      refetchPoints()
    } catch (err) {
      console.error('コード発行エラー:', err)
      alert('コードの発行に失敗しました')
    } finally {
      setGeneratingCode(false)
    }
  }
  
  // 日付をフォーマット
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const month = date.getMonth() + 1
    const day = date.getDate()
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    return `${month}/${day} ${hours}:${minutes}`
  }
  
  // フレンド検索
  const handleSearchFriend = async () => {
    if (!friendSearchCode.trim()) return
    
    setSearchingFriend(true)
    setFriendSearchResult(null)
    setAddFriendResult(null)
    
    try {
      const result = await searchUserByCode(friendSearchCode.trim())
      setFriendSearchResult(result)
    } catch (err) {
      console.error('フレンド検索エラー:', err)
      setFriendSearchResult({ found: false })
    } finally {
      setSearchingFriend(false)
    }
  }
  
  // フレンド追加
  const handleAddFriend = async () => {
    if (!currentUser?.id || !friendSearchCode.trim()) return
    
    setAddingFriend(true)
    setAddFriendResult(null)
    
    try {
      const result = await addFriend(currentUser.id, friendSearchCode.trim())
      setAddFriendResult(result)
      
      if (result.success) {
        refetchFriends()
        setFriendSearchCode('')
        setFriendSearchResult(null)
        // 少し待ってからモーダルを閉じる
        setTimeout(() => {
          setShowAddFriendModal(false)
          setAddFriendResult(null)
        }, 1500)
      }
    } catch (err) {
      console.error('フレンド追加エラー:', err)
      setAddFriendResult({ success: false, message: '予期しないエラーが発生しました' })
    } finally {
      setAddingFriend(false)
    }
  }
  
  // フレンド削除
  const handleRemoveFriend = async (friendId: string) => {
    if (!currentUser?.id) return
    if (!confirm('このフレンドを削除しますか？')) return
    
    try {
      const result = await removeFriend(currentUser.id, friendId)
      if (result.success) {
        refetchFriends()
      } else {
        alert(result.message)
      }
    } catch (err) {
      console.error('フレンド削除エラー:', err)
      alert('フレンドの削除に失敗しました')
    }
  }
  
  // クイック送金モーダルを開く
  const handleOpenQuickSend = (friend: Friend) => {
    setQuickSendTarget(friend)
    setQuickSendAmount('')
    setQuickSendResult(null)
    setShowQuickSendModal(true)
  }
  
  // クイック送金実行
  const handleQuickSend = async () => {
    if (!currentUser?.id || !quickSendTarget?.referral_code || !quickSendAmount) return
    
    const amount = parseInt(quickSendAmount)
    if (isNaN(amount) || amount <= 0) {
      setQuickSendResult({ success: false, message: '送金額を正しく入力してください' })
      return
    }
    
    if (amount > points) {
      setQuickSendResult({ success: false, message: '残高が不足しています' })
      return
    }
    
    setQuickSending(true)
    setQuickSendResult(null)
    
    try {
      const result = await sendHikopo(currentUser.id, quickSendTarget.referral_code, amount)
      setQuickSendResult(result)
      
      if (result.success) {
        refetchPoints()
        refetchHistory()
        setQuickSendAmount('')
        // 少し待ってからモーダルを閉じる
        setTimeout(() => {
          setShowQuickSendModal(false)
          setQuickSendTarget(null)
          setQuickSendResult(null)
        }, 1500)
      }
    } catch (err) {
      console.error('クイック送金エラー:', err)
      setQuickSendResult({ success: false, message: '予期しないエラーが発生しました' })
    } finally {
      setQuickSending(false)
    }
  }
  
  // 招待コードを適用
  const handleApplyReferralCode = async () => {
    if (!currentUser?.id || !inputReferralCode.trim()) return
    
    setApplyingCode(true)
    setApplyResult(null)
    
    try {
      const result = await applyReferralCode(currentUser.id, inputReferralCode.trim())
      setApplyResult(result)
      
      if (result.success) {
        // 成功時：プロフィール、ポイント、履歴を再取得
        await fetchProfileData()
        refetchPoints()
        refetchHistory()
        setInputReferralCode('')
      }
    } catch (error) {
      console.error('招待コード適用エラー:', error)
      setApplyResult({ success: false, message: '予期しないエラーが発生しました' })
    } finally {
      setApplyingCode(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="animate-spin text-4xl mb-4">🐱</div>
        <p className="font-black text-gray-400">読み込み中...</p>
      </div>
    )
  }

  return (
    <div className="max-w-xl mx-auto p-6 pb-24 animate-in fade-in duration-500">
      <div className="space-y-6">
        {/* プロフィールヘッダー */}
        <div className="bg-gradient-to-br from-orange-500 to-red-600 rounded-[2.5rem] p-8 text-white shadow-xl relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full" />
          <div className="relative z-10">
            <div className="flex items-center gap-4 mb-4">
              {profile?.avatar_url ? (
                <img 
                  src={profile.avatar_url} 
                  alt={profile.full_name || 'ユーザー'} 
                  className="w-20 h-20 rounded-full border-4 border-white/30 object-cover"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center border-4 border-white/30">
                  <UserCircle size={40} className="text-white" />
                </div>
              )}
              <div className="flex-1">
                <h2 className="text-2xl font-black mb-1">
                  {profile?.full_name || 'ユーザー'}
                </h2>
                {profile?.email && (
                  <p className="text-sm text-white/80 font-bold flex items-center gap-1">
                    <Mail size={14} />
                    {profile.email}
                  </p>
                )}
              </div>
            </div>
            
            {/* ポイント表示 */}
            <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 mt-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">💰</span>
                  <span className="text-sm font-bold text-white/80">保有ポイント</span>
                </div>
                <div className="text-right">
                  <span className="text-3xl font-black">
                    {pointsLoading ? '...' : points.toLocaleString()}
                  </span>
                  <span className="text-sm font-bold ml-1">pt</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* 招待コードセクション */}
        <div className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-[2.5rem] p-6 text-white shadow-xl relative overflow-hidden">
          <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-white/10 rounded-full" />
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <Gift size={24} className="text-white" />
              </div>
              <div>
                <h3 className="text-lg font-black">友達招待でポイントGET!</h3>
                <p className="text-xs text-white/80 font-bold">このコードで友達が登録すると500ptゲット！</p>
              </div>
            </div>
            
            {/* 招待コード表示 */}
            <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-4 mb-4">
              <p className="text-xs text-white/70 font-bold mb-2 text-center">あなたの招待コード</p>
              
              {pointsLoading ? (
                <div className="flex items-center justify-center py-2">
                  <Loader2 size={24} className="animate-spin text-white/70" />
                </div>
              ) : referralCode ? (
                <>
                  <div className="flex items-center justify-center gap-3">
                    <span className="text-3xl font-black tracking-widest">
                      {referralCode}
                    </span>
                    <button
                      onClick={handleCopyCode}
                      className="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
                      title="コードをコピー"
                    >
                      {copied ? (
                        <Check size={20} className="text-green-300" />
                      ) : (
                        <Copy size={20} className="text-white" />
                      )}
                    </button>
                  </div>
                  {copied && (
                    <p className="text-xs text-green-300 font-bold text-center mt-2 animate-pulse">
                      コピーしました！
                    </p>
                  )}
                </>
              ) : (
                <div className="text-center py-2">
                  <p className="text-white/70 text-sm font-bold mb-3">まだコードがありません</p>
                  <button
                    onClick={handleGenerateCode}
                    disabled={generatingCode}
                    className="bg-white hover:bg-gray-100 disabled:bg-white/50 text-purple-600 disabled:text-purple-400 px-6 py-2 rounded-xl font-black text-sm transition-all active:scale-95 disabled:active:scale-100 flex items-center justify-center gap-2 mx-auto"
                  >
                    {generatingCode ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        発行中...
                      </>
                    ) : (
                      <>
                        <Gift size={16} />
                        招待コードを発行する
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
            
            {/* QRコード表示（コードがある場合のみ） */}
            {referralCode && (
              <div className="bg-white rounded-2xl p-4 mb-4 shadow-inner">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <QrCode size={16} className="text-red-500" />
                  <p className="text-xs text-gray-600 font-black">このQRをスキャンしてヒコポを送る</p>
                </div>
                
                {/* QRコード with 赤いフレーム */}
                <div className="relative flex items-center justify-center">
                  {/* 赤いフレーム */}
                  <div className="p-3 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl shadow-lg">
                    <div className="bg-white p-3 rounded-xl relative">
                      <QRCode
                        value={`hikopo:${referralCode}`}
                        size={160}
                        level="M"
                        fgColor="#1f2937"
                        bgColor="#ffffff"
                      />
                      {/* 中央のひこにゃんアイコン */}
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-10 h-10 bg-white rounded-lg shadow-md flex items-center justify-center border-2 border-red-500">
                          <span className="text-xl">⛑️</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <p className="text-[10px] text-gray-400 text-center mt-3 font-bold">
                  ヒコポ専用QRコード
                </p>
              </div>
            )}
            
            {/* シェアボタン（コードがある場合のみ表示） */}
            {referralCode && (
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={handleShareLine}
                  className="flex items-center justify-center gap-2 bg-[#06C755] hover:bg-[#05b34d] text-white py-3 rounded-xl font-black text-sm transition-colors shadow-lg active:scale-95"
                >
                  <ExternalLink size={16} />
                  LINEで送る
                </button>
                <button
                  onClick={handleShareX}
                  className="flex items-center justify-center gap-2 bg-black hover:bg-gray-800 text-white py-3 rounded-xl font-black text-sm transition-colors shadow-lg active:scale-95"
                >
                  <Share2 size={16} />
                  Xでシェア
                </button>
              </div>
            )}
            
            <p className="text-[10px] text-white/60 text-center mt-4">
              ※ 友達があなたのコードで登録すると、お互いに500ポイントもらえます
            </p>
          </div>
        </div>
        
        {/* 招待コード入力フォーム（未使用の場合のみ表示） */}
        {profile && !profile.has_used_referral && (
          <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-[2.5rem] p-6 text-white shadow-xl relative overflow-hidden">
            <div className="absolute -top-8 -right-8 w-24 h-24 bg-white/10 rounded-full" />
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <Ticket size={24} className="text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-black">招待コードを入力</h3>
                  <p className="text-xs text-white/80 font-bold">友達のコードを入れて500ptもらおう！</p>
                </div>
              </div>
              
              {/* 入力フォーム */}
              <div className="space-y-3">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={inputReferralCode}
                    onChange={(e) => setInputReferralCode(e.target.value.toUpperCase())}
                    placeholder="招待コードを入力..."
                    maxLength={8}
                    className="flex-1 bg-white/20 backdrop-blur-sm border-2 border-white/30 rounded-xl px-4 py-3 text-white placeholder-white/50 font-black text-center tracking-widest text-lg focus:outline-none focus:border-white/60 transition-colors"
                  />
                  <button
                    onClick={handleApplyReferralCode}
                    disabled={applyingCode || !inputReferralCode.trim()}
                    className="bg-white hover:bg-gray-100 disabled:bg-white/50 text-emerald-600 disabled:text-emerald-400 px-6 py-3 rounded-xl font-black text-sm transition-all active:scale-95 disabled:active:scale-100 flex items-center gap-2"
                  >
                    {applyingCode ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : (
                      <Check size={18} />
                    )}
                    適用
                  </button>
                </div>
                
                {/* 結果メッセージ */}
                {applyResult && (
                  <div className={`p-3 rounded-xl text-center font-bold text-sm ${
                    applyResult.success 
                      ? 'bg-green-400/30 text-green-100' 
                      : 'bg-red-400/30 text-red-100'
                  }`}>
                    {applyResult.message}
                  </div>
                )}
              </div>
              
              <p className="text-[10px] text-white/60 text-center mt-4">
                ※ 招待コードは一度だけ使用できます
              </p>
            </div>
          </div>
        )}

        {/* プロフィール情報カード */}
        <div className="bg-white rounded-[2.5rem] p-6 shadow-lg border border-gray-100 space-y-6">
          {/* 基本情報 */}
          <div className="space-y-4">
            <h3 className="text-lg font-black text-gray-800 flex items-center gap-2">
              <User size={20} className="text-orange-500" />
              基本情報
            </h3>
            
            <div className="space-y-4">
              {/* お名前 */}
              {profile?.full_name && (
                <div className="flex items-center justify-between py-3 border-b border-gray-100">
                  <span className="text-sm font-bold text-gray-500 flex items-center gap-2">
                    <User size={16} className="text-orange-500" />
                    お名前
                  </span>
                  <span className="text-sm font-black text-gray-800">{profile.full_name}</span>
                </div>
              )}

              {/* 性別 */}
              {profile?.gender && (
                <div className="flex items-center justify-between py-3 border-b border-gray-100">
                  <span className="text-sm font-bold text-gray-500 flex items-center gap-2">
                    <UserCircle size={16} className="text-orange-500" />
                    性別
                  </span>
                  <span className="text-sm font-black text-gray-800">{profile.gender}</span>
                </div>
              )}

              {/* 生年月日 */}
              {profile?.birthday && (
                <div className="flex items-center justify-between py-3 border-b border-gray-100">
                  <span className="text-sm font-bold text-gray-500 flex items-center gap-2">
                    <Cake size={16} className="text-orange-500" />
                    生年月日
                  </span>
                  <span className="text-sm font-black text-gray-800">{formatBirthday(profile.birthday)}</span>
                </div>
              )}

              {/* 居住地 */}
              {formatLocation(profile?.location, profile?.city) && (
                <div className="flex items-center justify-between py-3 border-b border-gray-100">
                  <span className="text-sm font-bold text-gray-500 flex items-center gap-2">
                    <MapPin size={16} className="text-orange-500" />
                    居住地
                  </span>
                  <span className="text-sm font-black text-gray-800">
                    {formatLocation(profile?.location, profile?.city)}
                  </span>
                </div>
              )}

              {/* お住まいのエリア */}
              {profile?.selected_area && (
                <div className="flex items-center justify-between py-3 border-b border-gray-100">
                  <span className="text-sm font-bold text-gray-500 flex items-center gap-2">
                    <MapPin size={16} className="text-blue-500" />
                    お住まいのエリア
                  </span>
                  <span className="text-sm font-black text-blue-600">
                    {profile.selected_area.split('・')[0]}...
                  </span>
                </div>
              )}
              
              {/* 興味関心 */}
              {profile?.interests && profile.interests.length > 0 && (
                <div className="py-3 border-b border-gray-100">
                  <span className="text-sm font-bold text-gray-500 block mb-3 flex items-center gap-2">
                    <Heart size={16} className="text-orange-500" />
                    興味関心
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {profile.interests.map((interest: string, index: number) => (
                      <span 
                        key={index}
                        className="bg-orange-100 text-orange-600 px-3 py-1.5 rounded-full text-xs font-black"
                      >
                        {interest}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* 編集ボタン */}
          <button
            onClick={() => {
              if (currentUser) {
                setShowProfileModal(true)
              }
            }}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white py-4 rounded-[1.5rem] font-black shadow-xl shadow-orange-200 active:scale-95 transition-all flex items-center justify-center gap-3"
          >
            <Edit size={20} />
            <span>プロフィールを編集</span>
          </button>
        </div>

        {/* ポイント履歴 */}
        <div className="bg-white rounded-[2.5rem] p-6 shadow-lg border border-gray-100">
          <h3 className="text-lg font-black text-gray-800 mb-4 flex items-center gap-2">
            <span className="text-xl">📊</span>
            ポイント履歴
          </h3>
          
          {historyLoading ? (
            <div className="py-8 text-center">
              <div className="animate-spin text-2xl mb-2">🐱</div>
              <p className="text-sm text-gray-400 font-bold">読み込み中...</p>
            </div>
          ) : pointHistory.length === 0 ? (
            <div className="py-8 text-center">
              <span className="text-4xl opacity-30">📭</span>
              <p className="text-sm text-gray-400 font-bold mt-2">まだ履歴がありません</p>
              <p className="text-xs text-gray-300 mt-1">チャレンジや招待でポイントを貯めよう！</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[300px] overflow-y-auto">
              {pointHistory.map((item: PointHistory) => {
                const style = getPointHistoryStyle(item.type)
                return (
                  <div 
                    key={item.id}
                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl"
                  >
                    <div className={`w-10 h-10 ${style.bgColor} rounded-xl flex items-center justify-center`}>
                      <span className="text-lg">{style.icon}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-black text-gray-800 truncate">{item.description}</p>
                      <p className="text-[10px] text-gray-400 font-bold">{formatDate(item.created_at)}</p>
                    </div>
                    <div className={`text-right ${item.amount >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                      <p className="text-sm font-black">
                        {item.amount >= 0 ? '+' : ''}{item.amount.toLocaleString()}
                      </p>
                      <p className="text-[10px] font-bold">pt</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
        
        {/* フレンドリスト */}
        <div className="bg-white rounded-[2.5rem] p-6 shadow-lg border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-black text-gray-800 flex items-center gap-2">
              <Users size={20} className="text-indigo-500" />
              フレンド
            </h3>
            <button
              onClick={() => {
                setShowAddFriendModal(true)
                setFriendSearchCode('')
                setFriendSearchResult(null)
                setAddFriendResult(null)
              }}
              className="flex items-center gap-1 px-3 py-1.5 bg-indigo-100 hover:bg-indigo-200 text-indigo-600 rounded-lg font-bold text-xs transition-colors"
            >
              <UserPlus size={14} />
              追加
            </button>
          </div>
          
          {friendsLoading ? (
            <div className="py-8 text-center">
              <Loader2 size={24} className="animate-spin text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-400 font-bold">読み込み中...</p>
            </div>
          ) : friends.length === 0 ? (
            <div className="py-8 text-center">
              <span className="text-4xl opacity-30">👥</span>
              <p className="text-sm text-gray-400 font-bold mt-2">まだフレンドがいません</p>
              <p className="text-xs text-gray-300 mt-1">招待コードでフレンドを追加しよう！</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {friends.map((friend) => (
                <div 
                  key={friend.id}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl"
                >
                  {/* アバター */}
                  {friend.avatar_url ? (
                    <img 
                      src={friend.avatar_url} 
                      alt="" 
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                      <UserCircle size={24} className="text-indigo-500" />
                    </div>
                  )}
                  
                  {/* 名前 */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-gray-800 truncate">
                      {friend.full_name || friend.referral_code || 'ユーザー'}
                    </p>
                    {friend.full_name && friend.referral_code && (
                      <p className="text-[10px] text-gray-400 font-bold">{friend.referral_code}</p>
                    )}
                  </div>
                  
                  {/* アクションボタン */}
                  <div className="flex items-center gap-1">
                    {/* 送金ボタン */}
                    <button
                      onClick={() => handleOpenQuickSend(friend)}
                      className="p-2 bg-amber-100 hover:bg-amber-200 text-amber-600 rounded-lg transition-colors"
                      title="ひこポを送る"
                    >
                      <Send size={16} />
                    </button>
                    {/* 削除ボタン */}
                    <button
                      onClick={() => handleRemoveFriend(friend.friend_id)}
                      className="p-2 bg-gray-100 hover:bg-red-100 text-gray-400 hover:text-red-500 rounded-lg transition-colors"
                      title="フレンドを削除"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* メニューリンク */}
        <div className="bg-white rounded-[2.5rem] p-6 shadow-lg border border-gray-100">
          <h3 className="text-lg font-black text-gray-800 mb-4">メニュー</h3>
          
          <div className="space-y-3">
            {/* ひこポを送る */}
            <button
              onClick={() => router.push('/transfer')}
              className="w-full flex items-center gap-4 p-4 bg-gray-50 hover:bg-amber-50 rounded-2xl transition-colors group"
            >
              <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center group-hover:bg-amber-200 transition-colors">
                <Send size={20} className="text-amber-600" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-black text-gray-800">ひこポを送る</p>
                <p className="text-xs text-gray-500 font-bold">友達にポイントをプレゼント</p>
              </div>
              <ChevronRight size={20} className="text-gray-400 group-hover:text-amber-500 transition-colors" />
            </button>
            
            {/* お問い合わせ・目安箱 */}
            <button
              onClick={() => router.push('/contact')}
              className="w-full flex items-center gap-4 p-4 bg-gray-50 hover:bg-blue-50 rounded-2xl transition-colors group"
            >
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                <MessageSquare size={20} className="text-blue-500" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-black text-gray-800">お問い合わせ・目安箱</p>
                <p className="text-xs text-gray-500 font-bold">アプリや街へのご意見・ご提案</p>
              </div>
              <ChevronRight size={20} className="text-gray-400 group-hover:text-blue-500 transition-colors" />
            </button>
          </div>
        </div>

        {/* ログアウトボタン */}
        <div className="pt-4 pb-8">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 text-gray-400 font-bold text-sm hover:text-red-500 transition-colors py-3"
          >
            <LogOut size={18} />
            ログアウト
          </button>
        </div>
      </div>

      {/* プロフィール編集モーダル */}
      {showProfileModal && currentUser && (
        <ProfileRegistrationModal
          userId={currentUser.id}
          userEmail={currentUser.email}
          userFullName={currentUser.user_metadata?.full_name || currentUser.user_metadata?.name || profile?.full_name}
          onComplete={() => {
            setShowProfileModal(false)
            fetchProfileData() // プロフィールページのデータを更新
          }}
        />
      )}
      
      {/* フレンド追加モーダル */}
      {showAddFriendModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowAddFriendModal(false)}
          />
          
          <div className="relative bg-white rounded-[2rem] p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200">
            {/* ヘッダー */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                  <UserPlus size={20} className="text-indigo-500" />
                </div>
                <h3 className="text-lg font-black text-gray-800">フレンド追加</h3>
              </div>
              <button
                onClick={() => setShowAddFriendModal(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={20} className="text-gray-400" />
              </button>
            </div>
            
            {/* 検索フォーム */}
            <div className="space-y-4">
              <div>
                <label className="text-sm font-black text-gray-700 mb-2 block">招待コードで検索</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={friendSearchCode}
                    onChange={(e) => setFriendSearchCode(e.target.value.toUpperCase())}
                    placeholder="8桁のコード"
                    maxLength={8}
                    className="flex-1 bg-gray-50 border-2 border-transparent rounded-xl px-4 py-3 font-black text-center tracking-widest focus:border-indigo-400 focus:bg-white focus:outline-none transition-all"
                  />
                  <button
                    onClick={handleSearchFriend}
                    disabled={searchingFriend || !friendSearchCode.trim()}
                    className="px-4 py-3 bg-indigo-500 hover:bg-indigo-600 disabled:bg-gray-300 text-white rounded-xl font-black transition-colors"
                  >
                    {searchingFriend ? (
                      <Loader2 size={20} className="animate-spin" />
                    ) : (
                      <Search size={20} />
                    )}
                  </button>
                </div>
              </div>
              
              {/* 検索結果 */}
              {friendSearchResult && (
                <div className={`p-4 rounded-xl ${
                  friendSearchResult.found 
                    ? 'bg-green-50 border border-green-200' 
                    : 'bg-red-50 border border-red-200'
                }`}>
                  {friendSearchResult.found ? (
                    <div className="flex items-center gap-3">
                      {friendSearchResult.avatarUrl ? (
                        <img 
                          src={friendSearchResult.avatarUrl} 
                          alt="" 
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-green-200 rounded-full flex items-center justify-center">
                          <UserCircle size={28} className="text-green-600" />
                        </div>
                      )}
                      <div className="flex-1">
                        <p className="text-sm font-black text-green-700">{friendSearchResult.name}</p>
                        <p className="text-xs text-green-500 font-bold">ユーザーが見つかりました</p>
                      </div>
                      <Check size={20} className="text-green-500" />
                    </div>
                  ) : (
                    <p className="text-sm font-black text-red-600 text-center">
                      このコードのユーザーが見つかりません
                    </p>
                  )}
                </div>
              )}
              
              {/* 結果メッセージ */}
              {addFriendResult && (
                <div className={`p-3 rounded-xl text-center ${
                  addFriendResult.success 
                    ? 'bg-green-50 border border-green-200' 
                    : 'bg-red-50 border border-red-200'
                }`}>
                  <p className={`text-sm font-black ${
                    addFriendResult.success ? 'text-green-700' : 'text-red-700'
                  }`}>
                    {addFriendResult.message}
                  </p>
                </div>
              )}
              
              {/* 追加ボタン */}
              <button
                onClick={handleAddFriend}
                disabled={addingFriend || !friendSearchResult?.found}
                className="w-full py-4 bg-indigo-500 hover:bg-indigo-600 disabled:bg-gray-300 text-white rounded-2xl font-black transition-all active:scale-95 disabled:active:scale-100 flex items-center justify-center gap-2"
              >
                {addingFriend ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    追加中...
                  </>
                ) : (
                  <>
                    <UserPlus size={20} />
                    フレンドに追加
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* クイック送金モーダル */}
      {showQuickSendModal && quickSendTarget && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowQuickSendModal(false)}
          />
          
          <div className="relative bg-white rounded-[2rem] p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200">
            {/* ヘッダー */}
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Sparkles size={32} className="text-amber-500" />
              </div>
              <h3 className="text-xl font-black text-gray-800 mb-1">ひこポを送る</h3>
              <p className="text-sm text-gray-500 font-bold">
                残高: <span className="text-amber-600">{points.toLocaleString()}</span> pt
              </p>
            </div>
            
            {/* 送り先 */}
            <div className="bg-gray-50 rounded-2xl p-4 mb-4">
              <p className="text-xs text-gray-500 font-bold mb-2">送り先</p>
              <div className="flex items-center gap-3">
                {quickSendTarget.avatar_url ? (
                  <img 
                    src={quickSendTarget.avatar_url} 
                    alt="" 
                    className="w-12 h-12 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-12 h-12 bg-amber-200 rounded-full flex items-center justify-center">
                    <UserCircle size={28} className="text-amber-600" />
                  </div>
                )}
                <div>
                  <p className="text-sm font-black text-gray-800">
                    {quickSendTarget.full_name || 'ユーザー'}
                  </p>
                  <p className="text-xs text-gray-400 font-bold">{quickSendTarget.referral_code}</p>
                </div>
              </div>
            </div>
            
            {/* 金額入力 */}
            <div className="mb-4">
              <label className="text-sm font-black text-gray-700 mb-2 block">送金額</label>
              <div className="relative">
                <input
                  type="number"
                  value={quickSendAmount}
                  onChange={(e) => setQuickSendAmount(e.target.value)}
                  placeholder="0"
                  min="1"
                  max={points}
                  className="w-full bg-gray-50 border-2 border-transparent rounded-xl px-4 py-3 pr-12 font-black text-2xl text-center focus:border-amber-400 focus:bg-white focus:outline-none transition-all"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">pt</span>
              </div>
              
              {/* クイック金額 */}
              <div className="flex gap-2 mt-2">
                {[100, 500, 1000].map((amt) => (
                  <button
                    key={amt}
                    onClick={() => setQuickSendAmount(String(Math.min(amt, points)))}
                    disabled={points < amt}
                    className="flex-1 py-2 bg-amber-100 hover:bg-amber-200 disabled:bg-gray-100 disabled:text-gray-400 text-amber-700 rounded-lg font-black text-xs transition-colors"
                  >
                    {amt}
                  </button>
                ))}
              </div>
            </div>
            
            {/* 結果メッセージ */}
            {quickSendResult && (
              <div className={`p-3 rounded-xl text-center mb-4 ${
                quickSendResult.success 
                  ? 'bg-green-50 border border-green-200' 
                  : 'bg-red-50 border border-red-200'
              }`}>
                <p className={`text-sm font-black ${
                  quickSendResult.success ? 'text-green-700' : 'text-red-700'
                }`}>
                  {quickSendResult.message}
                </p>
              </div>
            )}
            
            {/* ボタン */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setShowQuickSendModal(false)}
                className="py-3 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl font-black transition-colors flex items-center justify-center gap-2"
              >
                <X size={18} />
                キャンセル
              </button>
              <button
                onClick={handleQuickSend}
                disabled={quickSending || !quickSendAmount || parseInt(quickSendAmount) <= 0}
                className="py-3 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-600 hover:to-yellow-600 disabled:from-gray-300 disabled:to-gray-400 text-white rounded-xl font-black transition-all active:scale-95 disabled:active:scale-100 flex items-center justify-center gap-2"
              >
                {quickSending ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Send size={18} />
                )}
                送金
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* 下部ナビゲーション */}
      <BottomNavigation />
    </div>
  )
}
