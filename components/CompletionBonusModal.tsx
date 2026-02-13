import React, { useEffect, useState } from 'react'
import { X, Trophy, Sparkles } from 'lucide-react'

interface CompletionBonusModalProps {
  isOpen: boolean
  onClose: () => void
  points?: number
}

export default function CompletionBonusModal({ isOpen, onClose, points = 200 }: CompletionBonusModalProps) {
  const [showConfetti, setShowConfetti] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setShowConfetti(true)
      // Simple timeout to stop confetti effect if we had one, 
      // but here we just rely on CSS animation
    } else {
      setShowConfetti(false)
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="bg-white rounded-[2rem] p-8 w-full max-w-sm relative z-10 shadow-2xl animate-in zoom-in-95 duration-300 overflow-hidden text-center">
        {/* Background rays effect */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-radial from-yellow-200/40 to-transparent opacity-50 animate-spin-slow pointer-events-none" />
        
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors z-20"
        >
          <X size={20} className="text-gray-500" />
        </button>

        <div className="relative z-10 flex flex-col items-center">
          <div className="w-24 h-24 bg-gradient-to-br from-yellow-300 to-orange-400 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-orange-200 animate-bounce-subtle">
            <Trophy size={48} className="text-white drop-shadow-md" />
          </div>

          <h2 className="text-2xl font-black text-gray-800 mb-2">
            おめでとうございます！
          </h2>
          
          <p className="text-gray-500 font-bold text-sm mb-6">
            プロフィール入力コンプリート
          </p>

          <div className="bg-orange-50 border-2 border-orange-100 rounded-2xl p-6 w-full mb-6">
            <p className="text-sm font-bold text-orange-800 mb-1">獲得ボーナス</p>
            <div className="text-4xl font-black text-orange-500 tracking-tight flex items-center justify-center gap-1">
              <span>+{points}</span>
              <span className="text-xl">pt</span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-full bg-gradient-to-r from-orange-500 to-red-500 text-white font-black py-4 rounded-xl shadow-lg shadow-orange-200 active:scale-95 transition-all"
          >
            やったね！
          </button>
        </div>
        
        {/* Simple CSS Confetti (dots) */}
        {showConfetti && (
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {[...Array(20)].map((_, i) => (
              <div
                key={i}
                className="absolute w-2 h-2 rounded-full animate-confetti-fall"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `-10px`,
                  backgroundColor: ['#FFD700', '#FF6347', '#00BFFF', '#32CD32', '#FF69B4'][Math.floor(Math.random() * 5)],
                  animationDelay: `${Math.random() * 2}s`,
                  animationDuration: `${2 + Math.random() * 3}s`
                }}
              />
            ))}
          </div>
        )}
      </div>
      
      <style jsx>{`
        @keyframes spin-slow {
          from { transform: translate(-50%, -50%) rotate(0deg); }
          to { transform: translate(-50%, -50%) rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 10s linear infinite;
        }
        @keyframes bounce-subtle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        .animate-bounce-subtle {
          animation: bounce-subtle 2s ease-in-out infinite;
        }
        @keyframes confetti-fall {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(500px) rotate(720deg); opacity: 0; }
        }
        .animate-confetti-fall {
          animation: confetti-fall linear forwards;
        }
      `}</style>
    </div>
  )
}
