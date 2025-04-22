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
    filteredArticles.forEach(article => {
        const title = article.title || 'Untitled Article';
        const published = article.published || 'Unknown date';
        const author = article.author || 'Unknown author';
        
        let statusBadge = '';
        let statusColor = 'blue';
        let viewButtonText = 'View Details';
        
        if (article.status === 'scraped') {
            statusBadge = '<span class="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">Found</span>';
        } else if (article.status === 'rewritten') {
            statusBadge = '<span class="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full">Rewritten</span>';
            statusColor = 'yellow';
            viewButtonText = 'View Content';
        } else if (article.status === 'drafted') {
            statusBadge = '<span class="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">Published</span>';
            statusColor = 'green';
            viewButtonText = 'View Content';
        }
        
        html += `
            <div class="bg-white rounded-xl border border-${statusColor}-100 p-4 shadow-sm article-card hover:shadow" data-id="${article.id}">
                <div class="flex justify-between items-start mb-2">
                    ${statusBadge}
                </div>
                <h3 class="font-medium mb-2 line-clamp-2">${title}</h3>
                <div class="text-sm text-gray-500 mb-4">
                    <div>${published}</div>
                    <div>${author}</div>
                </div>
                <button class="w-full py-2 px-4 bg-gray-50 hover:bg-gray-100 rounded-lg text-sm transition-colors view-article-btn" data-id="${article.id}">
                    ${viewButtonText}
                </button>
            </div>
        `;
    });
    
    articlesContainerEl.innerHTML = html;
    
    // Add event listeners to view article buttons
    document.querySelectorAll('.view-article-btn').forEach(button => {
        button.addEventListener('click', () => {
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
    
    // Set modal title
    modalTitleEl.textContent = article.title || 'Untitled Article';
    
    // Set original content
    originalContentEl.innerHTML = `<p>${article.body || 'No content available'}</p>`;
    
    // Set rewritten content with copy button
    if (article.rewritten_html) {
        const copyButton = `<button id="copy-rewritten-btn" class="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 mb-3">Copy Article</button>`;
        rewrittenContentEl.innerHTML = `${copyButton}<div id="rewritten-text">${article.rewritten_html}</div>`;
        
        // Add event listener to the copy button
        setTimeout(() => {
            const copyBtn = document.getElementById('copy-rewritten-btn');
            if (copyBtn) {
                copyBtn.addEventListener('click', () => copyArticleContent());
            }
        }, 0);
    } else {
        rewrittenContentEl.innerHTML = '<p>Not yet rewritten</p>';
    }
    
    // Set URL
    modalUrlEl.textContent = article.url || '#';
    modalUrlEl.href = article.url || '#';
    
    // Check if drafted to WordPress
    if (article.wordpress_id) {
        const wordpressUrl = getWordPressUrl(article.wordpress_id);
        wordpressLinkEl.href = wordpressUrl;
        wordpressLinkEl.classList.remove('hidden');
    } else {
        wordpressLinkEl.classList.add('hidden');
    }
    
    // Show modal
    articleModalEl.classList.remove('hidden');
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
        const originalText = copyBtn.textContent;
        copyBtn.textContent = success ? 'Copied!' : 'Failed to copy';
        copyBtn.classList.remove('bg-blue-600', 'hover:bg-blue-700');
        copyBtn.classList.add(success ? 'bg-green-600' : 'bg-red-600', 
                              success ? 'hover:bg-green-700' : 'hover:bg-red-700');
        
        setTimeout(() => {
            copyBtn.textContent = originalText;
            copyBtn.classList.remove(success ? 'bg-green-600' : 'bg-red-600', 
                                   success ? 'hover:bg-green-700' : 'hover:bg-red-700');
            copyBtn.classList.add('bg-blue-600', 'hover:bg-blue-700');
        }, 2000);
    }
} 