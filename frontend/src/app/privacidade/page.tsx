import { ArrowLeft, Shield, Lock, Eye, FileText, Mail } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function PrivacyPolicy() {
    return (
        <div className="min-h-screen bg-black text-zinc-100 p-6 md:p-12 font-sans">
            <div className="max-w-3xl mx-auto space-y-8">
                {/* Header */}
                <div className="space-y-4">
                    <Link href="/">
                        <Button variant="ghost" className="pl-0 gap-2 text-zinc-400 hover:text-white mb-4">
                            <ArrowLeft className="w-4 h-4" /> Voltar
                        </Button>
                    </Link>
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-primary/10 rounded-full">
                            <Shield className="w-8 h-8 text-primary" />
                        </div>
                        <h1 className="text-3xl font-bold tracking-tight">Política de Privacidade</h1>
                    </div>
                    <p className="text-zinc-400">Última atualização: 09 de Janeiro de 2025</p>
                </div>

                {/* Content */}
                <div className="space-y-8 text-zinc-300 leading-relaxed">
                    <section className="space-y-3">
                        <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                            <Eye className="w-5 h-5 text-primary" /> 1. Introdução
                        </h2>
                        <p>
                            Bem-vindo ao FitGen. Sua privacidade é nossa prioridade. Esta política descreve como coletamos, usamos e protegemos suas informações pessoais ao utilizar nosso aplicativo de fitness e nutrição.
                        </p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                            <FileText className="w-5 h-5 text-primary" /> 2. Dados que Coletamos
                        </h2>
                        <p>O FitGen pode coletar os seguintes tipos de dados para fornecer uma experiência personalizada:</p>
                        <ul className="list-disc pl-5 space-y-2 text-zinc-400">
                            <li><strong>Informações de Identificação:</strong> Nome, e-mail e foto de perfil (via login social).</li>
                            <li><strong>Dados de Saúde e Físicos:</strong> Idade, peso, altura, nível de atividade física e objetivos de fitness.</li>
                            <li><strong>Dados de Uso:</strong> Registro de exercícios, consumo de água e refeições.</li>
                        </ul>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                            <Lock className="w-5 h-5 text-primary" /> 3. Como Usamos seus Dados
                        </h2>
                        <p>Utilizamos suas informações exclusivamente para:</p>
                        <ul className="list-disc pl-5 space-y-2 text-zinc-400">
                            <li>Gerar planos de treino e dieta personalizados através de nossa IA.</li>
                            <li>Monitorar seu progresso e fornecer insights detalhados.</li>
                            <li>Melhorar a funcionalidade e segurança do aplicativo.</li>
                        </ul>
                        <p className="mt-2 text-sm bg-zinc-900 border border-zinc-800 p-4 rounded-lg">
                            O FitGen <strong>não vende</strong> seus dados pessoais para terceiros.
                        </p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                            <Shield className="w-5 h-5 text-primary" /> 4. Segurança
                        </h2>
                        <p>
                            Implementamos medidas de segurança técnicas e organizacionais robustas para proteger seus dados contra acesso não autorizado, alteração ou destruição.
                        </p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                            <Mail className="w-5 h-5 text-primary" /> 5. Contato
                        </h2>
                        <p>
                            Se você tiver dúvidas sobre esta política ou sobre seus dados, entre em contato conosco através do e-mail:
                        </p>
                        <a href="mailto:suporte@fitgen.com" className="text-primary hover:underline">suporte@fitgen.com</a>
                    </section>
                </div>

                {/* Footer */}
                <div className="pt-8 border-t border-zinc-800 text-center text-zinc-500 text-sm">
                    <p>&copy; 2025 FitGen. Todos os direitos reservados.</p>
                </div>
            </div>
        </div>
    );
}
