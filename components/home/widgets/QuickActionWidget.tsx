'use client'

import { QrCode, Search, Store, UserCheck, MapPin } from 'lucide-react'
import Link from 'next/link'

interface QuickActionWidgetProps {
  isStudent?: boolean
}

export default function QuickActionWidget({ isStudent = false }: QuickActionWidgetProps) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {/* QR認証 / マイQR */}
      <Link 
        href={isStudent ? "/student" : "/profile"}
        className="bg-white p-4 rounded-[1.5rem] shadow-sm border border-gray-100 flex flex-col items-center justify-center gap-2 hover:bg-gray-50 transition-colors active:scale-95"
      >
        <div className={`p-3 rounded-full ${isStudent ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}`}>
          {isStudent ? <UserCheck size={24} /> : <QrCode size={24} />}
        </div>
        <span className="text-xs font-black text-gray-700">
          {isStudent ? '学生認証' : 'マイQR'}
        </span>
      </Link>

      {/* 店舗検索 */}
      <Link 
        href="/shop"
        className="bg-white p-4 rounded-[1.5rem] shadow-sm border border-gray-100 flex flex-col items-center justify-center gap-2 hover:bg-gray-50 transition-colors active:scale-95"
      >
        <div className="p-3 rounded-full bg-orange-100 text-orange-600">
          <Store size={24} />
        </div>
        <span className="text-xs font-black text-gray-700">店舗を探す</span>
      </Link>
    </div>
  )
}
