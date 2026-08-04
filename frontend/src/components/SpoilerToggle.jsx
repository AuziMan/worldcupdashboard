import { Eye, EyeOff } from 'lucide-react'
import { Button } from './ui/Button'
import { useSpoilers } from '@/providers/SpoilerProvider'
import { Tooltip } from './ui/Tooltip'

export default function SpoilerToggle() {
  const { spoilerFree, setSpoilerFree } = useSpoilers()

  return (
    <Tooltip content={spoilerFree ? 'Show completed scores' : 'Hide completed scores'}>
    <Button
      className={`spoiler-toggle ${spoilerFree ? 'spoiler-toggle--active' : ''}`}
      variant="secondary"
      onClick={() => setSpoilerFree(!spoilerFree)}
      aria-pressed={spoilerFree}
      aria-label={spoilerFree ? 'Turn off spoiler-free mode' : 'Turn on spoiler-free mode'}
    >
      {spoilerFree ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
      <span>{spoilerFree ? 'Spoilers hidden' : 'Hide spoilers'}</span>
    </Button>
    </Tooltip>
  )
}
