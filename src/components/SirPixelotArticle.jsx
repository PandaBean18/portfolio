import React from 'react';
import { Link } from 'react-router-dom';

const SirPixelotArticle = () => {
  return (
    <div className="article-page">
      <div className="telemetry-nav">
        <div className="nav-brand">SIR PIXELOT</div>
        <div className="nav-links desktop-only">
          <Link to="/"><span>[ PORTFOLIO ]</span></Link>
          <a href="https://github.com/PandaBean18/sir-pixelot" target="_blank" rel="noreferrer"><span>[ REPO ]</span></a>
        </div>
        <div className="nav-hamburger mobile-only">
          <Link to="/">[ PORTFOLIO ]</Link>
        </div>
      </div>

      <div className="article-container">
        <h1 className="article-title">A Case Study in Memory Bandwidth vs. Compute on a Sub-$1 FPGA</h1>
        
        <img src="/sir-pixelot/img1.png" alt="Generated Pixel Art 1" className="article-hero-img" />

        <h2 className="article-section-title">The Premise: Sir Pixelot on the Edge</h2>
        <p className="article-body">
          Sir Pixelot is an on-device AI pixel art generator. The goal was to run a neural network inference engine capable of generating 32x32 images dynamically on extreme budget hardware. We deployed this on the <strong>Shrike Lite</strong>, an ultra-affordable development board (~$4) featuring a Raspberry Pi Pico (RP2040) and a ForgeFPGA (SLG47910V). 
        </p>
        <p className="article-body">
          To push the hardware boundaries, we offloaded the Multiply-Accumulate (MAC) operations from the host MCU to the FPGA. Building a functioning dual-channel MAC unit entirely out of raw LUTs (without hard DSP blocks or BRAM) on a glorified CPLD like the ForgeFPGA is legitimately difficult digital design work, and we successfully achieved an end-to-end integration: MCU -&gt; bitstream flashing -&gt; custom bus protocol -&gt; custom Verilog compute core -&gt; output reconstruction.
        </p>

        <div className="article-image-grid">
          <img src="/sir-pixelot/img2.png" alt="Generated Pixel Art 2" className="article-inline-img" />
          <img src="/sir-pixelot/img3.png" alt="Generated Pixel Art 3" className="article-inline-img" />
        </div>

        <h2 className="article-section-title">The Core Engineering Flaws (The Reality)</h2>
        <p className="article-body">
          However, executing a neural network is not just about raw compute it is fundamentally an exercise in data movement. Our architecture ran into several rigorous systems-level bottlenecks:
        </p>

        <ul className="article-list">
          <li><strong>The Arithmetic Intensity Trap:</strong> Hardware acceleration works only when the cost of moving data to the accelerator is lower than the time saved computing on it. Because the SLG47910V lacks memory to store weights or cache intermediate activations, we were forced to stream every single operand over the wire. We paid a massive bus latency penalty for every single arithmetic operation.</li>
          <li><strong>The I/O Architecture:</strong> To avoid conflicts with the FPGA programming pins, we relied on bit-banged SPI in software on the RP2040. This forced the 133 MHz CPU to stall inside artificial delay loops just to send bytes and prevent breadboard crosstalk.</li>
          <li><strong>Data Flow &amp; Scaling:</strong> While our Verilog core successfully broadcasted activations to two parallel MAC units, the lack of on-chip weight caching meant the host MCU still had to serialize and stream the weights over the bottlenecked SPI bus for every pass.</li>
          <li><strong>Output Quality &amp; Quantization:</strong> The generated images exhibit heavy noise artifacts. This points to the aggressive quantization errors and activation precision loss necessary to fit the math within the tiny LUT budget of the ForgeFPGA.</li>
        </ul>

        <img src="/sir-pixelot/img4.png" alt="Generated Pixel Art 4" className="article-inline-img full-width" />

        <h2 className="article-section-title">The Benchmarks and The Lesson</h2>
        <p className="article-body">
          When evaluating the full image generation pipeline, the benchmarks were:
        </p>
        <ul className="article-list">
          <li><strong>MCU Only (RP2040):</strong> 74 seconds per image</li>
          <li><strong>FPGA with 1 MAC Unit:</strong> ~140 seconds per image</li>
          <li><strong>FPGA with 2 MAC Units:</strong> 220 seconds per image</li>
        </ul>
        <p className="article-body">
          Rather than viewing the slower FPGA times as a failure of compute, this project stands as a textbook illustration of the "Memory Wall." The internal math on the FPGA is fully parallelized and executes instantaneously. The bottleneck lies entirely in the data transfer rate.
        </p>

        <h2 className="article-section-title">Future Architectural Fixes</h2>
        <p className="article-body">
          To truly unleash the FPGA, future iterations must address the I/O starvation:
        </p>
        <ul className="article-list">
          <li><strong>Utilize RP2040 PIO/DMA:</strong> Offloading the SPI communication to the RP2040's Programmable I/O (PIO) and DMA engines would push hardware-timed serial data without CPU intervention, freeing the MCU compute and eliminating software delay loops. Furthermore, hardware SPI pins could be re-muxed after bitstream flashing.</li>
          <li><strong>Weight Caching:</strong> Implementing even a tiny 4-to-8 entry register file on the FPGA to reuse values across MAC cycles would slash bus traffic dramatically, shifting the arithmetic intensity in favor of the accelerator.</li>
        </ul>
        
        <p className="article-body">
          This project successfully proved its core thesis: you can build and deploy a functional, parallelized AI inference core on a ~$4 Shrike Lite board. But it also proved that in AI hardware, compute is cheap moving the data is what costs you.
        </p>
        
        <div className="article-footer">
          <Link to="/" className="hero-cta" style={{position: 'relative', display: 'inline-block'}}>[ RETURN TO INDEX ]</Link>
        </div>
      </div>
    </div>
  );
};

export default SirPixelotArticle;
