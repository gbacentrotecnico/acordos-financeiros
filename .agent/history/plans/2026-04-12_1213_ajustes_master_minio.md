# Ajustes Finos: Dashboard Master, Faxina Geral e Evolução do MinIO

Este plano visa melhorar a experiência do Master Admin ao analisar produtores, organizar o repositório removendo códigos legados e aprimorar a estrutura de armazenamento no MinIO.

## User Review Required

> [!IMPORTANT]
> **Mudança na Nomenclatura de Buckets:** Ao incluir o nome do produtor no ID do bucket, arquivos antigos (se existirem) não serão encontrados automaticamente a menos que renomeemos os buckets manualmente ou o produtor faça o upload novamente. Como você mencionou que deseja "zerar" o MinIO, este é o momento ideal para essa mudança.
>
> **Faxina de Arquivos:** Vou remover todos os scripts `.js` da raiz que eram referentes ao Appwrite e migrações antigas. Se houver algum script que você ainda usa manualmente, me avise.

## Proposed Changes

### 1. Dashboard Master Admin

#### [MODIFY] [OrganizersManagement.tsx](file:///e:/Sistemas/Ticketera/ticketera-main/src/pages/dashboard/OrganizersManagement.tsx)
- Corrigir a lógica do `onClick` na tabela para permitir abrir os detalhes do produtor em qualquer status (não apenas "Incompleto").
- Garantir que o modal de detalhes exiba todos os campos críticos preenchidos no onboarding (CNPJ, CPF, Endereço, Nome Fantasia).

---

### 2. Infraestrutura MinIO (Vite Plugin)

#### [MODIFY] [vite.config.ts](file:///e:/Sistemas/Ticketera/ticketera-main/vite.config.ts)
- Atualizar o `minioApiPlugin` para aceitar um campo `producerName` no payload.
- Alterar a geração do `bucketName` para o formato: `producer-{userId}-{nome-sanitizado}`.
- Adicionar lógica de sanitização para garantir que o nome seja compatível com as regras do S3 (minusculas, sem espaços, sem caracteres especiais).

#### [MODIFY] [organizerService.ts](file:///e:/Sistemas/Ticketera/ticketera-main/src/services/organizerService.ts)
- Atualizar o método `uploadImage` para enviar o nome da empresa/produtor ao endpoint de criação de bucket.

---

### 3. Faxina e Organização

#### [DELETE] Scripts Legados (Raiz)
- Remover arquivos relacionados ao Appwrite e testes antigos:
  - `appwrite.yaml`, `.env.appwrite`
  - `setup_appwrite.js`, `fix_appwrite.js`, `fix_appwrite2.js`, `fix_appwrite3.js`
  - `check_appwrite.js`, `check_profiles.js`, `check_users.js`
  - `create_indexes.js`, `create_master.js`
  - `delete_test_users.js`, `diagnostic.js`
  - `setup_storage.js`, `raw-attributes.txt`, `schema-report.txt`
  - `sizes-node.txt`, `sizes.txt`

---

## Open Questions

- **Bucket `a2tickets360`:** Você mencionou que quer apagar e zerar o MinIO. Deseja que eu execute um script para remover esse bucket específico e seus arquivos agora?
- **Sanitização de Nome:** Se o "Nome Fantasia" for muito longo, devo cortá-lo (ex: max 20 caracteres) para manter o nome do bucket dentro do limite de 63 caracteres do S3?

## Verification Plan

### Automated Tests
- Testar o endpoint `/api/minio/ensure-bucket` via console para verificar se o novo formato de nome é criado corretamente.
- Verificar se o `organizerService` envia os dados corretos.

### Manual Verification
1. Abrir o Dashboard Master -> Aba "Pronto para Analisar".
2. Clicar em um produtor e verificar se o modal abre com todos os dados.
3. Tentar fazer o upload de uma imagem em um perfil de produtor e verificar no console se o bucket criado no MinIO contém o nome do produtor.
