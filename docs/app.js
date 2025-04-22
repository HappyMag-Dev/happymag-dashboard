// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyAmahPg4Y06bQZ2eV132cxwvibpk96YeIA",
    authDomain: "happy-mag-content.firebaseapp.com",
    projectId: "happy-mag-content",
    storageBucket: "happy-mag-content.firebasestorage.app",
    messagingSenderId: "1083309043960",
    appId: "1:1083309043960:web:c252601041193e1d7a4b0d"
  };

// Check authentication before doing anything else
if (!sessionStorage.getItem('authenticated')) {
    window.location.href = '../index.html';
}

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// DOM Elements
const lastUpdatedEl = document.getElementById('last-updated');
const scrapedCountEl = document.getElementById('scraped-count');
const rewrittenCountEl = document.getElementById('rewritten-count');
const postedCountEl = document.getElementById('posted-count');
const scrapedTodayEl = document.getElementById('scraped-today');
const rewrittenTodayEl = document.getElementById('rewritten-today');
const postedTodayEl = document.getElementById('posted-today');
const activityTableBodyEl = document.getElementById('activity-table-body');
const articlesContainerEl = document.getElementById('articles-container');
const filterStatusEl = document.getElementById('filter-status');
const refreshBtnEl = document.getElementById('refresh-btn');
const runManuallyBtnEl = document.getElementById('run-manually-btn');
const articleModalEl = document.getElementById('article-modal');
const modalTitleEl = document.getElementById('modal-title');
const originalContentEl = document.getElementById('original-content');
const rewrittenContentEl = document.getElementById('rewritten-content');
const modalUrlEl = document.getElementById('modal-url');
const wordpressLinkEl = document.getElementById('wordpress-link');
const closeModalEl = document.getElementById('close-modal');

// Global state
let currentFilter = 'all';
let articles = [];

// Initialize the dashboard
function initDashboard() {
    // Update timestamps
    updateLastUpdated();
    updateCurrentDate();
    
    // Load data
    loadStats();
    loadActivity();
    loadArticles();
    
    // Set up event listeners
    setupEventListeners();
}

// Update the last updated timestamp
function updateLastUpdated() {
    const now = new Date();
    lastUpdatedEl.textContent = `Last updated: ${now.toLocaleString()}`;
}

// Update the current date in a clean format
function updateCurrentDate() {
    const now = new Date();
    const options = { 
        month: 'long', 
        day: 'numeric',
        year: 'numeric'
    };
    const currentDateEl = document.getElementById('current-date');
    if (currentDateEl) {
        currentDateEl.textContent = now.toLocaleDateString('en-US', options);
    }
}

// Load statistics
function loadStats() {
    // Get article counts
    db.collection('articles').get().then(snapshot => {
        const allArticles = snapshot.docs.map(doc => doc.data());
        
        // Total counts
        const scraped = allArticles.length;
        const rewritten = allArticles.filter(article => article.status === 'rewritten' || article.status === 'drafted').length;
        const drafted = allArticles.filter(article => article.status === 'drafted').length;
        
        scrapedCountEl.textContent = scraped;
        rewrittenCountEl.textContent = rewritten;
        postedCountEl.textContent = drafted;
        
        // Today's counts
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const scrapedToday = allArticles.filter(article => {
            if (!article.scraped_at) return false;
            const scrapedDate = new Date(article.scraped_at);
            return scrapedDate >= today;
        }).length;
        
        const rewrittenToday = allArticles.filter(article => {
            if (!article.rewritten_at) return false;
            const rewrittenDate = new Date(article.rewritten_at);
            return rewrittenDate >= today;
        }).length;
        
        const draftedToday = allArticles.filter(article => {
            if (!article.drafted_at) return false;
            const draftedDate = new Date(article.drafted_at);
            return draftedDate >= today;
        }).length;
        
        scrapedTodayEl.textContent = `Today: ${scrapedToday}`;
        rewrittenTodayEl.textContent = `Today: ${rewrittenToday}`;
        postedTodayEl.textContent = `Today: ${draftedToday}`;
        
        // Update progress bars after loading stats
        updateProgressBars(scraped, rewritten, drafted);
    }).catch(error => {
        console.error("Error loading stats:", error);
    });
}

