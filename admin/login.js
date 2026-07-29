const form = document.getElementById('loginForm');
const errorMessage = document.getElementById('errorMessage');
const loginBtn = document.getElementById('loginBtn');

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  errorMessage.classList.remove('visible');
  loginBtn.disabled = true;
  loginBtn.textContent = 'Logging in…';

  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: document.getElementById('username').value,
        password: document.getElementById('password').value,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      errorMessage.textContent = data.error || 'Login failed.';
      errorMessage.classList.add('visible');
      return;
    }
    window.location.href = 'dashboard.html';
  } catch (err) {
    errorMessage.textContent = 'Could not reach the admin server. Is it running?';
    errorMessage.classList.add('visible');
  } finally {
    loginBtn.disabled = false;
    loginBtn.textContent = 'Log In';
  }
});
