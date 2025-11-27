/**
 * eace - Easy ECE
 * Frontend application for the learning wiki
 */

// Initialize markdown-it
const md = window.markdownit({
    html: true,
    linkify: true,
    typographer: true
});

// State
let currentPath = null;
let selectedText = '';
let activePopup = null;

// DOM Elements
const navTree = document.getElementById('nav-tree');
const welcome = document.getElementById('welcome');
const article = document.getElementById('article');
const articleBody = document.getElementById('article-body');
const breadcrumb = document.getElementById('breadcrumb');
const explainBtn = document.getElementById('explain-btn');
const themeToggle = document.getElementById('theme-toggle');
const contentWrapper = document.getElementById('content-wrapper');

// =========================
// Theme Management
// =========================

function initTheme() {
    const savedTheme = localStorage.getItem('eace-theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
}

function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('eace-theme', next);
}

// =========================
// LaTeX Rendering
// =========================

function renderLatex(element) {
    // Check if KaTeX is loaded
    if (typeof renderMathInElement === 'undefined') {
        // KaTeX not loaded yet, wait and retry
        setTimeout(() => renderLatex(element), 100);
        return;
    }
    
    renderMathInElement(element, {
        delimiters: [
            { left: '$$', right: '$$', display: true },
            { left: '$', right: '$', display: false },
            { left: '\\[', right: '\\]', display: true },
            { left: '\\(', right: '\\)', display: false }
        ],
        throwOnError: false,
        errorColor: '#E53935'
    });
}

// =========================
// Navigation Tree
// =========================

async function loadFileTree() {
    try {
        const response = await fetch('/tree');
        const tree = await response.json();
        
        if (tree.length === 0) {
            navTree.innerHTML = `
                <div class="nav-empty">
                    <p>No notes yet.</p>
                    <p style="font-size: 0.85rem; margin-top: 0.5rem;">
                        Add <code>.md</code> files to the <code>content/</code> folder.
                    </p>
                </div>
            `;
            return;
        }
        
        navTree.innerHTML = renderTree(tree);
        addNavListeners();
    } catch (error) {
        console.error('Failed to load file tree:', error);
        navTree.innerHTML = '<div class="nav-error">Failed to load navigation</div>';
    }
}

function renderTree(items) {
    return items.map(item => {
        if (item.type === 'directory') {
            return `
                <div class="nav-folder">
                    <div class="nav-folder-header">
                        <span class="nav-folder-icon">▼</span>
                        ${item.name}
                    </div>
                    <div class="nav-folder-items">
                        ${renderTree(item.children)}
                    </div>
                </div>
            `;
        } else {
            return `
                <a class="nav-item" data-path="${item.path}">
                    ${item.name}
                </a>
            `;
        }
    }).join('');
}

function addNavListeners() {
    // Folder toggle
    document.querySelectorAll('.nav-folder-header').forEach(header => {
        header.addEventListener('click', () => {
            header.parentElement.classList.toggle('collapsed');
        });
    });
    
    // File click
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            const path = item.dataset.path;
            loadContent(path);
            
            // Update active state
            document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');
        });
    });
}

// =========================
// Content Loading
// =========================

async function loadContent(path) {
    // Close any active popup when changing pages
    closePopup();
    
    try {
        const response = await fetch(`/content/${path}`);
        
        if (!response.ok) {
            throw new Error('Failed to load content');
        }
        
        const data = await response.json();
        currentPath = path;
        
        // Update breadcrumb
        const parts = path.split('/');
        breadcrumb.innerHTML = parts.map((part, i) => {
            const name = part.replace('.md', '').replace(/_/g, ' ');
            const isLast = i === parts.length - 1;
            return `<span>${name}</span>${isLast ? '' : ' / '}`;
        }).join('');
        
        // Render markdown
        articleBody.innerHTML = md.render(data.content);
        
        // Render LaTeX equations
        renderLatex(articleBody);
        
        // Show article, hide welcome
        welcome.hidden = true;
        article.hidden = false;
        
        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'smooth' });
        
    } catch (error) {
        console.error('Failed to load content:', error);
        articleBody.innerHTML = `
            <div class="error-message">
                <h2>Failed to load content</h2>
                <p>Could not load the requested file.</p>
            </div>
        `;
    }
}

// =========================
// Text Selection & Explain
// =========================

function handleTextSelection(e) {
    const selection = window.getSelection();
    
    // Must have an actual selection with content
    if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
        hideExplainButton();
        return;
    }
    
    const text = selection.toString().trim();
    
    // Must have meaningful text (at least 2 chars, less than 1000)
    if (text.length < 2 || text.length > 1000) {
        hideExplainButton();
        return;
    }
    
    // Selection must be within the article body
    const range = selection.getRangeAt(0);
    const selectionContainer = range.commonAncestorContainer;
    
    if (!articleBody || !articleBody.contains(selectionContainer)) {
        hideExplainButton();
        return;
    }
    
    selectedText = text;
    
    // Get the bounding rect of the selection
    const rect = range.getBoundingClientRect();
    
    // Get the content wrapper's right edge for alignment
    const contentRect = contentWrapper.getBoundingClientRect();
    
    // Position button at the right edge of the content area, aligned with selection
    const btnWidth = 110;
    const btnHeight = 32;
    const gap = 12; // gap from the right edge of content
    
    // Place button to the right of the content area
    let left = contentRect.right + gap;
    
    // If not enough space on the right, place it at the end of the selection
    if (left + btnWidth > window.innerWidth - 10) {
        left = rect.right + 8;
    }
    
    // If still overflowing, place below the selection
    if (left + btnWidth > window.innerWidth - 10) {
        left = Math.min(rect.right, window.innerWidth - btnWidth - 10);
    }
    
    // Vertical position: align with the top of the selection
    let top = rect.top + window.scrollY;
    
    // Make sure it doesn't go off screen
    top = Math.max(window.scrollY + 10, top);
    
    explainBtn.style.left = `${left}px`;
    explainBtn.style.top = `${top}px`;
    explainBtn.hidden = false;
}

