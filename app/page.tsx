'use client'

import { useState, useRef, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { usePathname, useRouter } from 'next/navigation'
import { 
  Sun, Send, X, Home, Trash2, UserCircle, Sparkles, Building2, Map as MapIcon, 
  Utensils, Train, ChevronRight, Store, LogOut, Edit, Mail, Calendar, MapPin, User, Bus, ShoppingBag
} from 'lucide-react'
import ProfileRegistrationModal from '@/components/ProfileRegistrationModal'
import BottomNavigation from '@/components/BottomNavigation'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabase = createClient(supabaseUrl, supabaseAnonKey)
const HIKONYAN_IMAGE = "https://kawntunevmabyxqmhqnv.supabase.co/storage/v1/object/public/images/hikonyan.png"

const cityData: Record<string, any> = {
  hikone: { name: '彦根市', food: '近江ちゃんぽん', move: 'ご城下巡回バス', shop: '四番町スクエア', color: 'from-orange-500 to-red-600' },
  nagahama: { name: '長浜市', food: '焼鯖そうめん', move: '北国街道さんぽ', shop: '黒壁スクエア', color: 'from-blue-600 to-cyan-500' },
  tsuruga: { name: '敦賀市', food: '越前ガニ', move: 'ぐるっと敦賀周遊バス', shop: '日本海さかな街', color: 'from-emerald-600 to-teal-500' }
}

const prefectures = [
  { name: '滋賀県', cities: [{ id: 'hikone', name: '彦根市' }, { id: 'nagahama', name: '長浜市' }] },
  { name: '福井県', cities: [{ id: 'tsuruga', name: '敦賀市' }] }
]

export default function AppHome() {
  const pathname = usePathname()
  const router = useRouter()
  const [view, setView] = useState<'main' | 'profile'>('main')
  
  // デバッグログ：viewステートの変更を追跡
  console.log("Current View State:", view)
  
  // viewが変更されたときのログ
  useEffect(() => {
    console.log("ビューが切り替わりました:", view)
  }, [view])
  const [mode, setMode] = useState<'local' | 'tourist'>('local') 
  const [selectedCityId, setSelectedCityId] = useState<string>('hikone')
  const [isCitySelectorOpen, setIsCitySelectorOpen] = useState(false)
  const [tempPref, setTempPref] = useState<any>(null)
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [chatInput, setChatInput] = useState('')
  const [messages, setMessages] = useState([{ role: 'ai', text: '何かお手伝いするニャ？' }])
  const scrollRef = useRef<HTMLDivElement>(null)
  
  // プロフィール登録モーダル用のステート
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [profileChecked, setProfileChecked] = useState(false)
  
  // プロフィールページ用のステート
  const [profile, setProfile] = useState<any>(null)
  const [profileLoading, setProfileLoading] = useState(false) // 初期値をfalseにして、ゲストモードで即座に表示できるようにする

  useEffect(() => {
    const savedMode = localStorage.getItem('app_mode') as 'local' | 'tourist'
    if (savedMode) setMode(savedMode)
    const savedCity = localStorage.getItem('selected_city_id')
    if (savedCity) setSelectedCityId(savedCity)
    
    // 即座にセッションチェックを行い、未ログインの場合はローディングを解除
    // 注意: この関数内では view を変更しない（setView を一切呼ばない）
    const checkInitialSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          setCurrentUser(session.user)
          // ホーム画面にいる場合のみプロフィールチェックを実行（viewを変更しない）
          // 初期ロード時は view が 'main' なので、この条件は true になる
          // ただし、この時点で既に 'profile' に切り替えられている場合は実行しない
          // 注意: checkProfileCompletion 内でも view を変更しないことを確認済み
          checkProfileCompletion()
        } else {
          // セッションがnull（未ログイン）の場合
          // 注意: view を変更しない（setView('main') を呼ばない）
          setCurrentUser(null)
          setProfileChecked(true)
        }
      } catch (error) {
        console.error('Session check error:', error)
        setCurrentUser(null)
      } finally {
        // 成否に関わらず、必ずローディングを解除（強制リセット）
        setProfileLoading(false)
      }
    }
    checkInitialSession()
    
    // 認証状態の変更を監視（シンプルに）
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event, session?.user?.id || 'no user')
      
      // ユーザーを即座にセット（Loadingフラグに頼らない）
      setCurrentUser(session?.user ?? null)
      setProfileLoading(false)
      
      if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        if (session?.user) {
          // プロフィール作成処理（DBトリガーが動いていない場合の保険）
          createProfileIfNotExists(session.user)
          // 注意: viewを変更する処理は一切行わない
          // ホーム画面にいる場合のみプロフィールチェックを実行（viewを変更しない）
          if (view === 'main') {
            checkProfileCompletion()
          }
        }
      } else if (event === 'SIGNED_OUT') {
        // ログアウト時：Stateをリセット（ただし、viewは変更しない）
        // viewの変更は、handleLogout関数内で明示的に実行する
        setProfile(null)
        setShowProfileModal(false)
        setProfileChecked(true)
        // setView('main')を削除：ログアウトボタンを押した時だけhandleLogoutで実行
      }
    })
    
    return () => {
      subscription.unsubscribe()
    }
  }, [])

  useEffect(() => {
    localStorage.setItem('app_mode', mode)
    localStorage.setItem('selected_city_id', selectedCityId)
  }, [mode, selectedCityId])

  // URLクエリパラメータまたはパスからviewを設定
  // 注意: このuseEffectはpathnameが変更された時のみ実行される
  // 他のページから「会員情報」タブを押して/?view=profileに遷移した場合、このuseEffectが実行される
  useEffect(() => {
    // このページ（/）にいるときだけ実行
    if (pathname !== '/') {
      // 他のページにいる場合は何もしない（viewステートは変更しない）
      return
    }
    
    // クエリパラメータをチェック
    const viewParam = new URLSearchParams(window.location.search).get('view')
    if (viewParam === 'profile') {
      // クエリパラメータがprofileの場合は、profileビューに設定
      console.log("Setting view to 'profile' from URL param")
      setView('profile')
    }
    // 注意: viewParamがnullまたは''の場合は何もしない（勝手にmainに戻さない）
    // 初期ロード時の'main'はuseStateの初期値で設定されている
  }, [pathname]) // routerを依存配列から削除、viewも削除（無限ループを防ぐ）

  // currentUser がいない（ゲスト）の場合は、即座に profileLoading を false にする
  useEffect(() => {
    if (!currentUser) {
      setProfileLoading(false)
    }
  }, [currentUser])

  // プロフィールページが表示されたときにデータを取得
  useEffect(() => {
    if (view === 'profile') {
      // ゲスト判定のログ（デバッグ用）
      console.log("DEBUG: currentUser is", currentUser)
      console.log("View:", view, "User:", !!currentUser, "ProfileLoading:", profileLoading)
      
      // ログイン状態を確認
      const checkAuth = async () => {
        try {
          const { data: { session } } = await supabase.auth.getSession()
          if (session?.user) {
            setCurrentUser(session.user)
            fetchProfileData()
          } else {
            // セッションがない場合
            setCurrentUser(null)
          }
        } catch (error) {
          console.error('Auth check error:', error)
          setCurrentUser(null)
        } finally {
          // 成否に関わらず、必ずローディングを解除（強制リセット）
          setProfileLoading(false)
        }
      }
      checkAuth()
    }
  }, [view])

  // プロフィールの完了状況をチェック（ページ読み込み完了時に1回だけ実行）
  const checkProfileCompletion = async () => {
    try {
      // まず、チェック完了前はモーダルを表示しない
      setShowProfileModal(false)
      
      const { data: { session } } = await supabase.auth.getSession()
      
      // ゲスト（未ログイン）時: ポップアップは絶対に表示しない
      if (!session?.user) {
        setShowProfileModal(false)
        setProfileChecked(true)
        return
      }
      
      setCurrentUser(session.user)
      
      // プロフィール情報を取得
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('full_name, gender, age_range, residence, interests')
        .eq('id', session.user.id)
        .single()
      
      // デバッグ用ログ
      console.log('=== プロフィールチェック開始 ===')
      console.log('Current Profile Data:', profile)
      console.log('Supabase Error:', error)
      
      // エラーハンドリング（データが存在しない場合のエラー PGRST116 などを処理）
      if (error) {
        // PGRST116 は「データが存在しない」エラー（これは正常なケース）
        if (error.code === 'PGRST116') {
          console.log('プロフィールが見つかりません（新規ユーザー）')
          // ホーム画面にいる場合のみモーダルを表示
          if (view === 'main') {
            console.log('Should Show Modal?: true (プロフィール未登録、ホーム画面)')
            setShowProfileModal(true)
          } else {
            console.log('Should Show Modal?: false (プロフィール未登録だが、ホーム画面ではない)')
            setShowProfileModal(false)
          }
          return
        } else {
          // その他のエラー
          console.error('プロフィール取得エラー:', error)
          setShowProfileModal(false)
          return
        }
      }
      
      // プロフィールが存在しない場合
      if (!profile) {
        console.log('プロフィールデータが null/undefined')
        // ホーム画面にいる場合のみモーダルを表示
        if (view === 'main') {
          console.log('Should Show Modal?: true (プロフィール未登録、ホーム画面)')
          setShowProfileModal(true)
        } else {
          console.log('Should Show Modal?: false (プロフィール未登録だが、ホーム画面ではない)')
          setShowProfileModal(false)
        }
        return
      }
      
      // プロフィールが存在する場合の判定
      // full_name の厳密なチェック（空文字、null、undefined を除外）
      const hasFullName = profile.full_name && 
                         profile.full_name !== '' && 
                         profile.full_name !== null && 
                         profile.full_name !== undefined
      
      // age_range の厳密なチェック
      const hasAgeRange = profile.age_range && 
                         profile.age_range !== '' && 
                         profile.age_range !== null && 
                         profile.age_range !== undefined
      
      // residence の厳密なチェック
      const hasResidence = profile.residence && 
                          profile.residence !== '' && 
                          profile.residence !== null && 
                          profile.residence !== undefined
      
      // 詳細情報（年代、居住地のいずれか）が入力されているかチェック
      const hasDetails = hasAgeRange || hasResidence
      
      console.log('hasFullName:', hasFullName, '| value:', profile.full_name)
      console.log('hasAgeRange:', hasAgeRange, '| value:', profile.age_range)
      console.log('hasResidence:', hasResidence, '| value:', profile.residence)
      console.log('hasDetails:', hasDetails)
      
      // ログイン済み かつ プロフィール未入力時: ホーム画面にのみ、登録を促すポップアップを1回だけ表示
      if (!hasFullName || !hasDetails) {
        // プロフィールが未入力または不完全な場合
        if (view === 'main') {
          console.log('Should Show Modal?: true (プロフィール未入力、ホーム画面)')
          setShowProfileModal(true)
        } else {
          console.log('Should Show Modal?: false (プロフィール未入力だが、ホーム画面ではない)')
          setShowProfileModal(false)
        }
      } else {
        // プロフィールが既に入力されている場合はモーダルを表示しない
        console.log('Should Show Modal?: false (プロフィール入力済み)')
        setShowProfileModal(false)
      }
      
      console.log('=== プロフィールチェック完了 ===')
    } catch (error) {
      // try-catch でキャッチされる予期しないエラー
      console.error('Profile check error (catch):', error)
      setShowProfileModal(false)
    } finally {
      // チェックが完了したことを示す（エラーが発生しても必ず実行される）
      setProfileChecked(true)
      console.log('Profile check completed. profileChecked = true')
    }
  }

  // プロフィールデータの取得
  const fetchProfileData = async () => {
    try {
      setProfileLoading(true)
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session?.user) {
        setProfileLoading(false)
        return
      }

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
      setProfileLoading(false)
    }
  }

  // プロフィールが存在しない場合に作成する（DBトリガーの保険）
  const createProfileIfNotExists = async (user: any) => {
    try {
      // 既存のプロフィールをチェック
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single()

      if (!existingProfile) {
        // プロフィールが存在しない場合、作成
        console.log('プロフィールが存在しないため作成します:', user.id)
        const { data, error } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            full_name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'ユーザー',
            avatar_url: user.user_metadata?.avatar_url || null,
            last_login: new Date().toISOString()
          })
          .select()

        if (error) {
          console.error('プロフィール作成エラー:', error)
        } else {
          console.log('プロフィールを作成しました:', data)
        }
      }
    } catch (error) {
      console.error('プロフィール作成チェックエラー:', error)
    }
  }

  const handleToggleMode = () => {
    if (mode === 'local') {
      setMode('tourist')
      setIsCitySelectorOpen(true)
    } else {
      setMode('local')
    }
  }

  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/`,
      },
    })
    if (error) {
      console.error('Googleログインエラー:', error)
      alert('ログインに失敗しました。もう一度お試しください。')
    }
  }

  const handleLogout = async () => {
    if (confirm('ログアウトしますか？')) {
      await supabase.auth.signOut()
      setProfile(null)
      setCurrentUser(null)
      setView('main')
    }
  }

  const currentCity = cityData[selectedCityId] || cityData['hikone']

  return (
    <div className="h-screen bg-blue-50/30 font-sans flex flex-col text-gray-800 tracking-tight overflow-hidden">
      
      {/* --- ヘッダー：コンパクト化したスイッチ --- */}
      <div className="bg-white/90 backdrop-blur-md px-4 py-2 border-b border-gray-100 shadow-sm z-[110]">
        <div className="max-w-xl mx-auto flex items-center gap-3">
          <div 
            onClick={() => setIsChatOpen(true)}
            className="flex-1 bg-gray-100 rounded-xl px-3 py-2 flex items-center gap-2 cursor-pointer hover:bg-gray-200 transition-colors"
          >
            <img src={HIKONYAN_IMAGE} className="w-5 h-5" />
            <span className="text-[11px] font-bold text-gray-400">ひこにゃんAIに質問...</span>
          </div>

          {/* スライドスイッチ（コンパクト版） */}
          <div 
            onClick={handleToggleMode}
            className={`relative w-20 h-8 rounded-full p-1 cursor-pointer transition-colors duration-300 ${
              mode === 'local' ? 'bg-blue-500' : 'bg-orange-500'
            }`}
          >
            <div className={`w-6 h-6 bg-white rounded-full shadow-sm transform transition-transform duration-300 flex items-center justify-center ${
              mode === 'local' ? 'translate-x-0' : 'translate-x-12'
            }`}>
              {mode === 'local' ? <Building2 size={12} className="text-blue-500" /> : <MapIcon size={12} className="text-orange-500" />}
            </div>
            <div className="absolute inset-0 flex items-center justify-between px-2.5 text-[9px] font-black text-white pointer-events-none uppercase">
              <span className={mode === 'local' ? 'opacity-0' : 'opacity-100'}>観光</span>
              <span className={mode === 'local' ? 'opacity-100' : 'opacity-0'}>地元</span>
            </div>
          </div>
        </div>
      </div>

      {/* --- メインコンテンツ --- */}
      <main className="flex-1 overflow-y-auto p-6 pb-24">
        {/* 条件付きレンダリングを1箇所に集約（ガードなし） */}
        {view === 'main' && (
          /* ホームコンテンツ */
          <div className="max-w-xl mx-auto animate-in fade-in duration-500">
            <div className={`bg-gradient-to-br ${mode === 'local' ? 'from-blue-500 to-indigo-600' : currentCity.color} rounded-[2.5rem] p-8 text-white shadow-xl mb-8 relative overflow-hidden transition-all duration-500`}>
              <div className="relative z-10">
                <p className="text-5xl font-black mb-2 tracking-tighter">12°C</p>
                <p className="font-bold text-lg">{mode === 'local' ? '彦根市は今日も快晴ニャ！' : `${currentCity.name}を満喫してニャ！`}</p>
              </div>
              <Sun size={140} className="absolute -right-6 -bottom-6 opacity-20 rotate-12" />
            </div>

            {mode === 'local' ? (
              <div className="bg-white p-6 rounded-[2rem] shadow-sm flex items-center gap-4 border border-white">
                <div className="w-12 h-12 bg-red-50 rounded-2xl flex items-center justify-center text-red-500"><Trash2 size={24}/></div>
                <div><h3 className="font-black text-gray-800">明日のゴミ収集</h3><p className="text-sm text-gray-400 font-bold">燃やせるゴミの日ニャ</p></div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex justify-between items-center px-1"><h2 className="font-black text-gray-400 text-[10px] uppercase tracking-widest">Tourism</h2><button onClick={() => setIsCitySelectorOpen(true)} className="text-[10px] font-black text-orange-500 bg-white px-3 py-1 rounded-full border">街を変更</button></div>
                <div className="bg-white p-5 rounded-[2rem] shadow-sm flex items-center gap-4">
                  <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center text-orange-500"><Utensils size={20}/></div>
                  <div className="flex-1"><p className="text-[9px] font-black text-gray-400 uppercase">Eating</p><p className="font-black text-gray-800">{currentCity.food}</p></div>
                  <ChevronRight size={18} className="text-gray-200" />
                </div>
              </div>
            )}
          </div>
        )}
        
        {view === 'profile' && (
          !currentUser ? (
            /* 未ログインなら、このログイン画面を強制表示 */
            <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center animate-in fade-in max-w-xl mx-auto">
              <div className="bg-orange-50 p-6 rounded-full mb-6">
                <img src={HIKONYAN_IMAGE} className="w-24 h-24 object-contain" alt="ひこにゃん" />
              </div>
              <h2 className="text-2xl font-black text-gray-800 mb-2">ログインしてニャ！</h2>
              <p className="text-gray-500 mb-8 font-medium">
                会員登録すると、プロフィールの保存や<br/>あなたに合わせた情報が見れるようになるニャ。
              </p>
              <button 
                onClick={handleGoogleLogin} 
                className="w-full max-w-xs flex items-center justify-center gap-3 bg-white border-2 border-gray-200 py-4 rounded-2xl font-black shadow-sm active:scale-95 transition-all hover:bg-gray-50"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Googleでログイン
              </button>
            </div>
          ) : (
            /* ログイン済みならプロフィールを表示 */
            <div className="p-6 animate-in slide-in-from-bottom-4 max-w-xl mx-auto">
              {profileLoading ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <div className="animate-spin text-4xl mb-4">🐱</div>
                  <p className="font-black text-gray-400">読み込み中...</p>
                </div>
              ) : (
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
              )}
            </div>
          )
        )}
      </main>


      {/* --- チャット画面（下からスライドアニメーション） --- */}
      {isChatOpen && (
        <>
          {/* 背景オーバーレイ */}
          <div 
            className="fixed inset-0 z-[1999] bg-black/40 animate-fade-in"
            onClick={() => setIsChatOpen(false)}
          />
          {/* チャット画面 */}
          <div className="fixed inset-0 z-[2000] flex flex-col bg-white animate-slide-up">
          {/* ヘッダー */}
          <div className="flex-shrink-0 p-4 border-b flex justify-between items-center bg-white">
            <div className="flex items-center gap-3">
              <img src={HIKONYAN_IMAGE} className="w-8 h-8" />
              <p className="font-black text-gray-800 text-sm">ひこにゃんAI</p>
            </div>
            <button onClick={() => setIsChatOpen(false)} className="p-2 bg-gray-100 rounded-full"><X size={20} /></button>
          </div>
          
          {/* メッセージエリア（スクロール可能） */}
          <div className="flex-1 min-h-0 p-4 bg-gray-50 overflow-y-auto space-y-4">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] p-3 rounded-2xl text-[13px] font-bold ${msg.role === 'user' ? 'bg-red-500 text-white' : 'bg-white border border-gray-100 text-gray-700'}`}>{msg.text}</div>
              </div>
            ))}
            <div ref={scrollRef} />
          </div>

          {/* 入力エリア（固定、最下部に配置） */}
          <div className="flex-shrink-0 p-4 border-t bg-white safe-area-inset-bottom">
            <div className="max-w-xl mx-auto bg-gray-100 rounded-full px-4 py-2.5 flex items-center gap-3 border border-gray-200">
              <input 
                autoFocus
                value={chatInput} 
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (setMessages([...messages, { role: 'user', text: chatInput }]), setChatInput(''))}
                className="bg-transparent flex-1 outline-none font-bold text-sm" 
                placeholder="メッセージを入力ニャ..." 
              />
              <button onClick={() => { if(!chatInput.trim()) return; setMessages([...messages, { role: 'user', text: chatInput }]); setChatInput(''); }} className="text-red-500"><Send size={20}/></button>
            </div>
          </div>
          </div>
        </>
      )}

      {/* 街選択ポップアップ */}
      {isCitySelectorOpen && (
        <div className="fixed inset-0 z-[2500] flex items-end justify-center bg-black/60 backdrop-blur-md">
          <div className="bg-white w-full max-w-md rounded-t-[3rem] p-8 pb-12 animate-in slide-in-from-bottom">
            <div className="flex justify-between items-center mb-6"><h3 className="text-xl font-black">どこへ行くニャ？</h3><button onClick={() => setIsCitySelectorOpen(false)} className="p-2 bg-gray-100 rounded-full"><X size={20}/></button></div>
            <div className="space-y-3">
              {!tempPref ? prefectures.map(p => (
                <button key={p.name} onClick={() => setTempPref(p)} className="w-full p-5 bg-gray-50 rounded-2xl font-black flex justify-between items-center">{p.name} <ChevronRight size={18}/></button>
              )) : tempPref.cities.map((c: any) => (
                <button key={c.id} onClick={() => { setSelectedCityId(c.id); setIsCitySelectorOpen(false); setTempPref(null); }} className="w-full p-5 bg-orange-500 text-white rounded-2xl font-black flex justify-between items-center shadow-lg">{c.name} <Sparkles size={18}/></button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* プロフィール登録・編集モーダル */}
      {/* 
        表示条件:
        1. ローディング完了後（profileChecked === true）
        2. モーダル表示フラグがtrue（showProfileModal === true）
        3. ログイン済み（currentUser が存在）
        4. ホーム画面にいる（view === 'main'）← 重要：ホーム画面でのみ表示
        z-index: z-[110] でナビバー（z-[100]）より前面に表示
      */}
      {profileChecked && showProfileModal && currentUser && view === 'main' && (
        <ProfileRegistrationModal
          userId={currentUser.id}
          userEmail={currentUser.email}
          userFullName={currentUser.user_metadata?.full_name || currentUser.user_metadata?.name || profile?.full_name}
          onComplete={() => {
            // 保存成功後、モーダルを閉じてプロフィールを再チェック
            setShowProfileModal(false)
            // ホーム画面にいる場合のみ再チェック（これにより、次回はモーダルが表示されない）
            if (view === 'main') {
              checkProfileCompletion()
            } else if (view === 'profile') {
              fetchProfileData() // プロフィールページのデータも更新
            }
          }}
        />
      )}

      {/* --- 下部ナビゲーション（app/page.tsx内で管理） --- */}
      <BottomNavigation 
        currentView={view}
        onViewChange={(newView) => {
          // 強制移動ルール：ただのスイッチとして動作
          // 他の条件判定を一切挟まず、ただviewを変更するだけ
          console.log("ナビバー切り替え:", newView)
          setIsChatOpen(false) // チャットが開いていたら閉じるだけ
          setView(newView) // これだけ実行（リダイレクトや条件分岐なし）
        }}
        onNavigate={() => {
          setIsChatOpen(false) // 他のページに遷移する時もチャットを閉じる
        }}
      />
    </div>
  )
}