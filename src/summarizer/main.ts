import type { Document as LocalDocument, MapSummarizeResult } from './type';
import { Document } from '@langchain/core/documents';
import { TokenTextSplitter } from '@langchain/textsplitters';
import { ChatOpenAI } from '@langchain/openai';
import { MapSummarizeSchema } from './schema';
import { mapTemplate, reduceTemplate } from './prompts';

const model = new ChatOpenAI({
  model: 'gpt-4o-mini',
  temperature: 0,
  apiKey: process.env.OPENAI_API_KEY,
});

const textSplitter = new TokenTextSplitter({
  chunkSize: 500,
  chunkOverlap: 0,
});

async function mapCalls(langchainDocs: Document[]) {
  console.log('Summarization started...');
  const splitDocs = await textSplitter.splitDocuments(langchainDocs);
  const modelWithStructured = model.withStructuredOutput({
    name: 'summarize',
    schema: MapSummarizeSchema,
  });
  console.log('calls', splitDocs.length);
  const promises = splitDocs.map((doc) => {
    return modelWithStructured.invoke([
      {
        role: 'user',
        content: mapTemplate({
          title: doc.metadata.title,
          content: doc.pageContent,
        }),
      },
    ]);
  });

  const results = await Promise.all(promises);

  return results as MapSummarizeResult;
}

function collapseSummaries(summaries: MapSummarizeResult) {
  const summariesMap = new Map<string, string>();

  const collapsed: { title: string; summary: string }[] = [];

  summaries.forEach((summary) => {
    if (summariesMap.has(summary.title)) {
      summariesMap.set(
        summary.title,
        summariesMap.get(summary.title) + summary.summary,
      );
    } else {
      summariesMap.set(summary.title, summary.summary);
    }
  });

  summariesMap.forEach((summary, title) => {
    collapsed.push({ title, summary });
  });

  return collapsed;
}

async function generateFinallSummary(summaries: MapSummarizeResult) {
  const result = await model.invoke([
    {
      role: 'user',
      content: reduceTemplate(summaries.map((s) => s.summary).join('\n\n')),
    },
  ]);
  return result;
}

export async function summarizeDocuments(documents: LocalDocument[]) {
  const langchainDocs = documents.map(
    (doc) =>
      new Document({
        pageContent: doc.content,
        metadata: {
          title: doc.title,
          link: doc.link,
          date: doc.date,
          source: doc.source,
          selector: doc.selector,
          index: doc.index,
        },
      }),
  );

  const summaries = await mapCalls(langchainDocs);

  const collapsed = collapseSummaries(summaries);

  const finalSummary = await generateFinallSummary(collapsed);

  console.log('finalSummary', finalSummary);
}
