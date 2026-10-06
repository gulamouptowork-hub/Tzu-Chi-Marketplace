import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/components/ui/button";
const badgeVariants = cva(
  "inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold [&_svg]:shrink-0",
  {
    variants: {
      tone: {
        blue: "bg-sky text-primary",
        green: "bg-success-soft text-success",
        amber: "bg-warning-soft text-warning",
        red: "bg-danger-soft text-danger",
        gray: "bg-surface-muted text-muted",
        white: "bg-white/95 text-foreground shadow-sm",
      },
    },
    defaultVariants: { tone: "blue" },
  },
);
export type BadgeTone = NonNullable<VariantProps<typeof badgeVariants>["tone"]>;
export const listingStatusTone: Record<string, BadgeTone> = {
  AVAILABLE: "green",
  RESERVED: "amber",
  SOLD: "gray",
};
export const exchangeStatusTone: Record<string, BadgeTone> = {
  PROPOSED: "amber",
  ACCEPTED: "blue",
  COMPLETED: "green",
  CANCELLED: "gray",
};
export function Badge({
  tone,
  className,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}
