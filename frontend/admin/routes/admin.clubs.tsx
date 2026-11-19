import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import {
    Copy,
    Crown,
    Eye,
    EyeOff,
    Flag,
    Globe,
    ImageOff,
    Loader2,
    Lock,
    MessageSquare,
    RefreshCw,
    Trash2,
    UserMinus,
    Users,
    UsersRound,
} from "lucide-react";
import { toast } from "sonner";
import { fetchAPI } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, EmptyState, Field, PageHeader, Pager, Pill, SearchField, Segmented, StatTile, TableSkeleton } from "@admin/kit";
import { cn } from "@/lib/utils";

interface Person {
    id: string;
    name: string;
    email: string;
}

interface Club {
    id: string;
    name: string;
    description: string | null;
    is_public: boolean;
    has_photo: boolean;
    member_count: number;
    admin_count: number;
    post_count: number;
    owner: Person | null;
    created_at: string | null;
    last_activity_at: string | null;
}

interface ClubDetail extends Club {
    invite_code: string;
    members: Array<Person & { role: "admin" | "member"; joined_at: string | null }>;
    posts: Array<{
        id: string;
        type: string;
        text: string | null;
        has_image: boolean;
        status: "visible" | "hidden";
        open_reports: number;
        author: Person | null;
        created_at: string | null;
    }>;
}

interface Stats {
    total: number;
    public: number;
    memberships: number;
    new_this_week: number;
}

type Visibility = "all" | "public" | "private";
type Sort = "recent" | "members" | "activity";

const POST_TYPES: Record<string, string> = {
    post: "Publicação",
    workout_completed: "Treino concluído",
    streak: "Sequência",
    achievement: "Conquista",
    challenge_completed: "Desafio",
};

const fmtDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("pt-BR") : "—");
const fmtDateTime = (iso: string | null) =>
    iso ? new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "—";

function VisibilityPill({ isPublic }: { isPublic: boolean }) {
    return isPublic ? (
        <Pill tone="volt"><Globe className="size-3" /> Público</Pill>
    ) : (
        <Pill tone="neutral"><Lock className="size-3" /> Privado</Pill>
    );
}

type Confirm = { title: string; description: string; action: string; run: () => Promise<void> };

export const Route = createFileRoute("/admin/clubs")({ component: AdminClubsPage });

