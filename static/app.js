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

// DOM Elements
const navTree = document.getElementById('nav-tree');
const welcome = document.getElementById('welcome');
const article = document.getElementById('article');
const articleBody = document.getElementById('article-body');
const breadcrumb = document.getElementById('breadcrumb');
const explainBtn = document.getElementById('explain-btn');
const modalOverlay = document.getElementById('modal-overlay');
const modalBody = document.getElementById('modal-body');
const modalSelected = document.getElementById('modal-selected');
const modalClose = document.getElementById('modal-close');
const themeToggle = document.getElementById('theme-toggle');

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

function handleTextSelection() {
    const selection = window.getSelection();
    const text = selection.toString().trim();
    
    if (text.length > 0 && text.length < 1000) {
        selectedText = text;
        
        // Position the button near the selection
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        
        explainBtn.style.left = `${rect.left + rect.width / 2 - 60}px`;
        explainBtn.style.top = `${rect.bottom + window.scrollY + 10}px`;
        explainBtn.hidden = false;
    } else {
        hideExplainButton();
    }
}

function hideExplainButton() {
    explainBtn.hidden = true;
    selectedText = '';
}

async function explainSelection() {
    if (!selectedText) return;
    
    // Show modal with loading state
    modalSelected.textContent = selectedText;
    modalBody.innerHTML = `
        <div class="modal-loading">
            <div class="spinner"></div>
            <span>Thinking...</span>
        </div>
    `;
    modalOverlay.hidden = false;
    hideExplainButton();
    
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
                text: selectedText,
                context: context
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.detail || 'Failed to get explanation');
        }
        
        const data = await response.json();
        
        // Render the explanation as markdown
        modalBody.innerHTML = md.render(data.explanation);
        
    } catch (error) {
        console.error('Explain failed:', error);
        modalBody.innerHTML = `
            <div class="error-message">
                <p><strong>Error:</strong> ${error.message}</p>
                <p style="margin-top: 0.5rem; font-size: 0.9rem; color: var(--text-muted);">
                    Make sure your GEMINI_API_KEY is set in the .env file.
                </p>
            </div>
        `;
    }
}

function closeModal() {
    modalOverlay.hidden = true;
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

// Text selection
document.addEventListener('mouseup', (e) => {
    // Ignore clicks on the explain button itself
    if (e.target.closest('.explain-btn')) return;
    
    // Small delay to let selection complete
    setTimeout(handleTextSelection, 10);
});

// Hide explain button on scroll or click elsewhere
document.addEventListener('mousedown', (e) => {
    if (!e.target.closest('.explain-btn')) {
        hideExplainButton();
    }
});

// Explain button click
explainBtn.addEventListener('click', explainSelection);

// Modal close
modalClose.addEventListener('click', closeModal);
modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) {
        closeModal();
    }
});

// Escape key closes modal
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeModal();
    }
});

