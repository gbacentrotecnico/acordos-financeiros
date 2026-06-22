# Plano de Implementação: Exclusão Inteligente (Profile vs. Organizer)

Ajustaremos o fluxo de exclusão para respeitar a arquitetura do sistema: produtores em onboarding são apenas "Profiles" e ainda não possuem registros nas tabelas complexas de "Organizer".

## User Review Required

> [!IMPORTANT]
> A exclusão de usuários em **Onboarding** agora será direta (Profile + Auth), sem tentar buscar dados de eventos ou faturamento, o que evitará os erros de "Registro não encontrado".

## Proposed Changes

### [Component] Master Admin Service

#### [MODIFY] [masterService.ts](file:///e:/Sistemas/Ticketera/ticketera-main/src/services/masterService.ts)

- **Unificação de Identidade**: Ajustar `getOrganizers` para garantir que o ID principal enviado para a interface seja sempre o `user_id` (Auth UID), garantindo consistência total.
- **Exclusão Condicional**: 
    1. Identificar o status do produtor antes de agir.
    2. Se estiver em **Pendente** ou **Onboarding**: Deletar apenas da tabela `profiles` e do `Auth` do Supabase.
    3. Se estiver em **Aprovado** (e futuramente for permitido excluir): Executar a limpeza recursiva pesada (eventos, staff, financeiro).
- **Privilégio Admin**: Usar `supabaseAdmin` para todas as operações críticas de busca e exclusão administrativa.

---

### [Component] Master Admin Dashboard

#### [MODIFY] [OrganizersManagement.tsx](file:///e:/Sistemas/Ticketera/ticketera-main/src/pages/dashboard/OrganizersManagement.tsx)

- Pequeno ajuste visual no toast de erro para ser mais amigável caso ocorra um timeout de rede.

## Verification Plan

### Manual Verification
1. Criar um novo cadastro de produtor (parar no Onboarding).
2. No painel Master, tentar excluir esse produtor.
3. Verificar se ele some da lista e se o usuário é removido do Supabase Auth.
4. Repetir o teste com um produtor que já tenha "Pronto para Analisar" (Step 4 do Onboarding).
