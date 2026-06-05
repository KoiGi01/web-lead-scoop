import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-none font-medium transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e8fb52]/40",
  {
    variants: {
      variant: {
        primary:
          "bg-[#e8fb52] text-black border border-[#e8fb52] hover:bg-[#f3ff8a] hover:border-[#f3ff8a] active:scale-[0.98]",
        accent:
          "bg-[#e8fb52] text-black border border-[#e8fb52] hover:bg-[#f3ff8a] hover:border-[#f3ff8a] active:scale-[0.98]",
        secondary:
          "bg-transparent text-[#f3f5f8] border border-[#f3f5f8]/25 hover:border-[#f3f5f8] hover:bg-[#f3f5f8]/5",
        ghost:
          "bg-transparent text-[#9aa3b2] hover:bg-[#f3f5f8]/5 hover:text-[#f3f5f8]",
        destructive:
          "bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20",
        link: "text-[#e8fb52] underline-offset-4 hover:underline",
      },
      size: {
        sm: "h-8 px-3 text-xs",
        md: "h-9 px-4 text-sm",
        lg: "h-11 px-6 text-base",
        icon: "h-9 w-9",
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