function AdminClubsPage() {
    const [clubs, setClubs] = useState<Club[]>([]);
    const [stats, setStats] = useState<Stats | null>(null);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [pages, setPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [search, setSearch] = useState("");
    const [visibility, setVisibility] = useState<Visibility>("all");
    const [sort, setSort] = useState<Sort>("recent");

    const [openId, setOpenId] = useState<string | null>(null);
    const [detail, setDetail] = useState<ClubDetail | null>(null);
    const [photo, setPhoto] = useState<string | null>(null);
    const [form, setForm] = useState({ name: "", description: "" });
    const [busy, setBusy] = useState<string | null>(null);
    const [confirm, setConfirm] = useState<Confirm | null>(null);

    const load = useCallback(async () => {
        setLoading(true);
        try {
            const p = new URLSearchParams({ page: String(page), per_page: "10", visibility, sort });
            if (search.trim()) p.set("search", search.trim());
            const data = await fetchAPI(`/admin/clubs?${p}`);
            setClubs(data.clubs || []);
            setStats(data.stats || null);
            setPages(data.pages || 1);
            setTotal(data.total || 0);
        } catch {
            toast.error("Erro ao carregar clubes");
        } finally {
            setLoading(false);
        }
    }, [page, visibility, sort, search]);

    useEffect(() => {
        const timer = setTimeout(load, search ? 300 : 0);
        return () => clearTimeout(timer);
    }, [load, search]);

    useEffect(() => setPage(1), [search, visibility, sort]);

    const loadDetail = useCallback(async (id: string) => {
        try {
            const data: ClubDetail = await fetchAPI(`/admin/clubs/${id}`);
            setDetail(data);
            setForm({ name: data.name, description: data.description || "" });
            if (data.has_photo) {
                fetchAPI(`/admin/clubs/${id}/photo`)
                    .then((p) => setPhoto(p?.url || p?.data_uri || null))
                    .catch(() => setPhoto(null));
            } else {
                setPhoto(null);
            }
        } catch {
            toast.error("Erro ao carregar o clube");
            setOpenId(null);
        }
    }, []);

    function open(id: string) {
        setDetail(null);
        setPhoto(null);
        setOpenId(id);
        loadDetail(id);
    }

    async function act(key: string, fn: () => Promise<{ msg?: string } | null>, reloadList = true) {
        setBusy(key);
        try {
            const res = await fn();
            if (res?.msg) toast.success(res.msg);
            if (openId) await loadDetail(openId);
            if (reloadList) load();
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Não foi possível concluir");
        } finally {
            setBusy(null);
        }
    }

    const save = () =>
        detail &&
        act("save", () =>
            fetchAPI(`/admin/clubs/${detail.id}`, {
                method: "PUT",
                body: JSON.stringify({ name: form.name, description: form.description }),
            }),
        );

    const setPublic = (isPublic: boolean) =>
        detail &&
        act("visibility", () =>
            fetchAPI(`/admin/clubs/${detail.id}`, { method: "PUT", body: JSON.stringify({ is_public: isPublic }) }),
        );

    const rotateCode = () =>
        detail &&
        act("code", async () => {
            await fetchAPI(`/admin/clubs/${detail.id}/invite-code`, { method: "POST" });
            return { msg: "Novo código gerado. O antigo parou de funcionar." };
        }, false);

    const setRole = (userId: string, role: "admin" | "member") =>
        detail &&
        act(`role:${userId}`, () =>
            fetchAPI(`/admin/clubs/${detail.id}/members/${userId}/role`, { method: "PUT", body: JSON.stringify({ role }) }),
        );

    const setPostStatus = (postId: string, status: "visible" | "hidden") =>
        detail &&
        act(`post:${postId}`, () =>
            fetchAPI(`/admin/clubs/${detail.id}/posts/${postId}`, { method: "PUT", body: JSON.stringify({ status }) }),
        false);

    async function runConfirm() {
        if (!confirm) return;
        setBusy("confirm");
        try {
            await confirm.run();
            setConfirm(null);
        } catch (e) {
            toast.error(e instanceof Error ? e.message : "Não foi possível concluir");
        } finally {
            setBusy(null);
        }
    }

    const dirty = !!detail && (form.name.trim() !== detail.name || form.description.trim() !== (detail.description || ""));

    return (
        <>
            <PageHeader title="Clubes" description="Grupos da comunidade: membros, publicações e moderação." />

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <StatTile label="Clubes" value={stats?.total ?? "—"} icon={UsersRound} tone="inverse" />
                <StatTile label="Públicos" value={stats?.public ?? "—"} icon={Globe} />
                <StatTile label="Participações" value={stats?.memberships ?? "—"} hint="Soma de membros em todos os clubes" icon={Users} />
                <StatTile label="Novos na semana" value={stats?.new_this_week ?? "—"} icon={RefreshCw} />
            </div>

            <div className="flex flex-wrap items-center gap-3">
                <SearchField value={search} onChange={setSearch} placeholder="Buscar por nome, dono ou código" className="min-w-[240px] flex-1" />
                <Segmented
                    label="Visibilidade"
                    value={visibility}
                    onChange={setVisibility}
                    options={[
                        { value: "all", label: "Todos" },
                        { value: "public", label: "Públicos" },
                        { value: "private", label: "Privados" },
                    ]}
                />
                <Segmented
                    label="Ordenar"
                    value={sort}
                    onChange={setSort}
                    options={[
                        { value: "recent", label: "Recentes" },
                        { value: "members", label: "Mais membros" },
                        { value: "activity", label: "Mais ativos" },
                    ]}
                />
            </div>

            <div className="overflow-hidden rounded-[var(--radius-lg)] bg-sunken">
                {loading && clubs.length === 0 ? (
                    <TableSkeleton />
                ) : clubs.length === 0 ? (
                    <EmptyState icon={UsersRound} title="Nenhum clube encontrado" description="Quando os usuários criarem clubes, eles aparecem aqui." />
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow className="hover:bg-transparent">
                                <TableHead>Clube</TableHead>
                                <TableHead>Dono</TableHead>
                                <TableHead>Membros</TableHead>
                                <TableHead>Publicações</TableHead>
                                <TableHead>Última atividade</TableHead>
                                <TableHead>Criado</TableHead>
                                <TableHead className="text-right">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody className={cn(loading && "opacity-60")}>
                            {clubs.map((c) => (
                                <TableRow key={c.id} className="cursor-pointer" onClick={() => open(c.id)}>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <Avatar name={c.name} />
                                            <div className="min-w-0 max-w-[260px]">
                                                <div className="flex items-center gap-2">
                                                    <p className="truncate font-semibold">{c.name}</p>
                                                    <VisibilityPill isPublic={c.is_public} />
                                                </div>
                                                {c.description ? <p className="truncate text-xs text-muted-foreground">{c.description}</p> : null}
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        {c.owner ? (
                                            <div className="min-w-0">
                                                <p className="truncate font-medium">{c.owner.name}</p>
                                                <p className="truncate text-xs text-muted-foreground">{c.owner.email}</p>
                                            </div>
                                        ) : "—"}
                                    </TableCell>
                                    <TableCell className="tabular">{c.member_count}</TableCell>
                                    <TableCell className="tabular">{c.post_count}</TableCell>
                                    <TableCell className="text-muted-foreground tabular">{fmtDate(c.last_activity_at)}</TableCell>
                                    <TableCell className="text-muted-foreground tabular">{fmtDate(c.created_at)}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                                            <Button variant="ghost" size="icon-sm" onClick={() => open(c.id)} aria-label={`Abrir ${c.name}`}>
                                                <Eye />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon-sm"
                                                className="text-destructive hover:bg-danger-soft"
                                                aria-label={`Excluir ${c.name}`}
                                                onClick={() =>
                                                    setConfirm({
                                                        title: "Excluir clube?",
                                                        description: `“${c.name}” e todas as suas publicações e desafios serão apagados para os ${c.member_count} membros. Esta ação não pode ser desfeita.`,
                                                        action: "Excluir clube",
                                                        run: async () => {
                                                            await fetchAPI(`/admin/clubs/${c.id}`, { method: "DELETE" });
                                                            toast.success("Clube excluído");
                                                            load();
                                                        },
                                                    })
                                                }
                                            >
                                                <Trash2 />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
                {clubs.length > 0 ? <Pager page={page} pages={pages} total={total} noun="clubes" onChange={setPage} /> : null}
            </div>

            <Sheet open={!!openId} onOpenChange={(o) => !o && setOpenId(null)}>
                <SheetContent className="w-full gap-0 overflow-y-auto p-0 sm:max-w-xl">
                    <SheetHeader className="border-b border-line p-6">
                        <div className="flex items-center gap-4 pr-6">
                            {photo ? (
                                <img src={photo} alt="" className="size-14 shrink-0 rounded-full object-cover" />
                            ) : (
                                <Avatar name={detail?.name ?? "?"} size={56} />
                            )}
                            <div className="min-w-0">
                                <SheetTitle className="truncate text-xl font-bold tracking-tight">{detail?.name ?? "Carregando…"}</SheetTitle>
                                <SheetDescription>
                                    {detail ? `${detail.member_count} ${detail.member_count === 1 ? "membro" : "membros"} · criado em ${fmtDate(detail.created_at)}` : " "}
                                </SheetDescription>
                            </div>
                        </div>
                    </SheetHeader>

                    {!detail ? (
                        <div className="flex justify-center py-16">
                            <Loader2 className="size-6 animate-spin text-volt-ink" />
                        </div>
                    ) : (
                        <div className="space-y-8 p-6">
                            <section className="space-y-4">
                                <h3 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">Dados do clube</h3>
                                <Field label="Nome">
                                    <Input value={form.name} maxLength={60} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                                </Field>
                                <Field label="Descrição">
                                    <Textarea value={form.description} maxLength={280} rows={3} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                                </Field>
                                <div className="flex justify-end">
                                    <Button size="sm" disabled={!dirty || form.name.trim().length < 2 || busy === "save"} onClick={save}>
                                        {busy === "save" ? <Loader2 className="animate-spin" /> : null} Salvar alterações
                                    </Button>
                                </div>

                                <div className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-md)] bg-sunken p-4">
                                    <div>
                                        <p className="font-semibold">Visibilidade</p>
                                        <p className="text-xs text-muted-foreground">
                                            {detail.is_public ? "Aparece na busca e qualquer pessoa pode entrar." : "Só entra quem tem o código de convite."}
                                        </p>
                                    </div>
                                    <Segmented
                                        label="Visibilidade do clube"
                                        value={detail.is_public ? "public" : "private"}
                                        onChange={(v) => v !== (detail.is_public ? "public" : "private") && setPublic(v === "public")}
                                        options={[
                                            { value: "public", label: "Público" },
                                            { value: "private", label: "Privado" },
                                        ]}
                                    />
                                </div>

                                <div className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-md)] bg-sunken p-4">
                                    <div>
                                        <p className="font-semibold">Código de convite</p>
                                        <p className="font-mono text-lg tracking-widest">{detail.invite_code}</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            onClick={() => navigator.clipboard.writeText(detail.invite_code).then(() => toast.success("Código copiado"))}
                                        >
                                            <Copy /> Copiar
                                        </Button>
                                        <Button variant="secondary" size="sm" disabled={busy === "code"} onClick={rotateCode}>
                                            <RefreshCw className={busy === "code" ? "animate-spin" : ""} /> Gerar novo
                                        </Button>
                                    </div>
                                </div>

                                {detail.has_photo ? (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() =>
                                            setConfirm({
                                                title: "Remover a foto do clube?",
                                                description: "A foto será apagada e o clube volta a mostrar as iniciais.",
                                                action: "Remover foto",
                                                run: () => act("photo", () => fetchAPI(`/admin/clubs/${detail.id}/photo`, { method: "DELETE" })),
                                            })
                                        }
                                    >
                                        <ImageOff /> Remover foto
                                    </Button>
                                ) : null}
                            </section>

                            <section className="space-y-3">
                                <h3 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
                                    Membros ({detail.member_count})
                                </h3>
                                <ul className="divide-y divide-line overflow-hidden rounded-[var(--radius-md)] bg-sunken">
                                    {detail.members.map((m) => {
                                        const lastAdmin = m.role === "admin" && detail.admin_count <= 1;
                                        return (
                                            <li key={m.id} className="flex items-center gap-3 p-3">
                                                <Avatar name={m.name} size={32} />
                                                <div className="min-w-0 flex-1">
                                                    <div className="flex items-center gap-2">
                                                        <p className="truncate font-semibold">{m.name}</p>
                                                        {m.role === "admin" ? <Pill tone="inverse"><Crown className="size-3" /> Admin</Pill> : null}
                                                        {detail.owner?.id === m.id ? <Pill tone="outline">Dono</Pill> : null}
                                                    </div>
                                                    <p className="truncate text-xs text-muted-foreground">
                                                        {m.email} · entrou em {fmtDate(m.joined_at)}
                                                    </p>
                                                </div>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    disabled={lastAdmin || busy === `role:${m.id}`}
                                                    title={lastAdmin ? "O clube precisa de pelo menos um administrador" : undefined}
                                                    onClick={() => setRole(m.id, m.role === "admin" ? "member" : "admin")}
                                                >
                                                    {busy === `role:${m.id}` ? <Loader2 className="animate-spin" /> : null}
                                                    {m.role === "admin" ? "Tirar admin" : "Tornar admin"}
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon-sm"
                                                    className="text-destructive hover:bg-danger-soft"
                                                    disabled={detail.member_count <= 1}
                                                    aria-label={`Remover ${m.name}`}
                                                    onClick={() =>
                                                        setConfirm({
                                                            title: `Remover ${m.name}?`,
                                                            description:
                                                                lastAdmin
                                                                    ? "É o único administrador: o membro mais antigo vira administrador."
                                                                    : "A pessoa sai do clube e pode voltar com um código de convite.",
                                                            action: "Remover",
                                                            run: () => act(`remove:${m.id}`, () => fetchAPI(`/admin/clubs/${detail.id}/members/${m.id}`, { method: "DELETE" })),
                                                        })
                                                    }
                                                >
                                                    <UserMinus />
                                                </Button>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </section>

                            <section className="space-y-3">
                                <h3 className="text-sm font-bold uppercase tracking-wide text-muted-foreground">
                                    Publicações recentes ({detail.post_count})
                                </h3>
                                {detail.posts.length === 0 ? (
                                    <div className="rounded-[var(--radius-md)] bg-sunken p-6 text-center text-sm text-muted-foreground">
                                        <MessageSquare className="mx-auto mb-2 size-5" /> Nenhuma publicação ainda.
                                    </div>
                                ) : (
                                    <ul className="space-y-2">
                                        {detail.posts.map((p) => (
                                            <li key={p.id} className={cn("rounded-[var(--radius-md)] bg-sunken p-3", p.status === "hidden" && "opacity-60")}>
                                                <div className="flex items-start gap-3">
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex flex-wrap items-center gap-2">
                                                            <p className="text-sm font-semibold">{p.author?.name ?? "Usuário"}</p>
                                                            <Pill tone="outline">{POST_TYPES[p.type] ?? p.type}</Pill>
                                                            {p.status === "hidden" ? <Pill tone="danger">Oculta</Pill> : null}
                                                            {p.open_reports > 0 ? (
                                                                <Pill tone="danger"><Flag className="size-3" /> {p.open_reports} {p.open_reports === 1 ? "denúncia" : "denúncias"}</Pill>
                                                            ) : null}
                                                        </div>
                                                        {p.text ? <p className="mt-1 whitespace-pre-wrap break-words text-sm">{p.text}</p> : null}
                                                        <p className="mt-1 text-xs text-muted-foreground">
                                                            {fmtDateTime(p.created_at)}
                                                            {p.has_image ? " · com foto" : ""}
                                                        </p>
                                                    </div>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        disabled={busy === `post:${p.id}`}
                                                        onClick={() => setPostStatus(p.id, p.status === "hidden" ? "visible" : "hidden")}
                                                    >
                                                        {busy === `post:${p.id}` ? <Loader2 className="animate-spin" /> : p.status === "hidden" ? <Eye /> : <EyeOff />}
                                                        {p.status === "hidden" ? "Mostrar" : "Ocultar"}
                                                    </Button>
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </section>

                            <section className="rounded-[var(--radius-md)] border border-danger-soft p-4">
                                <p className="font-semibold">Excluir clube</p>
                                <p className="mt-1 text-xs text-muted-foreground">Apaga o clube, as publicações, os desafios e a foto para todos os membros.</p>
                                <Button
                                    variant="destructive"
                                    size="sm"
                                    className="mt-3"
                                    onClick={() =>
                                        setConfirm({
                                            title: "Excluir clube?",
                                            description: `“${detail.name}” será apagado para os ${detail.member_count} membros. Esta ação não pode ser desfeita.`,
                                            action: "Excluir clube",
                                            run: async () => {
                                                await fetchAPI(`/admin/clubs/${detail.id}`, { method: "DELETE" });
                                                toast.success("Clube excluído");
                                                setOpenId(null);
                                                load();
                                            },
                                        })
                                    }
                                >
                                    <Trash2 /> Excluir clube
                                </Button>
                            </section>
                        </div>
                    )}
                </SheetContent>
            </Sheet>

            <AlertDialog open={!!confirm} onOpenChange={(o) => !o && busy !== "confirm" && setConfirm(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{confirm?.title}</AlertDialogTitle>
                        <AlertDialogDescription>{confirm?.description}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={busy === "confirm"}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => {
                                e.preventDefault();
                                runConfirm();
                            }}
                            disabled={busy === "confirm"}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {busy === "confirm" ? <Loader2 className="animate-spin" /> : confirm?.action}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
