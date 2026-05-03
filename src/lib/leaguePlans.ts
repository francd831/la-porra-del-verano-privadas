export type LeaguePlanId = "free" | "pro" | "max" | "business";

export interface LeaguePlan {
  id: LeaguePlanId;
  name: string;
  maxMembers: number;
  description: string;
  stripeReady: boolean;
}

export const LEAGUE_PLANS: LeaguePlan[] = [
  {
    id: "free",
    name: "Free",
    maxMembers: 10,
    description: "Para grupos pequenos y pruebas internas.",
    stripeReady: false,
  },
  {
    id: "pro",
    name: "Pro",
    maxMembers: 50,
    description: "Para grupos medianos con mas participantes.",
    stripeReady: false,
  },
  {
    id: "max",
    name: "Max",
    maxMembers: 150,
    description: "Para comunidades grandes y rankings amplios.",
    stripeReady: false,
  },
  {
    id: "business",
    name: "Business",
    maxMembers: 500,
    description: "Para empresas, eventos y organizadores.",
    stripeReady: false,
  },
];

export const LEAGUE_PLAN_BY_ID = LEAGUE_PLANS.reduce<Record<string, LeaguePlan>>((plans, plan) => {
  plans[plan.id] = plan;
  return plans;
}, {});

export function getLeaguePlan(planId: string | null | undefined) {
  return LEAGUE_PLAN_BY_ID[planId || ""] || LEAGUE_PLAN_BY_ID.free;
}

