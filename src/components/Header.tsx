interface HeaderProps {
    theme: 'light' | 'dark';
    onToggleTheme: () => void;
    onOpenConversations?: () => void;
    onOpenSettings?: () => void;
    onNewConversation?: () => void;
}

// Sun icon for light mode
const SunIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="5" />
        <line x1="12" y1="1" x2="12" y2="3" />
        <line x1="12" y1="21" x2="12" y2="23" />
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
        <line x1="1" y1="12" x2="3" y2="12" />
        <line x1="21" y1="12" x2="23" y2="12" />
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
);

// Moon icon for dark mode
const MoonIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
);

// History icon
const HistoryIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
    </svg>
);

// Settings icon
const SettingsIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M12 1v6m0 6v6M5.64 5.64l4.24 4.24m4.24 4.24l4.24 4.24M1 12h6m6 0h6M5.64 18.36l4.24-4.24m4.24-4.24l4.24-4.24" />
    </svg>
);

// Plus icon for new conversation
const PlusIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
);

export function Header({ theme, onToggleTheme, onOpenConversations, onOpenSettings, onNewConversation }: HeaderProps) {
    return (
        <header className="header">
            <div className="header__logo">
                <div className="header__logo-icon">P</div>
                <span className="gradient-text">Perplexity</span>
            </div>

            <div className="header__actions">
                {onNewConversation && (
                    <button
                        className="header__action-button"
                        onClick={onNewConversation}
                        aria-label="New conversation"
                        title="New conversation"
                    >
                        <PlusIcon />
                    </button>
                )}
                {onOpenConversations && (
                    <button
                        className="header__action-button"
                        onClick={onOpenConversations}
                        aria-label="Open conversations"
                        title="Conversation history"
                    >
                        <HistoryIcon />
                    </button>
                )}
                {onOpenSettings && (
                    <button
                        className="header__action-button"
                        onClick={onOpenSettings}
                        aria-label="Open settings"
                        title="Conversation settings"
                    >
                        <SettingsIcon />
                    </button>
                )}
                <button
                    className="theme-toggle"
                    onClick={onToggleTheme}
                    aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
                    title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
                >
                    {theme === 'light' ? <MoonIcon /> : <SunIcon />}
                </button>
            </div>
        </header>
    );
}
