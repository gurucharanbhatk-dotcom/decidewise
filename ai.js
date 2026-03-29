// ═══════════════════════════════════════════════════════
//  DecideWise — Netlify Serverless Function
//  Uses Google Gemini API (FREE tier)
//  Model: gemini-1.5-flash (fast + free)
// ═══════════════════════════════════════════════════════

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
      body: '',
    };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
  };

  try {
    const { system, messages, max_tokens } = JSON.parse(event.body);

    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'API key not configured on server.' }),
      };
    }

    // Combine system prompt + user message for Gemini
    const userMessage = messages?.[0]?.content || '';
    const fullPrompt  = system
      ? `${system}\n\nUser situation:\n${userMessage}`
      : userMessage;

    // Gemini 1.5 Flash — free tier, fast, high quality
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

    const geminiBody = {
      contents: [{ parts: [{ text: fullPrompt }] }],
      generationConfig: {
        maxOutputTokens: max_tokens || 1000,
        temperature: 0.7,
      },
    };

    const response = await fetch(geminiUrl, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(geminiBody),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Gemini API error:', data);
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({ error: data.error?.message || 'Gemini API error' }),
      };
    }

    // Extract text from Gemini response
    const geminiText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    // Return in same format the frontend expects
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        content: [{ type: 'text', text: geminiText }],
      }),
    };

  } catch (err) {
    console.error('Function error:', err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Server error: ' + err.message }),
    };
  }
};
