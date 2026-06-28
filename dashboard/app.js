// Logika Utama Dashboard Admin
let currentUser = null;
let allGuests = [];
let allRsvps = [];
let allGifts = [];

document.addEventListener('DOMContentLoaded', async () => {
  // 1. Cek Auth
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    window.location.href = 'index.html';
    return;
  }
  
  currentUser = session.user;
  if (currentUser.user_metadata?.role === 'checkin') {
    window.location.href = 'checkin.html'; // Redirect if checkin role tries to access admin
    return;
  }

  // 2. Setup UI & Navigasi
  setupNavigation();
  
  // 3. Load Data Awal
  await loadAllData();
  
  // 4. Setup Realtime
  setupRealtime();

  // 5. Setup Event Listeners
  setupEventListeners();
});

// --- UI & Navigasi ---
function setupNavigation() {
  const navLinks = document.querySelectorAll('.sidebar-nav .nav-link[data-page]');
  const pages = document.querySelectorAll('.page');
  const titleEl = document.getElementById('pageTitle');
  const sidebar = document.getElementById('sidebar');
  const btnMenu = document.getElementById('btnMenu');

  navLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      navLinks.forEach(l => l.classList.remove('active'));
      link.classList.add('active');
      
      const targetPage = link.getAttribute('data-page');
      pages.forEach(p => p.classList.remove('active'));
      document.getElementById('page-' + targetPage).classList.add('active');
      
      titleEl.textContent = link.textContent.trim();
      
      if (window.innerWidth <= 768) {
        sidebar.classList.remove('open');
      }
    });
  });

  btnMenu.addEventListener('click', () => {
    sidebar.classList.toggle('open');
    document.body.classList.toggle('sidebar-open');
  });

  // Tutup sidebar saat klik overlay (mobile)
  const sidebarOverlay = document.getElementById('sidebarOverlay');
  if (sidebarOverlay) {
    sidebarOverlay.addEventListener('click', () => {
      sidebar.classList.remove('open');
      document.body.classList.remove('sidebar-open');
    });
  }

  document.getElementById('btnLogout').addEventListener('click', async () => {
    await supabase.auth.signOut();
    window.location.href = 'index.html';
  });
}

// --- Data Loading ---
async function loadAllData() {
  try {
    const [resGuests, resRsvp, resGifts] = await Promise.all([
      supabase.from('guests').select('*').order('created_at', { ascending: false }),
      supabase.from('rsvp_submissions').select('*').order('created_at', { ascending: false }),
      supabase.from('gifts').select('*').order('created_at', { ascending: false })
    ]);

    if (resGuests.error) throw resGuests.error;
    if (resRsvp.error) throw resRsvp.error;
    if (resGifts.error) throw resGifts.error;

    allGuests = resGuests.data;
    allRsvps = resRsvp.data;
    allGifts = resGifts.data;

    renderStats();
    renderGuestsTable();
    renderRsvpTable();
    renderGiftsTable();
    renderActivityFeed();
    renderHomeWishes();

  } catch (error) {
    showToast('Gagal memuat data: ' + error.message, 'error');
  }
}

// --- Render Functions ---
function renderStats() {
  const totalDiundang = allGuests.length;
  const checkInCount = allGuests.filter(g => g.checked_in).length;
  const rsvpHadir = allRsvps.filter(r => r.attendance === 'hadir').reduce((sum, r) => sum + (r.pax || 1), 0);
  const rsvpTidak = allRsvps.filter(r => r.attendance === 'tidak_hadir').length;

  document.getElementById('statTotalGuests').textContent = totalDiundang;
  document.getElementById('statCheckedIn').textContent = checkInCount;
  document.getElementById('statRsvpHadir').textContent = rsvpHadir;
  document.getElementById('statRsvpTidak').textContent = rsvpTidak;
}

