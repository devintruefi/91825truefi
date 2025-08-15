import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/50 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 transform active:scale-[0.98]",
  {
    variants: {
      variant: {
        default: "bg-gradient-to-b from-cyan-500 to-cyan-600 text-white shadow-lg shadow-cyan-500/25 hover:from-cyan-600 hover:to-cyan-700 hover:shadow-xl hover:shadow-cyan-500/30",
        destructive:
          "bg-gradient-to-b from-red-500 to-red-600 text-white shadow-lg shadow-red-500/25 hover:from-red-600 hover:to-red-700 hover:shadow-xl hover:shadow-red-500/30",
        outline:
          "border border-gray-200 dark:border-gray-800 bg-white/50 dark:bg-gray-950/50 backdrop-blur-sm hover:bg-gray-50 dark:hover:bg-gray-900 hover:border-gray-300 dark:hover:border-gray-700",
        secondary:
          "bg-gradient-to-b from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 text-gray-900 dark:text-gray-100 shadow-sm hover:from-gray-200 hover:to-gray-300 dark:hover:from-gray-700 dark:hover:to-gray-800",
        ghost: "hover:bg-gray-100/80 dark:hover:bg-gray-800/80 hover:backdrop-blur-sm",
        link: "text-cyan-600 dark:text-cyan-400 underline-offset-4 hover:underline hover:text-cyan-700 dark:hover:text-cyan-300",
      },
      size: {
        default: "h-10 px-5 py-2",
        sm: "h-9 rounded-lg px-4 text-xs",
        lg: "h-12 rounded-xl px-8 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
