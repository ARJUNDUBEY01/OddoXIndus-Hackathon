import { createClient } from '@supabase/supabase-js';
import { pipeline } from '@xenova/transformers';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

class EmbeddingPipeline {
  static task = 'feature-extraction';
  static model = 'Xenova/all-MiniLM-L6-v2';
  static instance = null;

  static async getInstance() {
    if (this.instance === null) {
      this.instance = pipeline(this.task, this.model);
    }
    return this.instance;
  }
}

async function generateEmbedding(text) {
  const embedder = await EmbeddingPipeline.getInstance();
  const output = await embedder(text, { pooling: 'mean', normalize: true });
  return Array.from(output.data);
}

async function syncProducts() {
  console.log('Fetching products from database...');
  const { data: products, error } = await supabase.from('products').select('*');
  if (error) throw error;
  
  if (!products || products.length === 0) {
    console.log('No products found.');
    return;
  }

  console.log(`Generating embeddings for ${products.length} products...`);
  
  // Clear old product knowledge to avoid duplicates
  await supabase.from('inventory_knowledge').delete().eq('content_type', 'product');

  let processed = 0;
  for (const p of products) {
    const content = `Product ${p.name} (SKU: ${p.sku}) is in the ${p.category} category. We currently have ${p.stock} units in stock located in the ${p.warehouse} warehouse. The reorder alert level is set at ${p.reorder_level} units. Data recorded at ${p.created_at}.`;
    
    // Convert text to exactly what the vector search understands
    const embedding = await generateEmbedding(content);
    
    await supabase.from('inventory_knowledge').insert({
      content_type: 'product',
      content: content,
      embedding: embedding
    });
    
    processed++;
    process.stdout.write(`\rProcessed ${processed}/${products.length}`);
  }
  
  console.log('\nKnowledge Sync Complete!');
}

syncProducts().catch(console.error);
