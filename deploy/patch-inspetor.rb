# ApolloDesk — painel do Inspetor de atendimento, em Relatórios.
# Roda no BUILD da imagem (ver Dockerfile). Pedido do Leonardo (13/nov/2026), E4 da APOLLO-335.
# Desenho: seção 22 do documento do Inspetor (apollo-solution/clientes/holding-gb/dagostino/inspetor-atendimento).
#
# O QUE É
# -------
# O Inspetor (workflows no n8n) manda aos gestores, no fechamento, dois PDFs pelo WhatsApp. O painel leva o mesmo conteúdo para dentro
# do Desk, com a escolha de dois períodos para comparar. Os dados NÃO moram no Desk: o Desk é só a casca.
#
# O QUE ESTE PATCH FAZ (código nosso, MIT; nada de enterprise/)
# -------------------------------------------------------------
# 1. Módulo ApolloInspetor: diz se o painel está ligado na conta e se o usuário pode ver, e busca o painel pronto no Inspetor por uma
#    chamada interna com segredo. O navegador nunca fala com o n8n.
# 2. Controller Api::V1::Accounts::ApolloInspetorController:
#      GET /api/v1/accounts/:id/apollo_inspetor/acesso  → { ligado: true|false }  (decide se o item aparece no menu)
#      GET /api/v1/accounts/:id/apollo_inspetor?de=&ate=&cde=&cate=  → o painel; 403 para quem não pode
# 3. public/apollodesk/inspetor.js (copiado pelo Dockerfile) + <script> no layout da SPA: o item no menu de Relatórios e a tela.
#
# QUEM PODE VER (decisão do Leonardo, 13/nov): todos os ADMINISTRADORES da conta, e só nas contas com o painel ligado. Quem decide é o
# servidor: o controller recusa antes de buscar qualquer dado. Esconder o item do menu não é a proteção. Agente comum, robô e usuário
# de outra conta não recebem nada (o robô nem chega aqui: o Chatwoot só deixa token de robô em quatro controllers).
#
# COMO LIGAR EM UMA CONTA (dado, sem build):
#   a = Account.find(4); a.custom_attributes['inspetor'] = { 'painel' => 'dagostino' }; a.save!
#   'painel' é o slug do cliente no Inspetor (apollo-n8n/workflows/clientes/<slug>.py, com CRED_PAINEL). O administrador da conta não
#   consegue mexer nessa chave pela API: o Chatwoot só aceita industry, company_size, timezone e mais três em custom_attributes.
#   Mesmo assim, o Desk manda a conta no pedido e o workflow do cliente só responde se for a dele.
#
# VARIÁVEIS DE AMBIENTE (no .env do stack, geradas do 1Password pelo apollo-op-env; item apollo-infra/n8n-inspetor-painel):
#   APOLLO_INSPETOR_URL        base dos webhooks do n8n, sem a barra final (https://n8n.apollosolution.com.br/webhook)
#   APOLLO_INSPETOR_CABECALHO  nome do cabeçalho da senha (campo username do item)
#   APOLLO_INSPETOR_SENHA      valor da senha (campo credential do item)
#   Sem as três, o painel responde "indisponível" (502) e nada mais muda no Desk.
#
# Prova: deploy/testa-inspetor.rb (fica na imagem).
# ⚠️ Ao subir de versão: o build FALHA se qualquer âncora sumir, de propósito.
require 'fileutils'

APP = '/app'.freeze

