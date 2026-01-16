'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'
import { ArrowLeft, User, MapPin, LogOut, Save, CheckCircle2, AlertCircle } from 'lucide-react'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabase = createClient(supabaseUrl, supabaseAnonKey)

export default function ProfilePage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saveLoading, setSaveLoading] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [profile, setProfile] = useState({ username: '', town_name: '' })

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      router.push('/')
      return
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('username, town_name')
      .eq('id', session.user.id)
      .single()

    if (data) {
      setProfile({
        username: data.username || session.user.user_metadata.full_name || '',
        town_name: data.town_name || ''
      })
    } else {
      // プロフィールがまだない場合はGoogleの情報を初期値にする
      setProfile({
        username: session.user.user_metadata.full_name || '',
        town_name: ''
      })
    }
    setLoading(false)
  }

  const handleUpdate = async () => {
    if (!profile.username.trim() || !profile.town_name.trim()) {
      setErrorMsg('名前と町名を両方入力してほしいニャ！')
      setTimeout(() => setErrorMsg(''), 3000)
      return
    }

    setSaveLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    
    const { error } = await supabase
      .from('profiles')
      .upsert({
        id: session?.user.id,
        username: profile.username,
        town_name: profile.town_name,
        updated_at: new Date().toISOString()
      })

    setSaveLoading(false)
    if (!error) {
      setShowSuccess(true)
      setTimeout(() => setShowSuccess(false), 3000)
    } else {
      setErrorMsg('保存に失敗しちゃったニャ...')
    }
  }

  if (loading) return (
    <div className="flex h-screen flex-col items-center justify-center gap-4 bg-orange-50">
      <div className="animate-spin text-4xl">🐱</div>
      <p className="font-black text-gray-500">読み込み中ニャ...</p>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* ヘッダー */}
      <div className="bg-white px-6 py-6 flex items-center border-b sticky top-0 z-10 shadow-sm">
        <button onClick={() => router.push('/')} className="mr-4 p-2 hover:bg-gray-100 rounded-full transition-colors">
          <ArrowLeft size={24} className="text-gray-600" />
        </button>
        <h1 className="text-xl font-black text-gray-800">会員情報の設定</h1>
      </div>

      <div className="p-6 max-w-md mx-auto space-y-6 mt-4">
        {/* 通知エリア */}
        <div className="h-14">
          {showSuccess && (
            <div className="bg-green-500 text-white px-6 py-3 rounded-full flex items-center gap-2 shadow-lg animate-in zoom-in duration-300">
              <CheckCircle2 size={20} />
              <span className="font-bold">情報を更新したニャ！</span>
            </div>
          )}
          {errorMsg && (
            <div className="bg-red-500 text-white px-6 py-3 rounded-full flex items-center gap-2 shadow-lg animate-in shake duration-300">
              <AlertCircle size={20} />
              <span className="font-bold">{errorMsg}</span>
            </div>
          )}
        </div>

        {/* メイン入力カード */}
        <div className="bg-white rounded-[3rem] p-10 shadow-xl shadow-gray-200/50 border border-white space-y-8 relative overflow-hidden">
          {/* 装飾用の丸 */}
          <div className="absolute -top-10 -right-10 w-32 h-32 bg-red-50 rounded-full opacity-50" />
          
          <div className="space-y-4 relative">
            <div className="flex items-center gap-2 ml-2">
              <div className="w-1.5 h-4 bg-red-500 rounded-full" />
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest">ニックネーム</label>
            </div>
            <div className="relative">
              <User className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300" size={22} />
              <input
                type="text"
                value={profile.username}
                onChange={(e) => setProfile({ ...profile, username: e.target.value })}
                className="w-full bg-gray-50 border-2 border-transparent rounded-[1.5rem] py-5 pl-14 pr-6 font-bold text-gray-700 focus:border-red-400 focus:bg-white focus:outline-none transition-all"
                placeholder="名前を教えてニャ"
              />
            </div>
          </div>

          <div className="space-y-4 relative">
            <div className="flex items-center gap-2 ml-2">
              <div className="w-1.5 h-4 bg-red-500 rounded-full" />
              <label className="text-xs font-black text-gray-400 uppercase tracking-widest">お住まいの町名</label>
            </div>
            <div className="relative">
              <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300" size={22} />
              <input
                type="text"
                value={profile.town_name}
                onChange={(e) => setProfile({ ...profile, town_name: e.target.value })}
                className="w-full bg-gray-50 border-2 border-transparent rounded-[1.5rem] py-5 pl-14 pr-6 font-bold text-gray-700 focus:border-red-400 focus:bg-white focus:outline-none transition-all"
                placeholder="例：本町、金亀町"
              />
            </div>
            <p className="text-[10px] text-gray-400 font-bold ml-4 italic">※町名に合わせてゴミの日を表示するニャ！</p>
          </div>

          <button
            onClick={handleUpdate}
            disabled={saveLoading}
            className="w-full bg-[#ff0033] hover:bg-[#cc002c] text-white py-5 rounded-[1.5rem] font-black shadow-xl shadow-red-200 active:scale-95 transition-all flex items-center justify-center gap-3 group"
          >
            {saveLoading ? (
              <Loader2 className="animate-spin" size={24} />
            ) : (
              <>
                <Save size={22} className="group-hover:rotate-12 transition-transform" />
                <span>保存するニャ！</span>
              </>
            )}
          </button>
        </div>

        {/* ログアウトエリア */}
        <div className="pt-4 px-4">
          <button
            onClick={() => {
              if(confirm('ログアウトしていいのかニャ？')) {
                supabase.auth.signOut()
                router.push('/')
              }
            }}
            className="w-full flex items-center justify-center gap-2 text-gray-400 font-bold text-sm hover:text-red-500 transition-colors py-2"
          >
            <LogOut size={18} />
            ログアウトする
          </button>
        </div>
      </div>
    </div>
  )
}