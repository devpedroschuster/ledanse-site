import Redis from 'ioredis';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const redis = new Redis(process.env.REDIS_URL);

    const ip = req.headers['x-forwarded-for'] || 'unknown';
    const rateLimitKey = `rate_limit_ig:${ip}`;
    
    const requests = await redis.incr(rateLimitKey);
    if (requests === 1) await redis.expire(rateLimitKey, 60);
    
    if (requests > 20) {
      await redis.quit();
      return res.status(429).json({ error: 'Too Many Requests', data: [] });
    }

    let token = await redis.get('instagram_token');
    
    if (!token) token = process.env.INITIAL_IG_TOKEN;

    if (!token) {
      console.error("Token não configurado");
      await redis.quit();
      return res.status(500).json({ error: 'Configuração ausente', data: [] });
    }

    try {
        const mediaUrl = `https://graph.instagram.com/me/media?fields=id,caption,media_type,media_url,thumbnail_url,permalink&limit=6&access_token=${token}`;
        let response = await fetch(mediaUrl);
        
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
        
        await redis.quit();

        res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
        return res.status(200).json(data);

    } catch (fetchError) {
        console.error("Erro no fetch do Instagram:", fetchError);
        await redis.quit();
        return res.status(200).json({ data: [], error: 'Falha temporária na conexão' });
    }

  } catch (error) {
    console.error("Erro Geral API:", error);
    return res.status(500).json({ error: 'Erro interno', data: [] });
  }
}