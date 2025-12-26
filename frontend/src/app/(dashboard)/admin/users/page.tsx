"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { formatDateOnlyBRT } from "@/lib/date";
import { fetchAPI } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, Filter, ChevronLeft, ChevronRight, UserCircle, Shield, ArrowRight } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface User {
    id: string;
    name: string;
    email: string;
    role: string;
    status: string;
    created_at: string;
    last_login: string | null;
}

interface Pagination {
    total: number;
    pages: number;
    current_page: number;
    per_page: number;
}

export default function UsersPage() {
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [pagination, setPagination] = useState<Pagination | null>(null);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");
    const [roleFilter, setRoleFilter] = useState("all");
    const [statusFilter, setStatusFilter] = useState("all");

    // Date filters
    const [createdAfter, setCreatedAfter] = useState("");
    const [createdBefore, setCreatedBefore] = useState("");
    const [lastLoginAfter, setLastLoginAfter] = useState("");
    const [lastLoginBefore, setLastLoginBefore] = useState("");

    // Debounce search and filters
    useEffect(() => {
        const timer = setTimeout(() => {
            loadUsers();
        }, 500);
        return () => clearTimeout(timer);
    }, [search, page, roleFilter, statusFilter, createdAfter, createdBefore, lastLoginAfter, lastLoginBefore]);

    async function loadUsers() {
        setLoading(true);
        try {
            let url = `/admin/users?page=${page}&per_page=10`;
            if (search) url += `&search=${search}`;
            if (roleFilter !== "all") url += `&role=${roleFilter}`;
            if (statusFilter !== "all") url += `&status=${statusFilter}`;
            if (createdAfter) url += `&created_after=${createdAfter}`;
            if (createdBefore) url += `&created_before=${createdBefore}`;
            if (lastLoginAfter) url += `&last_login_after=${lastLoginAfter}`;
            if (lastLoginBefore) url += `&last_login_before=${lastLoginBefore}`;

            const data = await fetchAPI(url);
            setUsers(data.users);
            setPagination({
                total: data.total,
                pages: data.pages,
                current_page: data.current_page,
                per_page: data.per_page
            });
        } catch (e) {
            console.error("Failed to load users", e);
        } finally {
            setLoading(false);
        }
    }

    const handleExportCSV = async () => {
        try {
            let url = `/admin/users?export=true`;
            if (search) url += `&search=${search}`;
            if (roleFilter !== "all") url += `&role=${roleFilter}`;
            if (statusFilter !== "all") url += `&status=${statusFilter}`;
            if (createdAfter) url += `&created_after=${createdAfter}`;
            if (createdBefore) url += `&created_before=${createdBefore}`;
            if (lastLoginAfter) url += `&last_login_after=${lastLoginAfter}`;
            if (lastLoginBefore) url += `&last_login_before=${lastLoginBefore}`;

            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://fitgen.suacozinha.site/api'}${url}`, {
                headers: {
                    "Authorization": `Bearer ${localStorage.getItem('fitgen_token')}`
                }
            });

            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = downloadUrl;
            a.download = 'users_export.csv';
            document.body.appendChild(a);
            a.click();
            a.remove();
        } catch (error) {
            console.error("Failed to export CSV:", error);
        }
    };

    const getRoleBadge = (role: string) => {
        if (role === "admin") {
            return <Badge className="bg-purple-500"><Shield className="h-3 w-3 mr-1" /> Admin</Badge>;
        }
        return <Badge variant="outline">Usuário</Badge>;
    };

    const getStatusBadge = (status: string) => {
        if (status === "active") {
            return <Badge className="bg-green-500">Ativo</Badge>;
        }
        if (status === "suspended") {
            return <Badge variant="destructive">Suspenso</Badge>;
        }
        return <Badge variant="secondary">Free</Badge>;
    };

    return (
        <div className="space-y-6 p-6 animate-fade-in-up">
            <div>
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Gerenciamento de Usuários</h1>
                        <p className="text-muted-foreground">Visualize e gerencie todos os usuários do sistema.</p>
                    </div>
                    <div className="flex gap-2">
                        <Button onClick={handleExportCSV} variant="outline" className="border-primary/20">
                            <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            Export CSV
                        </Button>
                        <Link href="/admin">
                            <Button variant="ghost" size="icon">
                                <ChevronLeft className="h-6 w-6" />
                            </Button>
                        </Link>
                    </div>
                </div>
            </div>

            <Card className="glass-card shadow-lg shadow-primary/5 animate-fade-in-up delay-100">
                <CardHeader>
                    <CardTitle className="text-primary/80">Filtros</CardTitle>
                    <CardDescription>Refine sua busca por nome, email, função ou status.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="relative md:col-span-4 lg:col-span-2">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar por nome ou email..."
                                className="pl-8 bg-background/50 border-white/10 focus-visible:ring-primary/20"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                        <Select value={roleFilter} onValueChange={setRoleFilter}>
                            <SelectTrigger className="bg-background/50 border-white/10">
                                <SelectValue placeholder="Função" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todas as Funções</SelectItem>
                                <SelectItem value="user">Usuário</SelectItem>
                                <SelectItem value="admin">Administrador</SelectItem>
                            </SelectContent>
                        </Select>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="bg-background/50 border-white/10">
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos os Status</SelectItem>
                                <SelectItem value="active">Ativo</SelectItem>
                                <SelectItem value="free">Free</SelectItem>
                                <SelectItem value="suspended">Suspenso</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Date Filters */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        <div className="space-y-2">
                            <label className="text-xs text-muted-foreground">Cadastro Após</label>
                            <Input
                                type="date"
                                className="bg-background/50 border-white/10"
                                value={createdAfter}
                                onChange={(e) => setCreatedAfter(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs text-muted-foreground">Cadastro Antes</label>
                            <Input
                                type="date"
                                className="bg-background/50 border-white/10"
                                value={createdBefore}
                                onChange={(e) => setCreatedBefore(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs text-muted-foreground">Último Login Após</label>
                            <Input
                                type="date"
                                className="bg-background/50 border-white/10"
                                value={lastLoginAfter}
                                onChange={(e) => setLastLoginAfter(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs text-muted-foreground">Último Login Antes</label>
                            <Input
                                type="date"
                                className="bg-background/50 border-white/10"
                                value={lastLoginBefore}
                                onChange={(e) => setLastLoginBefore(e.target.value)}
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card className="glass-card animate-fade-in-up delay-200">
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="hover:bg-white/5 border-white/10">
                                <TableHead>Usuário</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Função</TableHead>
                                <TableHead>Cadastro</TableHead>
                                <TableHead>Último Login</TableHead>
                                <TableHead className="text-right">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-24 text-center">
                                        <div className="flex justify-center">
                                            <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : users.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                                        Nenhum usuário encontrado.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                users.map((user) => (
                                    <TableRow key={user.id} className="hover:bg-white/5 border-white/10 transition-colors">
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                                                    <UserCircle className="h-6 w-6 text-primary" />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-foreground/90">{user.name}</span>
                                                    <span className="text-xs text-muted-foreground">{user.email}</span>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>{getStatusBadge(user.status)}</TableCell>
                                        <TableCell>{getRoleBadge(user.role)}</TableCell>
                                        <TableCell>
                                            {formatDateOnlyBRT(user.created_at)}
                                        </TableCell>
                                        <TableCell>
                                            {user.last_login ? formatDateOnlyBRT(user.last_login) : <span className="text-muted-foreground text-xs">Nunca</span>}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Link href={`/admin/users/${user.id}`}>
                                                <Button variant="ghost" size="sm" className="hover:bg-primary/20 hover:text-primary">
                                                    Detalhes <ArrowRight className="ml-2 h-4 w-4" />
                                                </Button>
                                            </Link>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Pagination */}
            {pagination && pagination.pages > 1 && (
                <div className="flex items-center justify-between animate-fade-in-up delay-300">
                    <p className="text-sm text-muted-foreground">
                        Página {pagination.current_page} de {pagination.pages}
                    </p>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1 || loading}
                            className="bg-background/50 border-white/10 hover:bg-primary/10"
                        >
                            <ChevronLeft className="h-4 w-4 mr-2" /> Anterior
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}
                            disabled={page === pagination.pages || loading}
                            className="bg-background/50 border-white/10 hover:bg-primary/10"
                        >
                            Próximo <ChevronRight className="h-4 w-4 ml-2" />
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
