import { pipeline, env } from '@xenova/transformers';

// Tell Transformers.js to ignore local URLs to prevent Vite from returning the fallback index.html
env.allowLocalModels = false;
env.useBrowserCache = true;

// CRITICAL VITE FIX: Tell the ONNX WebAssembly runtime to fetch its .wasm engine files from a remote CDN
// instead of the local server, which causes Vite to return the index.html fallback (Unexpected token <)
env.backends.onnx.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.14.0/dist/';

// Explicitly set the custom remote CDN to skip any local resolution errors
env.remoteHost = 'https://huggingface.co';
env.remotePathTemplate = '{model}/resolve/{revision}/';

class EmbeddingPipeline {
  static task = 'feature-extraction';
  static model = 'Xenova/all-MiniLM-L6-v2';
  static instance = null;

  static async getInstance(progress_callback = null) {
    if (this.instance === null) {
      this.instance = pipeline(this.task, this.model, { progress_callback });
    }
    return this.instance;
  }
}

/**
 * Generate an embedding vector for a given text.
 * @param {string} text - The input text to embed.
 * @returns {Promise<number[]>} - A 384-dimensional array.
 */
export async function generateEmbedding(text) {
  const embedder = await EmbeddingPipeline.getInstance();
  const output = await embedder(text, { pooling: 'mean', normalize: true });
  return Array.from(output.data);
}
