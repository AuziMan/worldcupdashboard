import { Tooltip as BaseTooltip } from '@base-ui/react/tooltip'

// eslint-disable-next-line react/prop-types
export function Tooltip({ children, content, side = 'top', align = 'center', disabled = false }) {
  if (!content) return children

  return (
    <BaseTooltip.Root disabled={disabled}>
      <BaseTooltip.Trigger render={children} />
      <BaseTooltip.Portal>
        <BaseTooltip.Positioner
          className="app-tooltip-positioner"
          side={side}
          align={align}
          sideOffset={9}
          collisionPadding={10}
        >
          <BaseTooltip.Popup className="app-tooltip-popup">
            <BaseTooltip.Arrow className="app-tooltip-arrow" />
            {content}
          </BaseTooltip.Popup>
        </BaseTooltip.Positioner>
      </BaseTooltip.Portal>
    </BaseTooltip.Root>
  )
}

export const TooltipProvider = BaseTooltip.Provider
