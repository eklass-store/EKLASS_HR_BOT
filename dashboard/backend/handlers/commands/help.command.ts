// ============================================================
// src/handlers/commands/help.command.ts — /help & /cancel
// ============================================================
import { Bot } from 'grammy';
import { Env } from '../../types';
import { clearState } from '../../db/state.db';
import { getEmployeeByTelegramId } from '../../db/employees.db';
import { getMainMenu } from '../../keyboards/main.keyboards';

export function registerHelpCommand(bot: Bot, env: Env): void {
  bot.command('help', async (ctx) => {
    const helpText = `🤖 *مساعدة بوت الموارد البشرية*

*الأوامر:*
/start  — بدء البوت وعرض القائمة
/help   — عرض هذه الرسالة
/cancel — إلغاء العملية الجارية

*للموظف:*
✅ تسجيل الحضور — يسجّل وقت وصولك ويحسب التأخير
❌ تسجيل الانصراف — يسجّل وقت مغادرتك
🏖️ طلب إجازة — اختر النوع والتاريخ ويُرسل للمدير
💸 طلب سلفة — أرسل المبلغ والسبب ويُرسل للمدير
📋 سجل الحضور — حضورك وانصرافك للشهر الحالي
💰 راتبي — راتبك الأساسي والخصومات والصافي
🏷️ إجازاتي — سجل ورصيد إجازاتك

*للأدمن:*
⚙️ لوحة الإدارة ← إدارة الموظفين | رواتب | تقارير | إعدادات`;

    await ctx.reply(helpText, { parse_mode: 'Markdown' });
  });

  bot.command('cancel', async (ctx) => {
    const tid = String(ctx.from?.id);
    await clearState(env, tid);
    const emp = await getEmployeeByTelegramId(env, tid);
    await ctx.reply(
      '✅ تم إلغاء العملية الحالية.',
      emp ? { reply_markup: getMainMenu(emp.role === 'admin') } : {}
    );
  });
}
