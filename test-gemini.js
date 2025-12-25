
import dotenv from 'dotenv';
dotenv.config();

async function testGemini() {
    console.log("Checking Gemini API...");
    const key = process.env.GEMINI_API_KEY;
    if (!key) { console.log("No key found"); return; }

    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`,
            {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ contents: [{ parts: [{ text: "Hello" }] }] })
            }
        );
        console.log(`Status: ${response.status} ${response.statusText}`);
        if (response.ok) {
            const data = await response.json();
            console.log("Content:", data.candidates?.[0]?.content?.parts?.[0]?.text);
        } else {
            console.log("Error:", await response.text());
        }
    } catch (e) {
        console.log("Fetch Error:", e.message);
    }
}
testGemini();
