import { ArrowLeft, Trash2, AlertTriangle, Mail } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function DeleteAccount() {
    return (
        <div className="min-h-screen bg-black text-zinc-100 p-6 md:p-12 font-sans flex items-center justify-center">
            <div className="max-w-xl w-full space-y-6">
                <Link href="/">
                    <Button variant="ghost" className="pl-0 gap-2 text-zinc-400 hover:text-white">
                        <ArrowLeft className="w-4 h-4" /> Voltar para o início
                    </Button>
                </Link>

                <Card className="border-red-900/20 bg-zinc-900/50 backdrop-blur">
                    <CardHeader className="space-y-4">
                        <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center">
                            <Trash2 className="w-6 h-6 text-red-500" />
                        </div>
                        <CardTitle className="text-2xl font-bold text-white">Solicitação de Exclusão de Conta</CardTitle>
                        <CardDescription className="text-zinc-400">
                            Entendemos que você deseja encerrar sua jornada conosco. Veja abaixo como proceder.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="bg-red-500/5 border border-red-500/10 p-4 rounded-lg flex gap-3 items-start">
                            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                            <div className="space-y-1">
                                <h4 className="font-medium text-red-500">Atenção: Ação Irreversível</h4>
                                <p className="text-sm text-red-400/80">
                                    Ao excluir sua conta, todos os seus dados, incluindo histórico de treinos, dietas e preferências, serão permanentemente apagados de nossos servidores.
                                </p>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h3 className="font-semibold text-white">Como solicitar a exclusão:</h3>

                            <div className="space-y-3">
                                <div className="flex gap-3">
                                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center text-sm font-bold">1</div>
                                    <div>
                                        <p className="font-medium text-white">Pelo Aplicativo (Recomendado)</p>
                                        <p className="text-sm text-zinc-400">
                                            Acesse <strong>Perfil {'>'} Configurações {'>'} Excluir Conta</strong> e confirme a ação.
                                        </p>
                                    </div>
                                </div>

                                <div className="flex gap-3">
                                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-zinc-800 flex items-center justify-center text-sm font-bold">2</div>
                                    <div>
                                        <p className="font-medium text-white">Via E-mail</p>
                                        <p className="text-sm text-zinc-400 mb-2">
                                            Caso não tenha mais acesso ao app, envie um e-mail para nosso suporte com o assunto "Exclusão de Conta".
                                        </p>
                                        <Button variant="outline" className="gap-2 border-zinc-700 bg-zinc-800/50 hover:bg-zinc-800" asChild>
                                            <a href="mailto:suporte@fitgen.com?subject=Exclusão de Conta">
                                                <Mail className="w-4 h-4" /> Enviar E-mail
                                            </a>
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <p className="text-center text-xs text-zinc-600">
                    O processamento da exclusão manual pode levar até 48 horas úteis.
                </p>
            </div>
        </div>
    );
}