// Update progress bars based on stats
function updateProgressBars(scraped, rewritten, drafted) {
    // Only update if we have articles
    if (scraped > 0) {
        // Calculate percentages
        const rewrittenPercent = Math.round((rewritten / scraped) * 100);
        const postedPercent = Math.round((drafted / scraped) * 100);
        
        // Update progress bars if they exist
        const rewrittenProgressEl = document.getElementById('rewritten-progress');
        const postedProgressEl = document.getElementById('posted-progress');
        
        if (rewrittenProgressEl) {
            rewrittenProgressEl.style.width = `${rewrittenPercent}%`;
        }
        
        if (postedProgressEl) {
            postedProgressEl.style.width = `${postedPercent}%`;
        }
    }
}

// Load recent activity
function loadActivity() {
    db.collection('runs')
        .orderBy('timestamp', 'desc')
        .limit(10)
        .get()
        .then(snapshot => {
            if (snapshot.empty) {
                activityTableBodyEl.innerHTML = `
                    <tr>
                        <td colspan="3" class="p-4 text-center text-gray-500">No activity found</td>
                    </tr>
                `;
                return;
            }
            
            let html = '';
            snapshot.forEach(doc => {
                const run = doc.data();
                const timestamp = new Date(run.timestamp).toLocaleString();
                
                // Convert technical terms to user-friendly terms
                let type = '';
                if (run.type === 'scrape') {
                    type = 'Finding Articles';
                } else if (run.type === 'rewrite') {
                    type = 'Rewriting Articles';
                } else if (run.type === 'wordpress' || run.type === 'wordpress_draft') {
                    type = 'Publishing Articles';
                } else {
                    // Capitalize first letter as fallback
                    type = run.type.charAt(0).toUpperCase() + run.type.slice(1);
                }
                
                let results = '';
                if (run.stats) {
                    if (run.type === 'scrape') {
                        results = `Found ${run.stats.articles_found} articles, ${run.stats.articles_new} new`;
                    } else if (run.type === 'rewrite') {
                        results = `Processed ${run.stats.articles_processed} articles, ${run.stats.articles_rewritten} rewritten`;
                    } else if (run.type === 'wordpress') {
                        results = `Processed ${run.stats.articles_processed} articles, ${run.stats.articles_posted} published`;
                    } else if (run.type === 'wordpress_draft') {
                        results = `Processed ${run.stats.articles_processed} articles, ${run.stats.articles_drafted} published`;
                    }
                }
                
                html += `
                    <tr class="border-t border-gray-100 hover:bg-gray-50">
                        <td class="p-4">${timestamp}</td>
                        <td class="p-4">${type}</td>
                        <td class="p-4">${results}</td>
                    </tr>
                `;
            });
            
            activityTableBodyEl.innerHTML = html;
        })
        .catch(error => {
            console.error("Error loading activity:", error);
            activityTableBodyEl.innerHTML = `
                <tr>
                    <td colspan="3" class="p-4 text-center text-gray-500">Error loading activity</td>
                </tr>
            `;
        });
}

// Load articles
function loadArticles() {
    db.collection('articles')
        .orderBy('scraped_at', 'desc')
        .limit(12)
        .get()
        .then(snapshot => {
            articles = snapshot.docs.map(doc => {
                return {
                    id: doc.id,
                    ...doc.data()
                };
            });
            
            renderArticles();
        })
        .catch(error => {
            console.error("Error loading articles:", error);
            articlesContainerEl.innerHTML = `
                <div class="col-span-3 text-center p-4">
                    <p class="text-gray-500">Error loading articles</p>
                </div>
            `;
        });
}

