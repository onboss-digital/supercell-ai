import React, { useEffect, useState, useRef } from 'react';
import techSound from '../assets/tecnologia.mp3';

const CinematicIntro = ({ onComplete, isSpeaking }) => {
  const [stage, setStage] = useState(0);
  const [text, setText] = useState("");
  const [visibleData, setVisibleData] = useState([]);
  const techAudioRef = useRef(null);
  const [currentPhraseIndex, setCurrentPhraseIndex] = useState(0);
  const [isFading, setIsFading] = useState(false);

  // Efeito de pulsação suave para o espectro
  const [pulse, setPulse] = useState(0);
  useEffect(() => {
    let interval;
    if (isSpeaking) {
      interval = setInterval(() => {
        setPulse(Math.random());
      }, 80);
    } else {
      setPulse(0);
    }
    return () => clearInterval(interval);
  }, [isSpeaking]);

  const phrases = [
    "J.A.R.V.I.S. PROTOCOLO_MARK_I: ONLINE.",
    "FUI PROJETADO PARA SER O SEU BRAÇO DIREITO.",
    "OTIMIZANDO DADOS E IMPULSIONANDO RESULTADOS.",
    "SISTEMAS SOB SUPERVISÃO. COMO POSSO SERVI-LO, SENHOR?"
  ];

  const dataPoints = [
    { id: 1, time: 300, label: "KERNEL", value: "STABLE", side: "left" },
    { id: 2, time: 800, label: "ENCRYPT", value: "ACTIVE", side: "right" },
    { id: 3, time: 1500, label: "NETWORK", value: "SECURE", side: "left" },
    { id: 4, time: 2200, label: "CRM_LINK", value: "ONLINE", side: "right" },
    { id: 5, time: 3000, label: "AI_CORE", value: "SYNCED", side: "left" },
    { id: 6, time: 3800, label: "THREATS", value: "ZERO", side: "right" }
  ];

  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e) => {
      const x = (e.clientX / window.innerWidth - 0.5) * 20;
      const y = (e.clientY / window.innerHeight - 0.5) * 20;
      setMousePos({ x, y });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useEffect(() => {
    if (techAudioRef.current) {
      techAudioRef.current.volume = 1.0;
      techAudioRef.current.play().catch(e => console.error("Tech sound error:", e));
    }

    const timeouts = [];
    dataPoints.forEach(point => {
      const t = setTimeout(() => {
        setVisibleData(prev => {
          if (prev.find(p => p.id === point.id)) return prev;
          return [...prev, point];
        });
      }, point.time);
      timeouts.push(t);
    });

    const timer1 = setTimeout(() => setStage(1), 800);
    const timer2 = setTimeout(() => setStage(2), 2000);

    return () => {
      timeouts.forEach(clearTimeout);
      clearTimeout(timer1);
      clearTimeout(timer2);
      if (techAudioRef.current) {
        techAudioRef.current.pause();
        techAudioRef.current.currentTime = 0;
      }
    };
  }, []);

  useEffect(() => {
    if (stage !== 2) return;

    let charIndex = 0;
    const currentFullText = phrases[currentPhraseIndex];
    
    const typingInterval = setInterval(() => {
      setText(currentFullText.slice(0, charIndex + 1));
      charIndex++;

      if (charIndex >= currentFullText.length) {
        clearInterval(typingInterval);
        
        if (currentPhraseIndex < phrases.length - 1) {
          setTimeout(() => {
            setIsFading(true);
            setTimeout(() => {
              setCurrentPhraseIndex(prev => prev + 1);
              setText("");
              setIsFading(false);
            }, 400);
          }, 2200);
        }
      }
    }, 30);

    return () => clearInterval(typingInterval);
  }, [stage, currentPhraseIndex]);

  return (
    <div className="fixed inset-0 z-[9999] bg-[#060a0f] flex flex-col items-center justify-center overflow-hidden h-screen w-screen top-0 left-0 perspective-hud">
      <audio ref={techAudioRef} src={techSound} />

      {/* Grid de Fundo e Varredura */}
      <div className="absolute inset-0 opacity-20 pointer-events-none">
        <div className="absolute inset-0" style={{ 
          backgroundImage: 'radial-gradient(circle at center, #4cd6fb 0%, transparent 70%)', 
          opacity: stage > 0 ? 0.3 : 0,
          transform: `translate(${mousePos.x * -0.5}px, ${mousePos.y * -0.5}px)`
        }}></div>
        <div className="w-full h-full" style={{ 
          backgroundImage: 'linear-gradient(rgba(76, 214, 251, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(76, 214, 251, 0.1) 1px, transparent 1px)', 
          backgroundSize: '40px 40px',
          transform: `translate(${mousePos.x * 0.2}px, ${mousePos.y * 0.2}px)`
        }}></div>
        
        {/* Linha de Varredura (Scanline) */}
        {stage < 2 && (
          <div className="absolute w-full h-[2px] bg-primary/30 shadow-[0_0_15px_var(--color-primary)] animate-[scan-line_2s_linear_infinite]"></div>
        )}
      </div>

      {/* Cascata de Dados (Hacker Style) */}
      {stage < 2 && (
        <div className="absolute inset-0 flex justify-between px-10 py-20 pointer-events-none opacity-40">
          {[...Array(2)].map((_, side) => (
            <div key={side} className="flex flex-col gap-4 text-[10px] font-code-sm text-primary/40 uppercase">
              {[...Array(15)].map((_, i) => (
                <div key={i} className={`animate-pulse`} style={{ animationDelay: `${i * 0.1}s` }}>
                  {Math.random().toString(16).substring(2, 10)}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Cantoneiras de Enquadramento */}
      <div className={`absolute inset-10 border-primary/20 pointer-events-none transition-all duration-1000 ${stage >= 1 ? 'scale-100 opacity-100' : 'scale-150 opacity-0'}`}>
        <div className="absolute top-0 left-0 w-10 h-10 border-t-2 border-l-2 border-primary/40"></div>
        <div className="absolute top-0 right-0 w-10 h-10 border-t-2 border-r-2 border-primary/40"></div>
        <div className="absolute bottom-0 left-0 w-10 h-10 border-b-2 border-l-2 border-primary/40"></div>
        <div className="absolute bottom-0 right-0 w-10 h-10 border-b-2 border-r-2 border-primary/40"></div>
      </div>

      <div className="relative flex items-center justify-center w-[600px] h-[600px] transition-transform duration-200"
           style={{ transform: `rotateY(${mousePos.x}deg) rotateX(${-mousePos.y}deg)` }}>
        
        {/* Espectro Circular Reativo (Sincronizado com a Voz) */}
        {stage >= 2 && [...Array(60)].map((_, i) => (
          <div key={`ring-${i}`} className="absolute w-[2px] bg-primary/60 rounded-full transition-all duration-100"
               style={{ 
                 height: isSpeaking ? `${(pulse * 35) + (Math.sin(i) * 10) + 5}px` : '4px',
                 transform: `rotate(${i * 6}deg) translateY(-165px)`,
                 opacity: isSpeaking ? 0.8 : 0.3,
                 boxShadow: isSpeaking ? '0 0 12px var(--color-primary)' : 'none'
               }}></div>
        ))}

        <div className={`absolute w-full h-full border border-primary/10 rounded-full animate-[spin_60s_linear_infinite] ${stage >= 1 ? 'opacity-100' : 'opacity-0'}`}></div>
        
        {[...Array(8)].map((_, i) => (
          <div key={`swarm-${i}`} className={`absolute w-full h-full border border-primary/5 rounded-full animate-[spin_${(i+1)*5}s_linear_infinite]`}
               style={{ transform: `rotate(${i * 45}deg) scale(${1 + i*0.03})` }}>
            <div className="absolute top-0 left-1/2 w-1 h-1 bg-primary rounded-full shadow-[0_0_10px_var(--color-primary)]"></div>
          </div>
        ))}

        {stage >= 2 && [...Array(15)].map((_, i) => (
          <div key={`p-${i}`} className="absolute w-1 h-1 bg-primary rounded-full shadow-[0_0_12px_var(--color-primary)] animate-particle-out"
               style={{ 
                 animationDelay: `${i * 0.3}s`,
                 '--angle': `${i * 24}deg`,
                 left: '50%',
                 top: '50%',
                 opacity: 0
               }}></div>
        ))}
        
        <div className={`relative flex items-center justify-center w-56 h-56 bg-[#060a0f] rounded-full shadow-[0_0_80px_rgba(76,214,251,0.5)] border-2 border-primary transition-all duration-1000 ${stage >= 1 ? 'scale-100 opacity-100' : 'scale-0 opacity-0'}`}>
          <div className="absolute inset-3 border border-primary/20 rounded-full border-dashed animate-spin"></div>
          
          <div className={`relative flex flex-col items-center justify-center ${isFading ? 'animate-glitch' : ''}`}>
             <span className="text-primary font-label-caps text-3xl tracking-[0.3em] font-bold" style={{ textShadow: '0 0 15px var(--color-primary)' }}>
               JARVIS
             </span>
             <span className="text-primary/30 text-[9px] tracking-[0.5em] mt-2">SYS.ACTIVE</span>
          </div>
        </div>

        {visibleData.map((point) => (
          <div 
            key={point.id} 
            className={`absolute flex flex-col transition-all duration-500 animate-in fade-in zoom-in slide-in-from-bottom-4 
              ${point.side === 'left' ? 'left-[-120px]' : 'right-[-120px]'}`}
            style={{ 
              top: `${25 + (point.id * 10)}%`,
              transform: `translateZ(50px)` 
            }}
          >
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 bg-primary animate-pulse rounded-full"></div>
              <span className="text-primary font-code-sm text-[9px] tracking-widest">{point.label}</span>
            </div>
            <div className="text-primary/60 font-code-sm text-[11px] pl-3 border-l border-primary/20 ml-0.5">
              {point.value}
            </div>
          </div>
        ))}
      </div>

      <div className={`mt-4 max-w-2xl text-center px-6 transition-all duration-1000 ${stage >= 2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
        <div className={`relative mb-4 transition-opacity duration-400 ${isFading ? 'opacity-0' : 'opacity-100'}`}>
          <p className="text-primary font-code-sm text-lg tracking-wider leading-relaxed min-h-[60px] mb-4">
            {text}
            <span className="inline-block w-1.5 h-5 bg-primary ml-1 animate-pulse align-middle"></span>
          </p>
        </div>
      </div>

      <button onClick={onComplete} className="order-first md:order-last mt-8 md:mt-4 mb-4 md:mb-0 px-10 py-2 border border-primary/30 bg-primary/5 text-primary font-label-caps tracking-[0.4em] text-[10px] hover:bg-primary/20 transition-all opacity-40 hover:opacity-100">
        RETORNAR AO COMANDO
      </button>
    </div>
  );
};

export default CinematicIntro;
