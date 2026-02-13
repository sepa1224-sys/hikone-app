'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { User, ChevronLeft, School, CheckCircle, ShieldCheck, Loader2 } from 'lucide-react'
import { verifyStudent, getVerificationStatus, VerificationStatus } from '@/lib/actions/student-verification'
import { useAuth } from '@/components/AuthProvider'

export default function UserProfilePage() {
  const params = useParams()
  const router = useRouter()
  const targetUserId = params.id as string
  const { user: currentUser } = useAuth()

  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus | null>(null)
  const [verifying, setVerifying] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        
        // 1. Get Profile
        const { data: profileData, error } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url, school_name, grade, verified_status, role')
          .eq('id', targetUserId)
          .single()
        
        if (error) throw error
        setProfile(profileData)

        // 2. Get Verification Status
        const status = await getVerificationStatus(targetUserId)
        setVerificationStatus(status)

      } catch (err) {
        console.error('Error fetching user profile:', err)
      } finally {
        setLoading(false)
      }
    }

    if (targetUserId) {
      fetchData()
    }
  }, [targetUserId])

  const handleVerify = async () => {
    if (!confirm('このユーザーが同じ学校の学生であることを認証しますか？\n（虚偽の認証を行うとペナルティの対象となる場合があります）')) {
      return
    }

    try {
      setVerifying(true)
      setMessage(null)
      
      const result = await verifyStudent(targetUserId)
      
      if (result.success) {
        setMessage({ type: 'success', text: result.message })
        // Refresh status
        const status = await getVerificationStatus(targetUserId)
        setVerificationStatus(status)
        
        // Refresh profile to check if status changed to verified
        const { data } = await supabase.from('profiles').select('verified_status').eq('id', targetUserId).single()
        if (data) {
          setProfile((prev: any) => ({ ...prev, verified_status: data.verified_status }))
        }
      } else {
        setMessage({ type: 'error', text: result.message || '認証に失敗しました' })
      }
    } catch (err) {
      console.error('Verification error:', err)
      setMessage({ type: 'error', text: '予期しないエラーが発生しました' })
    } finally {
      setVerifying(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
        <p className="text-gray-500 mb-4">ユーザーが見つかりませんでした</p>
        <button onClick={() => router.back()} className="text-purple-600 font-bold">戻る</button>
      </div>
    )
  }

  const isVerified = profile.verified_status === 'verified'

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-md mx-auto px-4 h-14 flex items-center">
          <button onClick={() => router.back()} className="p-2 -ml-2 text-gray-600">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h1 className="font-bold text-lg ml-2">プロフィール</h1>
        </div>
      </div>

      <div className="max-w-md mx-auto p-4 space-y-6">
        {/* Profile Card */}
        <div className="bg-white rounded-2xl p-6 shadow-sm text-center relative overflow-hidden">
          {/* Background decoration */}
          <div className="absolute top-0 left-0 w-full h-20 bg-gradient-to-r from-purple-500 to-indigo-600 opacity-10" />
          
          <div className="relative">
            <div className="w-24 h-24 mx-auto bg-gray-200 rounded-full overflow-hidden border-4 border-white shadow-md mb-4">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt={profile.full_name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400">
                  <User className="w-12 h-12" />
                </div>
              )}
            </div>

            <h2 className="text-xl font-bold text-gray-800 flex items-center justify-center gap-2">
              {profile.full_name}
              {isVerified && (
                <span className="text-blue-500" title="認証済み学生">
                  <CheckCircle className="w-5 h-5 fill-blue-500 text-white" />
                </span>
              )}
            </h2>

            {profile.school_name && (
              <div className="mt-2 flex items-center justify-center text-gray-600 text-sm">
                <School className="w-4 h-4 mr-1" />
                <span>{profile.school_name}</span>
                {profile.grade && <span className="ml-2">({profile.grade}年生)</span>}
              </div>
            )}
          </div>
        </div>

        {/* Verification Section */}
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <h3 className="font-bold text-gray-800 mb-4 flex items-center">
            <ShieldCheck className="w-5 h-5 mr-2 text-purple-600" />
            学生認証ステータス
          </h3>

          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-sm text-gray-600">認証進行状況</span>
              <span className="font-bold text-purple-600">
                {isVerified ? '認証完了' : `${verificationStatus?.verificationCount || 0} / 3`}
              </span>
            </div>
            <div className="w-full bg-gray-100 rounded-full h-2.5">
              <div 
                className={`h-2.5 rounded-full ${isVerified ? 'bg-green-500' : 'bg-purple-600'}`} 
                style={{ width: isVerified ? '100%' : `${Math.min(((verificationStatus?.verificationCount || 0) / 3) * 100, 100)}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              {isVerified 
                ? 'このユーザーは学生として正式に認証されています。' 
                : '同じ学校の学生3人から認証されると、公式マークが付与されます。'}
            </p>
          </div>

          {/* Verification Action */}
          {currentUser && currentUser.id !== targetUserId && (
            <div className="border-t pt-4">
              {verificationStatus?.canVerify ? (
                <div>
                  <button
                    onClick={handleVerify}
                    disabled={verifying}
                    className="w-full py-3 px-4 bg-purple-600 text-white font-bold rounded-xl shadow-md hover:bg-purple-700 active:scale-95 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {verifying ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <ShieldCheck className="w-5 h-5" />
                    )}
                    この学生を認証する (+100pt)
                  </button>
                  <p className="text-xs text-center text-gray-500 mt-2">
                    同じ学校の学生であることを保証できる場合のみ押してください。
                  </p>
                </div>
              ) : (
                <div className="bg-gray-50 rounded-xl p-4 text-center">
                  {verificationStatus?.hasVerified ? (
                    <p className="text-green-600 font-bold flex items-center justify-center gap-2">
                      <CheckCircle className="w-5 h-5" />
                      認証済みです
                    </p>
                  ) : profile.school_name ? (
                    <p className="text-gray-500 text-sm">
                      認証できません（学校が異なるか、条件を満たしていません）
                    </p>
                  ) : (
                    <p className="text-gray-500 text-sm">
                      学校情報が登録されていないため認証できません
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
          
          {message && (
            <div className={`mt-4 p-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              {message.text}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
