'use client'

import { useEffect, useState } from 'react'
import { checkAndAwardLoginBonuses } from '@/lib/actions/bonus'
import { useAuth } from '@/components/AuthProvider'
import { toast } from 'sonner'
import confetti from 'canvas-confetti'

export default function BonusChecker() {
  const { user } = useAuth()
  const [checked, setChecked] = useState(false)

  useEffect(() => {
    // ユーザーがいない、または既にチェック済みの場合は何もしない
    if (!user || checked) return

    const checkBonus = async () => {
      // セッションストレージを使って、ブラウザセッションごとの重複実行を防止
      // 日付を含めることで、日付が変わった場合に（リロードすれば）再チェックできるようにする
      const today = new Date().toLocaleDateString('ja-JP')
      const sessionKey = `bonus_checked_${user.id}_${today}`
      
      if (sessionStorage.getItem(sessionKey)) {
        setChecked(true)
        return
      }

      // チェック開始（二重実行防止）
      setChecked(true)
      
      try {
        const result = await checkAndAwardLoginBonuses(user.id)
        
        // 実行完了フラグを保存
        sessionStorage.setItem(sessionKey, 'true')

        // デイリーボーナス通知
        if (result.dailyBonus.awarded) {
          toast.success('ログインボーナス！', {
            description: `+${result.dailyBonus.points}pt (連続${result.dailyBonus.consecutiveDays}日目)`,
            duration: 5000,
            icon: '🎁',
            style: {
              background: '#FFF7ED', // orange-50
              border: '2px solid #F97316', // orange-500
              color: '#9A3412', // orange-900
            }
          })
        }

        // 誕生日ボーナス演出
        if (result.birthdayBonus.awarded) {
          // Confetti演出
          const duration = 5 * 1000
          const animationEnd = Date.now() + duration
          const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 }

          const randomInRange = (min: number, max: number) => {
            return Math.random() * (max - min) + min
          }

          const interval: any = setInterval(function() {
            const timeLeft = animationEnd - Date.now()

            if (timeLeft <= 0) {
              return clearInterval(interval)
            }

            const particleCount = 50 * (timeLeft / duration)
            
            // 画面の左右から紙吹雪を飛ばす
            confetti({
              ...defaults, 
              particleCount,
              origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
            })
            confetti({
              ...defaults, 
              particleCount,
              origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
            })
          }, 250)

          // 誕生日通知
          setTimeout(() => {
            toast.success('お誕生日おめでとうございます！', {
              description: `特別ボーナス +${result.birthdayBonus.points}pt`,
              duration: 8000,
              icon: '🎂',
              style: {
                background: '#FEF2F2', // red-50
                border: '2px solid #EF4444', // red-500
                color: '#991B1B', // red-800
              }
            })
          }, 500)
        }
      } catch (error) {
        console.error('Bonus check failed:', error)
      }
    }

    checkBonus()
  }, [user, checked])

  return null
}
