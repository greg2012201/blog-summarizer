import type { Document as LocalDocument } from './type';
import { Document } from '@langchain/core/documents';
import {
  TokenTextSplitter,
  RecursiveCharacterTextSplitter,
} from '@langchain/textsplitters';
import { ChatOpenAI } from '@langchain/openai';
import { mapTemplate, reduceTemplate } from './prompts';
import { CHUNK_SIZE } from './const';

const model = new ChatOpenAI({
  model: 'gpt-4o-mini',
  temperature: 0,
  apiKey: process.env.OPENAI_API_KEY,
});

const textSplitter = new TokenTextSplitter({
  chunkSize: CHUNK_SIZE,
  chunkOverlap: 0,
});

const recursiveTextSplitter = new RecursiveCharacterTextSplitter({
  chunkSize: CHUNK_SIZE,
  chunkOverlap: 0,
});

async function mapCalls(langchainDocs: Document[]): Promise<string[]> {
  console.log('Summarization started...');
  const splitDocs = await textSplitter.splitDocuments(langchainDocs);

  const results = await model.batch(
    splitDocs.map((doc) => [
      {
        role: 'user',
        content: mapTemplate(doc.pageContent),
      },
    ]),
  );

  return results.map((result) => result.content as string);
}

async function reduceSummaries(summaries: string[]) {
  const result = await model.invoke([
    {
      role: 'user',
      content: reduceTemplate(summaries.join('\n\n')),
    },
  ]);
  return result.content as string;
}
async function collapseSummaries(
  summaries: string[],
  recursionLimit = 5,
  iteration = 0,
) {
  console.log('Collapsing summaries...');
  if (summaries.length === 0) {
    return [];
  }
  const splitDocLists: Document[][] = [];

  for (const summary of summaries) {
    const splitText = await recursiveTextSplitter.splitText(summary);
    splitDocLists.push(
      splitText.map((text) => new Document({ pageContent: text })),
    );
  }

  const reduceCalls = splitDocLists.map((splitDocs) => {
    return reduceSummaries(splitDocs.map((doc) => doc.pageContent));
  });
  const reduceResults = await Promise.all(reduceCalls);
  const results = reduceResults.map((reduced) => {
    return new Document({ pageContent: reduced });
  });
  let tokenCount = await lengthFunction(results);
  if (tokenCount > 2000 && iteration < recursionLimit) {
    console.log('Token count exceeds limit, collapsing summaries further...');
    return collapseSummaries(
      results.map((doc) => doc.pageContent),
      recursionLimit,
      iteration + 1,
    );
  }
  return results;
}

async function lengthFunction(documents: Document[]) {
  const tokenCounts = await Promise.all(
    documents.map(async (doc) => {
      return model.getNumTokens(doc.pageContent);
    }),
  );
  return tokenCounts.reduce((sum, count) => sum + count, 0);
}

export async function summarizeDocuments(
  documents: LocalDocument[],
  maxIterations = 5,
) {
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
  const collapsedSummariesDocs = await collapseSummaries(
    summaries,
    maxIterations,
  );

  const finalSummary = await reduceSummaries(
    collapsedSummariesDocs.map((doc) => doc.pageContent),
  );
  console.log('finalSummary', finalSummary);
}
