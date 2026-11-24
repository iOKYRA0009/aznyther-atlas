// Contratos provisórios, sem dependências externas. Nenhuma conexão com produção.
const clone = x => JSON.parse(JSON.stringify(x));
const requireThat = (ok, msg) => { if (!ok) throw new Error(msg); };
const clean = (s,max=1800) => { requireThat(typeof s==='string' && s.trim().length>0 && s.trim().length<=max,'Texto inválido'); return s.trim(); };
const get = (items,id) => items.find(x=>x.id===id);
const isMember = (state,id) => state.members.some(x=>x.id===id);
function actor(state,id) { const x=get(state.members,id); requireThat(x,'Ator desconhecido'); return x; }
function master(a) { requireThat(a.role==='master','Somente o mestre'); }
function player(a) { requireThat(a.role==='player','Somente o jogador'); }
function allowedRefs(state,a) {
 const list=state.refs.filter(x=>x.public||a.role==='master'||x.allowed.includes(a.id));
 for(const n of state.news)if(n.status==='published')list.push({id:'news:'+n.id,type:'news',title:n.title,public:true,allowed:[]});
 for(const l of state.letters)if(a.role==='master'||l.playerId===a.id)list.push({id:'letter:'+l.id,type:'letter',title:l.subject,public:false,allowed:[l.playerId]});
 for(const w of state.awards)if(a.role==='master'||w.playerId===a.id){const x=get(state.achievements,w.achievementId);if(x)list.push({id:'award:'+w.id,type:'award',title:x.title,public:false,allowed:[w.playerId]});}
 return list;
}
function editable(t){requireThat(!['submitted','approved'].includes(t.status),'Mural em revisão ou aceito');}
function validTheory(t,s,a){return t.nodes.every(n=>allowedRefs(s,a).some(r=>r.id===n.refId));}
function projectTheory(t,a,refIds){
 if(a.role!=='master'&&t.owner!==a.id&&t.nodes.some(n=>!refIds.has(n.refId)))return null;
 const nodes=t.nodes.filter(n=>refIds.has(n.refId)),ids=new Set(nodes.map(n=>n.id));
 const x={...t,status:t.status??'draft',nodes,edges:t.edges.filter(e=>ids.has(e.from)&&ids.has(e.to))};
 if(a.role!=='master'&&t.owner!==a.id)delete x.review;return x;
}
function theoryVisible(t,a) { return a.role==='master' || t.owner===a.id || (t.scope==='party' && t.party===a.party); }
function view(state,actorId) {
 const a=actor(state,actorId), refs=allowedRefs(state,a), refIds=new Set(refs.map(x=>x.id));
 return clone({
  actor:a, members:a.role==='master'?state.members.filter(x=>x.role==='player').map(x=>({id:x.id,name:x.name})):[],
  news:state.news.filter(x=>a.role==='master'||x.status==='published').slice().reverse(),
  achievements:state.achievements.filter(x=>a.role==='master'||!x.secret||state.awards.some(y=>y.achievementId===x.id&&y.playerId===a.id)),
  awards:state.awards.filter(x=>a.role==='master'||x.playerId===a.id),
  letters:state.letters.filter(x=>a.role==='master'||x.playerId===a.id).slice().reverse().map(l=>({...l,attachmentRefId:refIds.has(l.attachmentRefId)?l.attachmentRefId:null})),
  refs:refs.map(r=>{const {allowed,...rest}=r;return a.role==='master'?r:rest;}),
  journal:(state.journal??[]).filter(j=>j.owner===a.id&&refIds.has(j.refId)),
  theories:state.theories.filter(x=>theoryVisible(x,a)).map(t=>projectTheory(t,a,refIds)).filter(Boolean)
 });
}
function apply(state,actorId,cmd,now) {
 const a=actor(state,actorId), s=clone(state);s.journal??=[];
 requireThat(typeof now==='string'&&!Number.isNaN(Date.parse(now)),'Data inválida');
 const id=()=> 'demo-'+(++s.seq);
 const stamp=()=>({id:id(),createdAt:now});
 const theory=()=>{const t=get(s.theories,cmd.theoryId);requireThat(t&&t.owner===a.id,'Somente o autor pode editar');return t;};
 const member=()=>{const m=actor(s,cmd.playerId);requireThat(m.role==='player','Destinatário inválido');return m;};
 const grant=(p,ach,source)=>{requireThat(get(s.achievements,ach),'Conquista inexistente');if(!s.awards.some(x=>x.playerId===p&&x.achievementId===ach))s.awards.push({...stamp(),playerId:p,achievementId:ach,...(source?{sourceTheoryId:source}:{})});};
 const addRef=(t,refId)=>{editable(t);const ref=get(allowedRefs(s,a),refId);requireThat(ref,'Referência indisponível');requireThat(!t.nodes.some(n=>n.refId===ref.id),'Referência duplicada');if(t.scope==='party')requireThat(s.members.filter(x=>x.role==='player'&&x.party===a.party).every(p=>allowedRefs(s,p).some(r=>r.id===ref.id)),'Referência privada não pode entrar em mural compartilhado');requireThat(t.nodes.length<40,'Limite de nós');t.nodes.push({id:id(),refId:ref.id});};
 switch(cmd.type){
 case 'news.create': master(a); requireThat(['rumor','report','notice'].includes(cmd.kind),'Categoria inválida');s.news.push({...stamp(),title:clean(cmd.title,120),body:clean(cmd.body,3000),kind:cmd.kind,status:'draft'});break;
 case 'news.publish': {master(a);const n=get(s.news,cmd.id);requireThat(n&&n.status==='draft','Rascunho inválido');n.status='published';n.publishedAt=now;break;}
 case 'achievement.create': master(a);s.achievements.push({...stamp(),title:clean(cmd.title,100),description:clean(cmd.description,500),secret:cmd.secret===true});break;
 case 'news.retract': {master(a);const n=get(s.news,cmd.id);requireThat(n&&n.status==='published','Notícia indisponível');n.status='retracted';n.retractedAt=now;break;}
 case 'achievement.award': {master(a);const m=member();grant(m.id,cmd.achievementId);break;}
 case 'letter.send': {master(a);const m=member();const attachment=cmd.attachmentRefId||null;if(attachment){const ref=get(allowedRefs(s,m),attachment);requireThat(ref&&['document','npc','clue','news'].includes(ref.type),'Anexo não autorizado para destinatário');}s.letters.push({...stamp(),attachmentRefId:attachment,playerId:m.id,sender:clean(cmd.sender,80),subject:clean(cmd.subject,120),messages:[{id:id(),author:'npc',body:clean(cmd.body),createdAt:now}],read:false});break;}
 case 'letter.read': {player(a);const l=get(s.letters,cmd.id);requireThat(l&&l.playerId===a.id,'Carta indisponível');l.read=true;break;}
 case 'letter.reply': {const l=get(s.letters,cmd.id);requireThat(l&&(a.role==='master'||l.playerId===a.id),'Carta indisponível');l.messages.push({...stamp(),author:a.role==='master'?'npc':'player',body:clean(cmd.body)});l.read=a.role==='player';break;}
 case 'theory.create': player(a);s.theories.push({...stamp(),owner:a.id,party:a.party,title:clean(cmd.title,120),note:clean(cmd.note,1200),scope:'private',status:'draft',nodes:[],edges:[]});break;
 case 'theory.fromRef': {player(a);const ref=get(allowedRefs(s,a),cmd.refId);requireThat(ref,'Referência indisponível');const t={...stamp(),owner:a.id,party:a.party,title:'Investigar: '+ref.title.slice(0,108),note:'Hipótese inicial; ainda não confirmada.',scope:'private',status:'draft',nodes:[],edges:[]};addRef(t,ref.id);s.theories.push(t);break;}
 case 'journal.save': {player(a);requireThat(get(allowedRefs(s,a),cmd.refId),'Referência indisponível');if(!s.journal.some(j=>j.owner===a.id&&j.refId===cmd.refId))s.journal.push({...stamp(),owner:a.id,refId:cmd.refId});break;}
 case 'journal.remove': {player(a);s.journal=s.journal.filter(j=>!(j.owner===a.id&&j.refId===cmd.refId));break;}
 case 'theory.submit': {player(a);const t=theory();editable(t);requireThat(t.nodes.length>=2&&t.edges.length>=1&&validTheory(t,s,a),'Inclua duas referências acessíveis e uma relação');t.status='submitted';t.submittedAt=now;delete t.review;break;}
 case 'theory.withdraw': {player(a);const t=theory();requireThat(t.status==='submitted','Não está em revisão');t.status='draft';break;}
 case 'theory.review': {master(a);const t=get(s.theories,cmd.theoryId);requireThat(t&&t.status==='submitted','Mural não está em revisão');requireThat(['approved','changes'].includes(cmd.result),'Decisão inválida');requireThat(validTheory(t,s,actor(s,t.owner)),'Referências do autor indisponíveis');t.status=cmd.result;t.review={feedback:clean(cmd.feedback,1200),at:now};if(cmd.achievementId){requireThat(cmd.result==='approved','Premiação exige aceite');grant(t.owner,cmd.achievementId,t.id);}break;}
 case 'theory.share': {player(a);const t=theory();requireThat(['private','party'].includes(cmd.scope),'Visibilidade inválida');if(cmd.scope==='party'){const peers=s.members.filter(x=>x.role==='player'&&x.party===a.party);requireThat(t.nodes.every(n=>peers.every(p=>allowedRefs(s,p).some(r=>r.id===n.refId))),'Existem referências privadas no mural');}t.scope=cmd.scope;break;}
 case 'theory.addRef': {player(a);addRef(theory(),cmd.refId);break;}
 case 'theory.link': {player(a);const t=theory();editable(t);requireThat(validTheory(t,s,a),'Há referências indisponíveis');requireThat(t.edges.length<120,'Limite de conexões');requireThat(cmd.from!==cmd.to&&get(t.nodes,cmd.from)&&get(t.nodes,cmd.to),'Nós inválidos');requireThat(!t.edges.some(e=>(e.from===cmd.from&&e.to===cmd.to)||(e.to===cmd.from&&e.from===cmd.to)),'Ligação duplicada');t.edges.push({id:id(),from:cmd.from,to:cmd.to,label:clean(cmd.label,120)});break;}
 case 'theory.removeRef': {player(a);const t=theory();editable(t);requireThat(get(t.nodes,cmd.id),'Nó inexistente');t.nodes=t.nodes.filter(n=>n.id!==cmd.id);t.edges=t.edges.filter(e=>e.from!==cmd.id&&e.to!==cmd.id);break;}
 default: throw new Error('Comando desconhecido');
 }
 return s;
}
function fixture(){
 return {version:2,seq:100,journal:[],members:[{id:'demo-master',role:'master',name:'Mestre (teste)'},{id:'demo-a',role:'player',name:'Viajante A',party:'demo-party'},{id:'demo-b',role:'player',name:'Viajante B',party:'demo-party'}],
 refs:[{id:'demo-r1',type:'document',title:'Registro do sino',public:true,allowed:[]},{id:'demo-r2',type:'npc',title:'Escriba fictício',public:true,allowed:[]},{id:'demo-r3',type:'clue',title:'Bilhete do cais (apenas A)',public:false,allowed:['demo-a']}],
 news:[{id:'demo-n1',title:'O sino que não tocou',body:'Moradores de uma cidade fictícia comentam o silêncio da torre. A origem do relato não foi verificada.',kind:'rumor',status:'published',createdAt:'2026-11-24T00:00:00Z',publishedAt:'2026-11-24T00:00:00Z'}],
 achievements:[{id:'demo-ach1',title:'Primeiros vestígios',description:'Reunir os primeiros registros de uma investigação.',secret:false},{id:'demo-ach2',title:'Eco oculto (fictício)',description:'Conquista demonstrativa reservada.',secret:true}],awards:[{id:'demo-aw1',playerId:'demo-a',achievementId:'demo-ach1',createdAt:'2026-11-24T00:00:00Z'}],
 letters:[{id:'demo-l1',playerId:'demo-a',sender:'Escriba fictício',subject:'Uma página desaparecida',read:false,messages:[{id:'demo-msg1',author:'npc',body:'Viajante, procure o registro do sino antes de seguir os rumores.',createdAt:'2026-11-24T00:00:00Z'}]}],theories:[]};
}
function journey(v){
 const items=[];const push=(kind,id,title,at,refId)=>items.push({kind,id,title,at:at??'',refId});
 for(const n of v.news)if(n.status==='published')push('news',n.id,n.title,n.publishedAt,'news:'+n.id);
 for(const l of v.letters)push('letter',l.id,l.subject,l.messages.at(-1)?.createdAt,'letter:'+l.id);
 for(const w of v.awards){const a=get(v.achievements,w.achievementId);if(a)push('award',w.id,a.title,w.createdAt,'award:'+w.id);}
 for(const t of v.theories)if(t.owner===v.actor.id||v.actor.role==='master')push('theory',t.id,t.title,t.review?.at??t.submittedAt??t.createdAt,null);
 return items.sort((a,b)=>b.at.localeCompare(a.at)||a.id.localeCompare(b.id));
}
function migrate(s){if(s.version===2)return clone(s);requireThat(s.version===1,'Versão local incompatível');const n=clone(s);n.version=2;n.journal=[];for(const t of n.theories)t.status='draft';return n;}
export {view,apply,fixture,journey,migrate};
