import Link from "next/link";
import { one } from "@/lib/db";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const s = await getSettings();
  const c = await one<{ review: number; replies: number }>(
    "SELECT (SELECT count(*) FROM businesses WHERE status IN ('new','approved')) AS review, (SELECT count(*) FROM businesses WHERE needs_response=1) AS replies",
  );
  return (
    <div className="admin">
      <header className="top">
        <Link href="/" className="brand">Outreach</Link>
        <nav>
          <Link href="/">Dashboard{c?.replies ? <span className="pill red">{c.replies}</span> : null}</Link>
          <Link href="/review">Review{c?.review ? <span className="pill">{c.review}</span> : null}</Link>
          <Link href="/tracker">Tracker</Link>
          <Link href="/settings">Settings</Link>
        </nav>
        <span className={s.live_sending === "1" ? "mode live" : "mode test"}>
          {s.live_sending === "1" ? "LIVE sending" : "Test mode"}
        </span>
      </header>
      <main>{children}</main>
    </div>
  );
}
