/* JK ADISTORE — Auth Bridge (OTP Login Flow) */
let currentSession = null;
const OWNER_EMAIL = 'jkadistore2@gmail.com';

// Init — cek session saat halaman load
async function initSession() {
  try {
    const s = localStorage.getItem('jka_dv');
    if (s) currentSession = JSON.parse(s).session || null;
    updateUI();
  } catch (e) { updateUI(); }
}

// Update tombol login/panel
function updateUI() {
  const loginBtn = document.getElementById('loginBtn');
  const adminBtn = document.getElementById('adminBtn');
  const userMenu = document.getElementById('userMenu');
  const isOwner = currentSession && currentSession.role === 'owner' &&
                  currentSession.user && currentSession.user.email === OWNER_EMAIL;

  if (currentSession && currentSession.user) {
    if (loginBtn) loginBtn.style.display = 'none';
    if (userMenu) userMenu.style.display = 'flex';
    const nameEl = document.getElementById('userName');
    if (nameEl) nameEl.textContent = currentSession.user.email || 'User';
    if (adminBtn) adminBtn.style.display = isOwner ? 'flex' : 'none';
  } else {
    if (loginBtn) loginBtn.style.display = 'flex';
    if (userMenu) userMenu.style.display = 'none';
    if (adminBtn) adminBtn.style.display = 'none';
  }
}

// Step 1: Login — kirim email + password → minta OTP
async function authLogin() {
  const email = (document.getElementById('loginEmail')?.value || '').trim().toLowerCase();
  const password = document.getElementById('loginPassword')?.value;

  if (!email || !password) {
    alert('Isi email dan kata sandi!');
    return;
  }

  const btn = document.querySelector('#loginForm button');
  const oldText = btn ? btn.textContent : '';
  if (btn) { btn.disabled = true; btn.textContent = 'Mengirim...'; }

  try {
    const res = await fetch('/api/otp/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();

    if (!res.ok || !data.success) {
      alert(data.error || 'Email atau password salah');
      if (btn) { btn.disabled = false; btn.textContent = oldText; }
      return;
    }

    currentSession = { user: { email: email } };
    showOtpInput(email);
  } catch (err) {
    alert('Koneksi gagal: ' + err.message);
    if (btn) { btn.disabled = false; btn.textContent = oldText; }
  }
}

// Step 2: Tampilkan form OTP
function showOtpInput(email) {
  const form = document.getElementById('loginForm');
  if (!form) return;

  form.innerHTML = ''
    + '<h3 style="margin:0 0 8px;font-size:18px;font-weight:800">Verifikasi Kode</h3>'
    + '<p style="color:#94a3b8;font-size:12px;margin:0 0 16px">Kode 6 digit dikirim ke <b style="color:#a78bfa">' + email + '</b></p>'
    + '<input type="text" id="otpInput" class="input" placeholder="000000" maxlength="6" inputmode="numeric" pattern="[0-9]*" style="text-align:center;font-size:24px;letter-spacing:8px;font-weight:800;padding:14px">'
    + '<button type="button" class="btn btn-primary" style="width:100%;margin-top:14px" onclick="verifyOtp()">Verifikasi &amp; Masuk</button>'
    + '<button type="button" class="btn" style="width:100%;margin-top:8px;font-size:12px" onclick="authLogin()">Kembali</button>';

  setTimeout(function(){
    const inp = document.getElementById('otpInput');
    if (inp) inp.focus();
  }, 100);
}

// Step 3: Verify OTP → set session
async function verifyOtp() {
  const code = (document.getElementById('otpInput')?.value || '').trim();
  if (!code || code.length !== 6) {
    alert('Masukkan 6 digit kode');
    return;
  }

  const email = currentSession?.user?.email;
  if (!email) { alert('Sesi hilang, coba lagi'); authLogin(); return; }

  try {
    const res = await fetch('/api/otp/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code })
    });
    const data = await res.json();

    if (!res.ok || !data.success) {
      alert(data.error || 'Kode salah atau kadaluarsa');
      return;
    }

    // Set session owner
    const sessionData = {
      session: {
        role: 'owner',
        ot: data.token,
        user: { email: email, name: 'Owner', role: 'owner' },
        st: Date.now()
      }
    };

    localStorage.setItem('jka_dv', JSON.stringify(sessionData));
    localStorage.setItem('jka_token', data.token);
    localStorage.setItem('token', data.token);
    localStorage.setItem('jka_admin', 'true');
    localStorage.setItem('jka_username', 'owner');
    localStorage.setItem('user', JSON.stringify({ email: email, name: 'Owner', role: 'owner' }));
    localStorage.setItem('jka_initialized', '1');

    currentSession = sessionData.session;
    alert('Login berhasil!');
    window.location.href = '/';
  } catch (err) {
    alert('Koneksi gagal: ' + err.message);
  }
}

// Logout
function authLogout() {
  ['jka_dv', 'jka_token', 'token', 'jka_admin', 'jka_username', 'jka_initialized', 'user'].forEach(function(k){
    localStorage.removeItem(k);
  });
  currentSession = null;
  location.href = '/';
}

// Expose ke window
window.authLogin = authLogin;
window.verifyOtp = verifyOtp;
window.authLogout = authLogout;
window.initSession = initSession;

// Auto-init
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initSession);
} else {
  initSession();
}
