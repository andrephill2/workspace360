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
      return res.status(500).json({ erro: 'Falha ao salvar feedback' });
    }
  }

  // 2. SE FOR UMA PERGUNTA NORMAL PARA A IA
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ erro: 'Chave do Gemini não configurada' });

  const promptCompleto = `Contexto do PDF:\n${body.textoPDF}\n\nResponda: ${body.pergunta}`;

  try {
    // Usando o modelo correto: gemini-1.5-flash
    const resposta = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: promptCompleto }] }],
        generationConfig: { temperature: 0.2 }
      })
    });

    const dados = await resposta.json();
    if (dados.error) throw new Error(dados.error.message);
    
    return res.status(200).json({ respostaIA: dados.candidates[0].content.parts[0].text });
  } catch (error) {
    return res.status(500).json({ erro: 'Falha ao conectar com a IA' });
  }
}
