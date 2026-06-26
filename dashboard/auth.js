// Logika Login Dashboard
document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('loginForm');
  const loginBtn = document.getElementById('loginBtn');
  const loginError = document.getElementById('loginError');
  const errorMessage = document.getElementById('errorMessage');

  // Cek jika sudah login
  checkSession();

  async function checkSession() {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      redirectByRole(session.user);
    }
  }

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    // UI state
    loginBtn.innerHTML = '<i class="bi bi-arrow-repeat spin"></i> Loading...';
    loginBtn.disabled = true;
    loginError.classList.remove('show');

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
      });

      if (error) throw error;

      redirectByRole(data.user);

    } catch (error) {
      errorMessage.textContent = error.message === 'Invalid login credentials' 
        ? 'Email atau password salah.' 
        : error.message;
      loginError.classList.add('show');
    } finally {
      loginBtn.innerHTML = 'Masuk <i class="bi bi-box-arrow-in-right"></i>';
      loginBtn.disabled = false;
    }
  });

  function redirectByRole(user) {
    const role = user.user_metadata?.role || 'admin';
    if (role === 'checkin') {
      window.location.href = 'checkin.html';
    } else {
      window.location.href = 'app.html';
    }
  }
});
