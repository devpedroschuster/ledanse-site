import { Redis } from '@upstash/redis';

export default async function handler(req, res) {

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  
  try {
    const redis = Redis.fromEnv();
    
    // Rate Limiting
    const ip = req.headers['x-forwarded-for'] || 'unknown';
    const rateLimitKey = `rate_limit_ig:${ip}`;
    const requests = await redis.incr(rateLimitKey);
    if (requests === 1) await redis.expire(rateLimitKey, 60);
    
    if (requests > 20) {
      return res.status(429).json({ error: 'Too Many Requests', data: [] });
    }

    // Recuperação do Token
    let token = await redis.get('instagram_token');
    if (!token) token = process.env.INITIAL_IG_TOKEN;

    if (!token) {
      console.error("Token não configurado");
      return res.status(500).json({ error: 'Configuração ausente', data: [] });
    }

    // Instagram Timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    try {
        const mediaUrl = `https://graph.instagram.com/me/media?fields=id,caption,media_type,media_url,thumbnail_url,permalink&limit=6&access_token=${token}`;
        let response = await fetch(mediaUrl, { signal: controller.signal });
        
        // Renovação de Token
        if (response.status === 401) {
            console.log("Renovando token...");
            const refreshUrl = `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${token}`;
            const refreshResponse = await fetch(refreshUrl);
            const refreshData = await refreshResponse.json();

            if (refreshData.access_token) {
                token = refreshData.access_token;
                await redis.set('instagram_token', token);
                response = await fetch(`https://graph.instagram.com/me/media?fields=id,caption,media_type,media_url,thumbnail_url,permalink&limit=6&access_token=${token}`);
            }
        }

        if (!response.ok) {
            throw new Error(`Instagram API Error: ${response.status}`);
        }

        const data = await response.json();
        clearTimeout(timeoutId);

        // Cache agressivo
        res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
        return res.status(200).json(data);

    } catch (fetchError) {
        clearTimeout(timeoutId);
        console.error("Erro no fetch do Instagram:", fetchError);
        return res.status(200).json({ data: [], error: 'Falha temporária na conexão' });
    }

  } catch (error) {
    console.error("Erro Geral API:", error);
    return res.status(500).json({ error: 'Erro interno', data: [] });
  }
}