/**
 * Initialize citation tooltips for dynamically rendered citations
 * Call this after content is rendered to make citations interactive
 * Fixed to prevent duplicate tooltips
 */
export function initCitationTooltips(
    container: HTMLElement,
    onCitationClick?: (citationIndex: number) => void
) {
    // Clean up any existing tooltips first
    const existingTooltips = container.querySelectorAll('.citation-tooltip');
    existingTooltips.forEach(tooltip => tooltip.remove());

    // Reset initialization flags
    const allCitations = container.querySelectorAll('.citation');
    allCitations.forEach(citation => {
        (citation as HTMLElement).dataset.tooltipInitialized = 'false';
    });

    const citations = container.querySelectorAll('.citation[data-source-title]');
    
    citations.forEach((citation) => {
        const citationEl = citation as HTMLElement;
        
        // Skip if already initialized (double check)
        if (citationEl.dataset.tooltipInitialized === 'true') {
            return;
        }

        citationEl.dataset.tooltipInitialized = 'true';

        // Create tooltip element (only one per citation)
        const tooltip = document.createElement('div');
        tooltip.className = 'citation-tooltip';
        
        const title = citationEl.dataset.sourceTitle || '';
        const url = citationEl.dataset.sourceUrl || '';
        const domain = citationEl.dataset.sourceDomain || '';
        const snippet = citationEl.dataset.sourceSnippet || '';
        const favicon = citationEl.dataset.sourceFavicon || `https://www.google.com/s2/favicons?domain=${domain}&sz=16`;

        tooltip.innerHTML = `
            <div class="citation-tooltip__header">
                <img src="${favicon}" alt="" class="citation-tooltip__favicon" onerror="this.style.display='none'" />
                <span class="citation-tooltip__domain">${domain}</span>
            </div>
            <h4 class="citation-tooltip__title">${title}</h4>
            <p class="citation-tooltip__snippet">${snippet}</p>
            <a href="${url}" target="_blank" rel="noopener noreferrer" class="citation-tooltip__link">View source →</a>
        `;

        // Append tooltip (only one will exist)
        citationEl.appendChild(tooltip);

        // Handle hover - show only this tooltip
        const showTooltip = () => {
            // Hide all other tooltips first
            container.querySelectorAll('.citation-tooltip').forEach(t => {
                (t as HTMLElement).style.opacity = '0';
                (t as HTMLElement).style.pointerEvents = 'none';
            });
            // Show this one
            tooltip.style.opacity = '1';
            tooltip.style.pointerEvents = 'auto';
        };

        const hideTooltip = () => {
            tooltip.style.opacity = '0';
            tooltip.style.pointerEvents = 'none';
        };

        citationEl.addEventListener('mouseenter', showTooltip);
        citationEl.addEventListener('mouseleave', hideTooltip);

        // Handle click to scroll to source
        if (onCitationClick) {
            citationEl.style.cursor = 'pointer';
            citationEl.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const citationIndex = parseInt(citationEl.dataset.citationIndex || '0', 10);
                const sourceIndex = citationIndex - 1; // Convert to 0-indexed
                if (sourceIndex >= 0) {
                    onCitationClick(sourceIndex);
                }
            });
        }
    });
}

