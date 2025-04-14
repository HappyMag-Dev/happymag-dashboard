// More secure authentication script
(function() {
  // Check if already authenticated
  if (sessionStorage.getItem('authenticated') === 'true') {
    return;
  }
  
  // Using hashed credentials for better security
  // These are SHA-256 hashes of the actual credentials
  const USERNAME_HASH = '8c6976e5b5410415bde908bd4dee15dfb167a9c873fc4bb8a81f6f2ab448a918'; // SHA-256 of 'admin'
  const PASSWORD_HASH = '2acdba9dbd11d6736086be9e7ea097ecf414bde7827c18ef45bacbb5f88d9189'; // SHA-256 of a secure password
  
  // Simple SHA-256 hashing function
  async function sha256(message) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
  }
  
  let attempts = 0;
  let authenticated = false;
  
  async function checkCredentials() {
    while (!authenticated && attempts < 3) {
      attempts++;
      
      // Prompt for credentials
      const usernameInput = prompt('Username:');
      if (usernameInput === null) {
        window.location.href = 'about:blank';
        return;
      }
      
      const passwordInput = prompt('Password:');
      if (passwordInput === null) {
        window.location.href = 'about:blank';
        return;
      }
      
      // Hash and check credentials
      const usernameHash = await sha256(usernameInput);
      const passwordHash = await sha256(passwordInput);
      
      if (usernameHash === USERNAME_HASH && passwordHash === PASSWORD_HASH) {
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
  }
  
  // Start authentication check
  checkCredentials();
})(); 