/* ═══════════════════════════════════════════════════════════
   VSTEP Writing B2 — Application Logic
   ═══════════════════════════════════════════════════════════ */

// ─── STATE ───────────────────────────────────────────────────────────────────
let currentEssay = null;
let timerInterval = null;
let timerSeconds = 40 * 60;
let timerRunning = false;
let savedScores = JSON.parse(localStorage.getItem('vstep_scores') || '{}');
let savedDrafts = JSON.parse(localStorage.getItem('vstep_drafts') || '{}');
let currentSample = 'b2';

// ─── THEME ───────────────────────────────────────────────────────────────────
function initTheme() {
  const saved = localStorage.getItem('vstep_theme') || 'light';
  document.documentElement.setAttribute('data-theme', saved);
  updateThemeIcon(saved);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('vstep_theme', next);
  updateThemeIcon(next);
}

function updateThemeIcon(theme) {
  const btn = document.getElementById('theme-toggle');
  if (btn) btn.textContent = theme === 'dark' ? '☀️' : '🌙';
}

// ─── MOBILE MENU ─────────────────────────────────────────────────────────────
function toggleMobileMenu() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  sidebar.classList.toggle('open');
  overlay.classList.toggle('active');
}

function closeMobileMenu() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebar-overlay').classList.remove('active');
}

// ─── INIT ────────────────────────────────────────────────────────────────────
function init() {
  initTheme();
  buildSidebar();
  buildEssayGrid();
  updateStats();
}

// ─── SIDEBAR ─────────────────────────────────────────────────────────────────
function buildSidebar(filter = '') {
  const categories = [
    { key: 'adv', label: 'Advantages & Disadvantages', icon: '⚖️' },
    { key: 'opinion', label: 'Opinion Essays', icon: '💭' },
    { key: 'discussion', label: 'Discussion Essays', icon: '🗣️' },
    { key: 'problem', label: 'Problem-Solution Essays', icon: '🔧' }
  ];

  const container = document.getElementById('sidebar-list');
  container.innerHTML = '';

  categories.forEach(cat => {
    const items = ESSAYS.filter(e =>
      e.type === cat.key &&
      (!filter || e.title.toLowerCase().includes(filter.toLowerCase()) ||
       e.typeLabel.toLowerCase().includes(filter.toLowerCase()))
    );

    if (items.length === 0) return;

    const grp = document.createElement('div');
    grp.className = 'category-group';
    grp.innerHTML = `<div class="category-header"><span class="cat-icon">${cat.icon}</span> ${cat.label}</div>`;

    items.forEach(essay => {
      const btn = document.createElement('button');
      const done = savedScores[essay.id];
      btn.className = `essay-item ${currentEssay?.id === essay.id ? 'active' : ''} ${done ? 'done' : ''}`;
      btn.innerHTML = `
        <div class="essay-num">${String(essay.id).padStart(2, '0')}</div>
        <div class="essay-meta">
          <div class="essay-title">${essay.title}</div>
          <div class="essay-type">${essay.typeLabel}</div>
        </div>
        <div class="done-dot"></div>`;
      btn.onclick = () => { openEssay(essay); closeMobileMenu(); };
      grp.appendChild(btn);
    });

    container.appendChild(grp);
  });
}

function filterEssays(val) { buildSidebar(val); }

// ─── ESSAY GRID (HOME) ───────────────────────────────────────────────────────
function buildEssayGrid() {
  const container = document.getElementById('essay-grid');
  container.innerHTML = '';

  const badgeMap = { adv: 'badge-adv', opinion: 'badge-opinion', discussion: 'badge-discussion', problem: 'badge-problem' };

  ESSAYS.forEach(essay => {
    const done = savedScores[essay.id];
    const card = document.createElement('div');
    card.className = `essay-card ${done ? 'done' : ''}`;
    card.innerHTML = `
      <div class="essay-card-top">
        <div class="essay-card-num">${String(essay.id).padStart(2, '0')}</div>
        <span class="essay-card-type ${badgeMap[essay.type]}">${essay.typeLabel}</span>
      </div>
      <div class="essay-card-title">${essay.title}</div>
      ${done ? `<div class="essay-card-score">Điểm: ${done}/10</div>` : ''}`;
    card.onclick = () => openEssay(essay);
    container.appendChild(card);
  });
}

