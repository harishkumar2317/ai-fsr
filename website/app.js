const NAV = [
  ['index.html','Compliance Dashboard','&#9670;'],
  ['organizations.html','Organizations','&#9673;'],
  ['assistant.html','AI Compliance Assistant','&#10022;'],
  ['checklist.html','Compliance Checklist','&#9745;'],
  ['audit.html','Audit Management','&#9638;'],
  ['documents.html','Document Intelligence','&#9673;'],
  ['label.html','Food Label Validator','&#9679;'],
  ['incidents.html','Incident Management','&#9650;'],
  ['capa.html','CAPA Management','&#9675;'],
  ['reports.html','Reports & Analytics','&#9776;']
];

function renderShell(activeIndex, pageTitle, subtitle, breadcrumb){
  const userData = JSON.parse(localStorage.getItem('fsr_user') || '{}');
  const orgName = userData.organization || 'AI-FSR Platform';
  const nav = NAV.map((n,i)=>{
    let dot = '';
    if(i===6) dot = '<span class="dot" style="margin-left:auto;width:8px;height:8px;border-radius:50%;background:var(--danger);flex-shrink:0"></span>';
    return `<a href="${n[0]}" class="${i===activeIndex?'active':''}"><span class="icon">${n[2]}</span><span class="nav-text">${n[1]}</span>${dot}</a>`;
  }).join('');

  document.getElementById('sidebar').innerHTML = `
    <div class="logo-wrap" style="position:relative">
      <button class="sidebar-toggle" onclick="toggleSidebar()" title="Toggle menu" id="sidebarToggle">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/></svg>
      </button>
      <div class="logo-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M12 2L3 7v6c0 5.25 3.75 10.08 9 11.25C17.25 23.08 21 18.25 21 13V7l-9-5z" fill="#fff"/><path d="M9 12l2 2 4-4" stroke="#0ea5e9" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
      <div class="logo-text-group">
        <div class="logo-text">AI-FSR</div>
        <div class="logo-sub">FOOD SAFETY PLATFORM</div>
      </div>
    </div>
    <div class="org-card" id="orgCard" onclick="window.location.href='organizations.html'" style="cursor:pointer">
      <div class="org-label">ORGANIZATION</div>
      <div class="org-name" id="orgName">AgroFood Industries Ltd.</div>
      <div class="org-plant" id="orgPlant">Plant: Main Factory</div>
    </div>
    <nav class="nav">${nav}</nav>
    <div class="sidebar-profile-wrap">
      <div class="sidebar-profile" id="sidebarProfile" onclick="toggleProfileMenu(event)">
        <div class="profile-avatar" id="profileAvatar">P</div>
        <div class="profile-info">
          <div class="profile-name" id="profileName">Priya Sharma</div>
          <div class="profile-role" id="profileRole">Quality Manager</div>
        </div>
        <span class="profile-settings">&#9662;</span>
      </div>
      <div class="profile-dropdown" id="profileDropdown">
        <div class="profile-dropdown-head">
          <div class="profile-avatar" style="width:36px;height:36px;font-size:15px" id="dropAvatar">P</div>
          <div><div style="font-weight:600;font-size:13px" id="dropName">Priya Sharma</div><div style="font-size:11px;color:var(--muted-foreground)" id="dropEmail">priya.sharma@agrofood.in</div></div>
        </div>
        <div class="profile-dropdown-divider"></div>
        <a class="profile-dropdown-item" href="#" onclick="event.preventDefault()"><span>&#128100;</span> My Profile</a>
        <a class="profile-dropdown-item" onclick="closeProfileMenu();openSettings()"><span style="color:var(--primary)">&#9881;</span> Settings</a>
        <div class="profile-dropdown-divider"></div>
        <a class="profile-dropdown-item danger" onclick="logout()"><span>&#9211;</span> Logout</a>
      </div>
    </div>`;

  document.getElementById('topbar').innerHTML = `
    <div class="topbar-left">
      <button class="hamburger" onclick="toggleMobileMenu()" id="hamburgerBtn">&#9776;</button>
      <div>
        <div class="breadcrumb">${breadcrumb ? orgName + ' / ' + breadcrumb : orgName + ' / ' + pageTitle}</div>
        <h1>${pageTitle}</h1>
        <div class="sub">${subtitle}</div>
      </div>
    </div>
    <div class="right">
      <div class="search-wrap" id="searchWrap">
        <span class="search-icon">&#128269;</span>
        <input type="text" class="search-input" id="searchInput" placeholder="Search..." onfocus="showSearchPanel()" oninput="handleSearch(this.value)">
        <div class="search-panel" id="searchPanel"></div>
      </div>
      <div class="system-badge"><span class="sys-dot"></span>System Healthy</div>
      <button class="topbar-icon-btn" onclick="toggleNotifications()" id="notifBtn">
        <span>&#128276;</span>
        <span class="notif-dot" id="notifDot"></span>
      </button>
      <div class="notif-panel" id="notifPanel">
        <div class="notif-header"><b>Notifications</b><span class="notif-clear" onclick="clearNotifs()">Clear all</span></div>
        <div id="notifList"></div>
      </div>
      <button class="topbar-icon-btn" onclick="openSettings()" title="Settings"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg></button>
    </div>`;

  loadUser();
  applySidebarState();
  renderNotifications();

  if(!document.getElementById('settingsPanel')){
    document.body.insertAdjacentHTML('beforeend', SETTINGS_HTML);
  }
}

