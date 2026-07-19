import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard } from "../toolkit/index.js";
import { getUserSubscription, getPlanById } from "../storage.js";

const composer = new Composer<Ctx>();

function formatDate(iso: string): string {
  return iso.split("T")[0];
}

composer.callbackQuery("subscription:my", async (ctx) => {
  await ctx.answerCallbackQuery();

  const userId = ctx.from?.id ?? 0;
  const sub = await getUserSubscription(userId);

  if (!sub) {
    const kb = inlineKeyboard([
      [inlineButton("🎟 Subscribe", "subscribe:start")],
      [inlineButton("⬅️ Back to menu", "menu:main")],
    ]);
    await ctx.reply("You don't have an active subscription yet.", { reply_markup: kb });
    return;
  }

  const plan = await getPlanById(sub.planId);
  const planName = plan?.name ?? sub.planId;

  let text = `📋 Your Subscription\n\n`;
  text += `Plan: ${planName}\n`;
  text += `Status: ${sub.status === "active" ? "✅ Active" : sub.status === "trial" ? "⏳ Trial" : "❌ Cancelled"}\n`;
  text += `Next billing: ${formatDate(sub.nextBillingDate)}\n`;

  if (sub.trialEndDate) {
    text += `Trial ends: ${formatDate(sub.trialEndDate)}\n`;
  }

  const kb = inlineKeyboard([
    [inlineButton("🔄 Change Plan", "subscription:change")],
    [inlineButton("❌ Cancel Subscription", "subscription:cancel")],
    [inlineButton("⬅️ Back to menu", "menu:main")],
  ]);

  await ctx.reply(text, { reply_markup: kb });
});

export default composer;
