# ApolloDesk — controlador da rota estreita do conector (ver deploy/apollo-rota-token.rb).
#
# Vai para app/controllers/apollo/api/v1/tokens_controller.rb — arquivo NOVO, em
# namespace nosso, nenhuma linha do upstream tocada.
#
# Herda de ActionController::API de propósito, e não do ApplicationController do
# Chatwoot: aqui não existe sessão, nem CSRF, nem Devise, nem conta corrente. A
# única autenticação é o segredo da conta no header.
#
# ⚠️ O header é `Api-Access-Token`, com HÍFEN. A forma com underscore
# (`api_access_token`, que a Platform API do Chatwoot aceita) é DESCARTADA pelo
# Caddy — o 401 resultante parece token errado e já custou tempo nesta casa.
module Apollo
  module Api
    module V1
      class TokensController < ActionController::API
        def show
          conta = ApolloRotaToken.conta_do_segredo(request.headers['Api-Access-Token'])
          return render(json: { error: 'unauthorized' }, status: :unauthorized) if conta.nil?

          email = params[:email].to_s.strip.downcase
          token = ApolloRotaToken.token_de(email: email, account_id: conta)

          if token.nil?
            ApolloRotaToken.registra(conta: conta, email: email, resultado: 'nao_encontrado', ip: request.remote_ip)
            return render(json: { error: 'not_found' }, status: :not_found)
          end

          ApolloRotaToken.registra(conta: conta, email: email, resultado: 'ok', ip: request.remote_ip)
          render json: { access_token: token, account_id: conta }
        end
      end
    end
  end
end
