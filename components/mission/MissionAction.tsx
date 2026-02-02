'use client'

import { useState, useRef } from 'react'
import { Camera, Upload, Loader2, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { submitMission } from '@/lib/actions/mission-completion'
import imageCompression from 'browser-image-compression'

interface MissionActionProps {
  missionId: string
  userId: string
  onComplete: (success: boolean, message: string) => void
  disabled?: boolean
}

export default function MissionAction({ missionId, userId, onComplete, disabled = false }: MissionActionProps) {
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    let currentStep = '開始'

    try {
      // 1. 画像圧縮
      currentStep = '画像圧縮'
      console.log('🚀 [Upload] 1. 画像圧縮開始')
      const options = {
        maxSizeMB: 1, // 最大1MB
        maxWidthOrHeight: 1200, // 最大幅1200px
        useWebWorker: true
      }
      
      console.log('圧縮前サイズ:', file.size / 1024 / 1024, 'MB')
      const compressedFile = await imageCompression(file, options)
      console.log('圧縮後サイズ:', compressedFile.size / 1024 / 1024, 'MB')
      console.log('✅ [Upload] 1. 画像圧縮完了')

      // 2. Supabase Storageへアップロード
      currentStep = 'Storage保存'
      console.log('🚀 [Upload] 2. Storageアップロード開始')
      
      // ファイル名生成: ユーザーID/ミッションID_タイムスタンプ.拡張子
      const fileExt = file.name.split('.').pop() || 'jpg'
      const fileName = `${userId}/${missionId}_${Date.now()}.${fileExt}`

      alert('Storageに送信開始...')

      // タイムアウト付きのアップロード処理
      const uploadPromise = supabase.storage
        .from('mission-photos')
        .upload(fileName, compressedFile)
      
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('TIMEOUT')), 30000)
      })

      const result: any = await Promise.race([uploadPromise, timeoutPromise])
      
      alert('Storage応答あり')

      // タイムアウトエラーの場合はここでキャッチされる
      if (result instanceof Error && result.message === 'TIMEOUT') {
        throw new Error('アップロードがタイムアウトしました。電波状況を確認してください')
      }

      const { data, error: uploadError } = result

      if (uploadError) {
        console.error('❌ [Upload] Storageアップロード失敗:', uploadError)
        throw new Error('Storage Upload Failed: ' + uploadError.message)
      }
      console.log('✅ [Upload] 2. Storageアップロード成功:', data)

      // 3. 公開URLの取得
      const { data: { publicUrl } } = supabase.storage
        .from('mission-photos')
        .getPublicUrl(fileName)
      
      console.log('🔗 [Upload] Public URL取得:', publicUrl)

      // 4. ミッション提出（ステータスは pending になる）
      // mission_submissions テーブルに user_id, mission_id, image_url を保存
      currentStep = 'DB保存'
      console.log('🚀 [Upload] 3. DB保存（ミッション提出）開始')
      const submitResult = await submitMission(userId, missionId, 'photo', publicUrl)
      console.log('✅ [Upload] 3. DB保存完了 結果:', submitResult)

      if (submitResult.success) {
        alert('報告が完了しました！')
        onComplete(true, '報告が完了しました！')
      } else {
        throw new Error('DB Submission Failed: ' + submitResult.message)
      }

    } catch (error: any) {
      console.error(`❌ [Upload] Error at step: ${currentStep}`, error)
      
      // タイムアウトエラーの特別扱い
      if (error.message === 'TIMEOUT' || error.message?.includes('タイムアウト')) {
        alert('アップロードがタイムアウトしました。電波状況を確認してください')
      } else {
        // 詳細なエラー表示
        const errorDetail = JSON.stringify(error, null, 2)
        alert(`詳細エラー: ${errorDetail}\n\nMessage: ${error.message || 'No message'}`)
      }
      
      onComplete(false, '写真のアップロードに失敗しました')
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  return (
    <div className="w-full">
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        capture="environment"
        onChange={handlePhotoSelect}
        className="hidden"
        disabled={isUploading || disabled}
      />
      
      <button
        onClick={() => fileInputRef.current?.click()}
        disabled={isUploading || disabled}
        className={`w-full py-4 rounded-xl font-black text-lg flex items-center justify-center gap-2 transition-all active:scale-95 ${
          isUploading || disabled
            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
            : 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-lg shadow-pink-200'
        }`}
      >
        {isUploading ? (
          <>
            <Loader2 className="animate-spin" size={24} />
            <span>送信中...</span>
          </>
        ) : (
          <>
            <Camera size={24} />
            <span>写真を撮影して報告</span>
          </>
        )}
      </button>
      <p className="text-center text-xs text-gray-400 mt-2 font-bold">
        ※写真はAIによって自動チェックされます
      </p>
    </div>
  )
}
