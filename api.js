/* SCORIVO live football connector
   API-Football integration. Demo football data is removed when this script loads.
*/
(() => {
  const API = 'https://v3.football.api-sports.io';
  const KEY = 'scorivo_api_key';
  const key = () => localStorage.getItem(KEY) || '';
  const today = () => new Date().toISOString().slice(0,10);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function toast(msg) {
    let t = document.getElementById('scorivo-api-toast');
    if (!t) { t = document.createElement('div'); t.id='scorivo-api-toast'; Object.assign(t.style,{position:'fixed',bottom:'25px',left:'50%',transform:'translateX(-50%)',zIndex:9999,background:'#062b2a',color:'#fff',padding:'12px 18px',borderRadius:'12px',font:'12px system-ui',boxShadow:'0 15px 40px #0005'}); document.body.appendChild(t); }
    t.textContent=msg; t.style.display='block'; clearTimeout(t._timer); t._timer=setTimeout(()=>t.style.display='none',3000);
  }

  async function api(path) {
    const k = key();
    if (!k) throw new Error('Connect an API-Football key to load real football data.');
    const res = await fetch(API + path, {headers:{'x-apisports-key':k,Accept:'application/json'}});
    const data = await res.json();
    if (!res.ok || (data.errors && Object.keys(data.errors).length)) {
      throw new Error(typeof data.errors === 'object' ? JSON.stringify(data.errors) : 'API request failed');
    }
    return data.response || [];
  }

  function empty(el, message) {
    if (el) el.innerHTML = `<div style="padding:28px 16px;text-align:center;color:var(--muted);font-size:12px">${esc(message)}</div>`;
  }

  function clearDemoData() {
    // Never show invented scores, teams, injuries or events.
    const matchList = document.getElementById('matchList');
    empty(matchList, key() ? 'Loading real matches…' : 'Connect the API to load real matches.');

    const featured = document.querySelector('.featured');
    if (featured) {
      const label = featured.querySelector('.live-label');
      if (label) label.innerHTML = '<i></i> LIVE MATCHES';
      const center = featured.querySelector('.match-center');
      if (center) center.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:28px 10px;color:#a9c8c5;font-size:13px">No live match loaded yet.</div>';
      const watch = featured.querySelector('.watch');
      if (watch) watch.style.display = 'none';
    }

    const injuries = document.getElementById('injuries');
    if (injuries) {
      const title = injuries.querySelector('.section-title');
      injuries.innerHTML = '';
      if (title) injuries.appendChild(title);
      empty(injuries, key() ? 'Loading real injury and suspension data…' : 'Connect the API to load real injury data.');
    }

    // Remove hard-coded formation/player names from the visual lineup.
    document.querySelectorAll('.player-dot').forEach(p => p.remove());
    const formation = document.querySelector('.formation');
    if (formation) formation.innerHTML = '<span>Formation</span><strong>—</strong><span>Waiting for match data</span>';

    // Make the top-player card honest until player data is loaded.
    const player = document.querySelector('.player-card');
    if (player) {
      const name = player.querySelector('.player-name');
      const role = player.querySelector('.player-role');
      const stats = player.querySelector('.player-stats');
      if (name) name.innerHTML = 'Top player<br>loading…';
      if (role) role.textContent = 'Real player data will appear here';
      if (stats) stats.innerHTML = '<div class="stat"><strong>—</strong><small>Matches</small></div><div class="stat"><strong>—</strong><small>Goals</small></div><div class="stat"><strong>—</strong><small>Assists</small></div>';
    }
  }

  function ensureSettings() {
    if (document.getElementById('scorivoApiBtn')) return;
    const btn=document.createElement('button'); btn.id='scorivoApiBtn'; btn.textContent='⚙ API';
    Object.assign(btn.style,{position:'fixed',right:'18px',bottom:'18px',zIndex:1000,border:'0',borderRadius:'999px',padding:'11px 16px',background:'#20c9bb',color:'#032b29',fontWeight:'900',boxShadow:'0 8px 25px #0003'});
    document.body.appendChild(btn);
    const modal=document.createElement('div'); modal.id='scorivoApiModal';
    Object.assign(modal.style,{display:'none',position:'fixed',inset:0,zIndex:999,background:'#0008',alignItems:'center',justifyContent:'center',padding:'20px'});
    modal.innerHTML=`<div style="width:min(520px,100%);background:var(--surface-solid,#fff);color:var(--text,#062525);border:1px solid var(--line,#ddd);border-radius:20px;padding:22px;box-shadow:0 25px 80px #0006;font-family:system-ui"><div style="display:flex;justify-content:space-between;align-items:center"><h2 style="margin:0">SCORIVO API</h2><button id="scClose" style="border:0;background:transparent;font-size:22px">×</button></div><p style="color:var(--muted,#65817f);font-size:13px;line-height:1.5">Connect API-Football to load real scores, fixtures, competitions and injury data. Your key is stored only in this browser.</p><input id="scKey" type="password" placeholder="Paste API-Football key" style="width:100%;height:44px;border:1px solid var(--line,#ddd);border-radius:11px;padding:0 12px;background:var(--card,#fff);color:var(--text,#062525)"><div style="display:flex;gap:8px;margin-top:12px"><button id="scSave" style="border:0;border-radius:10px;padding:10px 15px;background:#20c9bb;font-weight:800">Connect & Load</button><button id="scClear" style="border:1px solid var(--line,#ddd);border-radius:10px;padding:10px 15px;background:transparent;color:inherit">Clear</button></div><div id="scStatus" style="margin-top:12px;color:var(--muted,#65817f);font-size:11px"></div></div>`;
    document.body.appendChild(modal);
    const input=modal.querySelector('#scKey'),status=modal.querySelector('#scStatus'); input.value=key();
    btn.onclick=()=>{modal.style.display='flex';input.value=key();}; modal.querySelector('#scClose').onclick=()=>modal.style.display='none';
    modal.addEventListener('click',e=>{if(e.target===modal)modal.style.display='none';});
    modal.querySelector('#scSave').onclick=async()=>{const v=input.value.trim();if(!v){status.textContent='Paste your API key first.';return}localStorage.setItem(KEY,v);status.textContent='Saved. Testing connection…';clearDemoData();try{await api('/status');status.textContent='Connected. Loading real football data…';await refresh(true);modal.style.display='none';toast('SCORIVO is connected to live football data.')}catch(e){status.textContent='Connection failed: '+e.message;clearDemoData();}};
    modal.querySelector('#scClear').onclick=()=>{localStorage.removeItem(KEY);input.value='';status.textContent='Key cleared. Demo data remains disabled.';clearDemoData();updateBadge();};
  }

  function matchRow(m) {
    const h=m.teams?.home?.name||'Home', a=m.teams?.away?.name||'Away';
    const hs=m.goals?.home ?? '-', as=m.goals?.away ?? '-'; const st=m.fixture?.status?.short||'NS';
    const time=st==='NS'?new Date(m.fixture.date).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}):(st==='FT'?'FT':(st==='HT'?'HT':(m.fixture?.status?.elapsed??'')+"'"));
    return `<div class="match-row" data-api-search="${esc((h+' '+a+' '+(m.league?.name||'')).toLowerCase())}"><div class="match-time">${esc(time)}</div><div class="teams"><div class="team-line"><span>${esc(h)}</span><span>${hs}</span></div><div class="team-line"><span>${esc(a)}</span><span>${as}</span></div><div class="league-label">${esc(m.league?.name||'')}</div></div><span>›</span></div>`;
  }

  async function loadMatches() {
    const data=await api('/fixtures?date='+today());
    const box=document.getElementById('matchList'); if(!box) return;
    box.innerHTML=data.length?data.slice(0,100).map(matchRow).join(''):'<div style="padding:28px;text-align:center;color:var(--muted)">No football matches returned for today.</div>';
  }

  async function loadLive() {
    const data=await api('/fixtures?live=all');
    const featured=document.querySelector('.featured');
    if(!featured) return;
    const label=featured.querySelector('.live-label');
    const old=featured.querySelector('.match-center');
    const watch=featured.querySelector('.watch');
    if (!data.length) {
      if(label) label.innerHTML='<i></i> NO LIVE MATCHES';
      if(old) old.innerHTML='<div style="grid-column:1/-1;text-align:center;padding:28px 10px;color:#a9c8c5;font-size:13px">There are no live football matches right now.</div>';
      if(watch) watch.style.display='none';
      return;
    }
    const m=data[0];
    if(label) label.innerHTML='<i></i> LIVE NOW · '+data.length;
    if(old) old.innerHTML=`<div><div class="club-badge">⚽</div><div class="club-name">${esc(m.teams.home.name)}</div></div><div><div class="score">${m.goals.home??0} : ${m.goals.away??0}</div><div class="minute">${m.fixture.status.elapsed??0}'</div></div><div><div class="club-badge">⚽</div><div class="club-name">${esc(m.teams.away.name)}</div></div>`;
    if(watch) watch.style.display='inline-block';
  }

  async function loadInjuries() {
    const data=await api('/injuries?date='+today()); const card=document.getElementById('injuries'); if(!card) return;
    const title=card.querySelector('.section-title'); card.innerHTML=''; if(title) card.appendChild(title);
    const wrap=document.createElement('div');
    wrap.innerHTML=data.slice(0,40).map(x=>`<div class="injury-row"><div class="mini-avatar">⚕</div><div><div class="injury-name">${esc(x.player?.name||'Player')}</div><div class="injury-type">${esc(x.player?.reason||'Availability update')} · ${esc(x.team?.name||'')}</div></div><div class="status ${String(x.player?.type||'').toLowerCase().includes('question')?'doubt':'out'}">${esc(x.player?.type||'OUT')}</div></div>`).join('')||'<div style="padding:25px;text-align:center;color:var(--muted)">No injury or suspension data returned today.</div>';
    card.appendChild(wrap);
  }

  async function loadLeagues() {
    const data=await api('/leagues?current=true');
    let side=document.querySelector('.sidebar'); if(side){let old=document.getElementById('scorivoLiveLeagues');if(old)old.remove();let h=document.createElement('div');h.id='scorivoLiveLeagues';h.innerHTML='<div class="side-divider"></div><h4>Current competitions</h4>'+data.slice(0,15).map(x=>`<div class="side-link">🏆 ${esc(x.league.name)}</div>`).join('');side.appendChild(h);}
  }

  async function refresh(manual=false) {
    if(!key()) return;
    try {
      await Promise.all([loadLive(),loadMatches(),loadInjuries(),loadLeagues()]);
      updateBadge('● API connected · updated '+new Date().toLocaleTimeString());
      if(manual) toast('Real football data updated.');
    } catch(e) { updateBadge('⚠ API error'); toast(e.message); console.error(e); }
  }

  function updateBadge(text){let e=document.getElementById('scorivoConnected');if(!e)return;e.textContent=text || (key()?'● API key saved':'○ API not connected');}
  function addConnectionBadge(){let e=document.getElementById('scorivoConnected');if(e)return;e=document.createElement('div');e.id='scorivoConnected';Object.assign(e.style,{position:'fixed',left:'18px',bottom:'18px',zIndex:999,font:'10px system-ui',padding:'8px 11px',borderRadius:'10px',background:'var(--surface-solid,#fff)',color:'var(--text,#062525)',border:'1px solid var(--line,#ddd)'});document.body.appendChild(e);updateBadge();}
  function installRefreshButton(){let b=document.createElement('button');b.id='scorivoRefresh';b.textContent='↻ Refresh scores';Object.assign(b.style,{position:'fixed',right:'18px',bottom:'66px',zIndex:998,border:'1px solid var(--line,#ddd)',borderRadius:'999px',padding:'9px 13px',background:'var(--surface-solid,#fff)',color:'var(--text,#062525)',fontWeight:'800',fontSize:'11px'});b.onclick=()=>refresh(true);document.body.appendChild(b);}

  window.addEventListener('load',()=>{clearDemoData();ensureSettings();addConnectionBadge();installRefreshButton();if(key())refresh(false);});
})();