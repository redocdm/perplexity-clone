import type { Conversation, ConversationSettings } from '../types/conversation';
import { DEFAULT_SETTINGS } from '../types/conversation';
import type { Message } from './geminiService';
import type { SearchResult } from './searchService';

const STORAGE_KEY = 'perplexity_conversations';
const MAX_CONVERSATIONS = 50;

/**
 * Generate a conversation title from the first message
 */
function generateTitle(firstMessage: string): string {
    // Take first 50 chars and clean up
    const title = firstMessage.trim().slice(0, 50);
    return title.length < firstMessage.length ? `${title}...` : title;
}

/**
 * Get all conversations from localStorage
 */
export function getAllConversations(): Conversation[] {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) return [];
        return JSON.parse(stored);
    } catch (error) {
        console.error('Failed to load conversations:', error);
        return [];
    }
}

/**
 * Save a conversation
 */
export function saveConversation(conversation: Conversation): void {
    try {
        const conversations = getAllConversations();
        const existingIndex = conversations.findIndex(c => c.id === conversation.id);
        
        if (existingIndex >= 0) {
            conversations[existingIndex] = conversation;
        } else {
            conversations.unshift(conversation); // Add to beginning
            // Limit to MAX_CONVERSATIONS
            if (conversations.length > MAX_CONVERSATIONS) {
                conversations.splice(MAX_CONVERSATIONS);
            }
        }
        
        localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
    } catch (error) {
        console.error('Failed to save conversation:', error);
    }
}

/**
 * Create a new conversation
 */
export function createConversation(
    messages: Message[],
    sources: SearchResult[],
    settings?: Partial<ConversationSettings>
): Conversation {
    const id = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const firstMessage = messages.find(m => m.role === 'user')?.content || 'New Conversation';
    
    return {
        id,
        title: generateTitle(firstMessage),
        messages,
        sources,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        settings: { ...DEFAULT_SETTINGS, ...settings },
    };
}

/**
 * Update an existing conversation
 */
export function updateConversation(
    id: string,
    updates: Partial<Pick<Conversation, 'messages' | 'sources' | 'title' | 'settings'>>
): Conversation | null {
    const conversations = getAllConversations();
    const conversation = conversations.find(c => c.id === id);
    
    if (!conversation) return null;
    
    const updated: Conversation = {
        ...conversation,
        ...updates,
        updatedAt: Date.now(),
    };
    
    saveConversation(updated);
    return updated;
}

/**
 * Delete a conversation
 */
export function deleteConversation(id: string): void {
    try {
        const conversations = getAllConversations();
        const filtered = conversations.filter(c => c.id !== id);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    } catch (error) {
        console.error('Failed to delete conversation:', error);
    }
}

/**
 * Get a conversation by ID
 */
export function getConversation(id: string): Conversation | null {
    const conversations = getAllConversations();
    return conversations.find(c => c.id === id) || null;
}

/**
 * Export conversation as markdown
 */
export function exportConversationAsMarkdown(conversation: Conversation): string {
    let markdown = `# ${conversation.title}\n\n`;
    markdown += `Created: ${new Date(conversation.createdAt).toLocaleString()}\n\n`;
    markdown += `---\n\n`;
    
    conversation.messages.forEach((message, index) => {
        const role = message.role === 'user' ? 'You' : 'AI Assistant';
        markdown += `## ${role}\n\n`;
        markdown += `${message.content}\n\n`;
        markdown += `---\n\n`;
    });
    
    if (conversation.sources.length > 0) {
        markdown += `## Sources\n\n`;
        conversation.sources.forEach((source, index) => {
            markdown += `${index + 1}. [${source.title}](${source.url})\n`;
            markdown += `   - ${source.domain}\n`;
            markdown += `   - ${source.snippet}\n\n`;
        });
    }
    
    return markdown;
}

/**
 * Copy conversation to clipboard
 */
export async function copyConversationToClipboard(conversation: Conversation): Promise<boolean> {
    try {
        const markdown = exportConversationAsMarkdown(conversation);
        await navigator.clipboard.writeText(markdown);
        return true;
    } catch (error) {
        console.error('Failed to copy conversation:', error);
        return false;
    }
}

