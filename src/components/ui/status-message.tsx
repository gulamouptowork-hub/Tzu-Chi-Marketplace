import type { LucideIcon } from "lucide-react";
import { cn } from "@/components/ui/button";
const tones = {
  blue: "bg-sky text-primary",
  amber: "bg-warning-soft text-warning",
  red: "bg-danger-soft text-danger",
};
// Centered full-page message for errors, missing pages and blocked sign-ins.
export function StatusMessage({
  icon: Icon,
  title,
  body,
  tone = "blue",
  as: Wrapper = "main",
  children,
}: {
  icon: LucideIcon;
  title: React.ReactNode;
  body: React.ReactNode;
  tone?: keyof typeof tones;
  as?: "main" | "div";
  children?: React.ReactNode;
}) {
  return (
    <Wrapper className="flex flex-1 items-center justify-center px-4 py-16">
      <div className="card w-full max-w-md p-8 text-center sm:p-10">
        <span
          className={cn(
            "mx-auto flex size-14 items-center justify-center rounded-2xl",
            tones[tone],
          )}
        >
          <Icon size={26} strokeWidth={1.75} />
        </span>
        <h1 className="mt-6 text-2xl font-semibold">{title}</h1>
        <p className="mt-3 text-muted">{body}</p>
        {children && (
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            {children}
          </div>
        )}
      </div>
    </Wrapper>
  );
}
