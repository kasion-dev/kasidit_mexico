import { useState } from "react";
import { cn } from "../lib/utils";

export function Card({ className, children, as: Tag = "section", ...rest }) {
  return (
    <Tag className={cn("rounded-2xl border border-line bg-card p-4", className)} {...rest}>
      {children}
    </Tag>
  );
}

export function Label({ className, children }) {
  return <span className={cn("label block", className)}>{children}</span>;
}

export function SectionTitle({ children, right, className }) {
  return (
    <div className={cn("mb-3 flex items-center justify-between gap-3", className)}>
      <h2 className="text-base font-semibold">{children}</h2>
      {right ? <div className="flex items-center gap-2 text-xs text-dim">{right}</div> : null}
    </div>
  );
}

const VARIANTS = {
  primary: "bg-accent text-on-accent hover:brightness-110 font-semibold",
  outline: "border border-line-strong bg-transparent hover:bg-inner",
  ghost: "bg-transparent text-dim hover:bg-inner hover:text-ink",
  danger: "border border-bad/40 text-bad hover:bg-bad/10",
  subtle: "bg-inner hover:bg-[#222b3c]",
};

const SIZES = {
  md: "h-9 px-3.5 text-sm rounded-lg",
  sm: "h-8 px-2.5 text-xs rounded-md",
  icon: "h-8 w-8 rounded-md grid place-items-center",
};

export function Button({ variant = "outline", size = "md", className, type = "button", ...props }) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 whitespace-nowrap transition disabled:cursor-not-allowed disabled:opacity-40",
        VARIANTS[variant],
        SIZES[size],
        className
      )}
      {...props}
    />
  );
}

export function Field({ className, ...props }) {
  return <input className={cn("field", className)} {...props} />;
}

export function TextArea({ className, ...props }) {
  return <textarea rows={3} className={cn("field resize-y", className)} {...props} />;
}

export function Select({ className, children, ...props }) {
  return (
    <select className={cn("field", className)} {...props}>
      {children}
    </select>
  );
}

const groupInt = (s) => s.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
function formatDraft(clean) {
  if (clean === "") return "";
  const [i, d] = clean.split(".");
  return groupInt(i.replace(/^0+(?=\d)/, "")) + (d !== undefined ? "." + d : "");
}
function formatNumberInput(v) {
  if (v === "" || v == null) return "";
  const n = Number(v);
  if (!Number.isFinite(n)) return "";
  return (n < 0 ? "-" : "") + formatDraft(String(Math.round(Math.abs(n) * 100) / 100));
}

/** Number input with thousands separators; stores a number or "". */
export function NumField({ value, onChange, className, ...props }) {
  const [draft, setDraft] = useState(null);
  const shown = draft != null ? draft : formatNumberInput(value);
  return (
    <input
      type="text"
      inputMode="decimal"
      autoComplete="off"
      className={cn("field num text-right", className)}
      value={shown}
      onChange={(e) => {
        let clean = e.target.value.replace(/[^\d.]/g, "");
        const dot = clean.indexOf(".");
        if (dot !== -1) clean = clean.slice(0, dot + 1) + clean.slice(dot + 1).replace(/\./g, "");
        setDraft(formatDraft(clean));
        onChange(clean === "" || clean === "." ? "" : Number(clean));
      }}
      onFocus={() => setDraft(formatNumberInput(value))}
      onBlur={() => setDraft(null)}
      {...props}
    />
  );
}

export function Segmented({ value, onChange, options, className, size = "md" }) {
  return (
    <div className={cn("no-scrollbar inline-flex max-w-full overflow-x-auto rounded-lg border border-line bg-inner p-0.5", className)} role="tablist">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "shrink-0 rounded-md font-semibold transition",
            size === "sm" ? "px-2.5 py-1 text-xs" : "px-3 py-1.5 text-sm",
            value === o.value ? "bg-card text-ink shadow-sm" : "text-dim hover:text-ink"
          )}
        >
          {o.label}
          {o.count != null ? <span className="num ml-1 text-faint">{o.count}</span> : null}
        </button>
      ))}
    </div>
  );
}

export function Chip({ children, tone = "dim", className }) {
  const tones = {
    dim: "text-dim bg-inner border-line",
    good: "text-good bg-good/10 border-good/30",
    warn: "text-warn bg-warn/10 border-warn/30",
    bad: "text-bad bg-bad/10 border-bad/30",
    accent: "text-accent bg-accent/10 border-accent/30",
  };
  return <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold", tones[tone], className)}>{children}</span>;
}

export function Empty({ children }) {
  return <div className="rounded-lg border border-dashed border-line px-3 py-5 text-center text-sm text-dim">{children}</div>;
}

export function Stat({ label, value, hint, tone }) {
  return (
    <div className="min-w-0">
      <Label>{label}</Label>
      <div className="num mt-0.5 truncate py-0.5 text-xl font-bold leading-normal" style={tone ? { color: tone } : undefined}>
        {value}
      </div>
      {hint ? <div className="mt-0.5 truncate text-xs text-dim">{hint}</div> : null}
    </div>
  );
}

// URLs (with or without scheme) and e-mail addresses inside free text.
const LINK_RE =
  /(https?:\/\/[^\s<]+)|(\b[\w.+-]+@[\w-]+(?:\.[\w-]+)+\b)|(\b(?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)*\.(?:com|mx|dev|net|org|io|app|ai|co)(?:\.[a-z]{2})?\/[^\s<]*)/gi;

function hrefFor(raw) {
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.includes("@") && !raw.includes("/")) return "mailto:" + raw;
  return "https://" + raw;
}

/** Plain text with clickable links; keeps newlines when the parent uses whitespace-pre-line. */
export function LinkText({ text, className }) {
  if (!text) return null;
  const out = [];
  let last = 0;
  String(text).replace(LINK_RE, (m, _a, _b, _c, idx) => {
    let url = m;
    let tail = "";
    while (/[).,;:!?」』]$/.test(url)) {
      tail = url.slice(-1) + tail;
      url = url.slice(0, -1);
    }
    if (idx > last) out.push(text.slice(last, idx));
    out.push(
      <a
        key={idx}
        href={hrefFor(url)}
        target="_blank"
        rel="noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="break-all text-accent underline decoration-accent/40 underline-offset-2 hover:decoration-accent"
      >
        {url.replace(/^https?:\/\/(www\.)?/i, "")}
      </a>
    );
    if (tail) out.push(tail);
    last = idx + m.length;
    return m;
  });
  if (last < text.length) out.push(text.slice(last));
  return <span className={className}>{out}</span>;
}
