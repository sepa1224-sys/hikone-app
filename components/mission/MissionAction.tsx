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

    try {
      // 1. 画像圧縮
      const options = {
        maxSizeMB: 1, // 最大1MB
        maxWidthOrHeight: 1200, // 最大幅1200px
        useWebWorker: true
      }
      
      console.log('圧縮開始:', file.size / 1024 / 1024, 'MB')
      const compressedFile = await imageCompression(file, options)
      console.log('圧縮完了:', compressedFile.size / 1024 / 1024, 'MB')

      // 2. Supabase Storageへアップロード
      const fileExt = file.name.split('.').pop()
      const fileName = `${userId}/${missionId}_${Date.now()}.${fileExt}`

      const { data, error: uploadError } = await supabase.storage
        .from('mission-photos')
        .upload(fileName, compressedFile)

      if (uploadError) throw uploadError

      // 3. 公開URLの取得
      const { data: { publicUrl } } = supabase.storage
        .from('mission-photos')
        .getPublicUrl(fileName)

      // 4. ミッション提出（ステータスは pending になる）
      const result = await submitMission(userId, missionId, 'photo', publicUrl)

      if (result.success) {
        onComplete(true, result.message)
      } else {
        onComplete(false, result.message)
      }

    } catch (error: any) {
      console.error('Action error:', error)
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
