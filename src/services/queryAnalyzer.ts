import { GoogleGenerativeAI } from '@google/generative-ai';

export interface QueryAnalysis {
    needsMultiStep: boolean;
    complexity: 'simple' | 'moderate' | 'complex';
    suggestedSteps?: string[];
    reasoning?: string;
}

const getGeminiClient = () => {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
        throw new Error('VITE_GEMINI_API_KEY is not set in environment variables');
    }
    return new GoogleGenerativeAI(apiKey);
};

/**
 * Analyze a query to determine if it needs multi-step reasoning
 */
export async function analyzeQuery(query: string): Promise<QueryAnalysis> {
    try {
        const genAI = getGeminiClient();
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

        const prompt = `Analyze this search query and determine if it requires multi-step reasoning or multiple searches:

Query: "${query}"

Consider:
- Does it ask about multiple topics that need separate searches?
- Does it require comparing or combining information from different sources?
- Does it need sequential steps (e.g., "first find X, then find Y")?
- Is it a simple factual question that can be answered with one search?

Return ONLY valid JSON (no markdown, no code blocks):
{
    "needsMultiStep": boolean,
    "complexity": "simple" | "moderate" | "complex",
    "suggestedSteps": string[] (only if needsMultiStep is true, otherwise empty array),
    "reasoning": string (brief explanation)
}`;

        const result = await model.generateContent(prompt);
        const text = result.response.text().trim();

        // Extract JSON from response
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            return {
                needsMultiStep: parsed.needsMultiStep || false,
                complexity: parsed.complexity || 'simple',
                suggestedSteps: parsed.suggestedSteps || [],
                reasoning: parsed.reasoning || '',
            };
        }

        // Fallback: simple analysis
        const hasMultipleTopics = /(and|or|compare|versus|vs|versus|difference between)/i.test(query);
        const hasSequential = /(first|then|after|before|step|process)/i.test(query);

        return {
            needsMultiStep: hasMultipleTopics || hasSequential,
            complexity: hasMultipleTopics || hasSequential ? 'moderate' : 'simple',
            suggestedSteps: [],
            reasoning: hasMultipleTopics ? 'Query contains multiple topics' : 'Simple query',
        };
    } catch (error) {
        console.error('Query analysis failed:', error);
        // Fallback to simple
        return {
            needsMultiStep: false,
            complexity: 'simple',
            suggestedSteps: [],
            reasoning: 'Analysis failed, defaulting to simple',
        };
    }
}

