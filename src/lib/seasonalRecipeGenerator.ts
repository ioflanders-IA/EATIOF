import { Recipe, DishCourse, CategoryType, PantryItem, Ingredient } from '../types';
import { SeasonalItem } from '../data/seasonalData';

export interface RecipeWithPantryCheck {
  recipe: Recipe;
  inPantryCount: number;
  toBuyCount: number;
  ingredientDetails: {
    ingredient: Ingredient;
    inPantry: boolean;
    pantryMatchName?: string;
  }[];
}

export function checkRecipePantryStatus(recipe: Recipe, pantryItems: PantryItem[]): RecipeWithPantryCheck {
  const details = recipe.ingredients.map((ing) => {
    const ingName = ing.name.toLowerCase().trim();
    const match = pantryItems.find((p) => {
      const pName = p.name.toLowerCase().trim();
      return pName.length > 2 && (pName.includes(ingName) || ingName.includes(pName));
    });
    return {
      ingredient: ing,
      inPantry: !!match,
      pantryMatchName: match?.name
    };
  });

  const inPantryCount = details.filter((d) => d.inPantry).length;
  const toBuyCount = details.length - inPantryCount;

  return {
    recipe,
    inPantryCount,
    toBuyCount,
    ingredientDetails: details
  };
}

export function generate5RecipesForSeasonalItem(
  item: SeasonalItem,
  monthName: string,
  pantryItems: PantryItem[] = []
): RecipeWithPantryCheck[] {
  const cleanName = item.name.replace(/\s*\(.*\)/, '').trim();
  const timestamp = Date.now();

  const baseRecipes: Recipe[] = [
    // 1. ANTIPASTO
    {
      id: `generated-anti-${timestamp}-1`,
      name: `Antipasto Sfizioso con ${cleanName} e Prosciutto Sabino`,
      category: 'Sabina',
      course: 'Antipasti',
      prepTimeMinutes: 15,
      servings: 4,
      nutrition: { calories: 310, protein: 18, fat: 15, carbs: 22 },
      ingredients: [
        { name: cleanName, quantity: '250', unit: 'g' },
        { name: 'Prosciutto Crudo della Sabina', quantity: '150', unit: 'g' },
        { name: 'Pane di Casa della Sabina', quantity: '200', unit: 'g' },
        { name: 'Olio EVO Sabina DOP', quantity: '2', unit: 'cucchiai' },
        { name: 'Primo Sale o Caciotta Sabina', quantity: '100', unit: 'g' }
      ],
      instructions: `1. Lava e taglia a fette delicate ${cleanName}.\n2. Tosta le fette di pane di casa della Sabina e condiscile con un filo di Olio EVO Sabina DOP.\n3. Disponi sul piatto di portata l'affettato di Prosciutto Crudo, la caciotta primo sale e accompagna con ${cleanName}.\n4. Servire fresco come antipasto tradizionale.`
    },
    // 2. PRIMO PIATTO
    {
      id: `generated-primo-${timestamp}-2`,
      name: `Primo Piatto Tradizionale con ${cleanName} e Pecorino`,
      category: 'Lazio',
      course: 'Primi',
      prepTimeMinutes: 20,
      servings: 4,
      nutrition: { calories: 480, protein: 16, fat: 14, carbs: 68 },
      ingredients: [
        { name: cleanName, quantity: '300', unit: 'g' },
        { name: 'Pasta Fresca (Tonnarelli o Mezze Maniche)', quantity: '350', unit: 'g' },
        { name: 'Pecorino Romano DOP', quantity: '80', unit: 'g' },
        { name: 'Guanciale di Amatrice', quantity: '100', unit: 'g' },
        { name: 'Olio EVO Sabina DOP', quantity: '2', unit: 'cucchiai' },
        { name: 'Pepe Nero macinato fresco', quantity: '1', unit: 'pizzico' }
      ],
      instructions: `1. In un tegame far rosolare il guanciale con un filo d'Olio EVO fino a renderlo croccante.\n2. Aggiungi ${cleanName} tagliato a pezzetti e lascia insaporire a fuoco dolce per 5 minuti.\n3. Cuoci la pasta fresca in abbondante acqua salata e scolala al dente tenendo un po' di acqua di cottura.\n4. Salta la pasta nel tegame con il condimento, manteca a fuoco spento con abbondante Pecorino Romano DOP e pepe nero.`
    },
    // 3. SECONDO PIATTO
    {
      id: `generated-secondo-${timestamp}-3`,
      name: `Secondo del Casale con ${cleanName} e Aromi Rustici`,
      category: 'Classica',
      course: 'Secondi',
      prepTimeMinutes: 30,
      servings: 4,
      nutrition: { calories: 420, protein: 32, fat: 22, carbs: 18 },
      ingredients: [
        { name: cleanName, quantity: '250', unit: 'g' },
        { name: 'Lombata di Maiale o Tagliata di Manzo', quantity: '600', unit: 'g' },
        { name: 'Vino Bianco della Sabina', quantity: '100', unit: 'ml' },
        { name: 'Rosmarino e Salvia freschi', quantity: '2', unit: 'rametti' },
        { name: 'Aglio', quantity: '2', unit: 'spicchi' },
        { name: 'Olio EVO Sabina DOP', quantity: '3', unit: 'cucchiai' }
      ],
      instructions: `1. In una padella capiente scalda l'Olio EVO con gli spicchi d'aglio incamiciati, il rosmarino e la salvia.\n2. Rosola la carne su entrambi i lati ad alta temperatura fino a doratura.\n3. Sfuma con il vino bianco della Sabina e sfuma l'alcol.\n4. Aggiungi ${cleanName} a tocchetti, copri e cuoci a fuoco basso per 10 minuti rendendo il fondo di cottura cremoso.`
    },
    // 4. CONTORNO
    {
      id: `generated-contorno-${timestamp}-4`,
      name: `Contorno di ${cleanName} Saltato all'Aglio e Erbe Sabine`,
      category: 'Sabina',
      course: 'Contorni',
      prepTimeMinutes: 15,
      servings: 4,
      nutrition: { calories: 160, protein: 4, fat: 8, carbs: 18 },
      ingredients: [
        { name: cleanName, quantity: '400', unit: 'g' },
        { name: 'Olio EVO Sabina DOP', quantity: '2', unit: 'cucchiai' },
        { name: 'Aglio', quantity: '2', unit: 'spicchi' },
        { name: 'Prezzemolo Fresco', quantity: '1', unit: 'mazzetto' },
        { name: 'Succo di Limone o Aceto di Vino', quantity: '1', unit: 'cchiaio' },
        { name: 'Sale e Pepe', quantity: '1', unit: 'pizzico' }
      ],
      instructions: `1. Pulisci accuratamente ${cleanName} e taglialo a spicchi o tocchetti uguali.\n2. In padella scalda l'Olio EVO con l'aglio schiacciato.\n3. Unisci ${cleanName} e salta a fuoco vivo per 8-10 minuti mantenendo il prodotto croccante e saporito.\n4. Completa con prezzemolo fresco tritato e un goccio di limone o aceto prima di servire.`
    },
    // 5. DOLCE O SPECIALITÀ
    {
      id: `generated-dolce-${timestamp}-5`,
      name: `Crostata o Dessert di Stagione con ${cleanName} e Miele Sabino`,
      category: 'Sabina',
      course: 'Dolci',
      prepTimeMinutes: 35,
      servings: 6,
      nutrition: { calories: 380, protein: 6, fat: 14, carbs: 58 },
      ingredients: [
        { name: cleanName, quantity: '350', unit: 'g' },
        { name: 'Farina 00', quantity: '250', unit: 'g' },
        { name: 'Burro ammorbidito', quantity: '100', unit: 'g' },
        { name: 'Zucchero', quantity: '80', unit: 'g' },
        { name: 'Uova feschissime', quantity: '2', unit: 'pz' },
        { name: 'Miele di Castagno Sabino', quantity: '3', unit: 'cucchiai' },
        { name: 'Scorza di Limone grattugiata', quantity: '1', unit: 'pz' }
      ],
      instructions: `1. Prepara la pasta frolla impastando velocemente farina, burro, zucchero, uova e scorza di limone.\n2. Fodera una teglia da crostata e bucherella il fondo.\n3. Disponi abbondante ${cleanName} tagliato e versa sopra a filo il miele di castagno della Sabina.\n4. Cuoci in forno preriscaldato a 180°C per circa 30 minuti fino a doratura dorata.`
    }
  ];

  return baseRecipes.map((r) => checkRecipePantryStatus(r, pantryItems));
}
