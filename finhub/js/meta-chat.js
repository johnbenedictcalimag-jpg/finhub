/* Meta-style chat behavior: UI, simulated streaming, suggestions, and simple convo management */
(function(){
  const root = document.getElementById('metaChat');
  const messagesEl = document.getElementById('messages');
  const composer = document.getElementById('composer');
  const input = document.getElementById('composerInput');
  const suggestionsEl = document.getElementById('suggestions');
  const convoList = document.getElementById('convoList');
  const newConvoBtn = document.getElementById('newConvo');
  const closeBtn = document.getElementById('closeChat');
  const minimizeBtn = document.getElementById('minimizeChat');
  const chatNav = document.getElementById('chatNav');

  let convos = []; // simple conversation store
  let activeConvoId = null;

  function saveConvos(){ try{ localStorage.setItem('fh-convos', JSON.stringify(convos)); }catch(e){} }
  function loadConvos(){ try{ const raw = localStorage.getItem('fh-convos'); convos = raw ? JSON.parse(raw) : []; }catch(e){ convos = []; } }

  function openChat(){ root.classList.remove('hidden'); root.setAttribute('aria-hidden','false'); input.focus(); }
  function closeChat(){ root.classList.add('hidden'); root.setAttribute('aria-hidden','true'); }
  function minimizeChat(){ root.classList.add('hidden'); root.setAttribute('aria-hidden','true'); }

  // conversation management
  function renderConvos(){ convoList.innerHTML = ''; convos.forEach(c=>{
    const el = document.createElement('button'); el.className = 'convo-item'; el.type = 'button'; el.setAttribute('role','listitem');
    if(c.id === activeConvoId) el.classList.add('active');
    el.innerHTML = `<div style="flex:1"><strong>${c.title||'Conversation'}</strong><div class="muted" style="font-size:0.9rem">${(c.messages||[]).length} messages</div></div>`;
    el.addEventListener('click', ()=>{ activeConvoId = c.id; renderConvos(); renderMessages(); openChat(); });
    convoList.appendChild(el);
  }); }

  function newConversation(){ const c = { id: 'c-'+Date.now(), title: 'Conversation', messages: [] }; convos.unshift(c); activeConvoId = c.id; saveConvos(); renderConvos(); renderMessages(); openChat(); }

  function getActiveConvo(){ if(!activeConvoId && convos.length){ activeConvoId = convos[0].id; } return convos.find(x=>x.id===activeConvoId); }

  function renderMessages(){ messagesEl.innerHTML = ''; const convo = getActiveConvo(); if(!convo) return; convo.messages.forEach(m=> appendMessageElement(m, false)); scrollToBottom(); }

  function appendMessageElement(m, shouldScroll=true){ const row = document.createElement('div'); row.className = 'msg-row';
    const el = document.createElement('div'); el.className = 'msg ' + (m.role==='user' ? 'user' : 'assistant');
    if(m.role==='assistant'){
      el.innerHTML = `<span class="meta-bubble">${escapeHtml(m.content)}</span>`;
    } else {
      el.innerHTML = `<span class="meta-bubble">${escapeHtml(m.content)}</span>`;
    }
    row.appendChild(el);
    messagesEl.appendChild(row);
    if(shouldScroll) scrollToBottom();
  }

  function addUserMessage(text){ const convo = getActiveConvo() || (newConversation(), getActiveConvo()); const m = { id: 'm-'+Date.now(), role:'user', content: text }; convo.messages.push(m); saveConvos(); appendMessageElement(m); }

  function addAssistantStreaming(content, onDone){ // create placeholder and stream text
    const convo = getActiveConvo(); const placeholder = { id: 'm-'+Date.now(), role:'assistant', content: '' };
    convo.messages.push(placeholder); saveConvos();
    // create element
    const row = document.createElement('div'); row.className = 'msg-row';
    const el = document.createElement('div'); el.className = 'msg assistant loading';
    el.innerHTML = `<span class="meta-bubble">${escapeHtml('')}</span>`;
    row.appendChild(el);
    messagesEl.appendChild(row);
    scrollToBottom();

    // simulate streaming by chunks
    let i = 0; const chunks = chunkString(content, 20);
    const interval = setInterval(()=>{
      if(i < chunks.length){ placeholder.content += chunks[i]; el.querySelector('.meta-bubble').innerHTML = escapeHtml(placeholder.content); i++; scrollToBottom(); }
      else { clearInterval(interval); el.classList.remove('loading'); saveConvos(); if(onDone) onDone(); }
    }, 45);
  }

  function simulateResponse(prompt){ // basic canned responder - replace with real API integration
    const lower = prompt.toLowerCase();
    if(lower.includes('reduce') || lower.includes('save')) return {
      text: "Start by tracking recurring subscriptions and setting a budget for variable expenses. Consider automating savings — move a portion of each paycheck into a savings account and review discretionary spending monthly.",
      suggestions: ["Show me recurring subscriptions", "Set a monthly savings goal", "Give me a budget template"]
    };
    if(lower.includes('invest')) return {
      text: "Investing depends on your goals and timeline. Consider diversified ETFs for broad market exposure and low fees. If you're starting, set up automatic monthly investments and review allocations yearly.",
      suggestions: ["Risk tolerance quiz", "Recommended ETFs", "Estimate returns"]
    }
    return {
      text: "Good question — here are a few steps you can take: review recent transactions, set a 30-day trial budget, and schedule a follow-up reminder. Want me to generate a budget plan?",
      suggestions: ["Generate a 30-day budget", "Analyze last month's spending", "Show me saving tips"]
    };
  }

  // suggestions rendering
  function renderSuggestions(list){ suggestionsEl.innerHTML = ''; if(!list || !list.length) { suggestionsEl.setAttribute('aria-hidden','true'); return; }
    suggestionsEl.setAttribute('aria-hidden','false'); list.forEach(s=>{
      const b = document.createElement('button'); b.type='button'; b.className='suggestion'; b.textContent = s; b.addEventListener('click', ()=>{ input.value = s; input.dispatchEvent(new Event('input')); input.focus(); });
      suggestionsEl.appendChild(b);
    });
  }

  // helpers
  function scrollToBottom(){ messagesEl.scrollTop = messagesEl.scrollHeight; }
  function chunkString(str, n){ const out=[]; for(let i=0;i<str.length;i+=n) out.push(str.slice(i,i+n)); return out; }
  function escapeHtml(text){ return (text||'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('\n','<br>'); }

  // events
  composer.addEventListener('submit', (e)=>{ e.preventDefault(); const v = input.value.trim(); if(!v) return; addUserMessage(v); input.value=''; input.style.height=''; // simulate
    const res = simulateResponse(v);
    setTimeout(()=>{ addAssistantStreaming(res.text, ()=>{ renderSuggestions(res.suggestions); }); }, 300);
  });

  // new convo
  newConvoBtn.addEventListener('click', ()=> newConversation());
  closeBtn.addEventListener('click', ()=> closeChat());
  minimizeBtn.addEventListener('click', ()=> minimizeChat());

  // intercept header chat link
  if(chatNav){ chatNav.addEventListener('click', (e)=>{ e.preventDefault(); if(!convos.length) newConversation(); openChat(); }); }

  // keyboard shortcuts
  document.addEventListener('keydown', (e)=>{
    if((e.ctrlKey || e.metaKey) && e.key.toLowerCase()==='k'){ e.preventDefault(); if(root.classList.contains('hidden')){ if(!convos.length) newConversation(); openChat(); } input.focus(); }
    if(e.key === 'Escape'){ if(!root.classList.contains('hidden')) closeChat(); }
  });

  // textarea auto-resize
  input.addEventListener('input', ()=>{ input.style.height = 'auto'; input.style.height = Math.min(120, input.scrollHeight) + 'px'; });

  // initial load
  function init(){ loadConvos(); if(!convos.length){ newConversation(); }
    renderConvos(); renderMessages(); // preload sample message
    if(!getActiveConvo().messages.length){ const welcome = { id:'m-welcome', role:'assistant', content: 'Hi — I\'m Finhub Assistant. Ask me about budgets, savings, or investing. Try: "How can I reduce my monthly expenses?"' }; getActiveConvo().messages.push(welcome); saveConvos(); renderMessages(); renderSuggestions(["How can I reduce my monthly expenses?","Show me a budget template","Analyze my last month"]); }
  }

  init();

  // expose small API
  window.FHChat = { openChat, closeChat, newConversation };
})();