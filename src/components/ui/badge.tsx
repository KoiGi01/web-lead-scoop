import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-sm px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-wide transition-colors",
  {
    variants: {
      variant: {
        default:
          "bg-petrol-700 text-cream-100 border border-cream-100/10",
        accent:
          "bg-wine-700/20 text-wine-300 border border-wine-700/30",
        success:
          "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
        warning:
          "bg-amber-500/10 text-amber-400 border border-amber-500/20",
        destructive:
          "bg-red-500/10 text-red-400 border border-red-500/20",
        outline:
          "text-cream-300 border border-cream-100/15",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
