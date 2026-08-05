import { UserProfile, Recipe, WeeklyMenuItem, ShoppingListItem, PantryItem, DayOfWeek } from '../types';

export const USER_PROFILES: UserProfile[] = [
  {
    id: 'planner',
    name: 'Io (Planner)',
    title: 'Pianificatore Pasti',
    avatar: 'planner',
    color: 'from-[#f37021] to-[#d95d13]',
    badgeBg: 'bg-[#f37021]/10 text-[#f37021] border-[#f37021]/30',
    description: 'Scegli le ricette per pranzi e cene e genera la lista spesa della settimana.'
  },
  {
    id: 'chef',
    name: 'Madre (Chef)',
    title: 'Chef di Casa',
    avatar: 'chef',
    color: 'from-[#191970] to-[#0f0f4a]',
    badgeBg: 'bg-[#191970]/10 text-[#191970] border-[#191970]/30',
    description: 'Consulta cosa cucinare oggi a pranzo e cena con ingredienti e istruzioni chiare.'
  },
  {
    id: 'shopper',
    name: 'Padre (Shopper)',
    title: 'Spesa al Supermercato',
    avatar: 'shopper',
    color: 'from-[#f37021] to-[#191970]',
    badgeBg: 'bg-[#f37021]/10 text-[#f37021] border-[#f37021]/30',
    description: 'Lista della spesa dinamica in tempo reale con grandi spunte per il supermercato.'
  },
  {
    id: 'pantry',
    name: 'Frigorifero & Dispensa',
    title: 'Giacenze di Casa',
    avatar: 'pantry',
    color: 'from-[#10b981] to-[#047857]',
    badgeBg: 'bg-[#10b981]/10 text-[#10b981] border-[#10b981]/30',
    description: 'Catalogazione alimenti già in casa per confrontare la spesa ed evitare acquisti doppi.'
  }
];

