import { useState, useEffect } from 'react';
import type { Conversation } from '../types/conversation';
import { getAllConversations, deleteConversation } from '../services/conversationService';

interface ConversationSidebarProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectConversation: (conversation: Conversation) => void;
    currentConversationId?: string;
}

// Icons
const XIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
);

const TrashIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="3 6 5 6 21 6" />
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
    </svg>
);

export function ConversationSidebar({
    isOpen,
    onClose,
    onSelectConversation,
    currentConversationId,
}: ConversationSidebarProps) {
    const [conversations, setConversations] = useState<Conversation[]>([]);

    useEffect(() => {
        if (isOpen) {
            setConversations(getAllConversations());
        }
    }, [isOpen]);

    const handleDelete = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (confirm('Delete this conversation?')) {
            deleteConversation(id);
            setConversations(getAllConversations());
        }
    };

    if (!isOpen) return null;

    return (
        <>
            <div className="sidebar-overlay" onClick={onClose} />
            <div className="conversation-sidebar">
                <div className="conversation-sidebar__header">
                    <h2>Conversations</h2>
                    <button
                        className="conversation-sidebar__close"
                        onClick={onClose}
                        aria-label="Close sidebar"
                    >
                        <XIcon />
                    </button>
                </div>

                <div className="conversation-sidebar__list">
                    {conversations.length === 0 ? (
                        <div className="conversation-sidebar__empty">
                            <p>No conversations yet</p>
                            <span>Start a new conversation to see it here</span>
                        </div>
                    ) : (
                        conversations.map((conversation) => (
                            <div
                                key={conversation.id}
                                className={`conversation-sidebar__item ${
                                    conversation.id === currentConversationId ? 'conversation-sidebar__item--active' : ''
                                }`}
                                onClick={() => {
                                    onSelectConversation(conversation);
                                    onClose();
                                }}
                            >
                                <div className="conversation-sidebar__item-content">
                                    <h3 className="conversation-sidebar__item-title">{conversation.title}</h3>
                                    <span className="conversation-sidebar__item-date">
                                        {new Date(conversation.updatedAt).toLocaleDateString()}
                                    </span>
                                </div>
                                <button
                                    className="conversation-sidebar__item-delete"
                                    onClick={(e) => handleDelete(e, conversation.id)}
                                    aria-label="Delete conversation"
                                >
                                    <TrashIcon />
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </>
    );
}

