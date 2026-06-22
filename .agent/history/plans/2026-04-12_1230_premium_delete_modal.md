# Plano de Implementação: Regras de Exclusão de Produtores

O objetivo é restringir a funcionalidade de exclusão no Painel Master para proteger produtores ativos que já possuem eventos e transações, permitindo a limpeza apenas de perfis em fase inicial (Onboarding ou aguardando análise).

## User Review Required

> [!IMPORTANT]
> **Bloqueio de Produtores Ativos:** O botão de excluir será removido/desativado para qualquer produtor com status `approved` (Ativo). Isso evita a exclusão acidental de dados de vendas e ingressos.

## Proposed Changes

### [Component Name] Dashboard Admin

#### [MODIFY] [OrganizersManagement.tsx](file:///e:/Sistemas/Ticketera/ticketera-main/src/pages/dashboard/OrganizersManagement.tsx)
- No menu de ações (Dropdown) e na lista de verificações, adicionar a condição: exibir o botão "Excluir" apenas se `org.status !== 'approved'`.
- Adicionar um tooltip ou aviso explicando que produtores ativos não podem ser excluídos diretamente por segurança.

#### [MODIFY] [masterService.ts](file:///e:/Sistemas/Ticketera/ticketera-main/src/services/masterService.ts)
- **Segurança no Service:** No método `deleteOrganizer`, adicionar uma verificação de status antes de iniciar a limpeza. Se o produtor for `approved`, lançar um erro impedindo a operação.
- **Exclusão Recursiva (Safe):** Para perfis permitidos, manter a lógica de limpeza recursiva:
  1. Deletar rascunhos de eventos.
  2. Deletar detalhes do organizador.
  3. Deletar bucket no MinIO (passando o `producerName` correto).
  4. Deletar usuário no Supabase Auth usando `supabaseAdmin`.

---

## Open Questions

- **Status "Rejeitado"**: Produtores com status `rejected` (rejeitados) também devem ser passíveis de exclusão? Faz sentido para "limpar a casa", mas queria confirmar se focamos apenas em `pending` e `incomplete`.

## Verification Plan

### Manual Verification
1. Tentar excluir um produtor **Ativo** e verificar que o botão não está disponível ou a operação falha com aviso.
2. Tentar excluir um produtor **Em Onboarding** e verificar se a limpeza total (DB, Auth e MinIO) ocorre com sucesso.
3. Tentar excluir um produtor **Pronto para Analisar** e verificar o mesmo sucesso.
