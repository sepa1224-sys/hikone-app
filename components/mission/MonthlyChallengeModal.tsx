'use client'

import { X, Trophy, Gift, Star, Calendar, MapPin, CheckCircle2 } from 'lucide-react'
import { useEffect } from 'react'

interface MonthlyChallengeModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function MonthlyChallengeModal({
  isOpen,
  onClose
}: MonthlyChallengeModalProps) {
  // モーダル表示時に背面のスクロールを禁止する
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white w-full max-w-md max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ヘッダー */}
        <div className="relative h-48 overflow-hidden bg-gradient-to-br from-orange-400 to-yellow-500">
          <div className="absolute top-0 right-0 p-4 z-20">
            <button 
              onClick={onClose}
              className="bg-black/20 hover:bg-black/30 text-white p-2 rounded-full transition-colors backdrop-blur-sm"
            >
              <X size={20} />
            </button>
          </div>
          
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-6 text-center z-10">
            <div className="bg-white/20 p-3 rounded-full mb-3 backdrop-blur-sm shadow-inner border border-white/30">
              <Trophy className="w-10 h-10 text-yellow-100" />
            </div>
            <h2 className="text-2xl font-black tracking-tight drop-shadow-md mb-1">
              今月のマンスリー・チャレンジ
            </h2>
            <div className="flex items-center gap-1 text-yellow-100 text-sm font-bold bg-black/10 px-3 py-1 rounded-full">
              <Calendar className="w-3 h-3" />
              <span>開催期間: 2024.10.01 - 10.31</span>
            </div>
          </div>
          
          {/* 装飾 */}
          <Star className="absolute top-4 left-4 w-12 h-12 text-yellow-300 opacity-30 rotate-12" />
          <Star className="absolute bottom-4 right-10 w-20 h-20 text-yellow-300 opacity-20 -rotate-12" />
          <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
        </div>

        {/* コンテンツ */}
        <div className="p-6 space-y-6">
          {/* メイン景品 */}
          <div className="bg-gradient-to-r from-orange-50 to-orange-100 rounded-2xl p-5 border border-orange-200 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="bg-white p-3 rounded-xl shadow-sm text-orange-500">
                <Gift className="w-8 h-8" />
              </div>
              <div>
                <div className="text-xs font-bold text-orange-600 mb-1">豪華景品</div>
                <h3 className="text-lg font-bold text-gray-800 leading-tight mb-2">
                  近江牛食べ比べセット
                </h3>
                <p className="text-sm text-gray-600">
                  スタンプをすべて集めた方の中から抽選で1名様にプレゼント！
                </p>
              </div>
            </div>
          </div>

          {/* サブ景品 */}
          <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100">
            <div className="bg-white p-2 rounded-lg shadow-sm text-blue-500">
              <Gift className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs font-bold text-blue-600 mb-1">参加賞</div>
              <h3 className="text-base font-bold text-gray-800 leading-tight mb-1">
                500円商品券
              </h3>
              <p className="text-xs text-gray-500">
                あと2つクリアで全員にプレゼント！
              </p>
            </div>
          </div>

          {/* ルール説明 */}
          <div>
            <h4 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              参加方法
            </h4>
            <ul className="space-y-3 text-sm text-gray-600">
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center font-bold text-xs text-gray-500">1</span>
                <span>対象スポットに行ってQRコードをスキャン、または写真を撮影しよう</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center font-bold text-xs text-gray-500">2</span>
                <span>ミッションをクリアするとスタンプが貯まります</span>
              </li>
              <li className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center font-bold text-xs text-gray-500">3</span>
                <span>スタンプが集まると自動的に抽選に応募されます</span>
              </li>
            </ul>
          </div>

          <div className="pt-2">
            <button 
              onClick={onClose}
              className="w-full py-3.5 bg-orange-500 hover:bg-orange-600 text-white font-bold rounded-xl shadow-md transition-colors active:scale-95"
            >
              閉じてチャレンジを続ける
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
