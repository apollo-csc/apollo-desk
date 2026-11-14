/*
 * ApolloDesk — tema do login no padrão dos apps Apollo.
 *
 * Faz duas coisas:
 *   1. marca o <body> quando a rota é de autenticação, para o login-apollo.css
 *      saber onde aplicar;
 *   2. injeta o rodapé do padrão — divisor "ou continue com", botão do
 *      ApolloAuth, aviso legal e assinatura — que não existem no DOM do
 *      Chatwoot.
 *
 * POR QUE O MARCADOR DE ROTA PRECISA EXISTIR
 * ------------------------------------------
 * O Chatwoot é uma SPA: o mesmo documento (e o mesmo <main>) serve o login e o
 * app inteiro, e o Rails entrega o mesmo layout para todas as rotas. Sem a
 * classe, o tema do login vazaria para o dashboard — nebulosa, fonte
 * monoespaçada e tudo.
 *
 * POR QUE A INJEÇÃO É MÍNIMA E DEFENSIVA
 * --------------------------------------
 * Mexer no DOM de um componente Vue compilado é frágil por natureza: o
 * componente pode remontar e levar o que a gente pendurou. Por isso aqui só se
 * ACRESCENTA um bloco irmão depois do <form>, nunca se altera o que o Chatwoot
 * renderiza; a operação é idempotente (marcada por id) e roda de novo quando o
 * formulário reaparece. Se o seletor do form mudar numa versão nova, o bloco
 * simplesmente não aparece — o login continua funcionando.
 */
/*
 * GUARDA DO BANCO LOCAL DO DESK (14/nov/2026) — fica NESTE arquivo de propósito.
 * ---------------------------------------------------------------------------------
 * Sintoma que ela evita: a pessoa entra e a tela vem sem os canais, as etiquetas e os times no
 * menu, e a caixa de resposta sem o clipe e sem o microfone. O servidor responde tudo certo.
 *
 * Causa (Chatwoot 4.17, CacheEnabledApiClient): caixas, etiquetas e times passam por um
 * IndexedDB `cw-store-<conta>` ANTES de qualquer chamada ao servidor. Ao sair da conta, o
 * Chatwoot manda apagar esse banco. Se houver outra janela do Desk aberta no mesmo navegador
 * (aba + aplicativo instalado), o apagamento fica bloqueado pela conexão dela e toda abertura
 * nova entra na fila atrás dele: `initDb()` nunca resolve, as três listas ficam vazias e nenhum
 * erro aparece. Sem a lista de caixas a tela não sabe o tipo do canal e esconde anexo e áudio.
 *
 * O que a guarda faz, só para bancos `cw-store-*`:
 *   1. toda conexão aberta se FECHA quando outra janela pede para apagar/atualizar o banco
 *      (`versionchange`), então o apagamento não fica bloqueado;
 *   2. se a abertura não responder em 2 s (janela antiga ainda sem a guarda, ou outro motivo),
 *      a guarda avisa erro ao pedido: o Chatwoot já trata erro de abertura caindo para a rede.
 *
 * Por que aqui: este é o único script nosso que o layout carrega SEM `defer` e que o Caddy serve
 * sem cache — roda antes de o aplicativo abrir o banco e chega a todos na próxima carga.
 */
(function () {
  'use strict';
  if (!window.indexedDB || window.__apolloGuardaIdb) return;
  window.__apolloGuardaIdb = true;
  var ESPERA_MS = 2000;
  var abrir = window.indexedDB.open;
  window.indexedDB.open = function (nome) {
    var pedido = abrir.apply(window.indexedDB, arguments);
    if (String(nome || '').indexOf('cw-store-') !== 0) return pedido;
    var respondeu = false, desistiu = false;
    var relogio = setTimeout(function () {
      if (respondeu) return;
      desistiu = true;
      // Quem escuta o erro lê `pedido.error`, e num pedido ainda pendente essa leitura LANÇA exceção
      // (o aviso morreria dentro do ouvinte e a tela seguiria travada): a guarda responde no lugar.
      try {
        Object.defineProperty(pedido, 'error', { configurable: true, get: function () { return new DOMException('abertura do banco local sem resposta', 'TimeoutError'); } });
        pedido.dispatchEvent(new Event('error'));
      } catch (e) { /* segue esperando */ }
    }, ESPERA_MS);
    pedido.addEventListener('success', function () {
      respondeu = true; clearTimeout(relogio);
      if (desistiu) { try { delete pedido.error; } catch (e) { /* sem efeito */ } }
      var banco = pedido.result; if (!banco) return;
      // A tela já seguiu pela rede: não segurar uma conexão que ninguém usa (ela bloquearia o próximo apagamento).
      if (desistiu) { try { banco.close(); } catch (e) { /* já fechada */ } return; }
      banco.addEventListener('versionchange', function () { try { banco.close(); } catch (e) { /* já fechada */ } });
    });
    pedido.addEventListener('error', function () { respondeu = true; clearTimeout(relogio); });
    return pedido;
  };
})();

