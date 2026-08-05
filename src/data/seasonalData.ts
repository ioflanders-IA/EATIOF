import { DishCourse } from '../types';

export interface SeasonalItem {
  name: string;
  category: 'Verdura' | 'Frutta' | 'Erbe & Aromi' | 'Specialità';
  icon: string;
  description: string;
  benefits: string;
}

export interface MonthSeasonalData {
  monthName: string;
  season: 'Inverno' | 'Primavera' | 'Estate' | 'Autunno';
  seasonIcon: string;
  accentColor: string;
  description: string;
  items: SeasonalItem[];
}

export const MONTHLY_SEASONAL_PRODUCE: MonthSeasonalData[] = [
  // 0. GENNAIO
  {
    monthName: 'Gennaio',
    season: 'Inverno',
    seasonIcon: '❄️',
    accentColor: 'text-blue-600 bg-blue-50 border-blue-200',
    description: 'Ricco di agrumi e crucifere (broccoli, cavoli) che rafforzano le difese immunitarie invernali.',
    items: [
      { name: 'Carciofi Romaneschi', category: 'Verdura', icon: '🥬', description: 'Re della cucina laziale, teneri e senza spine.', benefits: 'Ottimi per il fegato e ricchi di cinarina.' },
      { name: 'Puntarelle (Cicoria di Catalogna)', category: 'Verdura', icon: '🥗', description: 'Croccanti da gustare con salsa di alici e aglio.', benefits: 'Proprietà depurative e digestive.' },
      { name: 'Broccolo Romanesco', category: 'Verdura', icon: '🥦', description: 'Piramide verde dal gusto dolce e delicato.', benefits: 'Ricchissimo di Vitamina C e antiossidanti.' },
      { name: 'Finocchi', category: 'Verdura', icon: '🧅', description: 'Freschi e digestivi per insalate invernali.', benefits: 'Sgonfianti e poveri di calorie.' },
      { name: 'Arance Sabina & Tarocco', category: 'Frutta', icon: '🍊', description: 'Succose e ricche di succo zuccherino.', benefits: 'Massima carica di Vitamina C.' },
      { name: 'Mandarini e Clementine', category: 'Frutta', icon: '🍊', description: 'Dolci e pratici snack di stagione.', benefits: 'Idratanti ed energetici.' },
      { name: 'Cavolo Nero', category: 'Verdura', icon: '🥬', description: 'Perfetto per zuppe e minestre invernali.', benefits: 'Superfood ricco di ferro e calcio.' },
      { name: 'Salvia e Rosmarino', category: 'Erbe & Aromi', icon: '🌿', description: 'Aromi rustici per arrosti e cotture al forno.', benefits: 'Antisettici e digestivi naturali.' }
    ]
  },
  // 1. FEBBRAIO
  {
    monthName: 'Febbraio',
    season: 'Inverno',
    seasonIcon: '❄️',
    accentColor: 'text-indigo-600 bg-indigo-50 border-indigo-200',
    description: 'Il picco della stagione dei carciofi romaneschi e degli agrumi dolci.',
    items: [
      { name: 'Carciofi Romaneschi (Ciarofoli)', category: 'Verdura', icon: '🥬', description: 'Ideali per carciofi alla giudia o alla romana.', benefits: 'Potente azione disintossicante.' },
      { name: 'Puntarelle', category: 'Verdura', icon: '🥗', description: 'Germogli croccanti di cicoria.', benefits: 'Stimolano la digestione.' },
      { name: 'Radicchio Rosso', category: 'Verdura', icon: '🥬', description: 'Gusto amarognolo ottimo per risotti.', benefits: 'Ricco di antociani e fibre.' },
      { name: 'Spinaci Freschi', category: 'Verdura', icon: '🍃', description: 'Foglie tenere per contorni o frittate.', benefits: 'Fonte di ferro e acido folico.' },
      { name: 'Arance e Pompelmi', category: 'Frutta', icon: '🍊', description: 'Agrumi di piena maturazione.', benefits: 'Rafforzano le difese immunitarie.' },
      { name: 'Mele e Pere Locali', category: 'Frutta', icon: '🍎', description: 'Croccanti e dolci.', benefits: 'Regolano il colesterolo.' },
      { name: 'Prezzemolo Fresco', category: 'Erbe & Aromi', icon: '🌿', description: 'Re delle erbe aromatiche romane.', benefits: 'Ricco di Vitamina C e sali minerali.' }
    ]
  },
  // 2. MARZO
  {
    monthName: 'Marzo',
    season: 'Primavera',
    seasonIcon: '🌱',
    accentColor: 'text-emerald-600 bg-emerald-50 border-emerald-200',
    description: 'Risveglio della primavera: compaiono i primi asparagi selvatici e le erbe di campo.',
    items: [
      { name: 'Asparagi Selvatici', category: 'Verdura', icon: '🌾', description: 'Teneri e saporiti, perfetti per frittate o primi.', benefits: 'Forte potere drenante e diuretico.' },
      { name: 'Agretti (Barba di Frate)', category: 'Verdura', icon: '🌱', description: 'Foglie sottili da fare al vapore con limone e olio EVO.', benefits: 'Ricchissimi di potassio e depurativi.' },
      { name: 'Carciofi Romaneschi', category: 'Verdura', icon: '🥬', description: 'Al culmine della tenerezza.', benefits: 'Proteggono le vie biliari.' },
      { name: 'Piselli Freschi', category: 'Verdura', icon: '🫛', description: 'Baccelli dolci e teneri.', benefits: 'Proteine vegetali leggere.' },
      { name: 'Fragoli del Lazio', category: 'Frutta', icon: '🍓', description: 'Prime fragole dolci e profumate.', benefits: 'Ricche di antiossidanti.' },
      { name: 'Limoni della Costa', category: 'Frutta', icon: '🍋', description: 'Profumati ed eccellenti per condimenti.', benefits: 'Alcalinizzanti e digestivi.' },
      { name: 'Menta Fresca (Mentuccia)', category: 'Erbe & Aromi', icon: '🌱', description: 'Immancabile nei carciofi alla romana.', benefits: 'Rinfrescante e carminativa.' }
    ]
  },
  // 3. APRILE
  {
    monthName: 'Aprile',
    season: 'Primavera',
    seasonIcon: '🌸',
    accentColor: 'text-pink-600 bg-pink-50 border-pink-200',
    description: 'Fave fresche con pecorino sabino, asparagi e frutti primaverili.',
    items: [
      { name: 'Fave Fresche', category: 'Verdura', icon: '🫘', description: 'Tradizione di maggio e aprile con Pecorino Romano.', benefits: 'Ricche di levodopa, fibre e proteine.' },
      { name: 'Asparagi di Campo', category: 'Verdura', icon: '🌾', description: 'Eccellenti per risotti e paste fresche.', benefits: 'Purificanti per i reni.' },
      { name: 'Zucchine con Fiore', category: 'Verdura', icon: '🥒', description: 'Fiori di zucca da friggere in pastella o fare al forno.', benefits: 'Leggere e idratanti.' },
      { name: 'Lattughino e Ravanelli', category: 'Verdura', icon: '🥗', description: 'Insalate croccanti e primaverili.', benefits: 'Stimolano la diuresi.' },
      { name: 'Fragole Profumate', category: 'Frutta', icon: '🍓', description: 'Dolcissime e succose.', benefits: 'Povere di zuccheri, ricche di C.' },
      { name: 'Nespole', category: 'Frutta', icon: '🟠', description: 'Dolciastri frutti di primavera.', benefits: 'Astringenti e rimineralizzanti.' },
      { name: 'Basilico Tenero', category: 'Erbe & Aromi', icon: '🌿', description: 'Prime foglioline profumate.', benefits: 'Proprietà antinfiammatorie.' }
    ]
  },
  // 4. MAGGIO
  {
    monthName: 'Maggio',
    season: 'Primavera',
    seasonIcon: '🌺',
    accentColor: 'text-rose-600 bg-rose-50 border-rose-200',
    description: 'Trionfo di ciliegie, fiori di zucca, fave e verdure a foglia tenera.',
    items: [
      { name: 'Ciliegie Sabina', category: 'Frutta', icon: '🍒', description: 'Rosse, croccanti e zuccherine.', benefits: 'Antinfiammatorie naturali per le articolazioni.' },
      { name: 'Fiori di Zucca', category: 'Verdura', icon: '🌼', description: 'Ripieni con mozzarella e alici o fritti.', benefits: 'Ricchi di Vitamina A.' },
      { name: 'Fave e Piselli', category: 'Verdura', icon: '🫛', description: 'Legumi freschi di stagione.', benefits: 'Forniscono energia pulita.' },
      { name: 'Zucchine Romanesche', category: 'Verdura', icon: '🥒', description: 'Costolute e dolci con fiore attorcigliato.', benefits: 'Facilmente digeribili.' },
      { name: 'Fragole e Nespole', category: 'Frutta', icon: '🍓', description: 'Frutti rossi e arancioni di maggio.', benefits: 'Idratazione quotidiana.' },
      { name: 'Origano e Maggiorana', category: 'Erbe & Aromi', icon: '🌿', description: 'Essenziali per sughi della Sabina.', benefits: 'Brevettato potere antibatterico.' }
    ]
  },
  // 5. GIUGNO
  {
    monthName: 'Giugno',
    season: 'Estate',
    seasonIcon: '☀️',
    accentColor: 'text-amber-600 bg-amber-50 border-amber-200',
    description: 'Inizio estate: pomodori da insalata, meloni profumati, albicocche e verdure estive.',
    items: [
      { name: 'Pomodori Casalini & San Marzano', category: 'Verdura', icon: '🍅', description: 'Profumati di sole per sughi caldi e insalate.', benefits: 'Ricchissimi di licopene anti-invecchiamento.' },
      { name: 'Peperoni Rossi e Gialli', category: 'Verdura', icon: '🫑', description: 'Perfetti per il pollo alla romana.', benefits: 'Più Vitamina C delle arance.' },
      { name: 'Melone Giallo e Cantalupo', category: 'Frutta', icon: '🍈', description: 'Abbinato al prosciutto crudo laziale.', benefits: 'Idratante e ricco di beta-carotene.' },
      { name: 'Albicocche e Pesche', category: 'Frutta', icon: '🍑', description: 'Frutti estivi vellutati.', benefits: 'Proteggono la pelle dal sole.' },
      { name: 'Melanzane', category: 'Verdura', icon: '🍆', description: 'Ideali per Parmigiane o grigliate.', benefits: 'Ricche di fibre sgonfianti.' },
      { name: 'Basilico Fresco', category: 'Erbe & Aromi', icon: '🌿', description: 'Il profumo dell\'estate italiana.', benefits: 'Calmante per lo stomaco.' }
    ]
  },
  // 6. LUGLIO
  {
    monthName: 'Luglio',
    season: 'Estate',
    seasonIcon: '🍉',
    accentColor: 'text-red-600 bg-red-50 border-red-200',
    description: 'Il picco del calore estivo: anguria, pomodori maturi, zucchine e frutti zuccherini.',
    items: [
      { name: 'Anguria (Cocomero)', category: 'Frutta', icon: '🍉', description: 'Dissetante e freschissima.', benefits: '92% di acqua e sali minerali.' },
      { name: 'Pomodori da Sugo Maturi', category: 'Verdura', icon: '🍅', description: 'Polpa dolce per passate fatte in casa.', benefits: 'Potente antiossidante.' },
      { name: 'Peperoni Dolci', category: 'Verdura', icon: '🫑', description: 'Super saporiti al forno o in padella.', benefits: 'Carica vitaminica completa.' },
      { name: 'Fichi di Luglio (Fichi primaticci)', category: 'Frutta', icon: '🍈', description: 'Squisiti con pizza bianca e prosciutto.', benefits: 'Fonte naturale di calcio e potassio.' },
      { name: 'Pesche e Susine', category: 'Frutta', icon: '🍑', description: 'Polpa succosa per dolci e merende.', benefits: 'Favoriscono la regolarità minerale.' },
      { name: 'Cetrioli Croccanti', category: 'Verdura', icon: '🥒', description: 'Rinfrescanti per insalate estive.', benefits: 'Zero calorie e reidratanti.' }
    ]
  },
  // 7. AGOSTO
  {
    monthName: 'Agosto',
    season: 'Estate',
    seasonIcon: '☀️',
    accentColor: 'text-orange-600 bg-orange-50 border-orange-200',
    description: 'Massima dolcezza per fichi, pomodori secchi, melanzane e basilico rigoglioso.',
    items: [
      { name: 'Fichi di Agosto', category: 'Frutta', icon: '🍈', description: 'Dolcissimi, ottimi da soli o con formaggi sabini.', benefits: 'Energia immediata e fibre.' },
      { name: 'Pomodori Cuore di Bue', category: 'Verdura', icon: '🍅', description: 'Polposi per la Panzanella o insalata caprese.', benefits: 'Ricchi di potassio.' },
      { name: 'Melanzane Viola', category: 'Verdura', icon: '🍆', description: 'Perfette per conserve sotto olio o grigliate.', benefits: 'Riducono il colesterolo.' },
      { name: 'Uva da Tavola (Primo raccolto)', category: 'Frutta', icon: '🍇', description: 'Chicchi dolci e croccanti.', benefits: 'Ricca di resveratrolo.' },
      { name: 'Fagiolini Verdi', category: 'Verdura', icon: '🫛', description: 'Lessati con olio EVO e aglio.', benefits: 'Leggeri e ricchi di acido folico.' },
      { name: 'Peperoncino Fresco', category: 'Erbe & Aromi', icon: '🌶️', description: 'Piccante per Amatriciana e Arrabbiata.', benefits: 'Stimola il metabolismo.' }
    ]
  },
  // 8. SETTEMBRE
  {
    monthName: 'Settembre',
    season: 'Autunno',
    seasonIcon: '🍁',
    accentColor: 'text-amber-700 bg-amber-50 border-amber-200',
    description: 'Vendemmia e primi fichi tardivi, funghi porcini e zucca mantovana.',
    items: [
      { name: 'Uva Sabina e da Tavola', category: 'Frutta', icon: '🍇', description: 'Simbolo della vendemmia nei castelli e in Sabina.', benefits: 'Disintossicante per la pelle.' },
      { name: 'Funghi Porcini', category: 'Verdura', icon: '🍄', description: 'Profumo di bosco per fettuccine e risotti.', benefits: 'Ricchi di selenio e vitamine B.' },
      { name: 'Zucca Mantovana / Violina', category: 'Verdura', icon: '🎃', description: 'Dolce per vellutate e gnocchi.', benefits: 'Povera di calorie e ricca di Vitamina A.' },
      { name: 'Fichi Settembrini', category: 'Frutta', icon: '🍈', description: 'I fichi più dolci dell\'anno.', benefits: 'Ricchi di ferro e calcio.' },
      { name: 'Pere e Prugne', category: 'Frutta', icon: '🍐', description: 'Croccanti e zuccherine.', benefits: 'Regolano la flora intestinale.' },
      { name: 'Rosmarino e Alloro', category: 'Erbe & Aromi', icon: '🌿', description: 'Perfetti per arrosti autunnali.', benefits: 'Tonici per l\'organismo.' }
    ]
  },
  // 9. OTTOBRE
  {
    monthName: 'Ottobre',
    season: 'Autunno',
    seasonIcon: '🍂',
    accentColor: 'text-yellow-700 bg-yellow-50 border-yellow-200',
    description: 'Raccolta delle olive per Olio EVO Sabina DOP novello, castagne e zucca.',
    items: [
      { name: 'Olio EVO Novello Sabina DOP', category: 'Specialità', icon: '🫒', description: 'L\'oro verde della Sabina appena spremuto, pizzichino e fruttato.', benefits: 'Il miglior antiossidante vascolare.' },
      { name: 'Castagne e Caldarroste', category: 'Frutta', icon: '🌰', description: 'Profumo di autunno e bosco.', benefits: 'Ricche di carboidrati complessi e minerale.' },
      { name: 'Zucca', category: 'Verdura', icon: '🎃', description: 'Cremosa per risotti e minestre.', benefits: 'Protettiva per le mucose.' },
      { name: 'Funghi e Tartufi', category: 'Verdura', icon: '🍄', description: 'Profumi boschivi intensi.', benefits: 'Stimolano il sistema immunitario.' },
      { name: 'Cachi', category: 'Frutta', icon: '🟠', description: 'Polpa dolcissima e morbida.', benefits: 'Ricarica energetica contro la stanchezza.' },
      { name: 'Melograno', category: 'Frutta', icon: '🍎', description: 'Chicchi rossi come rubini.', benefits: 'Uno dei più forti antiossidanti naturali.' }
    ]
  },
  // 10. NOVEMBRE
  {
    monthName: 'Novembre',
    season: 'Autunno',
    seasonIcon: '🍁',
    accentColor: 'text-[#191970] bg-[#191970]/5 border-[#191970]/20',
    description: 'Inizio del freddo: cavoli, broccoletti ripassati in padella e frutti invernali.',
    items: [
      { name: 'Broccoletti (Cime di Rapa)', category: 'Verdura', icon: '🥦', description: 'Ripassati in padella con aglio, olio ed alici.', benefits: 'Ricchi di ferro e calcio.' },
      { name: 'Zucca', category: 'Verdura', icon: '🎃', description: 'Base per zuppe calde e vellutate.', benefits: 'Rilassante per la digestione.' },
      { name: 'Cavolo Nero e Verza', category: 'Verdura', icon: '🥬', description: 'Essenziali per minestroni rinvigorenti.', benefits: 'Antitumorali ed antinfiammatori.' },
      { name: 'Castagne', category: 'Frutta', icon: '🌰', description: 'Ottime lesse con l\'alloro o arrostite.', benefits: 'Energia a lento rilascio.' },
      { name: 'Cachi e Mandarini', category: 'Frutta', icon: '🍊', description: 'Prime arance e frutti vitaminici.', benefits: 'Prevengono l\'influenza.' },
      { name: 'Finocchi', category: 'Verdura', icon: '🧅', description: 'Croccanti a crudo o gratinati.', benefits: 'Favoriscono la diuresi.' }
    ]
  },
  // 11. DICEMBRE
  {
    monthName: 'Dicembre',
    season: 'Inverno',
    seasonIcon: '❄️',
    accentColor: 'text-slate-800 bg-slate-100 border-slate-300',
    description: 'Feste di Natale: arance succose, carciofi primi raccolti e verdure da brodo.',
    items: [
      { name: 'Carciofi Romaneschi (Primi raccolti)', category: 'Verdura', icon: '🥬', description: 'Specialità natalizia laziale.', benefits: 'Aiutano la digestione nei pranzi delle feste.' },
      { name: 'Broccolo Romanesco', category: 'Verdura', icon: '🥦', description: 'Lessato o in pastella fritto per la vigilia.', benefits: 'Ricco di folati.' },
      { name: 'Cardi e Gobbi', category: 'Verdura', icon: '🥬', description: 'Tipici per parmigiane invernali.', benefits: 'Depurativi per il fegato.' },
      { name: 'Arance e Mandarini', category: 'Frutta', icon: '🍊', description: 'Stagione d\'oro degli agrumi.', benefits: 'Scudo immunitario.' },
      { name: 'Frutta Secca (Noci, Nocciole, Mandorle)', category: 'Frutta', icon: '🥜', description: 'Tradizione delle tavole natalizie.', benefits: 'Ricche di Omega-3 e grassi sani.' },
      { name: 'Salvia e Maggiorana', category: 'Erbe & Aromi', icon: '🌿', description: 'Profumi per tacchini e ripieni.', benefits: 'Proprietà balsamiche.' }
    ]
  }
];

