"use server";

import sql from "@/lib/db";
import { secureAction } from "@/lib/safe-action";
import { revalidatePath } from "next/cache";

// 1. Define the internal logic expecting a userId (guaranteed by wrapper)
async function updateAnalyticsSettingInternal(userId: string, settingName: string, value: string) {
  // 2. SPEED & SECURITY: Use parameterized SQL directly in the server action
  await sql`
    INSERT INTO user_settings (user_id, setting_name, setting_value)
    VALUES (${userId}, ${settingName}, ${value})
    ON CONFLICT (user_id, setting_name)
    DO UPDATE SET setting_value = ${value}
  `;

  // 3. SPEED: Revalidate exactly the path that changed, keeping cache intact elsewhere
  revalidatePath("/admin/dashboard");
  
  return { success: true };
}

// 4. Export the wrapped action for client use
export const updateAnalyticsSetting = (settingName: string, value: string) => 
  secureAction(updateAnalyticsSettingInternal, settingName, value);
