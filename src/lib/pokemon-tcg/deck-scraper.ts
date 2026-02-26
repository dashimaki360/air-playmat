import * as cheerio from 'cheerio';

export interface CardInfo {
  id: string;
  name: string;
  count: number;
  imageUrl: string;
  type?: string; 
}

export interface DeckList {
  cards: CardInfo[];
}

/**
 * 指定されたデッキコードからポケモンカード公式のデッキリストを取得する
 * @param deckCode デッキコード (例: kVvkkv-69A7Uu-kdfv11)
 * @returns デッキに含まれるカードのリスト
 */
export async function getDeckList(deckCode: string): Promise<DeckList> {
  const url = `https://www.pokemon-card.com/deck/confirm.html/deckID/${deckCode}/`;
  
  try {
      const response = await fetch(url, {
          headers: {
              'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
              'Accept-Language': 'ja-JP,ja;q=0.9,en-US;q=0.8,en;q=0.7'
          }
      });
      
      if (!response.ok) {
          throw new Error(`Failed to fetch deck page: ${response.status}`);
      }
      
      const htmlText = await response.text();
      const $ = cheerio.load(htmlText);
      const cards: CardInfo[] = [];

      // 1. 画像URLと名前の辞書を作成
      // PCGDECK.searchItemCardPict[46785]='/assets/images/card_images/large/SV8a/046785_P_TAKERURAIKOEX.jpg';
      const imageDict: Record<string, string> = {};
      const imgRegex = /PCGDECK\.searchItemCardPict\[(\d+)\]\s*=\s*'([^']+)';/g;
      let match;
      while ((match = imgRegex.exec(htmlText)) !== null) {
          imageDict[match[1]] = match[2];
      }

      // PCGDECK.searchItemNameAlt[46785]='タケルライコex';
      const nameDict: Record<string, string> = {};
      const nameRegex = /PCGDECK\.searchItemNameAlt\[(\d+)\]\s*=\s*'([^']+)';/g;
      while ((match = nameRegex.exec(htmlText)) !== null) {
          nameDict[match[1]] = match[2];
      }
      // 代替としてフルネーム
      const fullNameRegex = /PCGDECK\.searchItemName\[(\d+)\]\s*=\s*'([^']+)';/g;
      while ((match = fullNameRegex.exec(htmlText)) !== null) {
          if (!nameDict[match[1]]) {
              nameDict[match[1]] = match[2].replace(/\(.*?\)/, '').trim(); // "(SV8a 124/187)" などを削除
          }
      }

      // 2. hidden inputのメタデータからの抽出
      // 種類ごとに取得
      const categories = [
          { name: 'deck_pke', type: 'ポケモン' }, 
          { name: 'deck_gds', type: 'グッズ' }, 
          { name: 'deck_tool', type: 'ポケモンのどうぐ' }, 
          { name: 'deck_sup', type: 'サポート' }, 
          { name: 'deck_sta', type: 'スタジアム' }, 
          { name: 'deck_ene', type: 'エネルギー' }, 
          { name: 'deck_tech', type: 'わざマシン' }
      ];

      categories.forEach(cat => {
          // 例: <input type="hidden" name="deck_pke" value="46785_2_1-46014_1_1">
          const val = $(`input[name="${cat.name}"]`).val() as string;
          if (val) {
              const items = val.split('-');
              items.forEach(item => {
                  const parts = item.split('_'); // [id, count, something]
                  if (parts.length >= 2) {
                      const id = parts[0];
                      const count = parseInt(parts[1] || '1', 10);
                      if (id && count > 0) {
                          const imagePath = imageDict[id] || `/assets/images/card_images/large/${id}.jpg`;
                          cards.push({
                              id,
                              name: nameDict[id] || 'Unknown',
                              count,
                              type: cat.type,
                              imageUrl: imagePath.startsWith('/') ? `https://www.pokemon-card.com${imagePath}` : imagePath
                          });
                      }
                  }
              });
          }
      });

      if (cards.length > 0) {
          return { cards };
      }

      throw new Error('未対応のページ構造、またはデッキが存在しません');
  } catch (e) {
      console.error('Error fetching deck list with new fetch parser:', e);
      throw e;
  }
}
