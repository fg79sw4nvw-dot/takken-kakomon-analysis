// v5.5 input convenience: draft autosave, bulk answers, progress, same-year metadata copy
const TAKKEN_DRAFT_KEY='takkenCurrentDraftV1';
let draftSaveTimer=null;

function currentQuestionState(){
  const items=[];
  for(let q=1;q<=50;q++){
    const card=$('q'+q);
    if(!card)continue;
    const answer=(document.querySelector(`input[name=a${q}]:checked`)||{}).value||'';
    const difficulty=(document.querySelector(`input[name=d${q}]:checked`)||{}).value||'';
    items.push({
      q,
      answer,
      difficulty,
      themes:getSelectedThemes(q),
      omitted:card.dataset.omitted==='1'
    });
  }
  return items;
}

function captureDraft(){
  if(!date||!year||!round||!border||!minutes)return null;
  const items=currentQuestionState();
  const draft={
    version:1,
    savedAt:new Date().toISOString(),
    meta:{date:date.value,year:year.value.trim(),round:round.value,border:border.value,minutes:minutes.value},
    answerKey:answerKey?.value||'',
    items
  };
  const meaningful=!!(
    draft.meta.year||
    draft.meta.round||
    draft.meta.border||
    draft.answerKey.trim()||
    items.some(x=>x.answer||x.difficulty||x.omitted)
  );
  if(!meaningful)return null;
  return draft;
}

function saveDraftNow(){
  try{
    const draft=captureDraft();
    if(draft)localStorage.setItem(TAKKEN_DRAFT_KEY,JSON.stringify(draft));
    else localStorage.removeItem(TAKKEN_DRAFT_KEY);
    updateDraftLabel(draft?.savedAt||null);
  }catch(e){console.warn('Draft save skipped',e)}
}

function scheduleDraftSave(){
  clearTimeout(draftSaveTimer);
  draftSaveTimer=setTimeout(saveDraftNow,220);
}

function clearDraft(){
  try{localStorage.removeItem(TAKKEN_DRAFT_KEY)}catch(e){}
  updateDraftLabel(null);
}

function readDraft(){
  try{
    const v=JSON.parse(localStorage.getItem(TAKKEN_DRAFT_KEY)||'null');
    return v&&v.version===1&&Array.isArray(v.items)?v:null;
  }catch(e){return null}
}

function restoreDraft(){
  const d=readDraft();
  if(!d)return false;
  const m=d.meta||{};
  if(m.date)date.value=m.date;
  year.value=m.year||'';
  round.value=m.round||'';
  border.value=m.border||'';
  minutes.value=m.minutes||'';
  if(answerKey)answerKey.value=d.answerKey||'';
  d.items.forEach(x=>{
    const q=Number(x.q);
    if(!q||q<1||q>50)return;
    document.querySelectorAll(`input[name=a${q}]`).forEach(el=>el.checked=String(el.value)===String(x.answer||''));
    document.querySelectorAll(`input[name=d${q}]`).forEach(el=>el.checked=String(el.value)===String(x.difficulty||''));
    setSelectedThemes(q,Array.isArray(x.themes)?x.themes:[]);
    const card=$('q'+q),want=!!x.omitted,now=card?.dataset.omitted==='1';
    if(card&&want!==now)toggleOmit(q);
  });
  updateHint();
  updateKeyStatus();
  return true;
}

function updateDraftLabel(savedAt){
  const el=$('draftStatus');
  if(!el)return;
  if(!savedAt){el.textContent='入力途中は自動保存されます';return}
  const d=new Date(savedAt);
  const t=Number.isNaN(d.getTime())?'':d.toLocaleTimeString('ja-JP',{hour:'2-digit',minute:'2-digit'});
  el.textContent=t?`下書き保存済み ${t}`:'下書き保存済み';
}

function questionProgress(){
  const items=currentQuestionState();
  const omitted=items.filter(x=>x.omitted).length;
  const target=50-omitted;
  const answered=items.filter(x=>x.omitted||x.answer).length-omitted;
  const difficulty=items.filter(x=>!x.omitted&&x.difficulty).length;
  const themed=items.filter(x=>!x.omitted&&x.themes.length).length;
  return{items,omitted,target,answered,difficulty,themed};
}

function updateInputProgress(){
  const host=$('inputProgress');
  if(!host)return;
  const p=questionProgress();
  const pct=p.target?Math.round(p.answered/p.target*100):100;
  host.innerHTML=`
    <div class="inputProgressTop">
      <div><b>回答 ${p.answered}/${p.target}</b><span class="subtle">　難易度 ${p.difficulty}　テーマ ${p.themed}${p.omitted?`　省略 ${p.omitted}`:''}</span></div>
      <button class="btn secondary compactBtn" id="jumpNextUnanswered" type="button">${p.answered>=p.target?'回答入力済み':'次の未回答へ'}</button>
    </div>
    <div class="bar"><span style="width:${pct}%"></span></div>
    <div class="subtle" id="draftStatus">入力途中は自動保存されます</div>`;
  const b=$('jumpNextUnanswered');
  if(b)b.onclick=jumpToNextUnanswered;
  const d=readDraft();
  updateDraftLabel(d?.savedAt||null);
}

