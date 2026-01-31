import Redis from 'ioredis';

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');

    if (req.method === 'OPTIONS') return res.status(200).end();

    let token = process.env.INITIAL_IG_TOKEN;
    let redis = null;

    try {
        if (process.env.REDIS_URL) {
            redis = new Redis(process.env.REDIS_URL, {
                maxRetriesPerRequest: 1,
                connectTimeout: 2000
            });

            redis.on('error', (err) => {
                console.warn("⚠️ Redis indisponível (Modo Offline):", err.message);
            });

            try {
                const cachedToken = await redis.get('instagram_token');
                if (cachedToken) token = cachedToken;
            } catch (ignore) {
                console.log("Usando token do arquivo .env");
            }
        }

        if (!token) throw new Error('Token não configurado');

        const fields = 'id,caption,media_type,media_url,thumbnail_url,permalink';
        const url = `https://graph.instagram.com/me/media?fields=${fields}&limit=6&access_token=${token}`;
        
        const response = await fetch(url);
        
        if (response.status === 401 && redis && redis.status === 'ready') {
            console.log("Token vencido. Tentando renovar...");
            const refreshUrl = `https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${token}`;
            const refresh = await fetch(refreshUrl);
            const refreshData = await refresh.json();

            if (refreshData.access_token) {
                token = refreshData.access_token;
                await redis.set('instagram_token', token);
                const retryResponse = await fetch(`https://graph.instagram.com/me/media?fields=${fields}&limit=6&access_token=${token}`);
                const retryData = await retryResponse.json();
                await redis.quit();
                return res.status(200).json(retryData);
            }
        }

        const data = await response.json();
        
        if (redis) await redis.quit();

        if (data.error) {
            console.error("Erro API Instagram:", data.error);
            return res.status(200).json({ data: [] });
        }

        res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
        return res.status(200).json(data);

    } catch (error) {
        console.error("Erro Geral:", error);
        if (redis) await redis.quit();
        return res.status(200).json({ data: [] });
    }
}