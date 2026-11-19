import { useCallback, useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronDown, Download, SlidersHorizontal, Users } from "lucide-react";
import { toast } from "sonner";
import { fetchAPI, getToken } from "@/lib/api";
import { formatDateOnlyBRT } from "@/lib/date";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
    Avatar,
    EmptyState,
    Field,
    PageHeader,
    Pager,
    RolePill,
    SearchField,
    Segmented,
    StatusPill,
    TableSkeleton,
} from "@admin/kit";
import { cn } from "@/lib/utils";

interface User {
    id: string;
    name: string;
    email: string;
    role: string;
    status: string;
    created_at: string;
    last_login: string | null;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://dev-api.fitgen.pro/api";

export const Route = createFileRoute("/admin/users/")({ component: UsersPage });

function UsersPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [pages, setPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");
    const [role, setRole] = useState<"all" | "user" | "admin">("all");
    const [status, setStatus] = useState<"all" | "active" | "free" | "suspended">("all");
    const [showDates, setShowDates] = useState(false);
    const [dates, setDates] = useState({ created_after: "", created_before: "", last_login_after: "", last_login_before: "" });

    const query = useCallback(() => {
        const p = new URLSearchParams();
        if (search) p.set("search", search);
        if (role !== "all") p.set("role", role);
        if (status !== "all") p.set("status", status);
        Object.entries(dates).forEach(([k, v]) => v && p.set(k, v));
        return p;
    }, [search, role, status, dates]);

    // Any filter change goes back to the first page.
    useEffect(() => setPage(1), [search, role, status, dates]);

    useEffect(() => {
        const timer = setTimeout(async () => {
            setLoading(true);
            try {
                const p = query();
                p.set("page", String(page));
                p.set("per_page", "10");
                const data = await fetchAPI(`/admin/users?${p}`);
                setUsers(data.users);
                setPages(data.pages);
                setTotal(data.total);
            } catch {
                toast.error("Erro ao carregar usuários");
            } finally {
                setLoading(false);
            }
        }, 350);
        return () => clearTimeout(timer);
    }, [query, page]);

    const exportCsv = async () => {
        try {
            const p = query();
            p.set("export", "true");
            const res = await fetch(`${API_URL}/admin/users?${p}`, { headers: { Authorization: `Bearer ${getToken()}` } });
            if (!res.ok) throw new Error();
            const url = URL.createObjectURL(await res.blob());
            const a = document.createElement("a");
            a.href = url;
            a.download = "usuarios.csv";
            a.click();
            URL.revokeObjectURL(url);
        } catch {
            toast.error("Falha ao exportar CSV");
        }
    };

    const dateFields: { key: keyof typeof dates; label: string }[] = [
        { key: "created_after", label: "Cadastro depois de" },
        { key: "created_before", label: "Cadastro antes de" },
        { key: "last_login_after", label: "Último login depois de" },
        { key: "last_login_before", label: "Último login antes de" },
    ];

    return (
        <>
            <PageHeader
                title="Usuários"
                description="Todas as contas do FitGen."
                actions={
                    <Button variant="outline" onClick={exportCsv}>
                        <Download /> Exportar CSV
                    </Button>
                }
            />

            <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-3">
                    <SearchField value={search} onChange={setSearch} placeholder="Buscar por nome ou e-mail" className="min-w-[240px] flex-1" />
                    <Segmented
                        label="Função"
                        value={role}
                        onChange={setRole}
                        options={[
                            { value: "all", label: "Todos" },
                            { value: "user", label: "Usuários" },
                            { value: "admin", label: "Admins" },
                        ]}
                    />
                    <Button variant="secondary" onClick={() => setShowDates((v) => !v)} aria-expanded={showDates}>
                        <SlidersHorizontal /> Datas
                        <ChevronDown className={cn("transition-transform", showDates && "rotate-180")} />
                    </Button>
                </div>
                <Segmented
                    label="Status"
                    value={status}
                    onChange={setStatus}
                    options={[
                        { value: "all", label: "Qualquer status" },
                        { value: "active", label: "Ativos" },
                        { value: "free", label: "Free" },
                        { value: "suspended", label: "Suspensos" },
                    ]}
                />
                {showDates ? (
                    <div className="grid gap-4 rounded-[var(--radius-lg)] bg-sunken p-5 sm:grid-cols-2 lg:grid-cols-4">
                        {dateFields.map((f) => (
                            <Field key={f.key} label={f.label}>
                                <Input type="date" value={dates[f.key]} onChange={(e) => setDates({ ...dates, [f.key]: e.target.value })} />
                            </Field>
                        ))}
                    </div>
                ) : null}
            </div>

            <div className="overflow-hidden rounded-[var(--radius-lg)] bg-sunken">
                {loading ? (
                    <TableSkeleton />
                ) : users.length === 0 ? (
                    <EmptyState icon={Users} title="Nenhum usuário encontrado" description="Ajuste a busca ou os filtros para ver resultados." />
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow className="hover:bg-transparent">
                                <TableHead>Usuário</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Função</TableHead>
                                <TableHead>Cadastro</TableHead>
                                <TableHead>Último login</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {users.map((u) => (
                                <TableRow key={u.id} className="group relative">
                                    <TableCell>
                                        <Link
                                            to="/admin/users/detail"
                                            search={{ id: String(u.id) }}
                                            className="flex items-center gap-3 outline-offset-2 after:absolute after:inset-0"
                                        >
                                            <Avatar name={u.name} />
                                            <span className="flex min-w-0 flex-col">
                                                <span className="truncate font-semibold">{u.name}</span>
                                                <span className="truncate text-xs text-muted-foreground">{u.email}</span>
                                            </span>
                                        </Link>
                                    </TableCell>
                                    <TableCell><StatusPill status={u.status} /></TableCell>
                                    <TableCell><RolePill role={u.role} /></TableCell>
                                    <TableCell className="text-muted-foreground tabular">{formatDateOnlyBRT(u.created_at)}</TableCell>
                                    <TableCell className="text-muted-foreground tabular">
                                        {u.last_login ? formatDateOnlyBRT(u.last_login) : "Nunca"}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
                {!loading && users.length > 0 ? <Pager page={page} pages={pages} total={total} noun="usuários" onChange={setPage} /> : null}
            </div>
        </>
    );
}