// ─── NAVIGATION ──────────────────────────────────────────────────────────────
function showHome() {
  document.getElementById('home-view').style.display = 'block';
  document.getElementById('essay-view').style.display = 'none';
  currentEssay = null;
  stopTimer();
  buildSidebar();
  buildEssayGrid();
  updateStats();
}

function openEssay(essay) {
  currentEssay = essay;

  document.getElementById('home-view').style.display = 'none';
  document.getElementById('essay-view').style.display = 'block';

  // Badge
  const badgeMap = { adv: 'badge-adv', opinion: 'badge-opinion', discussion: 'badge-discussion', problem: 'badge-problem' };
  const badge = document.getElementById('essay-badge');
  badge.textContent = essay.typeLabel;
  badge.className = `topic-badge ${badgeMap[essay.type]}`;

  // Prompt
  document.getElementById('prompt-context').textContent = essay.context;
  document.getElementById('prompt-task').textContent = essay.task;
  const hints = document.getElementById('prompt-hints');
  hints.innerHTML = essay.hints.map(h => `<span class="hint-chip">📌 ${h}</span>`).join('');

  // Outline
  const outline = essay.outline;
  document.getElementById('outline-content').innerHTML = `
    <div class="outline-section">
      <div class="outline-label label-intro"><span class="label-dot"></span>MỞ BÀI (Introduction)</div>
      <div class="outline-content">${outline.intro}</div>
    </div>
    <div class="outline-section">
      <div class="outline-label label-body"><span class="label-dot"></span>THÂN BÀI (Body Paragraphs)</div>
      <div class="outline-content"><ul>${outline.body.map(b => `<li>${b}</li>`).join('')}</ul></div>
    </div>
    <div class="outline-section">
      <div class="outline-label label-conc"><span class="label-dot"></span>KẾT BÀI (Conclusion)</div>
      <div class="outline-content">${outline.conc}</div>
    </div>`;

  // Vocab
  const vg = document.getElementById('vocab-content');
  vg.innerHTML = Object.entries(essay.vocab).map(([section, pairs]) => `
    <div class="vocab-section">
      <h4>${section}</h4>
      ${pairs.map(([b1, b1vi, b2, b2vi]) => `
        <div class="vocab-pair">
          <div class="vp-b1" ${b1vi ? `data-vi="🇻🇳 ${b1vi}"` : ''}>${b1}</div>
          <div class="vp-arrow">→</div>
          <div class="vp-b2" ${b2vi ? `data-vi="🇻🇳 ${b2vi}"` : ''}>${b2}</div>
        </div>`).join('')}
    </div>`).join('');

  // Load saved draft
  const draft = savedDrafts[essay.id] || '';
  document.getElementById('my-essay').value = draft;
  updateWordCount();

  // Reset feedback
  document.getElementById('feedback-content').innerHTML = `
    <div class="empty-feedback">
      <div class="icon">📝</div>
      <p>Viết bài xong và bấm <strong>"💾 Lưu nháp"</strong> để lưu tiến độ</p>
    </div>`;

  // Show B2 sample by default
  showSample('b2');
  switchTab('write');
  resetTimer();
  buildSidebar();
}

// ─── TABS ────────────────────────────────────────────────────────────────────
function switchTab(name) {
  const tabNames = ['write', 'outline', 'vocab', 'sample', 'feedback'];
  document.querySelectorAll('.tab').forEach((t, i) => {
    t.classList.toggle('active', tabNames[i] === name);
  });
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.getElementById(`tab-${name}`).classList.add('active');
}

// ─── SAMPLE ──────────────────────────────────────────────────────────────────
function showSample(level) {
  currentSample = level;
  document.getElementById('sample-b1-btn').className = `sample-btn b1 ${level === 'b1' ? 'active' : ''}`;
  document.getElementById('sample-b2-btn').className = `sample-btn b2 ${level === 'b2' ? 'active' : ''}`;

  const rawContent = level === 'b1' ? currentEssay.b1Sample : currentEssay.b2Sample;
  const transArr = level === 'b1' ? (currentEssay.b1Trans || []) : (currentEssay.b2Trans || []);

  const container = document.getElementById('sample-content');
  container.innerHTML = rawContent.split('\n\n').map(p => `<p style="margin-bottom:1em;">${p}</p>`).join('');

  if (transArr.length > 0) {
    wrapSentencesWithTooltipsDOM(container, transArr);
  }

  setTimeout(() => fixTooltipEdges(), 50);
}

