# 🚀 Guia Rápido: Como Publicar o OnMess

## ⚡ A Forma Mais Fácil (GitHub Pages - 5 minutos)

### Passo 1: Criar conta GitHub (se não tiver)
- Acesse [github.com](https://github.com)
- Clique em "Sign up"
- Preencha email e crie senha
- Confirme o email

### Passo 2: Criar repositório
- Clique no `+` canto superior direito
- Selecione "New repository"
- Nome: `onmess`
- Descrição: `Agenda de Eventos Profissional`
- Marque "Public"
- Clique "Create repository"

### Passo 3: Fazer upload dos arquivos
- Na página do repositório, clique em "Add file" → "Upload files"
- Arraste e solte TODOS esses arquivos:
  - `index.html`
  - `app.js`
  - `manifest.json`
  - `sw.js`
  - `README.md`
  - `.htaccess`
- Clique em "Commit changes"

### Passo 4: Ativar GitHub Pages
- Abra as "Settings" do repositório (aba superior)
- Role até "Pages" (menu esquerdo)
- Em "Source", selecione "Deploy from a branch"
- Em "Branch", escolha `main` e `/ (root)`
- Clique "Save"
- Espere 1-2 minutos...

### Pronto! 
Seu app estará em: **`https://seu-usuario-github.github.io/onmess/`**

Para acessar sempre:
1. Adicione aos favoritos
2. Ou instale como app (veja instruções no README.md)

---

## 🏠 Se Quiser Usar Seu Próprio Domínio

### Com Vercel (recomendado - MUITO fácil)

1. Acesse [vercel.com](https://vercel.com)
2. Clique "Continue with GitHub"
3. Autorize sua conta GitHub
4. Clique "New Project"
5. Selecione seu repositório `onmess`
6. Deploy automático em segundos!
7. URL gerada: `https://onmess.vercel.app` (personalizável)

### Ou com seu Servidor Web

Se tiver um servidor próprio ou hosting compartilhado:

1. **Preparar arquivos**:
   - Crie uma pasta `/public_html/onmess/` (ou equivalente)
   - Coloque todos os 6 arquivos lá

2. **Ativar HTTPS** (OBRIGATÓRIO):
   - Seu servidor deve ter SSL/TLS
   - Use Let's Encrypt (grátis)
   - Certificado deve ser válido

3. **Testes**:
   - Acesse: `https://seu-dominio.com/onmess`
   - Tente instalar como app
   - Teste offline (abra ferramentas dev → Application → Service Workers)

---

## 📱 Testar Localmente Antes de Publicar

1. Abra o arquivo `index.html` direto no navegador (funciona!)
2. Ou use um servidor local:
   ```bash
   # Se tiver Python 3 instalado:
   python -m http.server 8000
   # Depois acesse: http://localhost:8000
   
   # Se tiver Node.js:
   npx serve
   ```

---

## ✅ Checklist Pré-Publicação

- [ ] Todos os 6 arquivos estão juntos na pasta:
  - index.html
  - app.js
  - manifest.json
  - sw.js
  - README.md
  - .htaccess (opcional, só se usar Apache)
  
- [ ] Testei localmente no navegador (funciona?)
- [ ] Criei a conta GitHub ou Vercel
- [ ] Fiz upload dos arquivos
- [ ] Ativei GitHub Pages ou deployei no Vercel
- [ ] Acessei o link gerado (funciona?)
- [ ] Testei instalar como app no meu celular

---

## 🔐 Segurança Após Publicar

1. **Mude a senha padrão**:
   - Abra o app
   - Vá em `👥 Usuários`
   - Edite o usuário "Você"
   - Troque a senha de "admin" para algo seguro

2. **Compartilhe apenas o link**:
   - Não publique a senha em lugar nenhum
   - Compartilhe o link apenas com sua equipe
   - Crie usuários individuais para cada membro

3. **Backup dos dados**:
   - Vez em quando, exporte dados para CSV (nas abas correspondentes)
   - Ou siga o método de backup no README.md

---

## 🆘 Troubleshooting Publicação

| Problema | Solução |
|----------|---------|
| "404 Not Found" | Verifique se upload foi 100%. Refaça upload dos arquivos |
| PWA não funciona | Verifique se HTTPS está ativo (não http://) |
| "Service Worker failed" | Normal em http://. Publicar com HTTPS resolve |
| GitHub Pages não atualiza | Aguarde 2 minutos. Faça refresh (Ctrl+F5) |
| Pode instalar mas fica lento | Paciência. Primeira vez carrega tudo. Depois é rápido |

---

## 📞 Perguntas Frequentes

**P: Meus dados estão seguros?**  
R: Sim! Ficam guardados no seu navegador (localStorage). Nenhum servidor tem acesso.

**P: Posso usar em vários dispositivos?**  
R: Sim! Cada dispositivo tem seus dados. Faça backup/export se quiser sincronizar.

**P: Preciso pagar por GitHub/Vercel?**  
R: Não! Os planos grátis são mais que suficientes para este app.

**P: Como compartilhar com minha equipe?**  
R: Compartilhe o link (https://...). Eles abrem em qualquer navegador.

**P: Posso modificar o app?**  
R: Sim! Edite o `app.js` ou `index.html` e faça upload novamente.

---

**Pronto? Siga os passos acima e seu app estará online em menos de 10 minutos! 🎉**