function jumpToNextUnanswered(){
  for(let q=1;q<=50;q++){
    const card=$('q'+q);
    if(!card||card.dataset.omitted==='1')continue;
    const ans=document.querySelector(`input[name=a${q}]:checked`);
    if(!ans){card.scrollIntoView({behavior:'smooth',block:'start'});return}
  }
  const firstDiff=currentQuestionState().find(x=>!x.omitted&&!x.difficulty);
  if(firstDiff)$('q'+firstDiff.q)?.scrollIntoView({behavior:'smooth',block:'start'});
}

function parseBulkAnswers(raw){
  const s=(raw||'').normalize('NFKC').trim();
  if(!s)return[];
  const simple=s.split(/[\s,、，/|]+/).filter(Boolean);
  if(simple.length===50&&simple.every(x=>/^[1-4-]$|^[×xX]$/.test(x))){
    return simple.map(x=>/[1-4]/.test(x)?x:null);
  }
  const compact=s.replace(/[\s,、，/|]/g,'');
  if(compact.length===50&&/^[1-4\-×xX]+$/.test(compact)){
    return [...compact].map(x=>/[1-4]/.test(x)?x:null);
  }
  return [];
}

function updateBulkAnswerStatus(){
  const ta=$('bulkAnswers'),st=$('bulkAnswerStatus');
  if(!ta||!st)return;
  const parsed=parseBulkAnswers(ta.value);
  if(parsed.length===50){
    st.textContent='50 / 50 問を読み取り';
    st.className='notice ok';
  }else{
    const rough=(ta.value.normalize('NFKC').match(/[1-4\-×xX]/g)||[]).length;
    st.textContent=`${Math.min(rough,50)} / 50 問を読み取り`;
    st.className='notice';
  }
}

function applyBulkAnswers(){
  const ta=$('bulkAnswers');
  const vals=parseBulkAnswers(ta?.value||'');
  if(vals.length!==50)return alert('50問分の回答が必要です。1〜4を50個、削除問題は「-」で入れてください。');
  vals.forEach((v,i)=>{
    const q=i+1,card=$('q'+q);
    document.querySelectorAll(`input[name=a${q}]`).forEach(el=>el.checked=v!==null&&String(el.value)===v);
    const wantOmitted=v===null,now=card?.dataset.omitted==='1';
    if(card&&wantOmitted!==now)toggleOmit(q);
  });
  updateInputProgress();
  scheduleDraftSave();
  alert('50問の回答を反映しました。');
}

function clearBulkAnswers(){
  if(!confirm('問題入力の回答だけを50問分クリアしますか？\nテーマ・難易度・省略設定は残します。'))return;
  document.querySelectorAll('#questions input[type=radio][name^=a]').forEach(el=>el.checked=false);
  const ta=$('bulkAnswers');if(ta)ta.value='';
  updateBulkAnswerStatus();
  updateInputProgress();
  scheduleDraftSave();
}

function installBulkAnswerPanel(){
  const card=document.querySelector('.page[data-page="1"] .card');
  const cat=$('catnav');
  if(!card||!cat||$('bulkAnswerPanel'))return;
  const panel=document.createElement('details');
  panel.id='bulkAnswerPanel';
  panel.className='bulkPanel';
  panel.innerHTML=`<summary>回答をまとめて入力</summary>
    <div class="subtle" style="margin:8px 0">1〜4を50問分貼り付け。空白・改行・カンマ区切り、または50桁の連続入力に対応。削除問題は「-」。</div>
    <textarea id="bulkAnswers" class="control" rows="4" placeholder="例：1 3 2 4 …"></textarea>
    <div class="notice" id="bulkAnswerStatus">0 / 50 問を読み取り</div>
    <div class="row" style="margin-top:8px"><button class="btn primary" id="applyBulkAnswers" type="button">50問に反映</button><button class="btn secondary" id="clearBulkAnswers" type="button">回答だけクリア</button></div>`;
  card.insertBefore(panel,cat);
  $('bulkAnswers').addEventListener('input',updateBulkAnswerStatus);
  $('applyBulkAnswers').onclick=applyBulkAnswers;
  $('clearBulkAnswers').onclick=clearBulkAnswers;
}

function installInputProgress(){
  const card=document.querySelector('.page[data-page="1"] .card');
  const cat=$('catnav');
  if(!card||!cat||$('inputProgress'))return;
  const host=document.createElement('div');
  host.id='inputProgress';
  host.className='inputProgress';
  card.insertBefore(host,cat);
  updateInputProgress();
}

