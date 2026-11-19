/**
 * Admin UI kit — web versions of the "Volt Fit" components (TopBar, MetricTile,
 * Chip, Badge, EmptyState…) used by every admin screen.
 */
import { Link, type LinkProps } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Search, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// ---------- Page header ----------

export function PageHeader({
    title,
    description,
    back,
    actions,
}: {
    title: string;
    description?: string;
    /** Href of the parent screen — renders the round back button. */
    back?: LinkProps["to"];
    actions?: ReactNode;
}) {
    return (
        <header className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
                {back ? (
                    <Link
                        to={back}
                        aria-label="Voltar"
                        className="grid size-10 shrink-0 place-items-center rounded-full bg-chip text-foreground transition-colors hover:bg-line"
                    >
                        <ChevronLeft className="size-5" />
                    </Link>
                ) : null}
                <div className="min-w-0">
                    <h1 className="truncate text-[28px] font-bold leading-9 tracking-[-0.02em]">{title}</h1>
                    {description ? <p className="mt-0.5 text-sm text-muted-foreground">{description}</p> : null}
                </div>
            </div>
            {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
        </header>
    );
}

// ---------- Cards ----------

export function Panel({
    title,
    description,
    action,
    children,
    className,
    flush = false,
}: {
    title?: string;
    description?: string;
    action?: ReactNode;
    children: ReactNode;
    className?: string;
    /** Remove body padding (tables). */
    flush?: boolean;
}) {
    return (
        <section className={cn("rounded-[var(--radius-lg)] bg-sunken", className)}>
            {title || action ? (
                <div className="flex items-start justify-between gap-3 px-5 pt-5">
                    <div className="min-w-0">
                        {title ? <h2 className="text-base font-bold leading-6 tracking-tight">{title}</h2> : null}
                        {description ? <p className="text-[13px] text-muted-foreground">{description}</p> : null}
                    </div>
                    {action}
                </div>
            ) : null}
            <div className={cn(flush ? "pt-3" : "p-5", title || action ? (flush ? "" : "pt-4") : "")}>{children}</div>
        </section>
    );
}

export function StatTile({
    label,
    value,
    hint,
    icon: Icon,
    tone = "default",
    className,
}: {
    label: string;
    value: ReactNode;
    hint?: ReactNode;
    icon?: LucideIcon;
    tone?: "default" | "volt" | "inverse";
    className?: string;
}) {
    const tones = {
        default: { card: "bg-sunken", icon: "bg-background text-volt-ink", muted: "text-muted-foreground" },
        volt: { card: "bg-volt text-on-volt", icon: "bg-on-volt text-volt", muted: "text-on-volt/70" },
        inverse: { card: "bg-inverse text-inverse-foreground", icon: "bg-volt text-on-volt", muted: "text-inverse-foreground/65" },
    }[tone];
    return (
        <div className={cn("flex flex-col justify-between gap-4 rounded-[var(--radius-lg)] p-5", tones.card, className)}>
            <div className="flex items-center justify-between gap-3">
                <span className={cn("text-[13px] font-medium", tones.muted)}>{label}</span>
                {Icon ? (
                    <span className={cn("grid size-9 place-items-center rounded-full", tones.icon)}>
                        <Icon className="size-[18px]" strokeWidth={2} />
                    </span>
                ) : null}
            </div>
            <div>
                <div className="text-[30px] font-bold leading-none tracking-[-0.02em] tabular">{value}</div>
                {hint ? <p className={cn("mt-2 text-xs", tones.muted)}>{hint}</p> : null}
            </div>
        </div>
    );
}

// ---------- Pills ----------

type PillTone = "volt" | "neutral" | "danger" | "inverse" | "outline";

const pillTones: Record<PillTone, string> = {
    volt: "bg-volt-soft text-volt-ink",
    neutral: "bg-chip text-muted-foreground",
    danger: "bg-danger-soft text-destructive",
    inverse: "bg-inverse text-inverse-foreground",
    outline: "border border-line text-muted-foreground",
};

export function Pill({
    tone = "neutral",
    dot = false,
    children,
    className,
}: {
    tone?: PillTone;
    dot?: boolean;
    children: ReactNode;
    className?: string;
}) {
    return (
        <span
            className={cn(
                "inline-flex w-fit items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold leading-none",
                pillTones[tone],
                className,
            )}
        >
            {dot ? <span className="size-1.5 rounded-full bg-current" aria-hidden /> : null}
            {children}
        </span>
    );
}

export function StatusPill({ status }: { status: string }) {
    if (status === "active") return <Pill tone="volt" dot>Ativo</Pill>;
    if (status === "suspended") return <Pill tone="danger" dot>Suspenso</Pill>;
    return <Pill tone="neutral">{status === "free" ? "Free" : status}</Pill>;
}

export function RolePill({ role }: { role: string }) {
    return role === "admin" ? <Pill tone="inverse">Admin</Pill> : <Pill tone="neutral">Usuário</Pill>;
}

/** Segmented single-choice filter (active = inverse pill). */
export function Segmented<T extends string>({
    options,
    value,
    onChange,
    label,
}: {
    options: { value: T; label: string }[];
    value: T;
    onChange: (v: T) => void;
    label: string;
}) {
    return (
        <div role="group" aria-label={label} className="inline-flex flex-wrap gap-1 rounded-full bg-chip p-1">
            {options.map((o) => {
                const active = o.value === value;
                return (
                    <button
                        key={o.value}
                        type="button"
                        aria-pressed={active}
                        onClick={() => onChange(o.value)}
                        className={cn(
                            "h-8 rounded-full px-3.5 text-[13px] font-semibold transition-colors",
                            active ? "bg-inverse text-inverse-foreground" : "text-muted-foreground hover:text-foreground",
                        )}
                    >
                        {o.label}
                    </button>
                );
            })}
        </div>
    );
}

// ---------- Form bits ----------

export function SearchField({
    value,
    onChange,
    placeholder,
    className,
}: {
    value: string;
    onChange: (v: string) => void;
    placeholder: string;
    className?: string;
}) {
    return (
        <label className={cn("relative block", className)}>
            <span className="sr-only">{placeholder}</span>
            <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
                type="search"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="h-11 w-full rounded-full border border-transparent bg-chip pl-11 pr-4 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:bg-background"
            />
        </label>
    );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
    return (
        <div className="space-y-1.5">
            <div className="text-[13px] font-semibold">{label}</div>
            {children}
            {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
        </div>
    );
}

// ---------- Data states ----------

export function Avatar({ name, size = 36, className }: { name: string; size?: number; className?: string }) {
    const initials = (name || "?")
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((p) => p[0]?.toUpperCase())
        .join("");
    return (
        <span
            aria-hidden
            style={{ width: size, height: size, fontSize: Math.round(size * 0.38) }}
            className={cn("grid shrink-0 place-items-center rounded-full bg-volt font-bold text-on-volt", className)}
        >
            {initials}
        </span>
    );
}

export function EmptyState({
    icon: Icon,
    title,
    description,
    action,
}: {
    icon: LucideIcon;
    title: string;
    description?: string;
    action?: ReactNode;
}) {
    return (
        <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
            <span className="grid size-14 place-items-center rounded-full bg-volt-soft text-volt-ink">
                <Icon className="size-6" />
            </span>
            <div>
                <p className="text-base font-bold">{title}</p>
                {description ? <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">{description}</p> : null}
            </div>
            {action}
        </div>
    );
}

export function TableSkeleton({ rows = 6 }: { rows?: number }) {
    return (
        <div className="space-y-2 p-4" aria-busy="true" aria-label="Carregando">
            {Array.from({ length: rows }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-2xl" />
            ))}
        </div>
    );
}

export function Pager({
    page,
    pages,
    total,
    noun,
    onChange,
}: {
    page: number;
    pages: number;
    total?: number;
    noun?: string;
    onChange: (page: number) => void;
}) {
    if (pages <= 1 && !total) return null;
    return (
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <p className="text-[13px] text-muted-foreground tabular">
                {total !== undefined ? `${total} ${total === 1 && noun ? noun.replace(/s$/, "") : (noun ?? "itens")} · ` : ""}página {page} de {Math.max(pages, 1)}
            </p>
            <div className="flex gap-2">
                <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => onChange(page - 1)}>
                    <ChevronLeft /> Anterior
                </Button>
                <Button variant="secondary" size="sm" disabled={page >= pages} onClick={() => onChange(page + 1)}>
                    Próxima <ChevronRight />
                </Button>
            </div>
        </div>
    );
}
