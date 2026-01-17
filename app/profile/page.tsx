'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import { User, MapPin, LogOut, Edit, Mail, Calendar, UserCircle } from 'lucide-react'
import ProfileRegistrationModal from '@/components/ProfileRegistrationModal'
import BottomNavigation from '@/components/BottomNavigation'

export default function ProfilePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState<any>(null)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [showProfileModal, setShowProfileModal] = useState(false)

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
          </div>
        </div>

        {/* プロフィール情報カード */}
        <div className="bg-white rounded-[2.5rem] p-6 shadow-lg border border-gray-100 space-y-6">
          {/* 基本情報 */}
          <div className="space-y-4">
            <h3 className="text-lg font-black text-gray-800 flex items-center gap-2">
              <User size={20} className="text-orange-500" />
              基本情報
            </h3>
            
            <div className="space-y-3">
              {profile?.gender && (
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <span className="text-sm font-bold text-gray-500">性別</span>
                  <span className="text-sm font-black text-gray-800">{profile.gender}</span>
                </div>
              )}
              
              {profile?.age_range && (
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <span className="text-sm font-bold text-gray-500">年代</span>
                  <span className="text-sm font-black text-gray-800">{profile.age_range}</span>
                </div>
              )}
              
              {profile?.residence && (
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <span className="text-sm font-bold text-gray-500 flex items-center gap-1">
                    <MapPin size={14} />
                    居住地
                  </span>
                  <span className="text-sm font-black text-gray-800">{profile.residence}</span>
                </div>
              )}
              
              {profile?.interests && profile.interests.length > 0 && (
                <div className="py-2">
                  <span className="text-sm font-bold text-gray-500 block mb-3">興味関心</span>
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

              {profile?.last_login && (
                <div className="flex items-center justify-between py-2 border-b border-gray-100">
                  <span className="text-sm font-bold text-gray-500 flex items-center gap-1">
                    <Calendar size={14} />
                    最終ログイン
                  </span>
                  <span className="text-sm font-black text-gray-800">
                    {new Date(profile.last_login).toLocaleDateString('ja-JP')}
                  </span>
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
      
      {/* 下部ナビゲーション */}
      <BottomNavigation />
    </div>
  )
}
