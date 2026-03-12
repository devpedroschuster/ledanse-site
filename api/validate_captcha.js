const rateLimit = new Map();

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown_ip';
  const currentTime = Date.now();
  const windowMs = 60 * 1000;
  const maxRequests = 3;

  if (rateLimit.has(ip)) {
    const userLimit = rateLimit.get(ip);
    if (currentTime - userLimit.startTime < windowMs) {
      if (userLimit.count >= maxRequests) {
        console.warn(`🚨 Rate limit excedido para o IP: ${ip}`);
        return res.status(429).json({ success: false, error: 'Muitas tentativas. Aguarde 1 minuto e tente novamente.' });
      }
      userLimit.count++;
    } else {
      rateLimit.set(ip, { count: 1, startTime: currentTime });
    }
  } else {
    rateLimit.set(ip, { count: 1, startTime: currentTime });
  }

  try {
    let body = req.body;
    if (typeof body === 'string') {
        try { body = JSON.parse(body); } catch (e) {}
    }

    const { token } = body || {};

    if (token === 'BYPASS_DEV_MODE') {
        if (process.env.NODE_ENV === 'development') {
            console.log('⚠️ [DEV] reCAPTCHA bypass ativado!');
            return res.status(200).json({ success: true });
        } else {
            console.warn('🚨 TENTATIVA DE BYPASS EM PRODUÇÃO BLOQUEADA!');
            return res.status(403).json({ success: false, error: 'Acesso negado.' });
        }
    }

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