(function () {
  'use strict';

  // /app/login, /app/auth/reset/password, /app/auth/password/edit...
  var ROTAS = /^\/app\/(login|auth\/|signup)/;

  /*
   * Início do fluxo OIDC contra o ApolloAuth (E2, 01/set/2026).
   *
   * ⚠️ TEM DE SER POST, E COM TOKEN CSRF. Duas armadilhas de uma vez:
   *
   *   1. O OmniAuth 2 só aceita POST na fase de request
   *      (`OmniAuth.config.allowed_request_methods == [:post]`). Um link GET
   *      devolve 404 — que parece "rota não existe" e manda a investigação
   *      para o lado errado.
   *   2. O Chatwoot usa omniauth-rails_csrf_protection: POST sem
   *      `authenticity_token` é engolido e vira redirect para /auth/sign_in,
   *      como se a credencial estivesse errada.
   *
   * Por isso montamos um formulário de verdade, com o token que o Rails já
   * publica no <meta name="csrf-token"> da página.
   */
  var SSO_URL = '/omniauth/openid_connect';
  var ID_BLOCO = 'apollo-login-rodape';

  function criarBloco() {
    var frag = document.createElement('div');
    frag.id = ID_BLOCO;

    var divisor = document.createElement('div');
    divisor.className = 'alogin-divisor';
    divisor.setAttribute('aria-hidden', 'true');
    divisor.textContent = 'ou continue com';

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'alogin-btn-sso';

    var icone = document.createElement('img');
    icone.src = '/apollo-login/aa-icone.png';
    icone.alt = '';
    btn.appendChild(icone);
    btn.appendChild(document.createTextNode('Continuar com ApolloAuth'));

    var aviso = document.createElement('p');
    aviso.className = 'alogin-aviso';

    btn.addEventListener('click', function () {
      var meta = document.querySelector('meta[name="csrf-token"]');
      if (!meta || !meta.content) {
        aviso.textContent =
          'Não foi possível iniciar o login pelo ApolloAuth (token de segurança ausente). Recarregue a página.';
        return;
      }
      var form = document.createElement('form');
      form.method = 'POST';
      form.action = SSO_URL;
      form.style.display = 'none';
      var campo = document.createElement('input');
      campo.type = 'hidden';
      campo.name = 'authenticity_token';
      campo.value = meta.content;
      form.appendChild(campo);
      document.body.appendChild(form);
      form.submit();
    });

    var legal = document.createElement('p');
    legal.className = 'alogin-legal';
    // Texto puro, sem links — igual ao ApolloMail. As páginas de Termos e
    // Privacidade ainda não existem no site (dão 404), e link quebrado numa
    // tela de login é pior que texto simples.
    legal.textContent =
      'Ao continuar, você concorda com os Termos de Uso e a Política de Privacidade.';

    var assinatura = document.createElement('p');
    assinatura.className = 'alogin-rodape';
    assinatura.textContent = 'ApolloDesk';

    frag.appendChild(divisor);
    frag.appendChild(btn);
    frag.appendChild(aviso);
    frag.appendChild(legal);
    frag.appendChild(assinatura);
    return frag;
  }

  function injeta() {
    if (document.getElementById(ID_BLOCO)) return;
    var form = document.querySelector('main form');
    if (!form || !form.parentElement) return;
    form.parentElement.appendChild(criarBloco());
  }

  function aplica() {
    var eLogin = ROTAS.test(window.location.pathname);
    document.body.classList.toggle('apollo-login', eLogin);
    if (!eLogin) {
      var velho = document.getElementById(ID_BLOCO);
      if (velho) velho.remove();
      return;
    }
    injeta();
  }

  // A navegação da SPA não dispara `popstate` — quem troca a rota é o
  // history.pushState do vue-router. Envelopamos os dois para reagir também a
  // isso; sem esse trecho, sair do login para o dashboard mantinha o tema.
  ['pushState', 'replaceState'].forEach(function (metodo) {
    var original = history[metodo];
    history[metodo] = function () {
      var r = original.apply(this, arguments);
      aplica();
      return r;
    };
  });
  window.addEventListener('popstate', aplica);

  // O formulário é renderizado pelo Vue DEPOIS do DOMContentLoaded, então
  // injetar uma vez só não bastaria. O observer acompanha a montagem e para
  // sozinho assim que o bloco entra.
  function observa() {
    var obs = new MutationObserver(function () {
      aplica();
      if (document.getElementById(ID_BLOCO)) obs.disconnect();
    });
    obs.observe(document.body, { childList: true, subtree: true });
    // Rede de segurança: se o form nunca aparecer, não observar para sempre.
    setTimeout(function () {
      obs.disconnect();
    }, 15000);
  }

  function inicia() {
    aplica();
    observa();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', inicia);
  } else {
    inicia();
  }
})();
