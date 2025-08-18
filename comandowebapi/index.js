'use strict';
const cors = require("cors");
const corsHandler = cors({origin: true});
// [START functions_helloworld_get]
const functions = require('@google-cloud/functions-framework');
const { AuthenticationService } = require('./utils/authen');
require('dotenv').config(); // Carrega as variáveis do arquivo .env
const mysql = require('mysql2/promise'); // Usando mysql2 para promises
const consultarCCAF = require('./utils/consultarCCAF');

// Configuração melhorada para Cloud SQL
const getConnectionConfig = () => {
  // Configuração para ambiente local (usando TCP)
  if (process.env.NODE_ENV === 'development') {
    return {
      host: process.env.DB_HOST || '127.0.0.1',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      waitForConnections: true,
      connectionLimit: 1,
      connectTimeout: 10000 // 10 segundos de timeout
    };
  }

  // Configuração para produção no Google Cloud
  return {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    socketPath: '/cloudsql/pmam-364614:us-central1:website2',
    waitForConnections: true,
    connectionLimit: 1,
    connectTimeout: 10000
  };
};


// Register an HTTP function with the Functions Framework that will be executed
// when you make an HTTP request to the deployed function's endpoint.

// Função principal
// Cria pool de conexões para melhor performance
const pool = mysql.createPool(getConnectionConfig());

