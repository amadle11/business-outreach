import { one } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import Nav, { PageTitle } from "@/components/Nav";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const s = await getSettings();
  const c = await one<{ review: number; replies: number; calls: number }>(
    `SELECT (SELECT count(*) FROM businesses WHERE status IN ('new','approved')) AS review,
      (SELECT count(*) FROM businesses WHERE needs_response=1) AS replies,
      (SELECT count(*) FROM businesses WHERE status='to_call' AND (follow_up_at IS NULL OR follow_up_at <= date('now'))) AS calls`,
  );
  return (
    <div className="admin">
      <Nav counts={{ review: c?.review ?? 0, replies: c?.replies ?? 0, calls: c?.calls ?? 0 }} live={s.live_sending === "1"} />
      <main>
        <PageTitle />
        {children}
      </main>
    </div>
  );
}
