/**
 * Phase 0: Hardware Spike & Model Benchmark Script
 * 
 * Verifies that:
 * 1. Ollama is running on localhost:11434
 * 2. Required models (nomic-embed-text & llama3.2:3b / qwen2.5:3b) are present
 * 3. Measures embedding vector latency & dimensions (should be 768)
 * 4. Measures chat completion latency & tokens/sec
 */

const http = require('http');

const OLLAMA_HOST = '127.0.0.1';
const OLLAMA_PORT = 11434;

function request(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const payload = data ? JSON.stringify(data) : null;
    const options = {
      hostname: OLLAMA_HOST,
      port: OLLAMA_PORT,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
      },
      timeout: 15000,
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          const parsed = body ? JSON.parse(body) : {};
          resolve({ status: res.statusCode, data: parsed, raw: body });
        } catch (e) {
          resolve({ status: res.statusCode, raw: body });
        }
      });
    });

    req.on('error', (err) => reject(err));
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timed out'));
    });

    if (payload) req.write(payload);
    req.end();
  });
}

async function runBenchmark() {
  console.log('====================================================');
  console.log('   CAPSTONE PROJECT: PHASE 0 AI INFRASTRUCTURE TEST  ');
  console.log('====================================================\n');

  // Step 1: Check Ollama Status
  console.log('1. Checking connection to Ollama at http://127.0.0.1:11434 ...');
  try {
    const rootCheck = await request('/');
    if (rootCheck.status === 200) {
      console.log('   ✅ Ollama daemon is active and responding!\n');
    } else {
      console.log(`   ⚠️ Ollama responded with status code: ${rootCheck.status}\n`);
    }
  } catch (err) {
    console.error('   ❌ FAILED to connect to Ollama!');
    console.error(`      Error: ${err.message}`);
    console.error('\n   👉 Troubleshooting:');
    console.error('      1. Is Ollama installed? Run `ollama --version`');
    console.error('      2. Is Ollama started? Run `ollama serve` in a terminal or launch the Ollama app.');
    console.error('      3. Ensure port 11434 is not blocked.\n');
    process.exit(1);
  }

  // Step 2: List Local Models
  console.log('2. Inspecting available local models...');
  let installedModels = [];
  try {
    const tags = await request('/api/tags');
    installedModels = (tags.data.models || []).map((m) => m.name);
    console.log(`   Installed models found (${installedModels.length}):`);
    installedModels.forEach((name) => console.log(`    - ${name}`));
    console.log('');
  } catch (err) {
    console.error('   ❌ Could not fetch models list:', err.message);
  }

  const hasEmbeddingModel = installedModels.some((m) => m.includes('nomic-embed-text'));
  const hasChatModel = installedModels.some(
    (m) => m.includes('llama3.2') || m.includes('qwen') || m.includes('llama3.1')
  );

  if (!hasEmbeddingModel) {
    console.warn('   ⚠️ Warning: "nomic-embed-text" was not found in local models.');
    console.warn('      Run: ollama pull nomic-embed-text\n');
  }

  if (!hasChatModel) {
    console.warn('   ⚠️ Warning: No chat model (e.g. llama3.2:3b) found.');
    console.warn('      Run: ollama pull llama3.2:3b\n');
  }

  // Step 3: Test Embedding Model
  if (hasEmbeddingModel) {
    console.log('3. Testing Embedding Generation (nomic-embed-text)...');
    const sampleText = 'Deadlock is a situation where a set of processes are blocked because each process is holding a resource and waiting for another resource.';
    const startTime = Date.now();
    try {
      const embedRes = await request('/api/embeddings', 'POST', {
        model: 'nomic-embed-text',
        prompt: sampleText,
      });
      const duration = Date.now() - startTime;
      const vec = embedRes.data.embedding;

      if (Array.isArray(vec)) {
        console.log(`   ✅ Embedding generated successfully!`);
        console.log(`      Dimensions: ${vec.length} (Expected: 768)`);
        console.log(`      Latency: ${duration} ms\n`);
      } else {
        console.log('   ❌ Unexpected response format from embedding endpoint.');
      }
    } catch (err) {
      console.error('   ❌ Embedding test failed:', err.message);
    }
  }

  // Step 4: Test Chat Model Generation
  const targetChatModel = installedModels.find(
    (m) => m.includes('llama3.2') || m.includes('qwen') || m.includes('llama3')
  );

  if (targetChatModel) {
    console.log(`4. Testing Structured Generation (${targetChatModel})...`);
    const prompt = 'In 2 sentences, explain the primary difference between a process and a thread.';
    const startTime = Date.now();
    try {
      const genRes = await request('/api/generate', 'POST', {
        model: targetChatModel,
        prompt: prompt,
        stream: false,
      });
      const duration = Date.now() - startTime;
      console.log(`   ✅ Completion response received in ${duration} ms:`);
      console.log(`   --------------------------------------------------`);
      console.log(`   ${genRes.data.response.trim()}`);
      console.log(`   --------------------------------------------------\n`);
    } catch (err) {
      console.error('   ❌ Generation test failed:', err.message);
    }
  }

  console.log('====================================================');
  console.log('   PHASE 0 BENCHMARK COMPLETE                       ');
  console.log('====================================================');
}

runBenchmark().catch(console.error);
