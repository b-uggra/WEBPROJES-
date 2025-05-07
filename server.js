const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs').promises;
const session = require('express-session');

const app = express();

app.use(express.static('public'));
app.use(bodyParser.json());
app.use(session({
  secret: 'gizliAnahtar',
  resave: false,
  saveUninitialized: true
}));

// Oturum kontrolü
app.get('/api/session', (req, res) => {
  res.json({ user: req.session.user || null });
});

// Kullanıcı kaydı
app.post('/api/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    let users = [];
    try {
      users = JSON.parse(await fs.readFile('./data/users.json', 'utf8'));
    } catch (err) {
      if (err.code !== 'ENOENT') throw err;
    }
    if (users.find(u => u.email === email)) {
      return res.status(400).send('Bu e-posta zaten kayıtlı');
    }
    users.push({ name, email, password, votes: [] });
    await fs.writeFile('./data/users.json', JSON.stringify(users, null, 2));
    req.session.user = { name, email, votes: [] };
    res.sendStatus(201);
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).send('Kayıt başarısız');
  }
});

// Kullanıcı girişi
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    let users = [];
    try {
      users = JSON.parse(await fs.readFile('./data/users.json', 'utf8'));
    } catch (err) {
      if (err.code !== 'ENOENT') throw err;
    }
    const user = users.find(u => u.email === email && u.password === password);
    if (!user) return res.status(401).send('Geçersiz e-posta veya şifre');
    req.session.user = { name: user.name, email: user.email, votes: user.votes || [] };
    res.sendStatus(200);
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).send('Giriş başarısız');
  }
});

// Oy gönderme
app.post('/api/vote/:pollId', async (req, res) => {
  if (!req.session.user) {
    return res.status(401).send('Giriş gerekli');
  }
  const pollId = req.params.pollId;
  const optionIndex = req.body.optionIndex;
  try {
    const votesData = JSON.parse(await fs.readFile('./data/votes.json', 'utf8'));
    const users = JSON.parse(await fs.readFile('./data/users.json', 'utf8'));
    const idx = users.findIndex(u => u.email === req.session.user.email);
    if (idx === -1) return res.status(401).send('Geçersiz kullanıcı');
    const user = users[idx];
    user.votes = user.votes || [];
    if (user.votes.includes(pollId)) {
      return res.status(403).send('Bu anket için zaten oy kullandınız');
    }
    votesData[pollId][optionIndex]++;
    await fs.writeFile('./data/votes.json', JSON.stringify(votesData, null, 2));
    user.votes.push(pollId);
    users[idx] = user;
    await fs.writeFile('./data/users.json', JSON.stringify(users, null, 2));
    req.session.user.votes = user.votes;
    res.sendStatus(201);
  } catch (err) {
    console.error('Vote error:', err);
    res.status(500).send('Oy gönderme hatası');
  }
});

// Tüm anketleri getir
app.get('/api/polls', async (req, res) => {
  try {
    const polls = JSON.parse(await fs.readFile('./data/polls.json', 'utf8'));
    res.json(polls);
  } catch (err) {
    res.status(500).send('Sunucu hatası');
  }
});

// Belirli anketi getir
app.get('/api/poll/:pollId', async (req, res) => {
  try {
    const polls = JSON.parse(await fs.readFile('./data/polls.json', 'utf8'));
    const poll = polls.find(p => p.id === req.params.pollId);
    if (!poll) return res.status(404).send('Anket bulunamadı');
    res.json(poll);
  } catch (err) {
    res.status(500).send('Sunucu hatası');
  }
});

// Anket sonuçlarını getir
app.get('/api/results/:pollId', async (req, res) => {
  try {
    const votes = JSON.parse(await fs.readFile('./data/votes.json', 'utf8'));
    res.json({ counts: votes[req.params.pollId] });
  } catch (err) {
    res.status(500).send('Sunucu hatası');
  }
});

// Yeni anket oluştur
app.post('/api/polls', async (req, res) => {
  try {
    const { question, options } = req.body;
    // Poll verisini oku
    let polls = [];
    try {
      polls = JSON.parse(await fs.readFile('./data/polls.json', 'utf8'));
    } catch (err) {
      if (err.code !== 'ENOENT') throw err;
    }
    // Yeni poll ID'si
    const newId = polls.length ? Math.max(...polls.map(p => Number(p.id))) + 1 : 1;
    const newPoll = { id: String(newId), question, options };
    polls.push(newPoll);
    // Kaydet
    await fs.writeFile('./data/polls.json', JSON.stringify(polls, null, 2));
    // Oy sayacı kaydet (başlangıç 0)
    let votesData = {};
    try {
      votesData = JSON.parse(await fs.readFile('./data/votes.json', 'utf8'));
    } catch (err) {
      if (err.code !== 'ENOENT') throw err;
    }
    votesData[newId] = options.map(_ => 0);
    await fs.writeFile('./data/votes.json', JSON.stringify(votesData, null, 2));
    res.status(201).json(newPoll);
  } catch (err) {
    console.error('Create poll error:', err);
    res.status(500).send('Anket oluşturma hatası');
  }
});

// Anket sil
app.delete('/api/polls/:pollId', async (req, res) => {
  try {
    const pollId = req.params.pollId;
    // Poll verisini oku
    let polls = JSON.parse(await fs.readFile('./data/polls.json', 'utf8'));
    polls = polls.filter(p => p.id !== pollId);
    await fs.writeFile('./data/polls.json', JSON.stringify(polls, null, 2));
    // Oy verilerini de güncelle
    let votesData = JSON.parse(await fs.readFile('./data/votes.json', 'utf8'));
    delete votesData[pollId];
    await fs.writeFile('./data/votes.json', JSON.stringify(votesData, null, 2));
    // Kullanıcı oy kayıtlarından temizle
    let users = JSON.parse(await fs.readFile('./data/users.json', 'utf8'));
    users = users.map(u => {
      u.votes = (u.votes || []).filter(v => v !== pollId);
      return u;
    });
    await fs.writeFile('./data/users.json', JSON.stringify(users, null, 2));
    res.sendStatus(204);
  } catch (err) {
    console.error('Delete poll error:', err);
    res.status(500).send('Anket silme hatası');
  }
});

// Çıkış yap
app.post('/api/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) return res.status(500).send('Çıkış hatası');
    res.sendStatus(200);
  });
});

app.listen(3000, () => {
  console.log('Server is running on port 3000');
});
