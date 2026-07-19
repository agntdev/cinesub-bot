import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard } from "../toolkit/index.js";
import { getUserSubscription, getPlans, getPlanById, setUserSubscription, addPaymentRecord, generatePaymentId, calculateNextBillingDate } from "../storage.js";

const composer = new Composer<Ctx>();

function formatPrice(price: number, currency: string): string {
  return `${currency} ${price.toFixed(2)}`;
}

function formatInterval(interval: "monthly" | "yearly"): string {
  return interval === "monthly" ? "month" : "year";
}

composer.callbackQuery("subscription:change", async (ctx) => {
  await ctx.answerCallbackQuery();

  const userId = ctx.from?.id ?? 0;
  const currentSub = await getUserSubscription(userId);

  if (!currentSub || currentSub.status === "cancelled") {
    const kb = inlineKeyboard([
      [inlineButton("🎟 Subscribe", "subscribe:start")],
      [inlineButton("⬅️ Back to menu", "menu:main")],
    ]);
    await ctx.reply("You don't have an active subscription to change.", { reply_markup: kb });
    return;
  }

  const currentPlan = await getPlanById(currentSub.planId);
  const allPlans = await getPlans();

  const availablePlans = allPlans.filter((p) => p.id !== currentSub.planId);

  if (availablePlans.length === 0) {
    await ctx.reply("You're already on the best plan available!");
    return;
  }

  let text = `Current plan: ${currentPlan?.name ?? currentSub.planId}\n\n`;
  text += "Select a new plan:\n\n";

  const rows = availablePlans.map((plan) => {
    const priceDiff = plan.price - (currentPlan?.price ?? 0);
    const diffText = priceDiff > 0 ? `(+${formatPrice(priceDiff, plan.currency)})` : priceDiff < 0 ? `(${formatPrice(priceDiff, plan.currency)})` : "";
    return [
      inlineButton(
        `${plan.name} — ${formatPrice(plan.price, plan.currency)} ${diffText}`.trim(),
        `change:select:${plan.id}`,
      ),
    ];
  });

  rows.push([inlineButton("⬅️ Back to menu", "menu:main")]);

  await ctx.reply(text, { reply_markup: inlineKeyboard(rows) });
});

composer.callbackQuery(/^change:select:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();

  const planId = ctx.match?.[1];
  const userId = ctx.from?.id ?? 0;
  const currentSub = await getUserSubscription(userId);

  if (!currentSub || !planId) return;

  const newPlan = await getPlanById(planId);
  const currentPlan = await getPlanById(currentSub.planId);

  if (!newPlan || !currentPlan) return;

  const priceDiff = newPlan.price - currentPlan.price;

  let text = `Change plan: ${currentPlan.name} → ${newPlan.name}\n\n`;
  text += `New price: ${formatPrice(newPlan.price, newPlan.currency)}/${formatInterval(newPlan.billingInterval)}\n`;

  if (priceDiff > 0) {
    text += `Difference: +${formatPrice(priceDiff, newPlan.currency)}/month\n`;
  } else if (priceDiff < 0) {
    text += `Difference: ${formatPrice(priceDiff, newPlan.currency)}/month (credit)\n`;
  }

  text += "\nConfirm plan change?";

  const kb = inlineKeyboard([
    [inlineButton("✅ Confirm Change", `change:confirm:${planId}`)],
    [inlineButton("⬅️ Back to plans", "subscription:change")],
  ]);

  await ctx.editMessageText(text, { reply_markup: kb });
});

composer.callbackQuery(/^change:confirm:(.+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();

  const planId = ctx.match?.[1];
  const userId = ctx.from?.id ?? 0;
  const newPlan = await getPlanById(planId);

  if (!newPlan) return;

  const now = new Date().toISOString();

  // Update subscription
  await setUserSubscription({
    userId,
    planId: newPlan.id,
    status: "active",
    startDate: now,
    nextBillingDate: calculateNextBillingDate(newPlan.billingInterval),
  });

  // Record payment (simulated proration)
  await addPaymentRecord({
    id: generatePaymentId(),
    userId,
    planId: newPlan.id,
    amount: newPlan.price,
    currency: newPlan.currency,
    status: "completed",
    date: now,
    gatewayRef: `gw_${Date.now()}`,
  });

  let confirmation = `✅ Plan changed to ${newPlan.name}!\n\n`;
  confirmation += `New price: ${formatPrice(newPlan.price, newPlan.currency)}/${formatInterval(newPlan.billingInterval)}\n`;
  confirmation += `Next billing: ${new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0]}`;

  const kb = inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]);

  await ctx.editMessageText(confirmation, { reply_markup: kb });
});

export default composer;
