import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import { pipeline, env } from '@xenova/transformers';
import Groq from 'groq-sdk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

env.allowLocalModels = false;
env.useBrowserCache = false;
env.remoteHost = 'https://huggingface.co';
env.remotePathTemplate = '{model}/resolve/{revision}/';

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
const groq = new Groq({ apiKey: process.env.VITE_GROQ_API_KEY });

async function testRAG() {
  try {
    console.log("1. Generating Embedding...");
    const embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2');
    const output = await embedder("How many total orders do we have?", { pooling: 'mean', normalize: true });
    const queryEmbedding = Array.from(output.data);
    console.log("Embedding generated. Length:", queryEmbedding.length);

    console.log("2. Searching Supabase Vector DB...");
    const { data: documents, error } = await supabase.rpc('match_knowledge', {
      query_embedding: queryEmbedding,
      match_threshold: 0.1,
      match_count: 5
    });
    if (error) throw error;
    console.log(`Found ${documents.length} matching documents.`);
    
    const contextText = documents.map(d => `- ${d.content}`).join('\n');
    console.log("Context:", contextText);

    console.log("3. Calling Groq...");
    const completion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: `Context:\n${contextText}` },
        { role: 'user', content: 'How many total orders do we have?' }
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.3
    });
    
    console.log("Groq Reply:", completion.choices[0]?.message?.content);
    console.log("TEST SUCCESSFUL");
  } catch (err) {
    console.error("TEST FAILED:", err);
  }
}

testRAG();
