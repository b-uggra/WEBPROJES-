// --- STATE MANAGEMENT ---
const root = document.getElementById('root');
let users       = JSON.parse(localStorage.getItem('users'))       || [];
let votes       = JSON.parse(localStorage.getItem('votes'))       || {};
let polls       = JSON.parse(localStorage.getItem('polls'))       || Array.from({ length: 10 }, (_, i) => ({
  id: i + 1,
  question: `Anket ${i + 1} sorusu`,
  options: ['Seçenek A','Seçenek B','Seçenek C','Seçenek D']
}));
let currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;

// Save state to localStorage
function saveState() {
  localStorage.setItem('users', JSON.stringify(users));
  localStorage.setItem('votes', JSON.stringify(votes));
  localStorage.setItem('polls', JSON.stringify(polls));
  localStorage.setItem('currentUser', JSON.stringify(currentUser));
}

// --- INIT APP ---
function initApp() {
  document.getElementById('logout-btn').style.display = currentUser ? 'inline-block' : 'none';
  if (!currentUser) {
    // Eğer hiç kullanıcı yoksa kayıt formu, varsa login formu
    if (users.length === 0) renderRegisterView();
    else renderLoginView();
  } else {
    renderPollListView();
  }
}
window.addEventListener('DOMContentLoaded', initApp);
document.getElementById('brand-link').addEventListener('click', e => {
  e.preventDefault();
  initApp();
});
document.getElementById('logout-btn').addEventListener('click', () => {
  currentUser = null;
  saveState();
  initApp();
});

// --- REGISTER VIEW ---
function renderRegisterView() {
  root.innerHTML = `
    <h3>Kayıt Ol</h3>
    <form id="register-form">
      <div class="mb-3">
        <label>Kullanıcı Adı</label>
        <input type="text" class="form-control" id="reg-username" required>
      </div>
      <div class="mb-3">
        <label>E-posta</label>
        <input type="email" class="form-control" id="reg-email" required>
      </div>
      <div class="mb-3">
        <label>Şifre</label>
        <input type="password" class="form-control" id="reg-password" required>
      </div>
      <button class="btn btn-primary">Kayıt Ol</button>
      <p class="mt-3">Zaten üye misiniz? <a href="#" id="login-link">Giriş Yap</a></p>
    </form>
  `;
  document.getElementById('register-form').addEventListener('submit', e => {
    e.preventDefault();
    const u = document.getElementById('reg-username').value.trim();
    const em = document.getElementById('reg-email').value.trim();
    const p = document.getElementById('reg-password').value;
    if (users.some(x => x.username === u)) {
      alert('Bu kullanıcı adı zaten alınmış.');
      return;
    }
    users.push({ username: u, email: em, password: p });
    currentUser = { username: u };
    saveState();
    renderPollListView();
  });
  document.getElementById('login-link').addEventListener('click', e => {
    e.preventDefault();
    renderLoginView();
  });
}

// --- LOGIN VIEW ---
function renderLoginView() {
  root.innerHTML = `
    <h3>Giriş Yap</h3>
    <form id="login-form">
      <div class="mb-3">
        <label>Kullanıcı Adı</label>
        <input type="text" class="form-control" id="login-username" required>
      </div>
      <div class="mb-3">
        <label>Şifre</label>
        <input type="password" class="form-control" id="login-password" required>
      </div>
      <button class="btn btn-success">Giriş Yap</button>
      <p class="mt-3">Hesabınız yok mu? <a href="#" id="register-link">Kayıt Ol</a></p>
    </form>
  `;
  document.getElementById('login-form').addEventListener('submit', e => {
    e.preventDefault();
    const u = document.getElementById('login-username').value.trim();
    const p = document.getElementById('login-password').value;
    const user = users.find(x => x.username === u && x.password === p);
    if (!user) {
      alert('Kullanıcı adı veya şifre hatalı.');
      return;
    }
    currentUser = { username: u };
    saveState();
    renderPollListView();
  });
  document.getElementById('register-link').addEventListener('click', e => {
    e.preventDefault();
    renderRegisterView();
  });
}

