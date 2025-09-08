require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const { OpenAI } = require('openai');

const app = express();
app.use(express.json());
// Allow the React dev server (default 3000) to call this API on 5000
app.use(cors());

if (!process.env.OPENAI_API_KEY) {
  console.error('🔴 OPENAI_API_KEY is not set in the .env file. The server will not start.');
  process.exit(1);
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Shared handler for chat endpoint
const handleChat = async (req, res) => {
  const { message, language } = req.body;

  if (!message || !language) {
    return res.status(400).json({ error: 'Message and language are required.' });
  }

  try {
    const systemPrompt = `You are 'Annadatri Mitra', a helpful AI assistant for the Ahaarvritti food donation platform. Your goal is to answer questions about food donation, finding food banks, volunteering, and reducing food waste. Please respond to the user's query in ${language}.`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo', 
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message },
      ],
    });

    const reply = completion.choices[0].message.content;
    res.json({ reply });
  } catch (error) {
    console.error('Error calling OpenAI API:', error);
    res.status(500).json({ error: 'Failed to get a response from the AI. Please check the server logs.' });
  }
};

// Support both routes to match frontend expectations
app.post('/chat', handleChat);
app.post('/api/chat', handleChat);

// Simple health check
app.get('/health', (req, res) => res.json({ ok: true }));

app.use(express.static(path.join(__dirname, 'build')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'build', 'index.html'));
});


app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`✅ Ahaarvritti chatbot server is running on http://localhost:${PORT}`);
});

const gracefulShutdown = (signal) => {
  console.log(`\n${signal} received. Shutting down gracefully...`);
  server.close(() => {
    console.log('✅ Server closed.');
    process.exit(0);
  });
};

process.on('SIGINT', () => gracefulShutdown('SIGINT')); 
process.on('SIGTERM', () => gracefulShutdown('SIGTERM')); 