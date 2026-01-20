'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

export default function ChatRegistration({ onComplete }: { onComplete: () => void }) {
  const [step, setStep] = useState(0)
  const [name, setName] = useState('')
  const [town, setTown] = useState('')
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState([
    { role: 'hikonyan', text: 'こんにちは！ボク、ひこにゃんだニャ！' },
    { role: 'hikonyan', text: '君のことをもっと知りたいニャ。まずは「ニックネーム」を教えてほしいニャ！' }
  ])

  const handleSend = async () => {
    if (!input.trim()) return

    // ユーザーのメッセージを追加
    const newMessages = [...messages, { role: 'user', text: input }]
    setMessages(newMessages)
    const userInput = input
    setInput('')

    if (step === 0) {
      setName(userInput)
      setMessages([...newMessages, { role: 'hikonyan', text: `${userInput}さん、いい名前だニャ！` }, { role: 'hikonyan', text: '次は、住んでいる「町名」を教えてほしいニャ！（例：本町、金亀町）' }])
      setStep(1)
    } else if (step === 1) {
      setTown(userInput)
      setMessages([...newMessages, { role: 'hikonyan', text: `${userInput}だニャ！覚えたニャ！` }, { role: 'hikonyan', text: 'これで登録完了ニャ。これからよろしくニャ！' }])
      
      // Supabaseに保存
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { error } = await supabase
          .from('profiles')
          .upsert({ 
            id: user.id, 
            username: name || name, // 1つ前のステップの値を確実に使う
            town_name: userInput,
            updated_at: new Date()
          })
        
        if (error) {
          console.error('Error saving profile:', error)
        } else {
          // 少し待ってから完了通知
          setTimeout(() => {
            onComplete()
          }, 2000)
        }
      }
    }
  }

  return (
    <div className="flex flex-col h-[400px] w-full max-w-md border rounded-lg bg-white overflow-hidden shadow-lg mt-4">
      <div className="bg-red-600 p-3 text-white font-bold flex items-center">
        <span className="text-xl mr-2">🐱</span> ひこにゃんと登録
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-orange-50">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] p-3 rounded-2xl ${
              m.role === 'user' ? 'bg-blue-500 text-white rounded-tr-none' : 'bg-white text-gray-800 border rounded-tl-none shadow-sm'
            }`}>
              {m.text}
            </div>
          </div>
        ))}
      </div>

      <div className="p-3 border-t bg-white flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          className="flex-1 bg-white border-2 border-gray-200 rounded-full px-4 py-2 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-red-400 focus:border-red-400"
          placeholder="ここに入力ニャ..."
        />
        <button onClick={handleSend} className="bg-red-600 text-white px-4 py-2 rounded-full font-bold">送信</button>
      </div>
    </div>
  )
}