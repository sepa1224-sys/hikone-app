'use client'

import { useEffect, useState } from 'react'
import { getShopStats } from '@/lib/actions/shop'
import { useAuth } from '@/components/AuthProvider'
import Link from 'next/link'
import { BarChart3, Users, Scan, ChevronRight } from 'lucide-react'

export default function ShopDashboard() {
  const { user } = useAuth()
  const [stats, setStats] = useState<{ todayAmount: number; todayCustomers: number } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStats() {
      if (user) {
        const result = await getShopStats(user.id)
        if (result.success && result.stats) {
          setStats(result.stats)
        }
      }
      setLoading(false)
    }
    fetchStats()
  }, [user])

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <p className="font-bold text-gray-600 mb-4">店舗アカウントでログインしてください</p>
          <Link href="/login" className="px-6 py-2 bg-blue-600 text-white rounded-full font-bold">ログイン</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-8 max-w-lg mx-auto">
      <header>
        <h1 className="text-2xl font-black text-gray-800">店舗ダッシュボード</h1>
        <p className="text-sm text-gray-500 font-bold mt-1">{new Date().toLocaleDateString('ja-JP')} の状況</p>
      </header>
      
      <div className="grid grid-cols-2 gap-4">
        {/* 来店人数 */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center text-center">
          <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center mb-3">
            <Users className="text-orange-500" size={20} />
          </div>
          <p className="text-xs text-gray-400 font-bold mb-1">来店人数</p>
          {loading ? (
            <div className="h-8 w-16 bg-gray-100 animate-pulse rounded"></div>
          ) : (
            <p className="text-3xl font-black text-gray-800">
              {stats?.todayCustomers ?? 0}<span className="text-xs font-bold text-gray-400 ml-1">人</span>
            </p>
          )}
        </div>

        {/* 売上ポイント */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center text-center">
          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mb-3">
            <BarChart3 className="text-blue-500" size={20} />
          </div>
          <p className="text-xs text-gray-400 font-bold mb-1">利用ポイント</p>
          {loading ? (
            <div className="h-8 w-16 bg-gray-100 animate-pulse rounded"></div>
          ) : (
            <p className="text-3xl font-black text-blue-600">
              {stats?.todayAmount.toLocaleString() ?? 0}<span className="text-xs font-bold text-gray-400 ml-1">pt</span>
            </p>
          )}
        </div>
      </div>

      {/* アクションボタン */}
      <div className="pt-4">
        <Link href="/shop/scan" className="group relative block w-full">
          <div className="absolute inset-0 bg-blue-600 rounded-2xl transform translate-y-1 transition-transform group-active:translate-y-0"></div>
          <div className="relative bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-2xl flex items-center justify-between text-white shadow-xl transform transition-transform group-active:translate-y-1">
            <div className="flex items-center gap-4">
              <div className="bg-white/20 p-3 rounded-xl">
                <Scan size={28} />
              </div>
              <div>
                <p className="font-black text-lg">QR決済スキャン</p>
                <p className="text-xs font-bold opacity-80">カメラを起動して読み取り</p>
              </div>
            </div>
            <ChevronRight size={24} className="opacity-80" />
          </div>
        </Link>
      </div>

      {/* 履歴（簡易表示） */}
      <div className="bg-white rounded-2xl p-5 border border-gray-100">
        <h3 className="font-bold text-gray-700 mb-4 text-sm">最近の取引</h3>
        <div className="text-center py-8 text-gray-400 text-xs font-bold">
          <p>まだ取引履歴はありません</p>
        </div>
      </div>
    </div>
  )
}