export function getSeasonalDataForMonth(monthIndex?: number): MonthSeasonalData {
  const targetMonth = monthIndex !== undefined ? monthIndex : new Date().getMonth();
  const safeIdx = Math.max(0, Math.min(11, targetMonth));
  return MONTHLY_SEASONAL_PRODUCE[safeIdx];
}

/**
 * Infer dish course (Antipasti, Primi, Secondi, Contorni, Dolci) intelligently from recipe title/category.
 */
export function inferCourseFromRecipe(name: string, category?: string): DishCourse {
  const n = (name || '').toLowerCase().trim();

  // Antipasti
  if (
    n.includes('antipast') ||
    n.includes('bruschett') ||
    n.includes('suppl') ||
    n.includes('crostin') ||
    n.includes('tagliere') ||
    n.includes('frittin') ||
    n.includes('fiori di zucca') ||
    n.includes('prosciutto e melone')
  ) {
    return 'Antipasti';
  }

  // Primi
  if (
    n.includes('fregnacc') ||
    n.includes('spaghett') ||
    n.includes('penne') ||
    n.includes('rigaton') ||
    n.includes('carbonar') ||
    n.includes('amatrician') ||
    n.includes('pasta') ||
    n.includes('zuppa') ||
    n.includes('stracciatell') ||
    n.includes('minestra') ||
    n.includes('risotto') ||
    n.includes('gnocch') ||
    n.includes('lasagn') ||
    n.includes('cacio') ||
    n.includes('ravioli') ||
    n.includes('vellutata') ||
    n.includes('minestrone')
  ) {
    return 'Primi';
  }

  // Secondi
  if (
    n.includes('pollo') ||
    n.includes('abbacchio') ||
    n.includes('carne') ||
    n.includes('pesce') ||
    n.includes('polpett') ||
    n.includes('bistecca') ||
    n.includes('spezzatin') ||
    n.includes('saltimbocc') ||
    n.includes('trippa') ||
    n.includes('coda') ||
    n.includes('arrosto') ||
    n.includes('scaloppin') ||
    n.includes('maiale') ||
    n.includes('orata') ||
    n.includes('spigola') ||
    n.includes('tonno') ||
    n.includes('alici') ||
    n.includes('bocconcini') ||
    n.includes('frittata')
  ) {
    return 'Secondi';
  }

  // Contorni
  if (
    n.includes('insalata') ||
    n.includes('peperoni') ||
    n.includes('carciof') ||
    n.includes('puntarell') ||
    n.includes('patat') ||
    n.includes('zucchine') ||
    n.includes('verdura') ||
    n.includes('spinaci') ||
    n.includes('cicoria') ||
    n.includes('caponata') ||
    n.includes('broccoli') ||
    n.includes('funghi')
  ) {
    return 'Contorni';
  }

  // Dolci
  if (
    n.includes('dolce') ||
    n.includes('torta') ||
    n.includes('maritozzo') ||
    n.includes('crostata') ||
    n.includes('tiramisù') ||
    n.includes('tiramisu') ||
    n.includes('gelato') ||
    n.includes('ciambell') ||
    n.includes('biscott') ||
    n.includes('babbà') ||
    n.includes('crema') ||
    n.includes('cannol') ||
    n.includes('panna cotta') ||
    n.includes('tozzetti')
  ) {
    return 'Dolci';
  }

  return 'Primi';
}
