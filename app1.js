
const $=id=>document.getElementById(id);
const SECTIONS=[['権利関係',1,14],['法令上の制限',15,22],['税・その他',23,25],['宅建業法',26,45],['その他',46,50]];
const PAGE_LABELS=['基本情報','問題入力','正答','今回の結果','過去結果','推移・統計','テーマ管理'];
const DEFAULTS={
'権利関係':['制限行為能力者','意思表示','物権変動','共有','代理','無権代理','時効','債務不履行','弁済','連帯債務','債権譲渡','売買','買主の救済（担保責任等）','契約不適合責任','請負','相続','遺産分割','抵当権','質権','地役権','賃貸借','転貸借','不法行為','借地借家法（借地）','借地借家法（借家）'],
'法令上の制限':['都市計画法','開発許可','建築基準法','国土利用計画法','農地法','土地区画整理法','宅地造成及び特定盛土等規制法','その他の法令上の制限'],
'税・その他':['税金','不動産取得税','固定資産税','所得税','印紙税','登録免許税','地価公示法','不動産鑑定評価基準'],
'宅建業法':['免許','宅建士','営業保証金','保証協会','媒介契約','重要事項説明','37条書面','8種制限','報酬額','広告規制','業務上の規制','監督処分・罰則','クーリングオフ','手付金等の保全措置'],
'その他':['住宅金融支援機構','景品表示法','土地','建物','統計']};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const sectionOf=q=>SECTIONS.find(s=>q>=s[1]&&q<=s[2])[0];
function loadThemes(){let raw;try{raw=JSON.parse(localStorage.getItem('takkenThemes')||'null')}catch(e){};if(Array.isArray(raw)&&raw.length&&typeof raw[0]==='object')return raw;const seen=new Set(), out=[];Object.entries(DEFAULTS).forEach(([section,names])=>names.forEach(name=>{if(!seen.has(name)){seen.add(name);out.push({id:crypto.randomUUID?crypto.randomUUID():Math.random().toString(36).slice(2),name,section})}}));if(Array.isArray(raw))raw.forEach(name=>{if(typeof name==='string'&&name.trim()&&!seen.has(name.trim())){seen.add(name.trim());out.push({id:Math.random().toString(36).slice(2),name:name.trim(),section:'その他'})}});localStorage.setItem('takkenThemes',JSON.stringify(out));return out}
let THEMES=loadThemes();
const usage=()=>{try{return JSON.parse(localStorage.getItem('takkenThemeUsage')||'{}')}catch(e){return {}}};
const setThemes=()=>localStorage.setItem('takkenThemes',JSON.stringify(THEMES));
const keys=()=>{try{return JSON.parse(localStorage.getItem('takkenAnswerKeys')||'{}')}catch(e){return {}}};
const records=()=>{try{return JSON.parse(localStorage.getItem('takkenRecords')||'[]')}catch(e){return []}};
let currentPage=0,currentResult=null,touchStart=null;
// Explicit DOM references for iOS Safari / Home Screen mode. Do not rely on id-to-global bindings.
let tabs,pages,catnav,questions,date,year,round,border,minutes,keyHint,answerKey,keyStatus,registerKey,gradePaste,gradeSaved,saveUngraded,keyList,resultSummary,sectionStats,difficultyStats,currentWeak,pastSearch,pastYear,pastRound,pastList,pastDetailCard,pastDetail,overallStats,scoreTrend,sectionTrends,recentCompare,allDifficulty,themeStatsAll,weakRanking,newTheme,newThemeSection,addTheme,themeManager;
function bindDom(){
  tabs=$('tabs'); pages=$('pages');
  const ids=['catnav','questions','date','year','round','border','minutes','keyHint','answerKey','keyStatus','registerKey','gradePaste','gradeSaved','saveUngraded','keyList','resultSummary','sectionStats','difficultyStats','currentWeak','pastSearch','pastYear','pastRound','pastList','pastDetailCard','pastDetail','overallStats','scoreTrend','sectionTrends','recentCompare','allDifficulty','themeStatsAll','weakRanking','newTheme','newThemeSection','addTheme','themeManager'];
  for(const id of ids) window[id]=$ (id);
  ({catnav,questions,date,year,round,border,minutes,keyHint,answerKey,keyStatus,registerKey,gradePaste,gradeSaved,saveUngraded,keyList,resultSummary,sectionStats,difficultyStats,currentWeak,pastSearch,pastYear,pastRound,pastList,pastDetailCard,pastDetail,overallStats,scoreTrend,sectionTrends,recentCompare,allDifficulty,themeStatsAll,weakRanking,newTheme,newThemeSection,addTheme,themeManager}=Object.fromEntries(ids.map(id=>[id,$(id)])));
}
