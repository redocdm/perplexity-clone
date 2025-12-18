import { useState } from 'react';
import type { SearchResult } from '../services/searchService';
import type { Task } from '../services/taskPlanner';

export interface AgentStep {
    stepNumber: number;
    task: Task;
    results: SearchResult[];
    isComplete: boolean;
}

interface AgentThinkingPanelProps {
    steps: AgentStep[];
    isExpanded?: boolean;
}

// Chevron down icon
const ChevronDown = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="6 9 12 15 18 9" />
    </svg>
);

// Chevron up icon
const ChevronUp = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="18 15 12 9 6 15" />
    </svg>
);

// Search icon
const SearchIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.35-4.35" />
    </svg>
);

export function AgentThinkingPanel({ steps, isExpanded: defaultExpanded = false }: AgentThinkingPanelProps) {
    const [isExpanded, setIsExpanded] = useState(defaultExpanded);
    const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set());

    const toggleStep = (stepNumber: number) => {
        const newExpanded = new Set(expandedSteps);
        if (newExpanded.has(stepNumber)) {
            newExpanded.delete(stepNumber);
        } else {
            newExpanded.add(stepNumber);
        }
        setExpandedSteps(newExpanded);
    };

    if (steps.length === 0) {
        return null;
    }

    const totalResults = steps.reduce((sum, step) => sum + step.results.length, 0);
    const completedSteps = steps.filter(s => s.isComplete).length;

    return (
        <div className="agent-thinking-panel">
            <button
                className="agent-thinking-panel__header"
                onClick={() => setIsExpanded(!isExpanded)}
                aria-expanded={isExpanded}
            >
                <div className="agent-thinking-panel__header-content">
                    <div className="agent-thinking-panel__icon">🧠</div>
                    <div className="agent-thinking-panel__title">
                        <span>Agent Thinking Process</span>
                        <span className="agent-thinking-panel__subtitle">
                            {completedSteps}/{steps.length} steps • {totalResults} sources found
                        </span>
                    </div>
                </div>
                {isExpanded ? <ChevronUp /> : <ChevronDown />}
            </button>

            {isExpanded && (
                <div className="agent-thinking-panel__content">
                    {steps.map((step) => (
                        <div
                            key={step.stepNumber}
                            className={`agent-thinking-panel__step ${step.isComplete ? 'agent-thinking-panel__step--complete' : 'agent-thinking-panel__step--pending'}`}
                        >
                            <button
                                className="agent-thinking-panel__step-header"
                                onClick={() => toggleStep(step.stepNumber)}
                                aria-expanded={expandedSteps.has(step.stepNumber)}
                            >
                                <div className="agent-thinking-panel__step-number">{step.stepNumber}</div>
                                <div className="agent-thinking-panel__step-info">
                                    <div className="agent-thinking-panel__step-description">{step.task.description}</div>
                                    <div className="agent-thinking-panel__step-meta">
                                        <span className="agent-thinking-panel__step-query">
                                            <SearchIcon />
                                            {step.task.searchQuery}
                                        </span>
                                        <span className="agent-thinking-panel__step-results">
                                            {step.results.length} result{step.results.length !== 1 ? 's' : ''}
                                        </span>
                                    </div>
                                </div>
                                {expandedSteps.has(step.stepNumber) ? <ChevronUp /> : <ChevronDown />}
                            </button>

                            {expandedSteps.has(step.stepNumber) && step.results.length > 0 && (
                                <div className="agent-thinking-panel__step-results">
                                    {step.results.map((result, index) => (
                                        <div key={result.id || index} className="agent-thinking-panel__result">
                                            <div className="agent-thinking-panel__result-header">
                                                <img
                                                    src={result.favicon || `https://www.google.com/s2/favicons?domain=${result.domain}&sz=16`}
                                                    alt=""
                                                    className="agent-thinking-panel__result-favicon"
                                                    onError={(e) => {
                                                        (e.target as HTMLImageElement).style.display = 'none';
                                                    }}
                                                />
                                                <a
                                                    href={result.url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="agent-thinking-panel__result-title"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    {result.title}
                                                </a>
                                            </div>
                                            <div className="agent-thinking-panel__result-domain">{result.domain}</div>
                                            <div className="agent-thinking-panel__result-snippet">{result.snippet}</div>
                                            {result.evidence && result.evidence !== result.snippet && (
                                                <div className="agent-thinking-panel__result-evidence">
                                                    <strong>Evidence:</strong> {result.evidence}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {expandedSteps.has(step.stepNumber) && step.results.length === 0 && (
                                <div className="agent-thinking-panel__step-no-results">
                                    No results found for this step.
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