export const INITIAL_RECIPES: Recipe[] = [
  {
    id: 'recipe-1',
    name: 'Fregnacce alla sabina',
    category: 'Sabina',
    prepTimeMinutes: 30,
    servings: 4,
    nutrition: { calories: 480, protein: 16, fat: 18, carbs: 62 },
    ingredients: [
      { name: 'Fregnacce (Pasta fresca)', quantity: 400, unit: 'g' },
      { name: 'Pomodori pelati', quantity: 400, unit: 'g' },
      { name: 'Maggiorana fresca', quantity: 1, unit: 'mazzetto' },
      { name: 'Aglio', quantity: 2, unit: 'spicchi' },
      { name: 'Olio EVO Sabina DOP', quantity: 4, unit: 'cucchiai' },
      { name: 'Peperoncino', quantity: 1, unit: 'pizzico' },
      { name: 'Pecorino Sabino', quantity: 80, unit: 'g' }
    ],
    instructions: '1. Preparare il soffritto con olio EVO, aglio schiacciato e un pizzico di peperoncino in un tegame ampio.\n2. Aggiungere i pomodori pelati sfilacciati a mano e le foglie di maggiorana fresca.\n3. Cuocere il sugo a fuoco lento per circa 15-20 minuti finché si insaporisce.\n4. Lessare le fregnacce in abbondante acqua salata (bastano 3-4 minuti se fresche).\n5. Scolare la pasta e saltarla direttamente nel tegame col sugo della Sabina, spolverando con generoso Pecorino Sabino grattugiato.'
  },
  {
    id: 'recipe-2',
    name: "Spaghetti all'Amatriciana",
    category: 'Lazio',
    prepTimeMinutes: 25,
    servings: 4,
    nutrition: { calories: 620, protein: 22, fat: 26, carbs: 74 },
    ingredients: [
      { name: 'Spaghetti', quantity: 400, unit: 'g' },
      { name: 'Guanciale', quantity: 150, unit: 'g' },
      { name: 'Pomodori San Marzano pelati', quantity: 400, unit: 'g' },
      { name: 'Pecorino Romano DOP', quantity: 80, unit: 'g' },
      { name: 'Vino bianco secco', quantity: 50, unit: 'ml' },
      { name: 'Peperoncino fresco', quantity: 1, unit: 'pezzetto' }
    ],
    instructions: '1. Tagliare il guanciale a listarelle di circa 1 cm di spessore.\n2. Rosolare il guanciale in padella a fuoco basso senza aggiungere olio, fino a renderlo croccante e dorato.\n3. Sfumare con il vino bianco, quindi togliere metà del guanciale dalla padella e tenerlo da parte in caldo.\n4. Unire i pomodori pelati schiacciati nella padella col grasso sciolto e il peperoncino; cuocere per 10-15 minuti.\n5. Cuocere gli spaghetti molto al dente, versarli nel sugo con la parte di guanciale tenuta da parte, spegnere il fuoco e mantecare con il Pecorino Romano grattugiato.'
  },
  {
    id: 'recipe-3',
    name: 'Pollo alla romana con i peperoni',
    category: 'Lazio',
    prepTimeMinutes: 50,
    servings: 4,
    nutrition: { calories: 420, protein: 45, fat: 22, carbs: 12 },
    ingredients: [
      { name: 'Pollo a pezzi', quantity: 1000, unit: 'g' },
      { name: 'Peperoni rossi e gialli', quantity: 3, unit: 'pz' },
      { name: 'Pomodori maturi', quantity: 300, unit: 'g' },
      { name: 'Vino bianco secco', quantity: 100, unit: 'ml' },
      { name: 'Aglio', quantity: 2, unit: 'spicchi' },
      { name: 'Olio EVO', quantity: 4, unit: 'cucchiai' }
    ],
    instructions: '1. In una capiente casseruola far rosolare i pezzi di pollo nell\'olio con l\'aglio fino a quando saranno ben dorati su tutti i lati.\n2. Sfumare col vino bianco e lasciar evaporare l\'alcol a fiamma vivace.\n3. Aggiungere i pomodori spellati e a pezzetti.\n4. Unire i peperoni precedentemente puliti e tagliati a falde o striscioline.\n5. Coprire e cuocere a fuoco dolce per circa 40 minuti, mescolando di tanto in tanto finché il pollo è tenerissimo e i peperoni sono morbidi e saporiti.'
  },
  {
    id: 'recipe-4',
    name: 'Abbacchio a scottadito',
    category: 'Sabina',
    prepTimeMinutes: 20,
    servings: 4,
    nutrition: { calories: 510, protein: 42, fat: 36, carbs: 2 },
    ingredients: [
      { name: 'Costine di abbacchio', quantity: 800, unit: 'g' },
      { name: 'Rosmarino fresco', quantity: 2, unit: 'rametti' },
      { name: 'Aglio', quantity: 2, unit: 'spicchi' },
      { name: 'Limone', quantity: 1, unit: 'pz' },
      { name: 'Olio EVO Sabina DOP', quantity: 4, unit: 'cucchiai' },
      { name: 'Sale e pepe nero', quantity: 1, unit: 'q.b.' }
    ],
    instructions: '1. Appiattire leggermente le costolette di abbacchio col batticarne.\n2. Disporle in un pirofila e marinarle per 30 minuti con olio EVO, aglio tritato fine, aghi di rosmarino, sale, pepe e scorza di limone.\n3. Scaldare benissimo una piastra in ghisa o la griglia sul fuoco.\n4. Grigliare l\'abbacchio 2-3 minuti per lato a fiamma viva finché si forma una crosticina ben dorata.\n5. Servire subito bollentissime accompagnate da spicchi di limone fresco (da mangiare rigorosamente con le mani!).'
  },
  {
    id: 'recipe-5',
    name: 'Stracciatella alla romana (zuppa)',
    category: 'Lazio',
    prepTimeMinutes: 15,
    servings: 4,
    nutrition: { calories: 240, protein: 18, fat: 16, carbs: 6 },
    ingredients: [
      { name: 'Brodo di carne (o cappone)', quantity: 1, unit: 'L' },
      { name: 'Uova fresche', quantity: 4, unit: 'pz' },
      { name: 'Parmigiano Reggiano grattugiato', quantity: 80, unit: 'g' },
      { name: 'Noce moscata', quantity: 1, unit: 'pizzico' },
      { name: 'Scorza di limone bio', quantity: 1, unit: 'cucchiaino' },
      { name: 'Prezzemolo tritato', quantity: 1, unit: 'cucchiaio' }
    ],
    instructions: '1. In una ciotola sbattere bene le uova insieme al Parmigiano grattugiato, alla noce moscata, alla scorza di limone e un pizzico di sale.\n2. Portare a bollore il brodo di carne filtrato in una pentola.\n3. Versare il composto di uova direttamente nel brodo bollente e iniziare immediatamente a mescolare energicamente con una frusta a mano.\n4. Lasciar cuocere a fiamma media per circa 2-3 minuti finché si formano i classici e soffici fiocchi "stracciati".\n5. Servire la zuppa caldissima spolverata con prezzemolo fresco tritato.'
  },
  {
    id: 'recipe-6',
    name: 'Carbonara',
    category: 'Lazio',
    prepTimeMinutes: 20,
    servings: 4,
    nutrition: { calories: 680, protein: 26, fat: 32, carbs: 72 },
    ingredients: [
      { name: 'Rigatoni o Spaghetti', quantity: 400, unit: 'g' },
      { name: 'Guanciale', quantity: 150, unit: 'g' },
      { name: 'Tuorli d\'uovo', quantity: 4, unit: 'pz' },
      { name: 'Pecorino Romano DOP', quantity: 100, unit: 'g' },
      { name: 'Pepe nero in grani', quantity: 1, unit: 'q.b.' }
    ],
    instructions: '1. Rosolare il guanciale a fettine in padella finché il grasso diventa trasparente e la carne croccante.\n2. In una ciotola mescolare i tuorli d\'uovo con la maggior parte del Pecorino grattugiato e abbondante pepe nero macinato al momento.\n3. Cuocere la pasta in acqua moderatamente salata e scolarla al dente, tenendo da parte un mestolo di acqua di cottura.\n4. Versare la pasta nella padella col guanciale tiepido, poi togliere dal fuoco e unire la crema di tuorli e pecorino.\n5. Mescolare velocemente aggiungendo poca acqua di cottura per creare una cremosità vellutata senza grumi di uovo.'
  },
  {
    id: 'recipe-7',
    name: 'Pasta al pomodoro (Classica)',
    category: 'Classica',
    prepTimeMinutes: 15,
    servings: 4,
    nutrition: { calories: 390, protein: 12, fat: 9, carbs: 66 },
    ingredients: [
      { name: 'Pasta (Penne o Spaghetti)', quantity: 400, unit: 'g' },
      { name: 'Passata di pomodoro', quantity: 500, unit: 'g' },
      { name: 'Basilico fresco', quantity: 6, unit: 'foglie' },
      { name: 'Aglio', quantity: 1, unit: 'spicchio' },
      { name: 'Olio EVO', quantity: 3, unit: 'cucchiai' }
    ],
    instructions: '1. In una casseruola imbiondire lo spicchio d\'aglio nell\'olio EVO.\n2. Aggiungere la passata di pomodoro e le foglie di basilico.\n3. Salare e lasciar cuocere a fuoco dolce per 15 minuti.\n4. Cuocere la pasta al dente, scolarla e saltarla nel sugo.\n5. Servire calda con foglioline di basilico fresco e formaggio grattugiato a piacere.'
  },
  {
    id: 'recipe-8',
    name: 'Petto di pollo ai ferri con insalata (Classica)',
    category: 'Classica',
    prepTimeMinutes: 15,
    servings: 4,
    nutrition: { calories: 280, protein: 40, fat: 10, carbs: 8 },
    ingredients: [
      { name: 'Petto di pollo a fette', quantity: 600, unit: 'g' },
      { name: 'Insalata mista', quantity: 200, unit: 'g' },
      { name: 'Pomodori da insalata', quantity: 2, unit: 'pz' },
      { name: 'Olio EVO', quantity: 3, unit: 'cucchiai' },
      { name: 'Limone', quantity: 1, unit: 'pz' },
      { name: 'Origano e sale', quantity: 1, unit: 'q.b.' }
    ],
    instructions: '1. Scaldare molto bene una bistecchiera o piastra antiaderente.\n2. Adagiare le fette di petto di pollo e cuocere 3-4 minuti per lato spolverando con origano e un pizzico di sale.\n3. Preparare l\'insalata lavando le foglie miste e affettando i pomodori.\n4. Condire l\'insalata con olio EVO, sale e succo di limone fresco.\n5. Servire il pollo ben caldo affiancato dall\'insalata croccante.'
  }
];

