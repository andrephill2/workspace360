export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ erro: 'Método não permitido' });

  const body = req.body;

  // 1. SE FOR UM FEEDBACK (Botão de Polegar para Baixo)
  if (body.tipo === 'feedback') {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return res.status(500).json({ erro: 'Chaves do Supabase não configuradas na Vercel' });
    }

    try {
      const response = await fetch(`${supabaseUrl}/rest/v1/chat_feedbacks`, {
        method: 'POST',
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({
          pergunta: body.pergunta,
          resposta_ia: body.respostaIA,
          resposta_ideal: body.respostaIdeal
        })
      });

      if (!response.ok) throw new Error('Erro ao salvar no Supabase');
      return res.status(200).json({ sucesso: true });
    } catch (error) {
      return res.status(500).json({ erro: `Supabase Erro: ${error.message}` });
    }
  }

  // 2. SE FOR UMA PERGUNTA NORMAL PARA A IA
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ erro: 'Chave do Gemini (GEMINI_API_KEY) está vazia na Vercel!' });

  const promptCompleto = `Contexto do PDF:\n${body.textoPDF}\n\nResponda: ${body.pergunta}`;

  try {
    const resposta = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: promptCompleto }] }],
        generationConfig: { temperature: 0.2 }
      })
    });

    const textResponse = await resposta.text(); 
    
    let dados;
    try {
        dados = JSON.parse(textResponse);
    } catch(e) {
        return res.status(500).json({ erro: `Google retornou um formato inválido.` });
    }

    if (dados.error) {
         return res.status(500).json({ erro: `RECUSADO PELO GOOGLE: ${dados.error.message}` });
    }

    if (!dados.candidates || dados.candidates.length === 0) {
         return res.status(500).json({ erro: `Google não enviou resposta.` });
    }
    
    return res.status(200).json({ respostaIA: dados.candidates[0].content.parts[0].text });
    
  } catch (error) {
    return res.status(500).json({ erro: `FALHA NA REQUISIÇÃO: ${error.message}` });
  }
}
