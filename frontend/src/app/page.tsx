import Image from "next/image";
import { Activity, ArrowUpRight, Bot, Check, ChevronDown, Droplets, Dumbbell, Flame, Salad, ShieldCheck, Target } from "lucide-react";
import styles from "./landing.module.css";

const problems = [
  ["Treino de influencer", "Feito para quem treina há anos e tem outra rotina."],
  ["Dieta da moda", "Funciona por duas semanas e termina no efeito sanfona."],
  ["Zero acompanhamento", "Sem medir progresso, você não sabe o que ajustar e desiste."],
];

const steps = [
  ["Conte quem você é", "Objetivo, nível, dias disponíveis, equipamentos e preferências alimentares."],
  ["A IA monta seu plano", "Divisão de treino, séries, cargas e cardápio semanal com lista de compras."],
  ["Treine, registre, evolua", "Registre treinos, refeições, água e medidas. O FitGen ajusta o plano."],
];

const features = [
  { icon: Dumbbell, title: "Treinos Gerados por IA", description: "Do iniciante ao avançado, com execução em vídeo." },
  { icon: Salad, title: "Dieta e Receitas", description: "Cardápio semanal, meta calórica e lista de compras." },
  { icon: Bot, title: "IA Coach 24h", description: "Respostas com base nos seus treinos, medidas e metas." },
  { icon: Activity, title: "Medidas e Progresso", description: "Peso, medidas e volume de treino em gráficos semanais." },
  { icon: Droplets, title: "Hidratação", description: "Meta diária de água e registro rápido." },
  { icon: Flame, title: "Sequências e Conquistas", description: "Acompanhe quantos dias seguidos você cumpriu suas metas." },
];

const benefits = [
  "Treinos ilimitados gerados por IA",
  "Plano alimentar, receitas e lista de compras",
  "IA Coach 24h",
  "Medidas, progresso e hidratação",
  "Sequências e conquistas",
  "Sem anúncios e sem fidelidade",
];

const questions = [
  ["Preciso ir à academia?", "Você informa os equipamentos que tem, de academia completa a só o peso do corpo, e a IA monta o treino com o que existe."],
  ["Serve para quem nunca treinou?", "Sim. Os treinos vão do iniciante ao avançado e os exercícios têm instruções em vídeo."],
  ["A dieta respeita minhas restrições?", "O cardápio é gerado a partir das preferências e restrições que você informa no cadastro."],
  ["Substitui médico ou nutricionista?", "O FitGen oferece orientações gerais. Se você tem alguma condição de saúde, consulte um profissional antes."],
  ["Posso cancelar quando quiser?", "Pode. O plano é mensal, sem fidelidade. Se cancelar durante os 7 dias grátis, você não paga nada."],
];

function Logo({ onDark = false }: { onDark?: boolean }) {
  return (
    <span className={onDark ? styles.darkLogo : styles.logo}>
      <Image src="/brand/fitgen-logo.png" alt="FitGen" width={104} height={30} unoptimized />
      {onDark && <Image src="/brand/fitgen-logo.png" alt="" width={104} height={30} unoptimized className={styles.logoSymbol} />}
    </span>
  );
}

