import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config();

async function listModels() {
    const apiKey = process.env.GEMINI_API_KEY;
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

    console.log('Fetching Gemini models...');
    try {
        const response = await fetch(url);
        const data = await response.json();
        if (response.ok) {
            console.log('Available Models:', data.models.map(m => m.name));
        } else {
            console.error('Error listing models:', JSON.stringify(data, null, 2));
        }
    } catch (e) {
        console.error('Fetch error:', e.message);
    }
}

listModels();
