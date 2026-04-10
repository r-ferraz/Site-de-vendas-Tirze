// worker.js - Arquivo apenas para satisfazer o build do Cloudflare no GitHub
export default {
  async fetch(request, env, ctx) {
    // Redireciona para o site principal se alguém acessar a URL do worker diretamente
    return Response.redirect("https://maorisaude.com.br", 301);
  },
};
