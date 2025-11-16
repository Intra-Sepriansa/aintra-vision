import * as React from "react";
import { cn } from "@/lib/utils";

const Badge = ({ className, ...props }: React.ComponentProps<"span">) => (
  <span
    className={cn(
      "inline-flex items-center gap-1 rounded-full border border-neutral-200/80 bg-neutral-100/70 px-3 py-1 text-xs font-medium uppercase tracking-wide text-neutral-600",
      className,
    )}
    {...props}
  />
);

export { Badge };
