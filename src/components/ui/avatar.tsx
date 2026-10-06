import { cn } from "@/components/ui/button";
const sizes = {
  sm: "size-8 text-sm",
  md: "size-10 text-base",
  lg: "size-12 text-lg",
  xl: "size-20 text-3xl",
};
// Students have no profile photos; an initial keeps sellers recognizable.
export function Avatar({
  name,
  size = "md",
  className,
}: {
  name: string | null | undefined;
  size?: keyof typeof sizes;
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-primary font-semibold text-white",
        sizes[size],
        className,
      )}
    >
      {Array.from(name?.trim() || "?")[0].toUpperCase()}
    </span>
  );
}
