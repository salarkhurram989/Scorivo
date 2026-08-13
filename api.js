/* SCORIVO — RapidAPI Smart API football connector
   Provider: Free API Live Football Data (Smart API)
   The RapidAPI key is stored only in this browser and is never committed to GitHub.
*/
(() => {
  const HOST = 'free-api-live-football-data.p.rapidapi.com';
  const BASE = `https://${HOST}`;
  const KEY = 'scorivo_rapidapi_key';
  const LIVE_PATH = '/football-current-live';
  const STANDING_PATH = '/football-get-standing-home';

  const getKey = () => localStorage.getItem(KEY) || '';
  const today = () => new Date().toISOString().slice(0, 10);
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function toast(msg) {
    let t = document.getElementById('scorivo-api-toast');
    if (!t) {
      t = document.createElement('div'); t.id = 'scorivo-api-toast';
      Object.assign(t.style,{position:'fixed',bottom:'25px',left:'50%',transform:'translateX(-50%)',zIndex:9999,background:'#062b2a',color:'#fff',padding:'12px 18px',borderRadius:'12px',font:'12px system-ui',boxShadow:'0 15px 40px #0005'});
      document.body.appendChild(t);
    }
    t.textContent = msg; t.style.display='block'; clearTimeout(t._timer); t._timer=setTimeout(()=>t.style.display='none',3500);
  }

  async function api(path, params = {}) {
    const key = getKey();
    if (!key) throw new Error('Connect your RapidAPI key first.');
    const url = new URL(BASE + path);
    Object.entries(params).forEach(([k,v]) => { if(v !== undefined && v !== null && v !== '') url.searchParams.set(k,v); });
    const res = await fetch(url, {headers:{'X-RapidAPI-Key':key,'X-RapidAPI-Host':HOST,'Accept':'application/json'}});
    const text = await res.text();
    let data; try { data = JSON.parse(text); } catch { throw new Error(`RapidAPI returned ${res.status} with a non-JSON response.`); }
    if (!res.ok) throw new Error(data?.message || data?.error || `RapidAPI request failed (${res.status})`);
    return data;
  }

  function listFrom(data, keys=['response','results','data','suggestions','events','matches','live','leagues','standing']) {
    if (Array.isArray(data)) return data;
    for (const k of keys) if (Array.isArray(data?.[k])) return data[k];
    for (const k of keys) if (Array.isArray(data?.response?.[k])) return data.response[k];
    return [];
  }

  function empty(el, message) { if(el) el.innerHTML=`<div style="padding:28px 16px;text-align:center;color:var(--muted);font-size:12px">${esc(message)}</div>`; }

  function clearDemoData() {
    empty(document.getElementById('matchList'), getKey() ? 'Loading real matches…' : 'Connect RapidAPI to load real matches.');
    const featured=document.querySelector('.featured');
    if(featured){ const l=featured.querySelector('.live-label'); if(l) l.innerHTML='<i></i> LIVE MATCHES'; const c=featured.querySelector('.match-center'); if(c)c.innerHTML='<div style="grid-column:1/-1;text-align:center;padding:28px 10px;color:#a9c8c5;font-size:13px">No live match loaded yet.</div>'; const w=featured.querySelector('.watch'); if(w)w.style.display='none'; }
    const injuries=document.getElementById('injuries');
    if(injuries){ const title=injuries.querySelector('.section-title'); injuries.innerHTML=''; if(title) injuries.appendChild(title); empty(injuries,getKey()?'Loading real injury data…':'Connect RapidAPI to load injury data.'); }
    document.querySelectorAll('.player-dot').forEach(p=>p.remove());
    const formation=document.querySelector('.formation'); if(formation) formation.innerHTML='<span>Formation</span><strong>—</strong><span>Waiting for real match data</span>';
    const player=document.querySelector('.player-card'); if(player){const n=player.querySelector('.player-name'),r=player.querySelector('.player-role'),s=player.querySelector('.player-stats');if(n)n.innerHTML='Top player<br>loading…';if(r)r.textContent='Real player data will appear here';if(s)s.innerHTML='<div class="stat"><strong>—</strong><small>Matches</small></div><div class="stat"><strong>—</strong><small>Goals</small></div><div class="stat"><strong>—</strong><small>Assists</small></div>';}
    const standings=document.querySelector('.standings');
    if(standings) standings.innerHTML='<div class="stand-row header"><span>#</span><span>TEAM</span><span>P</span><span>GD</span><span>PTS</span></div><div style="padding:20px;text-align:center;color:var(--muted);font-size:12px">'+(getKey()?'Loading real standings…':'Connect RapidAPI to load real standings.')+'</div>';
  }

  function ensureSettings(){
    if(document.getElementById('scorivoApiBtn'))return;
    const btn=document.createElement('button');btn.id='scorivoApiBtn';btn.textContent='⚙ API';Object.assign(btn.style,{position:'fixed',right:'18px',bottom:'18px',zIndex:1000,border:'0',borderRadius:'999px',padding:'11px 16px',background:'#20c9bb',color:'#032b29',fontWeight:'900',boxShadow:'0 8px 25px #0003'});document.body.appendChild(btn);
    const modal=document.createElement('div');modal.id='scorivoApiModal';Object.assign(modal.style,{display:'none',position:'fixed',inset:0,zIndex:999,background:'#0008',alignItems:'center',justifyContent:'center',padding:'20px'});
    modal.innerHTML=`<div style="width:min(520px,100%);background:var(--surface-solid,#fff);color:var(--text,#062525);border:1px solid var(--line,#ddd);border-radius:20px;padding:22px;box-shadow:0 25px 80px #0006;font-family:system-ui"><div style="display:flex;justify-content:space-between;align-items:center"><h2 style="margin:0">SCORIVO API</h2><button id="scClose" style="border:0;background:transparent;font-size:22px">×</button></div><p style="color:var(--muted,#65817f);font-size:13px;line-height:1.5">Connect the free <b>Free API Live Football Data</b> service through RapidAPI. Your key stays only in this browser and is never written to GitHub.</p><input id="scKey" type="password" placeholder="Paste your RapidAPI key" style="width:100%;height:44px;border:1px solid var(--line,#ddd);border-radius:11px;padding:0 12px;background:var(--surface,#fff);color:var(--text,#062525)"><div style="display:flex;gap:8px;margin-top:12px"><button id="scSave" style="border:0;border-radius:10px;padding:10px 15px;background:#20c9bb;font-weight:800">Connect & Load</button><button id="scClear" style="border:1px solid var(--line,#ddd);border-radius:10px;padding:10px 15px;background:transparent;color:inherit">Clear</button></div><div id="scStatus" style="margin-top:12px;color:var(--muted,#65817f);font-size:11px"></div></div>`;
    document.body.appendChild(modal);
    const input=modal.querySelector('#scKey'),status=modal.querySelector('#scStatus');input.value=getKey();
    btn.onclick=()=>{modal.style.display='flex';input.value=getKey();};modal.querySelector('#scClose').onclick=()=>modal.style.display='none';modal.addEventListener('click',e=>{if(e.target===modal)modal.style.display='none';});
    modal.querySelector('#scSave').onclick=async()=>{const v=input.value.trim();if(!v){status.textContent='Paste your RapidAPI key first.';return}localStorage.setItem(KEY,v);status.textContent='Saved. Testing RapidAPI…';clearDemoData();try{await api(LIVE_PATH);status.textContent='Connected. Loading real football data…';await refresh(true);modal.style.display='none';toast('SCORIVO is connected to RapidAPI.')}catch(e){status.textContent='Connection failed: '+e.message;clearDemoData();}};
    modal.querySelector('#scClear').onclick=()=>{localStorage.removeItem(KEY);input.value='';status.textContent='Key cleared. Real data only.';clearDemoData();updateBadge();};
  }

  function normaliseMatch(x){
    const home=x?.homeTeam||x?.home_team||x?.home||x?.teams?.home||x?.teamHome||x?.participants?.find?.(p=>p?.meta?.location==='home')||{};
    const away=x?.awayTeam||x?.away_team||x?.away||x?.teams?.away||x?.teamAway||x?.participants?.find?.(p=>p?.meta?.location==='away')||{};
    const score=x?.score||x?.scores||x?.result||{};
    return {home,away,score,league:x?.league||x?.tournament||x?.competition||{},date:x?.startTime||x?.start_time||x?.start_date||x?.date||x?.startTimestamp,status:x?.status||x?.eventStatus||x?.matchStatus||''};
  }
  const teamName=t=>t?.name||t?.teamName||t?.team_name||t?.shortName||'Unknown';
  const scoreValue=(s,side)=>s?.[side] ?? s?.[side+'_score'] ?? s?.goals?.[side] ?? s?.current?.[side] ?? s?.display?.[side] ?? '-';

  function matchRow(raw){
    const m=normaliseMatch(raw),h=teamName(m.home),a=teamName(m.away),hs=scoreValue(m.score,'home'),as=scoreValue(m.score,'away');
    const d=m.date?new Date(m.date):null;const time=m.status?.short||m.status?.name||m.status||((d&&!isNaN(d))?d.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'}):'—');
    return `<div class="match-row" data-api-search="${esc((h+' '+a+' '+(m.league?.name||m.leagueName||'')).toLowerCase())}"><div class="match-time">${esc(time)}</div><div class="teams"><div class="team-line"><span>${esc(h)}</span><span>${esc(hs)}</span></div><div class="team-line"><span>${esc(a)}</span><span>${esc(as)}</span></div><div class="league-label">${esc(m.league?.name||m.leagueName||m.tournamentName||'')}</div></div><span>›</span></div>`;
  }

  async function loadMatches(){
    const data=await api('/football-get-matches-by-date',{date:today()});
    const arr=listFrom(data,['response','results','data','events','matches']);const box=document.getElementById('matchList');if(!box)return;
    box.innerHTML=arr.length?arr.slice(0,100).map(matchRow).join(''):'<div style="padding:28px;text-align:center;color:var(--muted)">No football matches returned for today.</div>';
  }

  async function loadLive(){
    const data=await api(LIVE_PATH);const arr=listFrom(data,['live','response','results','data','events','matches']);const featured=document.querySelector('.featured');if(!featured)return;
    const label=featured.querySelector('.live-label'),old=featured.querySelector('.match-center'),watch=featured.querySelector('.watch');
    if(!arr.length){if(label)label.innerHTML='<i></i> NO LIVE MATCHES';if(old)old.innerHTML='<div style="grid-column:1/-1;text-align:center;padding:28px 10px;color:#a9c8c5;font-size:13px">There are no live football matches right now.</div>';if(watch)watch.style.display='none';return;}
    const m=normaliseMatch(arr[0]),h=teamName(m.home),a=teamName(m.away),hs=scoreValue(m.score,'home'),as=scoreValue(m.score,'away');
    if(label)label.innerHTML='<i></i> LIVE NOW · '+arr.length;if(old)old.innerHTML=`<div><div class="club-badge">⚽</div><div class="club-name">${esc(h)}</div></div><div><div class="score">${esc(hs)} : ${esc(as)}</div><div class="minute">LIVE</div></div><div><div class="club-badge">⚽</div><div class="club-name">${esc(a)}</div></div>`;if(watch)watch.style.display='inline-block';
  }

  async function loadLeagues(){
    const data=await api('/football-get-all-leagues');const arr=listFrom(data,['response','results','data','leagues']);let side=document.querySelector('.sidebar');if(side){let old=document.getElementById('scorivoLiveLeagues');if(old)old.remove();let h=document.createElement('div');h.id='scorivoLiveLeagues';h.innerHTML='<div class="side-divider"></div><h4>Competitions</h4>'+arr.slice(0,20).map(x=>`<div class="side-link">🏆 ${esc(x.name||x.league_name||x.league?.name||'Competition')}</div>`).join('');side.appendChild(h);}
  }

  async function loadStandings(){
    const box=document.querySelector('.standings');
    if(!box)return;
    box.innerHTML='<div class="stand-row header"><span>#</span><span>TEAM</span><span>P</span><span>GD</span><span>PTS</span></div><div style="padding:20px;text-align:center;color:var(--muted);font-size:12px">Loading real standings…</div>';
    try{
      const data=await api(STANDING_PATH,{leagueid:'47'});
      const rows=listFrom(data,['standing','standings','response','results','data']);
      if(!rows.length){box.innerHTML='<div class="stand-row header"><span>#</span><span>TEAM</span><span>P</span><span>GD</span><span>PTS</span></div><div style="padding:20px;text-align:center;color:var(--muted);font-size:12px">No standings returned for this league.</div>';return;}
      const getTeam=r=>r?.team_name||r?.teamName||r?.team?.name||r?.name||'Unknown team';
      const num=(...vals)=>{for(const v of vals){if(v!==undefined&&v!==null&&v!=='')return v;}return '—';};
      const teamIcon=r=>r?.team_logo||r?.team?.logo||'';
      box.innerHTML='<div class="stand-row header"><span>#</span><span>TEAM</span><span>P</span><span>GD</span><span>PTS</span></div>'+rows.slice(0,30).map((r,i)=>{
        const pos=num(r.place,r.position,i+1), played=num(r.played,r.matches_played,r.games_played), gd=num(r.goal_difference,r.goal_diff,r.goals_diff,((Number(r.goals_for)||0)-(Number(r.goals_against)||0))), pts=num(r.points,r.pts);
        const logo=teamIcon(r); const name=getTeam(r); const team=logo?`<img src="${esc(logo)}" alt="" style="width:18px;height:18px;object-fit:contain;vertical-align:middle;margin-right:6px">${esc(name)}`:`${esc(name)}`;
        return `<div class="stand-row"><b>${esc(pos)}</b><span>${team}</span><span>${esc(played)}</span><span>${esc(gd>0?'+'+gd:gd)}</span><b>${esc(pts)}</b></div>`;
      }).join('');
      const title=document.querySelector('#leagues .section-title h2'); if(title)title.textContent='Premier League';
      const season=document.querySelector('#leagues .section-title span'); if(season)season.textContent='Live standings';
    }catch(e){
      console.warn('SCORIVO standings:',e);
      box.innerHTML='<div class="stand-row header"><span>#</span><span>TEAM</span><span>P</span><span>GD</span><span>PTS</span></div><div style="padding:20px;text-align:center;color:var(--muted);font-size:12px">Standings could not be loaded. No demo data is shown.</div>';
    }
  }

  async function loadInjuries(){
    const card=document.getElementById('injuries');if(!card)return;const title=card.querySelector('.section-title');card.innerHTML='';if(title)card.appendChild(title);empty(card,'Injury data is not available from the verified RapidAPI endpoints yet.');
  }

  async function refresh(manual=false){
    if(!getKey())return;
    try{await Promise.allSettled([loadLive(),loadMatches(),loadLeagues(),loadStandings(),loadInjuries()]);updateBadge('● RapidAPI connected · updated '+new Date().toLocaleTimeString());if(manual)toast('Real football data updated.');}
    catch(e){updateBadge('⚠ RapidAPI error');toast(e.message);console.error(e);}
  }

  function updateBadge(text){let e=document.getElementById('scorivoConnected');if(!e)return;e.textContent=text||(getKey()?'● RapidAPI key saved':'○ API not connected');}
  function addConnectionBadge(){let e=document.getElementById('scorivoConnected');if(e)return;e=document.createElement('div');e.id='scorivoConnected';Object.assign(e.style,{position:'fixed',left:'18px',bottom:'18px',zIndex:999,font:'10px system-ui',padding:'8px 11px',borderRadius:'10px',background:'var(--surface-solid,#fff)',color:'var(--text,#062525)',border:'1px solid var(--line,#ddd)'});document.body.appendChild(e);updateBadge();}
  function installRefreshButton(){if(document.getElementById('scorivoRefresh'))return;let b=document.createElement('button');b.id='scorivoRefresh';b.textContent='↻ Refresh scores';Object.assign(b.style,{position:'fixed',right:'18px',bottom:'66px',zIndex:998,border:'1px solid var(--line,#ddd)',borderRadius:'999px',padding:'9px 13px',background:'var(--surface-solid,#fff)',color:'var(--text,#062525)',fontWeight:'800',fontSize:'11px'});b.onclick=()=>refresh(true);document.body.appendChild(b);}

  window.addEventListener('load',()=>{clearDemoData();ensureSettings();addConnectionBadge();installRefreshButton();if(getKey())refresh(false);});
})();
