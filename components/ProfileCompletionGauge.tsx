import React from 'react'
import { CheckCircle, ChevronRight, Trophy } from 'lucide-react'

interface ProfileCompletionGaugeProps {
  progress: number
  isComplete: boolean
  isAwarded: boolean
  onClick: () => void
}

export default function ProfileCompletionGauge({ 
  progress, 
  isComplete, 
  isAwarded, 
  onClick 
}: ProfileCompletionGaugeProps) {
  // If fully completed and awarded, we might want to hide it or show a mini badge.
  // For now, let's show a "Completed" state or hide it if user prefers.
  // The request implies an incentive, so if it's done, maybe just show a small "Perfect Profile" badge?
  // Let's stick to the incentive view for incomplete profiles, and maybe a "Perfect" view for completed ones.
  
  if (isAwarded) {
    return (
      <div className="bg-gradient-to-r from-yellow-400 to-orange-500 rounded-2xl p-4 text-white shadow-md mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-white/20 p-2 rounded-full">
            <Trophy size={20} className="text-white" />
          </div>
          <div>
            <p className="font-black text-sm">プロフィール入力コンプリート！</p>
            <p className="text-xs text-white/90 font-bold">ボーナス200pt獲得済み</p>
          </div>
        </div>
        <div className="bg-white/20 px-3 py-1 rounded-full text-xs font-black">
          PERFECT
        </div>
      </div>
    )
  }

  return (
    <button 
      onClick={onClick}
      className="w-full bg-white border-2 border-orange-100 rounded-2xl p-4 shadow-sm mb-6 active:scale-95 transition-all text-left relative overflow-hidden group"
    >
      <div className="absolute top-0 right-0 bg-orange-100 text-orange-600 text-[10px] font-black px-2 py-1 rounded-bl-lg">
        あと少し！
      </div>
      
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">🔥</span>
          <span className="font-black text-gray-800 text-sm">全て入力して200ptゲット！</span>
        </div>
        <span className="text-orange-500 font-black text-lg">{progress}%</span>
      </div>
      
      <div className="w-full bg-gray-100 rounded-full h-3 mb-2 overflow-hidden">
        <div 
          className="bg-gradient-to-r from-orange-400 to-red-500 h-full rounded-full transition-all duration-1000 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
      
      <div className="flex items-center justify-between text-xs text-gray-500 font-bold">
        <span>プロフィールを充実させよう</span>
        <div className="flex items-center gap-1 text-orange-500 group-hover:translate-x-1 transition-transform">
          <span>入力を再開</span>
          <ChevronRight size={14} />
        </div>
      </div>
    </button>
  )
}
