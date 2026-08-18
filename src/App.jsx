import React, { useEffect, useRef, useState } from 'react';
import CanvasLayer from './components/CanvasLayer';
import { PROJECTS, getProjectScrollState, HERO_END } from './data/projects';

function App() {
  const typographyRef = useRef(null);
  const spotlightRef = useRef(null);
  const ctaRef = useRef(null);
  const dossierRef = useRef(null);
  const tickerRef = useRef(null);
  const isHoveringCta = useRef(false);
  const [activeProjectIndex, setActiveProjectIndex] = useState(-1);
  const [displayedProjectIndex, setDisplayedProjectIndex] = useState(-1);
  const [loadingMsg, setLoadingMsg] = useState('Initializing Engine...');
  const [loadingPercent, setLoadingPercent] = useState(0);
  const [isLoaded, setIsLoaded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);

  useEffect(() => {
    // Hide scrolling while loading
    if (!isLoaded) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  }, [isLoaded]);

  useEffect(() => {
    const handleScroll = () => {
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      const progress = Math.min(1, Math.max(0, window.scrollY / maxScroll));

      if (typographyRef.current) {
        if (progress <= HERO_END) {
          const fadeProgress = progress / HERO_END;
          typographyRef.current.style.opacity = 1 - fadeProgress;
          typographyRef.current.style.transform = `translateY(${-fadeProgress * 60}px)`;
          if (ctaRef.current) ctaRef.current.style.pointerEvents = 'auto';
        } else {
          typographyRef.current.style.opacity = 0;
          if (ctaRef.current) ctaRef.current.style.pointerEvents = 'none';
        }
      }

      let newActiveIndex = -1;
      let activePhases = null;
      for (let i = 1; i < PROJECTS.length; i++) {
        const phases = getProjectScrollState(progress, i);
        if (progress >= phases.dollyPhase[0] && progress <= phases.exitPhase[1]) {
           newActiveIndex = i;
           activePhases = phases;
           break;
        }
      }
      
      setActiveProjectIndex(newActiveIndex);

      if (dossierRef.current) {
        if (newActiveIndex !== -1 && activePhases && progress >= activePhases.holdPhase[0] && progress <= activePhases.holdPhase[1]) {
          dossierRef.current.classList.add('visible');
          setDisplayedProjectIndex(newActiveIndex);
        } else {
          dossierRef.current.classList.remove('visible');
        }
      }
      
      if (tickerRef.current) {
        if (newActiveIndex !== -1) {
           tickerRef.current.innerText = `{ ${String(newActiveIndex + 1).padStart(2, '0')} / 08 }`;
        } else {
           tickerRef.current.innerText = '';
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    let animationFrameId;
    let mx = window.innerWidth / 2;
    let my = window.innerHeight / 2;
    let targetCtaX = 0;
    let targetCtaY = 0;
    let currentCtaX = 0;
    let currentCtaY = 0;

    const handleMouseMove = (e) => {
      mx = e.clientX;
      my = e.clientY;
      
      if (spotlightRef.current) {
        spotlightRef.current.style.background = `radial-gradient(circle 800px at ${mx}px ${my}px, rgba(255,255,255,0.03), transparent 40%)`;
      }
      
      if (ctaRef.current) {
        const rect = ctaRef.current.getBoundingClientRect();
        const btnCenterX = rect.left + rect.width / 2 - currentCtaX;
        const btnCenterY = rect.top + rect.height / 2 - currentCtaY;
        const dist = Math.hypot(mx - btnCenterX, my - btnCenterY);

        if (dist < 80) {
          isHoveringCta.current = true;
          targetCtaX = (mx - btnCenterX) * 0.3;
          targetCtaY = (my - btnCenterY) * 0.3;
          ctaRef.current.style.transition = 'none';
        } else {
          if (isHoveringCta.current) {
            isHoveringCta.current = false;
            targetCtaX = 0;
            targetCtaY = 0;
            ctaRef.current.style.transition = 'transform 0.2s cubic-bezier(0.2, 0, 0.2, 1)';
            ctaRef.current.style.transform = `translate(0px, 0px)`;
          }
        }
      }
    };

    window.addEventListener('mousemove', handleMouseMove);

    const renderLoop = () => {
      if (isHoveringCta.current && ctaRef.current) {
        currentCtaX += (targetCtaX - currentCtaX) * 0.2;
        currentCtaY += (targetCtaY - currentCtaY) * 0.2;
        ctaRef.current.style.transform = `translate(${currentCtaX}px, ${currentCtaY}px)`;
      }
      animationFrameId = requestAnimationFrame(renderLoop);
    };
    renderLoop();

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  const handleCtaClick = () => {
    window.scrollTo({
      top: document.documentElement.scrollHeight * HERO_END,
      behavior: 'smooth'
    });
  };

  const projectIndex = displayedProjectIndex !== -1 ? displayedProjectIndex : (activeProjectIndex !== -1 ? activeProjectIndex : 1);
  const project = PROJECTS[projectIndex];

  return (
    <div className="app-wrapper">
      {!isLoaded && (
        <div className="loading-screen" style={{
           position: 'fixed', inset: 0, zIndex: 9999, 
           backgroundColor: '#050505', display: 'flex', flexDirection: 'column',
           alignItems: 'center', justifyContent: 'center', color: '#E2A84B',
           fontFamily: 'var(--font-mono)'
        }}>
           <div style={{ fontSize: '11px', marginBottom: '1.5rem', letterSpacing: '0.1em' }}>{loadingMsg}</div>
           <div style={{ width: '200px', height: '1px', background: 'rgba(255,255,255,0.1)', position: 'relative' }}>
              <div style={{ position: 'absolute', top: 0, left: 0, width: `${loadingPercent}%`, height: '100%', background: '#E2A84B', transition: 'width 0.2s linear' }}></div>
           </div>
        </div>
      )}

      <CanvasLayer 
        onAboutClick={() => setAboutOpen(prev => !prev)}
        onLoadingUpdate={(msg, percent) => {
          setLoadingMsg(msg);
          setLoadingPercent(percent);
          if (percent >= 100) {
             setTimeout(() => setIsLoaded(true), 500);
          }
        }} 
      />

      <div className="vignette-overlay"></div>

      <div className="telemetry-nav">
        <div className="nav-brand">RAGHAV BAHUKHANDI</div>
        <div className="nav-ticker" ref={tickerRef}></div>
        <div className="nav-links desktop-only">
          <a href="https://github.com/PandaBean18" target="_blank" rel="noreferrer"><span>[ GITHUB ]</span></a>
          <a href="https://www.linkedin.com/in/raghav-bahukhandi/" target="_blank" rel="noreferrer"><span>[ LINKEDIN ]</span></a>
          <a href="https://drive.google.com/file/d/1h8O-YmPzeYOBgt4vELoZD8Ofh7Lg-RaE/view?usp=sharing" target="_blank" rel="noreferrer"><span>[ RESUME ]</span></a>
        </div>
        <div className="nav-hamburger mobile-only" onClick={() => setMenuOpen(!menuOpen)}>
          [ MENU ]
        </div>
      </div>
      
      {menuOpen && (
        <div className="mobile-menu">
          <a href="https://github.com/PandaBean18" target="_blank" rel="noreferrer"><span>GITHUB</span></a>
          <a href="https://www.linkedin.com/in/raghav-bahukhandi/" target="_blank" rel="noreferrer"><span>LINKEDIN</span></a>
          <a href="https://drive.google.com/file/d/1h8O-YmPzeYOBgt4vELoZD8Ofh7Lg-RaE/view?usp=sharing" target="_blank" rel="noreferrer"><span>RESUME</span></a>
        </div>
      )}

      <div className={`about-panel ${aboutOpen ? 'open' : ''}`}>
        <div className="about-panel-close" onClick={() => setAboutOpen(false)}>[ CLOSE ]</div>
        <div className="about-panel-content">
          <h2 className="about-title">SIR PIXELOT ON THE EDGE</h2>
          <div className="about-subtitle">MEMORY BANDWIDTH VS. COMPUTE ON A SUB-$1 FPGA</div>
          
          <div className="about-section">
            <h3>[ THE PREMISE ]</h3>
            <p>Sir Pixelot is an on-device AI pixel art generator. The goal was to run a neural network inference engine capable of generating 32x32 images dynamically on extreme budget hardware. Deployed on the <strong>Shrike Lite</strong> (~400rs), featuring a Raspberry Pi Pico (RP2040) and a ForgeFPGA (SLG47910V).</p>
            <p>To push the hardware boundaries, we offloaded the Multiply-Accumulate (MAC) operations from the host MCU to the FPGA, building a dual-channel MAC unit entirely out of raw LUTs (without hard DSP blocks or BRAM) on a glorified CPLD.</p>
          </div>

          <div className="about-section">
            <h3>[ THE CORE BOTTLENECK ]</h3>
            <p>Executing a neural network is fundamentally an exercise in data movement. Our architecture ran into a rigorous systems-level bottleneck:</p>
            <p><strong>The Arithmetic Intensity Trap:</strong> Hardware acceleration only works when the cost of moving data is lower than the time saved computing. Because the FPGA lacks memory to store weights or cache intermediate activations, we had to stream every single operand over a bit-banged SPI bus from the RP2040. We paid a massive latency penalty for every operation.</p>
            <p>The generated images on this grid exhibit heavy noise artifacts due to the aggressive quantization errors and activation precision loss necessary to fit the math within the tiny LUT budget.</p>
          </div>

          <div className="about-section">
            <h3>[ BENCHMARKS ]</h3>
            <ul>
              <li><strong>MCU Only (RP2040):</strong> 74 seconds / image</li>
              <li><strong>FPGA (1 MAC Unit):</strong> ~140 seconds / image</li>
              <li><strong>FPGA (2 MAC Units):</strong> 220 seconds / image</li>
            </ul>
            <p>This illustrates the "Memory Wall." The internal math on the FPGA is fully parallelized and executes instantaneously. The bottleneck lies entirely in the data transfer rate.</p>
          </div>

          <div className="about-section">
            <h3>[ FUTURE ARCHITECTURE ]</h3>
            <p>To truly unleash the FPGA, future iterations must address I/O starvation:</p>
            <ul>
              <li><strong>RP2040 PIO/DMA:</strong> Offloading SPI communication to hardware would eliminate CPU delay loops.</li>
              <li><strong>Weight Caching:</strong> A tiny register file on the FPGA to reuse values across MAC cycles would slash bus traffic dramatically.</li>
            </ul>
            <p>In AI hardware, compute is cheap, moving the data is what costs you.</p>
          </div>
        </div>
      </div>

      <div className="hero-typography-layer" ref={typographyRef}>
        <div className="hero-left-column">
          <div className="hero-sub-tag">{`{ SELECTED WORKS // 2024—2026 }`}</div>
          <h1 className="hero-headline">
            APPS &<br/>SYSTEMS
          </h1>
          <div className="discipline-stack">
            <div>[ 01 ] FULLSTACK APPS</div>
            <div>[ 02 ] MACHINE LEARNING</div>
            <div>[ 03 ] EMBEDDED SYSTEMS</div>
          </div>
          <div className="hero-cta" ref={ctaRef} onClick={handleCtaClick}>
            [ SCROLL TO INDEX &darr; ]
          </div>
        </div>
      </div>

      <div className="dossier-overlay" ref={dossierRef}>
        <div className="dossier-left-stage"></div>
        <div className="dossier-right-stage">
          <div className="dossier-category">{`{ N.${project.id} // ${project.category} }`}</div>
          <div className="dossier-title">{project.title}</div>
          <div className="dossier-summary">{project.summary}</div>
          
          <div className="dossier-table">
            {project.metrics.map((m, i) => (
              <React.Fragment key={i}>
                <div className="dossier-table-label">{m.label}</div>
                <div className="dossier-table-value">{m.value}</div>
              </React.Fragment>
            ))}
          </div>

          {project.links.demo && (
            <a href={project.links.demo} target="_blank" rel="noreferrer" className="dossier-action" style={{marginBottom: '1rem'}}>
              [ LAUNCH DEMO ↗ ]
            </a>
          )}
          {project.links.github && (
            <a href={project.links.github} target="_blank" rel="noreferrer" className="dossier-action">
              [ VIEW REPOSITORY ↗ ]
            </a>
          )}
        </div>
      </div>

    </div>
  );
}

export default App;
