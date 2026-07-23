import { cva } from 'class-variance-authority'
import { cn } from '@/lib/utils'

const buttonVariants = cva(
  'ds-button',
  {
    variants: {
      variant: {
        primary: 'ds-button--primary',
        secondary: 'ds-button--secondary',
        ghost: 'ds-button--ghost',
      },
      size: {
        sm: 'ds-button--sm',
        md: 'ds-button--md',
        icon: 'ds-button--icon',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  },
)

// eslint-disable-next-line react/prop-types
export function Button({ className, variant, size, type = 'button', ...props }) {
  return (
    <button
      type={type}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  )
}
