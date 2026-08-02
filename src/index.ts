import { Bot, Context, InputFile, InlineKeyboard } from "grammy";
import * as xlsx from "xlsx";

export interface Env {
  DB: D1Database;
  BOT_TOKEN: string;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    if (!env.BOT_TOKEN) {
      return new Response("BOT_TOKEN is missing", { status: 500 });
    }

    const bot = new Bot(env.BOT_TOKEN);

    // Helpers
    const getEmployee = async (telegram_id: string) => {
      return await env.DB.prepare("SELECT * FROM Employees WHERE telegram_id = ?").bind(telegram_id).first();
    };

    const getSettings = async () => {
      const results = await env.DB.prepare("SELECT key, value FROM Settings").all();
      const settings: any = {};
      results.results.forEach((row: any) => {
        settings[row.key] = row.value;
      });
      return settings;
    };

    // Keyboards
    const getMainMenu = (isAdmin: boolean) => {
      const kb = new InlineKeyboard()
        .text("✅ تسجيل الحضور", "action_checkin")
        .text("❌ تسجيل الانصراف", "action_checkout").row()
        .text("🏖️ طلب إجازة", "action_leave")
        .text("💸 طلب سلفة", "action_loan").row()
        .text("💰 راتبي", "action_salary");
      
      if (isAdmin) {
        kb.row().text("⚙️ لوحة الإدارة", "admin_panel");
      }
      return kb;
    };

    const getAdminMenu = () => {
      return new InlineKeyboard()
        .text("📢 إرسال تعميم", "admin_broadcast")
        .text("📊 إصدار الرواتب", "admin_payroll").row()
        .text("🔙 رجوع", "back_to_main");
    };

    // 1. Start Command
    bot.command("start", async (ctx) => {
      const tid = String(ctx.from?.id);
      const emp: any = await getEmployee(tid);
      
      if (!emp) {
        return ctx.reply("أهلاً بك! أنت غير مسجل في نظام الموارد البشرية. يرجى مراجعة الإدارة.");
      }
      
      await ctx.reply(
        `أهلاً بك ${emp.full_name}! 🏢\nاختر من القائمة أدناه:`, 
        { reply_markup: getMainMenu(emp.role === 'admin') }
      );
    });

