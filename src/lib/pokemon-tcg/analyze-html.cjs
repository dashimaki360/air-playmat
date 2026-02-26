const fs = require('fs');
const cheerio = require('cheerio');
const html = fs.readFileSync('src/lib/pokemon-tcg/sample.html', 'utf8');
const $ = cheerio.load(html);

// .pcg7-card-box にカード情報があると想定
const cards = [];
$('.pcg7-cardArea .pcg7-card-box').each((_, el) => {
    // 例: pcg7-card-box id="card_43355" のようになっているか確認
    console.log($(el).attr('id'));
});

// もう一つのアプローチ: input[type="hidden"] の値をパースする
// ポケカ公式は "deck_pke" (ポケモン), "deck_gds" (グッズ) ... などに `<id>-<枚数>` の形式でカンマ区切りで入れていることが多い
console.log('--- hidden values ---');
const categories = ['deck_pke', 'deck_gds', 'deck_tool', 'deck_tech', 'deck_sup', 'deck_sta', 'deck_ene', 'deck_ajs'];
categories.forEach(cat => {
    const val = $(`input[name="${cat}"]`).val();
    if(val) {
        console.log(`${cat}:`, val);
    }
});
