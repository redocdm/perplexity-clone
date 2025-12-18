import { useState } from 'react';
import type { Conversation } from '../types/conversation';
import { copyConversationToClipboard, exportConversationAsMarkdown } from '../services/conversationService';

interface ConversationActionsProps {
    conversation: Conversation | null;
    onShare?: (shareUrl: string) => void;
}

// Share icon
const ShareIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="18" cy="5" r="3" />
        <circle cx="6" cy="12" r="3" />
        <circle cx="18" cy="19" r="3" />
        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
);

// Copy icon
const CopyIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
);

// Download icon
const DownloadIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
);

export function ConversationActions({ conversation, onShare }: ConversationActionsProps) {
    const [copied, setCopied] = useState(false);

    if (!conversation) return null;

    const handleCopy = async () => {
        const success = await copyConversationToClipboard(conversation);
        if (success) {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleDownload = () => {
        const markdown = exportConversationAsMarkdown(conversation);
        const blob = new Blob([markdown], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${conversation.title.replace(/[^a-z0-9]/gi, '_')}.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleShare = () => {
        // Generate share URL (for now, using a simple approach with conversation ID)
        // In production, this would create a shareable link via backend
        const shareUrl = `${window.location.origin}?share=${conversation.id}`;
        if (onShare) {
            onShare(shareUrl);
        } else {
            // Fallback: copy share URL to clipboard
            navigator.clipboard.writeText(shareUrl).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            });
        }
    };

    return (
        <div className="conversation-actions">
            <button
                className="conversation-actions__button"
                onClick={handleShare}
                title="Share conversation"
                aria-label="Share conversation"
            >
                <ShareIcon />
                <span>Share</span>
            </button>
            <button
                className="conversation-actions__button"
                onClick={handleCopy}
                title={copied ? 'Copied!' : 'Copy conversation'}
                aria-label="Copy conversation"
            >
                <CopyIcon />
                <span>{copied ? 'Copied!' : 'Copy'}</span>
            </button>
            <button
                className="conversation-actions__button"
                onClick={handleDownload}
                title="Download as markdown"
                aria-label="Download conversation"
            >
                <DownloadIcon />
                <span>Export</span>
            </button>
        </div>
    );
}

