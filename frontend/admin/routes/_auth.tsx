import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_auth")({ component: AuthLayout });

function AuthLayout() {
    return (
        <div className="min-h-[100dvh] w-full bg-background">
            <div className="grid min-h-[100dvh] w-full lg:grid-cols-[1.1fr_1fr]">
                {/* Brand panel: text on top, symbol anchored at the bottom so they never overlap */}
                <div className="relative hidden flex-col gap-14 overflow-hidden bg-inverse p-12 text-inverse-foreground lg:flex xl:p-16">
                    <div className="relative flex items-center gap-3">
                        <img src="/brand/fitgen-mark.png" alt="" aria-hidden width={40} height={38} className="h-9 w-auto" />
                        <span className="text-xl font-extrabold italic tracking-tight">FitGen</span>
                    </div>
                    <div className="relative max-w-md">
                        <p className="text-[40px] font-bold leading-[1.08] tracking-[-0.02em]">
                            Tudo do FitGen, <span className="text-volt">em um só painel.</span>
                        </p>
                        <p className="mt-3 text-sm text-inverse-foreground/65">
                            Usuários, treinos, exercícios e notificações — com a mesma identidade do app.
                        </p>
                    </div>
                    <img
                        src="/brand/fitgen-mark.png"
                        alt=""
                        aria-hidden
                        className="pointer-events-none absolute -bottom-24 -right-28 w-[min(46vw,560px)] max-w-none"
                    />
                </div>

                <div className="flex items-center justify-center p-6 sm:p-10">
                    <div className="w-full max-w-sm space-y-8">
                        <div className="flex justify-center lg:hidden">
                            <img src="/brand/fitgen-logo.png" alt="FitGen" width={158} height={45} className="h-11 w-auto dark:hidden" />
                            <img src="/brand/fitgen-mark.png" alt="FitGen" width={46} height={44} className="hidden h-11 w-auto dark:block" />
                        </div>
                        <Outlet />
                    </div>
                </div>
            </div>
        </div>
    );
}
