export default function AuthLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className="min-h-[100dvh] w-full flex items-center justify-center p-4 overflow-hidden relative">
            {/* Premium Background */}
            <div className="absolute inset-0 bg-background -z-20" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/20 via-background to-background -z-10" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-blue-500/10 via-background to-background -z-10" />

            <div className="w-full max-w-md space-y-8 animate-in fade-in zoom-in-95 duration-500 relative z-10">
                <div className="text-center space-y-2">
                    <h1 className="text-4xl font-bold tracking-tighter text-foreground bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60">
                        FitGen
                    </h1>
                    <p className="text-muted-foreground text-sm">
                        Your personal evolution starts here.
                    </p>
                </div>
                {children}
            </div>
        </div>
    );
}
