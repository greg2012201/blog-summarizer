export const mapTemplate = (content: string) => `
You are an expert content analyzer. Your task is to extract and summarize the key information from the following document.

Please analyze the content and provide:
1. Main topics and themes
2. Key insights and takeaways
3. Important facts, statistics, or examples
4. Core concepts or ideas presented

Format your summary in the bullet points format.

Summary should be brief and to the point.

Document Content: ${content}

Provide a concise but comprehensive summary that captures the essential information from this document. Focus on the most valuable and actionable content.


`;

export const reduceTemplate = (summaries: string) => `

The following is a set of summaries:
${summaries}
Take these and create one summary as a whole context gathered from the summaries.

Keep it concise and focused on the main points, avoiding unnecessary details. The goal is to distill the essence of the summaries into a single, coherent summary.
`;
// https://js.langchain.com/docs/tutorials/summarization/#map-reduce
