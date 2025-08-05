import z from 'zod';
import { MapSummarizeSchema } from './schema';

export type Document = {
  title: string;
  content: string;
  link: string;
  date: string;
  source: string;
  selector: string;
  index: number;
};

export type MapSummarizeResult = z.infer<typeof MapSummarizeSchema>[];
