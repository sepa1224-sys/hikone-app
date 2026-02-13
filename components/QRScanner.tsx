'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode'
import { Camera, X, Loader2, QrCode, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react'

interface QRScannerProps {
  onScanSuccess: (code: string) => void
  onClose: () => void
  title?: string
  instruction?: string
  validationMode?: 'referral' | 'student_verification'
}

export default function QRScanner({ 
  onScanSuccess, 
  onClose, 
  title = 'QRスキャン', 
  instruction = '相手のQRコードを枠内に入れてください',
  validationMode = 'referral'
}: QRScannerProps) {
  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment')
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // 成功時のフィードバック
  const playSuccessFeedback = useCallback(() => {
    if (navigator.vibrate) {
      navigator.vibrate([100, 50, 100])
    }
    
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const oscillator1 = audioContext.createOscillator()
      const gainNode1 = audioContext.createGain()
      oscillator1.connect(gainNode1)
      gainNode1.connect(audioContext.destination)
      oscillator1.frequency.value = 880
      oscillator1.type = 'sine'
      gainNode1.gain.value = 0.3
      oscillator1.start()
      oscillator1.stop(audioContext.currentTime + 0.1)
      
      setTimeout(() => {
        const oscillator2 = audioContext.createOscillator()
        const gainNode2 = audioContext.createGain()
        oscillator2.connect(gainNode2)
        gainNode2.connect(audioContext.destination)
        oscillator2.frequency.value = 1047
        oscillator2.type = 'sine'
        gainNode2.gain.value = 0.3
        oscillator2.start()
        oscillator2.stop(audioContext.currentTime + 0.15)
      }, 120)
    } catch (e) {
      console.log('Audio not supported')
    }
  }, [])

  // QRコードの検証と抽出
  const validateAndExtractCode = useCallback((qrData: string): string | null => {
    if (!qrData) return null
    const cleaned = qrData.replace(/\s/g, '') // 全ての空白・改行を除去
    
    // 学生認証モード
    if (validationMode === 'student_verification') {
      if (cleaned.startsWith('student-verification:')) {
        return cleaned // サーバー側での検証用に生の文字列を返す
      }
      return null
    }

    // デフォルト: 招待コードモード
    if (cleaned.startsWith('hikopo:')) {
      const code = cleaned.replace('hikopo:', '').toUpperCase()
      if (/^[A-Z0-9]{8,12}$/.test(code)) {
        return code
      }
    }
    
    const code = cleaned.toUpperCase()
    if (/^[A-Z0-9]{8,12}$/.test(code)) {
      return code
    }
    
    return null
  }, [validationMode])

  // スキャナーの停止
  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop()
        }
        scannerRef.current = null
      } catch (e) {
        console.error('Stop scanner error:', e)
      }
    }
    setIsScanning(false)
  }, [])

  // スキャン成功時の処理
  const handleScanSuccess = useCallback(async (decodedText: string) => {
    const validCode = validateAndExtractCode(decodedText)
    
    if (validCode) {
      // スキャン停止
      await stopScanner()
      
      // フィードバック
      playSuccessFeedback()
      
      const displayCode = validationMode === 'student_verification' 
        ? '認証コードを確認しました'
        : `コードを読み取りました: ${validCode}`
      
      setSuccess(displayCode)
      
      // 少し待ってからコールバック
      setTimeout(() => {
        onScanSuccess(validCode)
      }, 800)
    }
  }, [validateAndExtractCode, playSuccessFeedback, onScanSuccess, stopScanner, validationMode])

  // スキャナーの開始
  const startScanner = useCallback(async () => {
    if (!containerRef.current) return
    
    // 既存のスキャナーを停止
    await stopScanner()
    
    setError(null)
    setIsScanning(true)
    
    try {
      const scanner = new Html5Qrcode('qr-reader', {
        formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
        verbose: false
      })
      scannerRef.current = scanner
      
      await scanner.start(
        { facingMode: facingMode },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1
        },
        handleScanSuccess,
        () => {}
      )
      setHasPermission(true)
    } catch (err: any) {
      console.error('Scanner error:', err)
      if (err.message?.includes('Permission')) {
        setError('カメラへのアクセスが許可されていません')
        setHasPermission(false)
      } else {
        setError('カメラの起動に失敗しました')
      }
      setIsScanning(false)
    }
  }, [handleScanSuccess, facingMode, stopScanner])

  // カメラの切り替え
  const toggleCamera = useCallback(() => {
    setFacingMode(prev => prev === 'environment' ? 'user' : 'environment')
  }, [])

  // facingMode が変わったら再起動
  useEffect(() => {
    startScanner()
  }, [facingMode]) // eslint-disable-line react-hooks/exhaustive-deps

  // コンポーネントマウント時にスキャン開始
  useEffect(() => {
    return () => {
      stopScanner()
    }
  }, [stopScanner])

  return (
    <div className="fixed inset-0 z-[9999] bg-black/90 flex flex-col">
      {/* ヘッダー */}
      <div className="flex items-center justify-between p-4 bg-black/50">
        <div className="flex items-center gap-2 text-white">
          <QrCode size={24} />
          <span className="font-black">{title}</span>
        </div>
        <div className="flex items-center gap-2">
          {/* カメラ切り替えボタン */}
          <button
            onClick={toggleCamera}
            className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
            title="カメラを切り替え"
          >
            <RefreshCw size={24} className="text-white" />
          </button>
          <button
            onClick={onClose}
            className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
          >
            <X size={24} className="text-white" />
          </button>
        </div>
      </div>
      
      {/* スキャナーエリア */}
      <div className="flex-1 flex flex-col items-center justify-center p-4">
        {/* 成功表示 */}
        {success && (
          <div className="absolute inset-0 z-10 bg-black/80 flex items-center justify-center">
            <div className="bg-green-500 text-white p-6 rounded-3xl text-center animate-in zoom-in duration-200">
              <CheckCircle size={64} className="mx-auto mb-4" />
              <p className="font-bold text-xl">{success}</p>
            </div>
          </div>
        )}

        {/* エラー表示 */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-4 rounded-xl mb-4 flex items-center gap-3">
            <AlertCircle size={24} />
            <p className="font-bold">{error}</p>
          </div>
        )}

        {/* スキャナー本体 */}
        <div ref={containerRef} className="relative w-full max-w-sm aspect-square bg-black rounded-3xl overflow-hidden shadow-2xl border-2 border-white/20">
          <div id="qr-reader" className="w-full h-full" />
          
          {/* スキャン中のアニメーション */}
          {!error && !success && hasPermission && (
            <>
              {/* 四隅の枠 */}
              <div className="absolute top-8 left-8 w-12 h-12 border-t-4 border-l-4 border-emerald-500 rounded-tl-xl z-10" />
              <div className="absolute top-8 right-8 w-12 h-12 border-t-4 border-r-4 border-emerald-500 rounded-tr-xl z-10" />
              <div className="absolute bottom-8 left-8 w-12 h-12 border-b-4 border-l-4 border-emerald-500 rounded-bl-xl z-10" />
              <div className="absolute bottom-8 right-8 w-12 h-12 border-b-4 border-r-4 border-emerald-500 rounded-br-xl z-10" />
              
              {/* スキャンライン */}
              <div className="absolute top-0 left-0 w-full h-1 bg-emerald-500/50 shadow-[0_0_20px_rgba(16,185,129,1)] animate-[scan_2s_ease-in-out_infinite] z-10" />
              
              {/* ガイドテキスト */}
              <div className="absolute bottom-12 left-0 right-0 text-center text-white/80 font-bold text-sm z-10">
                QRコードをスキャン
              </div>
            </>
          )}
          
          {/* ローディング */}
          {!hasPermission && !error && (
            <div className="absolute inset-0 flex items-center justify-center text-white">
              <Loader2 size={32} className="animate-spin" />
            </div>
          )}
        </div>
        
        <p className="text-white/60 text-center mt-6 text-sm">
          {instruction}
        </p>
      </div>
    </div>
  )
}
