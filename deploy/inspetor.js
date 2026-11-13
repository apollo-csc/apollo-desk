// ApolloDesk — painel do Inspetor de atendimento, em Relatórios (ver deploy/patch-inspetor.rb).
// Pedido do Leonardo (13/nov/2026), E4 da APOLLO-335. Desenho: seção 22 do documento do Inspetor.
//
// O painel mostra o MESMO conteúdo dos dois PDFs do fechamento, com duas coisas a mais: escolher o dia e ver, em cada número, a
// diferença para o dia anterior. Só administradores da conta enxergam, e só nas contas com o painel ligado: quem decide é o servidor
// (o controlador recusa os demais); este script só esconde o que o servidor já negaria.
//
// O front do Desk não é recompilado no nosso build, então a tela é desenhada aqui, por fora do bundle:
//   1. um item novo no menu de Relatórios (clone do último item, para herdar o visual);
//   2. a tela, numa camada própria ao lado do conteúdo da rota (o endereço ganha #inspetor: voltar, recarregar e link direto funcionam);
//   3. as cores vêm das variáveis do próprio Desk (--slate-*, --solid-*, --teal-*, --ruby-*), que trocam sozinhas no tema escuro.
// Tudo o que vem do servidor é texto de cliente ou de atendente: entra na tela SEMPRE escapado (função e()).
(function () {
  'use strict';
  var HASH = '#inspetor';
  var estado = { conta: null, ligado: null, dia: '', dados: null, carregando: false, erro: '', aberto: null, aba: 'demoras' };

  // ---- utilidades ----
  function app() { var el = document.getElementById('app'); return el && el.__vue_app__; }
  function roteador() { var a = app(); return a && a.config && a.config.globalProperties && a.config.globalProperties.$router; }
  function contaId() { var m = location.pathname.match(/\/app\/accounts\/(\d+)/); return m ? m[1] : null; }
  function cabecalhos() {
    try {
      var par = document.cookie.split('; ').filter(function (c) { return c.indexOf('cw_d_session_info=') === 0; })[0];
      if (!par) return {};
      var h = JSON.parse(decodeURIComponent(par.slice('cw_d_session_info='.length)));
      return { 'access-token': h['access-token'], client: h.client, uid: h.uid, 'token-type': h['token-type'] || 'Bearer' };
    } catch (err) { return {}; }
  }
  // window.__APOLLO_INSPETOR_AMOSTRA(dia) devolve dados de exemplo: só para desenhar a tela sem o servidor.
  function busca(caminho) {
    if (window.__APOLLO_INSPETOR_AMOSTRA) return Promise.resolve(window.__APOLLO_INSPETOR_AMOSTRA(caminho));
    return fetch('/api/v1/accounts/' + contaId() + '/apollo_inspetor' + caminho, { headers: cabecalhos(), credentials: 'same-origin' })
      .then(function (r) { if (!r.ok) throw new Error(String(r.status)); return r.json(); });
  }
  function e(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  var SEMANA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'], MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  function rotuloDia(dia) {
    var p = String(dia || '').split('-'); if (p.length !== 3) return String(dia || '');
    var d = new Date(Date.UTC(+p[0], +p[1] - 1, +p[2], 12));
    return SEMANA[d.getUTCDay()] + ', ' + p[2] + '/' + MESES[+p[1] - 1];
  }
  function diaAntes(dia) { var d = new Date(String(dia) + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() - 1); return d.toISOString().slice(0, 10); }
  function dur(min) { var m = Math.round(Number(min) || 0); return m < 60 ? m + ' min' : Math.floor(m / 60) + ' h ' + ('0' + (m % 60)).slice(-2); }
  function reais(v) { return 'R$ ' + (Number(v) || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function hora(ts) { if (!ts) return ''; var d = new Date((Number(ts) - 3 * 3600) * 1000); return ('0' + d.getUTCHours()).slice(-2) + 'h' + ('0' + d.getUTCMinutes()).slice(-2); }
  function formata(chave, v) {
    if (v == null) return '–';
    if (chave === 'mediana') return dur(v);
    if (chave === 'ate30') return Math.round(v) + '%';
    if (chave === 'orcamentos_valor') return reais(v);
    return String(Math.round(v * 10) / 10);
  }
  // A diferença para o dia anterior: verde quando melhorou, vermelho quando piorou, cinza quando o número não tem sentido de melhor.
  function diferenca(chave, valor, anterior, melhor) {
    if (valor == null || anterior == null) return '';
    var d = valor - anterior;
    if (Math.abs(d) < 0.05) return '<span class="ai-d ai-igual">= igual</span>';
    var classe = !melhor ? 'ai-igual' : ((d < 0) === (melhor === 'menor') ? 'ai-bom' : 'ai-ruim');
    var texto = chave === 'mediana' ? dur(Math.abs(d)) : chave === 'orcamentos_valor' ? reais(Math.abs(d)) : chave === 'ate30' ? Math.round(Math.abs(d)) + ' p.p.' : String(Math.round(Math.abs(d) * 10) / 10);
    return '<span class="ai-d ' + classe + '">' + (d > 0 ? '▲ +' : '▼ −') + e(texto) + '</span>';
  }

  // ---- estilo: as variáveis são as do Desk ----
  var CSS = [
    '#ai-painel{flex:1 1 0%;min-width:0;height:100%;overflow:auto;padding:0 1.5rem;background:rgb(var(--surface-1));color:rgb(var(--slate-12));font-size:.875rem;line-height:1.45}',
    '.ai-oculto{display:none!important}',
    '.ai-dentro{max-width:64rem;margin:0 auto;padding-bottom:3rem}',
    '.ai-topo{display:flex;flex-wrap:wrap;gap:.75rem 1.5rem;justify-content:space-between;align-items:flex-end;padding:1.5rem 0 1rem}',
    '.ai-titulo{font-size:1.25rem;font-weight:500;line-height:2.5rem;letter-spacing:-.01em;margin:0}',
    '.ai-sub{color:rgb(var(--slate-11))}',
    '.ai-dia{display:flex;align-items:center;gap:.375rem}',
    '.ai-btn{font:inherit;font-weight:500;height:2rem;min-width:2rem;width:auto;margin:0;flex:none;padding:0 .75rem;border-radius:.5rem;border:0;white-space:nowrap;line-height:1;background:rgb(var(--slate-9)/.1);color:rgb(var(--slate-12));cursor:pointer}',
    '.ai-btn:hover{background:rgb(var(--slate-9)/.2)}.ai-btn:disabled{opacity:.4;cursor:default}',
    '.ai-btn:focus-visible,.ai-abas button:focus-visible,tr.ai-linha:focus-visible{outline:2px solid rgb(var(--blue-9));outline-offset:2px}',
    'select.ai-btn{appearance:auto;padding-right:.25rem;max-width:none;background-image:none}',
    '.ai-aviso{margin:.25rem .125rem 0;padding:.5rem .75rem;border-radius:.5rem;background:rgb(var(--amber-3));color:rgb(var(--amber-12))}',
    '.ai-secao{margin-top:1.5rem;display:flex;flex-direction:column;gap:.75rem}',
    '.ai-secao h2{font-size:1rem;font-weight:500;margin:0;display:flex;flex-wrap:wrap;gap:.25rem .75rem;align-items:baseline}',
    '.ai-secao h2 small{font-size:.8125rem;font-weight:400;color:rgb(var(--slate-11))}',
    '.ai-card{margin:.125rem;border-radius:.75rem;background:rgb(var(--solid-2));outline:1px solid rgb(var(--border-container));box-shadow:0 1px 3px 0 rgb(0 0 0/.1),0 1px 2px -1px rgb(0 0 0/.1)}',
    '.ai-tiles{display:grid;grid-template-columns:repeat(auto-fill,minmax(10.5rem,1fr));gap:.5rem}',
    '.ai-tile{padding:.75rem 1rem;display:flex;flex-direction:column;gap:.25rem;min-width:0}',
    '.ai-tile .ai-r{font-size:.75rem;color:rgb(var(--slate-11));min-height:2.1em}',
    '.ai-tile .ai-v{font-size:1.5rem;font-weight:500;line-height:1.15;font-variant-numeric:tabular-nums}',
    '.ai-d{display:inline-flex;align-items:center;font-size:.75rem;font-weight:500;padding:0 .4rem;border-radius:999px;white-space:nowrap;font-variant-numeric:tabular-nums;align-self:flex-start}',
    '.ai-bom{background:rgb(var(--teal-3));color:rgb(var(--teal-11))}.ai-ruim{background:rgb(var(--ruby-3));color:rgb(var(--ruby-11))}.ai-igual{background:rgb(var(--slate-3));color:rgb(var(--slate-11))}',
    '.ai-rola{overflow-x:auto}',
    '.ai-tab{border-collapse:collapse;width:100%;min-width:52rem}',
    '.ai-tab th,.ai-tab td{text-align:left;padding:.625rem .5rem;border-bottom:1px solid rgb(var(--border-container));vertical-align:middle}',
    '.ai-tab th:first-child,.ai-tab td:first-child{padding-left:.75rem}',
    '.ai-tab th{font-size:.75rem;font-weight:500;color:rgb(var(--slate-11));white-space:nowrap}',
    '.ai-tab td.ai-n{white-space:nowrap;font-variant-numeric:tabular-nums}.ai-tab td.ai-n b{font-weight:500;margin-right:.375rem}',
    '.ai-tab tr:last-child td{border-bottom:0}',
    'tr.ai-linha{cursor:pointer}tr.ai-linha:hover{background:rgb(var(--slate-9)/.06)}',
    'tr.ai-linha td:first-child{font-weight:500;white-space:nowrap}tr.ai-linha td:first-child:before{content:"▸";display:inline-block;width:1rem;color:rgb(var(--slate-10))}',
    'tr.ai-linha.ai-aberta td:first-child:before{content:"▾"}',
    'tr.ai-det td{background:rgb(var(--slate-9)/.05);padding:1rem 1rem 1.25rem 1.75rem}',
    '.ai-extras{display:flex;flex-wrap:wrap;gap:.25rem 1.25rem;color:rgb(var(--slate-11));margin-bottom:.75rem}.ai-extras b{color:rgb(var(--slate-12));font-weight:500}',
    '.ai-itens{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:.625rem}',
    '.ai-itens li{display:grid;grid-template-columns:11rem minmax(0,1fr) auto;gap:.25rem 1rem;align-items:start;padding-bottom:.625rem;border-bottom:1px dashed rgb(var(--border-container))}',
    '.ai-itens li:last-child{border-bottom:0;padding-bottom:0}',
    '.ai-tipo{font-size:.75rem;font-weight:500;color:rgb(var(--slate-11))}',
    '.ai-fala{min-width:0;overflow-wrap:anywhere}.ai-fala q{quotes:"“" "”";background:rgb(var(--slate-9)/.1);border-radius:.375rem;padding:0 .3rem}.ai-fala small{display:block;color:rgb(var(--slate-11))}',
    '.ai-lnk{color:rgb(var(--blue-11));font-weight:500;white-space:nowrap;text-decoration:none}.ai-lnk:hover{text-decoration:underline}',
    '.ai-abas{display:flex;flex-wrap:wrap;gap:.375rem}',
    '.ai-abas button{font:inherit;height:1.875rem;padding:0 .75rem;border-radius:999px;border:0;background:rgb(var(--slate-9)/.1);color:rgb(var(--slate-12));cursor:pointer}',
    '.ai-abas button.ai-on{background:rgb(var(--blue-9));color:#fff;font-weight:500}',
    '.ai-grupo{padding:1rem 1.25rem}.ai-grupo+.ai-grupo{border-top:1px solid rgb(var(--border-container))}.ai-grupo h3{font-size:.875rem;font-weight:500;margin:0 0 .625rem}',
    '.ai-vazio{padding:1rem 1.25rem;color:rgb(var(--slate-11))}',
    '.ai-ver{display:inline-flex;gap:.25rem;font-size:.75rem;font-weight:500;padding:.0625rem .5rem;border-radius:999px;white-space:nowrap}',
    '.ai-conta{display:block;font-size:.6875rem;color:rgb(var(--slate-11));white-space:nowrap;margin-top:.125rem}',
    'body.ai-aberto a.router-link-exact-active:not([data-apollo-inspetor]){background:transparent!important;color:inherit!important}',
    '@media (max-width:48rem){.ai-itens li{grid-template-columns:1fr}#ai-painel{padding:0 1rem}}',
  ].join('\n');

  // ---- 1) item no menu de Relatórios ----
  function listaDoMenu() {
    var a = document.querySelector('a[href$="/reports/bot"], a[href$="/reports/csat"], a[href$="/reports/overview"]');
    var li = a && a.closest('li'); return li && li.parentElement;
  }
  function poeNoMenu() {
    var ul = listaDoMenu(); if (!ul || ul.querySelector('[data-apollo-inspetor]')) return;
    var modelo = ul.lastElementChild; if (!modelo) return;
    var li = modelo.cloneNode(true); var a = li.querySelector('a'); if (!a) return;
    li.removeAttribute('name'); a.dataset.apolloInspetor = '1';
    a.setAttribute('href', '/app/accounts/' + contaId() + '/reports/overview' + HASH); a.setAttribute('title', 'Inspetor de atendimento'); a.removeAttribute('aria-current');
    a.className = a.className.replace(/\brouter-link-(exact-)?active\b|\bactive\b|\btext-n-slate-12\b|\bbg-n-alpha-2\b/g, '').replace(/\s+/g, ' ').trim();
    var rotulo = a.querySelector('div') || a; rotulo.textContent = 'Inspetor de atendimento';
    a.addEventListener('click', function (ev) { ev.preventDefault(); abre(); });
    ul.appendChild(li);
    marcaMenu();
  }
  function marcaMenu() {
    var a = document.querySelector('a[data-apollo-inspetor]'); if (!a) return;
    var on = location.hash === HASH;
    ['text-n-slate-12', 'bg-n-alpha-2', 'active'].forEach(function (c) { a.classList.toggle(c, on); });
    if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  }
  function abre() {
    var r = roteador(); var destino = '/app/accounts/' + contaId() + '/reports/overview' + HASH;
    if (r) r.push(destino); else location.assign(destino);
    agenda();
  }
  // O roteador do Desk muda o endereço por pushState: não há hashchange nem popstate. O painel se pendura no próprio roteador, uma vez.
  var roteadorLigado = false;
  function ligaRoteador() {
    var r = roteador(); if (roteadorLigado || !r || !r.afterEach) return;
    roteadorLigado = true; r.afterEach(function () { agenda(); });
  }

  // ---- 2) a tela ----
  function carrega(dia) {
    estado.carregando = true; estado.erro = ''; desenha();
    busca('?dia=' + encodeURIComponent(dia || '')).then(function (d) {
      estado.dados = d; estado.dia = d.dia; estado.carregando = false; estado.aberto = null; desenha();
    }).catch(function () { estado.carregando = false; estado.erro = 'Não foi possível carregar o painel. Tente atualizar.'; desenha(); });
  }
  function cabecalho() {
    var d = estado.dados || {}; var dias = (d.dias || []).slice(); if (estado.dia && dias.indexOf(estado.dia) < 0) dias.push(estado.dia); dias.sort();
    var i = dias.indexOf(estado.dia);
    var opcoes = dias.map(function (x) { return '<option value="' + e(x) + '"' + (x === estado.dia ? ' selected' : '') + '>' + e(rotuloDia(x)) + (x === d.hoje ? ' (hoje)' : '') + '</option>'; }).join('');
    return '<div class="ai-topo"><div><h1 class="ai-titulo">Inspetor de atendimento</h1><div class="ai-sub">O fechamento de cada dia, comparado com o dia anterior. Visível só para administradores.</div></div>' +
      '<div class="ai-dia"><button class="ai-btn" data-ai="antes" aria-label="Dia anterior"' + (i <= 0 ? ' disabled' : '') + '>◀</button>' +
      '<select class="ai-btn" id="ai-dia" aria-label="Dia">' + opcoes + '</select>' +
      '<button class="ai-btn" data-ai="depois" aria-label="Próximo dia"' + (i < 0 || i >= dias.length - 1 ? ' disabled' : '') + '>▶</button>' +
      '<button class="ai-btn" data-ai="atualiza">Atualizar</button></div></div>';
  }
  function avisos(p) {
    var a = [];
    if (p.parcial) a.push('Dia em andamento, até ' + e(p.hora || '') + '. A comparação é parcial: o dia anterior está completo.');
    if (p.incompleto) a.push('No fechamento o Inspetor ainda lia as conversas mais recentes: qualidade, orçamentos e ranking podem estar incompletos.');
    if (!p.comparado_com) a.push('Sem comparação: ' + e(rotuloDia(diaAntes(p.dia))) + ' não teve fechamento.');
    return a.map(function (t) { return '<div class="ai-aviso">' + t + '</div>'; }).join('');
  }
  function numeros(p) {
    return '<section class="ai-secao"><h2>O dia em números <small>' + (p.comparado_com ? 'comparado com ' + e(rotuloDia(p.comparado_com)) : 'sem comparação') + '</small></h2><div class="ai-tiles">' +
      p.totais.map(function (t) {
        return '<div class="ai-card ai-tile"><span class="ai-r">' + e(t.rotulo) + '</span><span class="ai-v">' + e(formata(t.chave, t.valor)) + '</span>' + diferenca(t.chave, t.valor, t.anterior, t.melhor) + '</div>';
      }).join('') + '</div></section>';
  }
  var COLUNAS = [['conversas', 'Conversas'], ['demoras', 'Demoras'], ['esperando', 'Esperando'], ['venda_ruim', 'Venda ruim'], ['respostas_curtas', 'Curtas'],
                 ['ortografia', 'Ortografia'], ['orcamentos', 'Orçam.'], ['qualidade', 'Qualidade']];
  var VEREDITO = { evoluiu: ['ai-bom', '▲ Evoluiu'], regrediu: ['ai-ruim', '▼ Regrediu'], estavel: ['ai-igual', '= Estável'], sem_comparacao: ['ai-igual', 'Sem comparação'] };
  function celula(chave, i) { return '<td class="ai-n"><b>' + e(formata(chave, i.valor)) + '</b>' + diferenca(chave, i.valor, i.anterior, i.melhor) + '</td>'; }
  function itensDe(p, nome) {   // os apontamentos do dia de uma pessoa, tirados dos detalhes (os mesmos do PDF de detalhes)
    var out = [];
    ['demoras', 'esperando', 'ortografia', 'venda', 'orcamentos'].forEach(function (grupo) {
      (p.detalhes[grupo] || []).forEach(function (g) { if (g && g.nome === nome) (g.itens || []).forEach(function (it) { out.push(linha(grupo, it)); }); });
    });
    return out;
  }
  function link(conv) { return conv ? '<a class="ai-lnk" data-ai-conv="' + e(conv) + '" href="/app/accounts/' + e(estado.conta) + '/conversations/' + e(conv) + '">Abrir conversa</a>' : ''; }
  function linha(grupo, it) {
    var tipo, corpo;
    if (grupo === 'demoras') {
      tipo = 'Demora · ' + dur(it.minutos);
      corpo = e(it.cliente || 'Cliente') + ' esperou ' + e(dur(it.minutos)) + (it.pergunta ? ': <q>' + e(it.pergunta) + '</q>' : '') + (it.resposta ? '<small>Resposta' + (it.por ? ' de ' + e(it.por) : '') + ': <q>' + e(it.resposta) + '</q></small>' : '');
    } else if (grupo === 'esperando') {
      tipo = 'Esperando · ' + dur(it.minutos);
      corpo = e(it.cliente || 'Cliente') + ' sem resposta há ' + e(dur(it.minutos)) + (it.pergunta ? ': <q>' + e(it.pergunta) + '</q>' : '');
    } else if (grupo === 'ortografia') {
      tipo = 'Ortografia · ' + hora(it.ts);
      corpo = '<q>' + e(it.mensagem || it.frase) + '</q>' + (it.erro ? '<small>' + e(it.erro) + (it.correcao ? ' → ' + e(it.correcao) : '') + '</small>' : '');
    } else if (grupo === 'venda') {
      tipo = e(it.rotulo || 'Venda') + ' · ' + hora(it.ts);
      corpo = (it.cliente ? e(it.cliente) + ': ' : '') + '<q>' + e(it.mensagem || it.frase) + '</q>' + (it.porque ? '<small>' + e(it.porque) + '</small>' : '');
      return '<li><span class="ai-tipo">' + tipo + '</span><span class="ai-fala">' + corpo + '</span>' + link(it.conv) + '</li>';
    } else if (grupo === 'irritados') {
      tipo = 'Cliente irritado · ' + hora(it.ts);
      corpo = (it.cliente ? e(it.cliente) + ': ' : '') + '<q>' + e(it.mensagem || it.frase) + '</q>';
    } else {
      tipo = 'Orçamento de ' + rotuloDia(it.dia);
      corpo = e(reais(it.valor)) + ' sem retorno do vendedor' + (it.itens ? '<small>' + e(it.itens) + '</small>' : '');
    }
    return '<li><span class="ai-tipo">' + e(tipo) + '</span><span class="ai-fala">' + corpo + '</span>' + link(it.conv) + '</li>';
  }
  function funcionarios(p) {
    var h = '<thead><tr><th>Funcionário</th><th>Dia anterior</th>' + COLUNAS.map(function (c) { return '<th>' + e(c[1]) + '</th>'; }).join('') + '</tr></thead><tbody>';
    p.funcionarios.forEach(function (f) {
      var v = VEREDITO[f.veredito.estado] || VEREDITO.estavel; var i = f.indicadores;
      var contagem = f.veredito.estado === 'sem_comparacao' ? '' : '<span class="ai-conta">' + f.veredito.melhores + ' melhor' + (f.veredito.melhores === 1 ? '' : 'es') + ', ' + f.veredito.piores + ' pior' + (f.veredito.piores === 1 ? '' : 'es') + '</span>';
      h += '<tr class="ai-linha' + (estado.aberto === f.nome ? ' ai-aberta' : '') + '" data-ai-nome="' + e(f.nome) + '" tabindex="0"><td>' + e(f.nome) + '</td>' +
        '<td><span class="ai-ver ' + v[0] + '">' + e(v[1]) + '</span>' + contagem + '</td>' + COLUNAS.map(function (c) { return celula(c[0], i[c[0]]); }).join('') + '</tr>';
      if (estado.aberto === f.nome) {
        var extras = [['Mensagens', i.mensagens.valor], ['Linguagem imprópria', i.linguagem.valor], ['Orçamentos fechados', i.orcamentos_fechados.valor], ['Retorno atrasado', i.retorno_atrasado.valor]]
          .map(function (x) { return '<span>' + e(x[0]) + ': <b>' + e(x[1]) + '</b></span>'; });
        if ((f.faixas || []).length) extras.push('<span>Demoras: <b>' + f.faixas.map(function (x) { return e(x[1] + ' de ' + x[0]); }).join(', ') + '</b></span>');
        if (f.nota) extras.push('<span>Nota de 7 dias: <b>' + ['retorno ' + formata('', f.nota.retorno), 'conversa ' + formata('', f.nota.conversa), 'fechamento ' + formata('', f.nota.fechamento)].map(e).join(' · ') + '</b> em ' + e(f.nota.conversas) + ' conversas</span>');
        var itens = itensDe(p, f.nome);
        h += '<tr class="ai-det"><td colspan="' + (COLUNAS.length + 2) + '"><div class="ai-extras">' + extras.join('') + '</div>' +
          (itens.length ? '<ul class="ai-itens">' + itens.join('') + '</ul>' : '<span class="ai-sub">Nenhum apontamento neste dia.</span>') + '</td></tr>';
      }
    });
    return '<section class="ai-secao"><h2>Funcionários <small>clique em um nome para ver os apontamentos do dia</small></h2>' +
      (p.funcionarios.length ? '<div class="ai-card ai-rola"><table class="ai-tab">' + h + '</tbody></table></div>' : '<div class="ai-card ai-vazio">Ninguém atendeu neste dia.</div>') + '</section>';
  }
  var ABAS = [['demoras', 'Demoras'], ['esperando', 'Clientes esperando'], ['ortografia', 'Ortografia'], ['venda', 'Venda'], ['irritados', 'Cliente irritado'], ['orcamentos', 'Orçamentos atrasados']];
  function detalhes(p) {
    var lista = p.detalhes[estado.aba] || []; var corpo;
    if (!lista.length) corpo = '<div class="ai-vazio">Nada neste dia.</div>';
    else if (estado.aba === 'irritados') corpo = '<div class="ai-grupo"><ul class="ai-itens">' + lista.map(function (it) { return linha('irritados', it); }).join('') + '</ul></div>';
    else corpo = lista.map(function (g) { return '<div class="ai-grupo"><h3>' + e(g.nome) + ' <span class="ai-sub">· ' + (g.itens || []).length + '</span></h3><ul class="ai-itens">' + (g.itens || []).map(function (it) { return linha(estado.aba, it); }).join('') + '</ul></div>'; }).join('');
    var conta = function (k) { var l = p.detalhes[k] || []; return k === 'irritados' ? l.length : l.reduce(function (t, g) { return t + ((g && g.itens) || []).length; }, 0); };
    return '<section class="ai-secao"><h2>Detalhes do dia <small>o mesmo conteúdo do relatório de detalhes</small></h2><div class="ai-abas">' +
      ABAS.map(function (a) { return '<button data-ai-aba="' + a[0] + '" class="' + (a[0] === estado.aba ? 'ai-on' : '') + '">' + e(a[1]) + ' · ' + conta(a[0]) + '</button>'; }).join('') +
      '</div><div class="ai-card">' + corpo + '</div></section>';
  }
  function desenha() {
    var el = document.getElementById('ai-painel'); if (!el) return;
    var d = estado.dados, corpo;
    if (estado.erro) corpo = '<div class="ai-aviso">' + e(estado.erro) + '</div>';
    else if (!d) corpo = '<div class="ai-card ai-vazio">Carregando o painel…</div>';
    else if (d.sem_fechamento || !d.painel) corpo = '<div class="ai-card ai-vazio">' + e(rotuloDia(d.dia)) + ' não teve fechamento: não há números para este dia.</div>';
    else corpo = avisos(d.painel) + numeros(d.painel) + funcionarios(d.painel) + detalhes(d.painel);
    var rolagem = el.scrollTop;
    el.innerHTML = '<div class="ai-dentro"' + (estado.carregando ? ' style="opacity:.6"' : '') + '>' + cabecalho() + corpo + '</div>';
    el.scrollTop = rolagem;
  }
  function clique(ev) {
    var t = ev.target; if (!t || !t.closest) return;
    var conv = t.closest('[data-ai-conv]');
    if (conv) { ev.preventDefault(); var r = roteador(); var destino = conv.getAttribute('href'); if (r) r.push(destino); else location.assign(destino); return; }
    var b = t.closest('[data-ai]');
    if (b) {
      var dias = ((estado.dados || {}).dias || []).slice().sort(); var i = dias.indexOf(estado.dia); var acao = b.getAttribute('data-ai');
      if (acao === 'atualiza') carrega(estado.dia); else if (acao === 'antes' && i > 0) carrega(dias[i - 1]); else if (acao === 'depois' && i >= 0 && i < dias.length - 1) carrega(dias[i + 1]);
      return;
    }
    var aba = t.closest('[data-ai-aba]'); if (aba) { estado.aba = aba.getAttribute('data-ai-aba'); desenha(); return; }
    var tr = t.closest('tr.ai-linha'); if (tr) { var nome = tr.getAttribute('data-ai-nome'); estado.aberto = estado.aberto === nome ? null : nome; desenha(); }
  }
  function mostra() {
    var main = document.querySelector('main'); if (!main || !main.parentElement) return;
    var el = document.getElementById('ai-painel');
    if (!el) {
      el = document.createElement('div'); el.id = 'ai-painel';
      el.addEventListener('click', clique);
      el.addEventListener('change', function (ev) { if (ev.target && ev.target.id === 'ai-dia') carrega(ev.target.value); });
      el.addEventListener('keydown', function (ev) { if ((ev.key === 'Enter' || ev.key === ' ') && ev.target && ev.target.matches && ev.target.matches('tr.ai-linha')) { ev.preventDefault(); clique(ev); } });
    }
    // Já está na tela: nada a fazer. (Redesenhar aqui acordaria o observer, que chamaria esta função de novo, sem fim.)
    if (el.parentElement === main.parentElement && main.classList.contains('ai-oculto')) return;
    main.parentElement.appendChild(el);
    main.classList.add('ai-oculto'); document.body.classList.add('ai-aberto');
    if (!estado.dados && !estado.carregando) carrega(estado.dia); else desenha();
  }
  function esconde() {
    var el = document.getElementById('ai-painel'); if (el) el.remove();
    var main = document.querySelector('main.ai-oculto'); if (main) main.classList.remove('ai-oculto');
    document.body.classList.remove('ai-aberto');
  }

  // ---- 3) laço: a SPA troca de tela sem recarregar; o observer cobre tudo ----
  function sincroniza() {
    ligaRoteador();
    var conta = contaId();
    if (conta !== estado.conta) { estado.conta = conta; estado.ligado = null; estado.dados = null; estado.dia = ''; }
    if (!conta) { esconde(); return; }
    if (estado.ligado === null) {   // pergunta uma vez por conta: o servidor diz se este usuário pode ver o painel
      estado.ligado = false;
      busca('/acesso').then(function (r) { estado.ligado = !!(r && r.ligado); agenda(); }).catch(function () { estado.ligado = false; });
      return;
    }
    if (!estado.ligado) { esconde(); return; }
    poeNoMenu(); marcaMenu();
    if (location.hash === HASH && /\/reports\//.test(location.pathname)) mostra(); else esconde();
  }
  var agendado = null;
  function agenda() { if (!agendado) agendado = setTimeout(function () { agendado = null; sincroniza(); }, 150); }
  function inicia() {
    var estilo = document.createElement('style'); estilo.id = 'ai-css'; estilo.textContent = CSS; document.head.appendChild(estilo);
    new MutationObserver(agenda).observe(document.body, { childList: true, subtree: true });
    window.addEventListener('hashchange', agenda); window.addEventListener('popstate', agenda);
    sincroniza();
  }
  if (document.body) inicia(); else document.addEventListener('DOMContentLoaded', inicia);
})();
