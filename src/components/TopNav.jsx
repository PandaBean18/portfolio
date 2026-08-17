import React from 'react';

const TopNav = () => {
  return (
    <nav className="top-nav">
      <div className="nav-left">SIR PIXELOT</div>
      <div className="nav-center">
        SYS_ACTIVE // 32×32 RGB // 120 TILES
      </div>
      <div className="nav-right">
        <a className="nav-link" href="#canvas">[ CANVAS ]</a>
        <a className="nav-link" href="#hardware">[ HARDWARE ]</a>
        <a className="nav-link" href="#about">[ ABOUT ]</a>
      </div>
    </nav>
  );
};

export default TopNav;
