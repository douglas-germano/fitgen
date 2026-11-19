import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export function getRouter() {
    return createRouter({
        routeTree,
        defaultPreload: "intent",
        trailingSlash: "never",
        // Reset tokens and user IDs are opaque URL values.
        parseSearch: (search) => Object.fromEntries(new URLSearchParams(search)),
        stringifySearch: (search) => {
            const params = new URLSearchParams();
            for (const [key, value] of Object.entries(search)) {
                if (typeof value === "string") params.set(key, value);
            }
            return params.size ? `?${params}` : "";
        },
    });
}

declare module "@tanstack/react-router" {
    interface Register {
        router: ReturnType<typeof getRouter>;
    }
}