// Render articles based on filter
function renderArticles() {
    // Filter articles
    let filteredArticles = articles;
    if (currentFilter !== 'all') {
        filteredArticles = articles.filter(article => article.status === currentFilter);
    }
    
    // Check if there are no articles
    if (filteredArticles.length === 0) {
        articlesContainerEl.innerHTML = `
            <div class="col-span-1 md:col-span-3 text-center p-6 bg-white rounded-xl shadow-sm border border-gray-100">
                <p class="text-gray-500">No articles found</p>
            </div>
        `;
        return;
    }
    
    // Render articles
    let html = '';
    filteredArticles.forEach((article, index) => {
        const title = article.title || 'Untitled Article';
        const published = article.published || 'Unknown date';
        const author = article.author || 'Unknown author';
        
        // Format date nicely if we have it
        let formattedDate = published;
        if (article.scraped_at) {
            const date = new Date(article.scraped_at);
            formattedDate = date.toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric', 
                year: 'numeric' 
            });
        }
        
        let statusBadge = '';
        let statusColor = 'primary';
        let statusIcon = '';
        let viewButtonText = 'View Details';
        
        if (article.status === 'scraped') {
            statusBadge = '<span class="bg-primary-100 text-primary-800 text-xs px-2 py-1 rounded-full">Found</span>';
            statusIcon = `<svg class="w-4 h-4 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>`;
        } else if (article.status === 'rewritten') {
            statusBadge = '<span class="bg-amber-100 text-amber-800 text-xs px-2 py-1 rounded-full">Rewritten</span>';
            statusColor = 'amber';
            statusIcon = `<svg class="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path>
            </svg>`;
            viewButtonText = 'View Content';
        } else if (article.status === 'drafted') {
            statusBadge = '<span class="bg-emerald-100 text-emerald-800 text-xs px-2 py-1 rounded-full">Published</span>';
            statusColor = 'emerald';
            statusIcon = `<svg class="w-4 h-4 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
            </svg>`;
            viewButtonText = 'View Content';
        }
        
        // Add animation delay based on index for staggered entrance
        const delay = 0.05 * (index % 6); // 0.05s delay increment with max of 6 items
        
        html += `
            <div class="bg-white rounded-xl border border-${statusColor}-100 p-5 shadow-sm article-card hover:shadow animate-slide-up" 
                 style="animation-delay: ${delay}s" data-id="${article.id}">
                <div class="flex justify-between items-start mb-3">
                    <div class="flex items-center">
                        ${statusIcon}
                        <span class="ml-1">${statusBadge}</span>
                    </div>
                </div>
                <h3 class="font-medium text-gray-800 mb-2 line-clamp-2 text-lg">${title}</h3>
                <div class="text-sm text-gray-500 mb-4 space-y-1">
                    <div class="flex items-center">
                        <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                        </svg>
                        ${formattedDate}
                    </div>
                    <div class="flex items-center">
                        <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                        </svg>
                        ${author}
                    </div>
                </div>
                <button class="w-full py-2 px-4 bg-${statusColor}-50 hover:bg-${statusColor}-100 rounded-lg text-sm transition-colors text-${statusColor}-700 view-article-btn" data-id="${article.id}">
                    ${viewButtonText}
                </button>
            </div>
        `;
    });
    
    articlesContainerEl.innerHTML = html;
    
    // Add event listeners to view article buttons
    document.querySelectorAll('.view-article-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent the card click from also firing
            openArticleModal(button.dataset.id);
        });
    });
    
    // Also add event listeners to the whole article card
    document.querySelectorAll('.article-card').forEach(card => {
        card.addEventListener('click', (e) => {
            // Don't trigger if they clicked the button (which has its own handler)
            if (!e.target.closest('.view-article-btn')) {
                openArticleModal(card.dataset.id);
            }
        });
    });
}