export default function LandingPage() {
  // Web checkout (RevenueCat Web Billing + Stripe) lives at /assinar once its key is configured.
  const checkoutUrl = process.env.NEXT_PUBLIC_REVENUECAT_WEB_KEY?.trim() ? "/assinar" : process.env.NEXT_PUBLIC_FITGEN_CHECKOUT_URL?.trim();
  const supportUrl = "mailto:suporte@fitgen.com";
  const subscriptionUrl = checkoutUrl || `${supportUrl}?subject=Assinatura%20FitGen`;

  return (
    <div className={styles.site}>
      <header className={styles.dark}>
        <div className={styles.header}>
          <Logo onDark />
          <a className={styles.button} href="#plano">Assinar</a>
        </div>
      </header>
      <main>
        <section className={`${styles.dark} ${styles.hero}`}>
          <div className={`${styles.wrap} ${styles.heroGrid}`}>
            <div>
              <h1>Treino e dieta feitos <em>para o seu corpo,</em> não para o de outra pessoa.</h1>
              <p>O FitGen monta seu plano de treino e alimentação a partir do seu objetivo, nível, rotina e equipamentos. E ajusta tudo conforme você evolui.</p>
              <a className={styles.button} href="#plano">Testar 7 dias grátis <ArrowUpRight size={16} aria-hidden="true" /></a>
              <ul className={styles.trust}>
                <li><Check size={14} aria-hidden="true" /> Cancele quando quiser</li>
                <li><Check size={14} aria-hidden="true" /> 7 dias grátis</li>
              </ul>
            </div>
            <figure className={styles.dashboard}>
              <figcaption>Exemplo de resumo no FitGen</figcaption>
              <strong className={styles.greeting}>Pronto para o treino?</strong>
              <div className={styles.summary}>
                <div className={styles.iconRow}><span className={styles.icon}><Activity size={17} aria-hidden="true" /></span><div><strong>Resumo do Dia</strong><small>Hipertrofia · Semana 05</small></div></div>
                <div className={styles.stats}>
                  <div><strong>1.450 kcal</strong><small>Consumidas</small><span /></div>
                  <div><strong>1,8 L</strong><small>Água</small><span /></div>
                  <div><strong>48 min</strong><small>Treino</small><span /></div>
                </div>
              </div>
              <div className={styles.dashboardBottom}>
                <div><b><Target size={16} aria-hidden="true" /> Meta Calórica</b><strong>2.150 kcal</strong><small>Ajustada pela IA</small></div>
                <div><b><Flame size={16} aria-hidden="true" /> Sequência</b><strong>12 dias</strong><small>Sem falhar</small></div>
              </div>
            </figure>
          </div>
        </section>
        <section className={styles.section}>
          <div className={styles.wrap}>
            <h2>Você treina, faz dieta, se esforça. E o espelho não muda.</h2>
            <p>Não é falta de disciplina. A maioria segue planos genéricos, montados para um corpo, uma rotina e um objetivo que não são os seus.</p>
            <div className={styles.grid}>
              {problems.map(([title, description]) => <article className={styles.card} key={title}><h3>{title}</h3><p>{description}</p></article>)}
            </div>
          </div>
        </section>
        <section className={`${styles.section} ${styles.steps}`}>
          <div className={styles.wrap}>
            <h2>Seu plano completo em menos de 5 minutos.</h2>
            <ol className={styles.grid}>
              {steps.map(([title, description], index) => (
                <li className={`${styles.card} ${styles.iconRow}`} key={title}>
                  <span className={styles.icon} aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                  <div><h3>{title}</h3><p>{description}</p></div>
                </li>
              ))}
            </ol>
          </div>
        </section>
        <section className={`${styles.section} ${styles.muted}`}>
          <div className={styles.wrap}>
            <h2>Um personal e um nutricionista no seu bolso.</h2>
            <div className={styles.grid}>
              {features.map(({ icon: Icon, title, description }) => (
                <article className={`${styles.card} ${styles.iconRow}`} key={title}>
                  <span className={styles.icon}><Icon size={18} aria-hidden="true" /></span>
                  <div><h3>{title}</h3><p>{description}</p></div>
                </article>
              ))}
            </div>
          </div>
        </section>
        <section className={`${styles.section} ${styles.dark}`}>
          <div className={styles.wrap}>
            <h2>Um coach que conhece seus números e responde na hora.</h2>
            <figure className={styles.chat}>
              <figcaption>Exemplo de conversa</figcaption>
              <p className={styles.chatUser}>Estou há duas semanas no mesmo peso. O que faço?</p>
              <p className={styles.chatCoach}>Pelos seus registros, você bateu a meta de proteína em 3 dos últimos 7 dias e reduziu o cardio na semana 4. Sugiro voltar aos 2 cardios semanais e revisar seu cardápio.</p>
            </figure>
          </div>
        </section>
        <section className={`${styles.section} ${styles.muted}`} id="plano">
          <div className={`${styles.wrap} ${styles.narrow}`}>
            <h2>Tudo liberado. Um preço só.</h2>
            <div className={styles.plan}>
              <div className={styles.planHeading}><h3>FitGen Completo</h3><span>MENSAL</span></div>
              <p className={styles.price}>R$ <strong>29,90</strong><span>/mês</span></p>
              <p>R$ 1 por dia em um mês de 30 dias para ter treino e dieta personalizados.</p>
              <ul>{benefits.map((benefit) => <li key={benefit}><Check size={18} aria-hidden="true" />{benefit}</li>)}</ul>
              <a className={`${styles.button} ${styles.planButton}`} href={subscriptionUrl}>{checkoutUrl ? "Começar 7 dias grátis" : "Pedir link de assinatura"}</a>
            </div>
            <div className={`${styles.card} ${styles.iconRow} ${styles.guarantee}`}>
              <span className={styles.icon}><ShieldCheck size={20} aria-hidden="true" /></span>
              <div><h3>7 dias grátis</h3><p>Teste tudo por 7 dias. A primeira cobrança de R$ 29,90 só acontece no 8º dia, e você pode cancelar antes.</p></div>
            </div>
          </div>
        </section>
        <section className={styles.section}>
          <div className={`${styles.wrap} ${styles.narrow}`}>
            <h2>Perguntas frequentes</h2>
            <div className={styles.faq}>
              {questions.map(([question, answer]) => (
                <details key={question}>
                  <summary>{question}<ChevronDown size={18} aria-hidden="true" /></summary>
                  <p>{answer}</p>
                </details>
              ))}
            </div>
            <div className={`${styles.dark} ${styles.final}`}>
              <h2>Daqui a 90 dias você vai agradecer por ter começado <em>hoje.</em></h2>
              <p>Assine, responda o questionário e receba seu plano em minutos.</p>
              <a className={styles.button} href="#plano">Testar 7 dias grátis <ArrowUpRight size={16} aria-hidden="true" /></a>
            </div>
          </div>
        </section>
      </main>
      <footer className={styles.footer}>
        <Logo />
        <nav aria-label="Informações do FitGen"><a href="/privacidade">Privacidade</a><a href={supportUrl}>Contato</a></nav>
        <small>© 2026 FitGen</small>
      </footer>
    </div>
  );
}
