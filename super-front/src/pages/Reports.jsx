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

const parseJarvisMessage = (content) => {
  if (!content) return { speech: '', screen: '', full: '' };
  
  if (content.includes('[FALA]') || content.includes('[TELA]') || content.includes('[TRANSICAO]')) {
    const falaMatch = content.match(/\[FALA\]([\s\S]*?)(?:\[TELA\]|\[TRANSICAO\]|$)/i);
    const telaMatch = content.match(/\[TELA\]([\s\S]*?)(?:\[TRANSICAO\]|$)/i) || content.match(/\[TELA\]([\s\S]*)$/i);
    
    const spokenText = falaMatch ? falaMatch[1].trim() : '';
    const screenText = telaMatch ? telaMatch[1].trim() : '';
    
    return {
      speech: spokenText || content.replace(/\[TELA\][\s\S]*/gi, '').replace(/\[TRANSICAO\][\s\S]*/gi, '').replace(/\[FALA\]/gi, '').trim(),
      screen: screenText,
      full: spokenText ? `> ${spokenText}\n\n${screenText}` : screenText
    };
  }
  
  if (content.startsWith('>')) {
    const parts = content.split('\n\n');
    const speech = parts[0].replace(/^>\s*/, '').trim();
    const screen = parts.slice(1).join('\n\n').trim();
    return { speech, screen, full: content };
  }

  return {
    speech: content,
    screen: '',
    full: content
  };
};

