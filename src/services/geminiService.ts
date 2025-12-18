import { GoogleGenerativeAI } from '@google/generative-ai';
import { sendTelemetry } from './searchService';

// Types
export interface Message {
    role: 'user' | 'assistant';
    content: string;
}

export interface StreamCallbacks {
    onToken: (token: string) => void;
    onComplete: (fullText: string) => void;
    onError: (error: Error) => void;
}

// Initialize the Gemini API
const getGeminiClient = () => {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error('VITE_GEMINI_API_KEY is not set in environment variables');
    }
    return new GoogleGenerativeAI(apiKey);
};

/**
 * Build system prompt based on conversation settings
 */
function buildSystemPrompt(settings?: {
    tone?: 'casual' | 'professional' | 'technical';
    depth?: 'brief' | 'detailed' | 'comprehensive';
    citationStrictness?: 'relaxed' | 'standard' | 'strict';
}): string {
    const tone = settings?.tone || 'professional';
    const depth = settings?.depth || 'detailed';
    const citationStrictness = settings?.citationStrictness || 'standard';

    const toneInstructions = {
        casual: 'Use a friendly, conversational tone. Be approachable and easy to understand.',
        professional: 'Use a formal, business-appropriate tone. Be clear and respectful.',
        technical: 'Use precise, jargon-rich language. Assume technical knowledge when appropriate.',
    };

    const depthInstructions = {
        brief: 'Provide short, concise answers. Focus on key points only.',
        detailed: 'Provide moderate detail with context. Include relevant examples when helpful.',
        comprehensive: 'Provide in-depth explanations with examples, context, and supporting details.',
    };

    const citationInstructions = {
        relaxed: 'Include citations when helpful, but don\'t require them for every statement.',
        standard: 'Include citations for factual claims and important information. Balance citation coverage.',
        strict: 'Require citations for all factual claims. Every statement should be backed by a source.',
    };

    return `You are a helpful AI research assistant, similar to Perplexity AI. Your role is to:

1. Provide accurate, well-researched answers to questions
2. Structure your responses clearly with headings, bullet points, and formatting when appropriate
3. ${depthInstructions[depth]}
4. ${toneInstructions[tone]}
5. Acknowledge when you're uncertain about something
6. Use markdown formatting for better readability

When answering:
- Start with a direct answer to the question
- Provide supporting details and context
- Use bullet points for lists
- Use code blocks for any code examples
- Be helpful and ${tone}

IMPORTANT: When web search results are provided, you MUST:
- Use the information from the search results to inform your answer
- Add inline citations using the format [1], [2], etc. that correspond to the source numbers
- Place citations immediately after the relevant information
- If multiple sources support a statement, cite them all: [1][2]
- Only cite sources that are actually provided in the context
- Citation requirement: ${citationInstructions[citationStrictness]}`;
}

/**
 * Generate a streaming response from Gemini
 */
export async function generateStreamingResponse(
    query: string,
    conversationHistory: Message[],
    callbacks: StreamCallbacks,
    searchContext?: string,
    settings?: {
        tone?: 'casual' | 'professional' | 'technical';
        depth?: 'brief' | 'detailed' | 'comprehensive';
        citationStrictness?: 'relaxed' | 'standard' | 'strict';
    }
): Promise<void> {
    try {
        await sendTelemetry('llm_started', { query, metadata: { hasSearchContext: !!searchContext } });
        const startTime = Date.now();

        const systemPrompt = buildSystemPrompt(settings);

        const genAI = getGeminiClient();
        const model = genAI.getGenerativeModel({
            model: 'gemini-2.5-flash',
            systemInstruction: systemPrompt,
        });

        // Build conversation history for context
        const historyFormatted = conversationHistory.map(msg => ({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: msg.content }],
        }));

        // Start chat with history
        const chat = model.startChat({
            history: historyFormatted,
        });

        // Build the message with optional search context
        let message = query;
        if (searchContext) {
            message = `${searchContext}\n\nUser Question: ${query}\n\nPlease answer the question using the search results above. Include inline citations [1], [2], etc. where appropriate.`;
        }

        // Generate streaming response
        const result = await chat.sendMessageStream(message);

        let fullText = '';

        for await (const chunk of result.stream) {
            const chunkText = chunk.text();
            fullText += chunkText;
            callbacks.onToken(chunkText);
        }

        const duration = Date.now() - startTime;
        await sendTelemetry('llm_completed', {
            query,
            duration,
            metadata: { hasSearchContext: !!searchContext },
        });

        callbacks.onComplete(fullText);
    } catch (error) {
        console.error('Gemini API Error:', error);
        await sendTelemetry('llm_failed', {
            query,
            error: error instanceof Error ? error.message : 'Unknown error',
        });
        callbacks.onError(error instanceof Error ? error : new Error('Unknown error occurred'));
    }
}

/**
 * Generate a non-streaming response from Gemini
 */
export async function generateResponse(
    query: string,
    conversationHistory: Message[] = []
): Promise<string> {
    await sendTelemetry('llm_started', { query });
    const startTime = Date.now();

    try {
        const genAI = getGeminiClient();
        const model = genAI.getGenerativeModel({
            model: 'gemini-2.5-flash',
            systemInstruction: SYSTEM_PROMPT,
        });

        const historyFormatted = conversationHistory.map(msg => ({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: msg.content }],
        }));

        const chat = model.startChat({
            history: historyFormatted,
        });

        const result = await chat.sendMessage(query);
        const text = result.response.text();

        const duration = Date.now() - startTime;
        await sendTelemetry('llm_completed', { query, duration });

        return text;
    } catch (error) {
        console.error('Gemini API Error:', error);
        await sendTelemetry('llm_failed', {
            query,
            error: error instanceof Error ? error.message : 'Unknown error',
        });
        throw error instanceof Error ? error : new Error('Unknown error occurred');
    }
}

/**
 * Generate follow-up question suggestions based on the conversation
 */
export async function generateFollowUpSuggestions(
    query: string,
    response: string
): Promise<string[]> {
    try {
        const genAI = getGeminiClient();
        const model = genAI.getGenerativeModel({
            model: 'gemini-2.5-flash',
        });

        const prompt = `Based on this question and answer, generate exactly 3 short follow-up questions that would help the user learn more about this topic. 

Original question: "${query}"

Answer summary: "${response.substring(0, 500)}..."

Return ONLY a JSON array of 3 strings, no other text. Example format:
["Question 1?", "Question 2?", "Question 3?"]`;

        const result = await model.generateContent(prompt);
        const text = result.response.text().trim();

        // Parse the JSON array from the response
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
            const suggestions = JSON.parse(jsonMatch[0]);
            if (Array.isArray(suggestions) && suggestions.length > 0) {
                return suggestions.slice(0, 3);
            }
        }

        return [];
    } catch (error) {
        console.error('Error generating follow-up suggestions:', error);
        return [];
    }
}
