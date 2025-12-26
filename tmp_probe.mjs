import { ModelRouter } from './packages/core/model-router.js';
(async ()=> {
  const m = new ModelRouter();
  console.log('hasApiProviders', m.hasApiProviders(), 'ollama', m.ollamaUrl);
  try {
    const r = await m.checkOllama();
    console.log('checkOllama', JSON.stringify(r));
  } catch (e) {
    console.error('checkOllama error', e && e.message ? e.message : e);
  }
})();
