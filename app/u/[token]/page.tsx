import { getByToken } from "@/lib/businesses";
import { unsubscribeToken } from "@/lib/unsubscribe";
import { getSettings } from "@/lib/settings";
import { redirect } from "next/navigation";

async function confirm(formData: FormData) {
  "use server";
  const token = String(formData.get("token"));
  await unsubscribeToken(token);
  redirect(`/u/${token}?done=1`);
}

export default async function Unsubscribe({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ done?: string }>;
}) {
  const { token } = await params;
  const { done } = await searchParams;
  const b = await getByToken(token);
  const s = await getSettings();
  return (
    <div className="login">
      <div className="card">
        {!b ? (
          <p>This link is no longer valid.</p>
        ) : done || b.status === "opted_out" ? (
          <>
            <h1>You're unsubscribed</h1>
            <p className="muted">
              {b.name} won't hear from {s.my_name} again. Sorry for the bother, and best of luck!
            </p>
          </>
        ) : (
          <form action={confirm}>
            <h1>Unsubscribe</h1>
            <p className="muted">
              Stop all messages from {s.my_name} to {b.name}?
            </p>
            <input type="hidden" name="token" value={token} />
            <button className="btn primary">Yes, unsubscribe</button>
          </form>
        )}
      </div>
    </div>
  );
}
