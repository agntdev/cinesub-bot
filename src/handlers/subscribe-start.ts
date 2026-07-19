import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard } from "../toolkit/index.js";
import { getPlans, getUserSubscription, setUserSubscription, addPaymentRecord, generatePaymentId, calculateNextBillingDate, calculateTrialEndDate, getPlanById } from "../storage.js";

const composer = new Composer<Ctx>();

function formatPrice(price: number, currency: string): string {
  return `${currency} ${price.toFixed(2)}`;
}

function formatInterval(interval: "monthly" | "yearly"): string {
  return interval === "monthly" ? "month" : "year";
}

async function showPlans(ctx: Ctx): Promise<void> {
  const plans = await getPlans();
  const userSub = await getUserSubscription(ctx.from?.id ?? 0);

  const rows = plans.map((plan) => [
    inlineButton(
      `${plan.name} — ${formatPrice(plan.price, plan.currency)}/${formatInterval(plan.billingInterval)}`,
      `plan:select:${plan.id}`,
    ),
  ]);

  rows.push([inlineButton("⬅️ Back to menu", "menu:main")]);

  let text = "Choose a plan to start streaming:\n\n";
  for (let i = 0; i < plans.length; i++) {
    const plan = plans[i];
    text += `• ${plan.name} — ${formatPrice(plan.price, plan.currency)}/${formatInterval(plan.billingInterval)}`;
    if (plan.trialDays) text += ` (${plan.trialDays}-day free trial)`;
    text += "\n";
    text += `  ${plan.features.join(", ")}`;
    if (i < plans.length - 1) text += "\n\n";
  }

  if (userSub) {
    text += "You already have an active subscription. Change or cancel it from the menu.";
  }

  await ctx.reply(text, { reply_markup: inlineKeyboard(rows) });
}

composer.callbackQuery("subscribe:start", async (ctx) => {
  await ctx.answerCallbackQuery();
  await showPlans(ctx);
});

composer.callbackQuery(/^plan:select:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const planId = ctx.match?.[1];
  if (!planId) return;

  const plan = await getPlanById(planId);
  if (!plan) {
    await ctx.reply("Plan not found. Please try again.");
    return;
  }

  const userId = ctx.from?.id ?? 0;
  const existing = await getUserSubscription(userId);
  if (existing && existing.status === "active") {
    await ctx.reply("You already have an active subscription. Use Change Plan to switch.");
    return;
  }

  let summary = `You selected: ${plan.name}\n\n`;
  summary += `Price: ${formatPrice(plan.price, plan.currency)}/${formatInterval(plan.billingInterval)}`;
  if (plan.trialDays) summary += `\nFree trial: ${plan.trialDays} days`;
  summary += `\n\nFeatures:\n`;
  for (const f of plan.features) {
    summary += `• ${f}\n`;
  }
  summary += "\nProceed with payment?";

  const keyboard = inlineKeyboard([
    [inlineButton("✅ Confirm & Pay", `plan:confirm:${planId}`)],
    [inlineButton("⬅️ Back to plans", "subscribe:start")],
  ]);

  await ctx.editMessageText(summary, { reply_markup: keyboard });
});

composer.callbackQuery(/^plan:confirm:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const planId = ctx.match?.[1];
  if (!planId) return;

  const plan = await getPlanById(planId);
  if (!plan) {
    await ctx.reply("Plan not found. Please try again.");
    return;
  }

  const userId = ctx.from?.id ?? 0;
  const now = new Date().toISOString();

  // Create subscription
  const sub = {
    userId,
    planId: plan.id,
    status: plan.trialDays ? ("trial" as const) : ("active" as const),
    startDate: now,
    nextBillingDate: calculateNextBillingDate(plan.billingInterval),
    trialEndDate: plan.trialDays ? calculateTrialEndDate(plan.trialDays) : undefined,
  };

  await setUserSubscription(sub);

  // Create payment record (simulated — real gateway would process this)
  await addPaymentRecord({
    id: generatePaymentId(),
    userId,
    planId: plan.id,
    amount: plan.price,
    currency: plan.currency,
    status: "completed",
    date: now,
    gatewayRef: `gw_${Date.now()}`,
  });

  let confirmation = `✅ Subscription confirmed!\n\n`;
  confirmation += `Plan: ${plan.name}\n`;
  if (plan.trialDays) {
    confirmation += `Trial ends: ${sub.trialEndDate?.split("T")[0]}\n`;
  }
  confirmation += `Next billing: ${sub.nextBillingDate.split("T")[0]}\n`;
  confirmation += `Amount: ${formatPrice(plan.price, plan.currency)}/${formatInterval(plan.billingInterval)}\n\n`;
  confirmation += "Enjoy your streaming!";

  const keyboard = inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]);

  await ctx.editMessageText(confirmation, { reply_markup: keyboard });
});

export default composer;
