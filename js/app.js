/* ═══════════════════════════════════════════════════════════
   VSTEP Writing B2 — Application Logic
   ═══════════════════════════════════════════════════════════ */

// ─── STATE ───────────────────────────────────────────────────────────────────
let currentPart = parseInt(localStorage.getItem('vstep_current_part') || '1');
let currentEssay = null;
let timerInterval = null;
let timerSeconds = currentPart === 1 ? 20 * 60 : 40 * 60;
let timerRunning = false;
let savedScores = JSON.parse(localStorage.getItem('vstep_scores') || '{}');
let savedDrafts = JSON.parse(localStorage.getItem('vstep_drafts') || '{}');
let currentSample = 'b2';

// State for B2 sample recall & fill-in practice
let practiceSentences = [];
let activePracticeIdx = null;
let hiddenPracticeIndices = new Set();

function getActiveEssays() {
  return currentPart === 1 ? ESSAYS_PART1 : ESSAYS;
}

function getActiveCategories() {
  if (currentPart === 1) {
    return [
      { key: 'request', label: 'Thư Yêu Cầu & Hỏi Thông Tin', icon: '❓' },
      { key: 'invitation', label: 'Thư Mời & Phản Hồi', icon: '✉️' },
      { key: 'thanks_apology', label: 'Thư Cảm Ơn & Xin Lỗi', icon: '🙏' },
      { key: 'advice_suggest', label: 'Thư Khuyên Nhủ & Gợi Ý', icon: '💡' },
      { key: 'complaint', label: 'Thư Khiếu Nại', icon: '📢' },
      { key: 'apply_permit', label: 'Thư Xin Việc & Xin Nghỉ', icon: '📝' }
    ];
  } else {
    return [
      { key: 'adv', label: 'Advantages & Disadvantages', icon: '⚖️' },
      { key: 'opinion', label: 'Opinion Essays', icon: '💭' },
      { key: 'discussion', label: 'Discussion Essays', icon: '🗣️' },
      { key: 'problem', label: 'Problem-Solution Essays', icon: '🔧' }
    ];
  }
}

function getEssayKey(essay) {
  if (essay.part === 1) {
    return `p1_${essay.id}`;
  }
  return essay.id;
}

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
  
  // Notify the iframe to keep themes in sync
  const iframe = document.getElementById('trainer-iframe');
  if (iframe && iframe.contentWindow) {
    try {
      iframe.contentWindow.document.documentElement.setAttribute('data-theme', next);
      if (typeof iframe.contentWindow.onThemeChange === 'function') {
        iframe.contentWindow.onThemeChange(next);
      }
    } catch (e) {
      console.warn('Could not sync theme with iframe', e);
    }
  }
}

function updateThemeIcon(theme) {
  const btn = document.getElementById('theme-toggle');
  if (btn) btn.textContent = theme === 'dark' ? '☀️' : '🌙';
}

// ─── SIDEBAR TOGGLE & NAVIGATION ──────────────────────────────────────────────
function toggleSidebar() {
  if (window.innerWidth <= 768) {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    sidebar.classList.toggle('open');
    overlay.classList.toggle('active');
  } else {
    const isCollapsed = document.body.classList.toggle('sidebar-collapsed');
    localStorage.setItem('vstep_sidebar_collapsed', isCollapsed ? 'true' : 'false');
  }
}

function closeMobileMenu() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebar-overlay').classList.remove('active');
}

function initSidebarState() {
  const isCollapsed = localStorage.getItem('vstep_sidebar_collapsed') === 'true';
  if (isCollapsed && window.innerWidth > 768) {
    document.body.classList.add('sidebar-collapsed');
  }
}

// ─── INIT ────────────────────────────────────────────────────────────────────
function init() {
  initTheme();
  initSidebarState();
  
  // Set up router
  window.addEventListener('hashchange', handleRouting);
  
  // If no hash, set initial hash from localStorage
  if (!window.location.hash) {
    const savedPart = localStorage.getItem('vstep_current_part') || '2';
    window.location.hash = `#/part/${savedPart}`;
  } else {
    handleRouting();
  }
}