// Open article modal
function openArticleModal(articleId) {
    const article = articles.find(a => a.id === articleId);
    if (!article) return;
    
    // Set modal title with status indicator
    let statusBadge = '';
    let statusColor = 'primary';
    
    if (article.status === 'scraped') {
        statusBadge = '<span class="bg-primary-100 text-primary-800 text-xs px-2 py-1 rounded-full ml-2">Found</span>';
    } else if (article.status === 'rewritten') {
        statusBadge = '<span class="bg-amber-100 text-amber-800 text-xs px-2 py-1 rounded-full ml-2">Rewritten</span>';
    } else if (article.status === 'drafted') {
        statusBadge = '<span class="bg-emerald-100 text-emerald-800 text-xs px-2 py-1 rounded-full ml-2">Published</span>';
    }
    
    modalTitleEl.innerHTML = `${article.title || 'Untitled Article'} ${statusBadge}`;
    
    // Format the date if we have it
    let formattedDate = 'Unknown date';
    if (article.scraped_at) {
        const date = new Date(article.scraped_at);
        formattedDate = date.toLocaleDateString('en-US', { 
            weekday: 'long',
            month: 'long', 
            day: 'numeric', 
            year: 'numeric' 
        });
    }
    
    // Set original content with styled header
    originalContentEl.innerHTML = `
        <div class="mb-3 pb-2 border-b border-gray-200">
            <div class="text-sm text-gray-500 mb-1">Original Source</div>
            <div class="flex items-center justify-between">
                <a href="${article.url || '#'}" target="_blank" class="text-primary-600 hover:underline text-sm flex items-center">
                    <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
                    </svg>
                    Visit Source
                </a>
                <span class="text-xs text-gray-500">${formattedDate}</span>
            </div>
        </div>
        <div class="prose prose-sm max-w-none">
            <p>${article.body || 'No content available'}</p>
        </div>
    `;
    
    // Set rewritten content with copy button and formatting
    if (article.rewritten_html) {
        const copyButton = `
            <button id="copy-rewritten-btn" class="px-3 py-1 text-sm bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center">
                <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-4m-7-5l3-3m0 0l3 3m-3-3v12"></path>
                </svg>
                Copy Article
            </button>
        `;
        
        rewrittenContentEl.innerHTML = `
            <div class="mb-3 pb-2 border-b border-gray-200 flex justify-between items-center">
                <div class="text-sm text-gray-500">Rewritten Content</div>
                ${copyButton}
            </div>
            <div id="rewritten-text" class="prose prose-sm max-w-none">
                ${article.rewritten_html}
            </div>
        `;
        
        // Add event listener to the copy button
        setTimeout(() => {
            const copyBtn = document.getElementById('copy-rewritten-btn');
            if (copyBtn) {
                copyBtn.addEventListener('click', () => copyArticleContent());
            }
        }, 0);
    } else {
        rewrittenContentEl.innerHTML = `
            <div class="flex items-center justify-center h-32 bg-gray-50">
                <div class="text-center">
                    <svg class="w-8 h-8 mx-auto text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    <p class="mt-2 text-gray-500">Not yet rewritten</p>
                </div>
            </div>
        `;
    }
    
    // Set URL
    modalUrlEl.textContent = article.url || 'Not available';
    modalUrlEl.href = article.url || '#';
    
    // Check if drafted to WordPress
    if (article.wordpress_id) {
        const wordpressUrl = getWordPressUrl(article.wordpress_id);
        wordpressLinkEl.href = wordpressUrl;
        wordpressLinkEl.classList.remove('hidden');
        wordpressLinkEl.innerHTML = `
            <svg class="w-4 h-4 mr-1 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path>
            </svg>
            View on Website
        `;
    } else {
        wordpressLinkEl.classList.add('hidden');
    }
    
    // Show modal with animation
    articleModalEl.classList.remove('hidden');
    
    // Add escape key listener for closing
    document.addEventListener('keydown', handleEscapeKey);
}

// Handle escape key press to close modal
function handleEscapeKey(e) {
    if (e.key === 'Escape') {
        closeArticleModal();
    }
}

// Function to copy the rewritten article content
function copyArticleContent() {
    const rewrittenText = document.getElementById('rewritten-text');
    if (!rewrittenText) return;
    
    // Get the text content (strip HTML)
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = rewrittenText.innerHTML;
    const textToCopy = tempDiv.textContent || tempDiv.innerText || '';
    
    // Try to use clipboard API first
    if (navigator.clipboard) {
        navigator.clipboard.writeText(textToCopy).then(() => {
            showCopyFeedback(true);
        }).catch(err => {
            console.error('Error copying text with Clipboard API: ', err);
            // Fall back to execCommand
            copyTextFallback(textToCopy);
        });
    } else {
        // Use fallback for browsers without Clipboard API
        copyTextFallback(textToCopy);
    }
}

