var supabaseClient = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
var currentTab = 'pending';

function escapeHtml(text) {
  if (!text) return '';
  var div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function openLightbox(url) {
  document.getElementById('lightboxImg').src = url;
  document.getElementById('lightbox').classList.add('active');
}

function showAlert(elementId, message, type) {
  document.getElementById(elementId).innerHTML = '<div class="alert alert-' + type + '">' + message + '</div>';
}

document.addEventListener('DOMContentLoaded', async function() {
  var sessionResult = await supabaseClient.auth.getSession();
  var session = sessionResult.data.session;
  if (session) {
    var user = session.user;
    if (user.user_metadata && user.user_metadata.role === 'admin') {
      showDashboard(user);
    } else {
      showAlert('loginAlert', '❌ Akun ini bukan admin!', 'error');
      await supabaseClient.auth.signOut();
    }
  }
});

async function adminLogin(event) {
  event.preventDefault();
  var btn = document.getElementById('loginBtn');
  btn.disabled = true;
  btn.textContent = 'Memproses...';

  try {
    var result = await supabaseClient.auth.signInWithPassword({
      email: document.getElementById('loginEmail').value,
      password: document.getElementById('loginPassword').value
    });
    if (result.error) throw result.error;
    var user = result.data.user;
    if (!user.user_metadata || user.user_metadata.role !== 'admin') {
      await supabaseClient.auth.signOut();
      throw new Error('Akun ini bukan admin!');
    }
    showDashboard(user);
  } catch (err) {
    showAlert('loginAlert', '❌ ' + err.message, 'error');
  }
  btn.disabled = false;
  btn.textContent = 'Masuk';
}

async function logout() {
  await supabaseClient.auth.signOut();
  document.getElementById('loginSection').style.display = 'block';
  document.getElementById('dashboardSection').style.display = 'none';
  document.getElementById('navLoggedIn').style.display = 'none';
}

async function showDashboard(user) {
  document.getElementById('loginSection').style.display = 'none';
  document.getElementById('dashboardSection').style.display = 'block';
  document.getElementById('navLoggedIn').style.display = 'flex';
  document.getElementById('adminEmail').textContent = '👑 ' + user.email;
  await loadStats();
  await loadLaporan(currentTab);
}

async function loadStats() {
  try {
    var result = await supabaseClient.from('laporan').select('status');
    var all = result.data || [];
    var pending = 0, verified = 0, rejected = 0;
    all.forEach(function(r) {
      if (r.status === 'pending') pending++;
      else if (r.status === 'verified') verified++;
      else if (r.status === 'rejected') rejected++;
    });
    document.getElementById('statPending').textContent = pending;
    document.getElementById('statVerified').textContent = verified;
    document.getElementById('statRejected').textContent = rejected;
    document.getElementById('statTotal').textContent = all.length;
  } catch (err) { console.error(err); }
}

function switchTab(tab, btnElement) {
  currentTab = tab;
  document.querySelectorAll('.tab-btn').forEach(function(b) { b.classList.remove('active'); });
  btnElement.classList.add('active');
  loadLaporan(tab);
}

async function loadLaporan(status) {
  var list = document.getElementById('adminList');
  list.innerHTML = '<div style="text-align:center;padding:20px;"><div class="spinner"></div></div>';
  try {
    var result = await supabaseClient.from('laporan').select('*').eq('status', status).order('created_at', { ascending: false });
    if (result.error) throw result.error;
    var data = result.data || [];
    if (data.length === 0) {
      list.innerHTML = '<div class="no-results"><div class="icon">📭</div><p>Tidak ada laporan ' + status + '.</p></div>';
      return;
    }
    list.innerHTML = data.map(function(r) { return renderAdminCard(r, status); }).join('');
  } catch (err) {
    list.innerHTML = '<div class="alert alert-error">Error: ' + err.message + '</div>';
  }
}

function renderAdminCard(r, status) {
  var tanggal = new Date(r.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  var fotoHtml = '';
  if (r.bukti_foto_urls && r.bukti_foto_urls.length > 0) {
    fotoHtml = '<div style="display:flex;gap:8px;flex-wrap:wrap;margin:12px 0;">' +
      r.bukti_foto_urls.map(function(url) {
        return '<img src="' + url + '" alt="Bukti" onclick="openLightbox(\'' + url + '\')" loading="lazy" style="width:100px;height:75px;object-fit:cover;border-radius:8px;cursor:pointer;">';
      }).join('') + '</div>';
  }
  var badgeClass = status === 'pending' ? 'badge-pending' : status === 'verified' ? 'badge-verified' : 'badge-danger';
  var badgeText = status === 'pending' ? '⏳ Pending' : status === 'verified' ? '✓ Verified' : '✕ Rejected';
  var actions = '';
  if (status === 'pending') {
    actions = '<div class="admin-actions"><button class="btn btn-success" onclick="updateStatus(\'' + r.id + '\', \'verified\')">✅ Terima</button><button class="btn btn-danger" onclick="updateStatus(\'' + r.id + '\', \'rejected\')">❌ Tolak</button><button class="btn btn-secondary" onclick="hapusLaporan(\'' + r.id + '\')" style="margin-left:auto;">🗑️ Hapus</button></div>';
  } else if (status === 'verified') {
    actions = '<div class="admin-actions"><button class="btn btn-secondary" onclick="updateStatus(\'' + r.id + '\', \'rejected\')">❌ Batalkan</button><button class="btn btn-danger" onclick="hapusLaporan(\'' + r.id + '\')" style="margin-left:auto;">🗑️ Hapus</button></div>';
  } else {
    actions = '<div class="admin-actions"><button class="btn btn-success" onclick="updateStatus(\'' + r.id + '\', \'verified\')">✅ Terima</button><button class="btn btn-danger" onclick="hapusLaporan(\'' + r.id + '\')" style="margin-left:auto;">🗑️ Hapus</button></div>';
  }
  return '<div class="result-card" id="card-' + r.id + '">' +
    '<span class="badge ' + badgeClass + '">' + badgeText + '</span>' +
    '<span class="badge badge-warning">' + escapeHtml(r.kategori) + '</span>' +
    '<h3>ID Akun: ' + escapeHtml(r.id_akun) + '</h3>' +
    '<div class="meta"><span>🎮 ' + escapeHtml(r.platform) + '</span><span>📅 ' + tanggal + '</span><span>👤 ' + escapeHtml(r.nama_pelapor) + '</span></div>' +
    '<div class="deskripsi" style="margin:12px 0;">' + escapeHtml(r.deskripsi) + '</div>' +
    fotoHtml + actions + '</div>';
}

async function updateStatus(id, newStatus) {
  var action = newStatus === 'verified' ? 'menerima' : 'menolak';
  if (!confirm('Yakin ingin ' + action + ' laporan ini?')) return;
  try {
    var userResult = await supabaseClient.auth.getUser();
    var result = await supabaseClient.from('laporan').update({ status: newStatus, reviewed_at: new Date().toISOString(), reviewed_by: userResult.data.user.id }).eq('id', id);
    if (result.error) throw result.error;
    var card = document.getElementById('card-' + id);
    if (card) { card.style.opacity = '0.3'; setTimeout(function() { card.remove(); }, 300); }
    await loadStats();
  } catch (err) { alert('❌ Gagal: ' + err.message); }
}

async function hapusLaporan(id) {
  if (!confirm('⚠️ Yakin ingin MENGHAPUS permanen laporan ini?')) return;
  try {
    var result = await supabaseClient.from('laporan').delete().eq('id', id);
    if (result.error) throw result.error;
    var card = document.getElementById('card-' + id);
    if (card) card.remove();
    await loadStats();
  } catch (err) { alert('❌ Gagal hapus: ' + err.message); }
}
