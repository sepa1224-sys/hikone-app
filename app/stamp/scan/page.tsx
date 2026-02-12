'use client'

import { useState, useEffect } from 'react'
import QRScanner from '@/components/shop/QRScanner'
import { grantStamp } from '@/lib/actions/stamp'
import { ArrowLeft, MapPin, CheckCircle2, AlertCircle, Loader2, Store } from 'lucide-react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'

export default function StampScanPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryShopId = searchParams.get('shopId')

  const [status, setStatus] = useState<'idle' | 'locating' | 'granting' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const [shopName, setShopName] = useState('')

  // クエリパラメータでshopIdが渡された場合の処理
  useEffect(() => {
    if (queryShopId) {
       // 自動では開始せず、ユーザーにボタンを押させる（誤操作防止）
    }
  }, [queryShopId])

  const handleScan = async (shopId: string) => {
    if (status !== 'idle') return

    // ID形式チェック（簡易）
    if (!shopId || shopId.length < 10) return

    setStatus('locating')
    setMessage('位置情報を確認中...')

    if (!navigator.geolocation) {
      setStatus('error')
      setMessage('お使いの端末は位置情報に対応していません')
      return
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        setStatus('granting')
        setMessage('スタンプを押しています...')
        
        const { latitude, longitude } = position.coords
        
        try {
          const result = await grantStamp(shopId, latitude, longitude)
          
          if (result.success) {
            setStatus('success')
            setMessage(result.message || 'スタンプを獲得しました！')
            if (result.shopName) setShopName(result.shopName)
          } else {
            setStatus('error')
            setMessage(result.message || 'エラーが発生しました')
          }
        } catch (e) {
          setStatus('error')
          setMessage('通信エラーが発生しました')
        }
      },
      (error) => {
        console.error(error)
        setStatus('error')
        setMessage('位置情報の取得に失敗しました。位置情報の利用を許可してください。')
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )
  }

  const reset = () => {
    setStatus('idle')
    setMessage('')
    setShopName('')
    // クエリパラメータがある場合は戻るボタンなどでリストに戻る想定だが、リセット時はスキャンモードへ
    router.replace('/stamp/scan')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white p-4 flex items-center shadow-sm relative z-10">
        <Link href="/" className="p-2 -ml-2 text-gray-600">
            <ArrowLeft size={24} />
        </Link>
        <h1 className="flex-1 text-center font-bold text-gray-800 mr-8">スタンプ獲得</h1>
      </div>

      <div className="flex-1 p-6 flex flex-col items-center max-w-lg mx-auto w-full">
        
        {/* Status Display */}
        {status === 'idle' && (
          <div className="w-full space-y-4">
            {queryShopId ? (
               <div className="bg-white p-8 rounded-2xl shadow-sm text-center">
                  <div className="bg-blue-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Store size={32} className="text-blue-500" />
                  </div>
                  <p className="font-bold text-gray-800 mb-2">店舗でスタンプを押す</p>
                  <p className="text-sm text-gray-500 mb-8">
                    位置情報を確認してスタンプを獲得します。<br/>
                    店舗にいることを確認してください。
                  </p>
                  
                  <button 
                    onClick={() => handleScan(queryShopId)}
                    className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-blue-700 transition flex items-center justify-center gap-2"
                  >
                    <MapPin size={20} />
                    ここ（現在地）でスタンプ！
                  </button>

                  <div className="mt-6 border-t pt-6">
                    <p className="text-xs text-gray-400 mb-2">または</p>
                    <button 
                      onClick={() => router.replace('/stamp/scan')}
                      className="text-gray-500 text-sm font-bold underline"
                    >
                      QRコードをスキャンする
                    </button>
                  </div>
               </div>
            ) : (
              <div className="bg-white p-6 rounded-2xl shadow-sm text-center">
                <p className="font-bold text-gray-800 mb-2">店舗のQRコードをスキャン</p>
                <p className="text-xs text-gray-500 mb-6">
                  カメラへのアクセスと位置情報を許可してください。<br/>
                  店舗から半径50m以内でスタンプを獲得できます。
                </p>
                
                <div className="overflow-hidden rounded-xl border-2 border-blue-100">
                  <QRScanner onScan={handleScan} />
                </div>
              </div>
            )}
          </div>
        )}

        {status === 'locating' && (
          <div className="text-center mt-20">
            <div className="bg-blue-100 p-6 rounded-full inline-block mb-6 animate-pulse">
              <MapPin size={48} className="text-blue-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">位置情報を確認中</h2>
            <p className="text-gray-500">{message}</p>
          </div>
        )}

        {status === 'granting' && (
          <div className="text-center mt-20">
            <div className="bg-blue-100 p-6 rounded-full inline-block mb-6">
              <Loader2 size={48} className="text-blue-600 animate-spin" />
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">処理中</h2>
            <p className="text-gray-500">{message}</p>
          </div>
        )}

        {status === 'success' && (
          <div className="text-center w-full mt-10 animate-in zoom-in duration-300">
            <div className="bg-green-100 p-8 rounded-full inline-block mb-6 shadow-lg shadow-green-100">
              <CheckCircle2 size={64} className="text-green-600" />
            </div>
            <h2 className="text-2xl font-black text-gray-800 mb-2">GET!</h2>
            <p className="font-bold text-lg text-green-600 mb-2">{shopName}</p>
            <p className="text-gray-600 mb-8">{message}</p>
            
            <button 
              onClick={() => router.push('/')} // Ideally go to stamp card list
              className="w-full bg-gray-900 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-black transition"
            >
              トップへ戻る
            </button>
            <button 
              onClick={reset}
              className="mt-4 text-gray-500 text-sm font-bold hover:text-gray-800"
            >
              続けてスキャンする
            </button>
          </div>
        )}

        {status === 'error' && (
          <div className="text-center w-full mt-10 animate-in shake duration-300">
            <div className="bg-red-100 p-6 rounded-full inline-block mb-6">
              <AlertCircle size={48} className="text-red-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">エラー</h2>
            <p className="text-red-600 font-bold mb-8 px-4">{message}</p>
            
            <button 
              onClick={reset}
              className="w-full bg-gray-900 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-black transition"
            >
              もう一度試す
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