function wrapSentencesWithTooltipsDOM(container, translations) {
  let transIdx = 0;
  Array.from(container.querySelectorAll('p')).forEach(p => {
    transIdx = wrapSentencesInElement(p, translations, transIdx);
  });
}

function wrapSentencesInElement(el, translations, startTransIdx) {
  const map = [];
  function traverse(n) {
    if (n.nodeType === Node.TEXT_NODE) {
      const text = n.nodeValue;
      for (let i = 0; i < text.length; i++) {
        map.push({ node: n, offset: i, char: text[i] });
      }
    } else {
      for (let i = 0; i < n.childNodes.length; i++) {
        traverse(n.childNodes[i]);
      }
    }
  }
  traverse(el);

  const plainText = map.map(x => x.char).join('');
  const sentences = [];
  const sentenceRegex = /[^.!?]+(?:[.!?]+(?=\s|$)|$)/g;
  let match;
  while ((match = sentenceRegex.exec(plainText)) !== null) {
    let sText = match[0];
    let sStart = match.index;
    let sEnd = sStart + sText.length;
    while (sStart < sEnd && /\s/.test(plainText[sStart])) sStart++;
    while (sEnd > sStart && /\s/.test(plainText[sEnd - 1])) sEnd--;
    if (sStart < sEnd) sentences.push({ start: sStart, end: sEnd });
  }

  const segments = [];
  let transIdx = startTransIdx;

  sentences.forEach((s) => {
    if (transIdx >= translations.length) return;
    const vi = translations[transIdx++];
    let currentSegment = null;
    for (let k = s.start; k < s.end; k++) {
      const charMap = map[k];
      if (!currentSegment || currentSegment.node !== charMap.node) {
        if (currentSegment) segments.push(currentSegment);
        currentSegment = {
          node: charMap.node,
          startOffset: charMap.offset,
          endOffset: charMap.offset + 1,
          vi: vi,
          sentIdx: transIdx
        };
      } else {
        currentSegment.endOffset = charMap.offset + 1;
      }
    }
    if (currentSegment) segments.push(currentSegment);
  });

  for (let m = segments.length - 1; m >= 0; m--) {
    const seg = segments[m];
    const node = seg.node;
    const suffixNode = node.splitText(seg.endOffset);
    const middleNode = node.splitText(seg.startOffset);
    const span = document.createElement('span');
    span.className = `sv s-${seg.sentIdx}`;
    const safeVi = seg.vi.replace(/"/g, '&quot;');
    span.setAttribute('data-vi', safeVi);
    middleNode.parentNode.insertBefore(span, middleNode);
    span.appendChild(middleNode);
  }

  return transIdx;
}

function fixTooltipEdges() {
  const container = document.getElementById('sample-content');
  if (!container) return;
  const cRect = container.getBoundingClientRect();
  container.querySelectorAll('.sv').forEach(el => {
    const rect = el.getBoundingClientRect();
    if (rect.right > cRect.right - 200) el.classList.add('flip-left');
    else el.classList.remove('flip-left');
  });
}

// ─── WORD COUNT ──────────────────────────────────────────────────────────────
function updateWordCount() {
  const text = document.getElementById('my-essay').value.trim();
  const count = text ? text.split(/\s+/).filter(w => w).length : 0;
  const el = document.getElementById('word-counter');
  const span = el.querySelector('.wc-num');
  span.textContent = count;
  el.className = `word-counter ${count >= 250 ? 'good' : count >= 200 ? 'warn' : ''}`;

  // Word progress bar
  const barFill = document.getElementById('word-bar-fill');
  if (barFill) {
    const pct = Math.min(count / 250 * 100, 100);
    barFill.style.width = pct + '%';
    barFill.className = `word-bar-fill ${count >= 250 ? 'good' : count >= 200 ? 'warn' : ''}`;
  }
}

// ─── TIMER ───────────────────────────────────────────────────────────────────
function resetTimer() {
  stopTimer();
  timerSeconds = 40 * 60;
  timerRunning = false;
  document.getElementById('timer-btn').textContent = 'Bắt đầu';
  updateTimerDisplay();
}

function toggleTimer() {
  if (timerRunning) {
    stopTimer();
    document.getElementById('timer-btn').textContent = 'Tiếp tục';
  } else {
    startTimer();
    document.getElementById('timer-btn').textContent = 'Tạm dừng';
  }
}

function startTimer() {
  timerRunning = true;
  timerInterval = setInterval(() => {
    timerSeconds--;
    updateTimerDisplay();
    if (timerSeconds <= 0) {
      stopTimer();
      showToast('⏰ Hết giờ! Hãy hoàn thiện bài viết.');
    }
  }, 1000);
}

function stopTimer() {
  clearInterval(timerInterval);
  timerRunning = false;
}

function updateTimerDisplay() {
  const m = Math.floor(timerSeconds / 60);
  const s = timerSeconds % 60;
  const display = document.getElementById('timer-display');
  display.textContent = `⏱ ${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  display.className = `timer-box${timerSeconds < 300 ? ' danger' : timerSeconds < 600 ? ' warn' : ''}`;
}

// ─── SAVE / CLEAR ────────────────────────────────────────────────────────────
function saveProgress() {
  if (!currentEssay) return;
  const text = document.getElementById('my-essay').value;
  savedDrafts[currentEssay.id] = text;
  localStorage.setItem('vstep_drafts', JSON.stringify(savedDrafts));

  // Mark as done
  savedScores[currentEssay.id] = savedScores[currentEssay.id] || 0;
  localStorage.setItem('vstep_scores', JSON.stringify(savedScores));

  showToast('✅ Đã lưu nháp!');
  updateStats();
  buildSidebar();
}

function clearEssay() {
  if (confirm('Xóa toàn bộ bài viết?')) {
    document.getElementById('my-essay').value = '';
    updateWordCount();
  }
}

// ─── STATS ───────────────────────────────────────────────────────────────────
function updateStats() {
  const done = Object.keys(savedScores).filter(k => savedScores[k] > 0 || savedDrafts[k]).length;
  const realScores = Object.values(savedScores).filter(s => s > 0);
  const avg = realScores.length ? (realScores.reduce((a, b) => a + b, 0) / realScores.length).toFixed(1) : '—';

  document.getElementById('stat-done').textContent = done;
  document.getElementById('stat-avg').textContent = avg;
  document.getElementById('hdr-done').textContent = done;
  document.getElementById('hdr-avg').textContent = avg;

  const pct = (done / ESSAYS.length * 100).toFixed(0);
  document.getElementById('main-progress').style.width = pct + '%';
  document.getElementById('progress-text').textContent = `${done} / ${ESSAYS.length} bài`;

  // Streak
  const today = new Date().toDateString();
  const last = localStorage.getItem('vstep_last_day');
  let streak = parseInt(localStorage.getItem('vstep_streak') || '0');
  if (last !== today) {
    streak = last === new Date(Date.now() - 86400000).toDateString() ? streak + 1 : 1;
    localStorage.setItem('vstep_streak', streak);
    localStorage.setItem('vstep_last_day', today);
  }
  document.getElementById('stat-streak').textContent = streak;
}

// ─── TOAST ───────────────────────────────────────────────────────────────────
function showToast(msg) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}

// ─── SENTENCE HOVER SYNC ─────────────────────────────────────────────────────
document.addEventListener('mouseover', (e) => {
  const sv = e.target.closest('.sv');
  if (sv) {
    const sClass = Array.from(sv.classList).find(c => c.startsWith('s-'));
    if (sClass) document.querySelectorAll('.' + sClass).forEach(el => el.classList.add('hovered'));
  }
});
document.addEventListener('mouseout', (e) => {
  const sv = e.target.closest('.sv');
  if (sv) {
    const sClass = Array.from(sv.classList).find(c => c.startsWith('s-'));
    if (sClass) document.querySelectorAll('.' + sClass).forEach(el => el.classList.remove('hovered'));
  }
});

// ─── BOOT ────────────────────────────────────────────────────────────────────
init();
