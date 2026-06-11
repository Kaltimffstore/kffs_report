var supabaseClient = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
var selectedFiles = [];

function escapeHtml(text) {
  if (!text) return '';
  var div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function openLightbox(url) {
  var lb = document.getElementById('lightbox');
  var img = document.getElementById('lightboxImg');
  if (lb && img) { img.src = url; lb.classList.add('active'); }
}

async function cariLaporan() {
  var searchInput = document.getElementById('searchInput');
  if (!searchInput) return;
  var query = searchInput.value.trim();
  if (!query) { alert('Masukkan ID akun!'); return; }

  var container = document.getElementById('resultsContainer');
  var list = document.getElementById('resultsList');
  var info = document.getElementById('resultsInfo');
  if (!container) return;

  container.style.display = 'block';
  list.innerHTML = '<div style="text-align:center;padding:20px;"><div class="spinner"></div></div>';
  info.innerHTML = '';

  try {
    var result = await supabaseClient
      .from('laporan')
      .select('*')
      .or('id_akun.ilike.%' + query + '%,deskripsi.ilike.%' + query + '%')
      .order('created_at', { ascending: false });

    var laporan = result.data || [];

    if (laporan.length === 0) {
      list.innerHTML = '<div class="no-results"><div class="icon">🔍</div><h3>Tidak ditemukan</h3><p>Tidak ada laporan untuk "' + escapeHtml(query) + '"</p><a href="lapor.html" class="btn btn-primary" style="margin-top:20px;">📝 Laporkan Akun Ini</a></div>';
    } else {
      info.innerHTML = '<p style="color:var(--text-muted);margin-bottom:15px;">Ditemukan <strong style="color:var(--primary);">' + laporan.length + '</strong> hasil</p>';
      list.innerHTML = laporan.map(renderResultCard).join('');
    }
  } catch (err) {
    list.innerHTML = '<div class="alert alert-error">Error: ' + err.message + '</div>';
  }
}

function renderResultCard(r) {
  var tanggal = new Date(r.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  var kat = r.kategori || 'Laporan';
  var isPenipuan = kat.indexOf('Penipuan') >= 0 || kat.indexOf('Scam') >= 0 || kat.indexOf('Hack') >= 0;
  var badgeClass = isPenipuan ? 'badge-danger' : 'badge-warning';
  var fotoHtml = '';
  if (r.bukti_foto_urls && r.bukti_foto_urls.length > 0) {
    fotoHtml = '<div class="bukti-foto">' + r.bukti_foto_urls.map(function(url) {
      return '<img src="' + url + '" alt="Bukti" onclick="openLightbox(\'' + url + '\')" loading="lazy">';
    }).join('') + '</div>';
  }
  var deskShort = (r.deskripsi || '').substring(0, 250);
  if ((r.deskripsi || '').length > 250) deskShort += '...';

  return '<div class="result-card">' +
    '<span class="badge ' + badgeClass + '">' + escapeHtml(kat) + '</span>' +
    '<span class="badge badge-verified">✓ Terverifikasi</span>' +
    '<h3>ID: ' + escapeHtml(r.id_akun) + '</h3>' +
    '<div class="meta"><span>🎮 ' + escapeHtml(r.platform || '-') + '</span><span>📅 ' + tanggal + '</span><span>👤 ' + escapeHtml(r.nama_pelapor || 'Anonim') + '</span></div>' +
    '<div class="deskripsi">' + escapeHtml(deskShort) + '</div>' +
    fotoHtml +
    '<div style="margin-top:15px;"><a href="view.html?id=' + r.id + '" class="btn btn-secondary">📄 Lihat Detail</a></div>' +
    '</div>';
}

async function loadDetail(id) {
  var container = document.getElementById('detailContainer');
  if (!container) return;

  try {
    var result = await supabaseClient
      .from('laporan')
      .select('*')
      .eq('id', id)
      .single();

    var data = result.data;
    if (result.error || !data) {
      container.innerHTML = '<div class="alert alert-error">Laporan tidak ditemukan.</div><p style="text-align:center;margin-top:20px;"><a href="index.html" class="btn btn-primary">← Kembali</a></p>';
      return;
    }

    var tanggal = new Date(data.created_at).toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });

    var fotoHtml = '';
    if (data.bukti_foto_urls && data.bukti_foto_urls.length > 0) {
      fotoHtml = '<h3 style="color:var(--text);margin:25px 0 12px;">📸 Bukti Foto:</h3><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:15px;">' +
        data.bukti_foto_urls.map(function(url) {
          return '<img src="' + url + '" alt="Bukti" onclick="openLightbox(\'' + url + '\')" style="width:100%;border-radius:12px;cursor:pointer;">';
        }).join('') + '</div>';
    }

    container.innerHTML = '<a href="index.html" style="color:var(--primary);text-decoration:none;display:inline-block;margin-bottom:20px;">← Kembali</a>' +
      '<div class="result-card">' +
      '<span class="badge badge-danger">' + escapeHtml(data.kategori) + '</span>' +
      '<span class="badge badge-verified">✓ Terverifikasi</span>' +
      '<h2 style="color:#fff;margin:18px 0 8px;font-size:1.6rem;">ID Akun: ' + escapeHtml(data.id_akun) + '</h2>' +
      '<div class="meta" style="font-size:0.95rem;"><span>🎮 ' + escapeHtml(data.platform) + '</span><span>📅 ' + tanggal + '</span><span>👤 ' + escapeHtml(data.nama_pelapor) + '</span></div>' +
      '<hr style="border-color:var(--border);margin:20px 0;">' +
      '<h3 style="color:var(--text);margin-bottom:12px;">📋 Kronologi:</h3>' +
      '<div class="deskripsi" style="white-space:pre-wrap;font-size:1rem;">' + escapeHtml(data.deskripsi) + '</div>' +
      fotoHtml +
      '</div>' +
      '<div style="text-align:center;margin-top:30px;">' +
      '<a href="lapor.html" class="btn btn-primary">📝 Laporan Lain</a> ' +
      '<a href="https://wa.me/+6283140534928" target="_blank" class="btn btn-secondary">💬 Lapor ke Admin</a>' +
      '</div>';
  } catch (err) {
    container.innerHTML = '<div class="alert alert-error">Error: ' + err.message + '</div>';
  }
}

