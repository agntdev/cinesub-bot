// --- Data Models ---

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  billingInterval: "monthly" | "yearly";
  trialDays?: number;
  features: string[];
}

export interface UserSubscription {
  userId: number;
  planId: string;
  status: "active" | "cancelled" | "expired" | "trial";
  startDate: string;
  nextBillingDate: string;
  trialEndDate?: string;
}

export interface PaymentRecord {
  id: string;
  userId: number;
  planId: string;
  amount: number;
  currency: string;
  status: "completed" | "failed" | "pending" | "refunded";
  date: string;
  gatewayRef?: string;
}

export interface SupportThread {
  id: string;
  userId: number;
  status: "open" | "closed";
  createdAt: string;
}

// --- Default Plans ---

const DEFAULT_PLANS: SubscriptionPlan[] = [
  {
    id: "basic",
    name: "Basic",
    price: 9.99,
    currency: "USD",
    billingInterval: "monthly",
    features: ["HD streaming", "1 device", "Limited catalog"],
  },
  {
    id: "standard",
    name: "Standard",
    price: 14.99,
    currency: "USD",
    billingInterval: "monthly",
    trialDays: 7,
    features: ["Full HD streaming", "2 devices", "Full catalog", "Downloads"],
  },
  {
    id: "premium",
    name: "Premium",
    price: 19.99,
    currency: "USD",
    billingInterval: "monthly",
    trialDays: 14,
    features: ["4K streaming", "4 devices", "Full catalog", "Downloads", "Early access"],
  },
];

// --- In-memory storage (dev/test) ---
// In production, replace with Redis-backed storage using the toolkit's adapters.

const memoryStore: Record<string, string> = {};

function getKey(prefix: string, key: string): string {
  return `${prefix}:${key}`;
}

// --- API ---

export async function getPlans(): Promise<SubscriptionPlan[]> {
  const raw = memoryStore[getKey("plans", "all")];
  if (raw) return JSON.parse(raw) as SubscriptionPlan[];
  memoryStore[getKey("plans", "all")] = JSON.stringify(DEFAULT_PLANS);
  return DEFAULT_PLANS;
}

export async function getPlanById(planId: string): Promise<SubscriptionPlan | undefined> {
  const plans = await getPlans();
  return plans.find((p) => p.id === planId);
}

export async function getUserSubscription(userId: number): Promise<UserSubscription | undefined> {
  const raw = memoryStore[getKey("sub", String(userId))];
  if (!raw) return undefined;
  return JSON.parse(raw) as UserSubscription;
}

export async function setUserSubscription(sub: UserSubscription): Promise<void> {
  memoryStore[getKey("sub", String(sub.userId))] = JSON.stringify(sub);
}

export async function deleteUserSubscription(userId: number): Promise<void> {
  delete memoryStore[getKey("sub", String(userId))];
}

export async function addPaymentRecord(record: PaymentRecord): Promise<void> {
  const key = getKey("payments", `user:${record.userId}`);
  const existing = memoryStore[key];
  const records: PaymentRecord[] = existing ? JSON.parse(existing) : [];
  records.push(record);
  memoryStore[key] = JSON.stringify(records);
}

export async function getUserPayments(userId: number): Promise<PaymentRecord[]> {
  const raw = memoryStore[getKey("payments", `user:${userId}`)];
  if (!raw) return [];
  return JSON.parse(raw) as PaymentRecord[];
}

export async function createSupportThread(userId: number): Promise<SupportThread> {
  const thread: SupportThread = {
    id: `support:${userId}:${Date.now()}`,
    userId,
    status: "open",
    createdAt: new Date().toISOString(),
  };
  memoryStore[getKey("support", String(userId))] = JSON.stringify([thread]);
  return thread;
}

export async function getOpenSupportThread(userId: number): Promise<SupportThread | undefined> {
  const raw = memoryStore[getKey("support", String(userId))];
  if (!raw) return undefined;
  const threads = JSON.parse(raw) as SupportThread[];
  return threads.find((t) => t.status === "open");
}

export async function closeSupportThread(userId: number): Promise<void> {
  const raw = memoryStore[getKey("support", String(userId))];
  if (!raw) return;
  const threads = JSON.parse(raw) as SupportThread[];
  const open = threads.find((t) => t.status === "open");
  if (open) open.status = "closed";
  memoryStore[getKey("support", String(userId))] = JSON.stringify(threads);
}

export function generatePaymentId(): string {
  return `pay_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function calculateNextBillingDate(interval: "monthly" | "yearly"): string {
  const now = new Date();
  if (interval === "monthly") {
    now.setMonth(now.getMonth() + 1);
  } else {
    now.setFullYear(now.getFullYear() + 1);
  }
  return now.toISOString();
}

export function calculateTrialEndDate(days: number): string {
  const now = new Date();
  now.setDate(now.getDate() + days);
  return now.toISOString();
}