// --- POLL LIST VIEW ---
function renderPollListView() {
  document.getElementById('logout-btn').style.display = 'inline-block';
  let html = `
    <h3>Anket Listesi</h3>
    <button class="btn btn-sm btn-success mb-3" onclick="renderAddPollView()">Anket Ekle</button>
    <ul class="list-group">
  `;
  polls.forEach(p => {
    html += `
      <li class="list-group-item d-flex justify-content-between align-items-center">
        ${p.question}
        <div>
          <button class="btn btn-sm btn-primary me-2" onclick="renderPollView(${p.id})">Oy Ver</button>
          <button class="btn btn-sm btn-danger" onclick="handleDeletePoll(${p.id})">Sil</button>
        </div>
      </li>`;
  });
  html += `</ul>`;
  root.innerHTML = html;
}

// --- POLL VIEW ---
function renderPollView(id) {
  const poll = polls.find(p => p.id === id);
  let html = `<h4>${poll.question}</h4><form id="vote-form">`;
  poll.options.forEach((opt, i) => {
    html += `
      <div class="form-check">
        <input class="form-check-input" type="radio" name="option" id="opt${i}" value="${i}" required>
        <label class="form-check-label" for="opt${i}">${opt}</label>
      </div>`;
  });
  html += `</form>
    <button class="btn btn-success mt-3" onclick="submitVote(${id})">Oyumu Gönder</button>
    <button class="btn btn-link mt-2" onclick="renderPollListView()">Anasayfaya Dön</button>`;
  root.innerHTML = html;
}

// --- SUBMIT VOTE ---
function submitVote(id) {
  votes[id] = votes[id] || [];
  if (votes[id].some(v => v.user === currentUser.username)) {
    alert('Bu ankete zaten oy kullandınız.');
    return;
  }
  const choice = document.querySelector('input[name="option"]:checked').value;
  votes[id].push({ user: currentUser.username, option: Number(choice) });
  saveState();
  renderResultsView(id);
}

// --- RESULTS VIEW ---
function renderResultsView(id) {
  const poll = polls.find(p => p.id === id);
  const counts = poll.options.map((_, i) => votes[id] ? votes[id].filter(v => v.option === i).length : 0);
  let html = `<h4>${poll.question} - Sonuçlar</h4><ul class="list-group">`;
  poll.options.forEach((opt, i) => {
    html += `
      <li class="list-group-item d-flex justify-content-between">
        ${opt}
        <span class="badge bg-primary rounded-pill">${counts[i]}</span>
      </li>`;
  });
  html += `</ul><button class="btn btn-link mt-3" onclick="renderPollListView()">Anasayfaya Dön</button>`;
  root.innerHTML = html;
}

// --- ADD POLL VIEW ---
function renderAddPollView() {
  root.innerHTML = `
    <h3>Yeni Anket Oluştur</h3>
    <form id="add-poll-form">
      <div class="mb-3">
        <label>Soru</label>
        <input type="text" class="form-control" id="poll-question" required>
      </div>
      <div id="options-container">
        <div class="mb-3">
          <label>Seçenek 1</label>
          <input type="text" class="form-control option-input" required>
        </div>
        <div class="mb-3">
          <label>Seçenek 2</label>
          <input type="text" class="form-control option-input" required>
        </div>
      </div>
      <button type="button" class="btn btn-link" id="add-option-btn">Seçenek Ekle</button><br>
      <button class="btn btn-primary mt-3">Oluştur</button>
      <button class="btn btn-secondary mt-3 ms-2" onclick="renderPollListView()">İptal</button>
    </form>
  `;
  document.getElementById('add-option-btn').addEventListener('click', () => {
    const container = document.getElementById('options-container');
    const idx = container.querySelectorAll('.option-input').length + 1;
    const div = document.createElement('div');
    div.className = 'mb-3';
    div.innerHTML = `
      <label>Seçenek ${idx}</label>
      <input type="text" class="form-control option-input" required>
    `;
    container.appendChild(div);
  });
  document.getElementById('add-poll-form').addEventListener('submit', e => {
    e.preventDefault();
    const question = document.getElementById('poll-question').value.trim();
    const options = Array.from(document.querySelectorAll('.option-input')).map(i => i.value.trim()).filter(v => v);
    if (options.length < 2) {
      alert('En az 2 seçenek girin.');
      return;
    }
    const newId = polls.length ? Math.max(...polls.map(p => p.id)) + 1 : 1;
    polls.push({ id: newId, question, options });
    saveState();
    renderPollListView();
  });
}

// --- DELETE POLL ---
function handleDeletePoll(id) {
  if (!confirm('Bu anketi silmek istediğine emin misin?')) return;
  polls = polls.filter(p => p.id !== id);
  delete votes[id];
  saveState();
  renderPollListView();
}