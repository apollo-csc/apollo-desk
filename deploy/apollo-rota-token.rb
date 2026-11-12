# ApolloDesk — rota estreita que devolve o token de API de uma pessoa (Decisão #21 do conector).
#
# PARA QUE SERVE
# --------------
# O conector único dos sistemas Apollo (MCP) age no Desk COMO A PESSOA, com as
# permissões dela. Para isso ele precisa do token de API dela — e no Desk esse
# token já existe: é exatamente 1 por usuário, sem expiração (medido em
# 12/nov/2026: 54 usuários, 54 tokens). Não há o que cunhar; há o que LER.
#
# POR QUE NÃO O PLATFORM APP DO CHATWOOT (que faria isso de fábrica)
# -----------------------------------------------------------------
# A Platform API devolve o token (`GET /platform/api/v1/users/:id`), mas a MESMA
# credencial cria e apaga usuário e gera LINK DE SSO (`generate_sso_link`) — ou
# seja, entra como qualquer pessoa. E o porteiro dela não contém quem a tem: o
# `create` NÃO verifica o `platform_app_permissible` e é justamente ele que faz a
# inscrição, vinculando qualquer e-mail que já exista. Como esta instância atende
# todas as empresas (conta 4 Dagostino, conta 5 CD Tech), isso seria tomada de
# conta ENTRE CLIENTES.
#
# Medido em 12/nov/2026: `platform_apps` = 0 — nenhum existe, então o risco é
# latente, não está no ar. A guarda que vale desde já é NUNCA CRIAR UM.
#
# O QUE ESTA ROTA FAZ, E SÓ ISSO
# ------------------------------
#   GET /apollo/api/v1/users/token?email=<e-mail>
#   header: Api-Access-Token: <segredo da conta>
#
#   200 → {"access_token": "...", "account_id": 4}
#   401 → segredo ausente ou desconhecido
#   404 → pessoa não existe · não é daquela conta · é super administrador · sem token
#
# - devolve SÓ o token; nunca cria nem altera ninguém; nunca gera link de SSO;
# - UM SEGREDO POR CONTA (`APOLLO_TOKEN_CONTA_4`, `APOLLO_TOKEN_CONTA_5`): é isso
#   que recupera o confinamento por cliente que o Platform App não dava — o
#   segredo da Dagostino não alcança gente da CD Tech;
# - recusa `SuperAdmin` (STI pela coluna `users.type`): devolver o token dele
#   entregaria poder de super administrador ao conector;
# - registra cada leitura no log (camada 1 da auditoria da Decisão #16).
#
# ⚠️ O QUE ISTO **NÃO** REMOVE: o token devolvido **é** o poder de agir como
# aquele agente pela API. Tira-se SSO e gestão de usuário; não se tira a ação no
# lugar da pessoa — essa é a natureza da cunhagem (Decisão #16) e segue coberta
# pelas salvaguardas dela (log de cada ação, revogação individual, rotação).
#
# ⚠️ A ROTA NASCE PÚBLICA. Ela monta no Rails, que está atrás do hostname público
# do Desk. O `/apollo/api/*` leva 404 no Caddy (ver deploy/caddy-vhost.snippet):
# a proteção é barreira de rede MAIS segredo, nunca o segredo sozinho.
#
# POR QUE INITIALIZER E NÃO PATCH COM ÂNCORA
# ------------------------------------------
# Não editamos `config/routes.rb` do upstream: `routes.append` acrescenta a rota
# de fora, então uma versão nova do Chatwoot não tem âncora para quebrar. Vale
# porque o routes.rb do 4.17.1 NÃO tem catch-all de raiz (só `/swagger/*path`,
# conferido) — se um dia passar a ter, uma rota acrescentada no fim ficaria
# sombreada e isto para de responder: a prova pega.
#
# Prova: deploy/testa-rota-token.rb (fica na imagem).
module ApolloRotaToken
  PREFIXO = 'APOLLO_TOKEN_CONTA_'.freeze
  MINIMO = 32 # segredo curto é erro de configuração, não credencial

  class << self
    # { 4 => "<segredo>", 5 => "<segredo>" } — lido do ambiente, que vem do
    # 1Password pelo apollo-op-env. Segredo com menos de 32 caracteres é
    # IGNORADO: melhor a rota responder 401 do que aceitar um valor de teste.
    def segredos
      @segredos ||= ENV.each_with_object({}) do |(chave, valor), mapa|
        next unless chave.start_with?(PREFIXO)

        conta = chave.delete_prefix(PREFIXO)
        next unless conta.match?(/\A\d+\z/)
        next if valor.to_s.length < MINIMO

        mapa[Integer(conta)] = valor.to_s
      end
    end

    def recarrega!
      @segredos = nil
    end

    # Qual conta este segredo abre — ou nil. Compara com TODOS sem sair no
    # primeiro acerto, para o tempo de resposta não dizer qual casou.
    def conta_do_segredo(apresentado)
      apresentado = apresentado.to_s
      return nil if apresentado.length < MINIMO

      achada = nil
      segredos.each do |conta, segredo|
        achada = conta if ActiveSupport::SecurityUtils.secure_compare(segredo, apresentado)
      end
      achada
    end

    # O token da pessoa, se ela existir, for daquela conta, não for super
    # administrador e tiver token. Qualquer outro caso é nil — e virá 404, sem
    # dizer qual das condições falhou.
    def token_de(email:, account_id:)
      email = email.to_s.strip.downcase
      return nil if email.empty?

      pessoa = User.find_by(email: email)
      return nil if pessoa.nil?
      return nil if pessoa.type.present? # SuperAdmin < User, pela coluna users.type
      return nil unless pessoa.account_users.exists?(account_id: account_id)

      pessoa.access_token&.token
    end

    def registra(conta:, email:, resultado:, ip:)
      Rails.logger.info("[apollo-rota-token] conta=#{conta} email=#{email} resultado=#{resultado} ip=#{ip}")
    end
  end
end

Rails.application.routes.append do
  get '/apollo/api/v1/users/token', to: 'apollo/api/v1/tokens#show'
end
