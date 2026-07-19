import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard, confirmKeyboard } from "../toolkit/index.js";
import { getUserSubscription, getPlanById, deleteUserSubscription } from "../storage.js";

const composer = new Composer<Ctx>();

composer.callbackQuery("subscription:cancel", async (ctx) => {
  await ctx.answerCallbackQuery();

  const userId = ctx.from?.id ?? 0;
  const sub = await getUserSubscription(userId);

  if (!sub || sub.status === "cancelled") {
    const kb = inlineKeyboard([
      [inlineButton("🎟 Subscribe", "subscribe:start")],
      [inlineButton("⬅️ Back to menu", "menu:main")],
    ]);
    await ctx.reply("You don't have an active subscription to cancel.", { reply_markup: kb });
    return;
  }

  const plan = await getPlanById(sub.planId);

  let text = `Cancel ${plan?.name ?? sub.planId} subscription?\n\n`;
  text += `Your subscription will remain active until the end of the current billing period (${sub.nextBillingDate.split("T")[0]}).\n\n`;
  text += "After cancellation, you'll lose access to premium content.";

  const kb = confirmKeyboard("confirm:cancel", { yes: "✅ Yes, cancel", no: "❌ Keep subscription" });

  await ctx.reply(text, { reply_markup: kb });
});

composer.callbackQuery("confirm:cancel:yes", async (ctx) => {
  await ctx.answerCallbackQuery();

  const userId = ctx.from?.id ?? 0;
  const sub = await getUserSubscription(userId);

  if (!sub) {
    await ctx.reply("Subscription not found.");
    return;
  }

  // Mark as cancelled
  await deleteUserSubscription(userId);

  let text = `✅ Subscription cancelled.\n\n`;
  text += `Your access continues until ${sub.nextBillingDate.split("T")[0]}.\n`;
  text += "We'd love to have you back — just tap 🎟 Subscribe anytime!";

  const kb = inlineKeyboard([
    [inlineButton("🎟 Resubscribe", "subscribe:start")],
    [inlineButton("⬅️ Back to menu", "menu:main")],
  ]);

  await ctx.reply(text, { reply_markup: kb });
});

composer.callbackQuery("confirm:cancel:no", async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.reply("Great — your subscription stays active! 🎉");
});

export default composer;
