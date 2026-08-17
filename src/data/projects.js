// src/data/projects.js

export const PROJECTS = [
  {
    id: "01",
    title: "SIR PIXELOT",
    subtitle: "Hardware-Accelerated Diffusion Engine",
    category: "EMBEDDED / FPGA",
    summary: "Quantized INT4 generative diffusion pipeline executing directly on deterministic SRAM FPGA silicon with sub-2ms latency.",
    metrics: [
      { label: "HARDWARE", value: "Shrike Lite FPGA" },
      { label: "MEMORY", value: "246 KB SRAM" },
      { label: "OUTPUT", value: "32×32 RGB" }
    ],
    targetAnchor: "CENTER",
    previewImage: null,
    type: "matrix_hub",
    links: { github: null, demo: null, article: true }
  },
  {
    id: "02",
    title: "REPO RECALL",
    subtitle: "Local RAG Codebase Intelligence Engine",
    category: "AI/ML / SYSTEMS",
    summary: "Air-gapped, privacy-first developer search engine that vectorizes and links local repositories in real-time via on-device LLMs and low-latency embeddings.",
    metrics: [
      { label: "STACK", value: "Python, FastAPI" },
      { label: "DATABASE", value: "ChromaDB" },
      { label: "MODELS", value: "Local LLMs" }
    ],
    targetAnchor: "TOP_LEFT",
    previewImage: "https://raw.githubusercontent.com/PandaBean18/repo-recall/refs/heads/main/demo/demo_img1.png",
    type: "case_study",
    links: { github: "https://github.com/PandaBean18/repo-recall", demo: null }
  },
  {
    id: "03",
    title: "SMART DISPATCH",
    subtitle: "Edge-Native Semantic Context Agent",
    category: "EDGE AI / EXTENSIONS",
    summary: "Client-side intent parser scanning active communication drafts with an on-device quantized ONNX model to inject relevant assets based on semantic context.",
    metrics: [
      { label: "STACK", value: "Python, JavaScript" },
      { label: "FRAMEWORK", value: "ONNX, PyTorch" },
      { label: "PLATFORM", value: "Chrome Extension" }
    ],
    targetAnchor: "TOP_RIGHT",
    previewImage: "https://res.cloudinary.com/dopflwqoq/image/upload/v1786995095/Screenshot_From_2026-08-17_23-01-32_ii9zib.png",
    type: "case_study",
    links: { github: "https://github.com/PandaBean18/smart-dispatch", demo: null }
  },
  {
    id: "04",
    title: "4-BIT ALU",
    subtitle: "Discrete Logic Arithmetic Unit",
    category: "HARDWARE / DIGITAL LOGIC",
    summary: "Hardware-level arithmetic logic unit constructed with discrete logic components, executing binary arithmetic and bitwise operations.",
    metrics: [
      { label: "TYPE", value: "4-Bit Digital Logic" },
      { label: "COMPONENTS", value: "Logic ICs, Breadboard" },
      { label: "OPERATIONS", value: "Add, Subtract, Logic" }
    ],
    targetAnchor: "BOTTOM_LEFT",
    previewImage: "https://res.cloudinary.com/dopflwqoq/image/upload/v1786995047/Screenshot_From_2026-08-17_23-09-24_qwnere.png",
    type: "case_study",
    links: { github: null, demo: "https://drive.google.com/file/d/1UpyReJ1hM5WCXvqWb2X1ImBCIMPTFEUE/view?usp=sharing" }
  },
  {
    id: "05",
    title: "MUSIC PLAYER",
    subtitle: "Custom Hardware Audio System",
    category: "HARDWARE / EMBEDDED",
    summary: "Dedicated standalone microcontroller-based audio playback unit featuring direct digital audio decoding, custom PCB routing, and tactile I/O.",
    metrics: [
      { label: "HARDWARE", value: "Microcontroller, Custom PCB" },
      { label: "STORAGE", value: "SD / Flash Storage" },
      { label: "CONTROLS", value: "Rotary Encoder, Display" }
    ],
    targetAnchor: "BOTTOM_RIGHT",
    previewImage: "https://res.cloudinary.com/dopflwqoq/image/upload/v1786995226/music_player_ilb9lc.jpg",
    type: "case_study",
    links: { github: null, demo: "https://drive.google.com/file/d/1XblMBLoof8jlR5YRZz6FHdNA3-G5TvT4/view?usp=drive_link" }
  },
  {
    id: "06",
    title: "muCLI",
    subtitle: "Terminal-Native Audio Streamer",
    category: "SYSTEMS / CLI",
    summary: "Lightweight command-line interface streaming real-time audio with low-overhead YouTube and Spotify pipeline integration, lyrics synchronization, and zero-GUI footprint.",
    metrics: [
      { label: "STACK", value: "Python" },
      { label: "INTEGRATIONS", value: "YouTube API, Spotify API" },
      { label: "STARS", value: "24 on GitHub" }
    ],
    targetAnchor: "TOP_LEFT",
    previewImage: "https://raw.githubusercontent.com/PandaBean18/muCLI/refs/heads/main/demoImg.png",
    type: "case_study",
    links: { github: "https://github.com/PandaBean18/muCLI", demo: null }
  },
  {
    id: "07",
    title: "BLACKSALT",
    subtitle: "Zero-Trace Ephemeral Vault",
    category: "WEB / SECURITY",
    summary: "Strict zero-persistence storage utility enforcing automated data destruction after 5 minutes.",
    metrics: [
      { label: "STACK", value: "TypeScript, Next.js" },
      { label: "DATABASE", value: "Firebase" },
      { label: "LIFECYCLE", value: "5-Minute Expiry" }
    ],
    targetAnchor: "BOTTOM_LEFT",
    previewImage: "https://res.cloudinary.com/dopflwqoq/image/upload/v1786995070/Screenshot_From_2026-08-17_23-06-18_fi52pt.png",
    type: "case_study",
    links: { github: "https://github.com/PandaBean18/blacksalt", demo: null }
  },
  {
    id: "08",
    title: "COLD DINO",
    subtitle: "AI Outreach Assistant",
    category: "APPLIED AI / WEB",
    summary: "Contextual generative outreach assistant tailored for job seekers, students, and freelancers to personalize cold emails.",
    metrics: [
      { label: "STACK", value: "TypeScript, Next.js" },
      { label: "DATABASE", value: "Firebase" },
      { label: "AI", value: "LLM Email Generation" }
    ],
    targetAnchor: "BOTTOM_RIGHT",
    previewImage: "https://res.cloudinary.com/dopflwqoq/image/upload/v1786995130/Screenshot_From_2026-08-17_22-57-01_vsdijk.png",
    type: "case_study",
    links: { github: "https://github.com/PandaBean18/coldDino", demo: null }
  }
];

export const HERO_END = 0.04;
export const CASE_STUDY_START = 0.09;
export const PHASE_LENGTH = (1.0 - CASE_STUDY_START) / (PROJECTS.length - 1); // For projects 02-08

export function getProjectScrollState(scrollProgress, projectIndex) {
  // projectIndex from 1 to 7 (Projects 02 to 08)
  const base = CASE_STUDY_START + (projectIndex - 1) * PHASE_LENGTH;
  const dollyPhase = [base, base + PHASE_LENGTH * 0.25];
  const revealPhase = [base + PHASE_LENGTH * 0.25, base + PHASE_LENGTH * 0.50];
  const holdPhase = [base + PHASE_LENGTH * 0.50, base + PHASE_LENGTH * 0.85];
  const exitPhase = [base + PHASE_LENGTH * 0.85, base + PHASE_LENGTH];
  
  return { dollyPhase, revealPhase, holdPhase, exitPhase };
}
