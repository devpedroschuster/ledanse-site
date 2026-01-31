// api/instagram.js (VERSÃO TEMPORÁRIA PARA DESTRANCAR O TERMINAL)
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  
  // Retorna vazio por enquanto para não travar o servidor
  return res.status(200).json({ data: [] });
}