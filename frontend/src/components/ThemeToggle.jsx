import { Moon, Sun } from 'lucide-react'
import { useTheme } from '@/providers/ThemeProvider'
import { Button } from '@/components/ui/Button'
import { Tooltip } from '@/components/ui/Tooltip'

export default function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const isDark = resolvedTheme === 'dark'
  const nextTheme = isDark ? 'light' : 'dark'

  return (
    <Tooltip content={`Switch to ${nextTheme} mode`}>
    <Button
      variant="secondary"
      size="icon"
      onClick={() => setTheme(nextTheme)}
      aria-label={`Switch to ${nextTheme} mode`}
    >
      {isDark ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
    </Button>
    </Tooltip>
  )
}
