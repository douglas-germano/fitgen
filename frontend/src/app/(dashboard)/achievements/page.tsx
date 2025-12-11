"use client"

import { useEffect, useState } from "react"
import { formatDateOnlyBRT } from "@/lib/date"
import { motion } from "framer-motion"
import { Award, Flame, Zap, Droplet, Dumbbell, Apple, Trophy } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Achievement, GamificationProgress, UserStreaks, gamificationService } from "@/services/gamification"

export default function AchievementsPage() {
    const [progress, setProgress] = useState<GamificationProgress | null>(null)
    const [streaks, setStreaks] = useState<UserStreaks | null>(null)
    const [achievements, setAchievements] = useState<Achievement[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const loadData = async () => {
            try {
                const [progData, streakData, achData] = await Promise.all([
                    gamificationService.getProgress(),
                    gamificationService.getStreaks(),
                    gamificationService.getAchievements()
                ])
                setProgress(progData)
                setStreaks(streakData)
                setAchievements(achData)
            } catch (error) {
                console.error("Failed to load gamification data", error)
            } finally {
                setLoading(false)
            }
        }
        loadData()
    }, [])

    if (loading) {
        return <div className="p-8 text-center animate-pulse">Carregando conquistas...</div>
    }

    const unlockedCount = achievements.filter(a => a.unlocked).length
    const totalCount = achievements.length

    return (
        <div className="space-y-8 animate-fade-in-up pb-20">
            {/* Header / Level Section */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-primary/20 via-primary/5 to-background border border-primary/10 p-8">
                <div className="absolute top-0 right-0 -mt-10 -mr-10 h-64 w-64 rounded-full bg-primary/10 blur-3xl"></div>

                <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
                    {/* Level Hexagon or Circle */}
                    <div className="relative flex h-32 w-32 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/60 shadow-lg shadow-primary/30">
                        <div className="absolute inset-1 rounded-full bg-background/90" />
                        <div className="relative z-10 text-center">
                            <span className="block text-sm font-bold uppercase tracking-wider text-muted-foreground">Nível</span>
                            <span className="block text-5xl font-black text-primary">{progress?.level || 1}</span>
                        </div>
                    </div>

                    {/* Stats & Progress */}
                    <div className="flex-1 space-y-4 w-full text-center md:text-left">
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight">Suas Conquistas</h1>
                            <p className="text-muted-foreground text-lg">
                                Você desbloqueou <span className="text-primary font-bold">{unlockedCount}</span> de <span className="font-bold">{totalCount}</span> medalhas
                            </p>
                        </div>

                        <div className="space-y-2">
                            <div className="flex justify-between text-sm font-medium">
                                <span>XP Atual: {progress?.xp || 0}</span>
                                <span>Próximo Nível: {progress?.next_level_xp || 100} XP</span>
                            </div>
                            <Progress value={progress?.progress_percent || 0} className="h-4" />
                            <p className="text-xs text-muted-foreground text-right">Continue treinando para passar de nível!</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Streaks Cards */}
            <div className="grid gap-4 md:grid-cols-3">
                <StreakCard
                    title="Treino"
                    icon={<Dumbbell className="h-6 w-6" />}
                    count={streaks?.workout_streak || 0}
                    color="text-orange-500"
                    bg="bg-orange-500/10"
                    borderColor="border-orange-500/20"
                />
                <StreakCard
                    title="Dieta"
                    icon={<Apple className="h-6 w-6" />}
                    count={streaks?.nutrition_streak || 0}
                    color="text-green-500"
                    bg="bg-green-500/10"
                    borderColor="border-green-500/20"
                />
                <StreakCard
                    title="Hidratação"
                    icon={<Droplet className="h-6 w-6" />}
                    count={streaks?.hydration_streak || 0}
                    color="text-blue-500"
                    bg="bg-blue-500/10"
                    borderColor="border-blue-500/20"
                />
            </div>

            {/* Achievements Grid */}
            <div>
                <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                    <Trophy className="h-6 w-6 text-yellow-500" />
                    Galeria de Medalhas
                </h2>

                {achievements.length === 0 ? (
                    <div className="text-center p-10 border border-dashed rounded-xl">
                        <p className="text-muted-foreground">Nenhuma conquista disponível no momento.</p>
                    </div>
                ) : (
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        {achievements.map((ach) => (
                            <AchievementCard key={ach.id} achievement={ach} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}

function StreakCard({ title, icon, count, color, bg, borderColor }: any) {
    return (
        <Card className={`glass-card border-l-4 ${borderColor} transition-transform hover:scale-[1.02]`}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{title}</CardTitle>
                <div className={`rounded-full p-2 ${bg} ${color}`}>
                    {icon}
                </div>
            </CardHeader>
            <CardContent>
                <div className="text-3xl font-bold flex items-center gap-2">
                    {count}
                    <span className="text-base font-normal text-muted-foreground">dias</span>
                </div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                    <Flame className={`h-3 w-3 ${count > 0 ? "text-orange-500 fill-orange-500 animate-pulse" : "text-gray-400"}`} />
                    Ofensiva atual
                </div>
            </CardContent>
        </Card>
    )
}

function AchievementCard({ achievement }: { achievement: Achievement }) {
    return (
        <Card className={`glass-card relative overflow-hidden transition-all duration-300 ${!achievement.unlocked ? 'opacity-70 grayscale' : 'hover:shadow-lg hover:shadow-primary/10 border-primary/20'}`}>
            <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                    <div className={`p-3 rounded-xl ${achievement.unlocked ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                        {achievement.unlocked ? <Award className="h-8 w-8" /> : <Zap className="h-8 w-8" />}
                    </div>
                    {achievement.unlocked && (
                        <span className="text-xs bg-primary/20 text-primary px-2 py-1 rounded-full font-medium">
                            Desbloqueado
                        </span>
                    )}
                </div>
                <CardTitle className="mt-4">{achievement.name}</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-sm text-muted-foreground mb-4 min-h-[40px]">
                    {achievement.description}
                </p>
                <div className="flex items-center justify-between text-xs font-medium">
                    <span className="text-primary flex items-center gap-1">
                        <Zap className="h-3 w-3 fill-primary" />
                        {achievement.xp_reward} XP
                    </span>
                    {achievement.unlocked_at && (
                        <span className="text-muted-foreground">
                            {formatDateOnlyBRT(achievement.unlocked_at)}
                        </span>
                    )}
                </div>
            </CardContent>

            {/* Background decoration for unlocked */}
            {achievement.unlocked && (
                <div className="absolute -top-10 -right-10 h-32 w-32 bg-primary/5 rounded-full blur-2xl pointer-events-none" />
            )}
        </Card>
    )
}