function renderGuestsTable(filterText = '') {
  const tbody = document.querySelector('#guestsTable tbody');
  tbody.innerHTML = '';
  
  let filtered = allGuests;
  if (filterText) {
    const lower = filterText.toLowerCase();
    filtered = allGuests.filter(g => g.name.toLowerCase().includes(lower) || g.group_name.toLowerCase().includes(lower));
  }

  document.getElementById('guestCountLabel').textContent = `Total: ${filtered.length}`;

  filtered.forEach(guest => {
    const tr = document.createElement('tr');
    
    // Status Badge
    let statusBadge = `<span class="badge badge-pending">Pending</span>`;
    if (guest.rsvp_status === 'hadir') statusBadge = `<span class="badge badge-hadir">Hadir</span>`;
    if (guest.rsvp_status === 'tidak_hadir') statusBadge = `<span class="badge badge-tidak">Tidak Hadir</span>`;

    // Checkin Badge
    const checkinBadge = guest.checked_in 
      ? `<span class="badge badge-checkin"><i class="bi bi-check2-all"></i> Ya (${formatTime(guest.checked_in_at)})</span>` 
      : `<span style="color:var(--text-muted); font-size:0.8rem;">Belum</span>`;

    tr.innerHTML = `
      <td><strong>${guest.name}</strong><br><small style="color:var(--text-muted);">${guest.phone || '-'}</small></td>
      <td>${guest.group_name || '-'}</td>
      <td>${guest.session || 'Keduanya'}</td>
      <td>${statusBadge}</td>
      <td>${checkinBadge}</td>
      <td>
        <button class="btn btn-sm btn-outline" onclick="showQR('${guest.id}')" title="Lihat QR"><i class="bi bi-qr-code"></i></button>
        <button class="btn btn-sm btn-outline" onclick="editGuest('${guest.id}')" title="Edit"><i class="bi bi-pencil"></i></button>
        <button class="btn btn-sm btn-danger" onclick="deleteGuest('${guest.id}')" title="Hapus"><i class="bi bi-trash"></i></button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function renderRsvpTable(filterVal = 'all') {
  const tbody = document.querySelector('#rsvpTable tbody');
  tbody.innerHTML = '';

  let filtered = allRsvps;
  if (filterVal !== 'all') {
    filtered = allRsvps.filter(r => r.attendance === filterVal);
  }

  document.getElementById('rsvpCountLabel').textContent = `Total: ${filtered.length}`;

  filtered.forEach(rsvp => {
    const tr = document.createElement('tr');
    const attBadge = rsvp.attendance === 'hadir' 
      ? `<span class="badge badge-hadir">Hadir</span>` 
      : `<span class="badge badge-tidak">Tidak Hadir</span>`;

    tr.innerHTML = `
      <td><small style="color:var(--text-muted);">${formatDateTime(rsvp.created_at)}</small></td>
      <td><strong>${rsvp.guest_name}</strong></td>
      <td>${attBadge}</td>
      <td>${rsvp.attendance === 'hadir' ? rsvp.pax : '-'}</td>
      <td><div style="max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${rsvp.message || ''}">${rsvp.message || '-'}</div></td>
      <td>
        <button class="btn btn-sm btn-danger" onclick="deleteRsvp('${rsvp.id}')" title="Hapus ucapan ini">
          <i class="bi bi-trash"></i>
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

window.deleteRsvp = async function(id) {
  if (!confirm('Hapus ucapan ini dari daftar?\n(Tidak bisa dibatalkan)')) return;
  const { error } = await supabase.from('rsvp_submissions').delete().eq('id', id);
  if (!error) {
    allRsvps = allRsvps.filter(r => r.id !== id);
    renderRsvpTable();
    showToast('Ucapan berhasil dihapus', 'success');
  } else {
    showToast('Gagal menghapus: ' + error.message, 'error');
  }
};

function renderGiftsTable() {
  const tbody = document.querySelector('#giftsTable tbody');
  tbody.innerHTML = '';

  let totalAmplop = 0;

  allGifts.forEach(gift => {
    const tr = document.createElement('tr');
    
    if (gift.type === 'amplop') totalAmplop += gift.amount;

    const nominalHtml = gift.type === 'amplop' 
      ? `<strong style="color:var(--gold);">Rp ${gift.amount.toLocaleString('id-ID')}</strong>`
      : `<em>Kado Fisik</em>`;

    tr.innerHTML = `
      <td><small style="color:var(--text-muted);">${formatDateTime(gift.created_at)}</small></td>
      <td><strong>${gift.from_name}</strong></td>
      <td><span class="badge badge-checkin">${gift.type}</span></td>
      <td>${nominalHtml}</td>
      <td>${gift.notes || '-'}</td>
      <td>
        <button class="btn btn-sm btn-danger" onclick="deleteGift('${gift.id}')"><i class="bi bi-trash"></i></button>
      </td>
    `;
    tbody.appendChild(tr);
  });

  document.getElementById('totalAmplop').textContent = `Rp ${totalAmplop.toLocaleString('id-ID')}`;
}

function renderActivityFeed() {
  const feed = document.getElementById('activityFeed');
  // Ambil tamu yang sudah check-in, urutkan berdasarkan checked_in_at terbaru, ambil 10
  const checkedInGuests = allGuests
    .filter(g => g.checked_in && g.checked_in_at)
    .sort((a, b) => new Date(b.checked_in_at) - new Date(a.checked_in_at))
    .slice(0, 10);

  if (checkedInGuests.length === 0) {
    feed.innerHTML = `
      <div class="empty-state">
        <i class="bi bi-clock-history"></i>
        <p>Belum ada tamu check-in.</p>
      </div>`;
    return;
  }

  feed.innerHTML = '';
  checkedInGuests.forEach(guest => {
    feed.innerHTML += `
      <div class="activity-item">
        <div class="activity-dot green"></div>
        <div>
          <div class="activity-text"><strong>${guest.name}</strong> (${guest.group_name}) telah check-in.</div>
          <div class="activity-time">${formatDateTime(guest.checked_in_at)}</div>
        </div>
      </div>
    `;
  });
}

function renderHomeWishes() {
  const list = document.getElementById('homeWishList');
  // Ambil 5 RSVP terbaru yang ada ucapannya
  const wishes = allRsvps
    .filter(r => r.message && r.message.trim() !== '')
    .slice(0, 5);

  if (wishes.length === 0) {
    list.innerHTML = `<p style="color:var(--text-muted); font-size:0.85rem; padding:10px;">Belum ada ucapan.</p>`;
    return;
  }

  list.innerHTML = '';
  wishes.forEach(wish => {
    list.innerHTML += `
      <div class="wish-card">
        <div class="wish-name">${wish.guest_name}</div>
        <div class="wish-msg">"${wish.message}"</div>
        <div class="wish-meta">${formatTime(wish.created_at)}</div>
      </div>
    `;
  });
}

// --- Event Listeners ---
function setupEventListeners() {
  // Search Tamu
  document.getElementById('searchGuest').addEventListener('input', (e) => {
    renderGuestsTable(e.target.value);
  });

  // Filter RSVP
  document.getElementById('filterRsvp').addEventListener('change', (e) => {
    renderRsvpTable(e.target.value);
  });

  // Modal Tambah Tamu
  document.getElementById('btnAddGuest').addEventListener('click', () => {
    document.getElementById('formGuest').reset();
    document.getElementById('guestId').value = '';
    document.getElementById('modalGuestTitle').textContent = 'Tambah Tamu Baru';
    openModal('modalGuest');
  });

  // Submit Form Tamu
  document.getElementById('formGuest').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('btnSaveGuest');
    btn.disabled = true;
    btn.innerHTML = 'Menyimpan...';

    const id = document.getElementById('guestId').value;
    const guestData = {
      name: document.getElementById('guestName').value,
      phone: document.getElementById('guestPhone').value,
      group_name: document.getElementById('guestGroup').value,
      session: document.getElementById('guestSession').value,
    };

    try {
      if (id) {
        // Update
        const { error } = await supabase.from('guests').update(guestData).eq('id', id);
        if (error) throw error;
        showToast('Data tamu diperbarui', 'success');
      } else {
        // Insert
        const { error } = await supabase.from('guests').insert([guestData]);
        if (error) throw error;
        showToast('Tamu berhasil ditambahkan', 'success');
      }
      closeModal('modalGuest');
      await loadAllData(); // Reload for simplicity
    } catch (err) {
      showToast('Gagal menyimpan: ' + err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = 'Simpan Data';
    }
  });

  // --- Import Excel Logic ---
  const dropZone = document.getElementById('dropZone');
  const fileInput = document.getElementById('fileInput');
  let excelData = null;

  document.getElementById('btnImportGuest').addEventListener('click', () => {
    openModal('modalImport');
    excelData = null;
    document.getElementById('importResult').style.display = 'none';
    document.getElementById('btnProcessImport').disabled = true;
  });

  dropZone.addEventListener('click', () => fileInput.click());
  
  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
  });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
  
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    if (e.dataTransfer.files.length) {
      handleExcelFile(e.dataTransfer.files[0]);
    }
  });

  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length) {
      handleExcelFile(e.target.files[0]);
    }
  });

  function handleExcelFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const json = XLSX.utils.sheet_to_json(worksheet);
        
        if (json.length === 0) throw new Error("File Excel kosong");
        if (!json[0].name) throw new Error("Kolom 'name' tidak ditemukan. Pastikan baris pertama adalah header.");

        excelData = json.map(row => ({
          name: row.name ? String(row.name).trim() : 'Tanpa Nama',
          phone: row.phone ? String(row.phone).trim() : null,
          group_name: row.group_name ? String(row.group_name).trim() : 'Umum',
          session: row.session ? String(row.session).trim() : 'Keduanya'
        }));

        document.getElementById('importResult').style.display = 'block';
        document.getElementById('importResultText').textContent = `Siap diimport (${excelData.length} baris data ditemukan)`;
        document.getElementById('btnProcessImport').disabled = false;
        
      } catch (err) {
        showToast('Error membaca file: ' + err.message, 'error');
      }
    };
    reader.readAsArrayBuffer(file);
  }

  document.getElementById('btnProcessImport').addEventListener('click', async () => {
    if (!excelData || excelData.length === 0) return;
    
    const btn = document.getElementById('btnProcessImport');
    btn.disabled = true;
    btn.innerHTML = '<i class="bi bi-arrow-repeat spin"></i> Mengimport...';

    try {
      // Chunk inserts to avoid large payload limits
      const chunkSize = 100;
      for (let i = 0; i < excelData.length; i += chunkSize) {
        const chunk = excelData.slice(i, i + chunkSize);
        const { error } = await supabase.from('guests').insert(chunk);
        if (error) throw error;
      }
      
      showToast(`${excelData.length} tamu berhasil diimport`, 'success');
      closeModal('modalImport');
      await loadAllData();
      
    } catch (err) {
      showToast('Gagal import: ' + err.message, 'error');
    } finally {
      btn.innerHTML = 'Proses Import';
    }
  });

  // Modal Kado
  document.getElementById('btnAddGift').addEventListener('click', () => {
    // TODO: implement form modal kado (for simplicity, not fully implemented here as logic is same as guest)
    showToast('Fitur input manual kado sedang disiapkan.', 'info');
  });
}

