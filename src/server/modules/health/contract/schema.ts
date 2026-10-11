import { z } from "zod";

export const healthOkSchema = z.object({
  status: z.literal("ok"),
});
