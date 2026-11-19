// Server-side helpers for the calculator's stored plans. Never import from a
// client component: this reaches the database with the service role.

import { randomBytes } from 'crypto';
import { serviceClient } from '@/lib/supabase';
import { canonical } from '@/lib/seo';
import { BASE, type Plan } from './model';
import { PlanSchema, sharePath } from './share';

const ALPHABET = 'abcdefghijkmnpqrstuvwxyz23456789'; // no 0/o/1/l, easier to read aloud

export function newShareId(length = 10): string {
  const bytes = randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}

export function shortShareUrl(shareId: string): string {
  return canonical(`/calculator?s=${shareId}`);
}

/** The long form, with the plan in the link, when a row could not be stored. */
export function longShareUrl(plan: Plan, name?: string): string {
  return canonical(sharePath(plan, name));
}

export interface StoredPlan {
  S: Plan;
  name: string | null;
}

/** The plan behind a short link, or null when there is none. Never the email. */
export async function loadSharedPlan(shareId: string): Promise<StoredPlan | null> {
  if (!/^[a-z2-9]{6,16}$/.test(shareId)) return null;
  try {
    const supabase = serviceClient();
    const { data, error } = await supabase
      .from('calculator_plans')
      .select('plan, plan_name')
      .eq('share_id', shareId)
      .maybeSingle();
    if (error || !data) return null;
    const parsed = PlanSchema.safeParse(data.plan);
    if (!parsed.success) return null;
    return { S: { ...BASE, ...parsed.data } as Plan, name: (data.plan_name as string | null) ?? null };
  } catch {
    return null;
  }
}
