// Vercel Serverless Function - API do Chat IA
// Este arquivo fica em /api/chat.js

export default async function handler(req, res) {
  // Configuração CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Apenas aceita POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message, recipes } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Chave da API da Anthropic (configurada como variável de ambiente)
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      return res.status(500).json({ error: 'API key not configured' });
    }

    // Prepara contexto das receitas
    const recipesContext = recipes ? JSON.stringify(recipes.slice(0, 50)) : '[]';

    // Chama a API da Anthropic
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system: `Você é o Chef Virtual, um assistente culinário amigável e experiente do blog ChefStyle. 

Você tem acesso ao banco de receitas do blog:
${recipesContext}

Suas responsabilidades:
- Ajudar os usuários com dúvidas culinárias
- Sugerir receitas baseadas nos ingredientes que eles têm em casa
- Explicar técnicas de cozinha de forma clara e didática
- Adaptar receitas para restrições alimentares (vegano, sem glúten, sem lactose, etc.)
- Dar dicas de substituições de ingredientes
- Ajustar porções de receitas proporcionalmente
- Oferecer conselhos sobre armazenamento e conservação de alimentos
- Explicar termos culinários
- Sugerir harmonizações e acompanhamentos

Características da sua personalidade:
- Sempre simpático e encorajador
- Use emojis ocasionalmente para deixar a conversa mais leve
- Mantenha um tom descontraído mas profissional
- Seja paciente com iniciantes na cozinha
- Celebre as conquistas culinárias dos usuários
- Use linguagem clara e acessível, evitando jargões desnecessários

Se uma receita específica do blog for mencionada, use os detalhes do banco de dados.

Sempre termine suas respostas de forma que incentive o usuário a cozinhar e experimentar!`,
        messages: [
          { role: 'user', content: message }
        ]
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Anthropic API error:', errorData);
      return res.status(response.status).json({ 
        error: 'Failed to get response from AI',
        details: errorData 
      });
    }

    const data = await response.json();

    // Extrai o texto da resposta
    const aiMessage = data.content && data.content[0] && data.content[0].text 
      ? data.content[0].text 
      : 'Desculpe, não consegui processar sua mensagem.';

    return res.status(200).json({
      success: true,
      message: aiMessage
    });

  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}
