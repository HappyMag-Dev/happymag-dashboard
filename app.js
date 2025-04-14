// Firebase Configuration
const firebaseConfig = {
  // Replace these with values from your Firebase web app config
  apiKey: "YOUR_API_KEY", // Get this from Firebase console
  authDomain: "happy-mag-content.firebaseapp.com",
  projectId: "happy-mag-content", // This is your confirmed project ID
  storageBucket: "happy-mag-content.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID", // Get this from Firebase console
  appId: "YOUR_APP_ID" // Get this from Firebase console
};

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

// Load statistics
function loadStats() {
    // Get article counts
    db.collection('articles').get().then(snapshot => {
        const allArticles = snapshot.docs.map(doc => doc.data());
        
        // Total counts
        const scraped = allArticles.length;
        const rewritten = allArticles.filter(article => article.status === 'rewritten' || article.status === 'posted').length;
        const posted = allArticles.filter(article => article.status === 'posted').length;
        
        scrapedCountEl.textContent = scraped;
        rewrittenCountEl.textContent = rewritten;
        postedCountEl.textContent = posted;
        
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
        
        const postedToday = allArticles.filter(article => {
            if (!article.posted_at) return false;
            const postedDate = new Date(article.posted_at);
            return postedDate >= today;
        }).length;
        
        scrapedTodayEl.textContent = `Today: ${scrapedToday}`;
        rewrittenTodayEl.textContent = `Today: ${rewrittenToday}`;
        postedTodayEl.textContent = `Today: ${postedToday}`;
    }).catch(error => {
        console.error("Error loading stats:", error);
    });
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
                const type = run.type.charAt(0).toUpperCase() + run.type.slice(1);
                
                let results = '';
                if (run.stats) {
                    if (run.type === 'scrape') {
                        results = `Found ${run.stats.articles_found} articles, ${run.stats.articles_new} new`;
                    } else if (run.type === 'rewrite') {
                        results = `Processed ${run.stats.articles_processed} articles, ${run.stats.articles_rewritten} rewritten`;
                    } else if (run.type === 'wordpress') {
                        results = `Processed ${run.stats.articles_processed} articles, ${run.stats.articles_posted} posted`;
                    }
                }
                
                html += `
                    <tr class="border-t border-gray-200">
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
            <div class="col-span-3 text-center p-4">
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
        if (article.status === 'scraped') {
            statusBadge = '<span class="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">Scraped</span>';
        } else if (article.status === 'rewritten') {
            statusBadge = '<span class="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded">Rewritten</span>';
        } else if (article.status === 'posted') {
            statusBadge = '<span class="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">Posted</span>';
        }
        
        html += `
            <div class="bg-gray-50 rounded border border-gray-200 p-4 shadow-sm article-card hover:shadow transition-shadow" data-id="${article.id}">
                <div class="flex justify-between items-start mb-2">
                    ${statusBadge}
                </div>
                <h3 class="font-semibold mb-2 line-clamp-2">${title}</h3>
                <div class="text-sm text-gray-500 mb-4">
                    <div>${published}</div>
                    <div>${author}</div>
                </div>
                <button class="text-sm text-blue-600 hover:underline view-article-btn" data-id="${article.id}">
                    View Details
                </button>
            </div>
        `;
    });
    
    articlesContainerEl.innerHTML = html;
    
    // Add event listeners to view article buttons
    document.querySelectorAll('.view-article-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const articleId = btn.getAttribute('data-id');
            openArticleModal(articleId);
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
    
    // Set rewritten content
    if (article.rewritten_html) {
        rewrittenContentEl.innerHTML = article.rewritten_html;
    } else {
        rewrittenContentEl.innerHTML = '<p>Not yet rewritten</p>';
    }
    
    // Set URL
    modalUrlEl.textContent = article.url || '#';
    modalUrlEl.href = article.url || '#';
    
    // Check if posted to WordPress
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