functions.http('AuxLotacoes', async (request, response) => {
  corsHandler(request, response, async () => {
    try {
      // Autenticação
      const user = await new auth.authenRegister().getToken(request);
      console.log('Usuário autenticado:', user);

      // Obter conexão do pool
      const connection = await pool.getConnection();

      try {
        // Executar consulta
        const [rows] = await connection.query('SELECT * FROM aux_lotacoes;');
        console.log('Consulta executada com sucesso');

        response.status(200).json({
          success: true,
          message: 'Dados recuperados com sucesso.',
          data: rows
        });
      } finally {
        // Liberar conexão de volta para o pool
        connection.release();
      }
    } catch (error) {
      console.error('Erro na função:', error);

      const statusCode = error.name === 'UnauthorizedError' ? 401 : 500;
      response.status(statusCode).json({
        success: false,
        message: error.message || 'Erro ao processar a solicitação.',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  });
});

// Tratamento de shutdown para fechar o pool corretamente
process.on('SIGTERM', () => {
  pool.end().then(() => {
    console.log('Pool de conexões fechado');
    process.exit(0);
  });
});


class Militar {
  constructor(data, options = {}) {
    // Configurações padrão
    const defaultOptions = {
      retorno: "yes",
      message: 'Dados recuperados com sucesso.'
    };

    // Mescla as opções padrão com as fornecidas
    const finalOptions = { ...defaultOptions, ...options };

    // Propriedades básicas de resposta
    this.retorno = String(finalOptions.retorno);
    this.message = String(finalOptions.message);

    // Dados do militar
    this.id_militar = String(data.id_militar || '');
    this.ci_militar = String(data.ci_militar || '');
    this.cpf = String(data.cpf || '');
    this.matricula = String(data.matricula || '');
    this.id_posto = String(data.id_posto || '');
    this.nome_posto_grad = String(data.nome_posto_grad || '');
    this.sigla_posto_grad = String(data.sigla_posto_grad || '');
    this.id_quadro = String(data.id_quadro || '');
    this.posto_quadro = String(data.posto_quadro || '');
    this.nome_completo = String(data.nome_completo || '');
    this.nome_guerra = String(data.nome_guerra || '');
    this.id_lotacao = String(data.id_lotacao || '');
    this.sigla_lotacao = String(data.sigla_lotacao || '');
    this.nome_lotacao = String(data.nome_lotacao || '');
    this.possui_cnh = String(data.possui_cnh || '0');
    this.cat_cnh = String(data.categoria_cnh || data.cat_cnh || '');
    this.funcao = String(data.funcao || '')
    this.numero_ccaf = String(data.numero_ccaf || '0')
    this.fone_corporativo = String(data.fone_corporativo || '')
    this.cel1 = String(data.cel1 || '')
    this.cel2 = String(data.cel2 || '')

    // Status com concatenação
    const statusBase = String(data.status || '');
    const descrDestinos = String(data.descr_diversos_destinos || '');
    const descrAgregados = String(data.descr_agregados || '');

    let statusFinal = statusBase;
    if (descrDestinos) statusFinal += ` - ${descrDestinos}`;
    if (descrAgregados) statusFinal += (descrDestinos ? `, ${descrAgregados}` : ` - ${descrAgregados}`);

    this.status = statusFinal;

    // Demais campos
    this.recebe_fg = String(data.recebe_fg || data.recebe_gc ||  '0');
    this.recebe_gc = String(data.recebe_gc || '0');
    this.funcao_gratificada = String(data.funcao_gratificada || '');
    this.com_restricao = String(data.com_restricao || '');
    this.descr_diversos_destinos = descrDestinos;
    this.descr_agregados = descrAgregados;
  }

  // Método para resposta padrão
  toResponse() {
    return  { ...this }
  }
}

async function handleViewMilitaresStatus(request, response) {
  try {
    const user =  await AuthenticationService.getToken(request);
    const connection = await pool.getConnection();
    const termo = user.termo;

    try {
      // Construir a query dinamicamente baseado nas colunas disponíveis
      let whereClause = '';
      const params = [termo, termo, termo];
      whereClause += 'ci_militar = ? OR cpf = ? OR matricula = ?';
      const query = `SELECT * FROM \`view_militares_lotacao_funcao\` WHERE ${whereClause}`;
      console.log('Query a ser executada:', query, params);
      const [rows] = await connection.query(query, params);

      if (rows && rows.length > 0) {
        const militar = new Militar(rows[0]);
        const ccafResult =  await consultarCCAF.getCCAF(militar.ci_militar);
        if (ccafResult.success && ccafResult.data.ccaf_number) {
          militar.numero_ccaf = String(ccafResult.data.ccaf_number);
        } else {
          militar.numero_ccaf = '0';
        }

        response.status(200).json(militar.toResponse());
      } else {
        const result = {
          retorno: "no",
          message: 'Nenhum militar encontrado para o termo informado.'
        }
        response.status(200).json(result);
      }
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error('Erro na função:', error);
    const statusCode = error.name === 'UnauthorizedError' ? 401 : 500;

    const errorResponse =  {
      retorno: "no",
      message: error.message || 'Erro ao processar a solicitação.'
    };

    errorResponse.error = process.env.NODE_ENV === 'development' ? error.stack : undefined;
    response.status(statusCode).json(errorResponse);
  }
}
functions.http('ViewMilitaresStatus', (request, response) => {
  corsHandler(request, response, () => handleViewMilitaresStatus(request, response));
});

// [END functions_helloworld_get]
//https://us-central1-pmam-364614.cloudfunctions.net/view-militar-status
//Código para fazer deploy pra produção
/*gcloud functions deploy view-militar-status `
--gen2 `
--runtime=nodejs20 `
--region=us-central1 `
--source=. `
--entry-point=ViewMilitaresStatus `
--trigger-http `
--allow-unauthenticated `
--env-vars-file=env.yaml
*/


/*
nodejs-http-function: Nome da função que você está implantando.
--gen2: Indica que você está usando a 2ª geração do Cloud Functions.
--runtime=nodejs20: Define o runtime como Node.js 20.
--region=us-central1: Especifica a região onde a função será implantada.
--source=.: Indica que o código-fonte da função está no diretório atual (.).
--entry-point=helloGET: Define o ponto de entrada da função (nome da função no código).
--trigger-http: Configura a função para ser acionada por requisições HTTP.
--allow-unauthenticated: Permite que a função seja acessada sem autenticação.

*/
