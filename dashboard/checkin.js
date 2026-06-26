// Logika Scanner Check-in
let html5QrcodeScanner;
let scannedGuest = null;

document.addEventListener('DOMContentLoaded', async () => {
  // Cek Auth
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    window.location.href = 'index.html';
    return;
  }

  document.getElementById('btnLogout').addEventListener('click', async () => {
    await supabase.auth.signOut();
    window.location.href = 'index.html';
  });

  // Init Scanner
  html5QrcodeScanner = new Html5Qrcode("qr-reader");
  
  startScanner();

  // Manual Check-in
  document.getElementById('btnManualCheckin').addEventListener('click', () => {
    const token = document.getElementById('manualToken').value.trim();
    if (token) processQR(token);
  });

  // Buttons in Result
  document.getElementById('btnScanAgain').addEventListener('click', () => {
    resetScanner();
  });

  document.getElementById('btnConfirmCheckin').addEventListener('click', async () => {
    if (!scannedGuest) return;
    
    const btn = document.getElementById('btnConfirmCheckin');
    btn.disabled = true;
    btn.innerHTML = '<i class="bi bi-arrow-repeat spin"></i> Processing...';

    try {
      const { error } = await supabase
        .from('guests')
        .update({ checked_in: true, checked_in_at: new Date().toISOString() })
        .eq('id', scannedGuest.id);

      if (error) throw error;
      
      showResultUi(scannedGuest.name, scannedGuest.group_name, 'success', 'Check-in Berhasil!');
      playSound('success');
      btn.style.display = 'none';

    } catch (err) {
      showToast('Gagal update database: ' + err.message, 'error');
      playSound('error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<i class="bi bi-check-circle"></i> Konfirmasi Hadir';
    }
  });
});

function startScanner() {
  document.getElementById('scanner-container').style.display = 'block';
  document.getElementById('scanResult').style.display = 'none';
  document.getElementById('manualToken').value = '';

  html5QrcodeScanner.start(
    { facingMode: "environment" }, 
    { fps: 10, qrbox: { width: 250, height: 250 } },
    (decodedText) => {
      // Pause scanner
      html5QrcodeScanner.stop().then(() => {
        processQR(decodedText);
      });
    },
    (errorMessage) => {
      // ignore empty scans
    }
  ).catch(err => {
    console.error("Error starting scanner:", err);
    showToast('Kamera tidak dapat diakses', 'error');
  });
}

function resetScanner() {
  scannedGuest = null;
  startScanner();
}

async function processQR(token) {
  // Hide scanner, show loading
  document.getElementById('scanner-container').style.display = 'none';
  const resultCard = document.getElementById('scanResult');
  resultCard.style.display = 'flex';
  resultCard.className = 'scan-result';
  document.getElementById('resultIcon').className = 'bi bi-arrow-repeat spin scan-icon';
  document.getElementById('resultName').textContent = 'Mencari Data...';
  document.getElementById('resultGroup').textContent = 'Mohon tunggu';
  document.getElementById('btnConfirmCheckin').style.display = 'none';

  try {
    const { data, error } = await supabase
      .from('guests')
      .select('*')
      .eq('qr_token', token)
      .single();

    if (error || !data) {
      showResultUi('Tamu Tidak Ditemukan', 'QR Code tidak valid / tidak ada di database', 'error', 'Invalid');
      playSound('error');
      return;
    }

    scannedGuest = data;

    if (data.checked_in) {
      // Sudah check in sebelumnya
      const time = new Date(data.checked_in_at).toLocaleTimeString('id-ID');
      showResultUi(data.name, `${data.group_name} | Sesi: ${data.session}`, 'warn', `SUDAH CHECK-IN pada ${time}`);
      playSound('error'); // warn sound
    } else {
      // Belum check in, siap konfirmasi
      showResultUi(data.name, `${data.group_name} | Sesi: ${data.session}`, 'info', 'Siap Check-in');
      playSound('success');
      document.getElementById('btnConfirmCheckin').style.display = 'flex';
    }

  } catch (err) {
    showResultUi('Error', 'Gagal menghubungi server', 'error', 'Error');
    playSound('error');
  }
}

function showResultUi(name, desc, type, statusText) {
  const rc = document.getElementById('scanResult');
  rc.className = `scan-result ${type}`;
  
  const icon = document.getElementById('resultIcon');
  if (type === 'success') icon.className = 'bi bi-check-circle-fill scan-icon';
  else if (type === 'error') icon.className = 'bi bi-x-circle-fill scan-icon';
  else if (type === 'warn') icon.className = 'bi bi-exclamation-triangle-fill scan-icon';
  else icon.className = 'bi bi-person-bounding-box scan-icon';

  document.getElementById('resultName').textContent = name;
  document.getElementById('resultGroup').textContent = desc + (statusText ? ` — [${statusText}]` : '');
}

function playSound(type) {
  const au = document.getElementById(type === 'success' ? 'beepSuccess' : 'beepError');
  if (au) {
    au.currentTime = 0;
    au.play().catch(e => console.log('Audio play blocked by browser'));
  }
}

function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <i class="bi ${type === 'success' ? 'bi-check-circle-fill' : 'bi-exclamation-circle-fill'}"></i>
    <span>${message}</span>
  `;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}
