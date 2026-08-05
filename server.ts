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
2. prepTimeMinutes: minuti totali di preparazione (numero intero, es. 25).
3. servings: numero di porzioni (default 4).
4. calories: stima chilocalorie per singola porzione (kcal, numero intero, es. 480).
5. protein: stima proteine per porzione in grammi (numero intero, es. 22).
6. fat: stima grassi per porzione in grammi (numero intero, es. 20).
7. carbs: stima carboidrati per porzione in grammi (numero intero, es. 55).
8. ingredients: lista di tutti gli ingredienti necessari per 4 porzioni. Per ciascuno specifica:
   - name: nome preciso dell'ingrediente in italiano
   - quantity: quantità (es. "150", "400", "2", "q.b.")
   - unit: unità di misura ("g", "ml", "spicchi", "cucchiai", "pz", "fette", "")
9. instructions: procedimento dettagliato passo-passo in italiano.`;

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
              description: 'Categoria della ricetta: Sabina, Lazio, Classica, Altro'
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
