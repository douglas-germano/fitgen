"use client";

import { useState, useEffect, useRef } from "react";
import { fetchAPI } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Send, Trash2, Bot, User, Sparkles } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface Message {
    id?: string;
    role: "user" | "model";
    content: string;
    created_at?: string;
}

const SUGGESTED_QUESTIONS = [
    "Por que não estou perdendo peso?",
    "Como está meu progresso essa semana?",
    "O que devo comer agora?",
    "Como melhorar meu treino?",
];

export default function CoachPage() {
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [loadingHistory, setLoadingHistory] = useState(true);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        loadHistory();
    }, []);

    useEffect(() => {
        // Smooth scroll to bottom when messages change
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const loadHistory = async () => {
        try {
            const data = await fetchAPI("/chat/history?limit=50");
            setMessages(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoadingHistory(false);
        }
    };

    const sendMessage = async (text?: string) => {
        const messageText = text || input.trim();
        if (!messageText || loading) return;

        const userMessage: Message = { role: "user", content: messageText };
        setMessages(prev => [...prev, userMessage]);
        setInput("");
        setLoading(true);

        try {
            const response = await fetchAPI("/chat", {
                method: "POST",
                body: JSON.stringify({ message: messageText })
            });

            const coachMessage: Message = {
                role: "model",
                content: response.answer
            };
            setMessages(prev => [...prev, coachMessage]);

        } catch (error) {
            toast.error("Erro ao enviar mensagem");
            setMessages(prev => prev.slice(0, -1));
        } finally {
            setLoading(false);
        }
    };

    const clearHistory = async () => {
        if (!confirm("Limpar todo o histórico de conversas?")) return;

        try {
            await fetchAPI("/chat/clear", { method: "DELETE" });
            setMessages([]);
            toast.success("Histórico limpo");
        } catch (error) {
            toast.error("Erro ao limpar histórico");
        }
    };

    return (
        <div className="flex flex-col h-[100svh] md:h-[calc(100vh-80px)] bg-background">
            {/* Header - Apple style */}
            <div className="flex-shrink-0 border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="flex items-center justify-between px-4 md:px-6 h-14 md:h-16">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-gradient-to-br from-primary/90 to-primary flex items-center justify-center shadow-lg shadow-primary/25">
                            <Sparkles className="h-4 w-4 md:h-5 md:w-5 text-primary-foreground" />
                        </div>
                        <div>
                            <h1 className="text-base md:text-lg font-semibold tracking-tight">Coach Virtual</h1>
                            <p className="text-xs text-muted-foreground hidden md:block">Seu assistente de fitness pessoal</p>
                        </div>
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={clearHistory}
                        disabled={messages.length === 0}
                        className="text-muted-foreground hover:text-foreground"
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Messages Container */}
            <div
                ref={scrollContainerRef}
                className="flex-1 overflow-y-auto px-4 md:px-6 py-4 md:py-6 space-y-4 md:space-y-6"
                style={{
                    paddingBottom: 'calc(env(safe-area-inset-bottom) + 80px)',
                    scrollBehavior: 'smooth'
                }}
            >
                {loadingHistory ? (
                    <div className="flex justify-center items-center py-12">
                        <div className="flex flex-col items-center gap-3">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                            <p className="text-sm text-muted-foreground">Carregando conversa...</p>
                        </div>
                    </div>
                ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 md:py-12 space-y-6 max-w-2xl mx-auto">
                        <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                            <Sparkles className="h-10 w-10 md:h-12 md:w-12 text-primary" />
                        </div>
                        <div className="text-center space-y-2">
                            <h2 className="text-xl md:text-2xl font-semibold">Olá! Sou seu Coach Virtual 👋</h2>
                            <p className="text-sm md:text-base text-muted-foreground max-w-md">
                                Posso ajudar com treinos, dieta e progresso. Como posso ajudar hoje?
                            </p>
                        </div>
                        <div className="flex flex-wrap gap-2 justify-center max-w-lg">
                            {SUGGESTED_QUESTIONS.map((q, i) => (
                                <Button
                                    key={i}
                                    variant="outline"
                                    size="sm"
                                    onClick={() => sendMessage(q)}
                                    className="text-xs md:text-sm rounded-full border-border/50 hover:border-border hover:bg-accent/50"
                                >
                                    {q}
                                </Button>
                            ))}
                        </div>
                    </div>
                ) : (
                    <>
                        {messages.map((msg, i) => (
                            <div
                                key={i}
                                className={`flex gap-2 md:gap-3 items-end animate-in slide-in-from-bottom-2 duration-300 ${msg.role === "user" ? "justify-end" : "justify-start"
                                    }`}
                            >
                                {msg.role === "model" && (
                                    <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-gradient-to-br from-primary/90 to-primary flex items-center justify-center flex-shrink-0 shadow-md shadow-primary/20">
                                        <Bot className="h-3.5 w-3.5 md:h-4 md:w-4 text-primary-foreground" />
                                    </div>
                                )}
                                <div
                                    className={`group relative max-w-[85%] md:max-w-[75%] rounded-2xl px-3.5 py-2.5 md:px-4 md:py-3 ${msg.role === "user"
                                        ? "bg-gradient-to-br from-primary to-primary/90 text-primary-foreground shadow-md shadow-primary/25"
                                        : "bg-muted/50 text-foreground border border-border/50 backdrop-blur"
                                        }`}
                                >
                                    {msg.role === "model" ? (
                                        <div className="prose prose-sm md:prose-base dark:prose-invert max-w-none prose-p:my-1.5 prose-p:leading-relaxed prose-headings:mt-3 prose-headings:mb-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5 prose-strong:font-semibold prose-strong:text-foreground">
                                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                                {msg.content}
                                            </ReactMarkdown>
                                        </div>
                                    ) : (
                                        <p className="text-sm md:text-base leading-relaxed whitespace-pre-wrap break-words">
                                            {msg.content}
                                        </p>
                                    )}
                                </div>
                                {msg.role === "user" && (
                                    <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                                        <User className="h-3.5 w-3.5 md:h-4 md:w-4 text-primary" />
                                    </div>
                                )}
                            </div>
                        ))}
                        {loading && (
                            <div className="flex gap-2 md:gap-3 items-end animate-in slide-in-from-bottom-2 duration-300">
                                <div className="w-7 h-7 md:w-8 md:h-8 rounded-full bg-gradient-to-br from-primary/90 to-primary flex items-center justify-center flex-shrink-0 shadow-md shadow-primary/20">
                                    <Bot className="h-3.5 w-3.5 md:h-4 md:w-4 text-primary-foreground" />
                                </div>
                                <div className="bg-muted/50 rounded-2xl px-4 py-3 border border-border/50 backdrop-blur">
                                    <div className="flex gap-1.5">
                                        <div className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '0ms' }} />
                                        <div className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '150ms' }} />
                                        <div className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: '300ms' }} />
                                    </div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </>
                )}
            </div>

            {/* Input Area - Fixed at bottom on mobile */}
            <div className="flex-shrink-0 border-t border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:relative fixed bottom-20 md:bottom-0 left-0 right-0 z-10">
                <div className="px-4 md:px-6 py-3 md:py-4" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 12px)' }}>
                    <form onSubmit={(e) => { e.preventDefault(); sendMessage(); }} className="flex gap-2">
                        <Input
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Digite sua mensagem..."
                            disabled={loading}
                            className="flex-1 rounded-full border-border/50 bg-background/50 px-4 md:px-5 py-2.5 md:py-3 text-sm md:text-base focus-visible:ring-primary/50 placeholder:text-muted-foreground/60"
                        />
                        <Button
                            type="submit"
                            disabled={loading || !input.trim()}
                            size="icon"
                            className="rounded-full h-10 w-10 md:h-11 md:w-11 flex-shrink-0 bg-gradient-to-br from-primary to-primary/90 hover:from-primary hover:to-primary shadow-lg shadow-primary/25 disabled:opacity-50"
                        >
                            {loading ? (
                                <Loader2 className="h-4 w-4 md:h-5 md:w-5 animate-spin" />
                            ) : (
                                <Send className="h-4 w-4 md:h-5 md:w-5" />
                            )}
                        </Button>
                    </form>
                </div>
            </div>
        </div>
    );
}