function Reports() {
  const [inputText, setInputText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const isJarvisSpeakingRef = useRef(false);
  const recognitionRef = useRef(null);

  const [systemState, setSystemState] = useState("SIS.ONLINE"); // SIS.AGUARDA, USER.RECV, SIS.RESP
  const [isChatExpanded, setIsChatExpanded] = useState(false);
  const [isMobileChatExpanded, setIsMobileChatExpanded] = useState(false);
  const [isCinematic, setIsCinematic] = useState(false);
  const [isJarvisSpeaking, setIsJarvisSpeaking] = useState(false);
  
  const [messages, setMessages] = useState([]);
  
  const [chatHistory, setChatHistory] = useState([]);
  
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [metaStatus, setMetaStatus] = useState({ ok: true, msg: 'LINK_ATIVO' });
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Carregar histórico real do banco de dados (Memória Permanente)
  useEffect(() => {
    const initJarvis = async () => {
      try {
        // 1. Busca Histórico
        const res = await fetch(`${API_URL}/api/jarvis/history`);
        const data = await res.json();
        let loadedMessages = [];
        
        if (Array.isArray(data)) {
          loadedMessages = data.map(m => {
            const date = new Date(m.createdAt);
            const dateStr = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
            const timeStr = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
            return {
              role: m.role === 'user' ? 'user' : 'jarvis',
              content: m.content,
              time: `${dateStr} às ${timeStr}`,
              animate: false
            };
          });
          setMessages(loadedMessages);
        }

        // 2. Verifica se precisa de Saudação (Sessão nova e SEM histórico)
        const alreadyGreeted = sessionStorage.getItem('jarvis_voice_greeted');
        if (!alreadyGreeted && loadedMessages.length === 0) {
          fetchGreeting(loadedMessages);
        }
      } catch (err) {
        console.error('Erro ao inicializar Jarvis:', err);
      }
    };
    
    initJarvis();
  }, []);

  const fetchGreeting = async (currentMessages) => {
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
      const dateStr = now.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
      const finalTimeStr = `${dateStr} às ${timeStr}`;
      
      let replyText = data.reply || 'Central offline.';
      const transicaoMatch = replyText.match(/\[TRANSICAO\]([\s\S]*?)\[/i) || replyText.match(/\[TRANSICAO\]([\s\S]*)$/i);
      const falaMatch = replyText.match(/\[FALA\]([\s\S]*?)(?:\[TELA\]|$)/i);
      const telaMatch = replyText.match(/\[TELA\]([\s\S]*)/i);

      let transicaoText = transicaoMatch ? transicaoMatch[1].trim() : null;
      let spokenText = falaMatch ? falaMatch[1].trim() : replyText;
      let displayText = falaMatch ? `> ${spokenText}\n\n${telaMatch ? telaMatch[1].trim() : ''}` : replyText;

      setMessages(prev => [...prev, { role: 'jarvis', content: displayText, time: finalTimeStr, animate: true }]);
      
      setSystemState("SIS.RESP");
      
      const voicePreference = localStorage.getItem('jarvisVoice') || 'elevenlabs';

      const playBrowserFallback = (text, isTransition = false) => {
        console.log('🌐 [JARVIS GREETING] Usando voz nativa do navegador...');
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'pt-BR';
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        const voices = window.speechSynthesis.getVoices();
        const googlePt = voices.find(v => v.name.includes('Google') && v.lang === 'pt-BR');
        if (googlePt) utterance.voice = googlePt;
        utterance.onend = () => {
          if (isTransition) {
            console.log('🔄 [JARVIS GREETING] Transição nativa concluída.');
            setTimeout(playMainFala, 500);
          } else {
            console.log('✅ [JARVIS GREETING] Saudação nativa concluída.');
            setSystemState("SIS.AGUARDA");
          }
        };
        window.speechSynthesis.speak(utterance);
      };

      const playMainFala = () => {
        if (voicePreference === 'browser') {
          playBrowserFallback(spokenText);
          return;
        }
        console.log('🔊 [JARVIS GREETING] Tentando falar via API:', spokenText);
        const audioUrl = `${API_URL}/api/jarvis/speak?text=${encodeURIComponent(spokenText)}`;
        const audio = new Audio(audioUrl);
        currentAudioRef.current = audio;
        audio.onended = () => {
          console.log('✅ [JARVIS GREETING] Saudação da API concluída.');
          setSystemState("SIS.AGUARDA");
        };
        audio.play().then(() => {
          console.log('▶️ [JARVIS GREETING] Reproduzindo áudio da API...');
        }).catch(e => {
          console.warn("⚠️ [JARVIS GREETING] Falha na API, mudando para voz nativa...");
          playBrowserFallback(spokenText);
        });
      };

      if (transicaoText) {
        if (voicePreference === 'browser') {
          playBrowserFallback(transicaoText, true);
        } else {
          console.log('📡 [JARVIS GREETING] Tocando transição:', transicaoText);
          const transicaoUrl = `${API_URL}/api/jarvis/speak?text=${encodeURIComponent(transicaoText)}`;
          const transicaoAudio = new Audio(transicaoUrl);
          currentAudioRef.current = transicaoAudio;
          transicaoAudio.onended = () => {
            console.log('🔄 [JARVIS GREETING] Transição concluída, iniciando saudação principal...');
            setTimeout(playMainFala, 500);
          };
          transicaoAudio.play().catch(e => {
            console.error("❌ [JARVIS GREETING] Erro ao tocar áudio de transição da saudação", e);
            playMainFala();
          });
        }
      } else {
        playMainFala();
      }
      sessionStorage.setItem('jarvis_voice_greeted', 'true');
    } catch (error) {
      console.error(error);
      setSystemState("SIS.AGUARDA");
    }
  };

  const desktopMessagesEndRef = useRef(null);
  const mobileMessagesEndRef = useRef(null);
  const hasGreetedRef = useRef(messages.length > 0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const currentAudioRef = useRef(null);
  const messagesRef = useRef(messages);
  const introMusicRef = useRef(null);
  const falaPreventivaTocandoRef = useRef(false);
  const pendingResponseCallbackRef = useRef(null);

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

  // Removido o salvamento local para usar persistência de banco de dados

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

  const deleteHistory = async () => {
    if (!window.confirm('Tem certeza que deseja REINICIAR o J.A.R.V.I.S.? Isso irá expurgar todo o histórico de conversas do banco de dados e sincronizar os sistemas do zero.')) return;
    try {
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
      }
      window.speechSynthesis.cancel();
      setIsJarvisSpeaking(false);

      await fetch(`${API_URL}/api/jarvis/history`, { method: 'DELETE' });
      setMessages([]);
      sessionStorage.removeItem('jarvis_voice_greeted');
      hasGreetedRef.current = false;
      showNotification('success', 'SISTEMAS REINICIADOS', 'Memória do núcleo central limpa com sucesso. Inicializando J.A.R.V.I.S...');
      
      fetchGreeting([]);
    } catch (err) {
      console.error('Erro ao limpar banco:', err);
      showNotification('error', 'FALHA NO SISTEMA', 'Não foi possível restabelecer conexão para reiniciar.');
    }
  };

  // Removido o useEffect antigo de saudação, agora integrado no initJarvis

  // Scroll do desktop (sempre que mensagens mudarem)
  useEffect(() => {
    if (desktopMessagesEndRef.current) {
      desktopMessagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Scroll do mobile (apenas se a gaveta de chat estiver aberta)
  useEffect(() => {
    if (isMobileChatExpanded && mobileMessagesEndRef.current) {
      mobileMessagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isMobileChatExpanded]);

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
        audio.onended = () => {
          setIsJarvisSpeaking(false);
          // Aumentar a música de fundo suavemente após ele terminar de falar
          if (introMusicRef.current) {
            let vol = 0.25;
            const interval = setInterval(() => {
              vol += 0.05;
              if (vol >= 0.8) {
                introMusicRef.current.volume = 0.8;
                clearInterval(interval);
              } else {
                introMusicRef.current.volume = vol;
              }
            }, 100);
          }
        };
        
        audio.play().catch(e => console.error("Error playing Jarvis voice:", e));
      }, 2000);

      setInputText("");
      return;
    }

    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
    }
    window.speechSynthesis.cancel(); // Cancela qualquer fala anterior do navegador

    const now = new Date();
    const dateStr = now.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
    const finalTimeStr = `${dateStr} às ${timeStr}`;

    const newMessages = [...messagesRef.current, { role: 'user', content: textToSend, time: finalTimeStr }];
    setMessages(newMessages);
    setSystemState("SIS.PROC");

    const voicePreference = localStorage.getItem('jarvisVoice') || 'elevenlabs';

    // --- ANTECIPAÇÃO DE FALA PREVENTIVA (FLUIDEZ E CONSISTÊNCIA DE VOZ) ---
    // Se a pergunta for representativa (> 15 caracteres), fala instantaneamente uma frase de transição.
    const isRepresentativelyLong = textToSend.trim().length > 15;
    if (isRepresentativelyLong) {
      const frasesTransicao = [
        "Analisando, senhor. Um momento que vou verificar.",
        "Procurando em nosso banco de dados, chefe. Só um instante.",
        "Entendido, senhor. Deixe-me consultar as campanhas e vendas agora mesmo.",
        "Localizando as informações, chefe. Aguarde um momento.",
        "Processando sua solicitação, senhor. Um instante por favor.",
        "Acessando os servidores para checar esses dados, chefe. Um segundo.",
        "Pesquisando na base de dados, senhor. Um momento.",
        "Verificando as métricas, chefe. Só um instante."
      ];
      const fraseAleatoria = frasesTransicao[Math.floor(Math.random() * frasesTransicao.length)];
      
      falaPreventivaTocandoRef.current = true;
      pendingResponseCallbackRef.current = null;

      const handlePreventivaEnd = () => {
        console.log('🔄 [JARVIS] Evento de término de fala preventiva disparado.');
        falaPreventivaTocandoRef.current = false;
        if (pendingResponseCallbackRef.current) {
          console.log('🔄 [JARVIS] Executando callback de resposta pendente.');
          pendingResponseCallbackRef.current();
          pendingResponseCallbackRef.current = null;
        }
      };

      if (voicePreference === 'browser') {
        console.log('⚡ [JARVIS] Fala preventiva acionada (Nativa):', fraseAleatoria);
        const utterance = new SpeechSynthesisUtterance(fraseAleatoria);
        utterance.lang = 'pt-BR';
        utterance.rate = 1.05; 
        utterance.pitch = 1.0;
        const voices = window.speechSynthesis.getVoices();
        const googlePt = voices.find(v => v.name.includes('Google') && v.lang === 'pt-BR');
        if (googlePt) utterance.voice = googlePt;
        utterance.onend = handlePreventivaEnd;
        utterance.onerror = handlePreventivaEnd;
        window.speechSynthesis.speak(utterance);
      } else {
        console.log('⚡ [JARVIS] Fala preventiva acionada (API ElevenLabs):', fraseAleatoria);
        const transicaoUrl = `${API_URL}/api/jarvis/speak?text=${encodeURIComponent(fraseAleatoria)}`;
        const transicaoAudio = new Audio(transicaoUrl);
        currentAudioRef.current = transicaoAudio;
        transicaoAudio.onended = handlePreventivaEnd;
        transicaoAudio.play().catch(e => {
          console.error("❌ [JARVIS] Erro ao reproduzir fala preventiva via API", e);
          handlePreventivaEnd();
        });
      }
    }

    try {
      const res = await fetch(`${API_URL}/api/jarvis/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages })
      });
      const data = await res.json();
      
      const processResponse = () => {
        let replyText = data.reply;
        
        if (!replyText) {
          const errTitle = data.error || 'Erro na central de processamento';
          const errSuggestion = data.suggestion ? `\n\nSugestão: ${data.suggestion}` : '';
          replyText = `> ${errTitle}${errSuggestion}`;
        }

        const transicaoMatch = replyText.match(/\[TRANSICAO\]([\s\S]*?)\[/i) || replyText.match(/\[TRANSICAO\]([\s\S]*)$/i);
        const falaMatch = replyText.match(/\[FALA\]([\s\S]*?)(?:\[TELA\]|$)/i);
        const telaMatch = replyText.match(/\[TELA\]([\s\S]*)/i);

        let transicaoText = transicaoMatch ? transicaoMatch[1].trim() : null;
        let spokenText = falaMatch ? falaMatch[1].trim() : replyText;
        let displayText = falaMatch ? `> ${spokenText}\n\n${telaMatch ? telaMatch[1].trim() : ''}` : replyText;

        const respTime = new Date();
        const respDateStr = respTime.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        const respTimeStr = `${respTime.getHours().toString().padStart(2, '0')}:${respTime.getMinutes().toString().padStart(2, '0')}:${respTime.getSeconds().toString().padStart(2, '0')}`;
        const respFinalTimeStr = `${respDateStr} às ${respTimeStr}`;
        
        setMessages(prev => [...prev, { role: 'jarvis', content: displayText, time: respFinalTimeStr, animate: true }]);
        setSystemState("SIS.RESP");

        const voicePreference = localStorage.getItem('jarvisVoice') || 'elevenlabs';

        const playBrowserFallback = (text, isTransition = false) => {
          console.log('🌐 [JARVIS] Usando voz nativa do navegador...');
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.lang = 'pt-BR';
          utterance.rate = 1.0;
          utterance.pitch = 1.0;
          
          const voices = window.speechSynthesis.getVoices();
          const googlePt = voices.find(v => v.name.includes('Google') && v.lang === 'pt-BR');
          if (googlePt) utterance.voice = googlePt;

          utterance.onend = () => {
            if (isTransition) {
              console.log('🔄 [JARVIS] Transição nativa concluída.');
              setTimeout(playMainFala, 500);
            } else {
              console.log('✅ [JARVIS] Fala nativa concluída.');
              setSystemState("SIS.AGUARDA");
            }
          };

          window.speechSynthesis.speak(utterance);
        };

        const playMainFala = () => {
          if (voicePreference === 'browser') {
            playBrowserFallback(spokenText);
            return;
          }
          console.log('🔊 [JARVIS] Tentando falar via API:', spokenText);
          const audioUrl = `${API_URL}/api/jarvis/speak?text=${encodeURIComponent(spokenText)}`;
          const audio = new Audio(audioUrl);
          currentAudioRef.current = audio;
          audio.onended = () => {
            console.log('✅ [JARVIS] Fala da API concluída.');
            setSystemState("SIS.AGUARDA");
          };
          audio.play().then(() => {
            console.log('▶️ [JARVIS] Reproduzindo áudio da API...');
          }).catch(e => {
            console.warn("⚠️ [JARVIS] Falha na API (possivelmente créditos), mudando para voz nativa...");
            playBrowserFallback(spokenText);
          });
        };

        if (transicaoText) {
          if (voicePreference === 'browser') {
            playBrowserFallback(transicaoText, true);
          } else {
            console.log('📡 [JARVIS] Tocando transição:', transicaoText);
            const transicaoUrl = `${API_URL}/api/jarvis/speak?text=${encodeURIComponent(transicaoText)}`;
            const transicaoAudio = new Audio(transicaoUrl);
            currentAudioRef.current = transicaoAudio;
            transicaoAudio.onended = () => {
              console.log('🔄 [JARVIS] Transição concluída, iniciando fala principal...');
              setTimeout(playMainFala, 500);
            };
            transicaoAudio.play().catch(e => {
              console.error("❌ [JARVIS] Erro ao tocar áudio de transição:", e);
              playMainFala();
            });
          }
        } else {
          playMainFala();
        }
      };

      if (falaPreventivaTocandoRef.current) {
        console.log('⏳ [JARVIS] Fala preventiva em andamento. Resposta agendada.');
        pendingResponseCallbackRef.current = processResponse;
      } else {
        processResponse();
      }
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

  const startRecording = async () => {
    if (isRecordingRef.current) return;
    
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
            setInputText("");
          } else {
            setSystemState("SIS.AGUARDA");
          }
        } catch (err) {
          console.error("Erro na transcrição", err);
          setSystemState("SIS.AGUARDA");
        }
        
        stream.getTracks().forEach(track => track.stop());
      };

      // SpeechRecognition em tempo real
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.lang = 'pt-BR';
        recognition.continuous = true;
        recognition.interimResults = true;

        recognition.onresult = (event) => {
          let interimTranscript = '';
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              // Whisper fará a versão final
            } else {
              interimTranscript += event.results[i][0].transcript;
            }
          }
          if (interimTranscript) {
            setInputText(interimTranscript);
          }
        };

        recognition.start();
        recognitionRef.current = recognition;
      }

      mediaRecorder.start();
      setIsRecording(true);
      isRecordingRef.current = true;
      setSystemState("USER.RECV");
    } catch (err) {
      console.error("Erro ao acessar microfone", err);
      alert("Permita o acesso ao microfone no navegador.");
    }
  };

  const stopRecording = () => {
    if (!isRecordingRef.current) return;
    
    playBeep('stop');
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    isRecordingRef.current = false;
    setSystemState("SIS.PROC");
    stopVisualizer();

    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  };

  const toggleRecording = () => {
    if (isRecordingRef.current) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        startRecording();
      }
    };
    const handleKeyUp = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.code === 'Space') {
        e.preventDefault();
        stopRecording();
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
      
        {/* Interface Exclusiva para Desktop */}
        {!isMobile && (
          <div className="desktop-only h-full w-full">
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
                  className="material-icons-outlined text-[16px] cursor-pointer hover:text-red-400 transition-colors"
                  onClick={deleteHistory}
                  title="Reiniciar J.A.R.V.I.S. (Limpar Histórico)"
                >
                  restart_alt
                </span>
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
                    onClick={deleteHistory}
                    className="w-full py-2 bg-transparent border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors font-label-caps tracking-widest text-[10px]"
                  >
                    EXPURGAR TODO HISTÓRICO
                  </button>
                  
                  <div className="flex flex-col gap-2 mt-4">
                    <p className="text-primary/40 text-[9px] text-center px-4">
                      O Jarvis agora possui Memória Permanente. Todas as suas conversas estratégicas estão gravadas no núcleo central para consulta futura.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Top HUD Section */}
            {!isChatExpanded && (
              <div className="relative flex-none flex flex-col items-center justify-center md:min-h-[380px] min-h-[190px] bg-[#060a0f] overflow-hidden border-b border-primary/10 transition-all duration-300">
              
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
              <div className="relative flex items-center justify-center w-80 h-80 mt-4 mb-8 md:scale-100 scale-[0.55] origin-center">
                
                {/* Background Atmosphere (Aura) */}
                <div className="absolute w-64 h-64 bg-primary/5 rounded-full blur-[60px] animate-pulse"></div>

                {/* Concentric Circles */}
                <div className="absolute w-40 h-40 border border-primary/20 rounded-full animate-pulse"></div>
                <div className="absolute w-56 h-56 border border-primary/10 rounded-full border-dashed animate-[spin_20s_linear_infinite]"></div>

                {/* Active Visualizer or Status Text */}
                <div className="relative z-10 flex items-center justify-center">
                  {systemState === "SIS.AGUARDA" ? (
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

                      {/* Enxame de Partículas */}
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
                </div>
              </div>

              {/* Labels de Estado HUD Premium */}
              <div className="w-full flex items-center justify-center z-20 mb-6 px-4">
                <div className="flex items-center gap-3 px-6 py-2 bg-black/60 backdrop-blur-md border border-primary/40 rounded-full shadow-[0_0_20px_rgba(76,214,251,0.2)] animate-[pulse_2s_infinite]">
                  <div className="relative flex items-center justify-center shrink-0">
                    <div className={`w-3 h-3 rounded-full ${systemState === 'SIS.AGUARDA' ? 'bg-green-400 shadow-[0_0_12px_#4ade80]' : 'bg-primary shadow-[0_0_12px_#4cd6fb]'} animate-pulse`}></div>
                    <div className={`absolute w-5 h-5 rounded-full border border-current ${systemState === 'SIS.AGUARDA' ? 'text-green-400/50' : 'text-primary/50'} animate-ping`}></div>
                  </div>
                  <span className="text-primary font-label-caps tracking-[0.2em] text-[10px] sm:text-[12px] font-bold text-center" style={{ textShadow: '0 0 10px rgba(76, 214, 251, 0.5)' }}>
                    {
                      systemState === "USER.RECV" ? "CAPTURANDO ÁUDIO: ESCUTANDO SENHOR..." :
                      systemState === "SIS.PROC" ? "PROCESSANDO DADOS ESTRATÉGICOS..." :
                      systemState === "SIS.RESP" ? "JARVIS EMITINDO DIAGNÓSTICO..." :
                      systemState === "SIS.AGUARDA" ? "ESTOU PRONTO PARA OUVI-LO, SENHOR!" :
                      "SINCRONIZANDO NÚCLEO CENTRAL.DLL"
                    }
                  </span>
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
                      {msg.role === 'jarvis' ? <TypewriterText text={parseJarvisMessage(msg.content).full} animate={msg.animate !== false} /> : msg.content}
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

              <div ref={desktopMessagesEndRef}></div>
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
                  onMouseDown={startRecording}
                  onMouseUp={stopRecording}
                  onMouseLeave={stopRecording}
                  onTouchStart={(e) => { e.preventDefault(); startRecording(); }}
                  onTouchEnd={(e) => { e.preventDefault(); stopRecording(); }}
                  className={`w-12 h-12 flex items-center justify-center transition-all border cursor-pointer ${isRecording ? 'border-red-500/50 bg-red-500/10 text-red-400 shadow-[0_0_15px_rgba(248,113,113,0.3)]' : 'border-primary/30 bg-primary/5 text-primary hover:bg-primary/15 hover:border-primary/60 hover:shadow-[0_0_12px_rgba(76,214,251,0.3)]'}`}
                  title="Comando de Voz (Segure para gravar)"
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
        </div>
      )}

        {/* Interface Exclusiva para Mobile */}
        {isMobile && (
          <div className="mobile-only reports-mobile-layout">
          <div className="jarvis-mobile-wrapper">
            {/* Header Móvel */}
            <header className="flex justify-between items-center px-4 h-12 shrink-0 bg-surface border-b border-primary/20 z-10 relative">
              <div className="text-primary font-label-caps tracking-[0.25em] text-[12px] font-bold" style={{ textShadow: '0 0 8px var(--color-primary-container)' }}>
                J.A.R.V.I.S.
              </div>
              <div className="flex gap-4 text-primary/60">
                <span 
                  className="material-icons-outlined text-[18px] cursor-pointer hover:text-red-400"
                  onClick={deleteHistory}
                  title="Reiniciar Jarvis"
                >
                  restart_alt
                </span>
                <span 
                  className="material-icons-outlined text-[18px] cursor-pointer hover:text-primary"
                  onClick={() => setIsHistoryOpen(true)}
                  title="Histórico"
                >
                  history
                </span>
              </div>
            </header>

            {/* Núcleo Holográfico (Encolhe quando expande o chat) */}
            <div className={`jarvis-mobile-core-container ${isMobileChatExpanded ? 'collapsed' : ''}`}>
              {/* Esfera 3D Animada */}
              <div className="jarvis-sphere-outer">
                <div className="jarvis-sphere-glow"></div>
                <div className="jarvis-sphere-ring jarvis-sphere-ring-1" style={systemState === 'SIS.PROC' ? { animationDuration: '3s' } : systemState === 'USER.RECV' ? { animationDuration: '4s' } : {}}></div>
                <div className="jarvis-sphere-ring jarvis-sphere-ring-2" style={systemState === 'SIS.PROC' ? { animationDuration: '4s' } : systemState === 'USER.RECV' ? { animationDuration: '5s' } : {}}></div>
                <div className="jarvis-sphere-ring jarvis-sphere-ring-3" style={systemState === 'SIS.PROC' ? { animationDuration: '5s' } : systemState === 'USER.RECV' ? { animationDuration: '6s' } : {}}></div>
                <div className="jarvis-sphere-center" style={systemState === 'SYS.RESP' ? { animation: 'pulseSphere 1s ease-in-out infinite' } : {}}>
                  <span>JARVIS</span>
                </div>
              </div>

              {/* Status Pill */}
              <div className="jarvis-mobile-status-pill">
                <div className="relative flex items-center justify-center shrink-0">
                  <div className={`w-2.5 h-2.5 rounded-full ${systemState === 'SIS.AGUARDA' ? 'bg-green-400 shadow-[0_0_10px_#4ade80]' : 'bg-primary shadow-[0_0_10px_#4cd6fb]'} animate-pulse`}></div>
                  <div className={`absolute w-4 h-4 rounded-full border border-current ${systemState === 'SIS.AGUARDA' ? 'text-green-400/30' : 'text-primary/30'} animate-ping`}></div>
                </div>
                <span className="text-primary font-label-caps tracking-[0.15em] text-[9px] font-bold">
                  {
                    systemState === "USER.RECV" ? "ESCUTANDO..." :
                    systemState === "SIS.PROC" ? "PROCESSANDO..." :
                    systemState === "SIS.RESP" ? "RESPONDENDO..." :
                    "NÚCLEO ONLINE"
                  }
                </span>
              </div>

              {/* Último Insight do Jarvis ou Balão de Mensagem */}
              {messages.length > 0 ? (
                <div className="jarvis-last-message-bubble">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {parseJarvisMessage(messages[messages.length - 1].content).speech}
                  </ReactMarkdown>
                </div>
              ) : (
                <div className="jarvis-last-message-bubble">
                  <span>Sistemas operacionais, senhor. O que deseja analisar hoje?</span>
                </div>
              )}
            </div>

            {/* Gaveta de Chat Deslizante */}
            <div className={`jarvis-mobile-chat-container ${isMobileChatExpanded ? 'expanded' : ''}`}>
              <div className="jarvis-mobile-chat-header">
                <h3>SYS.CONVERSA_LOG</h3>
                <span 
                  className="material-icons-outlined text-[20px] text-primary/70 cursor-pointer"
                  onClick={() => setIsMobileChatExpanded(false)}
                >
                  expand_more
                </span>
              </div>
              <div className="jarvis-mobile-chat-scroll term-scroll">
                {messages.map((msg, index) => (
                  <div key={index} className={`jarvis-bubble-row ${msg.role === 'user' ? 'user' : 'jarvis'}`}>
                    <div className={`jarvis-chat-bubble ${msg.role === 'user' ? 'user' : 'jarvis'}`}>
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {msg.role === 'jarvis' ? parseJarvisMessage(msg.content).full : msg.content}
                      </ReactMarkdown>
                      <span className={`jarvis-bubble-time ${msg.role === 'user' ? 'user' : 'jarvis'}`}>
                        {msg.time.split(' às ')[1] || msg.time}
                      </span>
                    </div>
                  </div>
                ))}
                {messages.length === 0 && (
                  <div className="flex-1 flex flex-col items-center justify-center text-primary/40 text-[11px] gap-2 py-8">
                    <span className="material-icons-outlined text-[24px]">chat_bubble_outline</span>
                    <p>Sem histórico de conversas nesta sessão</p>
                  </div>
                )}
                 <div ref={mobileMessagesEndRef}></div>
              </div>
            </div>

            {/* Barra de Entrada Móvel */}
            <div className="jarvis-mobile-input-bar">
              <form onSubmit={handleSendText}>
                <button 
                  type="button"
                  onClick={() => setIsMobileChatExpanded(!isMobileChatExpanded)}
                  className={`jarvis-mobile-btn jarvis-mobile-btn-toggle ${isMobileChatExpanded ? 'active' : ''}`}
                  title="Expandir Histórico"
                >
                  <span className="material-icons-outlined">
                    {isMobileChatExpanded ? 'visibility' : 'forum'}
                  </span>
                </button>

                <input 
                  type="text" 
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Fale comigo, senhor..."
                  autoComplete="off"
                />

                <button 
                  type="button"
                  onMouseDown={startRecording}
                  onMouseUp={stopRecording}
                  onMouseLeave={stopRecording}
                  onTouchStart={(e) => { e.preventDefault(); startRecording(); }}
                  onTouchEnd={(e) => { e.preventDefault(); stopRecording(); }}
                  className={`jarvis-mobile-btn jarvis-mobile-btn-mic ${isRecording ? 'recording' : ''}`}
                  title="Comando de Voz (Segure para gravar)"
                >
                  <span className="material-icons-outlined">
                    {isRecording ? 'mic_off' : 'mic'}
                  </span>
                </button>

                <button 
                  type="submit"
                  className="jarvis-mobile-btn jarvis-mobile-btn-send"
                  title="Enviar"
                >
                  <span className="material-icons-outlined">send</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
      
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
