export const CARD_IMAGE_BASE_URL = 'https://www.pokemon-card.com/assets/images/card_images/large/';

/** imageUrl が絶対URLならそのまま、相対パスなら CARD_IMAGE_BASE_URL を付与 */
export const resolveCardImageUrl = (imageUrl: string): string =>
    imageUrl.startsWith('http') ? imageUrl : CARD_IMAGE_BASE_URL + imageUrl;
