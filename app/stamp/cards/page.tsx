'use client'

import { useEffect, useState } from 'react'
import { getMyStampCards } from '@/lib/actions/stamp'
import { useAuth } from '@/components/AuthProvider'
import { ArrowLeft, Stamp, Store } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'

export default function MyStampCardsPage() {
  const { user } = useAuth()
  const [cards, setCards] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchCards() {
      if (!user) return
      const result = await getMyStampCards()
      if (result.success && result.cards) {
        setCards(result.cards)
      }
      setLoading(false)
    }
    fetchCards()
  }, [user])

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white p-4 flex items-center shadow-sm relative z-10">
        <Link href="/" className="p-2 -ml-2 text-gray-600">
            <ArrowLeft size={24} />
        </Link>
        <h1 className="flex-1 text-center font-bold text-gray-800 mr-8">スタンプカード一覧</h1>
      </div>

      <div className="p-4 max-w-lg mx-auto space-y-4">
        {cards.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <div className="bg-gray-200 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Stamp size={32} className="text-gray-400" />
            </div>
            <p className="font-bold">まだスタンプカードがありません</p>
            <p className="text-xs mt-2">お店に行ってスタンプを集めよう！</p>
            <Link href="/stamp/scan" className="mt-6 inline-block bg-blue-600 text-white font-bold py-3 px-8 rounded-full shadow-lg hover:bg-blue-700 transition">
              QRコードをスキャン
            </Link>
          </div>
        ) : (
          cards.map((card) => (
            <Link 
              key={card.shopId} 
              href={`/stamp/card/${card.shopId}`} // TODO: 詳細画面も必要かも？今はとりあえずスキャン画面へ
              className="block bg-white p-4 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition"
            >
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-gray-100 rounded-xl overflow-hidden relative shrink-0">
                  {card.thumbnailUrl ? (
                    <Image 
                      src={card.thumbnailUrl} 
                      alt={card.shopName}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Store size={24} className="text-gray-400" />
                    </div>
                  )}
                </div>
                
                <div className="flex-1">
                  <h3 className="font-bold text-gray-800">{card.shopName}</h3>
                  <div className="flex items-center gap-1 mt-1">
                    <div className="bg-purple-100 text-purple-700 px-2 py-0.5 rounded-md text-xs font-bold flex items-center gap-1">
                      <Stamp size={12} />
                      {card.stampCount}個
                    </div>
                    <span className="text-[10px] text-gray-400">
                      最終: {new Date(card.lastStampedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  )
}
