export default function OnboardingLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 overflow-hidden relative">
            {/* Premium Background */}
            <div className="absolute inset-0 bg-background -z-20" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-background to-background -z-10" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-purple-500/10 via-background to-background -z-10" />

            <div className="w-full max-w-2xl space-y-6 animate-in fade-in slide-in-from-bottom-5 duration-700 relative z-10">
                <div className="text-center space-y-2">
                    <h1 className="text-3xl font-bold tracking-tighter text-foreground bg-clip-text text-transparent bg-gradient-to-br from-white to-white/70">
                        Bem-vindo ao FitGen 🏋️
                    </h1>
                    <p className="text-muted-foreground text-sm">
                        Vamos personalizar seu plano de treino perfeito em alguns passos
                    </p>
                </div>
                {children}
            </div>
        </div>
    );
}
