/**
 * Fotos do banco gratuito Unsplash (licença Unsplash: uso comercial livre, sem necessidade de crédito).
 * Servidas direto do CDN do Unsplash, no tamanho certo para cada lugar.
 */
export const PHOTOS = {
  hero: "1581009146145-b5ef050c2e1e", // homem treinando com halter
  barbellFloor: "1517836357463-d25dfeac3438", // pessoa prestes a levantar a barra
  womanRack: "1574680096145-d05b474e2155", // mulher levantando a barra
  womanLifting: "1761839258420-5c3e2f2e2a74", // mulher levantando pesos
  ropes: "1599058917212-d750089bc07e", // cordas de batalha
  mono: "1507398941214-572c25f4b1dc", // treino em preto e branco
  group: "1554284126-aa88f22d8b74", // três pessoas com barras
  gymFloor: "1689877020200-403d8542d95d", // academia cheia de máquinas
  dumbbells: "1544033527-b192daee1f5b", // halteres
  mealPrep: "1543352632-5a4b24e4d2a6", // marmitas saudáveis
  vegBoard: "1466637574441-749b8f19452f", // ingredientes frescos
  coachSpot: "1758875569256-f37c438cac65", // personal acompanhando aluna
  coachPlan: "1758875569399-99a7d80ace43", // personal e aluno planejando treino
  tape: "1523901839036-a3030662f220", // fita métrica
} as const;

export function photo(id: string, width: number, height?: number) {
  const h = height ? `&h=${height}` : "";
  return `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${width}${h}&q=72`;
}
