import { requireStudentPage as requireStudent } from "@/lib/session";
import { Avatar } from "@/components/ui/avatar";
import { AccountNav } from "@/components/site-nav";
// Shared sidebar for settings, own listings, exchanges and moderation.
export default async function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireStudent();
  return (
    <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-10">
      <aside className="min-w-0 space-y-4">
        <div className="card hidden items-center gap-3 p-4 lg:flex">
          <Avatar name={user.displayName} size="lg" />
          <div className="min-w-0">
            <p className="truncate font-semibold">{user.displayName}</p>
            <p className="truncate text-xs text-muted">{user.department}</p>
          </div>
        </div>
        <AccountNav isAdmin={user.role === "ADMIN"} />
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