MODULO = <<~'RUBY'
  # ApolloDesk — painel do Inspetor de atendimento. Ver deploy/patch-inspetor.rb.
  require 'net/http'
  require 'json'

  module ApolloInspetor
    class Indisponivel < StandardError; end

    DATA = /\A\d{4}-\d{2}-\d{2}\z/
    SLUG = /\A[a-z0-9-]{1,40}\z/
    CAMPOS = %w[de ate cde cate].freeze

    # O slug do cliente no Inspetor, ou nil se o painel não está ligado na conta.
    def self.slug(account)
      cfg = (account&.custom_attributes || {})['inspetor']
      s = cfg.is_a?(Hash) ? cfg['painel'].to_s : ''
      SLUG.match?(s) ? s : nil
    end

    # Administrador da conta, com o painel ligado nela. account_user é o vínculo do usuário com ESTA conta (nil para quem não é dela).
    def self.pode?(account, account_user)
      return false if account.nil? || account_user.nil?
      return false unless account_user.account_id == account.id && account_user.administrator?

      !slug(account).nil?
    end

    # O que segue para o Inspetor: a conta e só datas no formato exato. O resto do que veio do navegador é descartado.
    def self.pedido(account, params)
      corpo = { 'conta' => account.id }
      CAMPOS.each do |campo|
        valor = params[campo].to_s
        corpo[campo] = valor if DATA.match?(valor)
      end
      corpo
    end

    def self.busca(account, params)
      base = ENV.fetch('APOLLO_INSPETOR_URL', '').to_s.chomp('/')
      cabecalho = ENV.fetch('APOLLO_INSPETOR_CABECALHO', '').to_s
      senha = ENV.fetch('APOLLO_INSPETOR_SENHA', '').to_s
      cliente = slug(account)
      raise Indisponivel, 'painel desligado na conta' if cliente.nil?
      raise Indisponivel, 'faltam as variáveis APOLLO_INSPETOR_*' if base.empty? || cabecalho.empty? || senha.empty?

      uri = URI.parse("#{base}/inspetor-#{cliente}-painel")
      raise Indisponivel, 'APOLLO_INSPETOR_URL não é http(s)' unless uri.is_a?(URI::HTTP)

      http = Net::HTTP.new(uri.host, uri.port)
      http.use_ssl = uri.scheme == 'https'
      http.open_timeout = 5
      http.read_timeout = 60
      req = Net::HTTP::Post.new(uri.request_uri, 'Content-Type' => 'application/json', cabecalho => senha)
      req.body = pedido(account, params).to_json
      res = http.request(req)
      raise Indisponivel, "o Inspetor respondeu #{res.code}" unless res.code == '200'

      dados = JSON.parse(res.body.to_s.empty? ? 'null' : res.body)
      dados = dados.first if dados.is_a?(Array)
      raise Indisponivel, 'resposta vazia do Inspetor' unless dados.is_a?(Hash)
      raise Indisponivel, "o Inspetor recusou o pedido (#{dados['erro']})" if dados['erro']

      dados
    rescue Timeout::Error, SystemCallError, SocketError, OpenSSL::SSL::SSLError, JSON::ParserError, URI::InvalidURIError => e
      raise Indisponivel, e.class.name # só a classe: a mensagem pode trazer o endereço com o caminho do webhook
    end
  end
RUBY
FileUtils.mkdir_p("#{APP}/app/models/concerns")
File.write("#{APP}/app/models/concerns/apollo_inspetor.rb", MODULO)

CONTROLLER = <<~'RUBY'
  # ApolloDesk — painel do Inspetor de atendimento. Ver deploy/patch-inspetor.rb.
  # Só administrador da conta, e só com o painel ligado nela: a recusa vem ANTES de qualquer busca.
  class Api::V1::Accounts::ApolloInspetorController < Api::V1::Accounts::BaseController
    before_action :so_quem_pode, only: :show

    # Qualquer usuário da conta pode perguntar; a resposta é só sim ou não (é ela que decide se o item aparece no menu).
    def acesso
      render json: { ligado: ApolloInspetor.pode?(Current.account, Current.account_user) }
    end

    def show
      response.headers['Cache-Control'] = 'no-store' # a resposta traz mensagem de cliente
      render json: ApolloInspetor.busca(Current.account, params)
    rescue ApolloInspetor::Indisponivel => e
      Rails.logger.error("[apollo-inspetor] conta #{Current.account.id}: #{e.message}")
      render json: { erro: 'indisponivel' }, status: :bad_gateway
    end

    private

    def so_quem_pode
      return if ApolloInspetor.pode?(Current.account, Current.account_user)

      render json: { erro: 'sem acesso' }, status: :forbidden
    end
  end
RUBY
File.write("#{APP}/app/controllers/api/v1/accounts/apollo_inspetor_controller.rb", CONTROLLER)

# Troca `antes` por `depois` exatamente uma vez; qualquer outra contagem derruba o build.
def troca(arquivo, antes, depois)
  caminho = "#{APP}/#{arquivo}"
  src = File.read(caminho)
  achadas = src.scan(antes).length
  abort("patch-inspetor: âncora esperada 1x e achada #{achadas}x em #{arquivo}:\n#{antes}") unless achadas == 1
  File.write(caminho, src.sub(antes) { depois })
  puts "patch-inspetor: #{arquivo} ok"
end

# rotas: dentro de `scope module: :accounts`, logo antes das campanhas (mesma âncora do patch-campanhas, que a mantém)
troca('config/routes.rb',
      "          resources :campaigns, only: [:index, :create, :show, :update, :destroy] do\n",
      "          get 'apollo_inspetor', to: 'apollo_inspetor#show' # ApolloDesk\n" \
      "          get 'apollo_inspetor/acesso', to: 'apollo_inspetor#acesso' # ApolloDesk\n" \
      "          resources :campaigns, only: [:index, :create, :show, :update, :destroy] do\n")

# layout da SPA
layout = "#{APP}/app/views/layouts/vueapp.html.erb"
html = File.read(layout)
abort('patch-inspetor: </head> não encontrado no layout') unless html.include?('</head>')
File.write(layout, html.sub('</head>', "    <script src=\"/apollodesk/inspetor.js\" defer></script>\n  </head>")) unless html.include?('inspetor.js')
abort('patch-inspetor: inspetor.js não está em public/apollodesk/') unless File.exist?("#{APP}/public/apollodesk/inspetor.js")
abort('patch-inspetor: inspetor.js não entrou no layout') unless File.read(layout).include?('/apollodesk/inspetor.js')
puts 'patch-inspetor: módulo + controller + rotas + layout ok'
