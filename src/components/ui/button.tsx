import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
export const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50 aria-disabled:cursor-not-allowed aria-disabled:opacity-50 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        bright:
          "bg-primary-bright text-white text-[20px] font-bold shadow-sm hover:bg-primary",
        default:
          "bg-primary text-white shadow-sm shadow-primary/25 hover:bg-primary-dark",
        secondary: "bg-sky text-primary hover:bg-sky-strong",
        outline:
          "border border-border-strong bg-surface text-foreground shadow-xs hover:border-primary/40 hover:bg-sky hover:text-primary",
        ghost: "text-foreground hover:bg-sky hover:text-primary",
        danger: "bg-danger text-white shadow-sm hover:bg-danger/90",
        "danger-outline":
          "border border-danger/30 bg-surface text-danger hover:bg-danger-soft",
        inverse: "bg-white text-primary shadow-sm hover:bg-sky",
      },
      size: {
        sm: "h-9 px-3",
        default: "h-10 px-4",
        lg: "h-12 px-6 text-[15px]",
        icon: "size-10",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);
export function cn(...classes: Parameters<typeof clsx>) {
  return twMerge(clsx(classes));
}
export function Button({
  asChild = false,
  variant,
  size,
  className,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Component = asChild ? Slot : "button";
  return (
    <Component
      className={cn(
        buttonVariants({ variant, size }),
        variant === "bright" && "text-[20px] font-bold",
        className,
      )}
      {...props}
    />
  );
}
