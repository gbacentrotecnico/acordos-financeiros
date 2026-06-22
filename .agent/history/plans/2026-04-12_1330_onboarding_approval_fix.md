# Plano de Implementação: Correção de Onboarding e Aprovação Master

Este plano visa resolver dois problemas críticos: a falha no upload de fotos no passo final do onboarding e o erro ao processar a aprovação manual de produtores.

## User Review Required

> [!IMPORTANT]
> **Armazenamento de Feed**: Atualmente, as fotos do "Feed Profissional" (Passo 5) não estão sendo salvas no banco de dados. Vou implementar a persistência na tabela `organizer_posts` para que essas imagens apareçam no perfil do produtor após a aprovação.

> [!CAUTION]
> **Permissões Administrativas**: Para garantir que a aprovação funcione 100% das vezes (mesmo com RLS ativo), mudarei o serviço para usar o `supabaseAdmin`.

## Proposed Changes

### [Component] Onboarding de Produtores

#### [MODIFY] [OrganizerOnboarding.tsx](file:///e:/Sistemas\Ticketera\ticketera-main\src\pages\dashboard\OrganizerOnboarding.tsx)
- **Correção de Upload**: Passar `user.id` e `formData.companyName` na chamada de `uploadImage` no Passo 5 para garantir que as fotos do feed caiam no bucket correto.
- **Persistência do Feed**: Adicionar lógica para salvar o array `feedPosts` no banco de dados durante a finalização do onboarding.

#### [MODIFY] [organizerService.ts](file:///e:/Sistemas\Ticketera\ticketera-main\src\services\organizerService.ts)
- Adicionar método para salvar múltiplos posts de uma vez (bulk save para o feed).

### [Component] Master Admin Service

#### [MODIFY] [masterService.ts](file:///e:/Sistemas\Ticketera\ticketera-main\src\services\masterService.ts)
- **Aprovação Resiliente**: Atualizar `approveOrganizerManually` para usar `supabaseAdmin`.
- **Tratamento de Dados**: Garantir que o `id` (Profile) seja corretamente mapeado e que o status `approved` seja propagado.

---

### [Component] Database Schema (Refinamento)

#### [NEW] [20260412_add_organizer_posts.sql](file:///e:/Sistemas\Ticketera\ticketera-main\supabase\migrations\20260412_add_organizer_posts.sql)
- Garantir que a tabela `organizer_posts` exista com as colunas corretas (`id`, `organizer_id`, `image_url`, `created_at`).

## Verification Plan

### Manual Verification
1. **Onboarding**: Completar o Passo 5 com 3 fotos e concluir. Verificar no banco se os posts foram salvos.
2. **Aprovação**: No painel Master, clicar em "Aprovar Produtor" e verificar se o status muda para `approved` e se o Toast de sucesso aparece.
3. **Storage**: Validar se as fotos do feed estão no bucket `producer-{userId}` no MinIO.
