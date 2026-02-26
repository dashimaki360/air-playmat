import * as cheerio from 'cheerio';
import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

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
  const url = `https://www.pokemon-card.com/deck/deck.html?deckID=${deckCode}`;
  
  let browser = null;
  try {
    const isLocal = !process.env.VERCEL_REGION;
    
    if (isLocal) {
        // ローカル環境（テスト用）
        // 事前にインストールされたChromeのパスを指定するか、通常のpuppeteerを使用する必要があります
        // macOSのChromeの一般的なパスを指定します
        browser = await puppeteer.launch({
            executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
            headless: true,
        });
    } else {
        // Vercel Serverless Function環境向けのChromium起動設定
        browser = await puppeteer.launch({
          args: chromium.args,
          defaultViewport: chromium.defaultViewport,
          executablePath: await chromium.executablePath(),
          headless: chromium.headless,
          ignoreHTTPSErrors: true,
        });
    }
    
    const page = await browser.newPage();
    
    // APIレスポンスを横取りするためのプロミスを設定
    const deckDataPromise = new Promise<DeckList | null>((resolve) => {
      page.on('response', async (response) => {
        const reqUrl = response.url();
        // 公式デッキ画像のJSON情報などを返すAPIかもしれない通信を探す
        // レシピ詳細取得APIや、カード情報取得APIと思われるものをキャッチ
        if (reqUrl.includes('deck_api') || reqUrl.includes('recipe_api') || response.headers()['content-type']?.includes('application/json')) {
            try {
                const json = await response.json();
                
                // よくあるポケカ公式APIの構造（deck_p_c配列など）を探す
                if (json && (json.deck_p_c || Array.isArray(json) && json.length > 0 && json[0].id)) {
                    // デッキデータを発見
                    const rawCards = json.deck_p_c || json;
                    const parsedCards: CardInfo[] = rawCards.map((c: any) => ({
                        id: c.id,
                        name: c.name || c.card_name || 'Unknown',
                        count: parseInt(c.qty || c.count || c.num || '1', 10),
                        imageUrl: c.image || c.img || `https://www.pokemon-card.com/assets/images/card_images/large/${c.id}.jpg`
                    }));
                    resolve({ cards: parsedCards });
                }
            } catch (e) {
                // Ignore JSON parse errors for non-JSON or other irrelevant requests
            }
        }
      });
      
      // 一定時間見つからなければnullを返す
      setTimeout(() => resolve(null), 10000);
    });

    // 公式のAPIエンドポイントから直接データを取得する試み
    // サイトの構築上、ブラウザからFetch APIを直接叩くことでJSONが取得できる可能性が高い
    // 必要なCookie（セッション情報）をPuppeteer上で取得し、同じコンテキストでFetchする
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
    
    // JSの実行を待つため少し待機
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // ブラウザ内でFetchを実行
    const deckDataFromFetch = await page.evaluate(async (code) => {
        try {
            // 例: https://www.pokemon-card.com/recipe/deck-recipe/detail/deckID/kVvkkv-69A7Uu-kdfv11
            // または、そのページ内で叩かれている可能性のあるAPI
            // 今回は、deckIDを指定して詳細のJSONを取得する隠しAPIや、PCGDECKオブジェクトを探す
            
            // アプローチ2: スクリプトタグ内のPCGDECKオブジェクトを直接解析する
            const w = window as any;
            if (w.PCGDECK && w.PCGDECK.deckData) {
                 return w.PCGDECK.deckData;
            }

            // 見つからなければHTMLソース内から 'deck_p_c' などの文字列を強引にパース
            const html = document.documentElement.innerHTML;
            const pkeMatch = html.match(/deck_p_c\s*=\s*(\[.*?\]);/s);
            if (pkeMatch && pkeMatch[1]) {
                 return JSON.parse(pkeMatch[1]);
            }
            
            // またはhidden inputに格納されているかもしれない値
            const getHiddenValue = (name: string) => {
                const el = document.querySelector(`input[name="${name}"]`) as HTMLInputElement;
                return el ? el.value : '';
            };
            
            const rawPke = getHiddenValue('deck_pke');
            if (rawPke) {
                // pkeは "ID-枚数,ID-枚数" の形式になっていることが多い
                const cards: any[] = [];
                const parseHidden = (str: string, type: string) => {
                    if(!str) return;
                    str.split(',').forEach(item => {
                        const [id, countStr] = item.split('-');
                        if(id) {
                            cards.push({ id, count: parseInt(countStr || '1', 10), type });
                        }
                    });
                };
                
                parseHidden(getHiddenValue('deck_pke'), 'ポケモン');
                parseHidden(getHiddenValue('deck_gds'), 'グッズ');
                parseHidden(getHiddenValue('deck_tool'), 'ポケモンのどうぐ');
                parseHidden(getHiddenValue('deck_sup'), 'サポート');
                parseHidden(getHiddenValue('deck_sta'), 'スタジアム');
                parseHidden(getHiddenValue('deck_ene'), 'エネルギー');
                parseHidden(getHiddenValue('deck_tech'), 'わざマシン');
                
                return cards.length > 0 ? cards : null;
            }
            
            return null;
        } catch (e) {
            return null;
        }
    }, deckCode);

    if (deckDataFromFetch && deckDataFromFetch.length > 0) {
        if (isLocal) console.log(`Successfully extracted ${deckDataFromFetch.length} cards via fallback JS logic`);
        const parsedCards: CardInfo[] = deckDataFromFetch.map((c: any) => ({
            id: c.id,
            name: c.name || c.card_name || 'Unknown',
            count: c.count || parseInt(c.qty || c.num || '1', 10),
            imageUrl: c.imageUrl || c.image || c.img || `https://www.pokemon-card.com/assets/images/card_images/large/${c.id}.jpg`
        }));
        return { cards: parsedCards };
    }
    
    // JS変数から取得できなかった場合のフォールバック（DOMパース）
    if (isLocal) console.log('Falling back to DOM parsing');

    // JSロード後のHTMLを取得
    const html = await page.content();
    
    // デバッグ用にHTMLとスクリーンショットを保存
    if (isLocal) {
        const fs = await import('fs');
        fs.writeFileSync('debug-page.html', html);
        await page.screenshot({ path: 'debug-screenshot.png', fullPage: true });
    }

    const $ = cheerio.load(html);
    
    const cards: CardInfo[] = [];

    // 'cardListView' か 'cardImagesView' などのテーブル・グリッド要素内の画像タグを探す
    // 公式サイトのDOM構造に依存: #cardImagesView 内の .item
    $('#cardImagesView .item').each((_, element) => {
        // id 属性が card_11223 のようになっている想定
        const idStr = $(element).attr('id') || '';
        const id = idStr.replace('card_', '');
        
        const imageUrl = $(element).find('img').attr('src') || '';
        const name = $(element).find('img').attr('alt') || 'Unknown Card';
        
        const countText = $(element).find('.card_qty').text() || '1';
        const count = parseInt(countText.replace(/[^0-9]/g, ''), 10) || 1;

        if (id) {
           cards.push({
             id,
             name,
             count,
             imageUrl: imageUrl.startsWith('/') ? `https://www.pokemon-card.com${imageUrl}` : imageUrl
           });
        }
    });

    if (cards.length === 0) {
      console.warn('Warning: No cards found in the parsed HTML.');
    }

    return { cards };
  } catch (error) {
    console.error('Error fetching deck list with Puppeteer:', error);
    throw error;
  } finally {
    if (browser !== null) {
      await browser.close();
    }
  }
}
