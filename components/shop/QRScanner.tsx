'use client'

import { useEffect, useRef, useState } from 'react'
import { Html5QrcodeScanner } from 'html5-qrcode'

interface QRScannerProps {
  onScan: (decodedText: string) => void
  onError?: (error: any) => void
}

export default function QRScanner({ onScan, onError }: QRScannerProps) {
  const scannerRef = useRef<Html5QrcodeScanner | null>(null)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    if (!isMounted) return

    // スキャナー初期化
    // "reader" はdivのID
    // 既に初期化されていたらスキップ
    if (scannerRef.current) return

    try {
        const scanner = new Html5QrcodeScanner(
          "reader",
          { 
            fps: 10, 
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0
          },
          /* verbose= */ false
        )
        
        scanner.render(
          (decodedText) => {
            // スキャン成功時
            onScan(decodedText)
          },
          (errorMessage) => {
            // スキャン失敗（頻繁に発生するのでログには出さない）
            if (onError) onError(errorMessage)
          }
        )
    
        scannerRef.current = scanner
    } catch (e) {
        console.error('Scanner init error:', e)
    }

    return () => {
      // クリーンアップ
      if (scannerRef.current) {
        try {
            scannerRef.current.clear().catch(e => console.error('Failed to clear scanner', e))
        } catch (e) {
            console.error('Cleanup error', e)
        }
      }
    }
  }, [isMounted, onScan, onError])

  if (!isMounted) return <div className="h-64 bg-gray-100 animate-pulse rounded-lg"></div>

  return (
    <div className="w-full max-w-sm mx-auto">
        <div id="reader" className="overflow-hidden rounded-lg"></div>
        <p className="text-xs text-center text-gray-500 mt-2">カメラへのアクセスを許可してください</p>
    </div>
  )
}
