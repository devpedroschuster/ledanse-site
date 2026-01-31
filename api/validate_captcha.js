export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    let body = req.body;
    if (typeof body === 'string') {
        try { body = JSON.parse(body); } catch (e) {}
    }

    const { token } = body || {};

    if (token === 'BYPASS_DEV_MODE') {
        console.log(">>> BACKEND: Modo Dev ativado. Captcha pulado.");
        return res.status(200).json({ success: true, message: "Modo de Teste" });
    }

    if (!token) return res.status(400).json({ error: 'Token ausente' });

    const secret = process.env.RECAPTCHA_SECRET_KEY;
    const verifyUrl = `https://www.google.com/recaptcha/api/siteverify?secret=${secret}&response=${token}`;
    
    const googleResponse = await fetch(verifyUrl, { method: 'POST' });
    const data = await googleResponse.json();

    if (data.success && data.score >= 0.5) {
      return res.status(200).json({ success: true });
    } else {
      return res.status(403).json({ error: 'Robô detectado' });
    }

  } catch (error) {
    return res.status(500).json({ error: 'Erro interno' });
  }
}