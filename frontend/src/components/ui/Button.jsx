import { cva } from 'class-variance-authority'
import { forwardRef } from 'react'
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
export const Button = forwardRef(function Button({ className, variant, size, type = 'button', ...props }, ref) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  )
})
