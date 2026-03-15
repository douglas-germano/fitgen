"use client";

import { useState, useRef } from "react";
import { User, Camera, Loader2, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { getToken } from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

interface ProfileAvatarUploadProps {
    currentImage?: string | null;
    userName?: string;
    size?: "sm" | "md" | "lg" | "xl";
    className?: string;
}

export function ProfileAvatarUpload({ currentImage, userName, size = "lg", className }: ProfileAvatarUploadProps) {
    const [uploading, setUploading] = useState(false);
    const [preview, setPreview] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const queryClient = useQueryClient();

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validations
        if (!file.type.startsWith("image/")) {
            toast.error("Por favor, selecione uma imagem válida.");
            return;
        }

        if (file.size > 5 * 1024 * 1024) { // 5MB limit
            toast.error("A imagem deve ter no máximo 5MB.");
            return;
        }

        // Preview
        const objectUrl = URL.createObjectURL(file);
        setPreview(objectUrl);

        // Upload
        const formData = new FormData();
        formData.append("file", file);

        setUploading(true);
        try {
            // Use getToken from @/lib/api to handle Capacitor storage correctly
            const token = getToken();

            if (!token) {
                throw new Error("Não autenticado");
            }

            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://fitgen.suacozinha.site/api'}/profile/image`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${token}`
                },
                body: formData
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.msg || "Falha no upload");
            }

            const data = await response.json();

            toast.success("Foto de perfil atualizada!");
            queryClient.invalidateQueries({ queryKey: ["user"] }); // Refresh user data

        } catch (error) {
            console.error(error);
            toast.error(error instanceof Error ? error.message : "Erro ao atualizar foto.");
            setPreview(null); // Revert preview
        } finally {
            setUploading(false);
        }
    };

    const sizeClasses = {
        sm: "h-10 w-10",
        md: "h-20 w-20",
        lg: "h-32 w-32",
        xl: "h-48 w-48"
    };

    const iconSizes = {
        sm: "h-4 w-4",
        md: "h-8 w-8",
        lg: "h-12 w-12",
        xl: "h-20 w-20"
    };

    const imageUrl = preview || (currentImage ? (currentImage.startsWith("http") ? currentImage : `${process.env.NEXT_PUBLIC_API_URL || 'https://fitgen.suacozinha.site/api'}/static/${currentImage}`) : null);

    return (
        <div className={cn("relative group", className)}>
            <div
                className={cn(
                    "rounded-full bg-muted border-4 border-background overflow-hidden relative shadow-lg flex items-center justify-center transition-all",
                    sizeClasses[size]
                )}
            >
                {imageUrl ? (
                    <img
                        src={imageUrl}
                        alt={userName || "Profile"}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                            e.currentTarget.style.display = 'none';
                        }}
                    />
                ) : (
                    <User className={cn("text-muted-foreground", iconSizes[size])} />
                )}

                {uploading && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <Loader2 className="animate-spin text-white h-8 w-8" />
                    </div>
                )}

                {/* Overlay on Hover */}
                {!uploading && (
                    <div
                        className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center cursor-pointer text-white"
                        onClick={() => fileInputRef.current?.click()}
                    >
                        <Camera className="h-6 w-6 mb-1" />
                        <span className="text-xs font-medium">Alterar</span>
                    </div>
                )}
            </div>

            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/png, image/jpeg, image/jpg, image/gif"
                onChange={handleFileChange}
            />
        </div>
    );
}
