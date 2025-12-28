import express from 'express';
import dotenv from 'dotenv';

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;
const FINNHUB_KEY = process.env.FINNHUB_API_KEY || null;

app.use(express.json());

// Simple health endpoint
app.get('/api/health', (req,res)=> res.json({ ok:true, time: Date.now() }));

// Proxy to Finnhub quote endpoint: /api/quote?symbol=AAPL
app.get('/api/quote', async (req,res)=>{
  const symbol = (req.query.symbol || '').toUpperCase();
  if(!symbol) return res.status(400).json({ error: 'symbol query param required' });
  if(!FINNHUB_KEY) return res.status(503).json({ error: 'API key not configured. Set FINNHUB_API_KEY in .env' });
  try{
    const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${FINNHUB_KEY}`;
    const r = await fetch(url);
    if(!r.ok) return res.status(502).json({ error: 'upstream error' });
    const json = await r.json();
    // example response contains c (current), h (high), l (low), o (open), pc (prev close)
    return res.json({ symbol, quote: json });
  }catch(err){
    console.error(err);
    return res.status(500).json({ error: 'server error' });
  }
});

// Optional: search / symbol lookup
app.get('/api/search', async (req,res)=>{
  const q = req.query.q;
  if(!q) return res.status(400).json({ error: 'q required' });
  if(!FINNHUB_KEY) return res.status(503).json({ error: 'API key not configured. Set FINNHUB_API_KEY in .env' });
  try{
    const url = `https://finnhub.io/api/v1/search?q=${encodeURIComponent(q)}&token=${FINNHUB_KEY}`;
    const r = await fetch(url);
    if(!r.ok) return res.status(502).json({ error: 'upstream error' });
    const json = await r.json();
    return res.json(json);
  }catch(err){
    console.error(err);
    return res.status(500).json({ error: 'server error' });
  }
});

app.listen(PORT, ()=>{
  console.log(`Finhub proxy server listening on http://localhost:${PORT}`);
});