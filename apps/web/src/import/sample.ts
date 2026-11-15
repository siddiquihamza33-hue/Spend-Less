import { SAMPLE_SOURCE, ymd } from '@spend-lens/core';

/** Three months of made-up spending (fixed seed, so it's the same every time), ending last month. */
export function sampleData() {
  let seed = 7;
  const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const pick = <T,>(a: T[]) => a[Math.floor(rnd() * a.length)];
  const now = new Date();
  const out: { date: string; desc: string; amount: number; source: string; cur: string }[] = [];
  const pools: [string[], number, number, number][] = [
    [['FOODPANDA*ORDER KARACHI', 'CHEEZIOUS DHA LAHORE', 'STARBUCKS DOLMEN MALL', 'KFC CLIFTON', 'BUTLERS CHOCOLATE CAFE', 'OPTP GULBERG'], 900, 4500, 14],
    [['IMTIAZ SUPER MARKET', 'CARREFOUR HYPERSTAR', 'NAHEED SUPERMARKET', 'PANDAMART GROCERY'], 3000, 14000, 6],
    [['CAREEM RIDE', 'UBER *TRIP', 'SHELL PAKISTAN FUEL', 'PSO SERVICE STATION', 'BYKEA'], 400, 7000, 10],
    [['DARAZ.PK ONLINE', 'KHAADI LUCKY ONE MALL', 'OUTFITTERS EMPORIUM', 'SAPPHIRE RETAIL', 'AMAZON.COM*MKTPLACE'], 2500, 18000, 4],
    [['CINEPAX DOLMEN', 'NUEPLEX CINEMAS', 'STEAMGAMES.COM'], 1200, 5000, 1],
    [['DVAGO PHARMACY', 'CHUGHTAI LAB', 'SHAPE FITNESS GYM'], 1500, 9000, 2],
  ];
  const add = (date: string | null, desc: string, amount: number) => { if (date) out.push({ date, desc, amount, source: SAMPLE_SOURCE, cur: 'PKR' }); };
  for (let mBack = 2; mBack >= 0; mBack--) {
    const y = new Date(now.getFullYear(), now.getMonth() - mBack - 1, 1);
    const Y = y.getFullYear(), M = y.getMonth() + 1;
    const day = () => ymd(Y, M, 1 + Math.floor(rnd() * 27));
    for (const [names, lo, hi, n] of pools) {
      const count = n + Math.floor(rnd() * 3) - (mBack === 0 && lo === 900 ? -4 : 0);
      for (let i = 0; i < count; i++) add(day(), pick(names), Math.round(lo + rnd() * (hi - lo)));
    }
    add(ymd(Y, M, 3), 'NETFLIX.COM', 1500);
    add(ymd(Y, M, 5), 'SPOTIFY P1A2B3C', 499);
    add(ymd(Y, M, 9), 'OPENAI *CHATGPT SUBSCR', 5600);
    add(ymd(Y, M, 12), 'K-ELECTRIC BILL PAYMENT', 14000 + Math.round(rnd() * 9000));
    add(ymd(Y, M, 14), 'PTCL BROADBAND', 4200);
    add(ymd(Y, M, 15), 'JAZZ POSTPAID', 2300);
    add(ymd(Y, M, 20), 'FED ON CARD CHARGES', 180);
    add(ymd(Y, M, 22), 'PAYMENT RECEIVED - THANK YOU', -120000);
    if (mBack === 1) add(ymd(Y, M, 18), 'EMIRATES AIRLINE TICKET', 148000);
    if (mBack === 1) add(ymd(Y, M, 25), 'DARAZ.PK REFUND', -3200);
  }
  return out;
}
