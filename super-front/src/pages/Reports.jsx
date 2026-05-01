import React, { useEffect, useState, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { API_URL } from '../api/config';
import remarkGfm from 'remark-gfm';
import CinematicIntro from '../components/CinematicIntro';
import introMusicFile from '../assets/Back-In-Black.mp3';

const TypewriterText = ({ text, animate = true }) => {
  const [displayedText, setDisplayedText] = useState(animate ? "" : text);
  
  useEffect(() => {
    if (!animate) {
      setDisplayedText(text);
      return;
    }
    let i = 0;
    const intervalId = setInterval(() => {
      setDisplayedText(text.slice(0, i + 1));
      i++;
      if (i >= text.length) {
        clearInterval(intervalId);
      }
    }, 25);
    
    return () => clearInterval(intervalId);
  }, [text, animate]);

  return (
    <div className="markdown-body">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{displayedText}</ReactMarkdown>
    </div>
  );
};

function Reports() {
  const [inputText, setInputText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [systemState, setSystemState] = useState("SIS.AGUARDA"); // SIS.AGUARDA, USER.RECV, SIS.RESP
  const [isChatExpanded, setIsChatExpanded] = useState(false);
  const [isCinematic, setIsCinematic] = useState(false);
  const [isJarvisSpeaking, setIsJarvisSpeaking] = useState(false);
  
  const [messages, setMessages] = useState(() => {
    try {
      const saved = localStorage.getItem('jarvis_current_session');
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.map(m => ({ ...m, animate: false }));
      }
      return [];
    } catch (e) { return []; }
  });
  
  const [chatHistory, setChatHistory] = useState(() => {
    try {
      const saved = localStorage.getItem('jarvis_history');
      return saved ? JSON.parse(saved) : [];
    } catch (e) { return []; }
  });
  
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [metaStatus, setMetaStatus] = useState({ ok: true, msg: 'LINK_ATIVO' });

  const messagesEndRef = useRef(null);
  const hasGreetedRef = useRef(messages.length > 0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const currentAudioRef = useRef(null);
  const messagesRef = useRef(messages);
  const introMusicRef = useRef(null);

  const [audioLevels, setAudioLevels] = useState(new Array(20).fill(0));
  const analyserRef = useRef(null);
  const audioContextRef = useRef(null);
  const animationFrameRef = useRef(null);
  const isRecordingRef = useRef(false);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    isRecordingRef.current = isRecording;
  }, [isRecording]);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await fetch(`${API_URL}/api/dashboard?actId=todas&periodo=hoje`);
        
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          setMetaStatus({ ok: false, msg: errData.error || 'FALHA NO PROCESSAMENTO' });
          return;
        }

        const data = await res.json();
        
        if (data.metaStatus === 'error') {
          setMetaStatus({ ok: false, msg: data.metaErrorMessage?.toUpperCase() || 'ERRO NA INTEGRAÇÃO' });
        } else if (!data.availableAccounts || data.availableAccounts.length === 0) {
          setMetaStatus({ ok: false, msg: 'SISTEMA CEGO: SEM CONTAS VINCULADAS' });
        } else {
          setMetaStatus({ ok: true, msg: 'SISTEMAS OPERACIONAIS E ONLINE' });
        }
      } catch (e) {
        setMetaStatus({ ok: false, msg: 'CONEXÃO PERDIDA COM O SERVIDOR' });
      }
    };
    checkStatus();
    const interval = setInterval(checkStatus, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    localStorage.setItem('jarvis_current_session', JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    localStorage.setItem('jarvis_history', JSON.stringify(chatHistory));
  }, [chatHistory]);

  const startNewConversation = () => {
    if (messages.length > 1) {
      const newHistoryItem = {
        id: Date.now(),
        date: new Date().toLocaleString('pt-BR'),
        messages: [...messages]
      };
      setChatHistory(prev => [newHistoryItem, ...prev]);
    }
    setMessages([]);
    hasGreetedRef.current = false;
    setIsHistoryOpen(false);
  };

  const deleteSession = (e, id) => {
    e.stopPropagation();
    setChatHistory(prev => prev.filter(session => session.id !== id));
  };

  useEffect(() => {
    if (messages.length === 0 && !hasGreetedRef.current) {
      hasGreetedRef.current = true;
      const fetchGreeting = async () => {
        setSystemState("SIS.PROC");
        try {
          const res = await fetch(`${API_URL}/api/jarvis/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              messages: [{ role: 'user', content: 'Aja como se o sistema tivesse acabado de ser ativado. Na tag [FALA], dê uma saudação curta, respeitosa e em aberto, no estilo "Bem-vindo de volta Senhor, como posso servi-lo hoje?". Na tag [TELA], confirme apenas que os sistemas de análise de tráfego e vendas estão online aguardando os dados ou comandos.' }] 
            })
          });
          const data = await res.json();
          const now = new Date();
          const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
          
          let replyText = data.reply || 'Central offline.';
          let spokenText = replyText;
          let displayText = replyText;

          const falaMatch = replyText.match(/\[FALA\]([\s\S]*?)(?:\[TELA\]|$)/i);
          const telaMatch = replyText.match(/\[TELA\]([\s\S]*)/i);

          if (falaMatch) {
            spokenText = falaMatch[1].trim();
            displayText = `> ${spokenText}\n\n${telaMatch ? telaMatch[1].trim() : ''}`;
          }

          setMessages([{ role: 'jarvis', content: displayText, time: timeStr, animate: true }]);
          
          // Fala a saudação por Streaming instantâneo (Apenas a parte [FALA])
          const audioUrl = `${API_URL}/api/jarvis/speak?text=${encodeURIComponent(spokenText)}`;
          const audio = new Audio(audioUrl);
          currentAudioRef.current = audio;
          audio.onended = () => setSystemState("SIS.AGUARDA");
          audio.play().catch(e => {
            console.error("Erro ao tocar áudio", e);
            setSystemState("SIS.AGUARDA");
          });
        } catch (error) {
          console.error(error);
          setSystemState("SIS.AGUARDA");
        }
      };
      fetchGreeting();
    }
  }, [messages.length]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessageToJarvis = async (textToSend) => {
    if (!textToSend.trim()) return;

    // DETECÇÃO DO PROTOCOLO DE APRESENTAÇÃO
    const triggerWords = ["jarvis, se apresente", "jarvis se apresente", "jarvis, se apresente."];
    if (triggerWords.some(word => textToSend.toLowerCase().includes(word))) {
      setIsCinematic(true);
      
      // TOCA BACK IN BLACK (O hino do Tony Stark)
      if (introMusicRef.current) {
        introMusicRef.current.pause();
        introMusicRef.current.currentTime = 0;
      }
      const music = new Audio(introMusicFile);
      music.volume = 0.25; // Volume reduzido para equilíbrio com tecnologia.mp3
      introMusicRef.current = music;
      music.play().catch(e => console.error("Erro ao tocar trilha sonora", e));

      // Feedback sonoro e fala de introdução
      setTimeout(() => {
        // Texto para a voz (pronúncia correta)
        const introSpeechAudio = "Eu sou o Jarvis. Protocolo Mark 1 online. Fui projetado para ser seu braço direito, otimizando seus dados e impulsionando seus resultados em tempo real. Sistemas sob supervisão. Como posso servi-lo, senhor?";
        const audioUrl = `${API_URL}/api/jarvis/speak?text=${encodeURIComponent(introSpeechAudio)}`;
        const audio = new Audio(audioUrl);
        currentAudioRef.current = audio;
        
        audio.onplay = () => setIsJarvisSpeaking(true);
        audio.onended = () => setIsJarvisSpeaking(false);
        
        audio.play().catch(e => console.error("Error playing Jarvis voice:", e));

        // Aumentar a música de fundo após o efeito de tecnologia (aprox 8s)
        setTimeout(() => {
          if (backgroundMusicRef.current) {
            // Fade suave para cima
            let vol = 0.25;
            const interval = setInterval(() => {
              vol += 0.05;
              if (vol >= 0.6) {
                backgroundMusicRef.current.volume = 0.6;
                clearInterval(interval);
              } else {
                backgroundMusicRef.current.volume = vol;
              }
            }, 100);
          }
        }, 8000);
      }, 2000);

      setInputText("");
      return;
    }

    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
    }

    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;

    const newMessages = [...messagesRef.current, { role: 'user', content: textToSend, time: timeStr }];
    setMessages(newMessages);
    setSystemState("SIS.PROC");

    try {
      const res = await fetch(`${API_URL}/api/jarvis/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages })
      });
      const data = await res.json();
      
      let replyText = data.reply;
      
      if (!replyText) {
        // Se não veio resposta, mas veio um erro específico do backend
        const errTitle = data.error || 'Erro na central de processamento';
        const errSuggestion = data.suggestion ? `\n\nSugestão: ${data.suggestion}` : '';
        replyText = `> ${errTitle}${errSuggestion}`;
      }
      let spokenText = replyText;
      let displayText = replyText;

      const falaMatch = replyText.match(/\[FALA\]([\s\S]*?)(?:\[TELA\]|$)/i);
      const telaMatch = replyText.match(/\[TELA\]([\s\S]*)/i);

      if (falaMatch) {
        spokenText = falaMatch[1].trim();
        displayText = `> ${spokenText}\n\n${telaMatch ? telaMatch[1].trim() : ''}`;
      }

      const respTime = new Date();
      const respTimeStr = `${respTime.getHours().toString().padStart(2, '0')}:${respTime.getMinutes().toString().padStart(2, '0')}:${respTime.getSeconds().toString().padStart(2, '0')}`;
      
      setMessages(prev => [...prev, { role: 'jarvis', content: displayText, time: respTimeStr, animate: true }]);
      setSystemState("SIS.RESP");

      const audioUrl = `${API_URL}/api/jarvis/speak?text=${encodeURIComponent(spokenText)}`;
      const audio = new Audio(audioUrl);
      currentAudioRef.current = audio;
      audio.onended = () => setSystemState("SIS.AGUARDA");
      audio.play().catch(e => {
        console.error("Erro ao tocar áudio", e);
        setSystemState("SIS.AGUARDA");
      });
    } catch (err) {
      console.error(err);
      setSystemState("SYS.AWAIT");
      setMessages(prev => [...prev, { role: 'jarvis', content: 'Desculpe senhor, ocorreu uma falha de conexão.', time: timeStr }]);
    }
  };

  const handleSendText = (e) => {
    e.preventDefault();
    sendMessageToJarvis(inputText);
    setInputText("");
  };

  const playBeep = (type) => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      if (type === 'start') {
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.1);
      } else if (type === 'stop') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(600, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.15);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.15);
      }
    } catch (e) {
      console.error('AudioContext não suportado para bipes', e);
    }
  };

  const startVisualizer = (stream) => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      audioContextRef.current = audioCtx;
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 64;
      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const updateSpectrum = () => {
        analyser.getByteFrequencyData(dataArray);
        const levels = Array.from(dataArray).slice(0, 20);
        setAudioLevels(levels);
        animationFrameRef.current = requestAnimationFrame(updateSpectrum);
      };
      updateSpectrum();
    } catch (e) {
      console.error('Visualizador não suportado', e);
    }
  };

  const stopVisualizer = () => {
    if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
    }
    setAudioLevels(new Array(20).fill(0));
  };

  const toggleRecording = async () => {
    if (isRecordingRef.current) {
      playBeep('stop');
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
      setIsRecording(false);
      setSystemState("SIS.PROC");
      stopVisualizer();
    } else {
      playBeep('start');
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current.currentTime = 0;
      }
      
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        startVisualizer(stream);
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) audioChunksRef.current.push(e.data);
        };

        mediaRecorder.onstop = async () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const formData = new FormData();
          formData.append('audio', audioBlob, 'audio.webm');

          try {
            const res = await fetch(`${API_URL}/api/jarvis/transcribe`, {
              method: 'POST',
              body: formData
            });
            const data = await res.json();
            
            if (data.text) {
              sendMessageToJarvis(data.text);
            } else {
              setSystemState("SIS.AGUARDA");
            }
          } catch (err) {
            console.error("Erro na transcrição", err);
            setSystemState("SIS.AGUARDA");
          }
          
          stream.getTracks().forEach(track => track.stop());
        };

        mediaRecorder.start();
        setIsRecording(true);
        setSystemState("USER.RECV");
      } catch (err) {
        console.error("Erro ao acessar microfone", err);
        alert("Permita o acesso ao microfone no navegador.");
      }
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        if (!isRecordingRef.current) toggleRecording();
      }
    };
    const handleKeyUp = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.code === 'Space') {
        e.preventDefault();
        if (isRecordingRef.current) toggleRecording();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Helper para gerar barras de espectro dinâmicas dependendo do estado
  const renderSpectrumBars = () => {
    const barsCount = 20;
    const bars = [];
    for (let i = 0; i < barsCount; i++) {
      let baseHeight = 10;
      let animClass = "";
      
      if (systemState === "USER.RECV") {
        // Voz do usuário conectada no AnalyserNode!
        const level = audioLevels[i] || 0;
        baseHeight = 10 + (level / 255) * 60;
      } else if (systemState === "SYS.RESP") {
        // Voz do Jarvis (padrão mais uniforme)
        baseHeight = 20 + Math.abs(Math.sin(i)) * 40;
        animClass = "animate-[pulse_0.5s_infinite]";
      } else {
        // SYS.AWAIT (parado/idle)
        baseHeight = 10 + (i % 3) * 5;
      }
      
      // Opacidade baseada na distância do centro
      const centerDist = Math.abs((barsCount / 2) - i);
      const opacity = Math.max(0.2, 0.8 - (centerDist * 0.05));
      
      bars.push(
        <div 
          key={i} 
          className={`w-2 bg-primary ${animClass}`} 
          style={{ 
            height: `${baseHeight}px`, 
            opacity: opacity,
            transition: systemState === "USER.RECV" ? 'height 0.05s linear' : 'all 0.2s ease-in-out',
            boxShadow: '0 0 8px rgba(76, 214, 251, 0.4)'
          }}
        ></div>
      );
    }
    return bars;
  };

  return (
    <>
      <style>{`
        .term-scroll::-webkit-scrollbar {
          width: 6px;
        }
        .term-scroll::-webkit-scrollbar-track {
          background: rgba(12, 20, 26, 0.5);
        }
        .term-scroll::-webkit-scrollbar-thumb {
          background: rgba(76, 214, 251, 0.15);
          border-radius: 3px;
        }

        /* Markdown Styles for Jarvis */
        .markdown-body {
          color: inherit;
          font-family: inherit;
        }
        .markdown-body p {
          margin-bottom: 0.75rem;
        }
        .markdown-body p:last-child {
          margin-bottom: 0;
        }
        .markdown-body strong {
          color: #4cd6fb;
          font-weight: 700;
          text-shadow: 0 0 8px rgba(76, 214, 251, 0.4);
        }
        .markdown-body ul {
          list-style-type: disc;
          padding-left: 1.5rem;
          margin-bottom: 0.75rem;
        }
        .markdown-body li {
          margin-bottom: 0.25rem;
        }
        .markdown-body table {
          width: 100%;
          border-collapse: collapse;
          margin: 1rem 0;
          font-size: 12px;
        }
        .markdown-body th, .markdown-body td {
          border: 1px solid rgba(76, 214, 251, 0.2);
          padding: 0.5rem;
          text-align: left;
        }
        .markdown-body th {
          background: rgba(76, 214, 251, 0.1);
          color: #4cd6fb;
        }

        .hud-bracket {
          position: absolute;
          width: 16px;
          height: 16px;
          border-color: rgba(76, 214, 251, 0.3);
          border-style: solid;
        }
        .tl { top: 0; left: 0; border-width: 2px 0 0 2px; }
        .tr { top: 0; right: 0; border-width: 2px 2px 0 0; }
        .bl { bottom: 0; left: 0; border-width: 0 0 2px 2px; }
        .br { bottom: 0; right: 0; border-width: 0 2px 2px 0; }
        
        .hud-bar-bg {
          background: linear-gradient(to top, rgba(76, 214, 251, 0.05), rgba(76, 214, 251, 0.2));
        }

        @keyframes flicker {
          0% { opacity: 0.8; transform: skew(0deg); }
          5% { opacity: 0.5; transform: skew(0.5deg); }
          10% { opacity: 0.9; transform: skew(-0.2deg); }
          15% { opacity: 0.4; transform: skew(0.3deg); }
          20% { opacity: 1; transform: skew(0deg); }
          100% { opacity: 1; transform: skew(0deg); }
        }

        @keyframes easeInOut {
          0%, 100% { transform: scale(0.95); opacity: 0.8; }
          50% { transform: scale(1.05); opacity: 1; }
        }
      `}</style>
      
        <div className="dark flex flex-col font-code-sm text-on-surface relative overflow-hidden h-full w-full" 
             style={{ backgroundColor: 'var(--color-background)', color: 'var(--color-primary)' }}>
          
          {/* Global Header */}
          <header className="flex justify-between items-center px-6 h-12 shrink-0 bg-surface border-b border-primary/20 z-10 relative">
            <div className="w-16"></div>
            <div className="text-primary font-label-caps tracking-[0.3em] text-[11px]" style={{ textShadow: '0 0 8px var(--color-primary-container)' }}>
              J.A.R.V.I.S.
            </div>
          <div className="flex gap-4 text-primary/60">
            <span 
              className="material-icons-outlined text-[16px] cursor-pointer hover:text-primary transition-colors"
              onClick={() => setIsChatExpanded(!isChatExpanded)}
              title={isChatExpanded ? "Restaurar Visualizador" : "Expandir Terminal"}
            >
              {isChatExpanded ? 'close_fullscreen' : 'open_in_full'}
            </span>
            <span className="material-icons-outlined text-[16px] cursor-pointer hover:text-primary transition-colors">settings</span>
            <span 
              className="material-icons-outlined text-[16px] cursor-pointer hover:text-primary transition-colors"
              onClick={() => setIsHistoryOpen(true)}
              title="Histórico de Conversas"
            >
              history
            </span>
          </div>
        </header>

        {/* Histórico Sidebar */}
        {isHistoryOpen && (
          <div className="absolute top-0 right-0 w-80 h-full bg-[#060a0f]/95 border-l border-primary/20 z-50 flex flex-col backdrop-blur-md transition-all shadow-[-10px_0_30px_rgba(0,0,0,0.5)]">
            <div className="p-4 border-b border-primary/20 flex justify-between items-center">
              <h3 className="text-primary font-label-caps tracking-widest text-[11px]">SYS.HISTORY</h3>
              <span className="material-icons-outlined text-[16px] cursor-pointer hover:text-primary" onClick={() => setIsHistoryOpen(false)}>close</span>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 term-scroll">
              <button 
                onClick={startNewConversation}
                className="w-full py-2 bg-transparent border border-primary/30 text-primary hover:bg-primary/10 transition-colors font-label-caps tracking-widest text-[10px]"
              >
                + NOVA SESSÃO
              </button>
              
              <div className="flex flex-col gap-2 mt-4">
                {chatHistory.length === 0 && <p className="text-primary/40 text-[10px] text-center mt-4">Nenhum registro encontrado.</p>}
                {chatHistory.map(session => (
                  <div key={session.id} className="group p-3 border border-primary/10 bg-primary/5 hover:border-primary/30 cursor-pointer transition-colors relative">
                    <button 
                      onClick={(e) => deleteSession(e, session.id)}
                      className="absolute top-2 right-2 w-6 h-6 flex items-center justify-center bg-transparent border border-transparent hover:bg-red-500/10 hover:border-red-500/40 text-primary/40 hover:text-red-400 hover:shadow-[0_0_8px_rgba(248,113,113,0.3)] opacity-0 group-hover:opacity-100 transition-all z-10"
                      title="Expurgar Registro"
                    >
                      <span className="material-icons-outlined text-[13px]">close</span>
                    </button>
                    <p className="text-primary/60 text-[9px] mb-1">{session.date}</p>
                    <p className="text-primary/80 text-[11px] truncate pr-5">
                      {session.messages[1]?.content || "Sessão Vazia"}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Top HUD Section */}
        {!isChatExpanded && (
          <div className="relative flex-1 flex flex-col items-center justify-center min-h-[35%] bg-[#060a0f] overflow-hidden border-b border-primary/10 transition-all duration-300">
          
          {/* Data Greebles Left */}
          <div className="absolute top-6 left-6 text-primary/40 text-[10px] leading-tight tracking-widest hidden sm:block">
            &gt; PRT_88.192.A<br/>
            &gt; NET_SEC: OPTIMAL<br/>
            &gt; PWR_GRID: STABLE
          </div>
          
          {/* Data Greebles Right */}
          <div className="absolute top-6 right-6 text-primary/40 text-[10px] leading-tight text-right tracking-widest hidden sm:block">
            MEM: 4096TB<br/>
            LOAD: 0.04%<br/>
            SYNC: TRUE
          </div>

          {/* Center Visualizer HUD */}
          <div className="relative flex items-center justify-center w-80 h-48">
            
            {/* Background Atmosphere (Aura) */}
            <div className="absolute w-64 h-64 bg-primary/5 rounded-full blur-[60px] animate-pulse"></div>

            {/* Concentric Circles */}
            <div className="absolute w-32 h-32 border border-primary/20 rounded-full animate-pulse"></div>
            <div className="absolute w-40 h-40 border border-primary/10 rounded-full border-dashed animate-[spin_20s_linear_infinite]"></div>

            {/* Active Visualizer or Status Text */}
            <div className="relative z-10 flex items-center justify-center">
              {systemState === "SYS.AWAIT" ? (
                <div className="relative flex items-center justify-center w-72 h-72">
                  {/* Camadas de Energia do Núcleo (HIPER-ATIVO) */}
                  <div className="absolute inset-4 border-2 border-primary/20 rounded-full animate-[pulse_2s_easeInOut_infinite] scale-95 shadow-[0_0_50px_rgba(76,214,251,0.2)]"></div>
                  <div className="absolute inset-8 border border-primary/40 rounded-full animate-[spin_8s_linear_infinite] border-dashed"></div>
                  <div className="absolute inset-12 border-2 border-primary/50 rounded-full animate-[pulse_1.5s_easeInOut_infinite] shadow-[inset_0_0_40px_rgba(76,214,251,0.3)]"></div>
                  
                  {/* Aura Central de Plasma Intensa */}
                  <div className="absolute w-24 h-24 bg-primary/20 rounded-full blur-2xl animate-pulse"></div>
                  <div className="absolute w-20 h-20 border-2 border-primary rounded-full shadow-[0_0_40px_var(--color-primary)] animate-[flicker_2s_infinite]"></div>

                  {/* Nome JARVIS Holográfico */}
                  <div className="relative z-20 flex flex-col items-center">
                    <span className="text-primary font-label-caps text-3xl tracking-[0.25em] font-black italic animate-[flicker_3s_infinite]" 
                          style={{ textShadow: '0 0 15px var(--color-primary), 0 0 40px var(--color-primary)' }}>
                      JARVIS
                    </span>
                    <div className="w-16 h-[2px] bg-primary/60 mt-2 shadow-[0_0_10px_var(--color-primary)] animate-pulse"></div>
                  </div>

                  {/* Enxame de Partículas (Mais partículas e movimento) */}
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className={`absolute w-full h-full border border-primary/5 rounded-full animate-[spin_${(i+1)*4}s_linear_infinite]`}
                         style={{ transform: `rotate(${i * 60}deg) scale(${1 + i*0.05})` }}>
                      <div className="absolute top-0 left-1/2 w-1.5 h-1.5 bg-primary rounded-full shadow-[0_0_12px_var(--color-primary)]"></div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-1 h-20">
                  {renderSpectrumBars()}
                </div>
              )}
              
              {/* Labels de Estado com Estilo de Terminal */}
              {systemState !== "SYS.AWAIT" && (
                <div className="absolute -bottom-12 text-primary/80 font-label-caps tracking-[0.2em] text-[10px] animate-pulse flex items-center gap-2">
                  <div className="w-2 h-2 bg-primary rounded-full animate-ping"></div>
                  {systemState === "USER.RECV" ? "CAPTURANDO_AUDIO.EXE" : "SINCRONIZANDO_NUCLEO.DLL"}
                </div>
              )}
            </div>
          </div>
        </div>
        )}

        {/* Divider */}
        <div className="w-full flex items-center justify-between px-4 py-1 bg-primary/5 border-b border-primary/20 shrink-0">
          <span className={`font-label-caps tracking-widest text-[9px] ${metaStatus.ok ? 'text-[#4ade80]' : 'text-[#f87171] animate-pulse'}`}>
            STATUS: {metaStatus.msg}
          </span>
          <div className="flex-1 border-t border-primary/10 mx-4"></div>
          <span className="text-primary/60 font-label-caps tracking-widest text-[9px]">v.4.2.0</span>
        </div>

        {/* Bottom Chat / Terminal Section */}
        <div className="flex-1 bg-background overflow-y-auto p-6 term-scroll flex flex-col gap-6 relative" style={{ minHeight: '40%', backgroundColor: 'var(--color-background)' }}>
          {messages.map((msg, index) => (
            <div key={index} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} w-full`}>
              <div className={`max-w-[70%] ${msg.role === 'user' ? 'border-r-2 border-amber-500/50 pr-4 text-right' : 'border-l-2 border-primary/30 pl-4 text-left'}`}>
                <div className={`text-[13px] leading-relaxed mb-1 ${msg.role === 'user' ? 'text-amber-400' : 'text-primary/70'}`}
                     style={msg.role === 'user' ? { textShadow: '0 0 8px rgba(251,191,36,0.3)' } : {}}>
                  {msg.role === 'jarvis' ? <TypewriterText text={msg.content} animate={msg.animate !== false} /> : msg.content}
                </div>
                <div className={`text-[9px] uppercase tracking-widest ${msg.role === 'user' ? 'text-amber-500/50' : 'text-primary/30'}`}>
                  &gt; {msg.role === 'user' ? 'USER_INPUT' : 'SYS_RESP'} [{msg.time}]
                </div>
              </div>
            </div>
          ))}
          
          <div className="flex items-center mt-2 opacity-80">
            <span className="text-primary font-code-sm">&gt;</span>
            <span className="w-2 h-3.5 bg-primary ml-2 animate-pulse"></span>
          </div>

          <div ref={messagesEndRef}></div>
        </div>

        {/* Input Bar */}
        <div className="shrink-0 bg-surface border-t border-primary/20 p-2 sm:p-4" style={{ backgroundColor: 'var(--color-surface)' }}>
          <form onSubmit={handleSendText} className="flex items-center gap-3 w-full bg-background border border-primary/20 p-1 pr-2 rounded-sm focus-within:border-primary/50 transition-colors" style={{ backgroundColor: 'var(--color-background)' }}>
            
            <div className="text-primary/40 pl-3">
              <span className="material-icons-outlined text-[16px]">terminal</span>
            </div>
            
            <input 
              type="text" 
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Fale comigo, senhor."
              className="flex-1 bg-transparent border-none text-primary/80 font-code-sm text-[12px] px-2 py-2 focus:outline-none focus:ring-0 placeholder:text-primary/30"
              autoComplete="off"
            />
            
            <button 
              type="button"
              onClick={toggleRecording}
              className={`w-12 h-12 flex items-center justify-center transition-all border cursor-pointer ${isRecording ? 'border-red-500/50 bg-red-500/10 text-red-400 shadow-[0_0_15px_rgba(248,113,113,0.3)]' : 'border-primary/30 bg-primary/5 text-primary hover:bg-primary/15 hover:border-primary/60 hover:shadow-[0_0_12px_rgba(76,214,251,0.3)]'}`}
              title="Comando de Voz"
            >
              <span className="material-icons-outlined text-[20px]">
                {isRecording ? 'mic_off' : 'mic'}
              </span>
            </button>

            <button 
              type="submit"
              className="w-12 h-12 flex items-center justify-center transition-all border border-primary/30 bg-primary/5 text-primary hover:bg-primary/15 hover:border-primary/60 hover:shadow-[0_0_12px_rgba(76,214,251,0.3)] cursor-pointer"
              title="Enviar Texto"
            >
              <span className="material-icons-outlined text-[20px]">send</span>
            </button>

          </form>
        </div>

      </div>
      
      {/* MODO CINEMÁTICO (JARVIS PROTOCOL) */}
      {isCinematic && (
        <CinematicIntro 
          isSpeaking={isJarvisSpeaking}
          onComplete={() => {
          setIsCinematic(false);
          if (introMusicRef.current) {
            // Faz um fade out rápido para não cortar seco
            const fadeInterval = setInterval(() => {
              if (introMusicRef.current.volume > 0.05) {
                introMusicRef.current.volume -= 0.05;
              } else {
                introMusicRef.current.pause();
                clearInterval(fadeInterval);
              }
            }, 50);
          }
        }} />
      )}
    </>
  );
}

export default Reports;
