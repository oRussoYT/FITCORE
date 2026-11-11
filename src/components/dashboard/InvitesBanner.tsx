import { ActionButton } from "@/components/ui/ActionButton";
import { respondInvite } from "@/app/(app)/actions";

export type PendingInvite = { id: string; role: "student" | "trainer"; gym_name: string };

/** Convites de academia aguardando a decisão do próprio usuário. */
export function InvitesBanner({ invites }: { invites: PendingInvite[] }) {
  if (invites.length === 0) return null;
  return (
    <div className="space-y-3">
      {invites.map((i) => (
        <div key={i.id} className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-lime/40 bg-lime/[0.07] px-5 py-4">
          <div className="max-w-xl">
            <p className="font-semibold">
              {i.gym_name} convidou você como {i.role === "trainer" ? "personal trainer" : "aluno"}
            </p>
            <p className="mt-1 text-[13px] leading-relaxed text-mist">
              {i.role === "trainer"
                ? "Ao aceitar, você passa a ver os alunos que a academia vincular a você."
                : "Ao aceitar, a academia e o personal vinculado passam a ver suas avaliações e treinos. Fotos e conversas com a IA continuam só suas."}
            </p>
          </div>
          <div className="flex items-start gap-2">
            <ActionButton size="sm" variant="ghost" action={respondInvite.bind(null, i.id, false)}>
              Recusar
            </ActionButton>
            <ActionButton size="sm" action={respondInvite.bind(null, i.id, true)}>
              Aceitar
            </ActionButton>
          </div>
        </div>
      ))}
    </div>
  );
}
