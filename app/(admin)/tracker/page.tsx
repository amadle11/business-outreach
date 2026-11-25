import Link from "next/link";
import { all } from "@/lib/db";
import { fmtDate } from "@/lib/format";
import { STATUS_LABEL, type Business } from "@/lib/types";

const FILTERS = [
  ["all", "All contacted"],
  ["contacted", "Waiting"],
  ["replied", "Replied"],
  ["talking", "In conversation"],
  ["won", "Won"],
  ["lost", "Lost"],
  ["opted_out", "Opted out"],
  ["removed", "Removed in review"],
] as const;

export default async function Tracker({ searchParams }: { searchParams: Promise<{ status?: string; q?: string }> }) {
  const { status = "all", q = "" } = await searchParams;
  const where: string[] = [];
  const args: string[] = [];
  if (status === "all") where.push("status NOT IN ('new','approved','removed')");
  else {
    where.push("status = ?");
    args.push(status);
  }
  if (q) {
    where.push("(name LIKE ? OR city LIKE ? OR email LIKE ? OR phone LIKE ?)");
    args.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`);
  }
  const rows = await all<Business>(
    `SELECT * FROM businesses WHERE ${where.join(" AND ")} ORDER BY needs_response DESC, coalesce(last_reply_at, contacted_at, updated_at) DESC LIMIT 500`,
    args,
  );
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="stack">
      <div className="row gap wrap tabs">
        {FILTERS.map(([k, label]) => (
          <Link key={k} href={`/tracker?status=${k}`} className={status === k ? "tab on" : "tab"}>
            {label}
          </Link>
        ))}
        <span style={{ flex: 1 }} />
        <form>
          <input type="hidden" name="status" value={status} />
          <input name="q" defaultValue={q} placeholder="Search name, town, email, phone" />
        </form>
      </div>
      <div className="card" style={{ padding: 0, overflowX: "auto" }}>
        <table className="table">
          <thead>
            <tr>
              <th>Business</th>
              <th>Town</th>
              <th>Sent</th>
              <th>Seen</th>
              <th>Reply</th>
              <th>Follow-up</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="muted">Nothing here yet.</td>
              </tr>
            )}
            {rows.map((b) => (
              <tr key={b.id} className={b.needs_response ? "hl" : ""}>
                <td>
                  <Link href={`/leads/${b.id}`}><b>{b.name}</b></Link>
                  {b.is_sample ? <span className="pill">sample</span> : null}
                  <div className="muted small">{b.category}</div>
                </td>
                <td>{b.city}</td>
                <td>
                  {b.channel === "email" ? "✉️" : b.channel === "postcard" ? "📮" : ""} {fmtDate(b.contacted_at)}
                  {b.followups_sent ? <div className="muted small">+ follow-up</div> : null}
                </td>
                <td>
                  {b.scans > 0 && <span className="pill green">{b.scans} scan{b.scans > 1 ? "s" : ""}</span>}
                  {b.views > 0 && <span className="pill green">{b.views} view{b.views > 1 ? "s" : ""}</span>}
                </td>
                <td>
                  {b.needs_response ? <span className="pill red">needs reply</span> : null}
                  {b.last_reply_at && <div className="small">{fmtDate(b.last_reply_at)}</div>}
                </td>
                <td className={b.follow_up_at && b.follow_up_at <= today ? "due" : ""}>{fmtDate(b.follow_up_at)}</td>
                <td><span className={`pill st-${b.status}`}>{STATUS_LABEL[b.status] ?? b.status}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
