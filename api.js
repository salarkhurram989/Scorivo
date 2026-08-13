/* SCORIVO live football connector
   Uses the free API-Football tier. The API key is entered by the site owner/user
   and stored in browser localStorage; it is NOT committed to GitHub.
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
    if (!k) throw new Error('Add your API-Football key in SCORIVO API Settings.');
    const res = await fetch(API + path, {headers:{'x-apisports-key':k,Accept:'application/json'}});
    const data = await res.json();
    if (!res.ok || (data.errors && Object.keys(data.errors).length)) {
      throw new Error(typeof data.errors === 'object' ? JSON.stringify(data.errors) : 'API request failed');
    }
    return data.response || [];
  }

  function ensureSettings() {
    if (document.getElementById('scorivoApiBtn')) return;
    const btn=document.createElement('button'); btn.id='scorivoApiBtn'; btn.textContent='⚙ API';
    Object.assign(btn.style,{position:'fixed',right:'18px',bottom:'18px',zIndex:1000,border:'0',borderRadius:'999px',padding:'11px 16px',background:'#20c9bb',color:'#032b29',fontWeight:'900',boxShadow:'0 8px 25px #0003'});
    document.body.appendChild(btn);
    const modal=document.createElement('div'); modal.id='scorivoApiModal';
    Object.assign(modal.style,{display:'none',position:'fixed',inset:0,zIndex:999,background:'#0008',alignItems:'center',justifyContent:'center',padding:'20px'});
    modal.innerHTML=`<div style="width:min(520px,100%);background:var(--surface-solid,#fff);color:var(--text,#062525);border:1px solid var(--line,#ddd);border-radius:20px;padding:22px;box-shadow:0 25px 80px #0006;font-family:system-ui"><div style="display:flex;justify-content:space-between;align-items:center"><h2 style="margin:0">SCORIVO API</h2><button id="scClose" style="border:0;background:transparent;font-size:22px">×</button></div><p style="color:var(--muted,#65817f);font-size:13px;line-height:1.5">Connect the free API-Football plan. Your key is saved only in this browser and is never written into the GitHub repository.</p><input id="scKey" type="password" placeholder="Paste API-Football key" style="width:100%;height:44px;border:1px solid var(--line,#ddd);border-radius:11px;padding:0 12px;background:var(--card,#fff);color:var(--text,#062525)"><div style="display:flex;gap:8px;margin-top:12px"><button id="scSave" style="border:0;border-radius:10px;padding:10px 15px;background:#20c9bb;font-weight:800">Connect & Load</button><button id="scClear" style="border:1px solid var(--line,#ddd);border-radius:10px;padding:10px 15px;background:transparent;color:inherit">Clear</button></div><div id="scStatus" style="margin-top:12px;color:var(--muted,#65817f);font-size:11px"></div></div>`;
    document.body.appendChild(modal);
    const input=modal.querySelector('#scKey'),status=modal.querySelector('#scStatus'); input.value=key();
    btn.onclick=()=>{modal.style.display='flex';input.value=key();}; modal.querySelector('#scClose').onclick=()=>modal.style.display='none';
    modal.addEventListener('click',e=>{if(e.target===modal)modal.style.display='none';});
    modal.querySelector('#scSave').onclick=async()=>{const v=input.value.trim();if(!v){status.textContent='Paste your API key first.';return}localStorage.setItem(KEY,v);status.textContent='Saved. Testing connection...';try{await api('/countries');status.textContent='Connected. Loading football data...';await refresh(true);modal.style.display='none';toast('SCORIVO is connected to live football data.')}catch(e){status.textContent=e.message;}};
    modal.querySelector('#scClear').onclick=()=>{localStorage.removeItem(KEY);input.value='';status.textContent='Key cleared.';};
  }

  function matchRow(m) {
    const h=m.teams?.home?.name||'Home', a=m.teams?.away?.name||'Away';
    const hs=m.goals?.home ?? '-', as=m.goals?.away ?? '-'; const st=m.fixture?.status?.short||'NS';
    const time=st==='NS'?new Date(m.fixture.date).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}):(st==='FT'?'FT':(m.fixture?.status?.elapsed??'')+"'");
    return `<div class="match-row" data-api-search="${esc((h+' '+a+' '+(m.league?.name||'')).toLowerCase())}"><div class="match-time">${esc(time)}</div><div class="teams"><div class="team-line"><span>${esc(h)}</span><span>${hs}</span></div><div class="team-line"><span>${esc(a)}</span><span>${as}</span></div><div class="league-label">${esc(m.league?.name||'')}</div></div><span>›</span></div>`;
  }

  async function loadMatches() {
    const data=await api('/fixtures?date='+today());
    const box=document.getElementById('matchList'); if(!box) return;
    box.innerHTML=data.length?data.slice(0,100).map(matchRow).join(''):'<div style="padding:25px;text-align:center;color:var(--muted)">No matches returned today.</div>';
    const count=document.getElementById('scorivoMatchCount'); if(count) count.textContent=data.length;
  }

  async function loadLive() {
    const data=await api('/fixtures?live=all');
    const featured=document.querySelector('.featured');
    if(featured){
      const old=featured.querySelector('.match-center');
      if(data[0] && old){const m=data[0];old.innerHTML=`<div><div class="club-badge">⚽</div><div class="club-name">${esc(m.teams.home.name)}</div></div><div><div class="score">${m.goals.home??0} : ${m.goals.away??0}</div><div class="minute">${m.fixture.status.elapsed??0}'</div></div><div><div class="club-badge">⚽</div><div class="club-name">${esc(m.teams.away.name)}</div></div>`;}
      if(data.length && featured.querySelector('.live-label')) featured.querySelector('.live-label').innerHTML='<i></i> LIVE NOW · '+data.length;
    }
  }

  async function loadInjuries() {
    const data=await api('/injuries?date='+today()); const card=document.getElementById('injuries'); if(!card) return;
    const title=card.querySelector('.section-title'); card.innerHTML=''; if(title) card.appendChild(title);
    const wrap=document.createElement('div');
    wrap.innerHTML=data.slice(0,40).map(x=>`<div class="injury-row"><div class="mini-avatar">⚕</div><div><div class="injury-name">${esc(x.player?.name||'Player')}</div><div class="injury-type">${esc(x.player?.reason||'Availability update')} · ${esc(x.team?.name||'')}</div></div><div class="status ${String(x.player?.type||'').toLowerCase().includes('question')?'doubt':'out'}">${esc(x.player?.type||'OUT')}</div></div>`).join('')||'<div style="padding:25px;text-align:center;color:var(--muted)">No injury data returned today.</div>';
    card.appendChild(wrap);
  }

  async function loadLeagues() {
    const data=await api('/leagues?current=true');
    let side=document.querySelector('.sidebar'); if(side){let old=document.getElementById('scorivoLiveLeagues');if(old)old.remove();let h=document.createElement('div');h.id='scorivoLiveLeagues';h.innerHTML='<div class="side-divider"></div><h4>Live competitions</h4>'+data.slice(0,15).map(x=>`<div class="side-link">🏆 ${esc(x.league.name)}</div>`).join('');side.appendChild(h);}
  }

  async function refresh(manual=false) {
    if(!key()) return;
    try {
      await Promise.all([loadLive(),loadMatches(),loadInjuries(),loadLeagues()]);
      const old=document.getElementById('scorivoConnected'); if(old) old.textContent='● API connected · updated '+new Date().toLocaleTimeString();
      if(manual) toast('Scores, fixtures and injuries updated.');
    } catch(e) { toast(e.message); console.error(e); }
  }

  function addConnectionBadge(){let e=document.getElementById('scorivoConnected');if(e)return;e=document.createElement('div');e.id='scorivoConnected';e.textContent=key()?'● API key saved':'○ API not connected';Object.assign(e.style,{position:'fixed',left:'18px',bottom:'18px',zIndex:999,font:'10px system-ui',padding:'8px 11px',borderRadius:'10px',background:'var(--surface-solid,#fff)',color:'var(--text,#062525)',border:'1px solid var(--line,#ddd)'});document.body.appendChild(e);}

  function installRefreshButton(){let b=document.createElement('button');b.textContent='↻ Refresh scores';Object.assign(b.style,{position:'fixed',right:'18px',bottom:'66px',zIndex:998,border:'1px solid var(--line,#ddd)',borderRadius:'999px',padding:'9px 13px',background:'var(--surface-solid,#fff)',color:'var(--text,#062525)',fontWeight:'800',fontSize:'11px'});b.onclick=()=>refresh(true);document.body.appendChild(b);}

  window.addEventListener('load',()=>{ensureSettings();addConnectionBadge();installRefreshButton();if(key())refresh(false);});
})();