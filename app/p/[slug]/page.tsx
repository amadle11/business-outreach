import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import PreviewSite from "@/components/PreviewSite";
import { getBySlug } from "@/lib/businesses";
import { getSettings } from "@/lib/settings";
import { logEvent, run } from "@/lib/db";
import { COOKIE, sessionValue } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const b = await getBySlug((await params).slug);
  return { title: b ? `${b.name} | ${b.city ?? ""}` : "Not found", robots: { index: false } };
}

export default async function Preview({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ src?: string }>;
}) {
  const { slug } = await params;
  const { src } = await searchParams;
  const b = await getBySlug(slug);
  if (!b || b.status === "opted_out") notFound();
  const s = await getSettings();

  // Count a view only when it's the business (not you, logged in) and not already counted as a QR scan.
  const isMe = (await cookies()).get(COOKIE)?.value === (await sessionValue());
  if (!isMe && src !== "qr" && b.status !== "new" && b.status !== "approved") {
    await run("UPDATE businesses SET views = views + 1 WHERE id = ?", [b.id]);
    await logEvent(b.id, "view", `Sample site opened${src ? ` (from ${src})` : ""}`);
  }
  return <PreviewSite b={b} s={s} />;
}
