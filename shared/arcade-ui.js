/* Mode-aware scoreboards and small phase notices, shared by arcade and football. */
(function(root){'use strict';
 const A=SzMiniGames,D=SzMiniData,R=SzArcadeRules,t=s=>szLocale.t(s),esc=s=>workshopEscape(String(s)),game=$('game');
 const board=document.createElement('div'),notice=document.createElement('div');board.id='sz-arcade-board';notice.id='sz-arcade-notice';for(const e of[board,notice]){e.hidden=true;e.dataset.noTranslate='';game.append(e);}let last=0,signature='',noticeSignature='',resultSignature='';
 const active=()=>A.active()&&!game.hidden&&!!G.mg;
 function columns(kind){return kind==='football'?[['goals','Gole'],['assists','Asysty'],['passes','Podania'],['saves','Obrony']]:kind==='bomb'?[['bombPasses','Przekazania'],['status','Status']]:[['eliminations','Eliminacje'],['hits','Trafienia'],['throws','Rzuty']];}
 function tableHTML(final=false){const g=G,m=g.mg,kind=m.kind,cols=columns(kind),football=kind==='football',ffa=kind==='bomb';
  const order=players=>players.slice().sort((a,b)=>Number(b.alive)-Number(a.alive)||(football?(b.mgStats?.goals||0)-(a.mgStats?.goals||0)||(b.mgStats?.assists||0)-(a.mgStats?.assists||0):(b.mgPoints||0)-(a.mgPoints||0))||nm(a).localeCompare(nm(b)));
  function row(p){const st=R.stats(p.mgStats),i=g.ps.indexOf(p),own=p===g.me,carrier=ffa&&m.bomb.carrier===i&&p.alive;
   const role=football&&p.mgKeeper?'<small>'+esc(t('BRAMKARZ'))+'</small>':!p.alive?'<small>'+esc(t('Wyeliminowany'))+'</small>':'';
   const ownGoal=st.ownGoals?'<small class="ar-own-goal">'+st.ownGoals+' × '+esc(t('Gol samobójczy'))+'</small>':'';
   const cells=cols.map(([key])=>'<td data-arcade-stat="'+key+'">'+(key==='status'?esc(t(p.alive?(carrier?'Masz bombę!':'W grze'):'Wyeliminowany')):st[key])+'</td>').join('');
   return '<tr class="'+(own?'ar-self ':'')+(!p.alive?'ar-eliminated ':'')+(carrier?'ar-carrier':'')+'" data-arcade-player="'+i+'"><td><div class="ar-player-cell"><span class="ar-player-dot '+(p.team==='CT'?'ct':'t')+'"></span><span class="ar-player-name"><strong data-user-content>'+esc(nm(p))+'</strong>'+role+ownGoal+'</span></div></td>'+cells+'</tr>';
  }
  function team(team){const list=order(g.ps.filter(p=>p.team===team));return '<section class="ar-team '+(team==='CT'?'ct':'t')+'"><div class="ar-team-title"><strong>'+esc(t(team==='CT'?'Drużyna niebieska':'Drużyna pomarańczowa'))+'</strong><b>'+(football||kind==='snow'?g.sc[team]:list.filter(p=>p.alive).length)+'</b></div>'+grid(list)+'</section>';}
  function grid(list){return '<table><thead><tr><th>'+esc(t('Gracz'))+'</th>'+cols.map(([,name])=>'<th>'+esc(t(name))+'</th>').join('')+'</tr></thead><tbody>'+list.map(row).join('')+'</tbody></table>';}
  return '<section class="ar-table '+(final?'ar-final':'')+'"'+(final?' data-arcade-final':'')+'><header>'+A.view.icon(kind)+'<div><small>'+esc(t(final?'Koniec meczu':'Tabela wyników'))+'</small><h2>'+esc(t(D.specs[kind].title))+'</h2></div><span class="ar-match-score">'+(ffa?g.ps.filter(p=>p.alive).length+' / '+g.ps.length:kind==='grenade'?g.ps.filter(p=>p.alive&&p.team==='CT').length+' : '+g.ps.filter(p=>p.alive&&p.team==='T').length:g.sc.CT+' : '+g.sc.T)+'</span></header><div class="ar-table-body">'+(ffa?'<section class="ar-team ar-ffa"><div class="ar-team-title"><strong>'+esc(t('Ostatni na arenie wygrywa'))+'</strong></div>'+grid(order(g.ps))+'</section>':'<div class="ar-table-teams">'+team('CT')+team('T')+'</div>')+'</div><footer><span>'+esc(t(football?'Gole i asysty są naliczane przez hosta meczu.':'Wyniki bieżącej minigry'))+'</span>'+(final?'<button type="button" onclick="quit()">'+esc(t('Wróć do menu'))+'</button>':'<kbd>'+esc(t('Puść TAB, aby wrócić do gry'))+'</kbd>')+'</footer></section>';
 }
 function phaseHTML(){const g=G,m=g.mg,warmup=m.phase==='warmup',goal=m.phase==='goal',result=m.phase==='result',meta=m.goalReplay,scorer=meta&&g.ps[meta.scorer];
  let title=warmup?'Zaraz zaczynamy':goal?'GOL!':m.result?.team==='draw'?'Remis':m.result?.player!=null?null:m.result?.team==='CT'?'Drużyna niebieska wygrywa':'Drużyna pomarańczowa wygrywa';
  const who=!title&&m.result?.player!=null?nm(g.ps[m.result.player]):null,subtitle=warmup?t(D.specs[m.kind].control):goal?(scorer?'<span data-user-content>'+esc(nm(scorer))+'</span>'+(meta.ownGoal?' · '+esc(t('Gol samobójczy')):''):esc(t('Gol dla drużyny'))):esc(t('Następna minigra za'));
  return '<div class="ar-phase '+(goal?'goal':result?'result':'')+'"><span class="ar-phase-count">'+Math.max(1,Math.ceil(m.time))+'</span><div><strong'+(who?' data-user-content':'')+'>'+esc(who||t(title))+'</strong><small>'+subtitle+'</small></div>'+(goal?'<b>'+g.sc.CT+' : '+g.sc.T+'</b>':'')+'</div>';
 }
 function update(force=false){if(!active()){board.hidden=notice.hidden=true;signature=noticeSignature=resultSignature='';return;}const g=G,m=g.mg,shown=!!keys.tab&&!g.paused&&!g.intro&&!g.netWaiting&&!['vote','roulette'].includes(m.phase)&&!g.over;board.hidden=!shown;const now=performance.now();if(!force&&now-last<100)return;last=now;
  if(shown){const html=tableHTML();if(html!==signature){signature=html;board.innerHTML=html;}}
  const showNotice=!shown&&!g.paused&&!g.over&&!g.netWaiting&&!SzFootballReplay.active()&&(m.phase==='warmup'||m.phase==='goal'||m.phase==='result'&&!A.standalone());notice.hidden=!showNotice;if(showNotice){const html=phaseHTML();if(html!==noticeSignature){noticeSignature=html;notice.innerHTML=html;}}
  if(A.standalone()&&m.phase==='result'&&g.over){const html=tableHTML(true),o=$('ov');if(resultSignature!==html||!o.querySelector('[data-arcade-final]')){resultSignature=html;o.innerHTML=html;o.style.display='flex';}}
 }
 const draw=root.draw;root.draw=function(...args){const result=draw(...args);update();return result;};
 addEventListener('keydown',event=>{if(event.key==='Tab'&&active()&&!G.paused&&!G.over&&!['vote','roulette'].includes(G.mg.phase)&&!event.target.closest?.('input,textarea,dialog')){event.preventDefault();event.stopImmediatePropagation();keys.tab=1;update(true);root.SzMatchHud?.update(true);}},true);
 addEventListener('keyup',event=>{if(event.key==='Tab'){keys.tab=0;if(active()){event.preventDefault();update(true);root.SzMatchHud?.update(true);}}},true);
 document.addEventListener('sz-language',()=>{signature=noticeSignature=resultSignature='';update(true);});
 root.SzArcadeUI={active,update,tableHTML};
})(globalThis);
