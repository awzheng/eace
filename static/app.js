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
let fileTreeData = null;

// DOM Elements
const app = document.querySelector('.app');
const navTree = document.getElementById('nav-tree');
const welcome = document.getElementById('welcome');
const article = document.getElementById('article');
const articleBody = document.getElementById('article-body');
const breadcrumb = document.getElementById('breadcrumb');
const explainBtn = document.getElementById('explain-btn');
const themeToggle = document.getElementById('theme-toggle');
const contentWrapper = document.getElementById('content-wrapper');
const sidebarToggle = document.getElementById('sidebar-toggle');

// =========================
// Sidebar Toggle
// =========================

function toggleSidebar() {
    app.classList.toggle('sidebar-open');
    const isOpen = app.classList.contains('sidebar-open');
    sidebarToggle.textContent = isOpen ? '✕' : '☰';
    localStorage.setItem('eace-sidebar', isOpen ? 'open' : 'closed');
}

function initSidebar() {
    const saved = localStorage.getItem('eace-sidebar');
    if (saved === 'closed') {
        app.classList.remove('sidebar-open');
        sidebarToggle.textContent = '☰';
    } else {
        sidebarToggle.textContent = '✕';
    }
}

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
// URL Routing
// =========================

function getPathFromUrl() {
    const hash = window.location.hash.slice(1);
    if (hash) {
        return decodeURIComponent(hash);
    }
    return null;
}

function updateUrl(path) {
    const newHash = encodeURIComponent(path);
    history.pushState({ path: path }, '', `#${newHash}`);
}

// =========================
// LaTeX Rendering
// =========================

function renderLatex(element) {
    if (typeof renderMathInElement === 'undefined') {
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
// Navigation Tree (Flyout Style)
// =========================

async function loadFileTree() {
    try {
        const response = await fetch('/tree');
        const tree = await response.json();
        fileTreeData = tree;
        
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
        
        navTree.innerHTML = renderTree(tree, 0);
        addNavListeners();
        setupFlyoutPositioning();
        
        // Check URL and load content
        const urlPath = getPathFromUrl();
        if (urlPath) {
            loadContent(urlPath, true);
        }
    } catch (error) {
        console.error('Failed to load file tree:', error);
        navTree.innerHTML = '<div class="nav-error">Failed to load navigation</div>';
    }
}

function renderTree(items, depth = 0) {
    return items.map(item => {
        if (item.type === 'directory') {
            const hasChildren = item.children && item.children.length > 0;
            return `
                <div class="nav-folder" data-depth="${depth}">
                    <div class="nav-folder-header">
                        <span class="nav-folder-name">${item.name}</span>
                        ${hasChildren ? '<span class="nav-folder-arrow">›</span>' : ''}
                    </div>
                    ${hasChildren ? `
                        <div class="nav-flyout">
                            ${renderTree(item.children, depth + 1)}
                        </div>
                    ` : ''}
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

function setupFlyoutPositioning() {
    document.querySelectorAll('.nav-folder').forEach(folder => {
        const header = folder.querySelector(':scope > .nav-folder-header');
        const flyout = folder.querySelector(':scope > .nav-flyout');
        
        if (!flyout) return;
        
        folder.addEventListener('mouseenter', () => {
            const headerRect = header.getBoundingClientRect();
            const sidebarWidth = 260;
            
            // Check if this folder is inside another flyout (nested)
            const parentFlyout = folder.closest('.nav-flyout');
            
            let leftPos;
            if (parentFlyout) {
                // Nested flyout: position to the right of parent flyout
                const parentRect = parentFlyout.getBoundingClientRect();
                leftPos = parentRect.right;
            } else {
                // Top-level: position to the right of the sidebar
                leftPos = sidebarWidth;
            }
            
            flyout.style.left = `${leftPos}px`;
            flyout.style.top = `${Math.max(headerRect.top, 10)}px`;
            
            // Make sure it doesn't go off screen bottom
            const flyoutHeight = flyout.offsetHeight;
            const maxTop = window.innerHeight - flyoutHeight - 10;
            if (headerRect.top > maxTop) {
                flyout.style.top = `${maxTop}px`;
            }
            
            // Make sure it doesn't go off screen right
            const flyoutWidth = flyout.offsetWidth || 240;
            if (leftPos + flyoutWidth > window.innerWidth - 10) {
                // Position to the left of the parent instead
                if (parentFlyout) {
                    const parentRect = parentFlyout.getBoundingClientRect();
                    flyout.style.left = `${parentRect.left - flyoutWidth}px`;
                } else {
                    flyout.style.left = `${window.innerWidth - flyoutWidth - 10}px`;
                }
            }
        });
    });
}

function addNavListeners() {
    // File click
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const path = item.dataset.path;
            loadContent(path);
            
            // Update active state
            document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');
        });
    });
}

// =========================
// Table of Contents Sidebar
// =========================

let tocSidebar = null;

function generateTableOfContents() {
    // Remove existing ToC sidebar if any
    if (tocSidebar) {
        tocSidebar.remove();
        tocSidebar = null;
    }
    
    // Get all headings (h1, h2, h3) from article body
    const headings = articleBody.querySelectorAll('h1, h2, h3');
    
    if (headings.length <= 1) {
        // No ToC needed if only title or no headings
        return;
    }
    
    // Build ToC items, skipping the first h1 (title)
    const tocItems = [];
    let foundFirstH1 = false;
    let headingIndex = 0;
    
    headings.forEach((heading) => {
        // Skip the first h1 (page title)
        if (heading.tagName === 'H1' && !foundFirstH1) {
            foundFirstH1 = true;
            return;
        }
        
        // Generate unique ID for the heading if it doesn't have one
        if (!heading.id) {
            heading.id = `heading-${headingIndex++}`;
        }
        
        const level = parseInt(heading.tagName.charAt(1));
        const text = heading.textContent;
        
        tocItems.push({
            id: heading.id,
            text: text,
            level: level
        });
    });
    
    if (tocItems.length === 0) {
        return;
    }
    
    // Create ToC sidebar element
    tocSidebar = document.createElement('aside');
    tocSidebar.className = 'toc-sidebar';
    tocSidebar.innerHTML = `
        <button class="toc-sidebar-toggle" aria-label="Toggle table of contents" title="Toggle Contents">
            <span class="toc-toggle-icon">📑</span>
        </button>
        <div class="toc-sidebar-panel">
            <div class="toc-header">
                <span class="toc-icon">📑</span>
                <span class="toc-title">Contents</span>
            </div>
            <nav class="toc-body">
                <ol class="toc-list">
                    ${tocItems.map(item => `
                        <li class="toc-item toc-level-${item.level}">
                            <a href="#${item.id}" class="toc-link">${item.text}</a>
                        </li>
                    `).join('')}
                </ol>
            </nav>
        </div>
    `;
    
    // Append to body
    document.body.appendChild(tocSidebar);
    
    // Check saved state
    const savedState = localStorage.getItem('eace-toc-open');
    if (savedState === 'false') {
        tocSidebar.classList.add('collapsed');
    }
    
    // Add toggle functionality
    const toggleBtn = tocSidebar.querySelector('.toc-sidebar-toggle');
    toggleBtn.addEventListener('click', () => {
        tocSidebar.classList.toggle('collapsed');
        const isOpen = !tocSidebar.classList.contains('collapsed');
        localStorage.setItem('eace-toc-open', isOpen);
    });
    
    // Smooth scroll for ToC links
    tocSidebar.querySelectorAll('.toc-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('href').slice(1);
            const target = document.getElementById(targetId);
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });
    
    // Highlight current section on scroll
    setupScrollSpy();
}

function setupScrollSpy() {
    if (!tocSidebar) return;
    
    const tocLinks = tocSidebar.querySelectorAll('.toc-link');
    const headingIds = Array.from(tocLinks).map(link => link.getAttribute('href').slice(1));
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const id = entry.target.id;
                tocLinks.forEach(link => {
                    link.classList.toggle('active', link.getAttribute('href') === `#${id}`);
                });
            }
        });
    }, { rootMargin: '-20% 0px -70% 0px' });
    
    headingIds.forEach(id => {
        const heading = document.getElementById(id);
        if (heading) observer.observe(heading);
    });
}