function handleRouting() {
  const hash = window.location.hash || '';
  
  if (!hash || hash === '#/' || hash === '#/home') {
    const savedPart = localStorage.getItem('vstep_current_part') || '2';
    window.location.hash = `#/part/${savedPart}`;
    return;
  }
  
  const partMatch = hash.match(/^#\/part\/(\d+)(?:\/(.*))?$/);
  if (partMatch) {
    const partNum = parseInt(partMatch[1], 10);
    const subType = partMatch[2]; // e.g. 'discussion' for Part 3
    
    currentPart = partNum;
    localStorage.setItem('vstep_current_part', currentPart);
    syncPartSelectors();
    showHome();
    
    if (partNum === 3 && subType) {
      const iframe = document.getElementById('trainer-iframe');
      if (iframe) {
        const targetSrc = `template_writing/ielts-pattern-trainer.html?type=${subType}`;
        const currentSrc = iframe.getAttribute('src');
        if (!currentSrc || !currentSrc.includes(`type=${subType}`)) {
          iframe.setAttribute('src', targetSrc);
        } else {
          try {
            if (iframe.contentWindow && typeof iframe.contentWindow.selectEssayType === 'function') {
              iframe.contentWindow.selectEssayType(subType);
            }
          } catch(e){}
        }
      }
    }
    return;
  }
  
  const essayMatch = hash.match(/^#\/essay\/p(\d)\/(\d+)$/);
  if (essayMatch) {
    const partNum = parseInt(essayMatch[1], 10);
    const essayId = parseInt(essayMatch[2], 10);
    
    if (currentPart !== partNum) {
      currentPart = partNum;
      localStorage.setItem('vstep_current_part', currentPart);
      syncPartSelectors();
    }
    
    const list = partNum === 1 ? ESSAYS_PART1 : ESSAYS;
    const essay = list.find(e => e.id === essayId);
    if (essay) {
      openEssay(essay);
    } else {
      window.location.hash = '#/';
    }
    return;
  }
}

function openPatternForCurrentEssay() {
  if (!currentEssay) return;
  const map = {
    adv: 'advantages-disadvantages',
    discussion: 'discussion',
    opinion: 'opinion',
    problem: 'problem-solution'
  };
  const typeKey = map[currentEssay.type];
  if (typeKey) {
    window.location.hash = `#/part/3/${typeKey}`;
  } else {
    window.location.hash = `#/part/3`;
  }
}

// Collapsible header feature disabled

function syncPartSelectors() {
  // Sidebar
  document.querySelectorAll('.sb-part-btn').forEach(btn => btn.classList.remove('active'));
  const activeSbBtn = document.getElementById(`sb-part${currentPart}-btn`);
  if (activeSbBtn) activeSbBtn.classList.add('active');

  // Home Page
  document.querySelectorAll('.part-selector-btn').forEach(btn => btn.classList.remove('active'));
  const activeHomeBtn = document.getElementById(`home-part${currentPart}-btn`);
  if (activeHomeBtn) activeHomeBtn.classList.add('active');
  
  // Update titles in Home view
  const titleEl = document.getElementById('grid-section-title');
  if (titleEl) {
    titleEl.textContent = currentPart === 1 ? 'Tất cả đề thi viết thư (Part 1)' : 'Tất cả đề thi viết luận (Part 2)';
  }

  // Update Hero content dynamically
  const heroTitle = document.getElementById('hero-title');
  const heroDesc = document.getElementById('hero-desc');
  if (heroTitle && heroDesc) {
    if (currentPart === 1) {
      heroTitle.textContent = 'Luyện Viết Thư VSTEP';
      heroDesc.textContent = '30 đề thi viết thư mẫu · Bài mẫu B1 & B2 · Bản dịch tiếng Việt chi tiết · 20 phút / 120+ từ';
    } else if (currentPart === 2) {
      heroTitle.textContent = 'Luyện Viết Luận VSTEP B2';
      heroDesc.textContent = '30 đề thi mẫu chất lượng cao · Bài mẫu B1 & B2 · Từ vựng nâng cao · Bản dịch tiếng Việt chi tiết · 40 phút / 250+ từ';
    }
  }

  // Update document title
  if (currentPart === 1) {
    document.title = 'VSTEP Writing Part 1 — Luyện Viết Thư';
  } else if (currentPart === 2) {
    document.title = 'VSTEP Writing B2 — Nền Tảng Luyện Viết Luận Số 1';
  } else if (currentPart === 3) {
    document.title = 'Sổ tay mẫu câu VSTEP/IELTS';
  }
}

function switchPart(partNum) {
  window.location.hash = `#/part/${partNum}`;
}

// ─── SIDEBAR ─────────────────────────────────────────────────────────────────
function buildSidebar(filter = '') {
  const categories = getActiveCategories();
  const essaysList = getActiveEssays();

  const container = document.getElementById('sidebar-list');
  container.innerHTML = '';

  categories.forEach(cat => {
    const items = essaysList.filter(e =>
      e.type === cat.key &&
      (!filter || e.title.toLowerCase().includes(filter.toLowerCase()) ||
       e.typeLabel.toLowerCase().includes(filter.toLowerCase()))
    );

    if (items.length === 0) return;

    const grp = document.createElement('div');
    grp.className = 'category-group';
    grp.innerHTML = `<div class="category-header"><span class="cat-icon">${cat.icon}</span> ${cat.label}</div>`;

    items.forEach(essay => {
      const key = getEssayKey(essay);
      const done = savedScores[key] || savedDrafts[key];
      const btn = document.createElement('button');
      btn.className = `essay-item ${currentEssay?.id === essay.id && currentEssay?.part === essay.part ? 'active' : ''} ${done ? 'done' : ''}`;
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

  const badgeMap = {
    adv: 'badge-adv', opinion: 'badge-opinion', discussion: 'badge-discussion', problem: 'badge-problem',
    request: 'badge-request', invitation: 'badge-invitation', thanks_apology: 'badge-thanks',
    advice_suggest: 'badge-advice', complaint: 'badge-complaint', apply_permit: 'badge-apply'
  };

  const essaysList = getActiveEssays();

  essaysList.forEach(essay => {
    const key = getEssayKey(essay);
    const score = savedScores[key] || 0;
    const hasDraft = !!savedDrafts[key];
    const isCompleted = score > 0 || hasDraft;

    const card = document.createElement('div');
    card.className = `essay-card ${isCompleted ? 'done' : ''}`;
    card.innerHTML = `
      <div class="essay-card-top">
        <div class="essay-card-num">${String(essay.id).padStart(2, '0')}</div>
        <span class="essay-card-type ${badgeMap[essay.type]}">${essay.typeLabel}</span>
      </div>
      <div class="essay-card-title">${essay.title}</div>
      ${score > 0 ? `<div class="essay-card-score">Điểm: ${score}/10</div>` : hasDraft ? `<div class="essay-card-score" style="color:var(--success)">Đã lưu nháp</div>` : ''}`;
    card.onclick = () => openEssay(essay);
    container.appendChild(card);
  });
}

// ─── NAVIGATION ──────────────────────────────────────────────────────────────
function showHome() {
  if (currentPart === 3) {
    document.getElementById('home-view').style.display = 'none';
    document.getElementById('essay-view').style.display = 'none';
    document.getElementById('trainer-view').style.display = 'block';
    currentEssay = null;
    stopTimer();
    const container = document.getElementById('sidebar-list');
    if (container) {
      container.innerHTML = `<div style="padding:20px; text-align:center; color:var(--ink-muted); font-size:13px; line-height:1.6;">
        Đang xem: <strong>Sổ tay mẫu câu</strong>.<br>Chọn Part 1 hoặc Part 2 để xem đề thi và luyện viết.
      </div>`;
    }
    return;
  }

  document.getElementById('home-view').style.display = 'block';
  document.getElementById('essay-view').style.display = 'none';
  document.getElementById('trainer-view').style.display = 'none';
  currentEssay = null;
  stopTimer();
  buildSidebar();
  buildEssayGrid();
  updateStats();
}

function openEssay(essay) {
  const targetHash = `#/essay/p${essay.part}/${essay.id}`;
  if (window.location.hash !== targetHash) {
    window.location.hash = targetHash;
    return;
  }

  currentEssay = essay;
  closeTranslationSheet();

  document.getElementById('home-view').style.display = 'none';
  document.getElementById('essay-view').style.display = 'block';
  document.getElementById('trainer-view').style.display = 'none';

  // Badge
  const badgeMap = {
    adv: 'badge-adv', opinion: 'badge-opinion', discussion: 'badge-discussion', problem: 'badge-problem',
    request: 'badge-request', invitation: 'badge-invitation', thanks_apology: 'badge-thanks',
    advice_suggest: 'badge-advice', complaint: 'badge-complaint', apply_permit: 'badge-apply'
  };
  const badge = document.getElementById('essay-badge');
  badge.textContent = essay.typeLabel;
  badge.className = `topic-badge ${badgeMap[essay.type]}`;

  // Hide or show Outline/Vocab/Pattern tabs based on availability
  const hasOutlineAndVocab = essay.part !== 1;
  document.getElementById('tab-btn-outline').style.display = hasOutlineAndVocab ? 'inline-block' : 'none';
  document.getElementById('tab-btn-vocab').style.display = hasOutlineAndVocab ? 'inline-block' : 'none';
  document.getElementById('tab-btn-pattern').style.display = hasOutlineAndVocab ? 'inline-block' : 'none';

  // Set minimum word limit label
  const targetWords = essay.part === 1 ? 120 : 250;
  document.getElementById('word-target-label').textContent = `Tối thiểu ${targetWords} từ`;

  // Prompt
  document.getElementById('prompt-context').textContent = essay.context;
  document.getElementById('prompt-task').textContent = essay.task;
  const hints = document.getElementById('prompt-hints');
  hints.innerHTML = essay.hints.map(h => `<span class="hint-chip">📌 ${h}</span>`).join('');

  // Outline
  const outline = essay.outline;
  if (outline) {
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
  } else {
    document.getElementById('outline-content').innerHTML = '';
  }

  // Vocab
  const vg = document.getElementById('vocab-content');
  if (essay.vocab) {
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
  } else {
    vg.innerHTML = '';
  }

  // Load saved draft
  const essayKey = getEssayKey(essay);
  const draft = savedDrafts[essayKey] || '';
  document.getElementById('my-essay').value = draft;
  updateWordCount();

  // Reset feedback
  document.getElementById('feedback-content').innerHTML = `
    <div class="empty-feedback">
      <div class="icon">📝</div>
      <p>Viết bài xong và bấm <strong>"💾 Lưu nháp"</strong> để lưu tiến độ</p>
    </div>`;

  // Initialize practice tab content for this essay
  initPracticeMode();

  // Show B2 sample by default
  showSample('b2');
  switchTab('write');
  resetTimer();
  buildSidebar();
}

// ─── TABS ────────────────────────────────────────────────────────────────────
function switchTab(name) {
  document.querySelectorAll('.tabs button').forEach(btn => {
    const isTarget = btn.getAttribute('onclick')?.includes(`'${name}'`);
    btn.classList.toggle('active', !!isTarget);
  });
  document.querySelectorAll('.tab-panel').forEach(p => {
    p.classList.toggle('active', p.id === `tab-${name}`);
  });
  closeTranslationSheet();
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
  
  const targetWords = (currentEssay && currentEssay.part === 1) ? 120 : 250;
  const warnThreshold = (currentEssay && currentEssay.part === 1) ? 100 : 200;

  el.className = `word-counter ${count >= targetWords ? 'good' : count >= warnThreshold ? 'warn' : ''}`;

  // Word progress bar
  const barFill = document.getElementById('word-bar-fill');
  if (barFill) {
    const pct = Math.min(count / targetWords * 100, 100);
    barFill.style.width = pct + '%';
    barFill.className = `word-bar-fill ${count >= targetWords ? 'good' : count >= warnThreshold ? 'warn' : ''}`;
  }
}

// ─── TIMER ───────────────────────────────────────────────────────────────────
function resetTimer() {
  stopTimer();
  timerSeconds = (currentEssay && currentEssay.part === 1) ? 20 * 60 : 40 * 60;
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
  const key = getEssayKey(currentEssay);
  savedDrafts[key] = text;
  localStorage.setItem('vstep_drafts', JSON.stringify(savedDrafts));

  // Mark as done
  savedScores[key] = savedScores[key] || 0;
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
  const essaysList = getActiveEssays();
  
  // Calculate completed count based on active essays only
  const done = essaysList.filter(e => {
    const key = getEssayKey(e);
    return savedScores[key] > 0 || savedDrafts[key];
  }).length;

  // Average score of current part
  const partScores = essaysList.map(e => savedScores[getEssayKey(e)] || 0).filter(s => s > 0);
  const avg = partScores.length ? (partScores.reduce((a, b) => a + b, 0) / partScores.length).toFixed(1) : '—';

  document.getElementById('stat-done').textContent = done;
  document.getElementById('stat-avg').textContent = avg;
  document.getElementById('hdr-done').textContent = done;
  document.getElementById('hdr-avg').textContent = avg;

  const pct = (done / essaysList.length * 100).toFixed(0);
  document.getElementById('main-progress').style.width = pct + '%';
  document.getElementById('progress-text').textContent = `${done} / ${essaysList.length} bài`;

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

// ─── SENTENCE CLICK (MOBILE TRANSLATION BOTTOM SHEET) ────────────────────────
document.addEventListener('click', (e) => {
  const sv = e.target.closest('.sv');
  if (sv) {
    // Check if we are on a mobile viewport (or narrow screen <= 768px)
    if (window.innerWidth <= 768) {
      // Remove previous active highlights
      document.querySelectorAll('.sv').forEach(el => el.classList.remove('active-sentence'));
      
      // Find the sentence class (e.g. s-1, s-2) and highlight all elements of this sentence
      const sClass = Array.from(sv.classList).find(c => c.startsWith('s-'));
      if (sClass) {
        document.querySelectorAll('.' + sClass).forEach(el => el.classList.add('active-sentence'));
      }
      
      // Get the original English text and the Vietnamese translation
      const originalText = getFullSentenceText(sv);
      const translatedText = sv.getAttribute('data-vi') || '';
      
      showTranslationSheet(originalText, translatedText);
    }
  }
});

// Helper to reconstruct the full sentence text from the clicked span and its siblings with the same sentence class
function getFullSentenceText(clickedEl) {
  const sClass = Array.from(clickedEl.classList).find(c => c.startsWith('s-'));
  if (!sClass) return clickedEl.textContent.trim();
  
  // Find all parts of the sentence in the document and join them
  const parts = Array.from(document.querySelectorAll('.' + sClass));
  return parts.map(el => el.textContent).join('').replace(/\s+/g, ' ').trim();
}

function showTranslationSheet(original, translated) {
  const sheet = document.getElementById('translation-sheet');
  const origEl = document.getElementById('translation-original');
  const transEl = document.getElementById('translation-translated');
  
  if (!sheet || !origEl || !transEl) return;
  
  origEl.textContent = original;
  transEl.textContent = translated;
  
  sheet.classList.add('open');
}

function closeTranslationSheet() {
  const sheet = document.getElementById('translation-sheet');
  if (sheet) {
    sheet.classList.remove('open');
  }
  // Remove all active highlights
  document.querySelectorAll('.sv').forEach(el => el.classList.remove('active-sentence'));
}

// Close bottom sheet on Escape key press
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeTranslationSheet();
  }
});

// ─── SENTENCE PRACTICE FEATURE ────────────────────────────────────────────────
function initPracticeMode() {
  if (!currentEssay) return;
  
  // 1. Get raw text and translation arrays for B2
  const rawContent = currentEssay.b2Sample || "";
  const translations = currentEssay.b2Trans || [];
  
  // 2. Clear state
  practiceSentences = [];
  activePracticeIdx = null;
  hiddenPracticeIndices.clear();
  
  // Strip any (388 words) suffix if present at the end of rawContent
  const cleanContent = rawContent.replace(/\(\d+\s+words\)\s*$/, "").trim();
  
  // 3. Parse content into paragraphs and sentences
  // We want to keep the paragraph structure so we split by \n\n
  const paragraphs = cleanContent.split(/\n\n+/);
  const sentenceRegex = /[^.!?]+(?:[.!?]+(?=\s|$)|$)/g;
  
  let globalSentIdx = 0;
  
  const parsedParagraphs = paragraphs.map((paraText) => {
    // Strip HTML marks from sample for sentence extraction
    const cleanParaText = paraText.replace(/<\/?[^>]+(>|$)/g, "").trim();
    const sentences = [];
    let match;
    while ((match = sentenceRegex.exec(cleanParaText)) !== null) {
      const sText = match[0].trim();
      if (sText) {
        sentences.push(sText);
      }
    }
    return sentences;
  });
  
  // Flatten sentences list and map with translation
  const allSentences = [];
  parsedParagraphs.forEach((paraSentences, pIdx) => {
    paraSentences.forEach((sentText) => {
      // Find translation corresponding to this index
      const transText = translations[globalSentIdx] || "";
      allSentences.push({
        index: globalSentIdx,
        text: sentText,
        translation: transText,
        paragraphIdx: pIdx,
        userInput: "",
        checked: false,
        score: 0,
        showHint: false,
        showAnswer: false,
        diffHTMLUser: "",
        diffHTMLTarget: ""
      });
      globalSentIdx++;
    });
  });
  
  practiceSentences = allSentences;
  
  // 4. Decide which indices to hide based on percentage
  const hideSelect = document.getElementById('practice-hide-select');
  const hideRatio = hideSelect ? parseFloat(hideSelect.value) : 0.5;
  const totalSents = practiceSentences.length;
  
  if (hideRatio >= 1.0) {
    // Hide all sentences
    for (let i = 0; i < totalSents; i++) {
      hiddenPracticeIndices.add(i);
    }
  } else {
    // Hide random sentences based on ratio
    const countToHide = Math.max(1, Math.round(totalSents * hideRatio));
    const indices = Array.from({ length: totalSents }, (_, i) => i);
    // Shuffle indices
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    // Take the first countToHide
    for (let i = 0; i < countToHide; i++) {
      hiddenPracticeIndices.add(indices[i]);
    }
  }
  
  // 5. Render elements
  renderPracticeEssay(parsedParagraphs);
  renderPracticeCards();
  updatePracticeProgress();
}

function renderPracticeEssay(parsedParagraphs) {
  const paper = document.getElementById('practice-essay-text');
  if (!paper) return;
  paper.innerHTML = "";
  
  let globalSentIdx = 0;
  
  parsedParagraphs.forEach((paraSentences, pIdx) => {
    const pEl = document.createElement('p');
    
    paraSentences.forEach((sentText) => {
      const isHidden = hiddenPracticeIndices.has(globalSentIdx);
      const sentObj = practiceSentences[globalSentIdx];
      
      if (isHidden) {
        // Render inline blank pill button
        const blankBtn = document.createElement('button');
        blankBtn.className = `practice-blank-btn ${globalSentIdx === activePracticeIdx ? 'active' : ''} ${sentObj.checked && sentObj.score >= 85 ? 'correct' : ''}`;
        blankBtn.id = `practice-blank-${globalSentIdx}`;
        // If checked, show score, else show generic placeholder
        if (sentObj.checked) {
          blankBtn.textContent = `✏️ Câu ${globalSentIdx + 1} (${sentObj.score}%)`;
        } else {
          blankBtn.textContent = `✏️ Câu ${globalSentIdx + 1}: Điền câu`;
        }
        
        const idx = globalSentIdx;
        blankBtn.onclick = (e) => {
          e.preventDefault();
          focusPracticeCard(idx);
        };
        pEl.appendChild(blankBtn);
        // Add a space after the inline button
        pEl.appendChild(document.createTextNode(" "));
      } else {
        // Render normal text
        const textSpan = document.createElement('span');
        textSpan.textContent = sentText + " ";
        pEl.appendChild(textSpan);
      }
      globalSentIdx++;
    });
    
    paper.appendChild(pEl);
  });
}

function renderPracticeCards() {
  const listEl = document.getElementById('practice-cards-list');
  if (!listEl) return;
  listEl.innerHTML = "";
  
  let hasBlanks = false;
  
  practiceSentences.forEach((sentObj) => {
    if (!hiddenPracticeIndices.has(sentObj.index)) return;
    hasBlanks = true;
    
    const card = document.createElement('div');
    card.className = `practice-card ${sentObj.index === activePracticeIdx ? 'active' : ''}`;
    card.id = `practice-card-${sentObj.index}`;
    
    // Status text
    let statusText = "Chưa làm";
    let statusColor = "var(--ink-muted)";
    if (sentObj.checked) {
      statusText = `Đã kiểm tra (${sentObj.score}%)`;
      statusColor = sentObj.score >= 85 ? "var(--success)" : sentObj.score >= 50 ? "var(--primary)" : "var(--danger)";
    }
    
    // Generate First Letter Hint
    const letterHint = generateFirstLetterHint(sentObj.text);
    
    card.innerHTML = `
      <div class="practice-card-header">
        <h5>Câu ${sentObj.index + 1} (Đoạn ${sentObj.paragraphIdx + 1})</h5>
        <span class="practice-card-status" style="color: ${statusColor}">${statusText}</span>
      </div>
      
      <div class="practice-card-prompt">
        ${sentObj.translation || "Chưa có bản dịch cho câu này."}
      </div>
      
      ${sentObj.showHint ? `
        <div class="practice-card-hint-text" title="Gợi ý chữ cái đầu">
          💡 ${letterHint}
        </div>
      ` : ""}
      
      <textarea class="practice-card-input" 
        placeholder="Gợi ý: Viết lại câu bằng tiếng Anh..."
        id="practice-input-${sentObj.index}"
        oninput="practiceSentences[${sentObj.index}].userInput = this.value">${sentObj.userInput}</textarea>
        
      <div class="practice-card-actions">
        <button class="practice-card-btn btn-check" onclick="checkPracticeSentence(${sentObj.index})">Kiểm tra</button>
        <button class="practice-card-btn" onclick="togglePracticeHint(${sentObj.index})">${sentObj.showHint ? "Ẩn gợi ý" : "Gợi ý"}</button>
        <button class="practice-card-btn" onclick="showPracticeAnswer(${sentObj.index})">Đáp án mẫu</button>
      </div>
      
      ${sentObj.checked ? `
        <div class="practice-card-feedback">
          <div class="feedback-score-row">
            <span>Đoạn văn của bạn:</span>
            <span class="score-val ${sentObj.score >= 85 ? 'perfect' : sentObj.score >= 50 ? 'good' : 'poor'}">${sentObj.score}% khớp</span>
          </div>
          
          <div class="feedback-section-title">Bài làm của bạn</div>
          <div class="feedback-diff-block">
            ${sentObj.diffHTMLUser}
          </div>
          
          <div class="feedback-section-title">Đáp án mẫu B2</div>
          <div class="feedback-diff-block">
            ${sentObj.diffHTMLTarget}
          </div>
        </div>
      ` : ""}
    `;
    
    // Scroll trigger click handler to focus on blank
    card.addEventListener('click', () => {
      setActivePracticeBlank(sentObj.index);
    });
    
    listEl.appendChild(card);
  });
  
  if (!hasBlanks) {
    listEl.innerHTML = `
      <div class="empty-feedback">
        <div class="icon">✨</div>
        <p>Không có câu nào bị ẩn. Hãy điều chỉnh tỷ lệ ẩn câu ở trên.</p>
      </div>
    `;
  }
}

function setActivePracticeBlank(index) {
  activePracticeIdx = index;
  // Highlight pill in essay
  document.querySelectorAll('.practice-blank-btn').forEach(btn => {
    btn.classList.toggle('active', btn.id === `practice-blank-${index}`);
  });
  // Highlight card in list
  document.querySelectorAll('.practice-card').forEach(card => {
    card.classList.toggle('active', card.id === `practice-card-${index}`);
  });
}

function focusPracticeCard(index) {
  setActivePracticeBlank(index);
  
  // Scroll to active card
  const card = document.getElementById(`practice-card-${index}`);
  if (card) {
    card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

function togglePracticeHint(index) {
  const sentObj = practiceSentences[index];
  if (!sentObj) return;
  sentObj.showHint = !sentObj.showHint;
  renderPracticeCards();
}

function showPracticeAnswer(index) {
  const sentObj = practiceSentences[index];
  if (!sentObj) return;
  
  // Fill the input with correct answer (strip HTML class tags for user display)
  const cleanTarget = sentObj.text.replace(/<\/?[^>]+(>|$)/g, "");
  sentObj.userInput = cleanTarget;
  sentObj.showAnswer = true;
  
  // Set the text in the textarea DOM element if it is visible
  const inputEl = document.getElementById(`practice-input-${index}`);
  if (inputEl) {
    inputEl.value = cleanTarget;
  }
  
  // Perform check automatically to show comparison
  checkPracticeSentence(index);
}

function checkPracticeSentence(index) {
  const sentObj = practiceSentences[index];
  if (!sentObj) return;
  
  // Make sure we read the latest text input value from DOM
  const inputEl = document.getElementById(`practice-input-${index}`);
  if (inputEl) {
    sentObj.userInput = inputEl.value;
  }
  
  const inputVal = sentObj.userInput || "";
  
  // Compute LCS diff
  const diffResult = getWordDiffHTML(inputVal, sentObj.text);
  
  sentObj.checked = true;
  sentObj.score = diffResult.score;
  sentObj.diffHTMLUser = diffResult.userHTML;
  sentObj.diffHTMLTarget = diffResult.targetHTML;
  
  // Re-render
  const hideSelect = document.getElementById('practice-hide-select');
  const hideRatio = hideSelect ? parseFloat(hideSelect.value) : 0.5;
  const rawContent = currentEssay.b2Sample || "";
  const cleanContent = rawContent.replace(/\(\d+\s+words\)\s*$/, "").trim();
  const paragraphs = cleanContent.split(/\n\n+/);
  const sentenceRegex = /[^.!?]+(?:[.!?]+(?=\s|$)|$)/g;
  const parsedParagraphs = paragraphs.map(p => {
    const cleanP = p.replace(/<\/?[^>]+(>|$)/g, "").trim();
    const sents = [];
    let match;
    while ((match = sentenceRegex.exec(cleanP)) !== null) {
      if (match[0].trim()) sents.push(match[0].trim());
    }
    return sents;
  });
  
  renderPracticeEssay(parsedParagraphs);
  renderPracticeCards();
  updatePracticeProgress();
  
  // Refocus the card if it was active
  setActivePracticeBlank(index);
}

function updatePracticeProgress() {
  let hiddenCount = 0;
  let correctCount = 0;
  
  practiceSentences.forEach((sentObj) => {
    if (hiddenPracticeIndices.has(sentObj.index)) {
      hiddenCount++;
      if (sentObj.checked && sentObj.score >= 85) {
        correctCount++;
      }
    }
  });
  
  const fill = document.getElementById('practice-progress-fill');
  const text = document.getElementById('practice-progress-text');
  
  if (fill && text) {
    const pct = hiddenCount > 0 ? Math.round((correctCount / hiddenCount) * 100) : 0;
    fill.style.width = `${pct}%`;
    text.textContent = `Đã hoàn thành (độ khớp >= 85%): ${correctCount} / ${hiddenCount} câu (${pct}%)`;
  }
}

function generateFirstLetterHint(sentence) {
  // Strip HTML tags if any
  const clean = sentence.replace(/<\/?[^>]+(>|$)/g, "");
  // Replace alphanumeric characters after their first letter with underscores
  return clean.split(/\s+/).map(word => {
    if (word.length <= 1) return word;
    // Handle punctuation at the end of the word
    const match = word.match(/^([a-zA-Z0-9'-]+)([^a-zA-Z0-9'-]*)$/);
    if (match) {
      const core = match[1];
      const punc = match[2];
      if (core.length <= 1) return word;
      return core[0] + '_'.repeat(core.length - 1) + punc;
    }
    return word;
  }).join(' ');
}

function getWordDiffHTML(userVal, targetVal) {
  // Strip HTML tags from target
  const cleanTarget = targetVal.replace(/<\/?[^>]+(>|$)/g, "");
  
  // Split by whitespace
  const userWords = userVal.trim().split(/\s+/).filter(w => w);
  const targetWords = cleanTarget.trim().split(/\s+/).filter(w => w);
  
  const m = userWords.length;
  const n = targetWords.length;
  
  if (m === 0) {
    return {
      score: 0,
      userHTML: `<span style="color:var(--ink-muted); font-style:italic;">Trống</span>`,
      targetHTML: targetWords.map(word => `<span class="diff-missing">${word}</span>`).join(' ')
    };
  }
  
  // LCS Table
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const w1 = userWords[i-1].toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g,"");
      const w2 = targetWords[j-1].toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g,"");
      if (w1 === w2) {
        dp[i][j] = dp[i-1][j-1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i-1][j], dp[i][j-1]);
      }
    }
  }
  
  // Backtrack to find matched indices
  let i = m, j = n;
  const userMatched = new Set();
  const targetMatched = new Set();
  
  while (i > 0 && j > 0) {
    const w1 = userWords[i-1].toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g,"");
    const w2 = targetWords[j-1].toLowerCase().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g,"");
    if (w1 === w2) {
      userMatched.add(i - 1);
      targetMatched.add(j - 1);
      i--;
      j--;
    } else if (dp[i-1][j] >= dp[i][j-1]) {
      i--;
    } else {
      j--;
    }
  }
  
  // Render user words
  let userHTML = userWords.map((word, idx) => {
    if (userMatched.has(idx)) {
      return `<span class="diff-match">${word}</span>`;
    } else {
      return `<span class="diff-mismatch">${word}</span>`;
    }
  }).join(' ');
  
  // Render target words
  let targetHTML = targetWords.map((word, idx) => {
    if (targetMatched.has(idx)) {
      return `<span>${word}</span>`;
    } else {
      return `<span class="diff-missing">${word}</span>`;
    }
  }).join(' ');
  
  const score = Math.max(0, Math.min(100, Math.round((dp[m][n] / Math.max(1, n)) * 100)));
  
  return {
    score,
    userHTML,
    targetHTML
  };
}

// ─── BOOT ────────────────────────────────────────────────────────────────────
init();
