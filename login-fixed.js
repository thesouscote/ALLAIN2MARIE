document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('loginForm');
  const usernameInput = document.getElementById('username');
  const passwordInput = document.getElementById('password');
  const togglePasswordBtn = document.getElementById('togglePasswordBtn');
  const rememberMe = document.getElementById('rememberMe');
  const loginAlert = document.getElementById('loginAlert');
  const alertMessage = document.getElementById('alertMessage');
  const submitLoginBtn = document.getElementById('submitLoginBtn');

  // If already logged in, redirect directly to admin
  const isAuth = sessionStorage.getItem('ALLAIN2MARIE_AUTH') || localStorage.getItem('ALLAIN2MARIE_AUTH');
  if (isAuth === 'true') {
    window.location.href = 'admin.html';
    return;
  }

  // Toggle Password Visibility
  togglePasswordBtn.addEventListener('click', () => {
    const isPassword = passwordInput.type === 'password';
    passwordInput.type = isPassword ? 'text' : 'password';
    togglePasswordBtn.innerHTML = isPassword
      ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>`
      : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
  });

  // Google One-Click Login with Firebase
  const googleLoginBtn = document.getElementById('googleLoginBtn');
  if (googleLoginBtn) {
    googleLoginBtn.addEventListener('click', async () => {
      console.log('Tentative de connexion Google Admin...');
      
      if (typeof firebase === 'undefined' || !firebase.auth) {
        console.error('Module Firebase Auth non chargé');
        alert('Module Firebase Auth non chargé.');
        return;
      }

      googleLoginBtn.disabled = true;
      googleLoginBtn.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="spin-icon" style="animation: spin 0.8s linear infinite;">
          <circle cx="12" cy="12" r="10" stroke-opacity="0.25"></circle>
          <path d="M12 2a10 10 0 0 1 10 10" stroke-linecap="round"></path>
        </svg>
        <span>Connexion Google en cours...</span>
      `;

      const provider = new firebase.auth.GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });

      try {
        const result = await firebase.auth().signInWithPopup(provider);
        const user = result.user;
        
        console.log('Authentification Google réussie pour:', user.email);

        // Vérifier si l'email est autorisé comme admin
        if (typeof dbIsAdminUser === 'function' && !dbIsAdminUser(user.email)) {
          console.warn('Accès refusé: email non autorisé:', user.email);
          await firebase.auth().signOut();
          throw new Error('Accès refusé: email non autorisé pour l\'administration');
        }

        console.log('Utilisateur autorisé, redirection vers admin...');
        window.location.href = 'admin.html';
      } catch (err) {
        console.error('Erreur Google Auth:', err.code, err.message);
        googleLoginBtn.disabled = false;
        googleLoginBtn.innerHTML = `
          <svg width="20" height="20" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
            <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"/>
            <path fill="#FBBC05" d="M5.28 14.27-.25-.72-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.17 0 9.99 0 12s.45 3.83 1.25 5.42l4.03-3.15z"/>
            <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03-3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
          </svg>
          <span>Continuer avec Google</span>
        `;

        loginAlert.style.display = 'flex';
        if (err.code === 'auth/popup-closed-by-user') {
          alertMessage.textContent = 'Connexion Google annulée.';
        } else if (err.code === 'auth/unauthorized-domain') {
          alertMessage.textContent = 'Google refuse ce domaine. Configurez le domaine dans Firebase Console.';
        } else if (err.code === 'auth/operation-not-allowed' || err.code === 'auth/configuration-not-found') {
          alertMessage.textContent = 'Google non active dans Firebase Console. Activez Google Auth ou utilisez email/mot de passe.';
        } else if (err.code === 'auth/popup-blocked') {
          alertMessage.textContent = 'Popup Google bloquee par le navigateur. Autorisez les popups ou utilisez email/mot de passe.';
        } else if (err.message && err.message.includes('Accès refusé')) {
          alertMessage.textContent = err.message;
        } else {
          alertMessage.textContent = 'Erreur authentification Google: ' + (err.message || err.code || 'inconnue');
        }
      }
    });
  }

  // Handle Email/Password Login Submit via Firebase Auth
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    console.log('Tentative de connexion par email/mot de passe via Firebase Auth');
    
    const email = usernameInput.value.trim();
    const pass = passwordInput.value.trim();
    
    if (!email || !pass) {
      loginAlert.style.display = 'flex';
      alertMessage.textContent = 'Veuillez remplir l\'email et le mot de passe.';
      return;
    }
    
    submitLoginBtn.disabled = true;
    submitLoginBtn.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="spin-icon" style="animation: spin 0.8s linear infinite;">
        <circle cx="12" cy="12" r="10" stroke-opacity="0.25"></circle>
        <path d="M12 2a10 10 0 0 1 10 10" stroke-linecap="round"></path>
      </svg>
      <span>Connexion en cours...</span>
    `;
    
    if (typeof firebase === 'undefined' || !firebase.auth) {
      console.error('Firebase Auth non disponible');
      loginAlert.style.display = 'flex';
      alertMessage.textContent = 'Firebase Auth non disponible. Utilisez Google Auth.';
      submitLoginBtn.disabled = false;
      submitLoginBtn.innerHTML = '<span>Se connecter</span>';
      return;
    }
    
    try {
      // Authentification via Firebase Auth
      const result = await firebase.auth().signInWithEmailAndPassword(email, pass);
      const user = result.user;
      
      console.log('Authentification Firebase réussie pour:', user.email);
      
      // Vérifier si l'email est autorisé comme admin
      if (typeof dbIsAdminUser === 'function' && !dbIsAdminUser(user.email)) {
        console.warn('Accès refusé: email non autorisé:', user.email);
        await firebase.auth().signOut();
        throw new Error('Accès refusé: email non autorisé pour l\'administration');
      }
      
      console.log('Utilisateur autorisé, redirection vers admin...');
      window.location.href = 'admin.html';
      
    } catch (err) {
      console.error('Erreur authentification Firebase:', err.code, err.message);
      
      submitLoginBtn.disabled = false;
      submitLoginBtn.innerHTML = '<span>Se connecter</span>';
      
      loginAlert.style.display = 'flex';
      
      if (err.code === 'auth/user-not-found') {
        alertMessage.textContent = 'Aucun compte trouvé avec cet email. Utilisez Google Auth pour créer un compte.';
      } else if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        alertMessage.textContent = 'Mot de passe incorrect.';
      } else if (err.code === 'auth/invalid-email') {
        alertMessage.textContent = 'Format d\'email invalide.';
      } else if (err.code === 'auth/user-disabled') {
        alertMessage.textContent = 'Ce compte a été désactivé.';
      } else if (err.message && err.message.includes('Accès refusé')) {
        alertMessage.textContent = err.message;
      } else {
        alertMessage.textContent = 'Erreur d\'authentification: ' + (err.message || err.code || 'inconnue');
      }
    }
  });
});