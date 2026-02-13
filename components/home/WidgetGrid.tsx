'use client'

import { UserWidgetSettings, WidgetConfig } from '@/lib/actions/user-settings'
import { HikoneWasteMaster } from '@/components/home/WasteScheduleCard'
import NextTrainWidget from './widgets/NextTrainWidget'
import GarbageInfoWidget from './widgets/GarbageInfoWidget'
import QuickActionWidget from './widgets/QuickActionWidget'

interface WidgetGridProps {
  settings: UserWidgetSettings
  userCity: string | null
  userSelectedArea: string | null
  userWasteSchedule: HikoneWasteMaster | null
  onWasteSetupClick: () => void
  isStudent: boolean
}

export default function WidgetGrid({
  settings,
  userCity,
  userSelectedArea,
  userWasteSchedule,
  onWasteSetupClick,
  isStudent
}: WidgetGridProps) {
  // Sort and filter widgets
  const activeWidgets = settings.widgets
    .filter(w => w.enabled)
    .sort((a, b) => a.order - b.order)

  return (
    <div className="space-y-4">
      {activeWidgets.map((widget) => (
        <div key={widget.id}>
          {renderWidget(widget, {
            userCity,
            userSelectedArea,
            userWasteSchedule,
            onWasteSetupClick,
            isStudent
          })}
        </div>
      ))}
    </div>
  )
}

function renderWidget(widget: WidgetConfig, props: Omit<WidgetGridProps, 'settings'>) {
  switch (widget.id) {
    case 'next_train':
      return <NextTrainWidget stationName={widget.settings?.stationName} />
    case 'garbage_info':
      return (
        <GarbageInfoWidget
          userCity={props.userCity}
          userSelectedArea={props.userSelectedArea}
          userWasteSchedule={props.userWasteSchedule}
          onSetupClick={props.onWasteSetupClick}
        />
      )
    case 'quick_action':
      return <QuickActionWidget isStudent={props.isStudent} />
    default:
      return null
  }
}
