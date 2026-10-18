'use strict';
class TravelSyncEngine {
  constructor({transport,storage,onChange,onStatus}) {
    this.transport=transport;this.storage=storage;this.onChange=onChange;this.onStatus=onStatus;
    this.rows={};this.queue={};this.ready=false;this.busy=false;this.problem=null;this.sequence=0;
    try { const saved=JSON.parse(storage.load()||'{}');if(saved.queue&&typeof saved.queue==='object')this.queue=saved.queue;this.sequence=saved.sequence||0; } catch {}
  }
  key(p,f){return p+':'+f}
  save(){try{this.storage.save(JSON.stringify({queue:this.queue,sequence:this.sequence}));this.storageError=false}catch{this.storageError=true}}
  status(){const pending=Object.values(this.queue);return {ready:this.ready,busy:this.busy,problem:this.problem,pending:pending.length,conflicts:pending.filter(p=>p.conflict),storageError:!!this.storageError}}
  emit(){this.onStatus(this.status())}
  edit(prefecture,field,value,baseRevisionOverride){const k=this.key(prefecture,field),old=this.queue[k];this.queue[k]={prefecture,field,value,baseRevision:baseRevisionOverride??(old?old.baseRevision:(this.rows[k]?.revision||0)),token:++this.sequence,conflict:old?.conflict||false};this.save();this.onChange(this.snapshot());this.emit()}
  snapshot(){const values={};for(const [k,row]of Object.entries(this.rows))values[k]=row.value;for(const [k,op]of Object.entries(this.queue))values[k]=op.value;return values}
  acceptRows(rows,sent=[],applied=[]){const map={};for(const row of rows)map[this.key(row.prefecture,row.field)]=row;
    for(const old of sent){const k=this.key(old.prefecture,old.field),current=this.queue[k];if(!current||!applied.includes(k))continue;if(current.token===old.token)delete this.queue[k];else{current.baseRevision=old.baseRevision+1;current.conflict=false}}
    this.rows=map;
    for(const [k,op]of Object.entries(this.queue)){const remote=map[k];if(!remote)continue;if(JSON.stringify(remote.value)===JSON.stringify(op.value)){delete this.queue[k];continue}if(remote.revision!==op.baseRevision)op.conflict=true}
    this.ready=true;this.save();this.onChange(this.snapshot());this.emit();
  }
  resolve(key,choice){const op=this.queue[key];if(!op)return;if(choice==='remote')delete this.queue[key];else{op.baseRevision=this.rows[key]?.revision||0;op.conflict=false;op.token=++this.sequence}this.save();this.onChange(this.snapshot());this.emit()}
  async sync(){if(this.busy)return;this.busy=true;this.emit();try{
    if(!this.ready){const result=await this.transport('GET');this.acceptRows(result.rows)}
    const pending=Object.values(this.queue).filter(p=>!p.conflict).slice(0,100).map(p=>({...p}));
    if(pending.length){const result=await this.transport('POST',{ops:pending.map(({prefecture,field,value,baseRevision})=>({prefecture,field,value,baseRevision}))});this.acceptRows(result.rows,pending,result.applied)}
    else {const result=await this.transport('GET');this.acceptRows(result.rows)}
    this.problem=null;
  }catch(e){this.problem=e.status===401?'signin':'offline'}finally{this.busy=false;this.emit()}}
}
