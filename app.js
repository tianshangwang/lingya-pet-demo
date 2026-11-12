const STORAGE_KEY = 'lingya-pet-v2';

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const introSection = $('#introSection');
const setupPanel = $('#setupPanel');
const petHome = $('#petHome');
const uploadZone = $('#uploadZone');
const petPhoto = $('#petPhoto');
const photoPicker = $('#photoPicker');
const photoPreview = $('#photoPreview');
const chatSheet = $('#chatSheet');
const chatBackdrop = $('#chatBackdrop');
const chatMessages = $('#chatMessages');
const modalBackdrop = $('#modalBackdrop');
const toast = $('#toast');
const bottomNav = $('#bottomNav');

let selectedMode = 'original';
let pendingPhoto = '';
let state = loadState();
let activeView = 'home';
let activeMemoryFilter = 'all';

function defaultState() {
  return {
    created: false,
    mode: 'original',
    petName: '绒芽',
    ownerName: '',
    species: '原创生命',
    trait: '温柔',
    habit: '',
    favorite: '',
    photo: '',
    day: 1,
    bond: 12,
    energy: 72,
    curiosity: 20,
    fidelity: 42,
    streak: 1,
    memories: [],
    messages: []
  };
}

function loadState() {
  try { return { ...defaultState(), ...JSON.parse(localStorage.getItem(STORAGE_KEY)) }; }
  catch { return defaultState(); }
}

function saveState() {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
  catch {
    state.photo = '';
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    notify('照片较大，已仅保存养成数据');
  }
}

function notify(text) {
  toast.textContent = text;
  toast.classList.add('show');
  clearTimeout(notify.timer);
  notify.timer = setTimeout(() => toast.classList.remove('show'), 1800);
}

