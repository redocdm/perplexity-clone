/**
 * Initialize citation tooltips for dynamically rendered citations
 * Call this after content is rendered to make citations interactive
 */
export function initCitationTooltips(container: HTMLElement) {
    const citations = container.querySelectorAll('.citation[data-source-title]');
    
    citations.forEach((citation) => {
        // Skip if already initialized
        if ((citation as HTMLElement).dataset.tooltipInitialized === 'true') {
            return;
        }

        const citationEl = citation as HTMLElement;
        citationEl.dataset.tooltipInitialized = 'true';

        // Create tooltip element
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

        citationEl.appendChild(tooltip);

        // Handle hover
        citationEl.addEventListener('mouseenter', () => {
            tooltip.style.opacity = '1';
            tooltip.style.pointerEvents = 'auto';
        });

        citationEl.addEventListener('mouseleave', () => {
            tooltip.style.opacity = '0';
            tooltip.style.pointerEvents = 'none';
        });
    });
}