function sameYearRecords(){
  const y=year?.value?.trim();
  if(!y)return[];
  return records().filter(r=>String(r.meta?.year||'')===y).sort((a,b)=>{
    const ar=Number(a.meta?.round||0),br=Number(b.meta?.round||0);
    if(ar!==br)return ar-br;
    const ad=a.meta?.date||a.createdAt||'',bd=b.meta?.date||b.createdAt||'';
    return String(ad).localeCompare(String(bd));
  });
}

function updateYearMetaAction(){
  const hint=$('yearMetaHint'),btn=$('copyYearMeta');
  if(!hint||!btn)return;
  const rs=sameYearRecords();
  if(!year.value.trim()){
    hint.textContent='年度を入れると、同年度の過去入力からテーマ・難易度だけ再利用できます。';
    btn.disabled=true;return;
  }
  if(!rs.length){
    hint.textContent=`${year.value.trim()}年度の過去入力はまだありません。`;
    btn.disabled=true;return;
  }
  const r=rs.at(-1);
  hint.textContent=`前回：${r.meta?.round||'-'}周目（${r.meta?.date||'-'}）`;
  btn.disabled=false;
}

function copySameYearMetadata(){
  const rs=sameYearRecords();
  if(!rs.length)return alert('同年度の過去入力がありません。');
  const r=rs.at(-1);
  if(!confirm(`${r.meta?.year||''}年度・${r.meta?.round||'-'}周目から、テーマ・難易度・省略設定だけコピーしますか？\n回答はコピーしません。`))return;
  (r.items||[]).forEach(x=>{
    const q=Number(x.q);if(!q)return;
    setSelectedThemes(q,Array.isArray(x.themes)?x.themes:[]);
    document.querySelectorAll(`input[name=d${q}]`).forEach(el=>el.checked=String(el.value)===String(x.difficulty||''));
    const card=$('q'+q),want=!!x.omitted,now=card?.dataset.omitted==='1';
    if(card&&want!==now)toggleOmit(q);
  });
  if(!round.value&&Number(r.meta?.round))round.value=String(Number(r.meta.round)+1);
  if(!border.value&&r.meta?.border)border.value=r.meta.border;
  updateInputProgress();
  scheduleDraftSave();
  showPage(1);
}

function installSameYearCopy(){
  const first=document.querySelector('.page[data-page="0"] .card');
  if(!first||$('copyYearMeta'))return;
  const wrap=document.createElement('div');
  wrap.className='yearMetaBox';
  wrap.innerHTML=`<div class="row"><button class="btn secondary" id="copyYearMeta" type="button" disabled>同年度の前回設定をコピー</button></div><div class="subtle" id="yearMetaHint">年度を入れると、同年度の過去入力からテーマ・難易度だけ再利用できます。</div>`;
  first.appendChild(wrap);
  $('copyYearMeta').onclick=copySameYearMetadata;
  year.addEventListener('input',updateYearMetaAction);
  updateYearMetaAction();
}

function installDraftAutosave(){
  const restored=restoreDraft();
  document.addEventListener('input',e=>{
    if(e.target?.closest?.('#bulkAnswerPanel'))return;
    scheduleDraftSave();
    updateInputProgress();
  },{passive:true});
  document.addEventListener('change',()=>{scheduleDraftSave();updateInputProgress()},{passive:true});
  document.addEventListener('click',e=>{
    if(e.target?.closest?.('#bulkAnswerPanel'))return;
    setTimeout(()=>{scheduleDraftSave();updateInputProgress()},0);
  },{passive:true});
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')saveDraftNow()});
  window.addEventListener('pagehide',saveDraftNow,{passive:true});
  if(restored){
    updateYearMetaAction();
    updateInputProgress();
    const n=document.createElement('div');
    n.className='restoreToast';
    n.textContent='前回の入力途中データを復元しました';
    document.body.appendChild(n);
    setTimeout(()=>n.remove(),2400);
  }
}

const _gradeV55=grade;
grade=function(mode){
  const before=records().length;
  _gradeV55(mode);
  if(records().length>before){
    clearDraft();
    updateYearMetaAction();
  }
};

const _resetForNextExamV55=resetForNextExam;
resetForNextExam=function(){
  _resetForNextExamV55();
  const hasAnyAnswer=!!document.querySelector('#questions input[type=radio][name^=a]:checked');
  if(!year.value&&!round.value&&!border.value&&!hasAnyAnswer){
    clearDraft();
    updateInputProgress();
  }
  updateYearMetaAction();
};
window.resetForNextExam=resetForNextExam;
const resetBtnV55=$('resetNextExam');if(resetBtnV55)resetBtnV55.onclick=resetForNextExam;

installBulkAnswerPanel();
installInputProgress();
installSameYearCopy();
installDraftAutosave();
updateInputProgress();
updateBulkAnswerStatus();
