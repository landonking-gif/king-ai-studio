import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config();

async function testGemini() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.error('No GEMINI_API_KEY found in .env');
        return;
    }

    const model = 'gemini-2.0-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    console.log(`Connecting to Gemini (${model})...`);

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: 'Say "Gemini is working" concisely.' }] }]
            })
        });

        console.log(`Response status: ${response.status}`);
        const data = await response.json();

        if (response.ok) {
            console.log('Success! Response:', data.candidates?.[0]?.content?.parts?.[0]?.text);
        } else {
            console.error('Gemini Error:', JSON.stringify(data, null, 2));
        }
    } catch (error) {
        console.error('Fetch caught error:', error.message);
    }
}

testGemini();
