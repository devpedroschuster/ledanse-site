import { Redis } from '@upstash/redis';

export default async function handler(req, res) {
  try {
    const redis = Redis.fromEnv();

    let token = await redis.get('instagram_token');
    
    if (!token) {
      token = process.env.INITIAL_IG_TOKEN;
    }

    if (!token) {
      throw new Error('Nenhum token encontrado (Verifique o INITIAL_IG_TOKEN na Vercel).');
    }

    const mediaUrl = `https://graph.instagram.com/me/media?fields=id,caption,media_type,media_url,thumbnail_url,permalink&limit=6&access_token=${token}`;
    let response = await fetch(mediaUrl);
    
    if (response.status === 401) {
      console.log("Token expirado! Tentando renovar...");
      
      const refreshUrl = `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${token}`;
      const refreshResponse = await fetch(refreshUrl);
      const refreshData = await refreshResponse.json();

      if (!refreshData.access_token) {
        throw new Error('Falha ao renovar token.');
      }

      token = refreshData.access_token;
      await redis.set('instagram_token', token);
      
      response = await fetch(`https://graph.instagram.com/me/media?fields=id,caption,media_type,media_url,thumbnail_url,permalink&limit=6&access_token=${token}`);
    }

    const data = await response.json();
    
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
    return res.status(200).json(data);

  } catch (error) {
    console.error("Erro API Instagram:", error);
    return res.status(500).json({ error: 'Erro interno ao buscar Instagram' });
  }
}