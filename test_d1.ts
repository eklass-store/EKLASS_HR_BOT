import { addEmployee } from './src/db/employees.db';
import { logAction } from './src/db/audit.db';

export default {
  async fetch(request: Request, env: any) {
    try {
      const id = await addEmployee(env, "999999999", "Test Employee", 5000, "employee");
      await logAction(env, 1, "ADD_EMPLOYEE", "Test log");
      return new Response("Success: " + id);
    } catch (e: any) {
      return new Response("Error: " + e.message + "\n" + e.stack);
    }
  }
}
