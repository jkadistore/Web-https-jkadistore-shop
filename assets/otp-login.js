/* JK ADISTORE — OTP Login Helpers v2 */
window.__loginEmail = '';

var JK_SVG = {
  user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;flex-shrink:0"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>',
  crown: '<svg viewBox="0 0 24 24" fill="currentColor" style="width:16px;height:16px;flex-shrink:0"><path d="M2 19h20l-2-11-5 4-3-6-3 6-5-4z"/></svg>',
  gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;flex-shrink:0"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
  box: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;flex-shrink:0"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>',
  logout: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;flex-shrink:0"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>'
};

/* OTP Form */
window.showOtpForm = function(email) {
  var area = document.getElementById('loginArea');
  if (!area) return;
  window.__loginEmail = email;
  area.innerHTML = ''
    + '<h3 style="margin:0 0 8px;font-size:16px;font-weight:800;text-align:center">Verifikasi Kode OTP</h3>'
    + '<p style="text-align:center;font-size:12px;color:#94a3b8;margin:0 0 14px">Kode 6 digit dikirim ke <b style="color:#a78bfa">' + email + '</b></p>'
    + '<label class="label">Kode OTP</label>'
    + '<input class="input" id="otpCodeInput" type="text" inputmode="numeric" maxlength="6" placeholder="000000" style="text-align:center;font-size:22px;letter-spacing:10px;font-weight:800;padding:14px">'
    + '<button class="btn btn-primary" style="width:100%;margin-top:14px" id="otpVerifyBtn" onclick="verifyOtpLogin()">Verifikasi &amp; Masuk</button>'
    + '<button class="btn" style="width:100%;margin-top:8px;font-size:12px" onclick="location.reload()">Kembali</button>';
  setTimeout(function(){ var o = document.getElementById('otpCodeInput'); if (o) o.focus(); }, 100);
  if (typeof toast === 'function') toast('Kode OTP terkirim! Cek email.');
};

/* Verify OTP */
window.verifyOtpLogin = async function() {
  var codeEl = document.getElementById('otpCodeInput');
  var code = codeEl ? codeEl.value.trim() : '';
  var btn = document.getElementById('otpVerifyBtn');
  if (!/^[0-9]{6}$/.test(code)) { if (typeof toast === 'function') toast('Masukkan 6 digit kode'); return; }
  if (btn) { btn.disabled = true; btn.textContent = 'Memverifikasi...'; }
  try {
    var res = await fetch('/api/otp/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: window.__loginEmail, code: code })
    });
    var data = await res.json();
    if (!res.ok || !data.success) {
      if (typeof toast === 'function') toast(data.error || 'Kode salah');
      if (btn) { btn.disabled = false; btn.textContent = 'Verifikasi & Masuk'; }
      return;
    }
    var u = data.user || { email: window.__loginEmail, role: 'user' };
    var sess = { session: { role: u.role === 'owner' ? 'owner' : 'user', ot: data.token, user: { email: window.__loginEmail, name: u.name || window.__loginEmail, role: u.role || 'user' }, st: Date.now() } };
    localStorage.setItem('jka_dv', JSON.stringify(sess));
    localStorage.setItem('jka_token', data.token);
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(sess.session.user));
    localStorage.setItem('jka_initialized', '1');
    if (u.role === 'owner') localStorage.setItem('jka_admin', 'true');
    if (typeof toast === 'function') toast('Login berhasil!');
    setTimeout(function(){ location.reload(); }, 800);
  } catch (e) {
    if (typeof toast === 'function') toast('Koneksi gagal');
    if (btn) { btn.disabled = false; btn.textContent = 'Verifikasi & Masuk'; }
  }
};

