'use client'

import WasteScheduleCard, { HikoneWasteMaster } from '@/components/home/WasteScheduleCard'

interface GarbageInfoWidgetProps {
  userCity: string | null
  userSelectedArea: string | null
  userWasteSchedule: HikoneWasteMaster | null
  onSetupClick?: () => void
}

export default function GarbageInfoWidget({
  userCity,
  userSelectedArea,
  userWasteSchedule,
  onSetupClick
}: GarbageInfoWidgetProps) {
  return (
    <WasteScheduleCard
      userCity={userCity}
      userSelectedArea={userSelectedArea}
      userWasteSchedule={userWasteSchedule}
      onSetupClick={onSetupClick}
    />
  )
}
