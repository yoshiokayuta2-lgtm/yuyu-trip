'use strict';
(()=>{
 const $s=s=>document.querySelector(s), STORAGE_QUEUE=window.travelStoragePrefix+'sync-queue-v1', MIGRATED=window.travelStoragePrefix+'cloud-migrated-v1';
 let timer,migrationDone=false,lastStatus=null;
 const oldRecords=validate(state);
 const allFields=['travel','note','spots-0','spots-1','foods-0','foods-1','drinks-0','drinks-1'];
 function readValue(r,field){return field==='travel'?travelFrom(r):field.includes('-')?!!r.checked?.[field]:r[field]}
 function equalValue(a,b){return JSON.stringify(a)===JSON.stringify(b)}
 function enqueueRecordChanges(id,before,after){for(const field of allFields){const value=readValue(after,field);if(!equalValue(value,readValue(before,field)))engine.edit(Number(id),field,value)}schedule()}
 function schedule(delay=550){clearTimeout(timer);timer=setTimeout(run,delay)}
 async function run(){await engine.sync();if(lastStatus&&!lastStatus.problem&&lastStatus.pending>lastStatus.conflicts.length)schedule(100)}
 function merge(values){
   const merged={},travels={};for(const [key,value]of Object.entries(values)){const [id,field]=key.split(':');if(!PREFS.some(p=>p.id===Number(id))||![...allFields,'visited','wish','date'].includes(field))continue;const r=merged[id]??={visited:false,wish:false,date:'',note:'',checked:{}};if(field==='travel'){if(value&&typeof value==='object')travels[id]=value}else if(field.includes('-')){if(value===true)r.checked[field]=true}else r[field]=value}
   for(const [id,travel]of Object.entries(travels))Object.assign(merged[id],travelFrom(travel));
   if(!engine.ready)return;
   if(!migrationDone){migrationDone=true;let migrated=false;try{migrated=localStorage.getItem(MIGRATED)==='1'}catch{}
     if(!migrated){const toMigrate=[];for(const [id,r]of Object.entries(oldRecords))for(const field of allFields){const value=readValue(r,field);if((field==='travel'?(value.visited||value.wish||value.date):!!value)&&!engine.queue[id+':'+field]&&!equalValue(values[id+':'+field],value))toMigrate.push([Number(id),field,value])}
       // Mark before enqueueing; local drafts are durably queued before their first upload.
       for(const [id,field,value]of toMigrate)engine.edit(id,field,value,0);
       try{if(!engine.storageError)localStorage.setItem(MIGRATED,'1')}catch{}
       if(toMigrate.length){schedule(0);return}
     }
   }
   state=validate(merged);persist();render();if(view!=='map')renderList();
 }
 function showStatus(s){lastStatus=s;const count=s.conflicts.length;let text=s.problem==='signin'?'ログインが必要です':s.problem?'通信待ち · 端末に保存中':count?count+'件の編集を確認':s.busy?'同期中…':s.pending?'変更を同期します':s.ready?'ふたりの記録 · 同期済み':'クラウドに接続中…';if(s.storageError)text='端末に保存できません · 要バックアップ';$s('#sync-label').textContent=text;$s('#sync-indicator').classList.toggle('attention',!!s.problem||count>0||s.storageError);$s('#sync-detail-status').textContent=text;$s('#save-state').textContent=s.problem?'端末に保存済み · 再接続後に同期':count?'同時編集があります · 同期状況を確認':s.pending||s.busy?'クラウドに同期中…':s.ready?'クラウドに保存しました ✓':'端末に保存中…';$s('#signin-link').hidden=s.problem!=='signin';$s('#signin-link').href='./';$s('#conflict-count').textContent=count?count+'件の同時編集があります':'同時編集による競合はありません';renderConflicts(s.conflicts)}
 function renderConflicts(conflicts){const container=$s('#sync-conflicts');container.replaceChildren();for(const op of conflicts){const key=op.prefecture+':'+op.field,remote=engine.rows[key]?.value,p=PREFS.find(p=>p.id===op.prefecture);const labels={travel:'旅の状態・初めて二人で旅した日',visited:'訪問チェック',wish:'行きたい',date:'初めて二人で旅した日',note:'旅メモ'};const field=labels[op.field]||p[op.field.split('-')[0]]?.[Number(op.field.split('-')[1])];const card=document.createElement('div');card.className='conflict-card';const title=document.createElement('h3');title.textContent=p.name+' · '+field;const mine=document.createElement('p');mine.textContent='この端末：'+pretty(op.value);const theirs=document.createElement('p');theirs.textContent='クラウド：'+pretty(remote);const buttons=document.createElement('div');for(const [choice,label]of [['local','この端末の内容を残す'],['remote','クラウドの内容を使う']]){const b=document.createElement('button');b.textContent=label;b.onclick=()=>{engine.resolve(key,choice);schedule(0)};buttons.append(b)}card.append(title,mine,theirs,buttons);container.append(card)}}
 function pretty(value){if(value&&typeof value==='object'){const t=travelFrom(value);return t.visited?'行った · '+(t.date?'初めて二人で旅した日：'+t.date:'日付未登録'):t.wish?'行きたい':'まだこれから'}return typeof value==='boolean'?(value?'チェックあり':'チェックなし'):value||'（空欄）'}
 const engine=new TravelSyncEngine({storage:{load:()=>localStorage.getItem(STORAGE_QUEUE),save:value=>localStorage.setItem(STORAGE_QUEUE,value)},transport:async(method,body)=>{const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),12000);try{const res=await window.travelBackend.request('/api/sync',{method,credentials:'same-origin',cache:'no-store',signal:controller.signal,headers:body?{'Content-Type':'application/json','X-Travel-Sync':'1'}:{},...(body?{body:JSON.stringify(body)}:{})});if(!res.ok){const e=new Error('sync_failed');e.status=res.status;throw e}const result=await res.json();if(!Array.isArray(result.rows))throw Error('invalid_response');return result}finally{clearTimeout(timeout)}},onChange:merge,onStatus:showStatus});
 window.travelSync={changed:enqueueRecordChanges,imported:before=>{const after=JSON.parse(JSON.stringify(state));for(const p of PREFS)enqueueRecordChanges(p.id,before[p.id]||{visited:false,wish:false,date:'',note:'',checked:{}},after[p.id]||{visited:false,wish:false,date:'',note:'',checked:{}})},status:()=>showStatus(engine.status())};
 $s('#sync-indicator').onclick=()=>{$s('#sync-dialog').showModal();showStatus(engine.status())};$s('#sync-retry').onclick=()=>{engine.problem=null;schedule(0)};
 window.addEventListener('online',()=>schedule(0));document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')schedule(0)});setInterval(()=>{if(document.visibilityState==='visible')run()},4000);
 // Merge pending edits from another tab before refreshing the cloud snapshot.
 window.addEventListener('storage',e=>{if(e.key===STORAGE_QUEUE&&e.newValue){try{const incoming=JSON.parse(e.newValue).queue||{};for(const [k,op]of Object.entries(incoming)){if(!engine.queue[k]||op.token>engine.queue[k].token)engine.queue[k]=op}schedule(0)}catch{}}});
 showStatus(engine.status());schedule(0);
})();
