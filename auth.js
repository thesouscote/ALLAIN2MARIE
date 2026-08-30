/**
 * ALLAIN2MARIE - Auth utilisateur (Inscription / Connexion)
 * Utilise Firebase Authentication (email/password + Google)
 */

document.addEventListener('DOMContentLoaded', () => {

  // ── DOM refs ──────────────────────────────────────────────
  const authAlert       = document.getElementById('authAlert');
  const authAlertMsg    = document.getElementById('authAlertMsg');
  const loggedInView    = document.getElementById('loggedInView');
  const authFormsView   = document.getElementById('authFormsView');

  // logged-in elements
  const userAvatar        = document.getElementById('userAvatar');
  const userName          = document.getElementById('userName');
  const userEmail         = document.getElementById('userEmail');
  const userLogoutBtn     = document.getElementById('userLogoutBtn');
  const userOrdersList    = document.getElementById('userOrdersList');

  // tabs
  const tabLogin   = document.getElementById('tabLogin');
  const tabSignup  = document.getElementById('tabSignup');

  // forms
  const loginForm       = document.getElementById('loginForm');
  const signupForm      = document.getElementById('signupForm');
  const googleAuthBtn   = document.getElementById('googleAuthBtn');
  const submitLoginBtn  = document.getElementById('submitLoginBtn');
  const submitSignupBtn = document.getElementById('submitSignupBtn');

  // inputs
  const loginEmailInput    = document.getElementById('loginEmail');
  const loginPasswordInput = document.getElementById('loginPassword');
  const signupPasswordInput = document.getElementById('signupPassword');

  // password toggles
  const toggleLoginPassword  = document.getElementById('toggleLoginPassword');
  const toggleSignupPassword = document.getElementById('toggleSignupPassword');
  const forgotPasswordLink   = document.getElementById('forgotPasswordLink');

  // ── Helpers ───────────────────────────────────────────────
  function showAlert(msg, type = 'error') {
    authAlert.classList.remove('success');
    if (type === 'success') {
      authAlert.classList.add('success');
    }
    authAlert.classList.add('show');
    authAlertMsg.textContent = msg;
  }

  function hideAlert() {
    authAlert.classList.remove('show', 'success');
  }

  function setLoading(btn, loading, defaultText) {
    btn.disabled = loading;
    btn.textContent = loading ? 'Chargement...' : defaultText;
  }

  function formatFCFA(n) {
    return new Intl.NumberFormat('fr-FR').format(n) + ' FCFA';
  }

  // ── Password Toggle ────────────────────────────────────────
  function togglePasswordVisibility(input, toggleBtn) {
    const type = input.type === 'password' ? 'text' : 'password';
    input.type = type;
    
    // Change icon based on visibility
    if (type === 'text') {
      toggleBtn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a11.64 11.64 0 0 1 5.94-6.06M1 1l22 22"></path>
          <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a11.64 11.64 0 0 1-5.94 6.06"></path>
        </svg>
      `;
    } else {
      toggleBtn.innerHTML = `
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M1 12s4-8 11-8 11 8 11 8-4-8-11-8z"></path>
          <circle cx="12" cy="12" r="3"></circle>
        </svg>
      `;
    }
  }

  if (toggleLoginPassword && loginPasswordInput) {
    toggleLoginPassword.addEventListener('click', () => {
      togglePasswordVisibility(loginPasswordInput, toggleLoginPassword);
    });
  }

  if (toggleSignupPassword && signupPasswordInput) {
    toggleSignupPassword.addEventListener('click', () => {
      togglePasswordVisibility(signupPasswordInput, toggleSignupPassword);
    });
  }

  // ── Forgot Password ──────────────────────────────────────
  if (forgotPasswordLink) {
    forgotPasswordLink.addEventListener('click', (e) => {
      e.preventDefault();
      const email = document.getElementById('loginEmail')?.value || '';
      if (!email) {
        showAlert('Veuillez entrer votre adresse email d\'abord.');
        document.getElementById('loginEmail')?.focus();
        return;
      }
      
      if (typeof firebase !== 'undefined' && firebase.auth) {
        firebase.auth().sendPasswordResetEmail(email)
          .then(() => {
            showAlert('Un email de réinitialisation a été envoyé à ' + email, 'success');
          })
          .catch((err) => {
            if (err.code === 'auth/user-not-found') {
              showAlert('Aucun compte trouvé avec cet email.');
            } else if (err.code === 'auth/invalid-email') {
              showAlert('Format d\'email invalide.');
            } else {
              showAlert('Erreur: ' + err.message);
            }
          });
      } else {
        showAlert('Firebase non disponible pour la réinitialisation.');
      }
    });
  }

  // ── Tabs ─────────────────────────────────────────────────
  tabLogin.addEventListener('click', () => {
    tabLogin.classList.add('active');
    tabSignup.classList.remove('active');
    loginForm.classList.add('active');
    signupForm.classList.remove('active');
    hideAlert();
  });

  tabSignup.addEventListener('click', () => {
    tabSignup.classList.add('active');
    tabLogin.classList.remove('active');
    signupForm.classList.add('active');
    loginForm.classList.remove('active');
    hideAlert();
  });

  // ── Firebase Auth state ───────────────────────────────────
  function onUserLoggedIn(user) {
    hideAlert();
    loggedInView.classList.add('show');
    authFormsView.style.display = 'none';

    const name  = user.displayName || user.email || 'Utilisateur';
    const email = user.email || '';
    const photo = user.photoURL || '';

    userName.textContent   = 'Bonjour, ' + name.split(' ')[0];
    userEmail.textContent = email;

    if (photo) {
      userAvatar.innerHTML = `<img src="${photo}" alt="Avatar" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">`;
    }

    // Persister en local pour header badge
    localStorage.setItem('A2M_USER_NAME',  name);
    localStorage.setItem('A2M_USER_EMAIL', email);
    localStorage.setItem('A2M_USER_PHOTO', photo);
    localStorage.setItem('A2M_USER_UID',   user.uid);

    // Afficher les commandes de cet utilisateur
    loadUserOrders(user.uid, email);

    // Show success message if this is a fresh login (not just page reload)
    const justLoggedIn = sessionStorage.getItem('A2M_JUST_LOGGED_IN');
    if (justLoggedIn) {
      showAlert('Connexion réussie !', 'success');
      sessionStorage.removeItem('A2M_JUST_LOGGED_IN');
    }
  }

  function onUserLoggedOut() {
    loggedInView.classList.remove('show');
    authFormsView.style.display = 'block';
    localStorage.removeItem('A2M_USER_NAME');
    localStorage.removeItem('A2M_USER_EMAIL');
    localStorage.removeItem('A2M_USER_PHOTO');
    localStorage.removeItem('A2M_USER_UID');
  }

  // ── Load user orders ──────────────────────────────────────
  function loadUserOrders(uid, email) {
    const allOrders = typeof sanitizeLocalOrders === 'function'
      ? sanitizeLocalOrders()
      : JSON.parse(localStorage.getItem('ALLAIN2MARIE_ORDERS') || '[]');
    // Match by email stored in customer info or by uid
    const myOrders = allOrders.filter(o =>
      o.uid === uid ||
      (o.customer?.email && o.customer.email.toLowerCase() === email.toLowerCase())
    );

    if (myOrders.length === 0) {
      userOrdersList.innerHTML = '<div class="no-orders">Aucune commande pour le moment</div>';
      return;
    }

    userOrdersList.innerHTML = myOrders.map(o => {
      const status = o.deliveryStatus || 'En attente';
      const statusClass = status === 'Livré' ? 'delivered' : (status === 'En cours' ? 'pending' : '');
      const date = o.createdAt ? new Date(o.createdAt).toLocaleDateString('fr-FR') : '';
      return `
        <div class="order-item">
          <div class="order-info">
            <div class="order-id">${o.id}</div>
            <div class="order-date">${date}</div>
          </div>
          <div>
            <div style="font-weight:700;font-size:0.9rem;">${formatFCFA(o.total)}</div>
            <span class="order-status ${statusClass}">${status}</span>
          </div>
        </div>
      `;
    }).join('');
  }

  // ── Firebase Auth watcher ─────────────────────────────────
  if (typeof firebase !== 'undefined' && firebase.auth) {
    firebase.auth().onAuthStateChanged(user => {
      if (user) {
        // Vérifier si l'utilisateur est un admin - si oui, ne pas l'afficher comme connecté dans l'espace client
        if (typeof dbIsAdminUser === 'function' && dbIsAdminUser(user.email)) {
          console.log('Utilisateur admin détecté, masquage dans l\'espace client');
          onUserLoggedOut(); // Traiter les admins comme non-connectés dans l'espace client
        } else {
          onUserLoggedIn(user); // Seuls les clients réguliers sont affichés comme connectés
        }
      } else {
        onUserLoggedOut();
      }
    });
  } else {
    onUserLoggedOut();
  }

  // ── Logout ────────────────────────────────────────────────
  if (userLogoutBtn) {
    userLogoutBtn.addEventListener('click', async () => {
      if (typeof firebase !== 'undefined' && firebase.auth) {
        await firebase.auth().signOut();
      }
      onUserLoggedOut();
    });
  }

  // ── Google Sign-In ────────────────────────────────────────
  if (googleAuthBtn) {
    googleAuthBtn.addEventListener('click', async () => {
      if (typeof firebase === 'undefined' || !firebase.auth) {
        showAlert('Firebase Auth non disponible.');
        return;
      }
      setLoading(googleAuthBtn, true, 'Google');
      hideAlert();
      const provider = new firebase.auth.GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      try {
        await firebase.auth().signInWithPopup(provider);
        sessionStorage.setItem('A2M_JUST_LOGGED_IN', 'true');
        // onAuthStateChanged prend le relais
      } catch (err) {
        setLoading(googleAuthBtn, false, 'Google');
        if (err.code === 'auth/popup-closed-by-user') {
          showAlert('Connexion Google annulée.');
        } else if (err.code === 'auth/unauthorized-domain') {
          showAlert('Ouvrez le site via http://localhost:8080 (pas 127.0.0.1), ou inscrivez-vous par e-mail.');
        } else if (err.code === 'auth/operation-not-allowed' || err.code === 'auth/configuration-not-found') {
          showAlert('Google n’est pas activé dans Firebase. Créez un compte avec e-mail + mot de passe.');
        } else if (err.code === 'auth/popup-blocked') {
          showAlert('Popup Google bloquée par le navigateur. Autorisez les popups ou utilisez e-mail.');
        } else {
          showAlert('Erreur Google : ' + (err.message || 'impossible de se connecter.'));
        }
      }
    });
  }

  // ── Login email/password ──────────────────────────────────
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      hideAlert();
      const email = document.getElementById('loginEmail').value.trim();
      const pass  = document.getElementById('loginPassword').value;
      setLoading(submitLoginBtn, true, 'Se connecter');

      if (typeof firebase === 'undefined' || !firebase.auth) {
        showAlert('Firebase Auth non disponible.');
        setLoading(submitLoginBtn, false, 'Se connecter');
        return;
      }

      try {
        await firebase.auth().signInWithEmailAndPassword(email, pass);
        sessionStorage.setItem('A2M_JUST_LOGGED_IN', 'true');
        // Success message will be shown when onAuthStateChanged fires
      } catch (err) {
        setLoading(submitLoginBtn, false, 'Se connecter');
        if (err.code === 'auth/user-not-found') {
          showAlert('Aucun compte trouvé avec cet e-mail. Inscrivez-vous !');
        } else if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
          showAlert('Mot de passe incorrect.');
        } else {
          showAlert(err.message);
        }
      }
    });
  }

  // ── Signup email/password ─────────────────────────────────
  if (signupForm) {
    signupForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      hideAlert();
      const name  = document.getElementById('signupName').value.trim();
      const email = document.getElementById('signupEmail').value.trim();
      const pass  = document.getElementById('signupPassword').value;
      setLoading(submitSignupBtn, true, 'Créer mon compte');

      if (typeof firebase === 'undefined' || !firebase.auth) {
        showAlert('Firebase Auth non disponible.');
        setLoading(submitSignupBtn, false, 'Créer mon compte');
        return;
      }

      try {
        const cred = await firebase.auth().createUserWithEmailAndPassword(email, pass);
        // Mettre à jour le displayName
        await cred.user.updateProfile({ displayName: name });

        // Sauvegarder profil dans Firestore si dispo
        if (typeof db !== 'undefined' && db) {
          await db.collection('users').doc(cred.user.uid).set({
            uid: cred.user.uid,
            name,
            email,
            createdAt: new Date().toISOString()
          });
        }

        sessionStorage.setItem('A2M_JUST_LOGGED_IN', 'true');
        // onAuthStateChanged prend le relais
      } catch (err) {
        setLoading(submitSignupBtn, false, 'Créer mon compte');
        if (err.code === 'auth/email-already-in-use') {
          showAlert('Un compte existe déjà avec cet e-mail. Connectez-vous !');
          tabLogin.click();
        } else if (err.code === 'auth/weak-password') {
          showAlert('Mot de passe trop court (minimum 6 caractères).');
        } else {
          showAlert(err.message);
        }
      }
    });
  }

});