function removeTableOfContents() {
    if (tocSidebar) {
        tocSidebar.remove();
        tocSidebar = null;
    }
}

// =========================
// Content Loading
// =========================

async function loadContent(path, skipUrlUpdate = false) {
    closePopup();
    
    try {
        const response = await fetch(`/content/${path}`);
        
        if (!response.ok) {
            throw new Error('Failed to load content');
        }
        
        const data = await response.json();
        currentPath = path;
        
        if (!skipUrlUpdate) {
            updateUrl(path);
        }
        
        // Update breadcrumb
        const parts = path.split('/');
        breadcrumb.innerHTML = parts.map((part, i) => {
            const name = part.replace('.md', '').replace(/_/g, ' ');
            const isLast = i === parts.length - 1;
            return `<span>${name}</span>${isLast ? '' : ' / '}`;
        }).join('');
        
        // Render markdown
        articleBody.innerHTML = md.render(data.content);
        
        // Generate Table of Contents
        generateTableOfContents();
        
        // Render LaTeX
        renderLatex(articleBody);
        
        // Show article, hide welcome
        welcome.hidden = true;
        article.hidden = false;
        
        // Update active nav item
        document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
        const navItem = document.querySelector(`.nav-item[data-path="${path}"]`);
        if (navItem) {
            navItem.classList.add('active');
        }
        
        window.scrollTo({ top: 0, behavior: 'smooth' });
        
    } catch (error) {
        console.error('Failed to load content:', error);
        articleBody.innerHTML = `
            <div class="error-message">
                <h2>Failed to load content</h2>
                <p>Could not load the requested file: ${path}</p>
            </div>
        `;
        welcome.hidden = true;
        article.hidden = false;
    }
}

// =========================
// Text Selection & Explain
// =========================