function hideExplainButton() {
    explainBtn.hidden = true;
    selectedText = '';
}

function closePopup() {
    if (activePopup) {
        activePopup.remove();
        activePopup = null;
    }
}

function createExplainPopup(anchorRect) {
    // Close any existing popup
    closePopup();
    
    // Create popup element
    const popup = document.createElement('div');
    popup.className = 'explain-popup';
    popup.innerHTML = `
        <div class="explain-popup-header">
            <span class="explain-popup-title">
                <span class="explain-popup-icon">✨</span>
                eace Explain
            </span>
            <button class="explain-popup-close" title="Close">&times;</button>
        </div>
        <div class="explain-popup-selected"></div>
        <div class="explain-popup-body">
            <div class="explain-popup-loading">
                <div class="spinner"></div>
                <span>Thinking...</span>
            </div>
        </div>
    `;
    
    document.body.appendChild(popup);
    activePopup = popup;
    
    // Set the selected text
    popup.querySelector('.explain-popup-selected').textContent = selectedText;
    
    // Position the popup to the right of the selection
    positionPopup(popup, anchorRect);
    
    // Close button handler
    popup.querySelector('.explain-popup-close').addEventListener('click', closePopup);
    
    return popup;
}

function positionPopup(popup, anchorRect) {
    const popupWidth = 320;
    const padding = 16;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    // Get content wrapper position for better alignment
    const contentRect = contentWrapper.getBoundingClientRect();
    
    // Try to position to the right of the content area
    let left = contentRect.right + padding;
    let top = anchorRect.top + window.scrollY;
    
    // If not enough space on the right, position to the left of selection
    if (left + popupWidth > viewportWidth - padding) {
        left = anchorRect.left - popupWidth - padding;
    }
    
    // If still not fitting, position below the selection
    if (left < padding) {
        left = Math.max(padding, (viewportWidth - popupWidth) / 2);
        top = anchorRect.bottom + window.scrollY + padding;
    }
    
    // Ensure popup doesn't go below viewport
    const popupHeight = popup.offsetHeight || 200;
    const maxTop = window.scrollY + viewportHeight - popupHeight - padding;
    top = Math.min(top, maxTop);
    top = Math.max(window.scrollY + padding, top);
    
    popup.style.left = `${left}px`;
    popup.style.top = `${top}px`;
}

async function explainSelection() {
    if (!selectedText) return;
    
    // Get selection position before it's cleared
    const selection = window.getSelection();
    let anchorRect;
    
    if (selection && selection.rangeCount > 0) {
        anchorRect = selection.getRangeAt(0).getBoundingClientRect();
    } else {
        // Fallback to button position
        const btnRect = explainBtn.getBoundingClientRect();
        anchorRect = btnRect;
    }
    
    const textToExplain = selectedText;
    
    // Hide the explain button
    hideExplainButton();
    
    // Create and show the popup
    const popup = createExplainPopup(anchorRect);
    const popupBody = popup.querySelector('.explain-popup-body');
    
    try {
        // Get context from current path
        const context = currentPath 
            ? currentPath.replace('.md', '').replace(/_/g, ' ').replace(/\//g, ' > ')
            : null;
        
        const response = await fetch('/explain', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                text: textToExplain,
                context: context
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to get explanation');
        }
        
        const data = await response.json();
        
        // Render the explanation as markdown
        popupBody.innerHTML = `<div class="explain-popup-content">${md.render(data.explanation)}</div>`;
        
        // Also render any LaTeX in the explanation
        renderLatex(popupBody);
        
    } catch (error) {
        console.error('Explain failed:', error);
        
        const isApiKeyError = error.message.includes('API key') || error.message.includes('503');
        
        popupBody.innerHTML = `
            <div class="explain-popup-error">
                <p><strong>Could not get explanation</strong></p>
                <p class="error-detail">${isApiKeyError ? 'Gemini API key not configured.' : error.message}</p>
                ${isApiKeyError ? '<p class="error-hint">Add GEMINI_API_KEY to your .env file to enable AI explanations.</p>' : ''}
            </div>
        `;
    }
}

// =========================
// Event Listeners
// =========================

document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    loadFileTree();
});

// Theme toggle
themeToggle.addEventListener('click', toggleTheme);

// Text selection - only trigger on mouseup within content area
document.addEventListener('mouseup', (e) => {
    // Ignore clicks on UI elements
    if (e.target.closest('.explain-btn') || 
        e.target.closest('.explain-popup') ||
        e.target.closest('.sidebar') ||
        e.target.closest('.theme-toggle')) {
        return;
    }
    
    // Small delay to let selection complete
    setTimeout(() => handleTextSelection(e), 10);
});

// Hide explain button on mousedown (but not on popup or button)
document.addEventListener('mousedown', (e) => {
    if (!e.target.closest('.explain-btn') && !e.target.closest('.explain-popup')) {
        hideExplainButton();
    }
});

// Close popup when clicking outside of it
document.addEventListener('click', (e) => {
    if (activePopup && !e.target.closest('.explain-popup') && !e.target.closest('.explain-btn')) {
        closePopup();
    }
});

// Explain button click
explainBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    explainSelection();
});

// Escape key closes popup
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closePopup();
        hideExplainButton();
    }
});

// Reposition popup on scroll/resize
window.addEventListener('scroll', () => {
    // Close popup on scroll for simplicity
    if (activePopup) {
        closePopup();
    }
});
