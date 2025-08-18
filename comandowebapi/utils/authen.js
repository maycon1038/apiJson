const bodyParser = require('body-parser');
const cors = require('cors');
const express = require('express');
const superagent = require('superagent');

const app = express();
const port = process.env.PORT || 8080;

// Configurações
const API_AUTH_SISPMAM = 'https://us-central1-copmam-c74a2.cloudfunctions.net/authSispmam';
const BLOCKED_IPS = ["52.72.140.159", "2600:1f18:7679:7d13:29cb:e410:2aa7:de43"];
const VALID_TOKEN = 'eyJraWQiOiJEX28wMGciLCJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJzdWIiOiIxOjExNDg5NjQ2NjYxNDp3ZWI6OTY3NTM4OWQzNWExMjQ2ODJkYWMxNyIsImF1ZCI6WyJwcm9qZWN0c1wvMTE0ODk2NDY2NjE0IiwicHJvamVjdHNcL2NvcG1hbS1jNzRhMiJdLCJwcm92aWRlciI6InJlY2FwdGNoYV92MyIsImlzcyI6Imh0dHBzOlwvXC9maXJlYmFzZWFwcGNoZWNrLmdvb2dsZWFwaXMuY29tXC8xMTQ4OTY0NjY2MTQiLCJleHAiOjE3NDc2NzE0NDcsImlhdCI6MTc0NzY2Nzg0NywianRpIjoiNHh4dWpRczRLZUxtUjBvQzNXWk5qLXNTZWNUVHN3NWptb2huYUlZUV9wSSJ9.VJWiV7Qvr2iJrFzvml1700FwlURp9IOQ3k9syE9gu2qSMBGDVo3PYDg38Gbr-POqpiNMLniuwbdm75k0vA8rIREpG483_fWLELKHtR8A3ZvfG7USpejVtZpux4gpOrSyjziCTTXD3d6IEgBfTSOQmW0FbYH9n8brqqL79zJV4lDmkd8BF-KwpM4AyfZZ97acev0c7KBsOYij4MRMElirBu0l4gU91LEKNLKa1VsH8YIIkAHudZmJCAEcMa6TfZDMMtYO2azIuxjQm5xiesy8ox8-sz2HJNCvCnpORudFrHv_oeUtfg4vyMeX9KGnlwi8mQ15V9CdbPCEsy-C2XXmJZmxNi36A147C4nzh1ka9BwlJCLpJlO7UBh1zCLiBW9LOwlhQc3bzSQBQB3dnGrF8gwpn4h8ITSkguh6A6hyuxxQ_C-4vZtm3AeXv1eDUt-wj_v9bhCMHJUoSbER_JEr827f3waBuWwRNHhH56cYrM_Jttua8zjLMGOHN-Q3LtOw';

// Middlewares
const corsOptions = {
	origin: '*',
	optionsSuccessStatus: 200 // For legacy browser support
};

app.use(cors(corsOptions));
app.use(bodyParser.urlencoded({ extended: true }));

class AuthenticationService {
	static extractToken(request) {
		const authHeader = request.headers.authorization;
		if (!authHeader || !authHeader.startsWith('Bearer ')) {
			throw new Error('Formato de token inválido');
		}
		return authHeader.split('Bearer ')[1];
	}

	static validateRequestData(data) {
		if (!data.email) {
			throw new Error(`O E-mail ${data.email} é inválido.`);
		}
		if (!data.sessionToken) {
			throw new Error('Não autorizado: Token da sessão Inválido.');
		}
		if (!data.cpf) {
			throw new Error(`O CPF ${data.cpf} é inválido.`);
		}
	}

	static checkBlockedIPs(request) {
		const clientIP = request.headers["x-forwarded-for"] || request.connection.remoteAddress;
		console.log('clientIP: ', clientIP);

		if (BLOCKED_IPS.includes(clientIP)) {
			throw new Error(`Acesso negado. IP bloqueado: ${clientIP}`);
		}
	}

	static createUserObject(data) {
		return {
			email: data.email || '',
			cpf: data.cpf,
			termo: data.termo || data.cpf,
			idDocConvenio: data.token || ''
		};
	}

	static async authenticateWithExternalAPI(request) {
		try {
			const apiResponse = await superagent.post(API_AUTH_SISPMAM)
				.set('Content-Type', 'text/plain')
				.send(request.body);

			if (apiResponse.body.retorno === 201) {
				return apiResponse.body;
			}
			throw new Error('Acesso negado. Usuário inválido.');
		} catch (error) {
			console.error('Erro na autenticação externa:', error.message);
			throw new Error('Falha na autenticação com o serviço externo');
		}
	}

	static async getToken(request) {
		try {
			const data = JSON.parse(request.body);
			console.log('Dados recebidos:', data);

			this.checkBlockedIPs(request);
			this.validateRequestData(data);

			try {
				const token = this.extractToken(request);

				if (!token) {
					return await this.authenticateWithExternalAPI(request);
				}

				if (token === VALID_TOKEN) {
					return this.createUserObject(data);
				}

				throw new Error('Token inválido');
			} catch (tokenError) {
				// Se houver erro com o token, tenta autenticação externa
				return await this.authenticateWithExternalAPI(request);
			}
		} catch (error) {
			console.error('Erro no processo de autenticação:', error.message);
			throw error;
		}
	}
}

module.exports = { AuthenticationService };