    // 2. Callback Queries (Button Clicks)
    bot.on("callback_query:data", async (ctx) => {
      const data = ctx.callbackQuery.data;
      const tid = String(ctx.from?.id);
      const emp: any = await getEmployee(tid);

      if (!emp) return ctx.answerCallbackQuery("أنت غير مسجل!");

      try {
        const today = new Date().toISOString().split("T")[0];
        const time = new Date().toISOString().split("T")[1].substring(0, 5);

        if (data === "back_to_main") {
            await ctx.editMessageText(`أهلاً بك ${emp.full_name}! 🏢\nاختر من القائمة أدناه:`, { reply_markup: getMainMenu(emp.role === 'admin') });
            return ctx.answerCallbackQuery();
        }

        if (data === "action_checkin") {
          const settings = await getSettings();
          const startWorkTime = settings.work_start_time || "09:00";
          
          let lateMinutes = 0;
          if (time > startWorkTime) {
              const [h1, m1] = time.split(':').map(Number);
              const [h2, m2] = startWorkTime.split(':').map(Number);
              lateMinutes = (h1 * 60 + m1) - (h2 * 60 + m2);
          }

          try {
            await env.DB.prepare("INSERT INTO Attendance (employee_id, date, check_in_time, late_minutes) VALUES (?, ?, ?, ?)")
              .bind(emp.id, today, time, lateMinutes).run();
            let msg = `✅ تم تسجيل حضورك الساعة ${time}.`;
            if (lateMinutes > 0) msg += `\n⚠️ تنبيه: لقد تأخرت ${lateMinutes} دقيقة عن موعد بدء الدوام الرسمي.`;
            await ctx.editMessageText(msg, { reply_markup: getMainMenu(emp.role === 'admin') });
          } catch(e) {
            await ctx.answerCallbackQuery("⚠️ لقد قمت بتسجيل الدخول مسبقاً اليوم!");
          }
        } 
        
        else if (data === "action_checkout") {
          try {
            const res = await env.DB.prepare("UPDATE Attendance SET check_out_time = ? WHERE employee_id = ? AND date = ?")
              .bind(time, emp.id, today).run();
            if (res.meta.changes === 0) {
               await ctx.answerCallbackQuery("⚠️ لم تقم بتسجيل الدخول اليوم!");
            } else {
               await ctx.editMessageText(`❌ تم تسجيل انصرافك الساعة ${time}. نتمنى لك وقتاً ممتعاً!`, { reply_markup: getMainMenu(emp.role === 'admin') });
            }
          } catch(e) {
            await ctx.answerCallbackQuery("حدث خطأ.");
          }
        }

        else if (data === "action_leave") {
            // Simplified leave request flow for demonstration
            await env.DB.prepare("INSERT INTO Leaves (employee_id, start_date, end_date, type, status) VALUES (?, ?, ?, ?, ?)")
                .bind(emp.id, today, today, 'annual', 'pending').run();
            
            // Notify Admins
            const admins = await env.DB.prepare("SELECT telegram_id FROM Employees WHERE role = 'admin'").all();
            const leaveIdRes = await env.DB.prepare("SELECT id FROM Leaves ORDER BY id DESC LIMIT 1").first();
            const leaveId = (leaveIdRes as any)?.id;

            const adminKb = new InlineKeyboard()
                .text("✅ موافقة", `approve_leave_${leaveId}`)
                .text("❌ رفض", `reject_leave_${leaveId}`);
            
            for (const admin of admins.results) {
                try {
                    await bot.api.sendMessage(admin.telegram_id as string, `📩 طلب إجازة جديد من: ${emp.full_name}`, { reply_markup: adminKb });
                } catch(e) {} // ignore if admin blocked bot
            }
            await ctx.editMessageText("تم إرسال طلب الإجازة للمدير بانتظار الموافقة ⏳", { reply_markup: getMainMenu(emp.role === 'admin') });
        }

        else if (data === "action_salary") {
            await ctx.editMessageText(`💰 راتبك الأساسي المسجل هو: ${emp.base_salary}`, { reply_markup: getMainMenu(emp.role === 'admin') });
        }

        else if (data === "action_loan") {
            await ctx.editMessageText("لم يتم تفعيل هذه الميزة برمجياً بعد (تحت التطوير 🚧).", { reply_markup: getMainMenu(emp.role === 'admin') });
        }

        // Admin Actions
        else if (data === "admin_panel") {
            if (emp.role !== 'admin') return ctx.answerCallbackQuery("غير مصرح لك!");
            await ctx.editMessageText("⚙️ لوحة الإدارة:\nاختر الإجراء المطلوب:", { reply_markup: getAdminMenu() });
        }

        else if (data.startsWith("approve_leave_") || data.startsWith("reject_leave_")) {
             if (emp.role !== 'admin') return ctx.answerCallbackQuery("غير مصرح لك!");
             const isApprove = data.startsWith("approve");
             const lId = data.split("_")[2];
             const status = isApprove ? 'approved' : 'rejected';
             
             await env.DB.prepare("UPDATE Leaves SET status = ? WHERE id = ?").bind(status, lId).run();
             await ctx.editMessageText(`تم ${isApprove ? 'الموافقة على' : 'رفض'} الإجازة ✅`);
             
             // In a real scenario, we should fetch the employee's ID from the leave record and notify them.
        }

        else if (data === "admin_broadcast") {
             if (emp.role !== 'admin') return ctx.answerCallbackQuery("غير مصرح لك!");
             await ctx.answerCallbackQuery("لإرسال تعميم، استخدم الأمر:\n/broadcast [رسالتك]");
        }
        else {
             await ctx.answerCallbackQuery("جاري معالجة طلبك...");
        }

      } catch (err) {
        console.error(err);
        await ctx.answerCallbackQuery("حدث خطأ في النظام!");
      }
    });

    bot.command("broadcast", async (ctx) => {
        const tid = String(ctx.from?.id);
        const admin: any = await getEmployee(tid);
        if (!admin || admin.role !== 'admin') return;

        const text = ctx.message?.text?.replace("/broadcast ", "");
        if (!text || text === "/broadcast") return ctx.reply("يرجى كتابة الرسالة بعد الأمر.");

        await env.DB.prepare("INSERT INTO Announcements (message, created_by) VALUES (?, ?)").bind(text, admin.id).run();
        
        const allEmp = await env.DB.prepare("SELECT telegram_id FROM Employees").all();
        let sentCount = 0;
        for (const e of allEmp.results) {
            try {
                await bot.api.sendMessage(e.telegram_id as string, `📢 تعميم إداري:\n\n${text}`);
                sentCount++;
            } catch(err) {}
        }
        await ctx.reply(`تم إرسال التعميم إلى ${sentCount} موظف بنجاح.`);
    });

    // API Routes for Web Dashboard (Future Proofing)
    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/api/stats") {
         const empCount = (await env.DB.prepare("SELECT COUNT(*) as c FROM Employees").first()) as any;
         const attCount = (await env.DB.prepare("SELECT COUNT(*) as c FROM Attendance").first()) as any;
         return new Response(JSON.stringify({ employees: empCount?.c || 0, attendance_records: attCount?.c || 0 }), {
             headers: { "Content-Type": "application/json" }
         });
    }

    // Webhook Logic
    if (request.method === "POST" && url.pathname !== "/api/stats") {
      try {
        const payload = await request.json();
        await bot.handleUpdate(payload as any);
        return new Response("OK");
      } catch (err) {
        console.error(err);
        return new Response("Error", { status: 500 });
      }
    }

    return new Response("HR Bot System (V2) is running! 🚀 API endpoints are ready.");
  },
};
