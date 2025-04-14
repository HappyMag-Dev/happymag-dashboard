// Simple authentication script
(function() {
  // Check if already authenticated
  if (sessionStorage.getItem('authenticated') === 'true') {
    return;
  }
  
  const USERNAME = 'happymag';
  const PASSWORD = 'content2024';
  
  let attempts = 0;
  let authenticated = false;
  
  while (!authenticated && attempts < 3) {
    attempts++;
    
    // Prompt for credentials
    const usernameInput = prompt('Username:');
    if (usernameInput === null) {
      window.location.href = 'about:blank';
      break;
    }
    
    const passwordInput = prompt('Password:');
    if (passwordInput === null) {
      window.location.href = 'about:blank';
      break;
    }
    
    // Check credentials
    if (usernameInput === USERNAME && passwordInput === PASSWORD) {
      authenticated = true;
      sessionStorage.setItem('authenticated', 'true');
    } else {
      alert('Invalid credentials. Please try again.');
      
      if (attempts >= 3) {
        alert('Too many failed attempts.');
        window.location.href = 'about:blank';
      }
    }
  }
})(); 