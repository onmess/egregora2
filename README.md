# OnMess — Agenda de Eventos

Aplicativo completo para gestão de eventos, artistas, músicas, contratos digitais e relatórios financeiros com prestação de contas.

## ✨ Funcionalidades

### 📅 Agenda & Eventos
- Calendário interativo com visualização mensal
- Registro completo de eventos (data, hora, local, contratante, cachê)
- Suporte a múltiplas moedas (EUR, USD, AOA)
- Checklist de produção personalizável com detalhes
- Sistema de pagamento em parcelas com recibos
- Assinatura digital de contratos online

### 🎤 Artistas & Presskit
- Perfil completo do artista (redes sociais, cachê padrão)
- Press kit centralizado:
  - Logo e fotos
  - Rider técnico (PDF)
  - Contratos do artista
  - Arquivos adicionais (one-sheet, vídeos, etc)
- Envio customizável por WhatsApp, E-mail ou compartilhamento nativo

### 🎵 Músicas
- Registro de todas as músicas (ISRC, distribuidora, compositores, produtores)
- Letra completa armazenada
- Sistema de assinatura digital para colaboradores (artistas, featuras, produtores)
- Rastreamento de status de assinatura

### 💰 Finanças
- **Prestação de contas automática** — receitas dos eventos são contabilizadas automaticamente
- Registro manual de despesas com categorias
- Anexação de recibos/comprovantes para cada transação
- Relatórios por período (mês/ano/todo)
- Resumo de saldo por moeda
- Exportação para CSV

### 📇 Fornecedores & Contatos
- Base de dados automática de contatos (contratantes + fornecedores)
- Busca e filtro por tipo
- Exportação CSV

### 💼 Vendedores (NOVO)
- Cadastre vendedores na aba **👥 Usuários** marcando "É vendedor"
- Opcionalmente defina a comissão (%) de cada vendedor
- Em cada evento, selecione o **Vendedor responsável** (quem fechou o show)
- O vendedor aparece na lista de eventos e no contrato gerado

### 🔐 Login com Senha (NOVO)
- A primeira tela é sempre o login (usuário + senha)
- Cada membro da equipe entra com a própria conta
- Botão "Sair" no topo para trocar de usuário
- O link público de assinatura de contrato NÃO exige login (o contratante assina direto)

### 👥 Controle de Acesso
- **Admin**: acesso total a tudo
- **Editor por artista**: pode criar/editar eventos, músicas e press kit de artistas específicos
- **Só músicas**: pode editar apenas informações musicais
- **Leitor**: visualização apenas

---

## 🚀 Como Usar

### Primeiro Acesso
1. Abra `index.html` no navegador
2. **Tela de login aparece primeiro** — entre com usuário e senha
3. Usuário padrão: `admin` / senha: `admin`
3. Crie uma logo (clique na logo "OM" no topo)
4. Adicione artistas na aba "🎤 Artistas"
5. Crie eventos na aba "📅 Agenda"

### Fluxo Típico de um Evento

1. **Criar o evento**: 
   - Clique no botão `+` ou em uma data no calendário
   - Preencha dados do artista, local, datas e valores
   - Preencha informações do contratante
   - Adicione checklist personalizado
   - Registre parcelas de pagamento

2. **Gerar contrato**: 
   - Clique em "contrato" na lista de eventos
   - Revise, copie ou envie por WhatsApp
   - Clique "✍️ Assinar" para assinatura digital
   - Ou gere um link exclusivo para o contratante assinar remotamente

3. **Acompanhar produção**: 
   - Marque itens da checklist conforme avançam
   - Adicione detalhes (nomes da equipe, lista de convidados, etc)

4. **Registrar pagamentos**: 
   - Cada parcela pode ter recibo/comprovativo anexado

5. **Prestação de contas**: 
   - Abra a aba "💰 Finanças"
   - Receitas aparecem automaticamente das parcelas de eventos
   - Registre despesas relacionadas (transporte, hotel, equipe, etc)
   - Anexe recibos/notas fiscais
   - Exporte relatório completo em CSV

### Enviando Material do Artista

1. Abra o perfil do artista (aba "🎤 Artistas")
2. Adicione logo, rider, fotos e contratos nos respectivos campos
3. No topo, marque o material que quer enviar
4. Escolha: "WhatsApp", "E-mail" ou "Compartilhar"
   - **WhatsApp/E-mail**: linka a conversa com texto pronto; você anexa os arquivos
   - **Compartilhar**: usa o compartilhamento nativo do seu dispositivo (funciona melhor em celular)

### Assinatura Digital de Contratos

#### Pelo Admin (você):
- Abra o evento → "contrato" → "✍️ Assinar aqui mesmo"
- Desenhe a assinatura e confirme

#### Para o Contratante Assinar:
- Abra o evento → "contrato" → "🔗 Link"
- Um link é copiado e enviado por WhatsApp automaticamente
- Contratante abre o link em qualquer dispositivo
- Desenha a assinatura online
- Fica registrada automaticamente no evento

---

## 📦 Como Publicar o App

### Opção 1: Publicar em um Servidor Web (Recomendado)