/* ── User / Auth ── */
function loadUser(){
  try {
    const data = JSON.parse(localStorage.getItem('fsr_user') || '{}');
    const pName = document.getElementById('profileName');
    const pRole = document.getElementById('profileRole');
    const avatar = document.getElementById('profileAvatar');
    const dName = document.getElementById('dropName');
    const dEmail = document.getElementById('dropEmail');
    const dAvatar = document.getElementById('dropAvatar');
    if(pName && data.name) pName.textContent = data.name;
    if(pRole && data.role) pRole.textContent = data.role;
    if(avatar && data.name) avatar.textContent = data.name.charAt(0);
    if(dName && data.name) dName.textContent = data.name;
    if(dEmail && data.email) dEmail.textContent = data.email;
    if(dAvatar && data.name) dAvatar.textContent = data.name.charAt(0);
  } catch(e){}
  loadOrg();
}

function loadOrg(){
  try {
    const data = JSON.parse(localStorage.getItem('fsr_user') || '{}');
    const orgName = document.getElementById('orgName');
    const orgPlant = document.getElementById('orgPlant');
    if(data.organization && orgName) orgName.textContent = data.organization;
    if(data.plant && orgPlant) orgPlant.textContent = 'Plant: ' + data.plant;
    else if(orgName && !data.organization) orgName.textContent = 'AI-FSR Platform';
    if(orgPlant && !data.plant) orgPlant.textContent = 'Select an organization';
  } catch(e){}
}

function logout(){
  localStorage.removeItem('fsr_token');
  localStorage.removeItem('fsr_user');
  window.location.href = 'login.html';
}

/* ── Sidebar Toggle ── */
function toggleSidebar(){
  const sb = document.querySelector('.sidebar');
  const btn = document.getElementById('sidebarToggle');
  sb.classList.toggle('collapsed');
  const isCollapsed = sb.classList.contains('collapsed');
  localStorage.setItem('fsr_sidebar', isCollapsed ? 'collapsed' : 'expanded');
  btn.innerHTML = isCollapsed
    ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/><polyline points="13 9 16 12 13 15"/></svg>'
    : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="9" y1="3" x2="9" y2="21"/></svg>';
}

function applySidebarState(){
  const saved = localStorage.getItem('fsr_sidebar');
  if(saved === 'collapsed'){
    document.querySelector('.sidebar')?.classList.add('collapsed');
  }
}

/* ── Profile Dropdown ── */
function toggleProfileMenu(e){
  e.stopPropagation();
  const dd = document.getElementById('profileDropdown');
  dd.classList.toggle('open');
}

function closeProfileMenu(){
  const dd = document.getElementById('profileDropdown');
  if(dd) dd.classList.remove('open');
}

document.addEventListener('click', e => {
  const dd = document.getElementById('profileDropdown');
  const sp = document.getElementById('sidebarProfile');
  if(dd && sp && !sp.contains(e.target) && !dd.contains(e.target)){
    dd.classList.remove('open');
  }
});

/* ── Mobile menu ── */
function toggleMobileMenu(){
  document.querySelector('.sidebar').classList.toggle('open');
}

/* ── Notifications ── */
const NOTIFS = [
  {icon:'&#128308;',text:'FSSAI License renewal due in 12 days — Unit B',time:'2h ago',color:'#ef4444'},
  {icon:'&#128992;',text:'Temperature violation detected in Cold Storage #3',time:'4h ago',color:'#f59e0b'},
  {icon:'&#128994;',text:'Monthly HACCP review pending assignment',time:'1d ago',color:'#10b981'},
  {icon:'&#128992;',text:'3 open CAPA actions past due date',time:'1d ago',color:'#f59e0b'},
];

