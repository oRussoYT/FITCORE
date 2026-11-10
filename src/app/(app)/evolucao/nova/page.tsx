import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getAuthContext } from "@/lib/db/context";
import { NewAssessmentForm } from "./NewAssessmentForm";

export const metadata: Metadata = { title: "Nova avaliação" };

export default async function NewAssessmentPage() {
  const ctx = await getAuthContext();
  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 lg:py-10">
      <Link href="/evolucao" className="inline-flex items-center gap-1.5 text-[13px] text-mist hover:text-bone">
        <ArrowLeft className="size-3.5" /> Minha evolução
      </Link>
      <h1 className="type-display mt-4 text-[32px]">Nova avaliação</h1>
      <p className="mt-2 max-w-xl leading-relaxed text-mist">
        Meça sempre nas mesmas condições — de manhã, em jejum e antes de treinar — para que a comparação seja justa.
      </p>
      <NewAssessmentForm defaultHeight={ctx.profile.height_cm} />
    </div>
  );
}
