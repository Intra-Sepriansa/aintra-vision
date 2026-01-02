"use client";

import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef } from "react";

const buttonStyles = cva(
  "relative inline-flex items-center justify-center overflow-hidden rounded-full px-5 py-2 font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2",
  {
    variants: {
      intent: {
        primary: "bg-gradient-to-r from-primary-600 via-primary-500 to-sky-500 text-white shadow hover:from-primary-500 hover:to-sky-400",
        ghost: "border border-slate-200 bg-white/70 text-primary-600 hover:bg-white dark:border-slate-700 dark:bg-slate-900/40",
      },
      size: { sm: "text-sm", md: "text-base" },
    },
    defaultVariants: { intent: "primary", size: "md" },
  }
);

export interface GradientButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonStyles> {
  asChild?: boolean;
}

const GradientButton = forwardRef<HTMLButtonElement, GradientButtonProps>(
  ({ intent, size, asChild = false, className, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={buttonStyles({ intent, size, className })} ref={ref} {...props} />;
  }
);

GradientButton.displayName = "GradientButton";
export default GradientButton;