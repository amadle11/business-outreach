import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { COOKIE, sessionValue } from "@/lib/auth";

async function login(formData: FormData) {
  "use server";
  const pw = String(formData.get("password") || "");
  const next = String(formData.get("next") || "/");
  if (!process.env.ADMIN_PASSWORD || pw !== process.env.ADMIN_PASSWORD) redirect("/login?error=1");
  (await cookies()).set(COOKIE, await sessionValue(), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 90,
    path: "/",
  });
  redirect(next.startsWith("/") ? next : "/");
}

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string; next?: string }> }) {
  const sp = await searchParams;
  return (
    <div className="login">
      <form action={login} className="card">
        <h1>Anthony Builds</h1>
        <p className="muted">Log in to review leads.</p>
        <input type="hidden" name="next" value={sp.next || "/"} />
        <input type="password" name="password" placeholder="Password" autoFocus required />
        {sp.error && <p className="err">Wrong password.</p>}
        <button className="btn primary">Log in</button>
      </form>
    </div>
  );
}
