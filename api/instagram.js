import Redis from 'ioredis';

const rateLimit = new Map();
let cachedData = null;
let cacheTime = 0;
const CACHE_DURATION = 3600 * 1000;

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');

    if (req.method === 'OPTIONS') return res.status(200).end();

    const ip = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown_ip';
    const currentTime = Date.now();
    const windowMs = 60 * 1000;
    const maxRequests = 10;

    if (rateLimit.has(ip)) {
        const userLimit = rateLimit.get(ip);
        if (currentTime - userLimit.startTime < windowMs) {
            if (userLimit.count >= maxRequests) {
                console.warn(`🚨 Rate limit excedido no Instagram para o IP: ${ip}`);
                return res.status(429).json({ error: 'Muitas tentativas. Aguarde um momento.' });
            }
            userLimit.count++;
        } else {
            rateLimit.set(ip, { count: 1, startTime: currentTime });
        }
    } else {
        rateLimit.set(ip, { count: 1, startTime: currentTime });
    }

    if (cachedData && (Date.now() - cacheTime < CACHE_DURATION)) {
        console.log('⚡ Retornando Instagram do Cache de Memória da Vercel!');
        res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
        return res.status(200).json(cachedData);
    }

    let token = process.env.INITIAL_IG_TOKEN;
    let redis = null;

    try {
        if (process.env.REDIS_URL) {
            redis = new Redis(process.env.REDIS_URL, {
                maxRetriesPerRequest: 1,
                connectTimeout: 2000
            });

            redis.on('error', (err) => {
                console.error(JSON.stringify({
                    level: 'ERROR',
                    type: 'REDIS_CONNECTION_FAILURE',
                    message: 'Falha no Redis. O sistema entrou em fallback (usando token do .env).',
                    details: err.message,
                    timestamp: new Date().toISOString()
                }));
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
                
                cachedData = retryData;
                cacheTime = Date.now();
                
                res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
                return res.status(200).json(retryData);
            }
        }

        const data = await response.json();
        
        if (redis) await redis.quit();

        if (data.error) {
            console.error("Erro API Instagram:", data.error);
            return res.status(200).json({ data: [] });
        }

        cachedData = data;
        cacheTime = Date.now();

        res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
        return res.status(200).json(data);

    } catch (error) {
        console.error("Erro Geral:", error);
        if (redis) await redis.quit();
        return res.status(200).json(cachedData ? cachedData : { data: [] });
    }
}