#### Via GitHub Pages (GRÁTIS)
1. Crie um repositório no GitHub com o nome `onmess`
2. Faça upload de todos os arquivos (.html, .js, .json)
3. Vá em **Settings** → **Pages**
4. Escolha **Deploy from a branch** → `main` → `/ (root)`
5. Seu app estará em: `https://seu-usuario.github.io/onmess/`

#### Via Vercel (GRÁTIS)
1. Faça upload dos arquivos no GitHub
2. Acesse [vercel.com](https://vercel.com)
3. Clique em "New Project"
4. Selecione o repositório
5. Deploy automático! URL: `https://seu-projeto.vercel.app`

#### Via Netlify (GRÁTIS)
1. Acesse [netlify.com](https://netlify.com)
2. Clique "New site from Git"
3. Conecte seu repositório GitHub
4. Deploy automático em: `https://seu-site.netlify.app`

#### Via seu próprio servidor
- Coloque os arquivos em `/var/www/onmess/` (ou equivalente)
- Configure HTTPS (use Let's Encrypt)
- Acesso em: `https://seu-dominio.com/onmess`

### Opção 2: Usar Localmente (sem publicar)

1. Abra `index.html` direto no navegador
2. Funciona completamente offline (dados salvos no aparelho)
3. Ideal para uso privado ou testing

---

## 📱 Instalar como App (Todos os Dispositivos)

### iPhone (iOS)
1. Abra o link do app no Safari
2. Toque o ícone **Compartilhar** (seta para cima)
3. Role para baixo e toque **"Adicionar à Tela Inicial"**
4. Confirme e pronto! Aparece como um app real

### Android (Chrome)
1. Abra o link no Chrome
2. Toque o ⋮ (menu, canto superior direito)
3. Toque **"Instalar app"** ou **"Adicionar à tela inicial"**
4. Pronto! Funciona como app nativo

### Desktop (Windows/Mac/Linux)
1. Abra no Chrome
2. Clique o ⊕ (ícone de app) na barra de endereços
3. Clique **"Instalar"**
4. Abre como janela de app (sem barra de endereço)

---

## 💾 Dados & Backup

### Onde os dados são salvos?
- **Navegador local**: localStorage (não conectado a nuvem)
- **Persiste entre sessões**: dados ficam mesmo se fechar o app
- **Cada dispositivo tem seus dados**: celular A ≠ celular B ≠ computador

### Como fazer backup?

**Exportar dados para salvar:**
```javascript
// No console do navegador (F12):
JSON.stringify({
  artists: JSON.parse(localStorage.getItem('artists')),
  shows: JSON.parse(localStorage.getItem('shows')),
  tracks: JSON.parse(localStorage.getItem('tracks')),
  expenses: JSON.parse(localStorage.getItem('expenses')),
  suppliers: JSON.parse(localStorage.getItem('suppliers')),
  users: JSON.parse(localStorage.getItem('users'))
})
```
Copie o resultado e salve em um arquivo .txt/json

**Restaurar dados:**
```javascript
const backup = { /* seus dados aqui */ };
Object.entries(backup).forEach(([k,v]) => localStorage.setItem(k, JSON.stringify(v)));
```

---

## 🔧 Desenvolvimento & Customização

### Estrutura de Arquivos
```
onmess/
├── index.html          # Interface (HTML + CSS)
├── app.js              # Lógica completa (JavaScript)
├── manifest.json       # Configuração PWA
├── sw.js               # Service Worker (funciona offline)
└── README.md           # Este arquivo
```

### Adicionar Moedas Novas
Abra `app.js` e procure por `fmtCurrency()`. Adicione no switch:
```javascript
if(c==='GBP') return `£ ${v||'0'}`;
```

### Mudar Cores
Abra `index.html` e procure por `:root{` no CSS. Edite as variáveis de cor.

### Adicionar Novos Campos
- **Eventos**: adicione ao modal #showModalBg
- **Artistas**: adicione ao modal #artistModalBg
- **Finanças**: adicione ao formulário na aba

---

## 🐛 Troubleshooting

| Problema | Solução |
|----------|---------|
| Dados desaparecidos | Navegador limpou cache. Sempre faça backup! |
| Arquivo muito grande | Reduza tamanho de fotos (máx 1-2 MB por imagem) |
| App lento com muitos eventos | Normal. Considere arquivar eventos antigos |
| Assinatura não funciona | Use Edge ou Chrome. Safari pode ter limitações |
| WhatsApp não abre | Copie a mensagem manualmente |

---

## 📋 Checklist de Configuração Inicial

- [ ] Mude a senha do admin (`👥 Usuários` → Editar "Você")
- [ ] Adicione a logo da sua empresa (clique no logo "OM")
- [ ] Crie usuários para sua equipe (`👥 Usuários`)
- [ ] Adicione os artistas que você gerencia (`🎤 Artistas`)
- [ ] Configure permissões por usuário (quem vê qual artista)
- [ ] Teste criar um evento e gerar contrato
- [ ] Faça backup dos primeiros dados

---

## 📞 Suporte & Documentação

- **PWA/App**: Funciona offline e funciona como app nativo (manifesto incluído)
- **Navegadores suportados**: Chrome, Edge, Safari 14+, Firefox
- **Móvel**: totalmente responsivo, otimizado para celular
- **Dados**: completamente privado, nenhum servidor externo

---

**Versão**: 1.0  
**Última atualização**: Julho 2026  
**Licença**: Privado/Pessoal
