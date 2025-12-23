import fetch from 'node-fetch';

async function testOllama() {
    const url = 'http://localhost:11434/api/generate';
    const body = {
        model: 'deepseek-r1:1.5b',
        prompt: 'Say "Ollama is working" concisely.',
        stream: false
    };

    console.log(`Connecting to ${url}...`);
    console.log(`Model: ${body.model}`);

    try {
        const start = Date.now();
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        const duration = Date.now() - start;
        console.log(`Response status: ${response.status} (${response.statusText})`);
        console.log(`Duration: ${duration}ms`);

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`Ollama Error Body: ${errorText}`);
            return;
        }

        const data = await response.json();
        console.log('Success! Response:', data.response);
    } catch (error) {
        console.error('Fetch caught error:');
        console.error('Name:', error.name);
        console.error('Message:', error.message);
        console.error('Code:', error.code);
        if (error.stack) console.error('Stack:', error.stack);
    }
}

testOllama().catch(console.error);
