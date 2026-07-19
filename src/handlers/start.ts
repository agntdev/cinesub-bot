import { Composer } from "grammy";
import type { Ctx } from "../bot.js";
import { registerMainMenuItem, mainMenuKeyboard } from "../toolkit/index.js";

// Register main menu items for all features
registerMainMenuItem({ label: "🎟 Subscribe", data: "subscribe:start", order: 10 });
registerMainMenuItem({ label: "📋 My Plan", data: "subscription:my", order: 20 });
registerMainMenuItem({ label: "🔄 Change Plan", data: "subscription:change", order: 30 });
registerMainMenuItem({ label: "❌ Cancel", data: "subscription:cancel", order: 40 });
registerMainMenuItem({ label: "💳 Payment History", data: "payment:history", order: 50 });
registerMainMenuItem({ label: "💬 Support", data: "support:start", order: 60 });

const composer = new Composer<Ctx>();

const WELCOME =
  "Welcome to MoviePass!\n\n" +
  "Your gateway to premium streaming. Pick a plan to get started, or manage your subscription below.";

composer.command("start", async (ctx) => {
  await ctx.reply(WELCOME, { reply_markup: mainMenuKeyboard() });
});

composer.callbackQuery("menu:main", async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.editMessageText(WELCOME, { reply_markup: mainMenuKeyboard() });
});

export default composer;