async function uploadToCloudinary(file) {
  var formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', CONFIG.CLOUDINARY_PRESET);
  formData.append('folder', 'kffs-bukti');

  var response = await fetch('https://api.cloudinary.com/v1_1/' + CONFIG.CLOUDINARY_CLOUD_NAME + '/image/upload', {
    method: 'POST',
    body: formData
  });

  if (!response.ok) {
    var errText = await response.text();
    throw new Error('Upload gagal: ' + errText);
  }

  var result = await response.json();
  return result.secure_url;
}

async function submitLaporan(event) {
  event.preventDefault();

  var honeypot = document.getElementById('honeypot');
  if (honeypot && honeypot.value !== '') return;

  var submitBtn = document.getElementById('submitBtn');
  var alertArea = document.getElementById('alertArea');
  if (!submitBtn || !alertArea) return;

  submitBtn.disabled = true;
  submitBtn.innerHTML = '⏳ Mengirim...';

  try {
    var fotoUrls = [];
    for (var i = 0; i < selectedFiles.length; i++) {
      var url = await uploadToCloudinary(selectedFiles[i]);
      fotoUrls.push(url);
    }

    var insertResult = await supabaseClient
      .from('laporan')
      .insert({
        id_akun: document.getElementById('idAkun').value.trim(),
        platform: document.getElementById('platform').value,
        kategori: document.getElementById('kategori').value,
        deskripsi: document.getElementById('deskripsi').value.trim(),
        bukti_foto_urls: fotoUrls,
        nama_pelapor: document.getElementById('namaPelapor').value.trim() || 'Anonim',
        status: 'pending'
      });

    if (insertResult.error) throw insertResult.error;

    alertArea.innerHTML = '<div class="alert alert-success"><strong>✅ Laporan berhasil dikirim!</strong><br>Menunggu verifikasi admin.</div>';
    document.getElementById('laporanForm').reset();
    selectedFiles = [];
    document.getElementById('previewFotos').innerHTML = '';
  } catch (err) {
    alertArea.innerHTML = '<div class="alert alert-error">❌ Gagal: ' + err.message + '</div>';
  }

  submitBtn.disabled = false;
  submitBtn.innerHTML = '📤 Kirim Laporan';
}

function previewFotos(input) {
  var preview = document.getElementById('previewFotos');
  if (!preview) return;

  var files = Array.from(input.files);
  if (selectedFiles.length + files.length > 5) {
    alert('Maksimal 5 foto!');
    return;
  }

  files.forEach(function(file) {
    if (file.size > 10 * 1024 * 1024) {
      alert('"' + file.name + '" terlalu besar! Max 10MB.');
      return;
    }
    selectedFiles.push(file);
    var reader = new FileReader();
    reader.onload = function(e) {
      var idx = selectedFiles.length - 1;
      var div = document.createElement('div');
      div.className = 'preview-item';
      div.innerHTML = '<img src="' + e.target.result + '" alt="Preview"><button class="remove-btn" onclick="removeFoto(' + idx + ', this.parentElement)">✕</button>';
      preview.appendChild(div);
    };
    reader.readAsDataURL(file);
  });
}

function removeFoto(index, element) {
  selectedFiles.splice(index, 1);
  element.remove();
}
