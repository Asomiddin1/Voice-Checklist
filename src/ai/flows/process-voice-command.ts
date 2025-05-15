
'use server';
/**
 * @fileOverview Processes voice commands for a checklist app.
 * Identifies actions like toggle, delete, or add items, and extracts new items.
 *
 * - processVoiceCommand - Function to process voice commands.
 * - ProcessVoiceCommandInput - Input type for the function.
 * - ProcessVoiceCommandOutput - Output type for the function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import type {ChecklistItemType} from '@/types'; // Assuming types are here

// Define Zod schema for individual checklist items passed in input
const ChecklistItemInputSchema = z.object({
  id: z.string(),
  text: z.string(),
  completed: z.boolean(),
});

const ProcessVoiceCommandInputSchema = z.object({
  speechTranscription: z.string().describe('The transcribed text from the user\'s speech input.'),
  checklistItems: z.array(ChecklistItemInputSchema).describe('Current list of checklist items.'),
});
export type ProcessVoiceCommandInput = z.infer<typeof ProcessVoiceCommandInputSchema>;

const RecognizedCommandSchema = z.object({
  command: z.enum(['toggle', 'delete', 'add']).describe('The type of command recognized (toggle, delete, add).'),
  itemName: z.string().describe('The name of the item targeted by the command.'),
  targetItemId: z.string().optional().describe('The ID of the existing item if matched for toggle/delete.'),
});

const ProcessVoiceCommandOutputSchema = z.object({
  recognizedCommands: z.array(RecognizedCommandSchema).describe('An array of commands recognized from the speech.'),
  newItemsFromSpeech: z.array(z.string()).describe('An array of new checklist items extracted from speech if no specific command was identified for them.'),
});
export type ProcessVoiceCommandOutput = z.infer<typeof ProcessVoiceCommandOutputSchema>;


export async function processVoiceCommand(
  input: ProcessVoiceCommandInput
): Promise<ProcessVoiceCommandOutput> {
  return processVoiceCommandFlow(input);
}

const prompt = ai.definePrompt({
  name: 'processVoiceCommandPrompt',
  input: {schema: ProcessVoiceCommandInputSchema},
  output: {schema: ProcessVoiceCommandOutputSchema},
  prompt: `You are a voice command processor for a checklist app.
User's speech transcription: "{{speechTranscription}}"

Current checklist items:
{{#if checklistItems.length}}
{{#each checklistItems}}
- "{{text}}" (ID: {{id}}, Completed: {{completed}})
{{/each}}
{{else}}
- No items in the checklist.
{{/if}}

Your tasks:
1.  Analyze the speech for commands related to these items. Supported commands are:
    *   TOGGLE completion: Phrases like "check [item name]", "uncheck [item name]", or just saying "[item name]" can imply toggling its state.
    *   DELETE item: Phrases like "delete [item name]", "remove [item name]".
    *   ADD item: Phrases like "add [item name]", "put [item name] on the list".

2.  For each recognized command, specify:
    *   'command': as 'toggle', 'delete', or 'add'.
    *   'itemName': the name of the item as spoken by the user.
    *   'targetItemId' (for 'toggle' and 'delete' commands ONLY): If the 'itemName' closely and unambiguously matches the text of an *existing* checklist item, provide its ID. Prioritize exact or very close matches. If unsure or ambiguous, do not provide 'targetItemId'. For 'add' commands, 'targetItemId' should not be present.

3.  If parts of the speech seem like new checklist items rather than commands targeting existing items (e.g., user lists "milk, eggs, bread" or says "remember to buy apples"), list these new item texts in the 'newItemsFromSpeech' array. These are items to be added if they are not part of an "add [item name]" command.

4.  If no commands or new items are clearly identified, return empty arrays for both 'recognizedCommands' and 'newItemsFromSpeech'.
5.  Be conservative with matching item names for 'toggle' and 'delete'. If a spoken item name is vague or matches multiple items poorly, it's better not to provide a 'targetItemId' and perhaps list it as a new item if appropriate.

Output strictly in JSON format matching the ProcessVoiceCommandOutputSchema.
Example for "check the milk and add eggs":
If "milk" is an existing item with ID "123":
{
  "recognizedCommands": [
    { "command": "toggle", "itemName": "milk", "targetItemId": "123" },
    { "command": "add", "itemName": "eggs" }
  ],
  "newItemsFromSpeech": []
}

Example for "delete bread, get bananas":
If "bread" is an existing item with ID "456":
{
  "recognizedCommands": [
    { "command": "delete", "itemName": "bread", "targetItemId": "456" }
  ],
  "newItemsFromSpeech": ["get bananas"]
}

Example for "apples, bananas, cherries":
{
  "recognizedCommands": [],
  "newItemsFromSpeech": ["apples", "bananas", "cherries"]
}
`,
});

const processVoiceCommandFlow = ai.defineFlow(
  {
    name: 'processVoiceCommandFlow',
    inputSchema: ProcessVoiceCommandInputSchema,
    outputSchema: ProcessVoiceCommandOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    // Ensure output is not null and adheres to the schema, 
    // providing default empty arrays if the AI fails to produce them.
    return output || { recognizedCommands: [], newItemsFromSpeech: [] };
  }
);
