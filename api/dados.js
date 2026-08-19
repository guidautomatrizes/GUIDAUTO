import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN,
});

const CHAVE = "sistema-entregas-dados";

export default async function handler(req, res) {
  if (req.method === "GET") {
    const dados = await redis.get(CHAVE);
    res.status(200).json(dados || null);
    return;
  }

  if (req.method === "POST") {
    await redis.set(CHAVE, req.body);
    res.status(200).json({ ok: true });
    return;
  }

  res.status(405).json({ erro: "Método não permitido" });
}
