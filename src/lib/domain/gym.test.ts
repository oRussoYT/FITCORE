import { describe, expect, it } from "vitest";
import { formatBRL, gymOverview, lowFrequency } from "./gym";

const now = new Date(2026, 10, 12, 15);
const iso = (y: number, m: number, d: number) => new Date(y, m, d, 10).toISOString();

describe("visão da academia", () => {
  const students = [
    { id: "a", status: "active" as const, created_at: iso(2026, 10, 1) },
    { id: "b", status: "active" as const, created_at: iso(2026, 5, 1) },
    { id: "c", status: "inactive" as const, created_at: iso(2026, 1, 1) },
  ];
  const sessions = [
    { student_id: "a", started_at: iso(2026, 10, 12) },
    { student_id: "a", started_at: iso(2026, 10, 10) },
    { student_id: "a", started_at: iso(2026, 9, 1) },
  ];
  const subscriptions = [
    { id: "s1", student_id: "a", gym_plan_id: "p1", status: "active" as const, started_at: "2026-10-01", canceled_at: null },
    { id: "s2", student_id: "b", gym_plan_id: "p1", status: "active" as const, started_at: "2026-06-01", canceled_at: null },
    { id: "s3", student_id: "c", gym_plan_id: "p2", status: "canceled" as const, started_at: "2026-02-01", canceled_at: iso(2026, 10, 5) },
  ];
  const payments = [
    { amount_cents: 12000, paid_at: iso(2026, 10, 3), status: "paid" },
    { amount_cents: 12000, paid_at: iso(2026, 9, 3), status: "paid" },
    { amount_cents: 9000, paid_at: null, status: "pending" },
  ];
  const plans = [
    { id: "p1", name: "Mensal" },
    { id: "p2", name: "Anual" },
  ];
  const o = gymOverview({ students, sessions, subscriptions, payments, plans, days: 30, now });

  it("conta alunos", () => {
    expect(o.total).toBe(3);
    expect(o.active).toBe(2);
    expect(o.inactive).toBe(1);
    expect(o.newInPeriod).toBe(1);
  });
  it("conta frequência", () => {
    expect(o.todayCount).toBe(1);
    expect(o.weekCount).toBe(2);
    expect(o.byDay).toHaveLength(30);
    expect(o.byDay.at(-1)?.count).toBe(1);
  });
  it("soma só pagamentos confirmados do mês", () => {
    expect(o.revenueMonthCents).toBe(12000);
    expect(formatBRL(o.revenueMonthCents)).toContain("120,00");
  });
  it("calcula cancelamento e retenção", () => {
    expect(o.cancelRate).toBeCloseTo(1 / 3);
    expect(o.retention).toBe(0.5);
  });
  it("ordena planos mais vendidos ignorando cancelados", () => {
    expect(o.topPlans).toEqual([{ name: "Mensal", count: 2 }]);
  });
  it("aponta baixa frequência", () => {
    expect(lowFrequency(students, sessions, 2, now)).toEqual([{ id: "b", sessions: 0 }]);
  });
  it("não inventa taxas sem dados", () => {
    const empty = gymOverview({ students: [], sessions: [], subscriptions: [], payments: [], plans: [], days: 7, now });
    expect(empty.cancelRate).toBeNull();
    expect(empty.retention).toBeNull();
  });
});
