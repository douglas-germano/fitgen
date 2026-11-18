"use client"

import { Toaster as Sonner } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
    return (
        <Sonner
            theme="system"
            position="top-center"
            className="toaster group"
            toastOptions={{
                classNames: {
                    toast:
                        "group toast group-[.toaster]:bg-inverse group-[.toaster]:text-inverse-foreground group-[.toaster]:border-0 group-[.toaster]:rounded-full group-[.toaster]:px-5 group-[.toaster]:shadow-xl group-[.toaster]:font-semibold",
                    description: "group-[.toast]:text-inverse-foreground/70",
                    actionButton:
                        "group-[.toast]:bg-volt group-[.toast]:text-on-volt",
                    cancelButton:
                        "group-[.toast]:bg-chip group-[.toast]:text-foreground",
                },
            }}
            {...props}
        />
    )
}

export { Toaster }
