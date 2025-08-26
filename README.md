# Blog Summarizer

A Node.js/TypeScript project for summarizing documents using OpenAI models, with robust handling of token limits and chunking.

## Usage

1. Install dependencies:
   ```sh
   npm install
   ```
2. Set your OpenAI API key:
   ```sh
   export OPENAI_API_KEY=your-key
   ```
3. Run summarization:
   ```sh
   npm start
   ```
4. Run tests:
   ```sh
   npx vitest
   ```

## File Structure

- `src/summarizer/main.ts` — Main summarization logic and helpers.
- `src/summarizer/splitSummariesByTokenLimit.test.ts` — Unit tests for summary splitting.
- Other files — Document loading, formatting, and utility functions.

## License

MIT
