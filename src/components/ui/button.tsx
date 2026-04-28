import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 font-medium transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-wine-400/50",
  {
    variants: {
      variant: {
        primary:
          "bg-cream-100 text-petrol-900 hover:bg-cream-50 active:scale-[0.98]",
        accent:
          "bg-wine-700 text-cream-100 hover:bg-wine-500 active:scale-[0.98] focus-visible:ring-wine-400/40",
        secondary:
          "bg-petrol-800 text-cream-100 border border-cream-100/10 hover:border-cream-100/20 hover:bg-petrol-700",
        ghost:
          "bg-transparent text-cream-300 hover:bg-cream-100/5 hover:text-cream-100",
        destructive:
          "bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20",
        link: "text-wine-500 underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-8 px-3 text-xs rounded-md",
        md: "h-9 px-4 text-sm rounded-md",
        lg: "h-11 px-6 text-base rounded-md",
        icon: "h-9 w-9 rounded-md",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
