# Contratos de dados (proposta, não schema definitivo)
Campos e comandos são definidos em core.mjs. Referências são por ID, não cópias de conteúdo. Identidade/role/party devem vir de sessão e membership verificados no servidor. Para produção, separe armazenamento por visibilidade; jamais exponha a fixture de estado completo, mesmo se UI filtrar.
| Domínio | Campos centrais | Escrita autorizada |
|---|---|---|
| news | id,title,body,kind,status,createdAt,publishedAt | mestre; público somente published |
| achievements | id,title,description,secret | mestre; segredo só para mestre ou premiado |
| awards | id,playerId,achievementId,createdAt | mestre; chave única (playerId,achievementId) |
| letters | id,playerId,sender,subject,read,messages | mestre cria; participante lê/responde, mestre responde |
| theories | id,owner,party,title,note,scope,nodes,edges | dono edita; mestre lê; grupo somente se compartilhado |
| refs | id,type,title,public,allowed | serviço real resolve IDs e autorização |
Comandos em apply: news.create/publish, achievement.create/award, letter.send/read/reply, theory.create/share/addRef/link/removeRef. Produção requer tratamento de concorrência, rate limiting, auditoria, regras de acesso no servidor, revogação e validação dos campos. Compartilhamento explícito de texto não autoriza revelar registros não desbloqueados. Dados antigos devem ser reconciliados com schema atualizado, não migrados automaticamente.

## Extensão v0.2
journal: id,owner,refId,createdAt, chave única owner/refId. refs derivados: news:<id> publicado, letter:<id> do destinatário, award:<id> do premiado. Resolver e filtrar por servidor. letters.attachmentRefId opcional, validar acesso na escrita e leitura. theories.status draft/submitted/approved/changes; submittedAt, review{feedback,at} visível somente autor/mestre (não compartilhar parecer); revalidar todas referências na submissão/aceite e mudança de acesso. awards.sourceTheoryId opcional, não altera economia. journey(view) não é auditoria global. Comandos news.retract, journal.save/remove, theory.fromRef/submit/withdraw/review. Não migrar Firebase automaticamente.
