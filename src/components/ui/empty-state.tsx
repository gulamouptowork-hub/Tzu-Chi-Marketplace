import type { LucideIcon } from "lucide-react";
import { cn } from "@/components/ui/button";
const tones = {
  blue: "bg-sky text-primary",
  amber: "bg-warning-soft text-warning",
  red: "bg-danger-soft text-danger",
};
export function EmptyState({
  icon: Icon,
  title,
  body,
  action,
  tone = "blue",
  heading: Heading = "h2",
  className,
}: {
  icon: LucideIcon;
  title: React.ReactNode;
  body?: React.ReactNode;
  action?: React.ReactNode;
  tone?: keyof typeof tones;
  heading?: "h1" | "h2";
  className?: string;
}) {
  return (
    <div
      className={cn(
        "card flex flex-col items-center px-6 py-14 text-center",
        className,
      )}
    >
      <div
        className={cn(
          "flex size-14 items-center justify-center rounded-2xl",
          tones[tone],
        )}
      >
        <Icon size={26} strokeWidth={1.75} />
      </div>
      <Heading
        className={cn(
          "mt-5 font-semibold",
          Heading === "h1" ? "text-2xl" : "text-lg",
        )}
      >
        {title}
      </Heading>
      {body && <p className="mt-2 max-w-sm text-muted">{body}</p>}
      {action && (
        <div className="mt-6 flex flex-wrap justify-center gap-3">{action}</div>
      )}
    </div>
  );
}
