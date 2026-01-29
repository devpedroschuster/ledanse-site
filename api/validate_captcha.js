export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { token } = req.body;
  const secret = process.env.RECAPTCHA_SECRET_KEY;

  if (!token) {
    return res.status(400).json({ error: 'Token ausente' });
  }

  try {
    const verifyUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${secret}&response=${token}`;
    const googleResponse = await fetch(verifyUrl, { method: 'POST' });
    const data = await googleResponse.json();

    if (data.success && data.score >= 0.5) {
      return res.status(200).json({ success: true });
    } else {
      console.warn("Falha no reCAPTCHA:", data);
      return res.status(403).json({ error: 'Falha na verificação de segurança', details: data });
    }
  } catch (error) {
    console.error("Erro no servidor:", error);
    return res.status(500).json({ error: 'Erro interno na validação' });
  }
}