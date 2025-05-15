// use server'
'use server';

/**
 * @fileOverview Automatically identifies checklist items from user speech and adds them to the checklist.
 *
 * - checklistAutoGenerator - A function that handles the checklist auto generation process.
 * - ChecklistAutoGeneratorInput - The input type for the checklistAutoGenerator function.
 * - ChecklistAutoGeneratorOutput - The return type for the checklistAutoGenerator function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ChecklistAutoGeneratorInputSchema = z.object({
  speechTranscription: z
    .string()
    .describe('The transcribed text from the user\'s speech input.'),
});
export type ChecklistAutoGeneratorInput = z.infer<
  typeof ChecklistAutoGeneratorInputSchema
>;

const ChecklistAutoGeneratorOutputSchema = z.object({
  checklistItems: z
    .array(z.string())
    .describe('An array of checklist items extracted from the transcribed text.'),
});
export type ChecklistAutoGeneratorOutput = z.infer<
  typeof ChecklistAutoGeneratorOutputSchema
>;

export async function checklistAutoGenerator(
  input: ChecklistAutoGeneratorInput
): Promise<ChecklistAutoGeneratorOutput> {
  return checklistAutoGeneratorFlow(input);
}

const prompt = ai.definePrompt({
  name: 'checklistAutoGeneratorPrompt',
  input: {schema: ChecklistAutoGeneratorInputSchema},
  output: {schema: ChecklistAutoGeneratorOutputSchema},
  prompt: `You are a checklist generator. Your goal is to create a checklist from the user's spoken input.

  Here is the transcribed speech:
  {{speechTranscription}}

  Identify the key tasks or items mentioned in the speech and create a checklist.
  Each item in the checklist should be a concise and actionable step.
  Return the checklist items as an array of strings.
  If the speech doesn't contain any clear tasks or items, return an empty array.
  `,
});

const checklistAutoGeneratorFlow = ai.defineFlow(
  {
    name: 'checklistAutoGeneratorFlow',
    inputSchema: ChecklistAutoGeneratorInputSchema,
    outputSchema: ChecklistAutoGeneratorOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
