export default async function handler(req, res) {
  // Apenas aceita requisições POST
  if (req.method !== 'POST') {
    return res.status(405).json({ erro: 'Método não permitido' });
  }

  const { pergunta, textoPDF } = req.body;
  
  // A Vercel vai injetar a sua chave aqui secretamente
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ erro: 'Chave da API não configurada no servidor' });
  }

  const promptCompleto = `Contexto do PDF:\n${textoPDF}\n\nResponda: ${pergunta}`;

  try {
    const resposta = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: promptCompleto }] }],
        generationConfig: { temperature: 0.2 }
      })
    });

    const dados = await resposta.json();
    
    if (dados.error) {
      throw new Error(dados.error.message);
    }

    const textoIA = dados.candidates[0].content.parts[0].text;

    // Devolve a resposta para o seu HTML
    return res.status(200).json({ respostaIA: textoIA });

  } catch (error) {
    console.error(error);
    return res.status(500).json({ erro: 'Falha ao conectar com a IA' });
  }
}