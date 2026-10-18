/* Run this whole file in the browser console while signed in to the OLD app.
 * It downloads a PRIVATE backup to your computer. It does not send data elsewhere.
 * Never commit that backup to GitHub.
 */
(async()=>{
 const expected='https://futari-tabi-map.homes-0535.chatgpt.site';
 if(location.origin!==expected)throw Error('前の旅地図のページを開いて実行してください。');
 async function get(path){const response=await fetch(path,{credentials:'same-origin',cache:'no-store'});if(!response.ok)throw Error('読み出せませんでした: '+response.status);return response.json()}
 const [journal,memories]=await Promise.all([get('/api/sync'),get('/api/memories?scope=all')]);
 const photos=[];for(const photo of memories.photos){const response=await fetch(photo.url,{credentials:'same-origin',cache:'no-store'});if(!response.ok)throw Error('写真を読み出せませんでした');const blob=await response.blob();const dataUrl=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(blob)});photos.push({...photo,dataUrl});console.info('写真の書き出し '+photos.length+' / '+memories.photos.length)}
 const backup={format:'futari-tabi-migration',version:1,exportedAt:new Date().toISOString(),journalRows:journal.rows,people:memories.people,wishes:memories.wishes,photos};
 const url=URL.createObjectURL(new Blob([JSON.stringify(backup)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='futari-tabi-private.migration.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);console.info('完了。ダウンロードしたJSONには個人データが含まれます。GitHubには上げないでください。');
})().catch(error=>console.error('書き出しを中止しました:',error.message));
