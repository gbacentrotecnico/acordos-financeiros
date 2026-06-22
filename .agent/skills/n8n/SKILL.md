---
name: n8n-mcp
description: Princípios para construção e utilização do n8n via MCP. Integração de fluxos de trabalho, webhooks e automação de processos.
allowed-tools: Read, Write, Edit, Glob, Grep
---

# n8n MCP Builder

> Princípios e melhores práticas para utilização e construção de integrações MCP com o n8n.

---

## 1. Visão Geral do n8n via MCP

### O que é?

A integração do n8n via Model Context Protocol (MCP) permite que sistemas de IA acionem fluxos de trabalho do n8n, interajam com webhooks e gerenciem automações diretamente, conectando a IA ao ecossistema de APIs suportado pelo n8n.

### Conceitos Principais

| Conceito | Propósito |
|---------|---------|
| **Workflows** | Sequências de automação (DAGs) visuais e modulares |
| **Nodes** | Etapas individuais do fluxo (Gatilhos e Ações) |
| **Webhooks** | Pontos de entrada HTTP para acionar fluxos externamente pela IA |

---

## 2. Princípios de Design de Tools para n8n

### Design de Ferramentas Eficientes

| Princípio | Descrição |
|-----------|-------------|
| Nomeclatura Clara | Orientada à ação (ex: `trigger_n8n_workflow`, `get_workflow_status`) |
| Entradas Estruturadas | Enviar payloads JSON validados para os webhooks do n8n |
| Respostas Mapeadas | Tratar e formatar a saída do n8n para que a IA possa interpretar corretamente |

### Schema de Entrada

| Campo | Obrigatório? | Descrição |
|-------|-----------|-----------|
| workflowId | Sim | ID ou endpoint do workflow no n8n |
| payload | Não | Objeto JSON contendo os dados de entrada para a execução |
| method | Sim | Método HTTP (POST/GET) configurado no nó de Webhook |

---

## 3. Padrões de Execução

### Tipos de Gatilho (Triggers) no n8n para MCP

| Tipo | Uso |
|------|-----|
| **Webhook Node** | Principal método para a IA acionar fluxos em tempo real passando parâmetros |
| **Execute Workflow Trigger** | Para modularizar fluxos complexos chamados por um fluxo principal |
| **Error Trigger** | Para monitorar e reportar falhas de fluxos de volta para o ambiente via MCP |

---

## 4. Tratamento de Erros e Logs

### Situações Comuns

| Situação | Resposta Esperada |
|-----------|----------|
| Workflow Inativo | Erro indicando que o fluxo deve ser ativado no n8n |
| Erro de Autenticação | Mensagem pedindo validação de Header Auth ou API Key |
| Falha em um Node | Retornar o erro específico do n8n de forma estruturada para a IA |

### Melhores Práticas

- Sempre retorne erros estruturados.
- Para fluxos muito longos (processamento pesado), utilize "Respond Immediately" no Webhook do n8n e forneça endpoints para a IA checar o status (Polling) para evitar Timeouts.

---

## 5. Segurança na Integração

### Proteção de Endpoints

- **Autenticação:** Sempre proteja os nós de Webhook do n8n utilizando Header Auth ou Basic Auth.
- **Validação de Payload:** Valide os dados de entrada logo no início do workflow utilizando nós de Code ou Switch.
- **Segredos e Tokens:** Utilize as credenciais nativas (Credentials) do n8n; não repasse tokens ou chaves sensíveis através do payload enviado pelo MCP.

---

## 6. Checklist de Boas Práticas n8n MCP

- [ ] Os nomes das tools cadastradas no servidor MCP são focados na ação.
- [ ] O schema de entrada está bem tipado e documentado.
- [ ] O workflow do n8n possui um nó "Webhook" corretamente configurado para o método desejado.
- [ ] O nó "Webhook Response" (se necessário) está configurado para devolver a resposta no formato JSON esperado pela IA.
- [ ] Autenticações e credenciais estão isoladas dentro da plataforma do n8n.
- [ ] O tratamento de erros cobre falhas de execução e indisponibilidade do n8n.

---

> **Lembrete:** As ferramentas MCP que se comunicam com o n8n devem atuar como pontes previsíveis e seguras. Deixe toda a complexidade da integração, tratamento de dados de terceiros e regras de negócio complexas dentro dos nós do n8n, mantendo o contrato do MCP o mais simples possível.
