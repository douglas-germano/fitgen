import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
    beforeLoad: () => {
        if (typeof window !== "undefined") {
            throw redirect({ to: "/admin", replace: true });
        }
    },
});