function renderNotifications(){
  const list = document.getElementById('notifList');
  if(!list) return;
  list.innerHTML = NOTIFS.map(n=>`
    <div class="notif-item">
      <span style="font-size:10px;margin-top:4px;color:${n.color}">&#9679;</span>
      <div><div class="notif-text">${n.text}</div><div class="notif-time">${n.time}</div></div>
    </div>`).join('');
  const dot = document.getElementById('notifDot');
  if(dot) dot.style.display = NOTIFS.length ? 'block' : 'none';
}

function toggleNotifications(){
  document.getElementById('notifPanel').classList.toggle('open');
  document.getElementById('searchPanel').classList.remove('open');
}

function clearNotifs(){
  NOTIFS.length = 0;
  renderNotifications();
  document.getElementById('notifPanel').classList.remove('open');
}

document.addEventListener('click', e => {
  const nb = document.getElementById('notifBtn');
  const np = document.getElementById('notifPanel');
  if(nb && np && !nb.contains(e.target) && !np.contains(e.target)){
    np.classList.remove('open');
  }
});

/* ── Search ── */
const SEARCH_DATA = [
  {type:'Page',name:'Compliance Dashboard',page:'index.html',icon:'&#9670;'},
  {type:'Page',name:'AI Compliance Assistant',page:'assistant.html',icon:'&#10022;'},
  {type:'Page',name:'Compliance Checklist',page:'checklist.html',icon:'&#9745;'},
  {type:'Page',name:'Audit Management',page:'audit.html',icon:'&#9638;'},
  {type:'Page',name:'Document Intelligence',page:'documents.html',icon:'&#9673;'},
  {type:'Page',name:'Food Label Validator',page:'label.html',icon:'&#9679;'},
  {type:'Page',name:'Incident Management',page:'incidents.html',icon:'&#9650;'},
  {type:'Page',name:'CAPA Management',page:'capa.html',icon:'&#9675;'},
  {type:'Page',name:'Reports & Analytics',page:'reports.html',icon:'&#9776;'},
  {type:'Report',name:'Monthly Compliance Report - July 2026',page:'reports.html',icon:'&#128196;'},
  {type:'Report',name:'FSSAI Audit Summary Q2 2026',page:'reports.html',icon:'&#128196;'},
  {type:'Audit',name:'AUD-2026-041 Internal',page:'audit.html',icon:'&#9638;'},
  {type:'Audit',name:'AUD-2026-040 External',page:'audit.html',icon:'&#9638;'},
  {type:'Document',name:'HACCP Plan - Dairy Processing v3.2',page:'documents.html',icon:'&#9673;'},
  {type:'Document',name:'GMP Manual - Main Factory 2026',page:'documents.html',icon:'&#9673;'},
  {type:'CAPA',name:'CAPA-026 Cold storage compressor repair',page:'capa.html',icon:'&#9675;'},
  {type:'Incident',name:'INC-2026-018 Temperature Violation',page:'incidents.html',icon:'&#9650;'},
];

function handleSearch(q){
  const panel = document.getElementById('searchPanel');
  if(!q.trim()){panel.classList.remove('open');return;}
  const results = SEARCH_DATA.filter(d=>d.name.toLowerCase().includes(q.toLowerCase())||d.type.toLowerCase().includes(q.toLowerCase()));
  if(!results.length){panel.innerHTML='<div class="search-empty">No results found</div>';panel.classList.add('open');return;}
  panel.innerHTML = results.slice(0,8).map(r=>`
    <a href="${r.page}" class="search-item">
      <span class="search-item-icon">${r.icon}</span>
      <div><div class="search-item-name">${r.name}</div><div class="search-item-type">${r.type}</div></div>
    </a>`).join('');
  panel.classList.add('open');
}

function showSearchPanel(){
  const q = document.getElementById('searchInput').value;
  if(q.trim()) handleSearch(q);
}

document.addEventListener('click', e => {
  const sw = document.getElementById('searchWrap');
  const sp = document.getElementById('searchPanel');
  if(sw && sp && !sw.contains(e.target)) sp.classList.remove('open');
});

