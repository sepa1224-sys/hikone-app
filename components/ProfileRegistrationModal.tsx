'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { X, User, MapPin, Save, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react'

interface ProfileRegistrationModalProps {
  userId: string
  userEmail?: string
  userFullName?: string
  onComplete: () => void
}

const GENDERS = ['男性', '女性', 'その他', '回答しない']
const AGE_RANGES = ['10代', '20代', '30代', '40代', '50代', '60代', '70代以上']
const RESIDENCES = ['県内', '県外', '海外']
const INTERESTS_OPTIONS = [
  'グルメ', '歴史', 'ショッピング', '観光', '自然', 
  'スポーツ', 'アート', '音楽', 'イベント', 'カフェ'
]

export default function ProfileRegistrationModal({
  userId,
  userEmail,
  userFullName,
  onComplete
}: ProfileRegistrationModalProps) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  
  const [formData, setFormData] = useState({
    full_name: userFullName || '',
    gender: '',
    age_range: '',
    residence: '',
    interests: [] as string[]
  })

  useEffect(() => {
    checkProfileStatus()
  }, [])

  const checkProfileStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, gender, age_range, residence, interests')
        .eq('id', userId)
        .single()

      if (data) {
        // 既存データをフォームに反映
        setFormData({
          full_name: data.full_name || userFullName || '',
          gender: data.gender || '',
          age_range: data.age_range || '',
          residence: data.residence || '',
          interests: data.interests || []
        })
      }
    } catch (error) {
      console.error('Profile fetch error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleInterestToggle = (interest: string) => {
    setFormData(prev => {
      const current = prev.interests || []
      const updated = current.includes(interest)
        ? current.filter(i => i !== interest)
        : [...current, interest]
      return { ...prev, interests: updated }
    })
  }

  const handleSubmit = async () => {
    // 必須項目のチェック（full_nameは必須）
    if (!formData.full_name.trim()) {
      setErrorMsg('お名前を入力してください')
      setTimeout(() => setErrorMsg(''), 3000)
      return
    }

    setSaving(true)
    setErrorMsg('')

    try {
      // 現在ログインしているユーザーのIDを確実に取得
      const { data: { user }, error: userError } = await supabase.auth.getUser()
      
      if (userError || !user) {
        console.error('User fetch error:', userError)
        alert(`ユーザー情報の取得に失敗しました: ${userError?.message || 'ユーザーが見つかりません'}`)
        setErrorMsg('ユーザー情報の取得に失敗しました')
        setTimeout(() => setErrorMsg(''), 3000)
        return
      }

      console.log('保存開始 - User ID:', user.id, 'Form Data:', formData)

      // profilesテーブルにupsert（更新または挿入）
      const { data, error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id, // 確実にユーザーIDを設定
          full_name: formData.full_name,
          gender: formData.gender || null,
          age_range: formData.age_range || null,
          residence: formData.residence || null,
          interests: formData.interests.length > 0 ? formData.interests : null,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'id'
        })
        .select()

      if (error) {
        console.error('Profile upsert error:', error)
        console.error('Error details:', JSON.stringify(error, null, 2))
        alert(`保存に失敗しました: ${error.message}\n詳細はコンソールを確認してください`)
        setErrorMsg(`保存に失敗しました: ${error.message}`)
        setTimeout(() => setErrorMsg(''), 5000)
      } else {
        console.log('保存成功:', data)
        alert('プロフィールを保存しました！')
        setShowSuccess(true)
        setTimeout(() => {
          onComplete()
        }, 1500)
      }
    } catch (error: any) {
      console.error('Unexpected error:', error)
      console.error('Error stack:', error?.stack)
      alert(`予期しないエラーが発生しました: ${error?.message || '不明なエラー'}\n詳細はコンソールを確認してください`)
      setErrorMsg(`予期しないエラー: ${error?.message || '不明なエラー'}`)
      setTimeout(() => setErrorMsg(''), 5000)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/60 backdrop-blur-md">
        <div className="bg-white rounded-[3rem] p-8 text-center">
          <div className="animate-spin text-4xl mb-4">🐱</div>
          <p className="font-black text-gray-600">読み込み中...</p>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* 背景オーバーレイ */}
      <div className="fixed inset-0 z-[109] bg-black/50 animate-fade-in" />
      
      {/* モーダル */}
      <div className="fixed inset-0 z-[110] flex items-end justify-center animate-slide-up">
        <div className="bg-white w-full max-w-md rounded-t-[3rem] max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
          {/* ヘッダー */}
          <div className="flex-shrink-0 p-6 border-b flex justify-between items-center bg-gradient-to-r from-orange-50 to-red-50">
            <div className="flex items-center gap-3">
              <Sparkles className="text-orange-500" size={24} />
              <div>
                <h2 className="text-xl font-black text-gray-900">プロフィール登録</h2>
                <p className="text-xs text-gray-500 font-bold">あなたの情報を教えてニャ</p>
              </div>
            </div>
          </div>

          {/* スクロール可能なコンテンツ */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* 通知エリア */}
            {showSuccess && (
              <div className="bg-green-500 text-white px-6 py-3 rounded-full flex items-center gap-2 shadow-lg animate-in zoom-in duration-300">
                <CheckCircle2 size={20} />
                <span className="font-bold">登録完了！</span>
              </div>
            )}
            {errorMsg && (
              <div className="bg-red-500 text-white px-6 py-3 rounded-full flex items-center gap-2 shadow-lg animate-in shake duration-300">
                <AlertCircle size={20} />
                <span className="font-bold">{errorMsg}</span>
              </div>
            )}

            {/* お名前 */}
            <div className="space-y-3">
              <label className="flex items-center gap-2 ml-2">
                <div className="w-1.5 h-4 bg-orange-500 rounded-full" />
                <span className="text-xs font-black text-gray-400 uppercase tracking-widest">お名前 *</span>
              </label>
              <div className="relative">
                <User className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300" size={20} />
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full bg-gray-50 border-2 border-transparent rounded-[1.5rem] py-4 pl-14 pr-5 font-bold text-gray-700 focus:border-orange-400 focus:bg-white focus:outline-none transition-all text-sm"
                  placeholder="山田 太郎"
                />
              </div>
            </div>

            {/* 性別 */}
            <div className="space-y-3">
              <label className="flex items-center gap-2 ml-2">
                <div className="w-1.5 h-4 bg-orange-500 rounded-full" />
                <span className="text-xs font-black text-gray-400 uppercase tracking-widest">性別</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                {GENDERS.map((gender) => (
                  <button
                    key={gender}
                    onClick={() => setFormData({ ...formData, gender })}
                    className={`py-3 rounded-[1.2rem] font-black text-sm transition-all ${
                      formData.gender === gender
                        ? 'bg-orange-500 text-white shadow-lg scale-105'
                        : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {gender}
                  </button>
                ))}
              </div>
            </div>

            {/* 年代 */}
            <div className="space-y-3">
              <label className="flex items-center gap-2 ml-2">
                <div className="w-1.5 h-4 bg-orange-500 rounded-full" />
                <span className="text-xs font-black text-gray-400 uppercase tracking-widest">年代</span>
              </label>
              <select
                value={formData.age_range}
                onChange={(e) => setFormData({ ...formData, age_range: e.target.value })}
                className="w-full bg-gray-50 border-2 border-transparent rounded-[1.5rem] py-4 px-5 font-bold text-gray-700 focus:border-orange-400 focus:bg-white focus:outline-none transition-all text-sm"
              >
                <option value="">選択してください</option>
                {AGE_RANGES.map((age) => (
                  <option key={age} value={age}>{age}</option>
                ))}
              </select>
            </div>

            {/* 居住地 */}
            <div className="space-y-3">
              <label className="flex items-center gap-2 ml-2">
                <div className="w-1.5 h-4 bg-orange-500 rounded-full" />
                <span className="text-xs font-black text-gray-400 uppercase tracking-widest">居住地</span>
              </label>
              <div className="grid grid-cols-3 gap-3">
                {RESIDENCES.map((residence) => (
                  <button
                    key={residence}
                    onClick={() => setFormData({ ...formData, residence })}
                    className={`py-3 rounded-[1.2rem] font-black text-xs transition-all ${
                      formData.residence === residence
                        ? 'bg-orange-500 text-white shadow-lg scale-105'
                        : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {residence}
                  </button>
                ))}
              </div>
            </div>

            {/* 興味関心 */}
            <div className="space-y-3">
              <label className="flex items-center gap-2 ml-2">
                <div className="w-1.5 h-4 bg-orange-500 rounded-full" />
                <span className="text-xs font-black text-gray-400 uppercase tracking-widest">興味関心（複数選択可）</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {INTERESTS_OPTIONS.map((interest) => {
                  const isSelected = formData.interests.includes(interest)
                  return (
                    <button
                      key={interest}
                      onClick={() => handleInterestToggle(interest)}
                      className={`px-4 py-2 rounded-full font-bold text-xs transition-all ${
                        isSelected
                          ? 'bg-orange-500 text-white shadow-md'
                          : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {interest}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>

          {/* フッター（保存ボタン） */}
          <div className="flex-shrink-0 p-6 border-t bg-white">
            <button
              onClick={handleSubmit}
              disabled={saving || !formData.full_name.trim()}
              className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white py-4 rounded-[1.5rem] font-black shadow-xl shadow-orange-200 active:scale-95 transition-all flex items-center justify-center gap-3"
            >
              {saving ? (
                <>
                  <div className="animate-spin">🐱</div>
                  <span>保存中...</span>
                </>
              ) : (
                <>
                  <Save size={20} />
                  <span>保存するニャ！</span>
                </>
              )}
            </button>
            <p className="text-center text-xs text-gray-400 mt-3 font-bold">
              *は必須項目です
            </p>
          </div>
        </div>
      </div>
    </>
  )
}