// --- Window Functions (for inline onclick) ---
window.openModal = function(id) {
  document.getElementById(id).classList.add('open');
};

window.closeModal = function(id) {
  document.getElementById(id).classList.remove('open');
};

window.switchPage = function(pageId) {
  document.querySelector(`.sidebar-nav .nav-link[data-page="${pageId}"]`).click();
};

window.deleteGuest = async function(id) {
  if (confirm('Yakin ingin menghapus tamu ini?')) {
    const { error } = await supabase.from('guests').delete().eq('id', id);
    if (error) showToast('Gagal menghapus: ' + error.message, 'error');
    else {
      showToast('Tamu dihapus', 'success');
      allGuests = allGuests.filter(g => g.id !== id);
      renderGuestsTable();
      renderStats();
    }
  }
};

window.editGuest = function(id) {
  const guest = allGuests.find(g => g.id === id);
  if (!guest) return;
  
  document.getElementById('guestId').value = guest.id;
  document.getElementById('guestName').value = guest.name;
  document.getElementById('guestPhone').value = guest.phone || '';
  document.getElementById('guestGroup').value = guest.group_name || 'Umum';
  document.getElementById('guestSession').value = guest.session || 'Keduanya';
  
  document.getElementById('modalGuestTitle').textContent = 'Edit Tamu';
  openModal('modalGuest');
};

