"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const I = {
  home: "M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z",
  review: "M4 5h16M4 12h16M4 19h10",
  calls: "M5 4h3l2 5-2.5 1.5a11 11 0 0 0 6 6L15 14l5 2v3a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2",
  tracker: "M4 20V10M10 20V4M16 20v-7M22 20H2",
  settings: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z",
};

export function Icon({ d }: { d: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d={d} />
    </svg>
  );
}

const TITLES: [RegExp, string, string][] = [
  [/^\/$/, "Home", "What needs you today"],
  [/^\/review/, "Review", "This week's leads. Approve the good ones and send."],
  [/^\/calls/, "Calls", "Who to call today"],
  [/^\/tracker/, "Tracker", "Everyone you've reached out to"],
  [/^\/settings/, "Settings", "Your info, messages and search"],
  [/^\/leads\/\d+\/postcard/, "Postcard", ""],
  [/^\/leads/, "Lead", ""],
];

export default function Nav({ counts, live }: { counts: { review: number; replies: number; calls: number }; live: boolean }) {
  const path = usePathname();
  const items = [
    { href: "/", label: "Home", icon: I.home, n: counts.replies, hot: true },
    { href: "/review", label: "Review", icon: I.review, n: counts.review },
    { href: "/calls", label: "Calls", icon: I.calls, n: counts.calls },
    { href: "/tracker", label: "Tracker", icon: I.tracker, n: 0 },
    { href: "/settings", label: "Settings", icon: I.settings, n: 0 },
  ];
  const on = (h: string) => (h === "/" ? path === "/" : path.startsWith(h));
  return (
    <aside className="side">
      <Link href="/" className="brand">
        <span className="mark">A</span>
        <span>Anthony Builds</span>
      </Link>
      <nav>
        {items.map((it) => (
          <Link key={it.href} href={it.href} className={on(it.href) ? "on" : ""}>
            <Icon d={it.icon} />
            <span className="lbl">{it.label}</span>
            {it.n > 0 && <span className={it.hot ? "count hot" : "count"}>{it.n}</span>}
          </Link>
        ))}
      </nav>
      <Link href="/settings#sending" className={live ? "modebox live" : "modebox"}>
        <span className="dot" />
        <span>
          <b>{live ? "Live" : "Practice mode"}</b>
          <small>{live ? "Emails go to businesses" : "Emails go to you only"}</small>
        </span>
      </Link>
    </aside>
  );
}

export function PageTitle() {
  const path = usePathname();
  const t = TITLES.find(([re]) => re.test(path));
  if (!t || t[1] === "Lead" || t[1] === "Postcard") return null;
  return (
    <div className="pagehead">
      <h1>{t[1]}</h1>
      {t[2] && <p>{t[2]}</p>}
    </div>
  );
}
