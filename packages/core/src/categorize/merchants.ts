const NOISE = /\b(pos|purchase|debit|card|visa|mastercard|master|amex|unionpay|paypak|online|intl|international|txn|trx|ref|reference|sq|tst|paypal|pp|www|com|pk|pak|pakistan|ae|uae|us|usa|gb|uk|karachi|lahore|islamabad|rawalpindi|faisalabad|peshawar|multan|dubai|abu dhabi|london|new york|sales?|charge|order|dlocal|ecom|e-com|retail|pvt|ltd|limited|llc|inc|co|the)\b/gi;

/** Well-known merchants whose statement text is messy ("FACEBK *AGUV36A9T4") get a clean name. */
export const MERCHANT_ALIASES: [RegExp, string][] = [
  [/\bfacebk\b|\bfacebook\b/i, 'Facebook Ads'], [/netflix/i, 'Netflix'], [/anthropic|claude\.ai/i, 'Anthropic (Claude)'],
  [/food ?panda/i, 'Foodpanda'], [/spotify/i, 'Spotify'], [/prime video/i, 'Prime Video'], [/proton ?vpn/i, 'Proton VPN'],
  [/google (one|g1)/i, 'Google One'], [/openai|chatgpt/i, 'OpenAI (ChatGPT)'], [/k-?electric/i, 'K-Electric'], [/daraz/i, 'Daraz'], [/careem/i, 'Careem'],
];

/**
 * A readable merchant name from a statement description:
 * "FOOD PANDA, KARACHI" → "Foodpanda", "NEEDZ SUPER MARKET, KARACHI" → "Needz Super Market".
 * Bank fee and tax lines are kept as written ("FED on Foreign Transaction Fee").
 */
export function merchantOf(desc: string): string {
  for (const [re, name] of MERCHANT_ALIASES) if (re.test(desc)) return name;
  if (/\b(tax|fee|fed|charges?|interest|markup|reward points)\b/i.test(desc) && String(desc).length < 48 && /[a-z]/.test(desc)) return String(desc).trim();
  const s = String(desc).replace(/[*_|]/g, ' ').replace(/https?:\/\/\S+/g, ' ')
    .replace(/\.(com|net|org|io|pk)\b/gi, ' ').replace(/\S*\d\S*\d\S*/g, ' ').replace(NOISE, ' ')
    .replace(/[^\p{L}\p{N}&' .-]/gu, ' ').replace(/\s{2,}/g, ' ').trim();
  const words = s.split(' ').filter(w => /\p{L}/u.test(w) && w.length > 1).slice(0, 3);
  let m = words.join(' ');
  if (!m) m = String(desc).trim().slice(0, 28);
  return m.toLowerCase().replace(/(^|[\s-])(\p{L})/gu, (_a, b: string, c: string) => b + c.toUpperCase());
}
