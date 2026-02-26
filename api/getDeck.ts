import { VercelRequest, VercelResponse } from '@vercel/node';
import { getDeckList } from '../src/lib/pokemon-tcg/deck-scraper';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORSを許可（必要に応じて制限可能）
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // GET メソッド以外は許可しない
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const deckCode = req.query.code as string;
    if (!deckCode) {
      return res.status(400).json({ error: 'Deck code is required. Example: ?code=Y888cD-AzhZEz-Y8G4xc' });
    }

    // デッキコードからカード情報を取得
    const deckData = await getDeckList(deckCode);
    
    // キャッシュを有効化し、負荷を低減 (Vercel Edge Network キャッシュ)
    // s-maxage=3600: エッジサーバーで1時間キャッシュ
    // stale-while-revalidate=86400: 古いキャッシュを返しつつ裏で更新
    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
    
    return res.status(200).json(deckData);
  } catch (error: any) {
    console.error('API Error:', error);
    const errorMessage = error.message || 'Failed to fetch deck';
    
    // 「未対応のページ構造、またはデッキが存在しません」などのエラー
    if (errorMessage.includes('存在しません') || errorMessage.includes('未対応')) {
       return res.status(404).json({ error: 'Deck not found or invalid deck code' });
    }
    
    return res.status(500).json({ error: errorMessage });
  }
}