export const DAYS_OF_WEEK: DayOfWeek[] = [
  'Lunedì',
  'Martedì',
  'Mercoledì',
  'Giovedì',
  'Venerdì',
  'Sabato',
  'Domenica'
];

export const INITIAL_WEEKLY_MENU: WeeklyMenuItem[] = [
  { id: 'menu-1', day: 'Lunedì', mealType: 'lunch', recipeId: 'recipe-1', recipeName: 'Fregnacce alla sabina' },
  { id: 'menu-2', day: 'Lunedì', mealType: 'dinner', recipeId: 'recipe-8', recipeName: 'Petto di pollo ai ferri con insalata (Classica)' },
  { id: 'menu-3', day: 'Martedì', mealType: 'lunch', recipeId: 'recipe-6', recipeName: 'Carbonara' },
  { id: 'menu-4', day: 'Martedì', mealType: 'dinner', recipeId: 'recipe-5', recipeName: 'Stracciatella alla romana (zuppa)' },
  { id: 'menu-5', day: 'Mercoledì', mealType: 'lunch', recipeId: 'recipe-2', recipeName: "Spaghetti all'Amatriciana" },
  { id: 'menu-6', day: 'Mercoledì', mealType: 'dinner', recipeId: 'recipe-3', recipeName: 'Pollo alla romana con i peperoni' },
  { id: 'menu-7', day: 'Giovedì', mealType: 'lunch', recipeId: 'recipe-7', recipeName: 'Pasta al pomodoro (Classica)' },
  { id: 'menu-8', day: 'Giovedì', mealType: 'dinner', recipeId: 'recipe-4', recipeName: 'Abbacchio a scottadito' },
  { id: 'menu-9', day: 'Venerdì', mealType: 'lunch', recipeId: 'recipe-1', recipeName: 'Fregnacce alla sabina' },
  { id: 'menu-10', day: 'Venerdì', mealType: 'dinner', recipeId: 'recipe-8', recipeName: 'Petto di pollo ai ferri con insalata (Classica)' },
  { id: 'menu-11', day: 'Sabato', mealType: 'lunch', recipeId: 'recipe-2', recipeName: "Spaghetti all'Amatriciana" },
  { id: 'menu-12', day: 'Sabato', mealType: 'dinner', recipeId: 'recipe-3', recipeName: 'Pollo alla romana con i peperoni' },
  { id: 'menu-13', day: 'Domenica', mealType: 'lunch', recipeId: 'recipe-6', recipeName: 'Carbonara' },
  { id: 'menu-14', day: 'Domenica', mealType: 'dinner', recipeId: 'recipe-4', recipeName: 'Abbacchio a scottadito' }
];

