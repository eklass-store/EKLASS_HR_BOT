import { Bot, Context, InputFile } from "grammy";
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

    // دالة مساعدة للتحقق من الموظف
    const getEmployee = async (telegram_id: string) => {
      const stmt = await env.DB.prepare("SELECT * FROM Employees WHERE telegram_id = ?").bind(telegram_id).first();
      return stmt;
    };

    // 1. أمر البداية
    bot.command("start", async (ctx) => {
      const tid = String(ctx.from?.id);
      const emp = await getEmployee(tid);
      
      if (!emp) {
        return ctx.reply("أهلاً بك! أنت غير مسجل في نظام الموارد البشرية. يرجى مراجعة المدير.");
      }
      
      await ctx.reply(`أهلاً بك ${emp.full_name}! 🤖\nأوامر النظام:\n/checkin - تسجيل حضور\n/checkout - تسجيل انصراف\n/leave - طلب إجازة`);
      
      if (emp.role === 'admin') {
        await ctx.reply("أوامر المدير:\n/admin_add_user [ID] [Name] [Salary]\n/archive_month - لأرشفة الشهر الحالي ومسح البيانات.");
      }
    });

    // 2. تسجيل الحضور
    bot.command("checkin", async (ctx) => {
      const tid = String(ctx.from?.id);
      const emp: any = await getEmployee(tid);
      if (!emp) return ctx.reply("عذراً، أنت غير مسجل.");

      const today = new Date().toISOString().split("T")[0];
      const time = new Date().toISOString().split("T")[1].substring(0, 5);

      try {
        await env.DB.prepare("INSERT INTO Attendance (employee_id, date, check_in_time) VALUES (?, ?, ?)")
          .bind(emp.id, today, time).run();
        await ctx.reply(`تم تسجيل حضورك بنجاح الساعة ${time} بتوقيت السيرفر.`);
      } catch(e) {
        await ctx.reply("حدث خطأ أو ربما قمت بتسجيل الحضور مسبقاً اليوم.");
      }
    });

    // 3. تسجيل الانصراف
    bot.command("checkout", async (ctx) => {
        const tid = String(ctx.from?.id);
        const emp: any = await getEmployee(tid);
        if (!emp) return ctx.reply("عذراً، أنت غير مسجل.");
  
        const today = new Date().toISOString().split("T")[0];
        const time = new Date().toISOString().split("T")[1].substring(0, 5);
  
        try {
          await env.DB.prepare("UPDATE Attendance SET check_out_time = ? WHERE employee_id = ? AND date = ?")
            .bind(time, emp.id, today).run();
          await ctx.reply(`تم تسجيل انصرافك بنجاح الساعة ${time}.`);
        } catch(e) {
          await ctx.reply("حدث خطأ في تسجيل الانصراف.");
        }
    });

    // 4. أوامر المدير - إضافة موظف
    bot.command("admin_add_user", async (ctx) => {
        const tid = String(ctx.from?.id);
        const admin: any = await getEmployee(tid);
        if (!admin || admin.role !== 'admin') return ctx.reply("عذراً، هذا الأمر للمديرين فقط.");

        const text = ctx.message?.text || "";
        const parts = text.split(" "); // /admin_add_user 123456 Ali 5000
        if (parts.length < 4) return ctx.reply("الاستخدام الصحيح:\n/admin_add_user [Telegram_ID] [Name] [Salary]");

        const newId = parts[1];
        const newSalary = parts[parts.length - 1];
        const newName = parts.slice(2, parts.length - 1).join(" ");

        try {
            await env.DB.prepare("INSERT INTO Employees (telegram_id, full_name, base_salary) VALUES (?, ?, ?)")
                .bind(newId, newName, newSalary).run();
            await ctx.reply(`تم إضافة الموظف ${newName} بنجاح.`);
        } catch(e) {
            await ctx.reply("حدث خطأ، ربما هذا المعرف مسجل مسبقاً.");
        }
    });

    // 5. الأرشفة الشهرية والتنظيف
    bot.command("archive_month", async (ctx) => {
        const tid = String(ctx.from?.id);
        const admin: any = await getEmployee(tid);
        if (!admin || admin.role !== 'admin') return ctx.reply("للمديرين فقط.");

        await ctx.reply("جاري تجميع البيانات وتجهيز ملف الإكسيل...");

        const attendance = await env.DB.prepare(`
            SELECT Employees.full_name, Attendance.date, Attendance.check_in_time, Attendance.check_out_time 
            FROM Attendance 
            JOIN Employees ON Attendance.employee_id = Employees.id
        `).all();

        // صنع الإكسيل
        const wb = xlsx.utils.book_new();
        const wsAtt = xlsx.utils.json_to_sheet(attendance.results || []);
        xlsx.utils.book_append_sheet(wb, wsAtt, "الحضور والانصراف");

        // تحويله لملف بايتات
        const buffer = xlsx.write(wb, { type: "buffer", bookType: "xlsx" });

        // إرسال الملف
        await ctx.replyWithDocument(new InputFile(buffer, `Archive_${new Date().toISOString().split("T")[0]}.xlsx`));

        // مسح البيانات بعد الإرسال
        await env.DB.prepare("DELETE FROM Attendance").run();
        await env.DB.prepare("DELETE FROM Leaves").run();

        await ctx.reply("تم الأرشفة ومسح بيانات الحضور والإجازات القديمة لتنظيف قاعدة البيانات بنجاح! 🧹");
    });

    // ربط البوت بالـ Webhook
    if (request.method === "POST") {
      try {
        const payload = await request.json();
        await bot.handleUpdate(payload as any);
        return new Response("OK");
      } catch (err) {
        console.error(err);
        return new Response("Error", { status: 500 });
      }
    }

    return new Response("HR Bot is running successfully! 🚀");
  },
};
