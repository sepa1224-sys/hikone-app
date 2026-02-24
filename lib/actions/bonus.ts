import { createClient } from '@/lib/supabase/client'

export interface BonusResult {
  dailyBonus: {
    awarded: boolean
    points: number
    consecutiveDays: number
  }
  birthdayBonus: {
    awarded: boolean
    points: number
  }
}

const DAILY_LOGIN_POINTS = 10
const BIRTHDAY_BONUS_POINTS = 500

export async function checkAndAwardLoginBonuses(userId: string): Promise<BonusResult> {
  try {
    const supabase = createClient()

    // Fetch Profile
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('last_login_bonus_at, consecutive_login_days, birthday, last_birthday_bonus_year, points')
      .eq('id', userId)
      .single()

    if (error || !profile) {
      console.error('Profile fetch error:', error)
      return { dailyBonus: { awarded: false, points: 0, consecutiveDays: 0 }, birthdayBonus: { awarded: false, points: 0 } }
    }

    const now = new Date()
    // Convert to JST for date comparison
    const jstNow = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }))
    const currentJstDate = jstNow.toISOString().split('T')[0] // YYYY-MM-DD in JST
    const currentJstYear = jstNow.getFullYear()
    const currentJstMonth = jstNow.getMonth() + 1
    const currentJstDay = jstNow.getDate()

    let dailyBonusAwarded = false
    let newConsecutiveDays = profile.consecutive_login_days || 0
    let pointsToAdd = 0
    let updates: any = {}
    let historyEntries = []

    // === Daily Bonus Logic ===
    let lastBonusDateJst = ''
    if (profile.last_login_bonus_at) {
      const lastBonusDate = new Date(profile.last_login_bonus_at)
      const lastBonusJst = new Date(lastBonusDate.toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }))
      lastBonusDateJst = lastBonusJst.toISOString().split('T')[0]
    }

    if (lastBonusDateJst !== currentJstDate) {
      // Award Daily Bonus
      dailyBonusAwarded = true
      pointsToAdd += DAILY_LOGIN_POINTS
      
      // Check consecutive days
      // If last bonus was yesterday, increment. Else reset to 1.
      const yesterday = new Date(jstNow)
      yesterday.setDate(yesterday.getDate() - 1)
      const yesterdayDateStr = yesterday.toISOString().split('T')[0]

      if (lastBonusDateJst === yesterdayDateStr) {
        newConsecutiveDays += 1
      } else {
        newConsecutiveDays = 1
      }

      updates.last_login_bonus_at = now.toISOString()
      updates.consecutive_login_days = newConsecutiveDays
      
      historyEntries.push({
        user_id: userId,
        amount: DAILY_LOGIN_POINTS,
        type: 'earned',
        description: `デイリーログインボーナス (${newConsecutiveDays}日連続)`,
        created_at: now.toISOString()
      })
    } else {
      newConsecutiveDays = profile.consecutive_login_days || 0 // Keep existing
    }

    // === Birthday Bonus Logic ===
    let birthdayBonusAwarded = false
    if (profile.birthday) {
      const [bYear, bMonth, bDay] = profile.birthday.split('-').map(Number)
      
      // Check if today is birthday (month/day)
      if (bMonth === currentJstMonth && bDay === currentJstDay) {
        // Check if already awarded this year
        if (profile.last_birthday_bonus_year !== currentJstYear) {
          birthdayBonusAwarded = true
          pointsToAdd += BIRTHDAY_BONUS_POINTS
          updates.last_birthday_bonus_year = currentJstYear
          
          historyEntries.push({
            user_id: userId,
            amount: BIRTHDAY_BONUS_POINTS,
            type: 'earned',
            description: `${currentJstYear}年 誕生日ボーナス`,
            created_at: now.toISOString()
          })
        }
      }
    }

    // === Execute Updates ===
    if (dailyBonusAwarded || birthdayBonusAwarded) {
      updates.points = (profile.points || 0) + pointsToAdd
      updates.updated_at = now.toISOString()

      const { error: updateError } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', userId)

      if (updateError) {
        console.error('Bonus update error:', updateError)
        return { dailyBonus: { awarded: false, points: 0, consecutiveDays: 0 }, birthdayBonus: { awarded: false, points: 0 } }
      }

      // Insert History
      if (historyEntries.length > 0) {
        const { error: historyError } = await supabase
          .from('point_history')
          .insert(historyEntries)
        
        if (historyError) {
          console.error('History insert error:', historyError)
        }
      }

    }

    return {
      dailyBonus: {
        awarded: dailyBonusAwarded,
        points: DAILY_LOGIN_POINTS,
        consecutiveDays: newConsecutiveDays
      },
      birthdayBonus: {
        awarded: birthdayBonusAwarded,
        points: BIRTHDAY_BONUS_POINTS
      }
    }

  } catch (e) {
    console.error('Unexpected error in checkAndAwardLoginBonuses:', e)
    return { dailyBonus: { awarded: false, points: 0, consecutiveDays: 0 }, birthdayBonus: { awarded: false, points: 0 } }
  }
}
