function seedRecoveredAnswerKeys(){
  const recovered={
    '2019':['1','4','1','4','2','2','1','4','4','1','3','4','3','3','4','1','4','2','3','1','1','3','2','4','3','4','1','4','3','4','1','4','3','2','4','2','3','2','3','2','1','1','2','3','1','1','4',null,'3','4'],
    '2017':['3','4','3',null,'4','3','3','2','3','1','2','4','2','3','4','1','2','4','1','4','4','1','1','3','3','1','1','4','4','1','4','1','2','3','3','4','3','2','2','3','2','4','1','4','2','3','4',null,'4','1'],
    '2016':[null,'4','3','2','3','3','3','1','2','4','1','2','2','1','3','1','4','1','4','1','4','3','2','3','2','1','3','4','3','4','4','1','3','2','4','4','2','1','2','1','3','4','2','2','3','2','4',null,'3','1']
  };
  const all=keys(); let changed=false;
  Object.entries(recovered).forEach(([y,k])=>{if(!Array.isArray(all[y])||all[y].length!==50){all[y]=k;changed=true}});
  if(changed)localStorage.setItem('takkenAnswerKeys',JSON.stringify(all));
}
function seedRecoveredRecords(){
  const all=records();
  const existing=new Set(all.map(r=>r?.meta?.importId).filter(Boolean));
  const makeItems=(year,partial={})=>{
    const k=keys()[String(year)]||[];
    return Array.from({length:50},(_,i)=>{
      const q=i+1,p=partial[q]||{},correct=k[i]??null;
      const omitted=correct===null;
      const answer=p.answer||'';
      return {q,section:sectionOf(q),answer,themes:p.themes||[],difficulty:p.difficulty||'',omitted,correct,isCorrect:omitted||!correct||!answer?null:answer===correct};
    });
  };
  const partial2016={
    2:{answer:'2',themes:['制限行為能力者'],difficulty:'A'},
    3:{answer:'2',themes:['意思表示','物権変動'],difficulty:'A'},
    4:{answer:'1',themes:['抵当権'],difficulty:'C'},
    5:{answer:'3',themes:['債権譲渡'],difficulty:'B'},
    6:{answer:'1',themes:['買主の救済（担保責任等）'],difficulty:'A'},
    7:{answer:'2',themes:['賃貸借','不法行為'],difficulty:'B'},
    8:{answer:'1',themes:['転貸借'],difficulty:'A'},
    9:{answer:'2',themes:['不法行為'],difficulty:'A'}
  };
  const seed=[
    {meta:{date:'2026-09-03',year:'2019',round:'1',border:'35',minutes:'60',importId:'chatgpt-2019-20260903',importedScore:34,importedDen:49,importedSectionStats:{'権利関係':[8,14],'法令上の制限':[7,8],'税・その他':[2,3],'宅建業法':[13,20],'その他':[4,4]}},items:makeItems(2019),createdAt:'2026-09-03T12:00:00+09:00'},
    {meta:{date:'2026-09-04',year:'2017',round:'1',border:'35',minutes:'',importId:'chatgpt-2017-20260904'},items:makeItems(2017),createdAt:'2026-09-04T12:00:00+09:00'},
    {meta:{date:'2026-09-05',year:'2016',round:'1',border:'35',minutes:'',importId:'chatgpt-2016-20260905'},items:makeItems(2016,partial2016),createdAt:'2026-09-05T12:00:00+09:00'}
  ];
  let changed=false;
  seed.forEach(r=>{if(!existing.has(r.meta.importId)){all.push(r);changed=true}});
  if(changed)localStorage.setItem('takkenRecords',JSON.stringify(all));
}

const RECOVERED_MIGRATION_FLAG='takkenRecoveredDataV1Complete';
function recoveredDataPresent(){
  const requiredIds=['chatgpt-2019-20260903','chatgpt-2017-20260904','chatgpt-2016-20260905'];
  const rs=records();
  const ids=new Set(rs.map(r=>r?.meta?.importId).filter(Boolean));
  const ks=keys();
  return requiredIds.every(id=>ids.has(id))&&['2019','2017','2016'].every(y=>Array.isArray(ks[y])&&ks[y].length===50);
}
function runRecoveredMigrationOnce(){
  try{
    if(localStorage.getItem(RECOVERED_MIGRATION_FLAG)==='1')return;
    if(recoveredDataPresent()){
      localStorage.setItem(RECOVERED_MIGRATION_FLAG,'1');
      return;
    }
    seedRecoveredAnswerKeys();
    seedRecoveredRecords();
    if(recoveredDataPresent())localStorage.setItem(RECOVERED_MIGRATION_FLAG,'1');
  }catch(e){
    console.error('Recovered-data migration skipped:',e);
  }
}

function build(){tabs=$('tabs');pages=$('pages');tabs.innerHTML=PAGE_LABELS.map((x,i)=>`<button class="tab ${i===0?'active':''}" data-i="${i}">${x}</button>`).join('');pages.innerHTML=pageHTML();bindDom();catnav.innerHTML=SECTIONS.map(s=>`<button class="chip" data-target="sec${s[1]}">${s[0]} ${s[1]}–${s[2]}</button>`).join('');questions.innerHTML=SECTIONS.map(s=>`<div class="sectionBlock" id="sec${s[1]}"><div class="secTitle"><b>${s[0]}</b><span class="badge">問${s[1]}–${s[2]}</span></div>${Array.from({length:s[2]-s[1]+1},(_,i)=>qHTML(s[1]+i)).join('')}</div>`).join('');wire();runRecoveredMigrationOnce();renderAllThemeSelects();renderThemeManager();renderKeys();renderPastResults();renderStatistics();updateHint();updateKeyStatus();setDefaultDate()}