export const INITIAL_SHOPPING_LIST: ShoppingListItem[] = [
  { id: 'shop-1', ingredientName: 'Fregnacce (Pasta fresca)', quantity: 800, unit: 'g', isChecked: false, recipeSources: ['Fregnacce alla sabina'] },
  { id: 'shop-2', ingredientName: 'Pomodori pelati', quantity: 800, unit: 'g', isChecked: false, recipeSources: ['Fregnacce alla sabina'] },
  { id: 'shop-3', ingredientName: 'Pecorino Sabino', quantity: 160, unit: 'g', isChecked: false, recipeSources: ['Fregnacce alla sabina'] },
  { id: 'shop-4', ingredientName: 'Spaghetti', quantity: 800, unit: 'g', isChecked: false, recipeSources: ["Spaghetti all'Amatriciana"] },
  { id: 'shop-5', ingredientName: 'Guanciale', quantity: 450, unit: 'g', isChecked: true, recipeSources: ["Spaghetti all'Amatriciana", "Carbonara"] },
  { id: 'shop-6', ingredientName: 'Pecorino Romano DOP', quantity: 260, unit: 'g', isChecked: false, recipeSources: ["Spaghetti all'Amatriciana", "Carbonara"] },
  { id: 'shop-7', ingredientName: 'Pollo a pezzi', quantity: 2000, unit: 'g', isChecked: false, recipeSources: ['Pollo alla romana con i peperoni'] },
  { id: 'shop-8', ingredientName: 'Peperoni rossi e gialli', quantity: 6, unit: 'pz', isChecked: false, recipeSources: ['Pollo alla romana con i peperoni'] },
  { id: 'shop-9', ingredientName: 'Costine di abbacchio', quantity: 1600, unit: 'g', isChecked: false, recipeSources: ['Abbacchio a scottadito'] },
  { id: 'shop-10', ingredientName: 'Petto di pollo a fette', quantity: 1200, unit: 'g', isChecked: true, recipeSources: ['Petto di pollo ai ferri con insalata'] },
  { id: 'shop-11', ingredientName: 'Pane casareccio di Genzano', quantity: 2, unit: 'pagnotte', isChecked: false, addedManually: true }
];

export const INITIAL_PANTRY_ITEMS: PantryItem[] = [
  { id: 'pantry-1', name: 'Olio EVO Sabina DOP', quantity: 2, unit: 'bottiglie', category: 'Dispensa', notes: 'Olio extravergine locale' },
  { id: 'pantry-2', name: 'Pecorino Romano DOP', quantity: 300, unit: 'g', category: 'Frigo', notes: 'Stagionato per paste' },
  { id: 'pantry-3', name: 'Aglio', quantity: 1, unit: 'treccia', category: 'Dispensa' },
  { id: 'pantry-4', name: 'Uova fresche', quantity: 12, unit: 'pz', category: 'Frigo', notes: 'Per Carbonara e Stracciatella' },
  { id: 'pantry-5', name: 'Guanciale', quantity: 250, unit: 'g', category: 'Frigo', notes: 'Tagliato a stecche' },
  { id: 'pantry-6', name: 'Passata di pomodoro', quantity: 3, unit: 'bottiglie', category: 'Dispensa' },
  { id: 'pantry-7', name: 'Spaghetti', quantity: 1000, unit: 'g', category: 'Dispensa' },
  { id: 'pantry-8', name: 'Sale fino e grosso', quantity: 2, unit: 'pacchi', category: 'Dispensa' },
  { id: 'pantry-9', name: 'Parmigiano Reggiano', quantity: 200, unit: 'g', category: 'Frigo' }
];
