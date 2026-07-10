import OpenAI from 'openai';
import { parseGeneratedKeywords } from './validation.mjs';

export async function generateKeywords({ apiKey, description, model }) {
  if (typeof apiKey !== 'string' || !apiKey.trim()) throw new Error('Enter an OpenAI API key.');
  if (typeof description !== 'string' || description.trim().length < 12) {
    throw new Error('Describe the kinds of conversations you are concerned about.');
  }
  if (description.length > 2000) throw new Error('Description must be 2,000 characters or fewer.');

  const client = new OpenAI({ apiKey: apiKey.trim() });
  const response = await client.responses.create({
    model,
    instructions: [
      'Create focused search keywords for a user reviewing their own ChatGPT conversation history.',
      'Return only JSON in this exact shape: {"keywords":["keyword one","keyword two"]}.',
      'Generate 12 to 24 short, high-signal phrases. Avoid generic terms, duplicates, and instructions.',
      'Do not include personal data that the user did not provide.'
    ].join(' '),
    input: description.trim()
  });

  const keywords = parseGeneratedKeywords(response.output_text, 30);
  if (!keywords.length) throw new Error('The AI did not return usable keywords.');
  return keywords;
}

