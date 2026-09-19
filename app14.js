// v5.6 year/question metadata: learn theme + difficulty from round 1 and auto-apply on later rounds
const TAKKEN_YEAR_Q_META_KEY='takkenYearQuestionMetaV1';
let yearMetaApplyTimer=null;
let lastYearMetaNotice='';

function yearQuestionMetaStore(){
  try{
    const v=JSON.parse(localStorage.getItem(TAKKEN_YEAR_Q_META_KEY)||'{}');
    return v&&typeof v==='object'&&!Array.isArray(v)?v:{};
  }catch(e){return{}}
}
function saveYearQuestionMetaStore(v){
  localStorage.setItem(TAKKEN_YEAR_Q_META_KEY,JSON.stringify(v));
}

function metaMapFromRecord(r){
  const out={};
  (r?.items||[]).forEach(x=>{
    const q=Number(x.q);
    if(!q||q<1||q>50)return;
    const themes=Array.isArray(x.themes)?[...new Set(x.themes.filter(Boolean))]:[];
    const difficulty=['A','B','C','D'].includes(String(x.difficulty||''))?String(x.difficulty):'';
    if(themes.length||difficulty)out[q]={themes,difficulty};
  });
  return out;
}

function latestRoundOneRecordForYear(y){
  return records()
    .filter(r=>String(r.meta?.year||'')===String(y)&&Number(r.meta?.round)===1)
    .sort((a,b)=>{
      const ad=String(a.meta?.date||a.createdAt||''),bd=String(b.meta?.date||b.createdAt||'');
      return ad.localeCompare(bd)||String(a.createdAt||'').localeCompare(String(b.createdAt||''));
    }).at(-1)||null;
}

function persistYearQuestionMetaFromRecord(r){
  const y=String(r?.meta?.year||'').trim();
  if(!y||Number(r?.meta?.round)!==1)return false;
  const map=metaMapFromRecord(r);
  if(!Object.keys(map).length)return false;
  const all=yearQuestionMetaStore();
  all[y]={
    sourceRound:1,
    sourceDate:r.meta?.date||'',
    savedAt:new Date().toISOString(),
    questions:map
  };
  saveYearQuestionMetaStore(all);
  return true;
}

function migrateRoundOneMetadata(){
  const all=yearQuestionMetaStore();
  let changed=false;
  const years=[...new Set(records().filter(r=>Number(r.meta?.round)===1).map(r=>String(r.meta?.year||'').trim()).filter(Boolean))];
  years.forEach(y=>{
    if(all[y]?.questions&&Object.keys(all[y].questions).length)return;
    const r=latestRoundOneRecordForYear(y);
    const map=metaMapFromRecord(r);
    if(!Object.keys(map).length)return;
    all[y]={sourceRound:1,sourceDate:r.meta?.date||'',savedAt:new Date().toISOString(),questions:map};
    changed=true;
  });
  if(changed)saveYearQuestionMetaStore(all);
}

function yearQuestionMetaFor(y){
  const stored=yearQuestionMetaStore()[String(y)];
  if(stored?.questions&&Object.keys(stored.questions).length)return stored;
  const r=latestRoundOneRecordForYear(y);
  if(!r)return null;
  persistYearQuestionMetaFromRecord(r);
  return yearQuestionMetaStore()[String(y)]||null;
}

function showYearMetaNotice(text){
  const signature=`${year.value.trim()}|${round.value}|${text}`;
  if(signature===lastYearMetaNotice)return;
  lastYearMetaNotice=signature;
  const n=document.createElement('div');
  n.className='restoreToast';
  n.textContent=text;
  document.body.appendChild(n);
  setTimeout(()=>n.remove(),2200);
}

function updateRoundOneMetaHint(){
  const hint=$('yearMetaHint'),btn=$('copyYearMeta');
  if(!hint)return;
  const y=year.value.trim(),r=Number(round.value||0);
  if(!y){
    hint.textContent='年度を入れると、1周目で付けたテーマ・難易度を2周目以降へ自動反映します。';
    return;
  }
  const meta=yearQuestionMetaFor(y);
  if(meta&&r>1){
    const count=Object.keys(meta.questions||{}).length;
    hint.textContent=`${y}年度・1周目のテーマ/難易度を自動反映（${count}問分）`;
    if(btn){btn.disabled=false;btn.textContent='1周目の設定を再反映'}
  }else if(meta){
    const count=Object.keys(meta.questions||{}).length;
    hint.textContent=`${y}年度の1周目設定を保存済み（${count}問分）。2周目以降は自動で入ります。`;
    if(btn){btn.disabled=false;btn.textContent='1周目の設定を反映'}
  }else{
    hint.textContent=`${y}年度は1周目を保存すると、テーマ・難易度を問題ごとに記憶します。`;
  }
}

function applyRoundOneMetadata(options={}){
  const y=year.value.trim(),r=Number(round.value||0);
  if(!y||(!options.force&&r<=1)){updateRoundOneMetaHint();return false}
  const meta=yearQuestionMetaFor(y);
  if(!meta){updateRoundOneMetaHint();return false}
  let count=0;
  for(let q=1;q<=50;q++){
    const m=meta.questions?.[q];
    if(!m)continue;
    setSelectedThemes(q,Array.isArray(m.themes)?m.themes:[]);
    document.querySelectorAll(`input[name=d${q}]`).forEach(el=>el.checked=String(el.value)===String(m.difficulty||''));
    count++;
  }
  if(typeof updateInputProgress==='function')updateInputProgress();
  if(typeof scheduleDraftSave==='function')scheduleDraftSave();
  updateRoundOneMetaHint();
  if(!options.silent&&count)showYearMetaNotice(`${y}年度の1周目設定を${count}問へ反映しました`);
  return count>0;
}

function scheduleRoundOneMetaApply(){
  clearTimeout(yearMetaApplyTimer);
  yearMetaApplyTimer=setTimeout(()=>{
    const r=Number(round.value||0);
    if(r>1)applyRoundOneMetadata();
    else updateRoundOneMetaHint();
  },120);
}

function installRoundOneMetadataAutomation(){
  migrateRoundOneMetadata();

  year.addEventListener('input',scheduleRoundOneMetaApply);
  round.addEventListener('input',scheduleRoundOneMetaApply);
  year.addEventListener('change',scheduleRoundOneMetaApply);
  round.addEventListener('change',scheduleRoundOneMetaApply);

  const btn=$('copyYearMeta');
  if(btn){
    btn.onclick=()=>applyRoundOneMetadata({force:true});
  }

  // A restored draft is already the user's current work; never overwrite it on boot.
  const hasDraft=typeof readDraft==='function'&&!!readDraft();
  if(!hasDraft&&Number(round.value||0)>1)applyRoundOneMetadata({silent:true});
  else updateRoundOneMetaHint();
}

const _gradeV56=grade;
grade=function(mode){
  const before=records().length;
  _gradeV56(mode);
  const list=records();
  if(list.length>before){
    const r=list.at(-1);
    if(Number(r?.meta?.round)===1){
      persistYearQuestionMetaFromRecord(r);
      updateRoundOneMetaHint();
    }
  }
};

installRoundOneMetadataAutomation();
