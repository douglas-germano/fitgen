"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Apple, Ban, CheckCircle2, Dumbbell, KeyRound, Loader2, Pencil, Scale, Shield, ShieldOff, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { fetchAPI } from "@/lib/api";
import { formatDateLongBRT } from "@/lib/date";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, Field, PageHeader, Panel, Pill, RolePill, StatTile, StatusPill } from "@/components/admin/kit";

interface UserDetails {
    id: string;
    name: string;
    email: string;
    role: string;
    status: string;
    subscription_expires_at: string | null;
    has_access: boolean;
    created_at: string;
    profile: { age: number; height: number; weight: number; fitness_goal: string } | null;
    activity: { workouts: number; meals_logged: number; metrics_logged: number };
}

function ActionRow({
    title,
    description,
    children,
    danger = false,
}: {
    title: string;
    description: string;
    children: React.ReactNode;
    danger?: boolean;
}) {
    return (
        <div className={`flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-md)] p-4 ${danger ? "bg-danger-soft" : "bg-background"}`}>
            <div className="min-w-0">
                <p className={`text-sm font-bold ${danger ? "text-destructive" : ""}`}>{title}</p>
                <p className="text-[13px] text-muted-foreground">{description}</p>
            </div>
            {children}
        </div>
    );
}

function UserDetailsPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const userId = searchParams.get("id") ?? "";

    const [user, setUser] = useState<UserDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);
    const [form, setForm] = useState({ name: "", email: "" });
    const [busy, setBusy] = useState(false);
    const [confirm, setConfirm] = useState<null | "delete" | "role">(null);

    const loadUser = useCallback(async () => {
        if (!userId) {
            router.replace("/admin/users");
            return;
        }
        try {
            const data = await fetchAPI(`/admin/users/${userId}`);
            setUser(data);
            setForm({ name: data.name, email: data.email });
        } catch {
            toast.error("Usuário não encontrado");
            router.push("/admin/users");
        } finally {
            setLoading(false);
        }
    }, [userId, router]);

    useEffect(() => {
        loadUser();
    }, [loadUser]);

    /** Runs an admin call, refreshes the user and reports the result. */
    const run = async (fn: () => Promise<unknown>, ok: string, fail: string) => {
        setBusy(true);
        try {
            await fn();
            await loadUser();
            toast.success(ok);
            return true;
        } catch {
            toast.error(fail);
            return false;
        } finally {
            setBusy(false);
        }
    };

    const put = (path: string, body?: object) =>
        fetchAPI(`/admin/users/${userId}${path}`, { method: "PUT", body: body ? JSON.stringify(body) : undefined });

    if (loading) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-10 w-72" />
                <Skeleton className="h-40 rounded-[var(--radius-lg)]" />
                <Skeleton className="h-64 rounded-[var(--radius-lg)]" />
            </div>
        );
    }
    if (!user) return null;

    const isAdmin = user.role === "admin";
    const suspended = user.status === "suspended";

    return (
        <>
            <PageHeader
                title="Detalhes do usuário"
                description="Dados, atividade e ações administrativas."
                back="/admin/users"
                actions={
                    editing ? (
                        <>
                            <Button variant="secondary" onClick={() => { setEditing(false); setForm({ name: user.name, email: user.email }); }}>
                                Cancelar
                            </Button>
                            <Button
                                disabled={busy}
                                onClick={async () => {
                                    if (await run(() => put("", { name: form.name, email: form.email }), "Alterações salvas", "Erro ao salvar alterações")) setEditing(false);
                                }}
                            >
                                {busy && <Loader2 className="animate-spin" />} Salvar
                            </Button>
                        </>
                    ) : (
                        <Button variant="outline" onClick={() => setEditing(true)}>
                            <Pencil /> Editar
                        </Button>
                    )
                }
            />

            {/* Identity */}
            <section className="flex flex-wrap items-center gap-5 rounded-[var(--radius-lg)] bg-sunken p-6">
                <Avatar name={user.name} size={72} />
                <div className="min-w-0 flex-1">
                    {editing ? (
                        <div className="grid gap-4 sm:grid-cols-2">
                            <Field label="Nome">
                                <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                            </Field>
                            <Field label="E-mail">
                                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                            </Field>
                        </div>
                    ) : (
                        <>
                            <h2 className="truncate text-2xl font-bold tracking-tight">{user.name}</h2>
                            <p className="truncate text-sm text-muted-foreground">{user.email}</p>
                            <div className="mt-3 flex flex-wrap items-center gap-2">
                                <StatusPill status={user.status} />
                                <RolePill role={user.role} />
                                {user.role === "admin" ? null : user.has_access ? (
                                    <Pill tone="volt">Acesso até {user.subscription_expires_at ? new Date(user.subscription_expires_at).toLocaleDateString("pt-BR") : "—"}</Pill>
                                ) : (
                                    <Pill tone="danger">Sem acesso</Pill>
                                )}
                                <span className="text-xs text-muted-foreground">Cadastrado em {formatDateLongBRT(user.created_at)}</span>
                            </div>
                        </>
                    )}
                </div>
            </section>

            {/* Activity */}
            <div className="grid gap-4 sm:grid-cols-3">
                <StatTile label="Planos de treino" icon={Dumbbell} value={user.activity.workouts} hint="Criados pelo usuário ou pela IA" />
                <StatTile label="Refeições" icon={Apple} value={user.activity.meals_logged} hint="Registradas no diário" />
                <StatTile label="Medidas corporais" icon={Scale} value={user.activity.metrics_logged} hint="Registros de métricas" />
            </div>

            <div className="grid gap-4 xl:grid-cols-5">
                {user.profile ? (
                    <Panel title="Perfil" description="Informado no onboarding" className="xl:col-span-2">
                        <dl className="grid grid-cols-3 gap-3">
                            {[
                                ["Idade", user.profile.age, "anos"],
                                ["Altura", user.profile.height, "cm"],
                                ["Peso", user.profile.weight, "kg"],
                            ].map(([label, value, unit]) => (
                                <div key={label as string} className="rounded-[var(--radius-md)] bg-background p-3">
                                    <dt className="text-xs text-muted-foreground">{label}</dt>
                                    <dd className="mt-1 text-xl font-bold tabular">
                                        {value ?? "—"} <span className="text-xs font-medium text-muted-foreground">{unit}</span>
                                    </dd>
                                </div>
                            ))}
                            <div className="col-span-3 rounded-[var(--radius-md)] bg-background p-3">
                                <dt className="text-xs text-muted-foreground">Objetivo</dt>
                                <dd className="mt-1 font-bold capitalize">{user.profile.fitness_goal?.replace(/_/g, " ") || "—"}</dd>
                            </div>
                        </dl>
                    </Panel>
                ) : null}

                <Panel
                    title="Ações administrativas"
                    description="Permissões e status da conta"
                    className={user.profile ? "xl:col-span-3" : "xl:col-span-5"}
                >
                    <div className="space-y-3">
                        {!isAdmin ? (
                            <ActionRow
                                title="Conceder acesso"
                                description="Libera o app sem pagamento (conta de demonstração, testers, cortesia). Soma ao período atual."
                            >
                                <div className="flex flex-wrap gap-2">
                                    {[7, 30, 365].map((days) => (
                                        <Button
                                            key={days}
                                            variant="outline"
                                            size="sm"
                                            disabled={busy}
                                            onClick={() => run(() => put("/grant-access", { days }), `Acesso estendido em ${days} dias`, "Erro ao conceder acesso")}
                                        >
                                            <KeyRound /> {days === 365 ? "1 ano" : `${days} dias`}
                                        </Button>
                                    ))}
                                    {user.has_access ? (
                                        <Button
                                            variant="destructive"
                                            size="sm"
                                            disabled={busy}
                                            onClick={() => run(() => put("/grant-access", { days: 0 }), "Acesso encerrado", "Erro ao encerrar acesso")}
                                        >
                                            Encerrar
                                        </Button>
                                    ) : null}
                                </div>
                            </ActionRow>
                        ) : null}

                        {suspended ? (
                            <ActionRow title="Reativar conta" description="Devolve o acesso ao usuário.">
                                <Button disabled={busy} onClick={() => run(() => put("/activate"), "Conta reativada", "Erro ao ativar usuário")}>
                                    <CheckCircle2 /> Reativar
                                </Button>
                            </ActionRow>
                        ) : !isAdmin ? (
                            <ActionRow title="Suspender conta" description="Bloqueia o acesso; os dados são preservados.">
                                <Button variant="outline" disabled={busy} onClick={() => run(() => put("/suspend"), "Conta suspensa", "Erro ao suspender usuário")}>
                                    <Ban /> Suspender
                                </Button>
                            </ActionRow>
                        ) : null}

                        <ActionRow
                            title={isAdmin ? "Remover permissão de admin" : "Promover a administrador"}
                            description={isAdmin ? "O usuário perde acesso a este painel." : "Dá acesso total a este painel."}
                        >
                            <Button variant="outline" disabled={busy} onClick={() => setConfirm("role")}>
                                {isAdmin ? <ShieldOff /> : <Shield />} {isAdmin ? "Despromover" : "Promover"}
                            </Button>
                        </ActionRow>

                        {!isAdmin ? (
                            <ActionRow danger title="Excluir usuário" description="Remove a conta e todos os dados. Não pode ser desfeito.">
                                <Button variant="destructive" disabled={busy} onClick={() => setConfirm("delete")}>
                                    <Trash2 /> Excluir
                                </Button>
                            </ActionRow>
                        ) : null}
                    </div>
                </Panel>
            </div>

            <AlertDialog open={confirm === "delete"} onOpenChange={(o) => !o && setConfirm(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Excluir {user.name}?</AlertDialogTitle>
                        <AlertDialogDescription asChild>
                            <div className="space-y-2">
                                <p>Esta ação é irreversível. Serão apagados:</p>
                                <ul className="list-inside list-disc space-y-1">
                                    <li>{user.activity.workouts} planos de treino</li>
                                    <li>{user.activity.meals_logged} refeições registradas</li>
                                    <li>{user.activity.metrics_logged} medidas corporais</li>
                                </ul>
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={async () => {
                                setBusy(true);
                                try {
                                    await fetchAPI(`/admin/users/${userId}`, { method: "DELETE" });
                                    toast.success("Usuário excluído");
                                    router.push("/admin/users");
                                } catch {
                                    toast.error("Erro ao excluir usuário");
                                    setBusy(false);
                                }
                            }}
                        >
                            Excluir definitivamente
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={confirm === "role"} onOpenChange={(o) => !o && setConfirm(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{isAdmin ? "Remover permissão de admin?" : "Promover a administrador?"}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {isAdmin
                                ? `${user.name} deixará de ter acesso a este painel.`
                                : `${user.name} passará a ter acesso total ao painel e às ações administrativas.`}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() =>
                                run(() => put("/role", { role: isAdmin ? "user" : "admin" }), "Função atualizada", "Erro ao alterar função")
                            }
                        >
                            Confirmar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}

/** `useSearchParams` needs a Suspense boundary for the static export (Cloudflare Pages). */
export default function UserDetailsPageWrapper() {
    return (
        <Suspense fallback={<Skeleton className="h-64 rounded-[var(--radius-lg)]" />}>
            <UserDetailsPage />
        </Suspense>
    );
}