/* Auth Login — OTP Flow */
window.authLogin = async function() {
  var emailEl = document.getElementById('loginEmail');
  var passEl = document.getElementById('loginPass');
  var email = emailEl ? emailEl.value.trim().toLowerCase() : '';
  var pass = passEl ? passEl.value : '';
  var btn = document.querySelector('#loginArea .btn-primary');
  if (!email || !pass) { if (typeof toast === 'function') toast('Isi email & kata sandi dulu'); return; }
  if (btn) { btn.disabled = true; btn.textContent = 'Memproses...'; }
  try {
    var res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email, password: pass })
    });
    var data = await res.json();
    if (!res.ok || !data.success) {
      if (typeof toast === 'function') toast(data.error || 'Login gagal');
      if (btn) { btn.disabled = false; btn.textContent = 'Masuk Sekarang'; }
      return;
    }
    if (data.otp_required) {
      window.showOtpForm(email);
      if (btn) { btn.disabled = false; btn.textContent = 'Masuk Sekarang'; }
      return;
    }
  } catch (e) {
    if (typeof toast === 'function') toast('Koneksi gagal');
    if (btn) { btn.disabled = false; btn.textContent = 'Masuk Sekarang'; }
  }
};

/* Update UserBtn */
window.updateUserBtn = function() {
  var btn = document.getElementById('userBtn');
  if (!btn) return;
  try {
    var dv = JSON.parse(localStorage.getItem('jka_dv') || 'null');
    var sess = dv && dv.session;
    var email = sess && sess.user && sess.user.email;
    var role = sess && sess.role;
    if (email) {
      var name = (sess.user && sess.user.name) || email.split('@')[0];
      var icon = role === 'owner' ? '<span style="color:#fbbf24;display:inline-flex;vertical-align:middle;margin-right:4px">' + JK_SVG.crown + '</span>' : '<span style="color:#a78bfa;display:inline-flex;vertical-align:middle;margin-right:4px">' + JK_SVG.user + '</span>';
      btn.innerHTML = icon + '<span>' + name + '</span>';
      btn.onclick = function(e){ e.preventDefault(); window.showUserMenu(); };
    } else {
      btn.innerHTML = '<span style="display:inline-flex;vertical-align:middle;margin-right:4px">' + JK_SVG.user + '</span><span>Masuk</span>';
      btn.onclick = function(e){ e.preventDefault(); if (typeof window.openAuth === 'function') window.openAuth('login'); };
    }
  } catch(e) {
    btn.innerHTML = '<span style="display:inline-flex;vertical-align:middle;margin-right:4px">' + JK_SVG.user + '</span><span>Masuk</span>';
  }
};

