'use client'

import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Users, Trophy, TrendingUp, Medal } from 'lucide-react'

export default function SchoolDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const schoolId = params.id as string
  
  // TODO: Fetch school details, stats, and rankings using schoolId
  const schoolName = "滋賀大学" // Placeholder

  return (
    <div className="min-h-screen bg-blue-50/30 pb-24">
      {/* Header */}
      <div className="bg-white/90 backdrop-blur-md px-4 py-3 sticky top-0 z-50 border-b border-gray-100 flex items-center gap-3">
        <button 
          onClick={() => router.back()}
          className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 hover:bg-gray-200 transition-colors"
        >
          <ArrowLeft size={18} />
        </button>
        <h1 className="font-black text-lg text-gray-800">{schoolName}</h1>
      </div>

      <div className="p-4 space-y-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-2">
              <Users size={16} className="text-blue-500" />
              <span className="text-xs font-bold text-gray-400">総人数</span>
            </div>
            <p className="text-2xl font-black text-gray-800">1,240<span className="text-sm font-bold text-gray-400 ml-1">人</span></p>
          </div>
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp size={16} className="text-green-500" />
              <span className="text-xs font-bold text-gray-400">月間走行</span>
            </div>
            <p className="text-2xl font-black text-gray-800">4,580<span className="text-sm font-bold text-gray-400 ml-1">km</span></p>
          </div>
        </div>

        {/* Grade Distribution Placeholder */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Users size={18} className="text-indigo-500" />
            学年別分布
          </h2>
          <div className="h-40 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 text-sm font-bold">
            グラフ準備中...
          </div>
        </div>

        {/* Rankings Placeholder */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h2 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Trophy size={18} className="text-amber-500" />
            校内ランキング (月間)
          </h2>
          <div className="space-y-3">
            {[1, 2, 3].map((rank) => (
              <div key={rank} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black ${
                  rank === 1 ? 'bg-yellow-100 text-yellow-600' :
                  rank === 2 ? 'bg-gray-200 text-gray-600' :
                  'bg-orange-100 text-orange-600'
                }`}>
                  {rank}
                </div>
                <div className="flex-1">
                  <div className="h-4 w-24 bg-gray-200 rounded animate-pulse mb-1"></div>
                  <div className="h-3 w-16 bg-gray-100 rounded animate-pulse"></div>
                </div>
                <Medal size={20} className="text-gray-300" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
