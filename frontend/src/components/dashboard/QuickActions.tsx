
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dumbbell, Utensils, Droplets, ArrowRight, Plus } from "lucide-react";

interface QuickActionsProps {
    onOpenMealLogger: () => void;
}

export function QuickActions({ onOpenMealLogger }: QuickActionsProps) {
    return (
        <div className="grid md:grid-cols-3 gap-6 animate-fade-in-up delay-200">
            <Card className="glass-card border-l-4 border-l-primary relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <CardHeader className="relative">
                    <CardTitle className="flex items-center gap-2 text-xl">
                        <Dumbbell className="h-6 w-6 text-primary" />
                        Meus Treinos
                    </CardTitle>
                    <CardDescription>
                        Acesse seu plano atual ou gere um novo treino.
                    </CardDescription>
                </CardHeader>
                <CardContent className="relative">
                    <Link href="/workouts">
                        <Button className="w-full bg-primary/90 hover:bg-primary text-primary-foreground shadow-lg shadow-primary/20">
                            Ver Treinos <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    </Link>
                </CardContent>
            </Card>

            <Card className="glass-card border-l-4 border-l-orange-500 relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="absolute top-0 right-0 p-3 opacity-5 pointer-events-none group-hover:opacity-10 transition-opacity duration-500">
                    <Utensils className="w-32 h-32 -mr-8 -mt-8" />
                </div>
                <CardHeader className="relative">
                    <CardTitle className="flex items-center gap-2 text-xl">
                        <Utensils className="h-6 w-6 text-orange-500" />
                        Dieta & Nutrição
                    </CardTitle>
                    <CardDescription>
                        Registre suas refeições rapidamente.
                    </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3 relative">
                    <Button onClick={onOpenMealLogger} className="w-full bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 border-0 text-white shadow-lg shadow-orange-500/20">
                        <Plus className="mr-2 h-4 w-4" />
                        Registrar Refeição
                    </Button>
                    <Link href="/diet">
                        <Button variant="ghost" className="w-full hover:bg-orange-500/10 hover:text-orange-500">
                            Acessar Dieta Completa <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    </Link>
                </CardContent>
            </Card>

            <Card className="glass-card border-l-4 border-l-blue-500 relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="absolute top-0 right-0 p-3 opacity-5 pointer-events-none group-hover:opacity-10 transition-opacity duration-500">
                    <Droplets className="w-32 h-32 -mr-8 -mt-8" />
                </div>
                <CardHeader className="relative">
                    <CardTitle className="flex items-center gap-2 text-xl">
                        <Droplets className="h-6 w-6 text-blue-500" />
                        Hidratação
                    </CardTitle>
                    <CardDescription>
                        Acompanhe seu consumo diário de água.
                    </CardDescription>
                </CardHeader>
                <CardContent className="relative">
                    <Link href="/hydration">
                        <Button className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white shadow-lg shadow-blue-500/20">
                            Ver Hidratação <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                    </Link>
                </CardContent>
            </Card>
        </div>
    );
}
