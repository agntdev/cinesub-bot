import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard, paginate } from "../toolkit/index.js";
import { getUserPayments, getPlanById } from "../storage.js";

const composer = new Composer<Ctx>();

function formatDate(iso: string): string {
  return iso.split("T")[0];
}

composer.callbackQuery("payment:history", async (ctx) => {
  await ctx.answerCallbackQuery();

  const userId = ctx.from?.id ?? 0;
  const payments = await getUserPayments(userId);

  if (payments.length === 0) {
    const kb = inlineKeyboard([
      [inlineButton("⬅️ Back to menu", "menu:main")],
    ]);
    await ctx.reply("No payment history yet.", { reply_markup: kb });
    return;
  }

  // Show first page
  await showPaymentsPage(ctx, payments, 0);
});

async function showPaymentsPage(ctx: Ctx, payments: Array<{id: string; userId: number; planId: string; amount: number; currency: string; status: string; date: string; gatewayRef?: string}>, page: number): Promise<void> {
  const { pageItems, controls, totalPages } = paginate(payments, {
    page,
    perPage: 5,
    callbackPrefix: "payments",
  });

  let text = `💳 Payment History (${payments.length} transactions)\n\n`;

  for (const p of pageItems) {
    const plan = await getPlanById(p.planId);
    const status = p.status === "completed" ? "✅" : p.status === "failed" ? "❌" : "⏳";
    text += `${status} ${formatDate(p.date)} — ${plan?.name ?? p.planId} — ${p.currency} ${p.amount.toFixed(2)}\n`;
  }

  text += `\nPage ${page + 1} of ${totalPages}`;

  const kb = inlineKeyboard([
    ...controls.inline_keyboard,
    [inlineButton("⬅️ Back to menu", "menu:main")],
  ]);

  await ctx.reply(text, { reply_markup: kb });
}

// Pagination callbacks
composer.callbackQuery(/^payments:prev:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const page = parseInt(ctx.match?.[1] ?? "0", 10);
  const userId = ctx.from?.id ?? 0;
  const payments = await getUserPayments(userId);
  await showPaymentsPage(ctx, payments, page);
});

composer.callbackQuery(/^payments:next:(\d+)$/, async (ctx) => {
  await ctx.answerCallbackQuery();
  const page = parseInt(ctx.match?.[1] ?? "0", 10);
  const userId = ctx.from?.id ?? 0;
  const payments = await getUserPayments(userId);
  await showPaymentsPage(ctx, payments, page);
});

export default composer;
