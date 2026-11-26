import Link from "next/link";
import { notFound } from "next/navigation";
import { getBusiness } from "@/lib/businesses";
import { getSettings } from "@/lib/settings";
import { postcardBackHtml, postcardFrontHtml } from "@/lib/postcard";

export default async function PostcardPreview({ params }: { params: Promise<{ id: string }> }) {
  const b = await getBusiness(Number((await params).id));
  if (!b) notFound();
  const s = await getSettings();
  return (
    <div className="stack">
      <div className="row gap">
        <Link href={`/leads/${b.id}`}>← {b.name}</Link>
        <span className="muted small">6&quot; × 9&quot; postcard. Lob prints their address and postage in the blank bottom-right of the back. No return address is printed.</span>
      </div>
      <h3>Front</h3>
      <div className="pc"><iframe srcDoc={postcardFrontHtml(b)} title="front" /></div>
      <h3>Back</h3>
      <div className="pc"><iframe srcDoc={postcardBackHtml(b, s, true)} title="back" /></div>
    </div>
  );
}