window.deleteGift = async function(id) {
  if (confirm('Yakin ingin menghapus catatan hadiah ini?')) {
    const { error } = await supabase.from('gifts').delete().eq('id', id);
    if (!error) {
      allGifts = allGifts.filter(g => g.id !== id);
      renderGiftsTable();
    }
  }
};

window.showQR = function(id) {
  const guest = allGuests.find(g => g.id === id);
  if (!guest) return;

  document.getElementById('qrGuestName').textContent = guest.name;
  document.getElementById('qrGuestGroup').textContent = guest.group_name;
  
  const qrContainer = document.getElementById('qrcode');
  qrContainer.innerHTML = ''; // clear previous
  
  // === URL CONFIG ===
  // Gunakan nama tamu bukan UUID token untuk link undangan
  const BASE_URL = 'https://lalala.enpdigitalservice.my.id';
  const guestNameEncoded = encodeURIComponent(guest.name);
  const inviteUrl     = `${BASE_URL}/?to=${guestNameEncoded}`;
  const simpleLinkUrl = `${BASE_URL}/?to=${guestNameEncoded}`;
  
  document.getElementById('qrLink').value = inviteUrl;

  // Link sederhana (sama, pakai nama)
  const simpleLinkEl = document.getElementById('simpleLinkInput');
  if (simpleLinkEl) simpleLinkEl.value = simpleLinkUrl;

  // Generate QR Code — encode nama tamu (agar scanner pakai nama, bukan UUID)
  new QRCode(qrContainer, {
    text: guest.qr_token,
    width: 180,
    height: 180,
    colorDark: "#000000",
    colorLight: "#ffffff",
    correctLevel: QRCode.CorrectLevel.M
  });

  // Download QR
  document.getElementById('btnDownloadQR').onclick = () => {
    const canvas = qrContainer.querySelector('canvas');
    if (canvas) {
      const a = document.createElement('a');
      a.href = canvas.toDataURL("image/png");
      a.download = `QR_${guest.name.replace(/\s+/g, '_')}.png`;
      a.click();
    }
  };

  // Copy link QR
  document.getElementById('btnCopyLink').onclick = () => {
    navigator.clipboard.writeText(inviteUrl);
    showToast('Link dicopy ke clipboard ✓', 'success');
  };

  // Copy link sederhana
  const btnCopySimple = document.getElementById('btnCopySimpleLink');
  if (btnCopySimple) {
    btnCopySimple.onclick = () => {
      navigator.clipboard.writeText(simpleLinkUrl);
      showToast('Link undangan dicopy ke clipboard ✓', 'success');
    };
  }

  openModal('modalQR');
};

