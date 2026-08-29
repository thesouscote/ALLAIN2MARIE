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
  const userAvatarBig        = document.getElementById('userAvatarBig');
  const userAvatarPlaceholder= document.getElementById('userAvatarPlaceholder');
  const userNameBig          = document.getElementById('userNameBig');
  const userEmailSmall       = document.getElementById('userEmailSmall');
  const userLogoutBtn        = document.getElementById('userLogoutBtn');
  const userOrdersList       = document.getElementById('userOrdersList');

  // tabs
  const tabLogin   = document.getElementById('tabLogin');
  const tabSignup  = document.getElementById('tabSignup');
  const panelLogin = document.getElementById('panelLogin');
  const panelSignup= document.getElementById('panelSignup');

  // forms
  const loginForm       = document.getElementById('loginForm');
  const signupForm      = document.getElementById('signupForm');
  const googleAuthBtn   = document.getElementById('googleAuthBtn');
  const submitLoginBtn  = document.getElementById('submitLoginBtn');
  const submitSignupBtn = document.getElementById('submitSignupBtn');

  // ── Helpers ───────────────────────────────────────────────
  function showAlert(msg) {
    authAlert.style.display = 'flex';
    authAlertMsg.textContent = msg;
  }

  function hideAlert() {
    authAlert.style.display = 'none';
  }

  function setLoading(btn, loading, defaultHTML) {
    btn.disabled = loading;
    btn.innerHTML = loading
      ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation:spin 0.8s linear infinite"><circle cx="12" cy="12" r="10" stroke-opacity="0.25"></circle><path d="M12 2a10 10 0 0 1 10 10" stroke-linecap="round"></path></svg><span>Chargement...</span>`
      : defaultHTML;
  }

  function formatFCFA(n) {
    return new Intl.NumberFormat('fr-FR').format(n) + ' FCFA';
  }

  // ── Tabs ─────────────────────────────────────────────────
  tabLogin.addEventListener('click', () => {
    tabLogin.classList.add('active');
    tabSignup.classList.remove('active');
    panelLogin.classList.add('active');
    panelSignup.classList.remove('active');
    hideAlert();
  });

  tabSignup.addEventListener('click', () => {
    tabSignup.classList.add('active');
    tabLogin.classList.remove('active');
    panelSignup.classList.add('active');
    panelLogin.classList.remove('active');
    hideAlert();
  });

  // ── Firebase Auth state ───────────────────────────────────
  function onUserLoggedIn(user) {
    hideAlert();
    loggedInView.style.display  = 'block';
    authFormsView.style.display = 'none';

    const name  = user.displayName || user.email || 'Utilisateur';
    const email = user.email || '';
    const photo = user.photoURL || '';

    userNameBig.textContent   = 'Bonjour, ' + name.split(' ')[0];
    userEmailSmall.textContent = email;

    if (photo) {
      userAvatarBig.src = photo;
      userAvatarBig.style.display = 'block';
      if (userAvatarPlaceholder) userAvatarPlaceholder.style.display = 'none';
    }

    // Persister en local pour header badge
    localStorage.setItem('A2M_USER_NAME',  name);
    localStorage.setItem('A2M_USER_EMAIL', email);
    localStorage.setItem('A2M_USER_PHOTO', photo);
    localStorage.setItem('A2M_USER_UID',   user.uid);

    // Afficher les commandes de cet utilisateur
    loadUserOrders(user.uid, email);
  }

  function onUserLoggedOut() {
    loggedInView.style.display  = 'none';
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
      userOrdersList.innerHTML = '<div class="no-orders-msg">Aucune commande pour le moment.</div>';
      return;
    }

    userOrdersList.innerHTML = myOrders.map(o => {
      const status = o.deliveryStatus || 'En attente';
      const statusClass = status === 'Livré' ? 'livré' : (status === 'En cours' ? 'cours' : '');
      const date = o.createdAt ? new Date(o.createdAt).toLocaleDateString('fr-FR') : '';
      return `
        <div class="user-order-row">
          <div>
            <div class="user-order-id">${o.id}</div>
            <div style="font-size:0.75rem;color:#94a3b8;">${date}</div>
          </div>
          <div>
            <div style="font-weight:800;font-size:0.85rem;">${formatFCFA(o.total)}</div>
            <span class="user-order-status ${statusClass}">${status}</span>
          </div>
        </div>
      `;
    }).join('');
  }

  // ── Firebase Auth watcher ─────────────────────────────────
  if (typeof firebase !== 'undefined' && firebase.auth) {
    firebase.auth().onAuthStateChanged(user => {
      if (user) {
        onUserLoggedIn(user);
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
      setLoading(googleAuthBtn, true);
      hideAlert();
      const provider = new firebase.auth.GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      try {
        await firebase.auth().signInWithPopup(provider);
        // onAuthStateChanged prend le relais
      } catch (err) {
        setLoading(googleAuthBtn, false,
          `<svg width="20" height="20" viewBox="0 0 24 24"><path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/><path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"/><path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.17 0 9.99 0 12s.45 3.83 1.25 5.42l4.03-3.15z"/><path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/></svg><span>Continuer avec Google</span>`
        );
        if (err.code === 'auth/popup-closed-by-user') {
          showAlert('Connexion annulée.');
        } else if (err.code === 'auth/unauthorized-domain') {
          showAlert("Domaine non autorisé : ajoutez '" + window.location.hostname + "' dans Firebase Console > Authentication > Paramètres > Domaines autorisés.");
        } else {
          showAlert('Erreur Google : ' + err.message);
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
      setLoading(submitLoginBtn, true, '<span>Se connecter</span>');

      if (typeof firebase === 'undefined' || !firebase.auth) {
        showAlert('Firebase Auth non disponible.');
        setLoading(submitLoginBtn, false, '<span>Se connecter</span>');
        return;
      }

      try {
        await firebase.auth().signInWithEmailAndPassword(email, pass);
      } catch (err) {
        setLoading(submitLoginBtn, false, '<span>Se connecter</span> <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>');
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
      const phone = document.getElementById('signupPhone').value.trim();
      const pass  = document.getElementById('signupPassword').value;
      setLoading(submitSignupBtn, true, '<span>Créer mon compte</span>');

      if (typeof firebase === 'undefined' || !firebase.auth) {
        showAlert('Firebase Auth non disponible.');
        setLoading(submitSignupBtn, false, '<span>Créer mon compte</span>');
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
            phone: phone || '',
            createdAt: new Date().toISOString()
          });
        }

        // onAuthStateChanged prend le relais
      } catch (err) {
        setLoading(submitSignupBtn, false, '<span>Créer mon compte</span> <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>');
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
