import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            className={cn("animate-pulse rounded-lg bg-muted/50", className)}
            {...props}
        />
    );
}

/** Skeleton layout matching the Dashboard page */
export function DashboardSkeleton() {
    return (
        <div className="space-y-6">
            <div className="space-y-2">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-4 w-64" />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="rounded-xl border border-border/50 p-4 space-y-3">
                        <div className="flex justify-between">
                            <Skeleton className="h-4 w-20" />
                            <Skeleton className="h-8 w-8 rounded-full" />
                        </div>
                        <Skeleton className="h-7 w-16" />
                        <Skeleton className="h-3 w-24" />
                    </div>
                ))}
            </div>
            <div className="grid md:grid-cols-3 gap-6">
                {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="rounded-xl border border-border/50 p-6 space-y-4">
                        <Skeleton className="h-6 w-32" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-10 w-full rounded-md" />
                    </div>
                ))}
            </div>
        </div>
    );
}

/** Skeleton layout matching the Workouts page */
export function WorkoutsSkeleton() {
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div className="space-y-2">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-4 w-56" />
                </div>
                <div className="flex gap-2">
                    <Skeleton className="h-9 w-24 rounded-md" />
                    <Skeleton className="h-9 w-28 rounded-md" />
                </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 rounded-xl border border-border/50 p-6 space-y-4">
                    <Skeleton className="h-5 w-24" />
                    <Skeleton className="h-7 w-40" />
                    <Skeleton className="h-4 w-64" />
                    <Skeleton className="h-12 w-full rounded-md" />
                </div>
                <div className="rounded-xl border border-border/50 p-6 space-y-4">
                    <Skeleton className="h-5 w-20" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-2 w-full rounded-full" />
                    <Skeleton className="h-10 w-full rounded-md" />
                </div>
            </div>
            <div className="rounded-xl border border-border/50 p-6 space-y-4">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-[250px] w-full rounded-lg" />
            </div>
        </div>
    );
}

/** Skeleton layout matching the Diet page */
export function DietSkeleton() {
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center px-4 md:px-8 pt-6">
                <div className="space-y-2">
                    <Skeleton className="h-8 w-56" />
                    <Skeleton className="h-4 w-72" />
                </div>
            </div>
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="rounded-xl border border-border/50 p-4 space-y-3">
                        <div className="flex justify-between">
                            <Skeleton className="h-4 w-16" />
                            <Skeleton className="h-4 w-4 rounded-full" />
                        </div>
                        <Skeleton className="h-7 w-24" />
                        <Skeleton className="h-2 w-full rounded-full" />
                    </div>
                ))}
            </div>
            <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-6">
                    <div className="rounded-xl border border-border/50 p-6 space-y-4">
                        <Skeleton className="h-6 w-40" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-10 w-32 rounded-md" />
                    </div>
                </div>
                <div className="rounded-xl border border-border/50 p-6 space-y-4">
                    <Skeleton className="h-6 w-36" />
                    <Skeleton className="h-4 w-24" />
                    {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="flex justify-between items-center py-2">
                            <div className="space-y-1">
                                <Skeleton className="h-4 w-32" />
                                <Skeleton className="h-3 w-16" />
                            </div>
                            <Skeleton className="h-4 w-20" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

/** Skeleton layout matching the Hydration page */
export function HydrationSkeleton() {
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div className="space-y-2">
                    <Skeleton className="h-8 w-40" />
                    <Skeleton className="h-4 w-64" />
                </div>
                <Skeleton className="h-9 w-32 rounded-md" />
            </div>
            <div className="grid gap-6 md:grid-cols-2">
                <div className="rounded-xl border border-border/50 p-6 flex flex-col items-center space-y-4">
                    <Skeleton className="h-48 w-48 rounded-full" />
                    <Skeleton className="h-2 w-full max-w-xs rounded-full" />
                </div>
                <div className="rounded-xl border border-border/50 p-6 space-y-4">
                    <Skeleton className="h-6 w-32" />
                    <div className="grid grid-cols-2 gap-4">
                        <Skeleton className="h-24 rounded-xl" />
                        <Skeleton className="h-24 rounded-xl" />
                    </div>
                    <Skeleton className="h-10 w-full rounded-md" />
                </div>
            </div>
        </div>
    );
}

/** Skeleton layout matching the Metrics page */
export function MetricsSkeleton() {
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div className="space-y-2">
                    <Skeleton className="h-8 w-52" />
                    <Skeleton className="h-4 w-72" />
                </div>
                <Skeleton className="h-10 w-36 rounded-md" />
            </div>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-6">
                {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="rounded-xl border border-border/50 p-4 space-y-2">
                        <Skeleton className="h-3 w-12" />
                        <Skeleton className="h-7 w-16" />
                    </div>
                ))}
            </div>
            <div className="rounded-xl border border-border/50 p-6 space-y-4">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-10 w-80 rounded-md" />
                <Skeleton className="h-[300px] w-full rounded-lg" />
            </div>
        </div>
    );
}

export { Skeleton };
