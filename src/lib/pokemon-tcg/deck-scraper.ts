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
    // ページロードを待機
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
    
    // JSの実行を待つため少し待機
    await new Promise(resolve => setTimeout(resolve, 5000));

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
