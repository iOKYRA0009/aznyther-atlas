// Contratos provisórios, sem dependências externas. Nenhuma conexão com produção.
const clone = x => JSON.parse(JSON.stringify(x));
const requireThat = (ok, msg) => { if (!ok) throw new Error(msg); };
const clean = (s,max=1800) => { requireThat(typeof s==='string' && s.trim().length>0 && s.trim().length<=max,'Texto inválido'); return s.trim(); };
const get = (items,id) => items.find(x=>x.id===id);
const isMember = (state,id) => state.members.some(x=>x.id===id);
function actor(state,id) { const x=get(state.members,id); requireThat(x,'Ator desconhecido'); return x; }
function master(a) { requireThat(a.role==='master','Somente o mestre'); }
function player(a) { requireThat(a.role==='player','Somente o jogador'); }
function allowedRefs(state,a) { return state.refs.filter(x=>x.public || a.role==='master' || x.allowed.includes(a.id)); }
function theoryVisible(t,a) { return a.role==='master' || t.owner===a.id || (t.scope==='party' && t.party===a.party); }
function view(state,actorId) {
 const a=actor(state,actorId), refs=allowedRefs(state,a), refIds=new Set(refs.map(x=>x.id));
 return clone({
  actor:a, members:a.role==='master'?state.members.filter(x=>x.role==='player').map(x=>({id:x.id,name:x.name})):[],
  news:state.news.filter(x=>a.role==='master'||x.status==='published').slice().reverse(),
  achievements:state.achievements.filter(x=>a.role==='master'||!x.secret||state.awards.some(y=>y.achievementId===x.id&&y.playerId===a.id)),
  awards:state.awards.filter(x=>a.role==='master'||x.playerId===a.id),
  letters:state.letters.filter(x=>a.role==='master'||x.playerId===a.id).slice().reverse(),
  refs,
  theories:state.theories.filter(x=>theoryVisible(x,a)).map(t=>{const nodes=t.nodes.filter(n=>refIds.has(n.refId));const ids=new Set(nodes.map(n=>n.id)); return {...t,nodes,edges:t.edges.filter(e=>ids.has(e.from)&&ids.has(e.to))};})
 });
}
function apply(state,actorId,cmd,now) {
 const a=actor(state,actorId), s=clone(state);
 requireThat(typeof now==='string'&&!Number.isNaN(Date.parse(now)),'Data inválida');
 const id=()=> 'demo-'+(++s.seq);
 const stamp=()=>({id:id(),createdAt:now});
 const theory=()=>{const t=get(s.theories,cmd.theoryId);requireThat(t&&t.owner===a.id,'Somente o autor pode editar');return t;};
 const member=()=>{const m=actor(s,cmd.playerId);requireThat(m.role==='player','Destinatário inválido');return m;};
 switch(cmd.type){
 case 'news.create': master(a); requireThat(['rumor','report','notice'].includes(cmd.kind),'Categoria inválida');s.news.push({...stamp(),title:clean(cmd.title,120),body:clean(cmd.body,3000),kind:cmd.kind,status:'draft'});break;
 case 'news.publish': {master(a);const n=get(s.news,cmd.id);requireThat(n&&n.status==='draft','Rascunho inválido');n.status='published';n.publishedAt=now;break;}
 case 'achievement.create': master(a);s.achievements.push({...stamp(),title:clean(cmd.title,100),description:clean(cmd.description,500),secret:cmd.secret===true});break;
 case 'achievement.award': {master(a);const m=member();requireThat(get(s.achievements,cmd.achievementId),'Conquista inexistente');if(!s.awards.some(x=>x.playerId===m.id&&x.achievementId===cmd.achievementId))s.awards.push({...stamp(),playerId:m.id,achievementId:cmd.achievementId});break;}
 case 'letter.send': {master(a);const m=member();s.letters.push({...stamp(),playerId:m.id,sender:clean(cmd.sender,80),subject:clean(cmd.subject,120),messages:[{id:id(),author:'npc',body:clean(cmd.body),createdAt:now}],read:false});break;}
 case 'letter.read': {player(a);const l=get(s.letters,cmd.id);requireThat(l&&l.playerId===a.id,'Carta indisponível');l.read=true;break;}
 case 'letter.reply': {const l=get(s.letters,cmd.id);requireThat(l&&(a.role==='master'||l.playerId===a.id),'Carta indisponível');l.messages.push({...stamp(),author:a.role==='master'?'npc':'player',body:clean(cmd.body)});l.read=a.role==='player';break;}
 case 'theory.create': player(a);s.theories.push({...stamp(),owner:a.id,party:a.party,title:clean(cmd.title,120),note:clean(cmd.note,1200),scope:'private',nodes:[],edges:[]});break;
 case 'theory.share': {player(a);const t=theory();requireThat(['private','party'].includes(cmd.scope),'Visibilidade inválida');if(cmd.scope==='party'){const peers=s.members.filter(x=>x.role==='player'&&x.party===a.party);requireThat(t.nodes.every(n=>peers.every(p=>allowedRefs(s,p).some(r=>r.id===n.refId))),'Existem referências privadas no mural');}t.scope=cmd.scope;break;}
 case 'theory.addRef': {player(a);const t=theory();const ref=get(allowedRefs(s,a),cmd.refId);requireThat(ref,'Referência indisponível');requireThat(!t.nodes.some(n=>n.refId===ref.id),'Referência duplicada');if(t.scope==='party')requireThat(s.members.filter(x=>x.role==='player'&&x.party===a.party).every(p=>allowedRefs(s,p).some(r=>r.id===ref.id)),'Referência privada não pode entrar em mural compartilhado');t.nodes.push({id:id(),refId:ref.id});break;}
 case 'theory.link': {player(a);const t=theory();requireThat(cmd.from!==cmd.to&&get(t.nodes,cmd.from)&&get(t.nodes,cmd.to),'Nós inválidos');requireThat(!t.edges.some(e=>(e.from===cmd.from&&e.to===cmd.to)||(e.to===cmd.from&&e.from===cmd.to)),'Ligação duplicada');t.edges.push({id:id(),from:cmd.from,to:cmd.to,label:clean(cmd.label,120)});break;}
 case 'theory.removeRef': {player(a);const t=theory();requireThat(get(t.nodes,cmd.id),'Nó inexistente');t.nodes=t.nodes.filter(n=>n.id!==cmd.id);t.edges=t.edges.filter(e=>e.from!==cmd.id&&e.to!==cmd.id);break;}
 default: throw new Error('Comando desconhecido');
 }
 return s;
}
function fixture(){
 return {version:1,seq:100,members:[{id:'demo-master',role:'master',name:'Mestre (teste)'},{id:'demo-a',role:'player',name:'Viajante A',party:'demo-party'},{id:'demo-b',role:'player',name:'Viajante B',party:'demo-party'}],
 refs:[{id:'demo-r1',type:'document',title:'Registro do sino',public:true,allowed:[]},{id:'demo-r2',type:'npc',title:'Escriba fictício',public:true,allowed:[]},{id:'demo-r3',type:'clue',title:'Bilhete do cais (apenas A)',public:false,allowed:['demo-a']}],
 news:[{id:'demo-n1',title:'O sino que não tocou',body:'Moradores de uma cidade fictícia comentam o silêncio da torre. A origem do relato não foi verificada.',kind:'rumor',status:'published',createdAt:'2026-11-24T00:00:00Z',publishedAt:'2026-11-24T00:00:00Z'}],
 achievements:[{id:'demo-ach1',title:'Primeiros vestígios',description:'Reunir os primeiros registros de uma investigação.',secret:false},{id:'demo-ach2',title:'Eco oculto (fictício)',description:'Conquista demonstrativa reservada.',secret:true}],awards:[{id:'demo-aw1',playerId:'demo-a',achievementId:'demo-ach1',createdAt:'2026-11-24T00:00:00Z'}],
 letters:[{id:'demo-l1',playerId:'demo-a',sender:'Escriba fictício',subject:'Uma página desaparecida',read:false,messages:[{id:'demo-msg1',author:'npc',body:'Viajante, procure o registro do sino antes de seguir os rumores.',createdAt:'2026-11-24T00:00:00Z'}]}],theories:[]};
}
export {view,apply,fixture};
