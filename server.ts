import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('Chiave API Gemini non trovata nell\'ambiente.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build'
      }
    }
  });
}

// Endpoint per auto-compilazione della ricetta tramite Gemini AI
app.post('/api/auto-fill-recipe', async (req, res) => {
  try {
    const { title } = req.body;
    if (!title || typeof title !== 'string' || !title.trim()) {
      return res.status(400).json({ error: 'Inserisci un titolo per la ricetta.' });
    }

    const ai = getGeminiClient();

    const prompt = `Sei uno chef esperto della tradizione culinaria italiana, Sabina e Laziale.
L'utente vuole aggiungere la ricetta intitolata: "${title.trim()}".

Compila in modo realistico, accurato ed esaustivo la scheda tecnica della ricetta per 4 persone:
1. category: 'Sabina', 'Lazio', 'Classica', oppure 'Altro'.
2. course: la tipologia di portata corretta tra esattamente una di queste 5 opzioni: 'Antipasti', 'Primi', 'Secondi', 'Contorni', 'Dolci'.
3. prepTimeMinutes: minuti totali di preparazione (numero intero, es. 25).
4. servings: numero di porzioni (default 4).
5. calories: stima chilocalorie per singola porzione (kcal, numero intero, es. 480).
6. protein: stima proteine per porzione in grammi (numero intero, es. 22).
7. fat: stima grassi per porzione in grammi (numero intero, es. 20).
8. carbs: stima carboidrati per porzione in grammi (numero intero, es. 55).
9. ingredients: lista di tutti gli ingredienti necessari per 4 porzioni. Per ciascuno specifica:
   - name: nome preciso dell'ingrediente in italiano
   - quantity: quantità (es. "150", "400", "2", "q.b.")
   - unit: unità di misura ("g", "ml", "spicchi", "cucchiai", "pz", "fette", "")
10. instructions: procedimento dettagliato passo-passo in italiano.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            category: {
              type: Type.STRING,
              description: 'Tradizione culinaria: Sabina, Lazio, Classica, Altro'
            },
            course: {
              type: Type.STRING,
              description: 'Portata del piatto: Antipasti, Primi, Secondi, Contorni, Dolci'
            },
            prepTimeMinutes: {
              type: Type.INTEGER,
              description: 'Minuti di preparazione'
            },
            servings: {
              type: Type.INTEGER,
              description: 'Porzioni'
            },
            calories: {
              type: Type.INTEGER,
              description: 'Calorie per porzione'
            },
            protein: {
              type: Type.INTEGER,
              description: 'Proteine in grammi'
            },
            fat: {
              type: Type.INTEGER,
              description: 'Grassi in grammi'
            },
            carbs: {
              type: Type.INTEGER,
              description: 'Carboidrati in grammi'
            },
            ingredients: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  quantity: { type: Type.STRING },
                  unit: { type: Type.STRING }
                },
                required: ['name', 'quantity', 'unit']
              }
            },
            instructions: {
              type: Type.STRING,
              description: 'Istruzioni passo-passo'
            }
          },
          required: [
            'category',
            'course',
            'prepTimeMinutes',
            'servings',
            'calories',
            'protein',
            'fat',
            'carbs',
            'ingredients',
            'instructions'
          ]
        }
      }
    });

    const jsonText = response.text || '{}';
    const parsed = JSON.parse(jsonText);

    return res.json({ success: true, data: parsed });
  } catch (error: any) {
    console.error('Errore auto-fill ricetta con Gemini:', error);
    return res.status(500).json({
      error: error?.message || 'Impossibile completare la compilazione automatica con l\'IA.'
    });
  }
});

// Endpoint per genera piatto a partire dagli ingredienti forniti dall'utente
app.post('/api/generate-dish-from-ingredients', async (req, res) => {
  try {
    const { ingredients } = req.body;
    let ingredientsList = '';
    if (Array.isArray(ingredients)) {
      ingredientsList = ingredients.map((i: any) => (typeof i === 'string' ? i : i.name)).filter(Boolean).join(', ');
    } else if (typeof ingredients === 'string') {
      ingredientsList = ingredients.trim();
    }

    if (!ingredientsList) {
      return res.status(400).json({ error: 'Inserisci almeno un ingrediente per generare il piatto.' });
    }

    const ai = getGeminiClient();

    const prompt = `Sei uno chef esperto della tradizione culinaria italiana, Sabina e Laziale.
L'utente ti ha fornito la seguente lista di ingredienti a disposizione:
"${ingredientsList}".

Crea una ricetta gustosa, bilanciata ed eccezionale per 4 persone basandoti su questi ingredienti (puoi aggiungere condimenti base come olio EVO, sale, pepe, aglio o cipolla se necessari).

Compila in formato JSON la scheda tecnica completa:
1. name: titolo accattivante e preciso del piatto
2. category: 'Sabina', 'Lazio', 'Classica', oppure 'Altro'
3. course: esattamente uno tra 'Antipasti', 'Primi', 'Secondi', 'Contorni', 'Dolci'
4. prepTimeMinutes: minuti totali di preparazione (numero intero)
5. servings: 4
6. calories: stima kcal per porzione (numero intero)
7. protein: stima proteine per porzione in grammi (numero intero)
8. fat: stima grassi per porzione in grammi (numero intero)
9. carbs: stima carboidrati per porzione in grammi (numero intero)
10. ingredients: lista di tutti gli ingredienti necessari con name, quantity, unit
11. instructions: procedimento dettagliato e chiaro passo-passo in italiano.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            category: { type: Type.STRING },
            course: { type: Type.STRING },
            prepTimeMinutes: { type: Type.INTEGER },
            servings: { type: Type.INTEGER },
            calories: { type: Type.INTEGER },
            protein: { type: Type.INTEGER },
            fat: { type: Type.INTEGER },
            carbs: { type: Type.INTEGER },
            ingredients: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  quantity: { type: Type.STRING },
                  unit: { type: Type.STRING }
                },
                required: ['name', 'quantity', 'unit']
              }
            },
            instructions: { type: Type.STRING }
          },
          required: [
            'name',
            'category',
            'course',
            'prepTimeMinutes',
            'servings',
            'calories',
            'protein',
            'fat',
            'carbs',
            'ingredients',
            'instructions'
          ]
        }
      }
    });

    const jsonText = response.text || '{}';
    const parsed = JSON.parse(jsonText);

    return res.json({ success: true, data: parsed });
  } catch (error: any) {
    console.error('Errore genera piatto da ingredienti con Gemini:', error);
    return res.status(500).json({
      error: error?.message || 'Impossibile generare la ricetta dagli ingredienti.'
    });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server EATIOF running on http://localhost:${PORT}`);
  });
}

startServer();
