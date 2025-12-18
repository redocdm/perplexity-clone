import { useState } from 'react';
import type { ConversationSettings } from '../types/conversation';

interface ConversationSettingsProps {
    settings: ConversationSettings;
    onSettingsChange: (settings: ConversationSettings) => void;
    onClose: () => void;
}

// Settings icon
const SettingsIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M12 1v6m0 6v6M5.64 5.64l4.24 4.24m4.24 4.24l4.24 4.24M1 12h6m6 0h6M5.64 18.36l4.24-4.24m4.24-4.24l4.24-4.24" />
    </svg>
);

const XIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="18" y1="6" x2="6" y2="18" />
        <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
);

export function ConversationSettings({ settings, onSettingsChange, onClose }: ConversationSettingsProps) {
    const [localSettings, setLocalSettings] = useState<ConversationSettings>(settings);

    const handleSave = () => {
        onSettingsChange(localSettings);
        onClose();
    };

    return (
        <div className="settings-modal">
            <div className="settings-modal__overlay" onClick={onClose} />
            <div className="settings-modal__content">
                <div className="settings-modal__header">
                    <div className="settings-modal__header-title">
                        <SettingsIcon />
                        <h2>Conversation Settings</h2>
                    </div>
                    <button
                        className="settings-modal__close"
                        onClick={onClose}
                        aria-label="Close settings"
                    >
                        <XIcon />
                    </button>
                </div>

                <div className="settings-modal__body">
                    <div className="settings-field">
                        <label className="settings-field__label">Tone</label>
                        <select
                            className="settings-field__select"
                            value={localSettings.tone}
                            onChange={(e) =>
                                setLocalSettings({ ...localSettings, tone: e.target.value as ConversationSettings['tone'] })
                            }
                        >
                            <option value="casual">Casual</option>
                            <option value="professional">Professional</option>
                            <option value="technical">Technical</option>
                        </select>
                        <p className="settings-field__description">
                            {localSettings.tone === 'casual' && 'Friendly and conversational'}
                            {localSettings.tone === 'professional' && 'Formal and business-appropriate'}
                            {localSettings.tone === 'technical' && 'Precise and jargon-rich'}
                        </p>
                    </div>

                    <div className="settings-field">
                        <label className="settings-field__label">Depth</label>
                        <select
                            className="settings-field__select"
                            value={localSettings.depth}
                            onChange={(e) =>
                                setLocalSettings({ ...localSettings, depth: e.target.value as ConversationSettings['depth'] })
                            }
                        >
                            <option value="brief">Brief</option>
                            <option value="detailed">Detailed</option>
                            <option value="comprehensive">Comprehensive</option>
                        </select>
                        <p className="settings-field__description">
                            {localSettings.depth === 'brief' && 'Short, concise answers'}
                            {localSettings.depth === 'detailed' && 'Moderate detail with context'}
                            {localSettings.depth === 'comprehensive' && 'In-depth explanations with examples'}
                        </p>
                    </div>

                    <div className="settings-field">
                        <label className="settings-field__label">Citation Strictness</label>
                        <select
                            className="settings-field__select"
                            value={localSettings.citationStrictness}
                            onChange={(e) =>
                                setLocalSettings({
                                    ...localSettings,
                                    citationStrictness: e.target.value as ConversationSettings['citationStrictness'],
                                })
                            }
                        >
                            <option value="relaxed">Relaxed</option>
                            <option value="standard">Standard</option>
                            <option value="strict">Strict</option>
                        </select>
                        <p className="settings-field__description">
                            {localSettings.citationStrictness === 'relaxed' && 'Fewer citations, more flexibility'}
                            {localSettings.citationStrictness === 'standard' && 'Balanced citation coverage'}
                            {localSettings.citationStrictness === 'strict' && 'Require citations for all factual claims'}
                        </p>
                    </div>
                </div>

                <div className="settings-modal__footer">
                    <button className="settings-modal__button settings-modal__button--secondary" onClick={onClose}>
                        Cancel
                    </button>
                    <button className="settings-modal__button settings-modal__button--primary" onClick={handleSave}>
                        Save Settings
                    </button>
                </div>
            </div>
        </div>
    );
}

