'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function ChatRegistration({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0) // 0:名前, 1:町名, 2:通常チャット
  const [name, setName] = useState('')
  const [town, setTown] = useState('')
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [messages, setMessages] = useState([
    { role: 'hikonyan', text: 'こんにちは！ボク、ひこにゃんだニャ！' },
    { role: 'hikonyan', text: '君のことをもっと知りたいニャ。まずは「ニックネーム」を教えてほしいニャ！' }
  ])

  const handleSend = async () => {
    if (!input.trim() || isTyping) return

    const userInput = input
    const newMessages = [...messages, { role: 'user', text: userInput }]
    setMessages(newMessages)
    setInput('')

    // --- ステップ0: 名前登録 ---
    if (step === 0) {
      setName(userInput)
      setMessages([...newMessages, 
        { role: 'hikonyan', text: `${userInput}さん、いい名前だニャ！` }, 
        { role: 'hikonyan', text: '次は、住んでいる「町名」を教えてほしいニャ！（例：本町、金亀町）' }
      ])
      setStep(1)
    } 
    // --- ステップ1: 町名登録 ---
    else if (step === 1) {
      setTown(userInput)
      setIsTyping(true)
      
      try {
        // Supabaseにプロフィール保存
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        
        if (userError || !user) {
          throw new Error('ユーザー情報の取得に失敗しました。ログイン状態を確認してください。')
        }

        const { error: upsertError } = await supabase.from('profiles').upsert({ 
          id: user.id, 
          username: name,
          town_name: userInput,
          updated_at: new Date()
        })

        if (upsertError) throw upsertError

        setMessages([...newMessages, 
          { role: 'hikonyan', text: `${userInput}だニャ！覚えたニャ！` }, 
          { role: 'hikonyan', text: 'これで登録完了だぬ。これからは何でも話しかけてニャ！' }
        ])
        setStep(2) // AIチャットモードへ移行
      } catch (error: any) {
        console.error('Registration Error:', error)
        alert(`登録中にエラーが発生しました: ${error.message || '不明なエラー'}\n一旦登録をスキップして進みます。`)
        onComplete() // エラー時は強制的に完了させて次に進める
      } finally {
        setIsTyping(false)
      }
    } 
    // --- ステップ2: 通常のAIチャットモード (API連携) ---
    else {
      setIsTyping(true)
      try {
        const response = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: userInput }),
        })
        const data = await response.json()
        
        const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text || "ちょっと考え中だぬ..."
        setMessages(prev => [...prev, { role: 'hikonyan', text: aiText }])
      } catch (error) {
        console.error('Chat Error:', error)
        setMessages(prev => [...prev, { role: 'hikonyan', text: 'エラーだぬ...後で試してニャ。' }])
      } finally {
        setIsTyping(false)
      }
    }
  }

  return (
    <div className="fixed inset-0 bg-white z-[100] flex flex-col animate-in slide-in-from-bottom duration-300">
      {/* ヘッダー：最上部に固定 */}
      <div className="bg-red-600 p-4 text-white font-bold flex items-center justify-between shrink-0 shadow-md">
        <div className="flex items-center">
          <span className="text-2xl mr-2">🐱</span> 
          <span className="text-lg">ひこにゃんAI</span>
        </div>
        <button onClick={onComplete} className="bg-red-700 px-3 py-1 rounded-lg text-sm">
          閉じる
        </button>
      </div>
      
      {/* メッセージエリア：残りのスペースをすべて使い、スクロール可能にする */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-orange-50">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] p-3 rounded-2xl shadow-sm ${
              m.role === 'user' 
                ? 'bg-blue-500 text-white rounded-tr-none' 
                : 'bg-white text-gray-800 border rounded-tl-none'
            }`}>
              {m.text}
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-white text-gray-400 p-3 rounded-2xl rounded-tl-none text-[13px] font-bold animate-pulse shadow-sm border border-gray-100">
              ひこにゃんが考え中ニャ...
            </div>
          </div>
        )}
      </div>

      {/* 入力エリア：画面の「真の最下部」に固定 */}
      <div className="p-4 border-t bg-white safe-area-bottom shrink-0 shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.nativeEvent.isComposing) {
                handleSend()
              }
            }}
            disabled={isTyping}
            className="flex-1 bg-gray-100 border-none rounded-full px-5 py-3 text-gray-900 focus:ring-2 focus:ring-red-400 outline-none disabled:bg-gray-200"
            placeholder={isTyping ? "考え中ニャ..." : "ここに入力ニャ..."}
          />
          <button 
            onClick={handleSend}
            disabled={isTyping || !input.trim()}
            className="bg-red-600 text-white px-6 py-3 rounded-full font-bold active:scale-95 transition-transform disabled:bg-gray-400"
          >
            送信
          </button>
        </div>
      </div>
    </div>
  )
}