function show(section) {
  [introSection, setupPanel, petHome].forEach(el => el.classList.add('hidden'));
  section.classList.remove('hidden');
  bottomNav.classList.toggle('hidden', section !== petHome);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function switchView(view) {
  activeView = view;
  $$('.app-view').forEach(panel => panel.classList.toggle('hidden', panel.dataset.view !== view));
  $$('#bottomNav button').forEach(button => button.classList.toggle('active', button.dataset.nav === view));
  if (view === 'memories') renderMemoryTimeline();
  if (view === 'identity') renderIdentityPage();
  if (view === 'profile') renderProfile();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

$$('#bottomNav button').forEach(button => button.addEventListener('click', () => switchView(button.dataset.nav)));
$$('[data-nav-target]').forEach(button => button.addEventListener('click', () => switchView(button.dataset.navTarget)));

function configureSetup(mode) {
  selectedMode = mode;
  const isReal = mode === 'real';
  uploadZone.classList.toggle('hidden', !isReal);
  $$('.real-only').forEach(el => el.classList.toggle('hidden', !isReal));
  $('#setupEyebrow').textContent = isReal ? '真实宠物 · AI数字分身' : '原创生命孵化';
  $('#setupTitle').textContent = isReal ? '先教AI认识它' : '给它一个开始';
  $('#setupDescription').textContent = isReal
    ? '外形只是第一步。它的性格、习惯和你们的故事，才决定数字世界里的它是谁。'
    : '三个答案会影响它最初的性格，但未来由你们共同书写。';
  $('#petName').placeholder = isReal ? '它平时的名字' : '例如：绒芽';
  $('#createButton').firstChild.textContent = isReal ? '生成它的数字分身 ' : '开始孵化 ';
  show(setupPanel);
}

$$('.mode-card').forEach(button => button.addEventListener('click', () => configureSetup(button.dataset.mode)));
$('#backButton').addEventListener('click', () => show(introSection));
$('#settingsButton').addEventListener('click', () => {
  if (!state.created) return notify('先创建一只宠物吧');
  if (confirm('要清除当前宠物并重新开始吗？')) {
    localStorage.removeItem(STORAGE_KEY);
    state = defaultState();
    location.reload();
  }
});

$('#photoPicker').addEventListener('click', () => petPhoto.click());
petPhoto.addEventListener('change', async () => {
  const file = petPhoto.files?.[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) return notify('请选择图片文件');
  pendingPhoto = await resizeImage(file, 720, .82);
  photoPreview.src = pendingPhoto;
  photoPicker.classList.add('has-image');
});

function resizeImage(file, maxSize, quality) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject;
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

$('#petForm').addEventListener('submit', (event) => {
  event.preventDefault();
  const petName = $('#petName').value.trim();
  const ownerName = $('#ownerName').value.trim();
  if (!petName || !ownerName) return notify('请先填写名字');
  if (selectedMode === 'real' && !pendingPhoto) return notify('请先上传宠物照片');

  state = {
    ...defaultState(),
    created: true,
    mode: selectedMode,
    petName,
    ownerName,
    species: selectedMode === 'real' ? $('#petSpecies').value : '原创生命',
    trait: document.querySelector('input[name="trait"]:checked').value,
    habit: selectedMode === 'real' ? ($('#petHabit').value.trim() || '还有待发现的独特习惯') : '',
    favorite: selectedMode === 'real' ? ($('#petFavorite').value.trim() || '最喜欢的东西还有待发现') : '',
    photo: selectedMode === 'real' ? pendingPhoto : '',
    fidelity: selectedMode === 'real' ? 42 : 20,
    memories: selectedMode === 'real'
      ? [`${petName}最重要的人叫${ownerName}`, `${petName}的习惯：${$('#petHabit').value.trim() || '等待主人补充'}`, `${petName}喜欢：${$('#petFavorite').value.trim() || '等待主人补充'}`]
      : [`我最重要的人叫${ownerName}`],
    messages: [{ role: 'pet', text: selectedMode === 'real'
      ? `${ownerName}，这是数字世界里的我。再多告诉我一些关于${petName}的事，我会越来越像它。`
      : `${ownerName}，谢谢你把我孵化出来。这个世界是什么样的？` }]
  };
  saveState();
  render();
  show(petHome);
  notify(selectedMode === 'real' ? '数字分身创建成功' : '一颗新生命已经孵化');
});

function getStage() {
  if (state.mode === 'real') {
    if (state.fidelity >= 75) return { num: 3, label: '高度还原' };
    if (state.fidelity >= 55) return { num: 2, label: '逐渐相似' };
    return { num: 1, label: '初识期' };
  }
  if (state.day >= 7) return { num: 3, label: '森灵期' };
  if (state.day >= 3) return { num: 2, label: '芽茸期' };
  return { num: 1, label: '初生期' };
}

function render() {
  if (!state.created) return show(introSection);
  const stage = getStage();
  const image = state.photo || 'assets/rongya.png';
  $('#petNameDisplay').textContent = state.petName;
  $('#stageName').textContent = stage.label;
  $('#dayLabel').textContent = `相遇第 ${state.day} 天`;
  $('#streakLabel').textContent = `连续陪伴 ${state.streak} 天`;
  $('#mainPetImage').src = image;
  $('#mainPetImage').alt = `${state.petName}的形象`;
  $('#chatPetName').textContent = state.petName;
  $('#petVisual').className = `pet-visual stage-${['one','two','three'][stage.num - 1]}${state.mode === 'real' ? ' user-photo' : ''}`;
  $('#bondValue').textContent = state.bond;
  $('#energyValue').textContent = state.energy;
  $('#identityMetricLabel').textContent = state.mode === 'real' ? '还原度' : '好奇';
  $('#identityMetricValue').textContent = state.mode === 'real' ? `${state.fidelity}%` : state.curiosity;
  $('#bondMeter').style.width = `${state.bond}%`;
  $('#energyMeter').style.width = `${state.energy}%`;
  $('#identityMetricMeter').style.width = `${state.mode === 'real' ? state.fidelity : state.curiosity}%`;
  $('#todayTitle').textContent = state.mode === 'real' ? '让AI更了解它' : '和它做点什么';
  $('#feedLabel').textContent = state.mode === 'real' ? '记饮食' : '投喂';
  $('#feedHint').textContent = state.mode === 'real' ? '还原度 +2' : '活力 +8';
  $('#playLabel').textContent = state.mode === 'real' ? '记互动' : '玩耍';
  $('#playHint').textContent = state.mode === 'real' ? '羁绊 +5' : '羁绊 +5';
  $('#exploreLabel').textContent = state.mode === 'real' ? '补特征' : '探索';
  $('#exploreHint').textContent = state.mode === 'real' ? '教AI认识它' : '好奇 +6';
  $('#identityCard').classList.toggle('hidden', state.mode !== 'real');
  renderIdentity();
  $('#moodBubble').textContent = moodLine();
  renderMemories();
  renderEvolution(stage);
  renderChat();
  show(petHome);
  switchView(activeView);
}

function moodLine() {
  if (state.energy < 30) return '今天有一点困，陪我安静待会儿吧。';
  if (state.bond > 70) return `${state.ownerName}，和你在一起的时候，我很安心。`;
  if (state.curiosity > 60) return '外面一定藏着没见过的新鲜事。';
  if (state.mode === 'real') return `我是${state.trait}的${state.petName}，还记得我喜欢${state.favorite}。`;
  return '今天也想多了解你一点。';
}

function renderIdentity() {
  $('#fidelityScore').textContent = `${state.fidelity}%`;
  $('.identity-score').style.background = `conic-gradient(var(--mint-dark) 0 ${state.fidelity}%, rgba(55,116,93,.15) ${state.fidelity}% 100%)`;
  const tags = [state.species, `${state.trait}型`, state.habit, state.favorite].filter(Boolean);
  $('#identityTags').innerHTML = tags.map(tag => `<span>${escapeHtml(tag)}</span>`).join('');
}

function renderMemories() {
  const items = state.memories.slice(-4).reverse();
  $('#memoryCount').textContent = `${state.memories.length} 条`;
  $('#memoryList').innerHTML = items.map((memory, i) => `<div class="memory-item"><i>${i ? '·' : '✦'}</i><span>${escapeHtml(memory)}</span></div>`).join('');
  $('#navMemoryDot').classList.toggle('hidden', state.memories.length === 0);
  renderMemoryTimeline();
}

function memoryType(memory) {
  return /故事|第\d+天|今天|有一次|主人补充|相遇/.test(memory) ? 'story' : 'trait';
}

function renderMemoryTimeline() {
  const list = state.memories
    .map((text, index) => ({ text, index, type: memoryType(text) }))
    .filter(item => activeMemoryFilter === 'all' || item.type === activeMemoryFilter)
    .reverse();
  $('#memoryTotalBadge').textContent = `${state.memories.length} 条`;
  $('#memoryTimeline').innerHTML = list.length ? list.map(item => `
    <article class="timeline-item">
      <div class="timeline-mark">${item.type === 'story' ? '◫' : '✦'}</div>
      <div class="timeline-content"><small>${item.type === 'story' ? '共同故事' : '性格习惯'} · DAY ${String(Math.max(1, state.day - Math.floor(item.index / 2))).padStart(2, '0')}</small><p>${escapeHtml(item.text)}</p></div>
    </article>`).join('') : '<div class="empty-state">这一类记忆还没有内容，去记录一个关于它的小故事吧。</div>';
}

$$('.memory-filter button').forEach(button => button.addEventListener('click', () => {
  activeMemoryFilter = button.dataset.memoryFilter;
  $$('.memory-filter button').forEach(item => item.classList.toggle('active', item === button));
  renderMemoryTimeline();
}));

$('#quickMemoryForm').addEventListener('submit', event => {
  event.preventDefault();
  const input = $('#quickMemoryInput');
  const text = input.value.trim();
  if (!text) return notify('先写下一段关于它的记忆');
  state.memories.push(`主人补充：${text.replace(/[。！!？?]$/, '')}`);
  state.fidelity = clamp(state.fidelity + (state.mode === 'real' ? 5 : 2));
  state.bond = clamp(state.bond + 3);
  input.value = '';
  saveState();
  renderMemories();
  renderIdentityPage();
  notify('这段记忆已经收进它的生命档案');
});

function renderIdentityPage() {
  const stage = getStage();
  const score = state.mode === 'real' ? state.fidelity : Math.min(100, 25 + state.day * 7 + state.memories.length * 3);
  const appearance = state.photo ? Math.min(92, 55 + state.memories.length * 2) : Math.min(85, 35 + state.day * 6);
  const personality = Math.min(100, score);
  const memoryScore = Math.min(100, 12 + state.memories.length * 9);
  const image = state.photo || 'assets/rongya.png';
  $('#identityStageBadge').textContent = stage.label;
  $('#identityPetImage').src = image;
  $('.identity-hero').classList.toggle('user-photo', state.mode === 'real');
  $('#identityPageScore').textContent = `${score}%`;
  $('#identitySummaryText').textContent = state.mode === 'real'
    ? `${state.petName}是一只${state.trait}的${state.species}。AI已经记住了它的习惯、喜好和${state.memories.length}段相关记忆。`
    : `${state.petName}是一只${state.trait}的原创生命，正在与你的陪伴中形成独特性格。`;
  const tags = state.mode === 'real' ? [state.species, `${state.trait}型`, state.habit, state.favorite] : ['原创生命', `${state.trait}型`, stage.label];
  $('#identityPageTags').innerHTML = tags.filter(Boolean).map(tag => `<span>${escapeHtml(tag)}</span>`).join('');
  setDimension('appearance', appearance);
  setDimension('personality', personality);
  setDimension('memory', memoryScore);
  const questions = state.mode === 'real' ? [
    `它开心的时候，最明显的动作是什么？`,
    `${state.petName}最害怕什么声音或场景？`,
    `只有你能看懂的一个小动作是什么？`,
    `它通常会怎样向你撒娇？`
  ] : [`如果${state.petName}能选择一个家，它会住在哪里？`, `${state.petName}最想和你一起完成什么？`];
  $('#trainingQuestion').textContent = questions[state.memories.length % questions.length];
}

function setDimension(name, value) {
  $(`#${name}Score`).textContent = `${value}%`;
  $(`#${name}Meter`).style.width = `${value}%`;
}

function renderProfile() {
  const image = state.photo || 'assets/rongya.png';
  $('#profilePetImage').src = image;
  $('#profilePetName').textContent = state.petName;
  $('#profilePetMeta').textContent = `${state.species} · ${state.trait}型 · ${getStage().label}`;
  $('#platformLabel').textContent = `${detectPlatform()}环境 · 生成平台分享文案`;
}

function detectPlatform() {
  const ua = navigator.userAgent.toLowerCase();
  if (/micromessenger/.test(ua)) return '微信';
  if (/aweme|douyin/.test(ua)) return '抖音';
  return '浏览器';
}

function renderEvolution(stage) {
  const title = $('#evolutionTitle');
  if (state.mode === 'real') {
    if (state.fidelity < 55) title.textContent = `再补充 ${55-state.fidelity}% 特征，进入「逐渐相似」`;
    else if (state.fidelity < 75) title.textContent = `再补充 ${75-state.fidelity}% 特征，达到「高度还原」`;
    else title.textContent = '数字世界里的它，正在形成稳定人格';
  } else if (state.day < 3) title.textContent = `距离「芽茸期」还有 ${3-state.day} 天`;
  else if (state.day < 7) title.textContent = `距离「森灵期」还有 ${7-state.day} 天`;
  else title.textContent = '它已经完成第一次完整进化';
  $('#evolutionCopy').textContent = state.mode === 'real'
    ? '每补充一段习惯、偏好或故事，AI都会更接近真实的它。'
    : '互动方式不同，未来还会长出不同的进化分支。';
  $$('.evolution-orbs i').forEach((orb, index) => orb.classList.toggle('active', index < stage.num));
}

$$('.action-grid button').forEach(button => button.addEventListener('click', () => doAction(button.dataset.action)));

function doAction(action) {
  if (state.mode === 'real' && action === 'explore') {
    $('#chatInput').placeholder = `告诉我${state.petName}还有什么独特习惯…`;
    openChat();
    return;
  }
  const actions = {
    feed: () => {
      state.energy = clamp(state.energy + 8);
      if (state.mode === 'real') state.fidelity = clamp(state.fidelity + 2);
      return state.mode === 'real' ? `记下了${state.petName}今天的饮食状态。` : `${state.petName}吃得很满足，活力恢复了。`;
    },
    play: () => {
      state.bond = clamp(state.bond + 5);
      state.energy = clamp(state.energy - 3);
      if (state.mode === 'real') state.fidelity = clamp(state.fidelity + 1);
      return state.mode === 'real' ? `记录了一次你和${state.petName}的互动。` : `${state.petName}围着你开心地转了一圈。`;
    },
    explore: () => { state.curiosity = clamp(state.curiosity + 6); state.energy = clamp(state.energy - 4); return `${state.petName}带回了一片发亮的小叶子。`; },
    talk: () => {
      $('#chatInput').placeholder = state.mode === 'real' ? `讲一段关于${state.petName}的故事…` : '告诉它你今天发生了什么…';
      openChat();
      return '';
    }
  };
  const text = actions[action]?.();
  if (!text) return;
  if (Math.random() > .65 && state.memories.length < 12) state.memories.push(`第${state.day}天，${text.replace(state.petName, '我')}`);
  saveState();
  render();
  notify(text);
}

function clamp(value) { return Math.max(0, Math.min(100, value)); }

$('#advanceDay').addEventListener('click', () => {
  const before = getStage().num;
  state.day += 1;
  state.streak += 1;
  state.energy = clamp(state.energy - 6);
  state.bond = clamp(state.bond + 3);
  if (state.mode === 'real') state.fidelity = clamp(state.fidelity + 4);
  const after = getStage().num;
  if (after > before) {
    state.memories.push(`第${state.day}天，我们一起进入了「${getStage().label}」`);
    notify(`${state.petName}发生了新的成长变化！`);
  } else notify(`来到相遇的第 ${state.day} 天`);
  saveState();
  render();
});

function openChat() {
  chatSheet.classList.remove('hidden');
  chatBackdrop.classList.remove('hidden');
  setTimeout(() => $('#chatInput').focus(), 80);
}

function closeChat() {
  chatSheet.classList.add('hidden');
  chatBackdrop.classList.add('hidden');
}

$('#closeChat').addEventListener('click', closeChat);
chatBackdrop.addEventListener('click', closeChat);
$('#moodBubble').addEventListener('click', openChat);

function renderChat() {
  chatMessages.innerHTML = state.messages.map(message => `<div class="message ${message.role}">${escapeHtml(message.text)}</div>`).join('');
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

$('#chatForm').addEventListener('submit', (event) => {
  event.preventDefault();
  const input = $('#chatInput');
  const text = input.value.trim();
  if (!text) return;
  state.messages.push({ role: 'user', text });
  const learned = learnMemory(text);
  state.bond = clamp(state.bond + 2);
  if (state.mode === 'real' && learned) state.fidelity = clamp(state.fidelity + 5);
  state.messages.push({ role: 'pet', text: agentReply(text) });
  state.messages = state.messages.slice(-24);
  input.value = '';
  saveState();
  render();
  openChat();
});

function learnMemory(text) {
  const patterns = state.mode === 'real' ? [
    [/(?:它|他|她|[^，。]{1,8})喜欢(.{1,18})/, match => `${state.petName}喜欢${match[1]}`],
    [/(?:它|他|她|[^，。]{1,8})害怕(.{1,18})/, match => `${state.petName}害怕${match[1]}`],
    [/(?:它|他|她|[^，。]{1,8})(?:总是|经常|习惯)(.{1,22})/, match => `${state.petName}的习惯：${match[1]}`],
    [/(?:今天|有一次|以前)(.{1,28})/, match => `关于${state.petName}的故事：${match[0]}`]
  ] : [
    [/我喜欢(.{1,16})/, match => `${state.ownerName}喜欢${match[1]}`],
    [/我今天(.{1,22})/, match => `${state.ownerName}今天${match[1]}`],
    [/我的生日是(.{1,12})/, match => `${state.ownerName}的生日是${match[1]}`],
    [/我害怕(.{1,16})/, match => `${state.ownerName}害怕${match[1]}`],
    [/我想要(.{1,18})/, match => `${state.ownerName}想要${match[1]}`]
  ];
  for (const [pattern, format] of patterns) {
    const match = text.match(pattern);
    if (match) {
      const memory = format(match).replace(/[。！!？?]$/, '');
      if (!state.memories.includes(memory)) state.memories.push(memory);
      return true;
    }
  }
  if (state.mode === 'real' && text.length >= 6) {
    state.memories.push(`主人补充：${text.replace(/[。！!？?]$/, '')}`);
    return true;
  }
  return false;
}

function agentReply(text) {
  const name = state.ownerName;
  if (state.mode === 'real') {
    if (/喜欢|爱吃|最爱/.test(text)) return `记住了。${state.petName}喜欢的东西，是组成“它是谁”的重要部分。我的还原度又提高了一点。`;
    if (/害怕|不喜欢|讨厌/.test(text)) return `我记住这个边界了。真正像${state.petName}，不只要知道它喜欢什么，也要知道它害怕什么。`;
    if (/总是|经常|习惯|每次/.test(text)) return `这个小习惯很有辨识度。下次回应你时，我会试着更像${state.petName}。`;
    return `我把这段关于${state.petName}的故事收好了。你讲得越多，数字世界里的我就越接近真实的它。`;
  }
  const traitLines = {
    温柔: [`我在听，${name}。不用急着把一切都说清楚。`, `这件事对你一定很重要，我会帮你记住。`],
    好奇: [`真的？然后呢？我想把今天的故事听完整。`, `如果明天再遇到这件事，你想怎么做？`],
    勇敢: [`我站在你这边。我们先做最小的一步，好吗？`, `${name}，你已经比自己想象得更勇敢了。`]
  };
  if (/累|难过|伤心|烦|压力/.test(text)) return `先靠近我一点吧。${name}，今天辛苦了，我会陪你慢慢缓过来。`;
  if (/开心|高兴|成功|完成|喜欢/.test(text)) return `我感受到你的开心了！这会成为我们第${state.day}天的一颗亮晶晶记忆。`;
  if (/晚安|睡觉/.test(text)) return `晚安，${name}。我会替你守着今天的记忆。`;
  const list = traitLines[state.trait] || traitLines.温柔;
  return list[state.messages.length % list.length];
}

function escapeHtml(text) {
  return String(text).replace(/[&<>'"]/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#039;','"':'&quot;'}[char]));
}

$('#shareButton').addEventListener('click', () => {
  const stage = getStage();
  $('#shareDate').textContent = `DAY ${String(state.day).padStart(2,'0')}`;
  $('#shareImage').src = state.photo || 'assets/rongya.png';
  $('#sharePetName').textContent = state.petName;
  $('#shareQuote').textContent = state.mode === 'real' ? '“换一个世界，我还是认得你。”' : '“谢谢你让我来到这个世界。”';
  $('#shareStats').textContent = state.mode === 'real' ? `还原度 ${state.fidelity}% · ${state.trait}型 · ${stage.label}` : `羁绊 ${state.bond} · ${state.trait}型 · ${stage.label}`;
  $('.share-card-canvas').classList.toggle('user-photo', state.mode === 'real');
  modalBackdrop.classList.remove('hidden');
});

function closeModal() { modalBackdrop.classList.add('hidden'); }
$('#modalClose').addEventListener('click', closeModal);
modalBackdrop.addEventListener('click', event => { if (event.target === modalBackdrop) closeModal(); });
$('#copyShare').addEventListener('click', async () => {
  const text = growthShareText();
  try { await navigator.clipboard.writeText(text); notify('成长文案已复制'); }
  catch { notify(text); }
});

function growthShareText() {
  return state.mode === 'real'
    ? `我在灵芽为${state.petName}创建了数字分身，目前还原度${state.fidelity}%。它记得${state.memories.length}段故事，正在慢慢成为数字世界里的另一个它。`
    : `我和${state.petName}相遇第${state.day}天，羁绊${state.bond}，现在是${getStage().label}。它正在慢慢成为只属于我的数字生命。`;
}

function openTrainingChat() {
  switchView('home');
  $('#chatInput').placeholder = $('#trainingQuestion')?.textContent || `告诉AI更多关于${state.petName}的事…`;
  openChat();
}

$('#missionButton').addEventListener('click', openTrainingChat);
$('#answerTraining').addEventListener('click', openTrainingChat);

$('#exportData').addEventListener('click', () => {
  const exportState = { ...state, exportedAt: new Date().toISOString(), schemaVersion: 1 };
  const blob = new Blob([JSON.stringify(exportState, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `lingya-${state.petName}-profile.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 500);
  notify('宠物档案已导出');
});

$('#platformShare').addEventListener('click', async () => {
  const text = growthShareText();
  if (navigator.share) {
    try {
      await navigator.share({ title: `${state.petName}的灵芽数字分身`, text });
      notify('分享面板已打开');
      return;
    } catch (error) {
      if (error.name === 'AbortError') return;
    }
  }
  try { await navigator.clipboard.writeText(text); notify('分享文案已复制，可粘贴到微信或抖音'); }
  catch { notify(text); }
});

$('#privacyInfo').addEventListener('click', () => notify('当前版本不上传照片；清除浏览器数据会同时清除宠物档案'));

render();