// Fallback copy method using execCommand
function copyTextFallback(text) {
    try {
        const textArea = document.getElementById('hidden-textarea');
        if (!textArea) {
            // Create the textarea if it doesn't exist
            const newTextArea = document.createElement('textarea');
            newTextArea.id = 'hidden-textarea';
            newTextArea.style.position = 'absolute';
            newTextArea.style.left = '-9999px';
            newTextArea.setAttribute('aria-hidden', 'true');
            document.body.appendChild(newTextArea);
            textArea = newTextArea;
        }
        
        textArea.value = text;
        textArea.focus();
        textArea.select();
        
        const successful = document.execCommand('copy');
        if (successful) {
            showCopyFeedback(true);
        } else {
            showCopyFeedback(false);
        }
    } catch (err) {
        console.error('Fallback: Error copying text: ', err);
        showCopyFeedback(false);
        alert('Failed to copy text. Please manually select and copy the content.');
    }
}

// Get WordPress URL from post ID
function getWordPressUrl(postId) {
    // This should be configured to match your WordPress site
    return `https://happymag.tv/wp-admin/post.php?post=${postId}&action=edit`;
}

// Close article modal
function closeArticleModal() {
    articleModalEl.classList.add('hidden');
    // Remove escape key listener
    document.removeEventListener('keydown', handleEscapeKey);
}

// Setup event listeners
function setupEventListeners() {
    // Refresh button
    refreshBtnEl.addEventListener('click', () => {
        updateLastUpdated();
        loadStats();
        loadActivity();
        loadArticles();
    });
    
    // Filter status
    filterStatusEl.addEventListener('change', () => {
        currentFilter = filterStatusEl.value;
        renderArticles();
    });
    
    // Run manually button
    runManuallyBtnEl.addEventListener('click', () => {
        // This would trigger a GitHub Action workflow dispatch in a real implementation
        alert('This would trigger a manual run on the server. Not implemented in this demo.');
    });
    
    // Close modal button
    closeModalEl.addEventListener('click', closeArticleModal);
    
    // Close modal when clicking outside
    articleModalEl.addEventListener('click', (e) => {
        if (e.target === articleModalEl) {
            closeArticleModal();
        }
    });
}

// Initialize the dashboard when the page loads
document.addEventListener('DOMContentLoaded', initDashboard);

// Extract showCopyFeedback as a standalone function for reuse
function showCopyFeedback(success = true) {
    const copyBtn = document.getElementById('copy-rewritten-btn');
    if (copyBtn) {
        const originalText = copyBtn.innerHTML;
        const originalClasses = copyBtn.className;
        
        // Change button appearance
        copyBtn.innerHTML = success ? 
            `<svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
            </svg> Copied!` : 
            `<svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg> Failed to copy`;
        
        copyBtn.className = success ? 
            'px-3 py-1 text-sm bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors flex items-center' : 
            'px-3 py-1 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center';
        
        // Add pulse animation
        copyBtn.classList.add('animate-pulse');
        
        // Also show a temporary toast notification
        showToast(success ? 'Content copied to clipboard' : 'Failed to copy content', success);
        
        // Reset button after delay
        setTimeout(() => {
            copyBtn.innerHTML = originalText;
            copyBtn.className = originalClasses;
        }, 2000);
    }
}

// Create a toast notification
function showToast(message, success = true) {
    // Remove any existing toast
    const existingToast = document.getElementById('toast-notification');
    if (existingToast) {
        existingToast.remove();
    }
    
    // Create toast element
    const toast = document.createElement('div');
    toast.id = 'toast-notification';
    toast.className = `fixed bottom-4 right-4 ${success ? 'bg-emerald-500' : 'bg-red-500'} text-white px-4 py-2 rounded-lg shadow-lg flex items-center animate-in`;
    toast.style.zIndex = '9999';
    toast.style.animation = 'fadeIn 0.3s, fadeOut 0.3s 1.7s';
    toast.innerHTML = `
        <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="${success ? 'M5 13l4 4L19 7' : 'M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'}"></path>
        </svg>
        ${message}
    `;
    
    // Add toast to DOM
    document.body.appendChild(toast);
    
    // Remove toast after a delay
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => {
            toast.remove();
        }, 300);
    }, 2000);
} 