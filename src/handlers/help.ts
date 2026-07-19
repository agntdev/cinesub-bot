import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { inlineButton, inlineKeyboard } from "../toolkit/index.js";

const composer = new Composer<Ctx>();

const HELP =
  "Here's how MoviePass works:\n\n" +
  "Tap 🎟 Subscribe to see our plans and start streaming.\n" +
  "Tap 📋 My Plan to check your subscription status.\n" +
  "Tap 💳 Payment History to see past charges.\n" +
  "Tap 💬 Support if you need help.\n\n" +
  "Everything is button-driven — just tap below!";

const backToMenu = inlineKeyboard([[inlineButton("⬅️ Back to menu", "menu:main")]]);

composer.command("help", async (ctx) => {
  await ctx.reply(HELP);
});

composer.callbackQuery("menu:help", async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.editMessageText(HELP, { reply_markup: backToMenu });
});

export default composer;
