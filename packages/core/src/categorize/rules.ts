/**
 * Category rules: [name, icon key, keywords]. Order matters — the first category whose
 * keywords match wins (e.g. Advertising is checked before Subscriptions so "Google Ads"
 * isn't read as a Google subscription). Keywords of 4 characters or fewer must match a whole
 * word; longer ones match the start of a word.
 */
export const CATEGORIES: [name: string, icon: string, keywords: string[]][] = [
  ['Food & Dining', 'food', ['foodpanda','food panda','restaurant','cafe','café','coffee','starbucks','mcdonald','kfc','pizza','burger','cheezious','hardee','subway','domino','bakery','bakers','kitchen','grill','bbq','tikka','biryani','karahi','deliveroo','talabat','uber eats','ubereats','doordash','grubhub','dunkin','tim hortons','gloria jean','espresso','chai','dhaba','eatery','diner','sushi','shawarma','nando','johnny rocket','optp','howdy','butlers','tea','xanders','united king','foods','salt n pepper','kababjees','ginsoy','california pizza','14th street']],
  ['Groceries', 'cart', ['pandamart','needz','imtiaz','carrefour','metro cash','metro','naheed','chase up','chaseup','al-fatah','alfatah','al fatah','grocery','grocer','supermarket','super market','superstore','hyperstar','spar','lulu','walmart','tesco','aldi','whole foods','kroger','costco','sainsbury','safeway','green valley','esajee','bin hashim','mart','krave mart','daily deals']],
  ['Transport & Fuel', 'car', ['careem','uber','bykea','indrive','in drive','lyft','taxi','cab','fuel','petrol','shell','pso','total parco','totalenergies','attock','caltex','hascol','byco','parking','toll','motorway','m-tag','mtag','rta','salik','enoc','adnoc','service station','filling station','car wash','tyre']],
  ['Advertising', 'megaphone', ['facebk','facebook','fb ads','meta ads','meta platforms','instagram','google ads','adwords','tiktok ads','linkedin ads','snapchat ads','twitter ads','x ads']],
  ['Subscriptions', 'repeat', ['netflix','spotify','youtube','apple.com','itunes','icloud','google','adobe','microsoft','openai','chatgpt','anthropic','claude.ai','figma','notion','canva','prime video','amazon prime','disney','hulu','hbo','linkedin','dropbox','github','tamasha','starzplay','shahid','osn','patreon','duolingo','zoom','slack','grammarly','framer','webflow','vercel','godaddy','namecheap','cloudflare','aws','digitalocean','subscription','membership']],
  ['Shopping', 'bag', ['daraz','amazon','ebay','aliexpress','temu','shein','khaadi','gul ahmed','sapphire','outfitters','breakout','zara','h&m','ikea','nike','adidas','alkaram','limelight','junaid jamshed','bonanza','nishat','mall','store','shop','boutique','apparel','fashion','interwood','homes','electronics','mobile zone','apple store','noon','namshi','centrepoint','sephora','ideas','charcoal','engine','uniworth','bata','servis','stylo','hush puppies','dolmen','packages mall','emporium','lucky one','zellbury','generation','beechtree','ethnic','kayseria','edenrobe','cross stitch','agha noor','maria b','sana safinaz','gul ahmed ideas','minnie minors']],
  ['Bills & Utilities', 'zap', ['k-electric','k electric','kelectric','lesco','iesco','mepco','fesco','pesco','gepco','sui gas','ssgc','sngpl','ptcl','jazz','zong','telenor','ufone','nayatel','stormfiber','storm fiber','worldcall','wateen','electric','water board','kwsc','utility','utilities','etisalat','dewa','internet','broadband','insurance','jubilee','efu','state life','bill payment','postpaid']],
  ['Travel', 'plane', ['airline','airlines','airways','pia ','emirates','qatar','etihad','airblue','serene air','serene','flydubai','air arabia','saudia','turkish','fly jinnah','hotel','booking.com','airbnb','agoda','expedia','marriott','hilton','pearl continental','pc hotel','avari','movenpick','sheraton','hyatt','trip.com','skyscanner','sastaticket','bookme flight','travel','tours','visa fee']],
  ['Entertainment', 'film', ['cinema','cinepax','nueplex','cinemas','cinestar','imax','steam','playstation','xbox','nintendo','epic games','ticket','bookme','event','concert','arcade','bowling','theme park','sindbad','golf','club','games','gaming']],
  ['Health & Fitness', 'health', ['pharmacy','pharma','chemist','clinic','hospital','medical','medicos','dvago','servaid','chughtai','aga khan','shifa','shaukat khanum','indus hospital','gym','fitness','dental','dentist','lab','laboratory','diagnostic','optical','optician','wellness','spa','salon','barber','yoga','sehat','marham','oladoc']],
  ['Education', 'edu', ['university','school','college','course','udemy','coursera','skillshare','masterclass','edx','academy','institute','tuition','books','bookstore','liberty books','saeed book','paramount','stationery','exam','ielts','builtformars','built for mars','interaction design','nngroup']],
  ['Fees & Charges', 'receipt', ['atm','transaction fee','foreign transaction','sales tax','advance tax','cash advance','annual fee','late fee','late payment','finance charge','interest','markup','mark-up','service charge','fed ','f.e.d','withholding','wht','excise','sms alert','card fee','overlimit','over limit','processing fee','govt tax','tax on']],
  ['Donations', 'heart', ['donation','charity','edhi','saylani','zakat','sadqa','fundraiser','alkhidmat','akhuwat','unicef','red crescent']],
  ['Other', 'other', []],
];

/** Every credit (payment, refund, cashback) is shown under this category. */
export const CREDIT_CAT = 'Payments & Refunds';

/** Categories a user can pick for a purchase. */
export const CAT_NAMES: string[] = CATEGORIES.map(c => c[0]);

/** Category → icon key (the UI maps keys to its icon set). */
export const CAT_ICON: Record<string, string> = { ...Object.fromEntries(CATEGORIES.map(c => [c[0], c[1]])), [CREDIT_CAT]: 'refund' };
