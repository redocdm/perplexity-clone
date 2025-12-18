import { useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import type { SearchResult } from '../services/searchService';
import { initCitationTooltips } from '../utils/citationTooltips';

interface MarkdownWithCitationsProps {
    content: string;
    sources?: SearchResult[];
}

/**
 * Component that renders markdown and replaces citation patterns [1], [2] with interactive citation spans
 * Uses post-processing to replace citations after ReactMarkdown renders
 */
export function MarkdownWithCitations({ content, sources }: MarkdownWithCitationsProps) {
    const containerRef = useRef<HTMLDivElement>(null);

    // Process citations after markdown renders
    useEffect(() => {
        if (!containerRef.current || !sources || sources.length === 0) {
            return;
        }

        const container = containerRef.current;
        const citationRegex = /\[(\d+)\]/g;
        
        // Find all text nodes and replace citations
        const walker = document.createTreeWalker(
            container,
            NodeFilter.SHOW_TEXT,
            null
        );

        const textNodes: Text[] = [];
        let node;
        while ((node = walker.nextNode())) {
            if (node.textContent && citationRegex.test(node.textContent)) {
                textNodes.push(node as Text);
            }
        }

        textNodes.forEach((textNode) => {
            const parent = textNode.parentElement;
            if (!parent) return;

            const text = textNode.textContent || '';
            const parts: (string | HTMLElement)[] = [];
            let lastIndex = 0;
            citationRegex.lastIndex = 0; // Reset regex

            let match;
            while ((match = citationRegex.exec(text)) !== null) {
                // Add text before citation
                if (match.index > lastIndex) {
                    parts.push(text.substring(lastIndex, match.index));
                }

                // Create citation element
                const citationIndex = parseInt(match[1], 10);
                const sourceIndex = citationIndex - 1;
                const source = sourceIndex >= 0 && sourceIndex < sources.length ? sources[sourceIndex] : undefined;

                const citationEl = document.createElement('span');
                citationEl.className = source ? 'citation' : 'citation citation--missing';
                citationEl.textContent = `[${citationIndex}]`;

                if (source) {
                    citationEl.setAttribute('data-citation-index', citationIndex.toString());
                    citationEl.setAttribute('data-source-title', source.title);
                    citationEl.setAttribute('data-source-url', source.url);
                    citationEl.setAttribute('data-source-domain', source.domain);
                    citationEl.setAttribute('data-source-snippet', (source.evidence || source.snippet).substring(0, 200));
                    citationEl.setAttribute('data-source-favicon', source.favicon || '');
                }

                parts.push(citationEl);
                lastIndex = match.index + match[0].length;
            }

            // Add remaining text
            if (lastIndex < text.length) {
                parts.push(text.substring(lastIndex));
            }

            // Replace text node with new content
            if (parts.length > 1 || (parts.length === 1 && typeof parts[0] !== 'string')) {
                const fragment = document.createDocumentFragment();
                parts.forEach((part) => {
                    if (typeof part === 'string') {
                        fragment.appendChild(document.createTextNode(part));
                    } else {
                        fragment.appendChild(part);
                    }
                });
                parent.replaceChild(fragment, textNode);
            }
        });

        // Initialize tooltips after citations are created
        initCitationTooltips(container);
    }, [content, sources]);

    return (
        <div ref={containerRef} className="markdown-with-citations">
            <ReactMarkdown>{content}</ReactMarkdown>
        </div>
    );
}

