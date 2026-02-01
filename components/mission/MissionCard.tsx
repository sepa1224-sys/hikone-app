'use client'

import { useState, useRef, useEffect } from 'react'
import { Mission } from '@/lib/actions/missions'
import { QrCode, Camera, Coins, Loader2, CheckCircle2, AlertCircle, X, Upload } from 'lucide-react'
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats } from 'html5-qrcode'
import { submitMission } from '@/lib/actions/mission-completion'
import MissionAction from './MissionAction'

interface MissionCardProps {
  mission: Mission
  userId: string
  isCompleted?: boolean
  isPending?: boolean
  onUpdate?: () => void
}

export default function MissionCard({ mission, userId, isCompleted = false, isPending = false, onUpdate }: MissionCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [isScanning, setIsScanning] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')
  
  const scannerRef = useRef<Html5QrcodeScanner | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const scannerRegionId = `reader-${mission.id}`

  const isDone = isCompleted || isPending

  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error)
      }
    }
  }, [])

  // QRスキャン開始
  const startScan = () => {
    setIsScanning(true)
    setStatus('idle')
    setMessage('')
    
    setTimeout(() => {
      const scanner = new Html5QrcodeScanner(
        scannerRegionId,
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
          console.log('QR Code detected:', decodedText)
          scanner.clear()
          setIsScanning(false)
          await handleSubmit('qr', decodedText)
        },
        (errorMessage) => {
          // 読み取りエラーは無視
        }
      )
    }, 100)
  }

  // スキャンキャンセル
  const stopScan = () => {
    if (scannerRef.current) {
      scannerRef.current.clear().catch(console.error)
    }
    setIsScanning(false)
  }

  // 写真選択ハンドラ（削除済み - MissionActionを使用）
  
  // 提出処理（Server Action呼び出し）
  const handleSubmit = async (type: 'qr' | 'photo', proof: string) => {
    setIsUploading(true)
    
    try {
      const result = await submitMission(userId, mission.id, type, proof)
      
      if (result.success) {
        setStatus('success')
        setMessage(result.message)
        
        // 成功音を鳴らす（猫の鳴き声）
        if (type === 'qr') {
          const audio = new Audio('/cat-meow.mp3')
          audio.play().catch(e => console.log('音声再生失敗:', e))
        }

        if (onUpdate) onUpdate()
      } else {
        setStatus('error')
        setMessage(result.message)
      }
    } catch (error: any) {
      setStatus('error')
      setMessage('予期せぬエラーが発生しました')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className={`bg-white rounded-2xl shadow-sm border overflow-hidden transition-all ${
      isCompleted ? 'border-green-200 bg-green-50/30' : 
      isPending ? 'border-yellow-200 bg-yellow-50/30' : 'border-gray-100'
    }`}>
      {/* カードヘッダー */}
      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4 flex-1">
            {/* アイコン */}
            <div className={`shrink-0 w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm ${
              isCompleted ? 'bg-green-100 text-green-600' :
              isPending ? 'bg-yellow-100 text-yellow-600' :
              mission.mission_type === 'qr' ? 'bg-purple-100 text-purple-600' : 'bg-pink-100 text-pink-600'
            }`}>
              {mission.mission_type === 'qr' ? <QrCode size={28} /> : <Camera size={28} />}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                  mission.mission_type === 'qr' ? 'bg-purple-50 text-purple-600 border-purple-100' : 'bg-pink-50 text-pink-600 border-pink-100'
                }`}>
                  {mission.mission_type === 'qr' ? 'QRスキャン' : '写真投稿'}
                </span>
                
                {isCompleted && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-100 text-green-700 border border-green-200 flex items-center gap-1">
                    <CheckCircle2 size={10} /> 完了済み
                  </span>
                )}
                {isPending && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 border border-yellow-200 flex items-center gap-1">
                    <Loader2 size={10} className="animate-spin" /> 承認待ち
                  </span>
                )}
              </div>
              
              <h3 className="font-bold text-gray-900 text-lg leading-tight mb-1">{mission.title}</h3>
              
              <div className="flex items-center gap-1 text-amber-500 font-black">
                <Coins size={16} className="fill-amber-500" />
                <span>{mission.points} pt</span>
              </div>
            </div>
          </div>
        </div>

        {/* 説明文 */}
        <div className="mt-4 bg-gray-50 rounded-xl p-3 text-sm text-gray-600 leading-relaxed">
          {mission.description || '説明はありません'}
        </div>

        {/* アクションエリア */}
        {!isDone && (
          <div className="mt-5">
            {status === 'success' ? (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3 text-green-800 animate-in fade-in slide-in-from-bottom-2">
                <CheckCircle2 size={24} className="text-green-600" />
                <p className="font-bold">{message}</p>
              </div>
            ) : isScanning ? (
              <div className="bg-black rounded-xl overflow-hidden relative animate-in fade-in">
                <div id={scannerRegionId} className="w-full" />
                <button 
                  onClick={stopScan}
                  className="absolute top-2 right-2 bg-white/20 text-white p-2 rounded-full hover:bg-white/30 backdrop-blur-sm"
                >
                  <X size={20} />
                </button>
                <div className="p-2 text-center text-white text-xs bg-black/50 backdrop-blur-sm">
                  QRコードをカメラに向けてください
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {status === 'error' && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-start gap-2 text-red-800 text-sm animate-in fade-in">
                    <AlertCircle size={16} className="text-red-600 mt-0.5 shrink-0" />
                    <p>{message}</p>
                  </div>
                )}

                {mission.mission_type === 'qr' ? (
                  <button
                    onClick={startScan}
                    disabled={isUploading}
                    className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl font-black shadow-md shadow-purple-200 transition-all active:scale-95 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 size={20} className="animate-spin" />
                        処理中...
                      </>
                    ) : (
                      <>
                        <QrCode size={20} />
                        挑戦する（QRスキャン）
                      </>
                    )}
                  </button>
                ) : (
                  <MissionAction
                    missionId={mission.id}
                    userId={userId}
                    onComplete={(success, msg) => {
                      if (success) {
                        setStatus('success')
                        setMessage(msg)
                        if (onUpdate) onUpdate()
                      } else {
                        setStatus('error')
                        setMessage(msg)
                      }
                    }}
                    disabled={isUploading}
                  />
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
