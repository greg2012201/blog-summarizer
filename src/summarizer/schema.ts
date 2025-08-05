import { z } from 'zod';

export const MapSummarizeSchema = z.object({
  title: z.string(),
  summary: z.string(),
});
