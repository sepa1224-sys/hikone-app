'use client'

import { useState, useRef, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { 
  Sun, Send, X, Home, Trash2, UserCircle, Sparkles, Building2, Map as MapIcon, 
  Utensils, Train, ChevronRight, Store
} from 'lucide-react'

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
  const [view, setView] = useState<'main' | 'profile'>('main')
  const [mode, setMode] = useState<'local' | 'tourist'>('local') 
  const [selectedCityId, setSelectedCityId] = useState<string>('hikone')
  const [isCitySelectorOpen, setIsCitySelectorOpen] = useState(false)
  const [tempPref, setTempPref] = useState<any>(null)
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [chatInput, setChatInput] = useState('')
  const [messages, setMessages] = useState([{ role: 'ai', text: '何かお手伝いするニャ？' }])
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const savedMode = localStorage.getItem('app_mode') as 'local' | 'tourist'
    if (savedMode) setMode(savedMode)
    const savedCity = localStorage.getItem('selected_city_id')
    if (savedCity) setSelectedCityId(savedCity)
  }, [])

  useEffect(() => {
    localStorage.setItem('app_mode', mode)
    localStorage.setItem('selected_city_id', selectedCityId)
  }, [mode, selectedCityId])

  const handleToggleMode = () => {
    if (mode === 'local') {
      setMode('tourist')
      setIsCitySelectorOpen(true)
    } else {
      setMode('local')
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
        {view === 'main' ? (
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
        ) : (
          <div className="max-w-xl mx-auto p-4 text-center font-black text-gray-400">Profile Page</div>
        )}
      </main>

      {/* --- 下部ナビゲーション --- */}
      <nav className="bg-white/95 backdrop-blur-md border-t px-12 py-3 flex justify-around items-center z-[100] pb-[env(safe-area-inset-bottom,16px)]">
        <button onClick={() => setView('main')} className={`flex flex-col items-center gap-1 ${view === 'main' ? 'text-blue-600' : 'text-gray-300'}`}><Home size={24} /><span className="text-[9px] font-black uppercase">Home</span></button>
        <button onClick={() => setView('profile')} className={`flex flex-col items-center gap-1 ${view === 'profile' ? 'text-blue-600' : 'text-gray-300'}`}><UserCircle size={24} /><span className="text-[9px] font-black uppercase">Profile</span></button>
      </nav>

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
    </div>
  )
}