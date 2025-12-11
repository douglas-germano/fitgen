"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check, CreditCard, Lock, ArrowRight } from "lucide-react";

export default function CheckoutPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        cardNumber: "",
        cardName: "",
        expiryDate: "",
        cvv: "",
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        // TODO: Integrar com Stripe
        // Por enquanto, apenas simula processamento e redireciona
        setTimeout(() => {
            // Após pagamento bem-sucedido, redireciona para registro
            router.push("/register?checkout=success");
        }, 2000);
    };

    return (
        <main className="min-h-screen bg-gradient-to-b from-background to-primary/5 flex items-center justify-center p-4">
            <div className="max-w-5xl w-full grid md:grid-cols-2 gap-8">
                {/* Order Summary */}
                <Card className="border-2 h-fit">
                    <CardHeader>
                        <CardTitle className="text-2xl">Resumo do Pedido</CardTitle>
                        <CardDescription>FitGen Premium</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-4">
                            <div className="flex justify-between items-center py-3 border-b">
                                <span className="font-medium">Assinatura Mensal</span>
                                <span className="text-xl font-bold">R$ 19,90</span>
                            </div>

                            <div className="space-y-3 pt-2">
                                <div className="flex items-start gap-3">
                                    <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                                    <span className="text-sm">Treinos personalizados ilimitados</span>
                                </div>
                                <div className="flex items-start gap-3">
                                    <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                                    <span className="text-sm">Acompanhamento completo</span>
                                </div>
                                <div className="flex items-start gap-3">
                                    <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                                    <span className="text-sm">Planos de dieta e hidratação</span>
                                </div>
                                <div className="flex items-start gap-3">
                                    <Check className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                                    <span className="text-sm">Suporte prioritário</span>
                                </div>
                            </div>

                            <div className="bg-primary/10 rounded-lg p-4 mt-6">
                                <div className="flex items-center gap-2 text-primary font-medium mb-2">
                                    <Check className="h-5 w-5" />
                                    7 dias grátis
                                </div>
                                <p className="text-sm text-muted-foreground">
                                    Você só será cobrado após o período de teste. Cancele quando quiser, sem taxas.
                                </p>
                            </div>
                        </div>

                        <div className="pt-4 border-t">
                            <div className="flex justify-between items-center">
                                <span className="text-lg font-semibold">Total hoje</span>
                                <span className="text-2xl font-bold text-primary">R$ 0,00</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">
                                Primeira cobrança em 7 dias: R$ 19,90
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* Payment Form */}
                <Card className="border-2">
                    <CardHeader>
                        <CardTitle className="text-2xl flex items-center gap-2">
                            <CreditCard className="h-6 w-6" />
                            Informações de Pagamento
                        </CardTitle>
                        <CardDescription>
                            Seus dados estão seguros e criptografados
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="cardNumber">Número do Cartão</Label>
                                <Input
                                    id="cardNumber"
                                    placeholder="1234 5678 9012 3456"
                                    value={formData.cardNumber}
                                    onChange={(e) => setFormData({ ...formData, cardNumber: e.target.value })}
                                    required
                                    maxLength={19}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="cardName">Nome no Cartão</Label>
                                <Input
                                    id="cardName"
                                    placeholder="JOÃO SILVA"
                                    value={formData.cardName}
                                    onChange={(e) => setFormData({ ...formData, cardName: e.target.value })}
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="expiry">Validade</Label>
                                    <Input
                                        id="expiry"
                                        placeholder="MM/AA"
                                        value={formData.expiryDate}
                                        onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                                        required
                                        maxLength={5}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="cvv">CVV</Label>
                                    <Input
                                        id="cvv"
                                        placeholder="123"
                                        type="password"
                                        value={formData.cvv}
                                        onChange={(e) => setFormData({ ...formData, cvv: e.target.value })}
                                        required
                                        maxLength={4}
                                    />
                                </div>
                            </div>

                            <div className="bg-muted/50 rounded-lg p-4 flex items-start gap-3 mt-6">
                                <Lock className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                                <div className="text-sm">
                                    <p className="font-medium mb-1">Pagamento 100% Seguro</p>
                                    <p className="text-muted-foreground">
                                        Seus dados são criptografados e protegidos. Processado via Stripe.
                                    </p>
                                </div>
                            </div>

                            <Button
                                type="submit"
                                size="lg"
                                className="w-full text-lg h-14 mt-6"
                                disabled={loading}
                            >
                                {loading ? (
                                    "Processando..."
                                ) : (
                                    <>
                                        Iniciar Período Grátis
                                        <ArrowRight className="ml-2 h-5 w-5" />
                                    </>
                                )}
                            </Button>

                            <p className="text-xs text-center text-muted-foreground mt-4">
                                Ao continuar, você concorda com nossos{" "}
                                <a href="#" className="underline hover:text-foreground">
                                    Termos de Serviço
                                </a>{" "}
                                e{" "}
                                <a href="#" className="underline hover:text-foreground">
                                    Política de Privacidade
                                </a>
                            </p>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </main>
    );
}