function handleTextSelection(e) {
    const selection = window.getSelection();
    
    if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
        hideExplainButton();
        return;
    }
    
    const text = selection.toString().trim();
    
    if (text.length < 2 || text.length > 1000) {
        hideExplainButton();
        return;
    }
    
    const range = selection.getRangeAt(0);
    const selectionContainer = range.commonAncestorContainer;
    
    if (!articleBody || !articleBody.contains(selectionContainer)) {
        hideExplainButton();
        return;
    }
    
    selectedText = text;
    
    const rect = range.getBoundingClientRect();
    const contentRect = contentWrapper.getBoundingClientRect();
    
    const btnWidth = 110;
    const gap = 12;
    
    let left = contentRect.right + gap;
    
    if (left + btnWidth > window.innerWidth - 10) {
        left = rect.right + 8;
    }
    
    if (left + btnWidth > window.innerWidth - 10) {
        left = Math.min(rect.right, window.innerWidth - btnWidth - 10);
    }
    
    let top = rect.top + window.scrollY;
    top = Math.max(window.scrollY + 10, top);
    
    explainBtn.style.left = `${left}px`;
    explainBtn.style.top = `${top}px`;
    explainBtn.hidden = false;
    explainBtn.classList.remove('hidden');
}

function hideExplainButton() {
    explainBtn.classList.add('hidden');
    setTimeout(() => {
        if (explainBtn.classList.contains('hidden')) {
            explainBtn.hidden = true;
        }
    }, 200);
    selectedText = '';
}

function closePopup() {
    if (activePopup) {
        activePopup.remove();
        activePopup = null;
    }
}

function createExplainPopup(anchorRect) {
    closePopup();
    
    const popup = document.createElement('div');
    popup.className = 'explain-popup';
    popup.innerHTML = `
        <div class="explain-popup-header">
            <span class="explain-popup-title">
                <span class="explain-popup-icon">⚡</span>
                eace Explain
            </span>
            <button class="explain-popup-close" title="Close">&times;</button>
        </div>
        <div class="explain-popup-body">
            <div class="explain-popup-loading">
                <div class="spinner"></div>
                <span>Thinking...</span>
            </div>
        </div>
    `;
    
    document.body.appendChild(popup);
    activePopup = popup;
    
    positionPopup(popup, anchorRect);
    
    popup.querySelector('.explain-popup-close').addEventListener('click', closePopup);
    
    return popup;
}

function positionPopup(popup, anchorRect) {
    const popupWidth = 320;
    const padding = 16;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    const contentRect = contentWrapper.getBoundingClientRect();
    
    let left = contentRect.right + padding;
    let top = anchorRect.top + window.scrollY;
    
    if (left + popupWidth > viewportWidth - padding) {
        left = anchorRect.left - popupWidth - padding;
    }
    
    if (left < padding) {
        left = Math.max(padding, (viewportWidth - popupWidth) / 2);
        top = anchorRect.bottom + window.scrollY + padding;
    }
    
    const popupHeight = popup.offsetHeight || 200;
    const maxTop = window.scrollY + viewportHeight - popupHeight - padding;
    top = Math.min(top, maxTop);
    top = Math.max(window.scrollY + padding, top);
    
    popup.style.left = `${left}px`;
    popup.style.top = `${top}px`;
}

async function explainSelection() {
    if (!selectedText) return;
    
    const selection = window.getSelection();
    let anchorRect;
    
    if (selection && selection.rangeCount > 0) {
        anchorRect = selection.getRangeAt(0).getBoundingClientRect();
    } else {
        const btnRect = explainBtn.getBoundingClientRect();
        anchorRect = btnRect;
    }
    
    const textToExplain = selectedText;
    
    hideExplainButton();
    
    const popup = createExplainPopup(anchorRect);
    const popupBody = popup.querySelector('.explain-popup-body');
    
    try {
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
        
        popupBody.innerHTML = `<div class="explain-popup-content">${md.render(data.explanation)}</div>`;
        
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
    initSidebar();
    loadFileTree();
});

// Sidebar toggle
sidebarToggle.addEventListener('click', toggleSidebar);

// Handle browser back/forward
window.addEventListener('popstate', (e) => {
    const urlPath = getPathFromUrl();
    if (urlPath) {
        loadContent(urlPath, true);
    } else {
        welcome.hidden = false;
        article.hidden = true;
        removeTableOfContents();
        document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    }
});

// Handle hashchange
window.addEventListener('hashchange', () => {
    const urlPath = getPathFromUrl();
    if (urlPath && urlPath !== currentPath) {
        loadContent(urlPath, true);
    }
});

// Theme toggle
themeToggle.addEventListener('click', toggleTheme);

// Text selection
document.addEventListener('mouseup', (e) => {
    if (e.target.closest('.explain-btn') || 
        e.target.closest('.explain-popup') ||
        e.target.closest('.sidebar') ||
        e.target.closest('.theme-toggle')) {
        return;
    }
    
    setTimeout(() => handleTextSelection(e), 10);
});

// Hide explain button on mousedown
document.addEventListener('mousedown', (e) => {
    if (!e.target.closest('.explain-btn') && !e.target.closest('.explain-popup')) {
        hideExplainButton();
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
