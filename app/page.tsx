'use client'

import { useState, useRef, useEffect } from 'react'
import { 
  Sun, MessageCircle, Send, X, Bell, Search,
  ChevronRight, Loader2, Home as HomeIcon,
  Utensils, Bus, ShoppingBag, Newspaper
} from 'lucide-react'

export default function Home() {
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [chatInput, setChatInput] = useState('')
  const [messages, setMessages] = useState([
    { role: 'ai', text: 'こんにちはニャン！彦根市の観光スポットやグルメについて、ぼくが教えるニャン！何でも聞いてニャン！' }
  ])
  const [isLoading, setIsLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const HIKONYAN_IMAGE = "https://kawntunevmabyxqmhqnv.supabase.co/storage/v1/object/public/images/hikonyan.png"

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSendMessage = async () => {
    if (!chatInput.trim() || isLoading) return
    const userText = chatInput
    setMessages(prev => [...prev, { role: 'user', text: userText }])
    setChatInput('')
    setIsLoading(true)

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userText })
      })
      const data = await response.json()
      if (data.candidates) {
        setMessages(prev => [...prev, { role: 'ai', text: data.candidates[0].content.parts[0].text }])
      }
    } catch (error) {
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="bg-gray-50 min-h-screen font-sans">
      {/* 1. メイン画面のコンテンツ */}
      <div className="relative z-10">
        <div className="sticky top-0 z-[100] bg-white/80 backdrop-blur-xl px-6 py-4 border-b border-gray-100 flex items-center gap-3">
          <div onClick={() => setIsChatOpen(true)} className="flex-1 bg-gray-100/80 rounded-full px-4 py-2 flex items-center gap-2 cursor-pointer transition-all active:scale-95">
            <Search size={16} className="text-gray-400" />
            <span className="text-gray-400 font-bold text-xs flex-1">ひこにゃんに質問するニャ...</span>
            <div className="bg-red-500 p-1 rounded-full text-white">
              <MessageCircle size={12} />
            </div>
          </div>
          <Bell size={20} className="text-gray-400" />
        </div>

        <div className="px-6 py-6 space-y-8 pb-40">
          {/* 天気セクション */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1.5 h-4 bg-blue-500 rounded-full"></div>
              <h2 className="font-black text-[10px] text-gray-400 uppercase tracking-[0.2em]">Weather</h2>
            </div>
            <div className="bg-gradient-to-br from-gray-400 to-orange-400 rounded-[2.5rem] p-7 text-white shadow-xl shadow-gray-200">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-1">Hikone City</p>
                  <div className="flex items-baseline gap-1">
                    <p className="text-5xl font-black tabular-nums">12</p>
                    <p className="text-xl font-bold">°C</p>
                  </div>
                  <p className="font-bold text-sm mt-2 opacity-90">晴れ時々曇り</p>
                </div>
                <Sun size={60} />
              </div>
            </div>
          </section>

          {/* イベントセクション */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1.5 h-4 bg-red-500 rounded-full"></div>
              <h2 className="font-black text-[10px] text-gray-400 uppercase tracking-[0.2em]">Upcoming Events</h2>
            </div>
            <div className="space-y-3">
              {[
                { title: '彦根城 夜間特別公開', date: '3/20 - 4/5', tag: '観光' },
                { title: 'ご当地キャラ博 2026', date: '10月下旬', tag: '催事' },
                { title: '四番町スクエア 春の市', date: '今週末', tag: 'グルメ' },
              ].map((event, i) => (
                <div key={i} className="bg-white p-4 rounded-[1.8rem] border border-gray-100 shadow-sm flex gap-4 items-center">
                  <div className="w-10 h-10 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400 font-black text-xs shrink-0 border border-gray-100">{i + 1}</div>
                  <div className="flex-1">
                    <h3 className="font-bold text-sm text-gray-900 leading-tight">{event.title}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[9px] font-black text-red-500 bg-red-50 px-1.5 py-0.5 rounded">{event.tag}</span>
                      <span className="text-[9px] text-gray-300 font-bold">{event.date}</span>
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-gray-200" />
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      {/* 2. チャット画面（モーダル） */}
      {isChatOpen && (
        <div className="fixed inset-0 z-[1500] flex flex-col bg-white animate-in slide-in-from-bottom duration-300">
          <div className="p-4 border-b flex justify-between items-center bg-white shrink-0">
            <div className="flex items-center gap-3">
              <img src={HIKONYAN_IMAGE} className="w-10 h-10 object-contain" />
              <span className="font-black text-gray-900">ひこにゃんAI</span>
            </div>
            <button onClick={() => setIsChatOpen(false)} className="p-2 bg-gray-100 rounded-full active:scale-90"><X size={20} /></button>
          </div>
          <div ref={scrollRef} className="flex-1 p-6 overflow-y-auto space-y-6 bg-[#f8f9fa] no-scrollbar">
            {messages.map((msg, i) => (
              <div key={i} className={`flex items-end gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                {msg.role === 'ai' && <img src={HIKONYAN_IMAGE} className="w-8 h-8 object-contain mb-1" />}
                <div className={`p-4 rounded-[1.5rem] max-w-[75%] text-sm font-bold shadow-sm ${
                  msg.role === 'user' ? 'bg-[#ff0033] text-white rounded-br-none' : 'bg-white text-gray-700 rounded-tl-none border border-gray-100'
                }`}>
                  {msg.text}
                </div>
              </div>
            ))}
            {isLoading && <Loader2 className="w-6 h-6 animate-spin text-red-500 mx-auto" />}
          </div>
          {/* チャット入力欄（バーの上に配置） */}
          <div className="p-4 bg-white border-t border-gray-100 pb-24">
            <div className="bg-gray-100 rounded-2xl px-4 py-3 flex items-center border border-gray-200 shadow-sm">
              <input 
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="メッセージを入力..."
                className="bg-transparent flex-1 text-sm font-bold outline-none"
              />
              <button onClick={handleSendMessage} className="text-red-500 ml-2 active:scale-90 transition-all"><Send size={20}/></button>
            </div>
          </div>
        </div>
      )}

      {/* 3. ★ 唯一の共通ナビゲーションバー（全画面で最前面） ★ */}
      <div className="fixed bottom-0 inset-x-0 z-[2000] bg-white border-t border-gray-100 h-16 shadow-[0_-5px_15px_rgba(0,0,0,0.05)]">
        <div className="relative flex items-center justify-between px-2 h-full">
          
          <div className="flex flex-col items-center justify-center flex-1 active:opacity-60 transition-opacity">
            <Utensils size={20} className="text-gray-400" />
            <span className="text-[9px] font-bold text-gray-400 mt-1">食べる</span>
          </div>

          <div className="flex flex-col items-center justify-center flex-1 active:opacity-60 transition-opacity">
            <Bus size={20} className="text-gray-400" />
            <span className="text-[9px] font-bold text-gray-400 mt-1">移動</span>
          </div>

          {/* 中央：ホームボタン */}
          <div className="relative flex flex-col items-center w-16 h-full">
            {/* 控えめな盛り上がり土台 */}
            <div className="absolute -top-2 w-14 h-10 bg-white rounded-t-3xl border-t border-gray-50"></div>
            <button 
              onClick={() => setIsChatOpen(false)}
              className="relative -top-3 w-12 h-12 bg-[#ff0033] rounded-full flex items-center justify-center border-[4px] border-white shadow-lg active:scale-95 transition-all z-10"
            >
              <HomeIcon size={20} className="text-white" />
            </button>
            <span className="relative -top-2 text-[9px] font-black text-[#ff0033] z-10">ホーム</span>
          </div>

          <div className="flex flex-col items-center justify-center flex-1 active:opacity-60 transition-opacity">
            <ShoppingBag size={20} className="text-gray-400" />
            <span className="text-[9px] font-bold text-gray-400 mt-1">買い物</span>
          </div>

          <div className="flex flex-col items-center justify-center flex-1 active:opacity-60 transition-opacity">
            <Newspaper size={20} className="text-gray-400" />
            <span className="text-[9px] font-bold text-gray-400 mt-1">ニュース</span>
          </div>
        </div>
      </div>
    </div>
  )
}