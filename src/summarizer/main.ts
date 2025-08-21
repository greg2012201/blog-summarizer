// Helper to split summaries into sublists by token limit

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
  lengthFunction: (text) => {
    return model.getNumTokens(text);
  },
  chunkOverlap: 0,
});

async function lengthFunction(summaries: string[]) {
  const tokenCounts = await Promise.all(
    summaries.map(async (summary) => {
      return model.getNumTokens(summary);
    }),
  );
  return tokenCounts.reduce((sum, count) => sum + count, 0);
}

export async function splitSummariesByTokenLimit(
  summaries: string[],
  tokenLimit: number,
): Promise<string[][]> {
  const result: string[][] = [];
  let currentList: string[] = [];
  for (const summary of summaries) {
    let summaryTokens = await model.getNumTokens(summary);
    let chunks: string[] = [];
    if (summaryTokens > tokenLimit) {
      // Split the summary into chunks using textSplitter
      chunks = await recursiveTextSplitter.splitText(summary);
    } else {
      chunks = [summary];
    }
    for (const chunk of chunks) {
      const candidateList = [...currentList, chunk];
      const candidateTokens = await lengthFunction(candidateList);
      if (candidateTokens > tokenLimit) {
        if (currentList.length > 0) {
          result.push(currentList);
          currentList = [];
        }
      }
      currentList.push(chunk);
    }
  }
  if (currentList.length > 0) {
    result.push(currentList);
  }
  return result;
}

async function runMappers(formattedDocs: Document[]): Promise<string[]> {
  console.log('Summarization started...');
  const splitDocs = await textSplitter.splitDocuments(formattedDocs);

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

async function reduceSummariesBatch(listOfSummaries: string[][]) {
  const result = await model.batch(
    listOfSummaries.map((summaries) => [
      {
        role: 'user',
        content: reduceTemplate(summaries.join('\n\n')),
      },
    ]),
  );
  return result.map((res) => res.content as string);
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
  const splitDocLists = await splitSummariesByTokenLimit(summaries, 1000);

  const results = await reduceSummariesBatch(splitDocLists);

  let shouldCollapse = await checkShouldCollapse(results);
  if (shouldCollapse && iteration < recursionLimit) {
    console.log('Token count exceeds limit, collapsing summaries further...');
    return collapseSummaries(results, recursionLimit, iteration + 1);
  }
  return results;
}

async function checkShouldCollapse(summaries: string[]) {
  const tokenCount = await lengthFunction(summaries);
  return tokenCount > 1000;
}

export async function summarizeDocuments(
  documents: LocalDocument[],
  maxIterations = 5,
) {
  const formattedDocs = documents.map(
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

  let summaries = await runMappers(formattedDocs);

  const shouldCollapse = await checkShouldCollapse(summaries);
  if (shouldCollapse) {
    summaries = await collapseSummaries(summaries, maxIterations);
  }
  const finalSummary = await reduceSummaries(summaries);
  console.log('finalSummary', finalSummary);
}