// Fungsi Copy Link Umum
window.copyGeneralLink = function() {
  const BASE_URL = 'https://lalala.enpdigitalservice.my.id/';
  navigator.clipboard.writeText(BASE_URL);
  showToast('Link Umum dicopy ke clipboard ✓', 'success');
};

// Handle click overlay modal (tutup jika klik di luar modal-box)
window.handleModalOverlayClick = function(event, modalId) {
  if (event.target === document.getElementById(modalId)) {
    closeModal(modalId);
  }
};

// ESC key — tutup semua modal
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open'));
  }
});

// Light Mode Toggle
(function initTheme() {
  const saved = localStorage.getItem('dashboard-theme') || 'dark';
  if (saved === 'light') document.documentElement.setAttribute('data-theme', 'light');
})();

document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('btnTheme');
  if (!btn) return;
  const icon = document.getElementById('themeIcon');
  const updateIcon = () => {
    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    icon.className = isLight ? 'bi bi-moon-fill' : 'bi bi-sun-fill';
  };
  updateIcon();
  btn.addEventListener('click', () => {
    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    document.documentElement.setAttribute('data-theme', isLight ? 'dark' : 'light');
    localStorage.setItem('dashboard-theme', isLight ? 'dark' : 'light');
    updateIcon();
  });
});

// --- Realtime Setup ---
function setupRealtime() {
  const statusEl = document.getElementById('connectionStatus');
  
  const channel = supabase.channel('dashboard_updates')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'guests' }, payload => {
      // Refresh Data
      loadAllData(); 
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'rsvp_submissions' }, payload => {
      // Notif ucapan baru
      if (payload.eventType === 'INSERT') {
        showToast(`RSVP baru dari ${payload.new.guest_name}`, 'info');
      }
      loadAllData();
    })
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        statusEl.innerHTML = '<i class="bi bi-wifi"></i> Online';
        statusEl.className = 'badge badge-checkin';
      } else {
        statusEl.innerHTML = '<i class="bi bi-wifi-off"></i> Disconnected';
        statusEl.className = 'badge badge-tidak';
      }
    });
}

// --- Utils ---
function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <i class="bi ${type === 'success' ? 'bi-check-circle-fill' : type === 'error' ? 'bi-exclamation-circle-fill' : 'bi-info-circle-fill'}"></i>
    <span>${message}</span>
  `;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function formatTime(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}

function formatDateTime(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  return d.toLocaleDateString('id-ID', { day:'numeric', month:'short' }) + ' ' + formatTime(isoString);
}
