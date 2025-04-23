// Simple authentication script for Happy Mag dashboard
(function() {
  // Check if already authenticated
  if (sessionStorage.getItem('authenticated') === 'true') {
    // If we're on the login page but already authenticated, redirect to dashboard
    if (window.location.pathname.endsWith('/index.html') || 
        window.location.pathname.endsWith('/') || 
        window.location.pathname === '/' ||
        window.location.pathname.includes('/happymag-dashboard/') &&
        !window.location.pathname.includes('dashboard.html')) {
      console.log("Already authenticated, redirecting to dashboard");
      window.location.href = 'dashboard.html';
    }
    return;
  } else {
    // If not authenticated and not on login page, redirect to login
    if (window.location.pathname.includes('dashboard.html')) {
      console.log("Not authenticated, redirecting to login");
      window.location.href = 'index.html';
      return;
    }
  }
  
  // Login form handler - only runs on login page
  document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
      loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const USERNAME = 'happymag';
        const PASSWORD = 'content2024';
        
        const usernameInput = document.getElementById('username').value;
        const passwordInput = document.getElementById('password').value;
        
        if (usernameInput === USERNAME && passwordInput === PASSWORD) {
          // Store authentication
          sessionStorage.setItem('authenticated', 'true');
          
          // Show success
          const errorMessage = document.getElementById('error-message');
          if (errorMessage) errorMessage.classList.add('hidden');
          
          const successMessage = document.getElementById('success-message');
          if (successMessage) {
            successMessage.textContent = 'Login successful! Redirecting...';
            successMessage.classList.remove('hidden');
          }
          
          // Redirect to dashboard
          setTimeout(() => {
            window.location.href = 'dashboard.html';
          }, 1000);
        } else {
          // Show error
          const errorMessage = document.getElementById('error-message');
          if (errorMessage) {
            errorMessage.textContent = 'Invalid credentials. Please try again.';
            errorMessage.classList.remove('hidden');
          }
        }
      });
    }
  });
})(); 