/* Show User Dropdown Menu */
window.showUserMenu = function() {
  var old = document.getElementById('jkUserMenu');
  if (old) old.remove();

  var dv = {};
  try { dv = JSON.parse(localStorage.getItem('jka_dv') || '{}'); } catch(e){}
  var sess = dv.session || {};
  var user = sess.user || {};
  var role = sess.role || 'user';
  var email = user.email || '';
  var name = user.name || email.split('@')[0] || 'User';

  var roleIcon = role === 'owner' ? '<span style="color:#fbbf24;display:inline-flex;vertical-align:middle">' + JK_SVG.crown + '</span>' : '<span style="color:#a78bfa;display:inline-flex;vertical-align:middle">' + JK_SVG.user + '</span>';

  var menu = document.createElement('div');
  menu.id = 'jkUserMenu';
  menu.style.cssText = 'position:fixed;top:70px;right:14px;background:#14141f;border:1.5px solid rgba(139,92,246,.35);border-radius:14px;box-shadow:0 20px 50px rgba(0,0,0,.7);z-index:99999;min-width:240px;overflow:hidden;animation:jkUserMenuIn .25s ease';

  var panelLink = role === 'owner' ? '<a href="#" onclick="event.preventDefault();document.getElementById(\'jkUserMenu\').remove();if(typeof adminOpen===\'function\')adminOpen();" style="display:flex;align-items:center;gap:10px;padding:12px 16px;color:#e2e8f0;text-decoration:none;font-size:13px;font-weight:600;border-left:3px solid transparent" onmouseover="this.style.background=\'rgba(139,92,246,.1)\';this.style.borderLeftColor=\'#8b5cf6\'" onmouseout="this.style.background=\'transparent\';this.style.borderLeftColor=\'transparent\'"><span style="color:#a78bfa;display:inline-flex">' + JK_SVG.gear + '</span> Panel Owner</a>' : '';

  menu.innerHTML = ''
    + '<div style="padding:16px;border-bottom:1px solid rgba(139,92,246,.15);background:linear-gradient(135deg,#1a1a2e,#14141f)">'
    + '  <div style="font-size:13px;font-weight:800;color:#fff;margin-bottom:4px;display:flex;align-items:center;gap:6px">' + roleIcon + '<span>' + name + '</span></div>'
    + '  <div style="font-size:11px;color:#94a3b8;word-break:break-all">' + email + '</div>'
    + '  <div style="margin-top:8px;font-size:9px;font-weight:800;letter-spacing:1px;color:' + (role === 'owner' ? '#fbbf24' : '#22c55e') + ';text-transform:uppercase">' + (role === 'owner' ? 'OWNER' : 'USER') + '</div>'
    + '</div>'
    + panelLink
    + '<a href="/profile" style="display:flex;align-items:center;gap:10px;padding:12px 16px;color:#e2e8f0;text-decoration:none;font-size:13px;font-weight:600;border-left:3px solid transparent" onmouseover="this.style.background=\'rgba(139,92,246,.1)\';this.style.borderLeftColor=\'#8b5cf6\'" onmouseout="this.style.background=\'transparent\';this.style.borderLeftColor=\'transparent\'"><span style="color:#a78bfa;display:inline-flex">' + JK_SVG.user + '</span> Profil Saya</a>'
    + '<a href="#" onclick="event.preventDefault();document.getElementById(\'jkUserMenu\').remove();" style="display:flex;align-items:center;gap:10px;padding:12px 16px;color:#e2e8f0;text-decoration:none;font-size:13px;font-weight:600;border-left:3px solid transparent" onmouseover="this.style.background=\'rgba(139,92,246,.1)\';this.style.borderLeftColor=\'#8b5cf6\'" onmouseout="this.style.background=\'transparent\';this.style.borderLeftColor=\'transparent\'"><span style="color:#a78bfa;display:inline-flex">' + JK_SVG.box + '</span> Pesanan Saya</a>'
    + '<div style="height:1px;background:rgba(139,92,246,.15);margin:6px 12px"></div>'
    + '<a href="#" onclick="event.preventDefault();document.getElementById(\'jkUserMenu\').remove();if(typeof window.authLogout===\'function\')window.authLogout();" style="display:flex;align-items:center;gap:10px;padding:12px 16px;color:#f43f5e;text-decoration:none;font-size:13px;font-weight:700;border-left:3px solid transparent" onmouseover="this.style.background=\'rgba(244,63,94,.1)\';this.style.borderLeftColor=\'#f43f5e\'" onmouseout="this.style.background=\'transparent\';this.style.borderLeftColor=\'transparent\'"><span style="color:#f43f5e;display:inline-flex">' + JK_SVG.logout + '</span> Keluar</a>';

  document.body.appendChild(menu);

  if (!document.getElementById('jkUserMenuStyle')) {
    var st = document.createElement('style');
    st.id = 'jkUserMenuStyle';
    st.textContent = '@keyframes jkUserMenuIn{from{opacity:0;transform:translateY(-10px) scale(.96)}to{opacity:1;transform:translateY(0) scale(1)}}';
    document.head.appendChild(st);
  }

  setTimeout(function(){
    document.addEventListener('click', function closeMenu(e){
      if (!menu.contains(e.target) && e.target.id !== 'userBtn') {
        menu.remove();
        document.removeEventListener('click', closeMenu);
      }
    });
  }, 100);
};

/* Auto-init */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function(){ setTimeout(window.updateUserBtn, 100); });
} else {
  setTimeout(window.updateUserBtn, 100);
}
window.addEventListener('load', function(){ setTimeout(window.updateUserBtn, 200); });

console.log('[JK] OTP Login Helpers v2 loaded');
