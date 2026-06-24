'use server';
/**
 * @fileOverview An AI agent for verifying Clash of Clans match results from screenshots.
 *
 * - adminResultVerificationAI - A function that handles the AI-powered verification process.
 * - AdminResultVerificationInput - The input type for the adminResultVerificationAI function.
 * - AdminResultVerificationOutput - The return type for the adminResultVerificationAI function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

/**
 * Input schema for the AdminResultVerificationAI flow.
 */
const AdminResultVerificationInputSchema = z.object({
  screenshotUrl: z.string().url().describe('The public URL of the match result screenshot (e.g., Cloudinary URL).'),
  reportedScore1: z.number().int().min(0).describe('The reported score for player 1.'),
  reportedScore2: z.number().int().min(0).describe('The reported score for player 2.'),
});
export type AdminResultVerificationInput = z.infer<typeof AdminResultVerificationInputSchema>;

/**
 * Output schema for the AdminResultVerificationAI flow.
 */
const AdminResultVerificationOutputSchema = z.object({
  verificationStatus: z.enum(['verified', 'mismatch', 'failed']).describe("The status of the verification: 'verified' if scores match, 'mismatch' if they don't, 'failed' if AI couldn't process."),
  aiDetectedScore1: z.number().int().min(0).nullable().describe('The score detected for player 1 by the AI, or null if not detected.'),
  aiDetectedScore2: z.number().int().min(0).nullable().describe('The score detected for player 2 by the AI, or null if not detected.'),
  reason: z.string().describe('A brief explanation of the verification status.'),
});
export type AdminResultVerificationOutput = z.infer<typeof AdminResultVerificationOutputSchema>;

/**
 * Defines the Genkit prompt for AI-powered match result verification.
 * This prompt instructs a vision model to analyze a screenshot, detect scores,
 * and compare them against reported scores, returning a structured JSON output.
 */
const adminResultVerificationPrompt = ai.definePrompt({
  name: 'adminResultVerificationPrompt',
  input: { schema: AdminResultVerificationInputSchema },
  output: { schema: AdminResultVerificationOutputSchema },
  config: {
    model: 'googleai/gemini-2.5-flash', // Specify the vision model
    responseModalities: ['TEXT'], // We expect JSON text output
  },
  prompt: `You are an expert Clash of Clans tournament verifier. Your task is to analyze a match result screenshot, detect the scores, and compare them against reported scores.

Image: {{media url=screenshotUrl}}

Reported scores:
Player 1 Score: {{{reportedScore1}}}
Player 2 Score: {{{reportedScore2}}}

Based on the image and reported scores, perform the following steps:
1. Carefully examine the image to identify the final scores for both players.
2. Compare the scores you identified in the image with the provided 'Reported scores'.
3. Generate a JSON object strictly adhering to the following structure, and include no other text.
The JSON object must have these fields:
- "verificationStatus": A string, one of "verified", "mismatch", or "failed".
- "aiDetectedScore1": A number representing the score detected for player 1, or null if not detected.
- "aiDetectedScore2": A number representing the score detected for player 2, or null if not detected.
- "reason": A string providing a brief explanation for the verificationStatus.

Example of expected JSON structure:
{
  "verificationStatus": "verified",
  "aiDetectedScore1": 3,
  "aiDetectedScore2": 2,
  "reason": "Detected scores match reported scores (3 vs 2)."
}
OR
{
  "verificationStatus": "mismatch",
  "aiDetectedScore1": 2,
  "aiDetectedScore2": 3,
  "reason": "Detected scores (2 vs 3) do not match reported scores (3 vs 2)."
}
OR
{
  "verificationStatus": "failed",
  "aiDetectedScore1": null,
  "aiDetectedScore2": null,
  "reason": "Could not confidently detect scores in the image."
}
`,
});

/**
 * Defines the Genkit flow for admin result verification.
 * It orchestrates the call to the vision model prompt and validates its output.
 */
const adminResultVerificationFlow = ai.defineFlow(
  {
    name: 'adminResultVerificationFlow',
    inputSchema: AdminResultVerificationInputSchema,
    outputSchema: AdminResultVerificationOutputSchema,
  },
  async (input) => {
    const { output } = await adminResultVerificationPrompt(input);

    // Genkit's definePrompt with output.schema should ideally return a parsed object.
    // However, for robustness, we explicitly parse and validate the output.
    if (typeof output === 'string') {
      try {
        const parsed = JSON.parse(output);
        return AdminResultVerificationOutputSchema.parse(parsed); // Validate with Zod
      } catch (e: any) {
        console.error('Failed to parse AI response as JSON or validate:', e);
        return {
          verificationStatus: 'failed' as const,
          aiDetectedScore1: null,
          aiDetectedScore2: null,
          reason: `AI output was not valid JSON or did not match schema: ${e.message}`,
        };
      }
    }
    // If output is already an object, validate it against the schema.
    return AdminResultVerificationOutputSchema.parse(output);
  }
);

/**
 * Wrapper function to trigger the AI-powered match result verification.
 * @param input The input containing the screenshot URL and reported scores.
 * @returns The verification result, including status, detected scores, and a reason.
 */
export async function adminResultVerificationAI(
  input: AdminResultVerificationInput
): Promise<AdminResultVerificationOutput> {
  return adminResultVerificationFlow(input);
}
