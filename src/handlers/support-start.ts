import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard } from "../toolkit/index.js";
import { getOpenSupportThread, createSupportThread, closeSupportThread, getUserSubscription } from "../storage.js";

const composer = new Composer<Ctx>();

composer.callbackQuery("support:start", async (ctx) => {
  await ctx.answerCallbackQuery();

  const userId = ctx.from?.id ?? 0;
  const existingThread = await getOpenSupportThread(userId);

  if (existingThread) {
    await ctx.reply("You already have an open support request. Please wait for a response.");
    return;
  }

  let text = "💬 Contact Support\n\n";
  text += "Describe your issue and we'll get back to you shortly.\n";
  text += "Please include:\n";
  text += "• What happened\n";
  text += "• When it happened\n";
  text += "• Any error messages you saw";

  const kb = inlineKeyboard([
    [inlineButton("📝 Send Message", "support:send")],
    [inlineButton("⬅️ Back to menu", "menu:main")],
  ]);

  await ctx.reply(text, { reply_markup: kb });
});

composer.callbackQuery("support:send", async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.reply("Please type your support message below:", {
    reply_markup: { force_reply: true, input_field_placeholder: "Describe your issue…" },
  });
  // Set session step to awaiting support message
  if (ctx.session) {
    (ctx.session as Record<string, unknown>).step = "awaiting_support_message";
  }
});

// Handle support message submission
composer.on("message:text", async (ctx, next) => {
  const session = ctx.session as Record<string, unknown> | undefined;
  if (!session || session.step !== "awaiting_support_message") {
    return next();
  }

  const userId = ctx.from?.id ?? 0;
  const thread = await createSupportThread(userId);
  const message = ctx.message.text;

  // In production, forward to admin chat via Telegram Bot API
  // For now, confirm receipt
  session.step = "idle";

  let text = "✅ Message sent!\n\n";
  text += "Our team will review your request and get back to you within 24 hours.\n";
  text += `Reference: ${thread.id}`;

  const kb = inlineKeyboard([
    [inlineButton("⬅️ Back to menu", "menu:main")],
  ]);

  await ctx.reply(text, { reply_markup: kb });
});

export default composer;