/* ── Settings ── */
const SETTINGS_HTML = `
<div class="settings-overlay" id="settingsOverlay" onclick="closeSettings()"></div>
<div class="settings-panel" id="settingsPanel">
  <div class="settings-head">
    <h2>Settings</h2>
    <button class="settings-close" onclick="closeSettings()">&times;</button>
  </div>
  <div class="settings-body">
    <div class="sg-header open" onclick="toggleSettingGroup(this)"><h4>Appearance</h4><span class="sg-chevron">&#9662;</span></div>
    <div class="sg-body">
      <div class="setting-row"><div><div class="setting-label">Theme</div><div class="setting-desc">Switch between light and dark mode</div></div>
        <div class="setting-toggle" id="themeToggle" onclick="toggleTheme(this)"></div></div>
      <div class="setting-row"><div><div class="setting-label">Primary Color</div></div></div>
      <div class="color-grid">
        <div class="color-swatch active" style="background:#0284c7" onclick="setPrimary('#0284c7','#0369a1',this)"></div>
        <div class="color-swatch" style="background:#8b5cf6" onclick="setPrimary('#8b5cf6','#7c3aed',this)"></div>
        <div class="color-swatch" style="background:#10b981" onclick="setPrimary('#10b981','#059669',this)"></div>
        <div class="color-swatch" style="background:#f59e0b" onclick="setPrimary('#f59e0b','#d97706',this)"></div>
        <div class="color-swatch" style="background:#ef4444" onclick="setPrimary('#ef4444','#dc2626',this)"></div>
        <div class="color-swatch" style="background:#ec4899" onclick="setPrimary('#ec4899','#db2777',this)"></div>
      </div>
      <div class="setting-row" style="margin-top:12px"><div><div class="setting-label">Compact Mode</div></div>
        <div class="setting-toggle" onclick="toggleCompact(this)"></div></div>
    </div>
    <div class="sg-header" onclick="toggleSettingGroup(this)"><h4>Notifications</h4><span class="sg-chevron">&#9662;</span></div>
    <div class="sg-body">
      <div class="setting-row"><div><div class="setting-label">Enable Notifications</div></div>
        <div class="setting-toggle on" onclick="this.classList.toggle('on')"></div></div>
      <div class="setting-row"><div><div class="setting-label">Sound Alerts</div></div>
        <div class="setting-toggle" onclick="this.classList.toggle('on')"></div></div>
    </div>
    <div class="sg-header" onclick="toggleSettingGroup(this)"><h4>Data & Privacy</h4><span class="sg-chevron">&#9662;</span></div>
    <div class="sg-body">
      <div class="setting-row"><div><div class="setting-label">Export All Data</div></div>
        <button class="btn btn-outline btn-sm" onclick="toast('Export started')">Export</button></div>
      <div class="setting-row"><div><div class="setting-label">Clear Local Data</div></div>
        <button class="btn btn-outline btn-sm" onclick="if(confirm('Clear?')){localStorage.clear();toast('Cleared')}">Clear</button></div>
    </div>
  </div>
</div>`;

function openSettings(){document.getElementById('settingsOverlay').classList.add('open');document.getElementById('settingsPanel').classList.add('open');}
function closeSettings(){document.getElementById('settingsOverlay').classList.remove('open');document.getElementById('settingsPanel').classList.remove('open');}
function toggleSettingGroup(el){el.classList.toggle('open');}
function setPrimary(c,h,el){document.documentElement.style.setProperty('--primary',c);document.documentElement.style.setProperty('--primary-hover',h);document.querySelectorAll('.color-swatch').forEach(s=>s.classList.remove('active'));el.classList.add('active');toast('Color updated');}
function toggleCompact(el){el.classList.toggle('on');const m=document.querySelector('.main');if(el.classList.contains('on')){m.style.padding='16px 20px';document.querySelectorAll('.card').forEach(c=>c.style.padding='14px')}else{m.style.padding='';document.querySelectorAll('.card').forEach(c=>c.style.padding='')}}

/* ── Dark / Light Theme ── */
function toggleTheme(el){
  el.classList.toggle('on');
  const isDark = el.classList.contains('on');
  document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  localStorage.setItem('fsr_theme', isDark ? 'dark' : 'light');
  toast(isDark ? 'Dark mode enabled' : 'Light mode enabled');
}

function applySavedTheme(){
  const saved = localStorage.getItem('fsr_theme');
  if(saved === 'dark'){
    document.documentElement.setAttribute('data-theme', 'dark');
    setTimeout(()=>{
      const toggle = document.getElementById('themeToggle');
      if(toggle) toggle.classList.add('on');
    }, 100);
  }
}

document.addEventListener('DOMContentLoaded', applySavedTheme);
applySavedTheme();

/* ── Toast ── */
function toast(msg){
  let t=document.getElementById('toast');
  if(!t){t=document.createElement('div');t.id='toast';document.body.appendChild(t);}
  t.textContent=msg;t.classList.add('show');clearTimeout(t._h);t._h=setTimeout(()=>t.classList.remove('show'),2600);
}
