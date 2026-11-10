import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { brand } from "@/config/brand";

export const metadata: Metadata = { title: "Privacidade" };

const sections: Array<{ title: string; body: string }> = [
  {
    title: "Quais dados coletamos",
    body: "Dados de cadastro (nome, e-mail), dados físicos que você informa (peso, altura, medidas, percentual de gordura quando medido por método adequado), treinos realizados, registros de alimentação, metas e, se você quiser, fotografias corporais.",
  },
  {
    title: "Para que usamos",
    body: "Exclusivamente para mostrar sua evolução, gerar relatórios e permitir que o personal trainer vinculado a você acompanhe seu progresso. Não vendemos nem compartilhamos seus dados com anunciantes.",
  },
  {
    title: "Quem pode ver",
    body: "Você. O personal trainer vinculado a você. O administrador da sua academia vê dados de treino e avaliação, mas nunca suas fotografias corporais nem suas conversas com a IA. Essas regras são aplicadas no banco de dados, não apenas na tela.",
  },
  {
    title: "Fotografias",
    body: "São opcionais, exigem consentimento específico, ficam em armazenamento privado e só são exibidas por links temporários que expiram em minutos.",
  },
  {
    title: "Inteligência artificial",
    body: "Os relatórios usam somente os dados registrados. A IA não faz diagnóstico de saúde e não substitui médico, nutricionista ou profissional de educação física.",
  },
  {
    title: "Seus direitos (LGPD)",
    body: "Você pode consultar, corrigir, exportar ou pedir a exclusão dos seus dados a qualquer momento na página Perfil. Também pode retirar consentimentos já dados.",
  },
];

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <Link href="/">
        <Logo />
      </Link>
      <h1 className="type-display mt-10 text-[36px]">Privacidade e dados</h1>
      <p className="mt-4 leading-relaxed text-mist">
        Como o {brand.name} trata suas informações corporais, em linguagem direta.
      </p>
      <div className="mt-10 divide-y divide-line border-y border-line">
        {sections.map((s) => (
          <section key={s.title} className="py-6">
            <h2 className="text-[17px] font-semibold">{s.title}</h2>
            <p className="mt-2 leading-relaxed text-mist">{s.body}</p>
          </section>
        ))}
      </div>
      <p className="mt-8 text-sm text-fog">Dúvidas: {brand.supportEmail}</p>
    </main>
  );
}
