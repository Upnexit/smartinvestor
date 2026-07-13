import { createServerFn } from "@tanstack/react-start";

export type GeneratedTask = {
  title: string;
  url: string;
  action_type: "like" | "follow" | "share" | "comment" | "subscribe" | "view";
  description: string;
};

export const generateFbLinkTasks = createServerFn({ method: "POST" })
  .inputValidator((d: {
    count: number;
    actions?: GeneratedTask["action_type"][];
    existingUrls?: string[];
  }) => {
    const count = Math.max(1, Math.min(200, Math.floor(Number(d?.count) || 10)));
    const allowed: GeneratedTask["action_type"][] = ["like", "follow", "share", "comment", "subscribe", "view"];
    const actions = Array.isArray(d?.actions) && d.actions.length
      ? d.actions.filter((a) => allowed.includes(a))
      : ["like", "follow", "share"] as GeneratedTask["action_type"][];
    const existingUrls = Array.isArray(d?.existingUrls)
      ? d.existingUrls.filter((u) => typeof u === "string").slice(0, 2000)
      : [];
    return { count, actions: actions.length ? actions : ["like"] as GeneratedTask["action_type"][], existingUrls };
  })
  .handler(async ({ data }) => {
    const { generateFbLinkTaskBatch } = await import("./admin-tasks.server");
    return generateFbLinkTaskBatch(data);
  });
