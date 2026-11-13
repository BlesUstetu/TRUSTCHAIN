import { z } from "zod";

export const createProjectSchema = z.object({
  name: z.string().trim().min(2).max(80),
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(60),
  description: z.string().trim().max(500).optional(),
  websiteUrl: z.url().max(2048).optional(),
  chainId: z.literal(8453).default(8453),
  tokenAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/).optional()
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;