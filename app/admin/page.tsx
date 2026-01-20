'use client'

import Link from 'next/link'
import { MapPin, Utensils, Settings, ArrowLeft, Shield } from 'lucide-react'

export default function AdminPage() {
  const adminMenus = [
    {
      title: 'ジオコーディング',
      description: '店舗住所から緯度・経度を一括取得',
      href: '/admin/geocode',
      icon: <MapPin size={24} />,
      color: 'from-blue-500 to-indigo-600'
    },
    {
      title: 'メニュー管理',
      description: '店舗のメニュー情報を管理',
      href: '/admin/shops',
      icon: <Utensils size={24} />,
      color: 'from-orange-500 to-red-600'
    }
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <div className="bg-gradient-to-r from-gray-800 to-gray-900 text-white px-4 py-6">
        <div className="max-w-4xl mx-auto">
          <Link href="/" className="inline-flex items-center gap-2 text-white/80 hover:text-white mb-4">
            <ArrowLeft size={20} />
            <span className="text-sm font-bold">ホームに戻る</span>
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <Shield size={28} />
            </div>
            <div>
              <h1 className="text-2xl font-black">管理画面</h1>
              <p className="text-sm text-white/80">アプリの各種設定を管理</p>
            </div>
          </div>
        </div>
      </div>

      {/* メニュー一覧 */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="grid gap-4">
          {adminMenus.map((menu) => (
            <Link
              key={menu.href}
              href={menu.href}
              className="bg-white rounded-2xl p-5 shadow-sm border hover:shadow-md transition-all active:scale-[0.98] flex items-center gap-4"
            >
              <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${menu.color} flex items-center justify-center text-white shadow-lg`}>
                {menu.icon}
              </div>
              <div className="flex-1">
                <h2 className="font-black text-gray-800 text-lg">{menu.title}</h2>
                <p className="text-sm text-gray-500">{menu.description}</p>
              </div>
              <div className="text-gray-400">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </Link>
          ))}
        </div>

        {/* 注意書き */}
        <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-2xl">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0">
              <Settings size={16} className="text-yellow-600" />
            </div>
            <div>
              <p className="font-bold text-yellow-800">管理者向け機能</p>
              <p className="text-sm text-yellow-700 mt-1">
                この画面はアプリの管理者向けです。<br />
                各機能はデータベースに直接影響を与えるため、慎重に操作してください。
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
