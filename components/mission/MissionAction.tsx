'use client'

import { useState, useEffect, useRef } from 'react'
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats } from 'html5-qrcode'
import { Camera, QrCode, Upload, CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { submitMission } from '@/lib/actions/mission-completion'
import { Mission } from '@/lib/actions/missions'

interface MissionActionProps {
  mission: Mission
  userId: string
  onComplete?: () => void
}

export default function MissionAction({ mission, userId, onComplete }: MissionActionProps) {
  const [isScanning, setIsScanning] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const scannerRef = useRef<Html5QrcodeScanner | null>(null)
  
  // ファイル選択用のinput ref
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    // クリーンアップ
    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(err => console.error('Scanner clear error', err))
      }
    }
  }, [])

  // QRコードスキャナーの起動
  const startScan = () => {
    setIsScanning(true)
    setStatus('idle')
    setMessage('')
    
    // DOMのレンダリングを待ってから初期化
    setTimeout(() => {
      const scanner = new Html5QrcodeScanner(
        "reader",
        { 
          fps: 10, 
          qrbox: { width: 250, height: 250 },
          formatsToSupport: [ Html5QrcodeSupportedFormats.QR_CODE ],
          rememberLastUsedCamera: true
        },
        /* verbose= */ false
      )
      
      scannerRef.current = scanner

      scanner.render(
        async (decodedText) => {
          // スキャン成功時
          console.log('QR Code detected:', decodedText)
          await handleQrComplete(decodedText)
          scanner.clear()
          setIsScanning(false)
        },
        (errorMessage) => {
          // スキャン失敗時（頻繁に呼ばれるのでログは出さない方が良い）
        }
      )
    }, 100)
  }

  // QRコード読み取り後の処理
  const handleQrComplete = async (code: string) => {
    setIsUploading(true)
    const result = await submitMission(userId, mission.id, 'qr', code)
    setIsUploading(false)
    
    if (result.success) {
      setStatus('success')
      setMessage(result.message)
      if (onComplete) onComplete()
    } else {
      setStatus('error')
      setMessage(result.message)
    }
  }

  // 写真アップロード処理
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    setStatus('idle')
    setMessage('')

    try {
      // 1. Storageにアップロード
      const fileExt = file.name.split('.').pop()
      const fileName = `${userId}/${mission.id}_${Date.now()}.${fileExt}`
      const { data, error: uploadError } = await supabase.storage
        .from('mission-photos')
        .upload(fileName, file)

      if (uploadError) throw uploadError

      // 2. 公開URLを取得
      const { data: { publicUrl } } = supabase.storage
        .from('mission-photos')
        .getPublicUrl(fileName)

      // 3. サーバーアクションで提出
      const result = await submitMission(userId, mission.id, 'photo', publicUrl)

      if (result.success) {
        setStatus('success')
        setMessage(result.message)
        if (onComplete) onComplete()
      } else {
        setStatus('error')
        setMessage(result.message)
      }

    } catch (err: any) {
      console.error('Upload error:', err)
      setStatus('error')
      setMessage('画像のアップロードに失敗しました')
    } finally {
      setIsUploading(false)
      // inputをリセット
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const stopScan = () => {
    if (scannerRef.current) {
      scannerRef.current.clear().catch(console.error)
    }
    setIsScanning(false)
  }

  if (status === 'success') {
    return (
      <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
        <div className="flex justify-center mb-3">
          <CheckCircle2 className="w-12 h-12 text-green-500" />
        </div>
        <h3 className="font-bold text-green-800 mb-1">完了しました！</h3>
        <p className="text-green-700">{message}</p>
      </div>
    )
  }

  return (
    <div className="w-full">
      {status === 'error' && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2 text-red-700 text-sm">
          <XCircle className="w-5 h-5 shrink-0" />
          <p>{message}</p>
        </div>
      )}

      {mission.mission_type === 'qr' ? (
        // QRコードミッションの場合
        <div>
          {!isScanning ? (
            <button
              onClick={startScan}
              disabled={isUploading}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-sm flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              {isUploading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <QrCode className="w-5 h-5" />
              )}
              QRコードをスキャン
            </button>
          ) : (
            <div className="bg-black/5 rounded-xl overflow-hidden">
              <div id="reader" className="w-full"></div>
              <button
                onClick={stopScan}
                className="w-full py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold border-t border-gray-300"
              >
                スキャンを中止
              </button>
            </div>
          )}
          <p className="text-xs text-gray-500 text-center mt-2">
            ミッション場所に設置されたQRコードを読み取ってください
          </p>
        </div>
      ) : (
        // 写真投稿ミッションの場合
        <div>
          <input
            type="file"
            accept="image/*"
            capture="environment" // スマホのカメラを優先起動
            onChange={handlePhotoUpload}
            className="hidden"
            ref={fileInputRef}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="w-full py-3 bg-pink-500 hover:bg-pink-600 text-white font-bold rounded-xl shadow-sm flex items-center justify-center gap-2 transition-all active:scale-95"
          >
            {isUploading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Camera className="w-5 h-5" />
            )}
            写真を撮って送信
          </button>
          <p className="text-xs text-gray-500 text-center mt-2">
            ミッションに関連する写真を撮影してください
          </p>
        </div>
      )}
    </div>
  )
}
