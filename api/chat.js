export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ erro: 'Método não permitido' });
  const body = req.body;

  // 1. Feedback para o Supabase
  if (body.tipo === 'feedback') {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_KEY;
    if (!supabaseUrl || !supabaseKey) return res.status(500).json({ erro: 'Chaves do Supabase ausentes na Vercel' });
    try {
      await fetch(`${supabaseUrl}/rest/v1/chat_feedbacks`, {
        method: 'POST',
        headers: { 'apikey': supabaseKey, 'Authorization': `Bearer ${supabaseKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ pergunta: body.pergunta, resposta_ia: body.respostaIA, resposta_ideal: body.respostaIdeal })
      });
      return res.status(200).json({ sucesso: true });
    } catch (e) { return res.status(500).json({ erro: 'Erro ao salvar feedback' }); }
  }

  // 2. Pergunta para a IA
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ erro: 'Chave GEMINI_API_KEY não encontrada na Vercel' });

  const promptFinal = `CONTEXTO DO(S) PDF(S):\n${body.textoPDF}\n\nPERGUNTA: ${body.pergunta}`;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: promptFinal }] }] })
    });
    const data = await response.json();
    if (data.error) return res.status(500).json({ erro: `Google diz: ${data.error.message}` });
    return res.status(200).json({ respostaIA: data.candidates[0].content.parts[0].text });
  } catch (err) { return res.status(500).json({ erro: 'Falha total na conexão com a IA' }); }
}
