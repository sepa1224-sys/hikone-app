'use client'

import { useState, useRef, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { 
  Sun, Send, X, MapPin, Home, Info, Trash2, ChevronRight, UserCircle, Sparkles, Loader2, LogOut
} from 'lucide-react'

// --- Supabase 設定 ---
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabase = createClient(supabaseUrl, supabaseAnonKey)

const HIKONYAN_IMAGE = "https://kawntunevmabyxqmhqnv.supabase.co/storage/v1/object/public/images/hikonyan.png"

export default function AppHome() {
  const [session, setSession] = useState<any>(null)
  const [isRegistered, setIsRegistered] = useState(false)
  const [userData, setUserData] = useState({ nickname: '', town: '' })
  
  // 画面の表示切り替え ('entry' | 'login' | 'main')
  const [view, setView] = useState<'entry' | 'login' | 'main'>('entry')
  
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [chatInput, setChatInput] = useState('')
  const [regStep, setRegStep] = useState<'none' | 'name' | 'town' | 'done'>('none')
  const [messages, setMessages] = useState([{ role: 'ai', text: 'こんにちはニャン！' }])
  const scrollRef = useRef<HTMLDivElement>(null)

  // 1. ログインと登録状況の監視
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      handleAuthChange(session)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      handleAuthChange(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleAuthChange = async (currentSession: any) => {
    setSession(currentSession)
    if (currentSession) {
      // ログインしている場合、プロフィールがあるか確認
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentSession.user.id)
        .single()

      if (profile) {
        setUserData({ nickname: profile.nickname, town: profile.town })
        setIsRegistered(true)
        setView('main') // 登録済みなら直接メインへ
      } else {
        setView('main') // ログイン済み・未登録ならメインへ（登録を促す）
      }
    }
  }

  // 2. プロフィール保存
  const saveProfile = async (nickname: string, town: string) => {
    if (!session?.user) return false
    const { error } = await supabase
      .from('profiles')
      .upsert({ id: session.user.id, nickname, town, updated_at: new Date().toISOString() })
    return !error
  }

  // 3. メッセージ送信
  const handleSendMessage = async () => {
    if (!chatInput.trim()) return
    const userText = chatInput
    setMessages(prev => [...prev, { role: 'user', text: userText }])
    setChatInput('')

    setTimeout(async () => {
      let aiResponse = ""
      if (regStep === 'name') {
        setUserData(prev => ({ ...prev, nickname: userText }))
        aiResponse = `${userText}さんだニャ！次は、彦根のどの【町】に住んでいるか教えてほしいニャ？`
        setRegStep('town')
      } else if (regStep === 'town') {
        const success = await saveProfile(userData.nickname, userText)
        if (success) {
          setUserData(prev => ({ ...prev, town: userText }))
          aiResponse = `ありがとうニャ！【${userData.nickname}さん】を【${userText}】の住民として登録したニャ！これからよろしくニャ！`
          setRegStep('done')
          setTimeout(() => { setIsRegistered(true); setIsChatOpen(false); }, 2000)
        } else {
          aiResponse = "ごめんニャ、保存に失敗したニャ。もう一度試してみてほしいニャ。"
        }
      } else {
        aiResponse = "今は登録の準備をしてるニャ！"
      }
      setMessages(prev => [...prev, { role: 'ai', text: aiResponse }])
    }, 600)
  }

  // --- A. 入り口画面 (未登録 or ゲスト選択前) ---
  if (view === 'entry' && !isRegistered) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-500">
        <img src={HIKONYAN_IMAGE} className="w-32 h-32 mb-6" />
        <h1 className="text-3xl font-black text-gray-800 mb-2 tracking-tighter">ひこねナビ</h1>
        <p className="text-gray-400 font-bold mb-10 text-sm">彦根での暮らしをもっと楽しく、便利にニャ！</p>
        
        <div className="w-full max-w-xs space-y-4">
          <button 
            onClick={() => setView('main')}
            className="w-full bg-gray-50 border-2 border-gray-100 p-6 rounded-[2.5rem] flex items-center gap-4 active:scale-95 transition-all text-left group"
          >
            <UserCircle className="text-gray-400 group-hover:text-blue-500" size={30} />
            <div>
              <h3 className="font-black text-gray-800">ゲストとして入る</h3>
              <p className="text-[10px] text-gray-400 font-bold">まずは機能を見てみるニャ</p>
            </div>
          </button>

          <button 
            onClick={() => setView('login')}
            className="w-full bg-blue-600 p-6 rounded-[2.5rem] shadow-xl flex items-center gap-4 active:scale-95 transition-all text-left text-white"
          >
            <Sparkles size={30} />
            <div>
              <h3 className="font-black">地元を登録する</h3>
              <p className="text-[10px] opacity-80 font-bold text-white">データを保存して同期するニャ！</p>
            </div>
          </button>
        </div>
      </div>
    )
  }

  // --- B. ログイン画面 ---
  if (view === 'login' && !session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white p-8 rounded-[3rem] shadow-xl border border-gray-100">
          <button onClick={() => setView('entry')} className="mb-6 text-gray-400 text-xs font-bold flex items-center gap-1 hover:text-gray-600 transition-colors">
            ← もどる
          </button>
          <div className="flex flex-col items-center mb-8">
            <img src={HIKONYAN_IMAGE} className="w-16 h-16 mb-4" />
            <h2 className="text-xl font-black text-gray-800">ログイン・新規登録</h2>
          </div>
          <Auth 
            supabaseClient={supabase}
            appearance={{ theme: ThemeSupa }}
            providers={['google']}
            localization={{ variables: { sign_up: { email_label: 'メールアドレス', password_label: 'パスワード', button_label: '登録する' }}}}
          />
        </div>
      </div>
    )
  }

  // --- C. メイン画面 ---
  return (
    <div className="min-h-screen bg-blue-50/30 font-sans">
      <header className="bg-white/80 backdrop-blur-xl px-6 py-4 border-b border-gray-100 flex justify-between items-center sticky top-0 z-[100]">
        <div className="font-black text-xl tracking-tighter text-gray-800">
          {isRegistered ? `${userData.nickname}のマイタウン` : 'ひこねナビ (ゲスト)'}
        </div>
        <div className="flex items-center gap-2">
          {session && (
            <button onClick={() => supabase.auth.signOut()} className="p-2 text-gray-300 hover:text-red-500 transition-colors">
              <LogOut size={20}/>
            </button>
          )}
          <button onClick={() => setView('entry')} className="p-2 text-gray-300 hover:text-blue-500">
            <Home size={20}/>
          </button>
        </div>
      </header>

      <main className="p-6 pb-32">
        <div className={`bg-gradient-to-br ${isRegistered ? 'from-orange-500 to-red-600' : 'from-blue-500 to-indigo-600'} rounded-[2.5rem] p-8 text-white shadow-xl flex justify-between items-center mb-8`}>
          <div>
            <p className="text-5xl font-black tracking-tighter mb-2 tabular-nums">12°C</p>
            <p className="font-bold text-sm">
              {isRegistered ? `${userData.nickname}さん、おかえりニャ！` : '彦根市の天気は晴れニャ！'}
            </p>
          </div>
          <Sun size={64} />
        </div>

        <section className="space-y-4">
          <h2 className="font-black text-[10px] text-gray-400 tracking-widest uppercase ml-2">Daily Life</h2>
          <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-50 flex items-center gap-4">
            <div className="w-12 h-12 bg-green-50 rounded-2xl flex items-center justify-center text-green-600"><Trash2 size={24}/></div>
            <div>
              <h3 className="font-bold text-gray-800">明日のゴミ収集</h3>
              <p className="text-[10px] text-gray-400 font-bold">
                {isRegistered ? `${userData.town}：燃やせるゴミ` : "町名を登録すると表示されるニャ"}
              </p>
            </div>
          </div>
        </section>

        {session && !isRegistered && (
          <div className="mt-10 p-8 bg-blue-600 rounded-[2.5rem] text-white text-center shadow-lg animate-in slide-in-from-bottom-5">
            <Sparkles className="mx-auto mb-4 opacity-50" size={32} />
            <h3 className="font-black text-lg mb-2">登録を完了させよう！</h3>
            <p className="text-xs opacity-80 mb-6 font-bold">町名を登録すると、あなた専用の<br/>ゴミ収集日などが表示されるニャ！</p>
            <button 
              onClick={() => { setRegStep('name'); setIsChatOpen(true); }}
              className="bg-white text-blue-600 px-10 py-4 rounded-full font-black text-sm active:scale-95 transition-all shadow-md"
            >
              ひこにゃんと登録する
            </button>
          </div>
        )}
      </main>

      {/* チャットボタン */}
      <button 
        onClick={() => setIsChatOpen(true)} 
        className="fixed right-6 bottom-10 w-16 h-16 bg-[#ff0033] rounded-full shadow-2xl flex items-center justify-center border-4 border-white active:scale-90 transition-all z-50"
      >
        <img src={HIKONYAN_IMAGE} className="w-10 h-10 object-contain" />
      </button>

      {/* チャット画面 */}
      {isChatOpen && (
        <div className="fixed inset-0 z-[1500] flex flex-col bg-white animate-in slide-in-from-bottom duration-300">
          <div className="p-4 border-b flex justify-between items-center bg-white">
            <div className="flex items-center gap-3">
              <img src={HIKONYAN_IMAGE} className="w-10 h-10" />
              <span className="font-black text-gray-800">ひこにゃんAI</span>
            </div>
            <button onClick={() => setIsChatOpen(false)} className="p-2 bg-gray-100 rounded-full text-gray-500"><X size={20} /></button>
          </div>
          <div ref={scrollRef} className="flex-1 p-6 bg-gray-50 overflow-y-auto space-y-4">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] p-4 rounded-[1.5rem] text-sm font-bold shadow-sm ${
                  msg.role === 'user' 
                    ? 'bg-[#ff0033] text-white rounded-br-none' 
                    : 'bg-white text-gray-700 border border-gray-100 rounded-tl-none'
                }`}>
                  {msg.text}
                </div>
              </div>
            ))}
          </div>
          <div className="p-4 border-t pb-10 bg-white">
            <div className="bg-gray-100 rounded-full px-4 py-3 flex items-center border border-gray-200 shadow-inner">
              <input 
                value={chatInput} 
                onChange={(e) => setChatInput(e.target.value)} 
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                className="bg-transparent flex-1 outline-none font-bold text-sm" 
                placeholder="メッセージを入力ニャ..." 
              />
              <button onClick={handleSendMessage} className="text-red-500 ml-2 hover:scale-110 transition-transform">
                <Send size={20}/>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}