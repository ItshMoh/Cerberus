'use client';

import React, { useState } from 'react';
import { motion } from 'motion/react';
import Link from 'next/link';

const WavyLogo = ({ className = "w-24 h-24", color = "#1a1a1a", bgColor = "var(--bg-light)" }: { className?: string; color?: string; bgColor?: string }) => (
  <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="50" cy="50" r="48" fill="transparent" stroke={color} strokeWidth="2" />
    <clipPath id="circle-clip">
      <circle cx="50" cy="50" r="48" />
    </clipPath>
    <g clipPath="url(#circle-clip)">
      {[18, 34, 50, 66, 82].map((x, i) => (
        <path key={i} d={`M ${x} -10 Q ${x+8} 25 ${x} 50 T ${x} 110`} stroke={color} strokeWidth="8" fill="none" strokeLinecap="round" />
      ))}
    </g>
    <rect x="34" y="35" width="32" height="30" fill={bgColor} />
    <text x="50" y="56" fontSize="24" fontFamily="serif" textAnchor="middle" fill={color} letterSpacing="1">AI</text>
  </svg>
);

const DarkGridOverlay = () => (
  <div className="absolute inset-0 pointer-events-none z-0 flex justify-center">
    <div className="w-full max-w-[1440px] h-full relative border-x border-white/5">
      <div className="absolute inset-0 flex justify-between">
        {[...Array(6)].map((_, i) => (
          <div key={`v-${i}`} className="w-[1px] h-full bg-white/5" />
        ))}
      </div>
      <div className="absolute inset-0 flex flex-col justify-between">
        {[...Array(6)].map((_, i) => (
          <div key={`h-${i}`} className="h-[1px] w-full bg-white/5" />
        ))}
      </div>
      <div className="absolute top-[16.66%] left-[16.66%] w-[16.66%] h-[16.66%] bg-wavy-dark opacity-30" />
      <div className="absolute top-[50%] right-[16.66%] w-[16.66%] h-[16.66%] bg-dotted-dark opacity-30" />
      <div className="absolute bottom-[16.66%] left-[33.33%] w-[16.66%] h-[16.66%] bg-wavy-dark opacity-30" />
    </div>
  </div>
);

const TextStream = ({ text, delay = 0, className = "", animateOnView = false }: { text: string; delay?: number; className?: string; animateOnView?: boolean }) => {
  const words = text.split(" ");
  return (
    <span className={className}>
      {words.map((word, i) => {
        const animationProps = animateOnView
          ? { initial: { opacity: 0, y: 10 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true } }
          : { initial: { opacity: 0, y: 10 }, animate: { opacity: 1, y: 0 } };

        return (
          <motion.span
            key={i}
            className="inline-block mr-[0.25em]"
            {...animationProps}
            transition={{ duration: 0.4, delay: delay + i * 0.05 }}
          >
            {word}
          </motion.span>
        );
      })}
    </span>
  );
};

const GridOverlay = () => {
  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden flex justify-center">
      <div className="w-full max-w-[1440px] h-full relative border-x border-black/5">
        <div className="absolute inset-0 flex justify-between">
          {[...Array(6)].map((_, i) => (
            <motion.div
              key={`v-${i}`}
              className="w-[1px] h-full bg-black/5"
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{ duration: 1.5, delay: 0.2 + i * 0.1, ease: "easeInOut" }}
              style={{ transformOrigin: "top" }}
            />
          ))}
        </div>
        <div className="absolute inset-0 flex flex-col justify-between">
          {[...Array(8)].map((_, i) => (
            <motion.div
              key={`h-${i}`}
              className="h-[1px] w-full bg-black/5"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 1.5, delay: 0.5 + i * 0.1, ease: "easeInOut" }}
              style={{ transformOrigin: "left" }}
            />
          ))}
        </div>

        <motion.div className="absolute top-[14.28%] right-[16.66%] w-[16.66%] h-[14.28%] bg-wavy" initial={{opacity:0}} animate={{opacity:1}} transition={{delay: 1}} />
        <motion.div className="absolute top-[42.84%] left-[0%] w-[16.66%] h-[14.28%] bg-dotted" initial={{opacity:0}} animate={{opacity:1}} transition={{delay: 1.2}} />
        <motion.div className="absolute bottom-[28.56%] right-[0%] w-[16.66%] h-[14.28%] bg-wavy" initial={{opacity:0}} animate={{opacity:1}} transition={{delay: 1.4}} />
        <motion.div className="absolute top-[57.12%] right-[33.33%] w-[16.66%] h-[14.28%] bg-dotted" initial={{opacity:0}} animate={{opacity:1}} transition={{delay: 1.6}} />
      </div>
    </div>
  );
};

const Navbar = () => {
  return (
    <motion.nav
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.2 }}
      className="flex items-center justify-between px-6 py-4 border-b border-black/5 relative z-20 bg-[var(--bg-light)]/80 backdrop-blur-sm max-w-[1440px] mx-auto"
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.2 }}
        className="hidden md:flex items-center text-[10px] font-mono tracking-widest relative px-8 py-3 -ml-4"
      >
        <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-black/30" />
        <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-black/30" />
        <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-black/30" />
        <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-black/30" />

        <div className="flex items-center gap-6">
          <Link href="/" className="hover:text-[#ff5a1f] transition-colors">HOME</Link>
          <Link href="/dashboard" className="hover:text-[#ff5a1f] transition-colors">DASHBOARD</Link>
          <Link href="/dashboard/vaults" className="hover:text-[#ff5a1f] transition-colors">VAULTS</Link>
          <Link href="/dashboard/audit-log" className="hover:text-[#ff5a1f] transition-colors">AUDIT LOG</Link>
          <Link href="/dashboard/settings" className="hover:text-[#ff5a1f] transition-colors">SETTINGS</Link>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.6 }}
        className="flex items-center space-x-3 absolute left-1/2 -translate-x-1/2"
      >
        <WavyLogo className="w-10 h-10" color="#1a1a1a" bgColor="var(--bg-light)" />
        <span className="text-3xl font-serif tracking-tight mt-1">Cerberus<sup className="text-[10px] ml-0.5">&reg;</sup></span>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.6 }}
        className="flex items-center space-x-4"
      >
        <Link href="/dashboard" className="hidden md:block bg-[#ff5a1f] text-white text-[10px] font-mono tracking-widest px-6 py-3.5 relative group overflow-hidden">
          <span className="relative z-10">LAUNCH APP</span>
          <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-white/50 m-1" />
          <motion.div
            className="absolute inset-0 bg-white/20"
            initial={{ x: "-100%" }}
            whileHover={{ x: "100%" }}
            transition={{ duration: 0.5 }}
          />
        </Link>
      </motion.div>
    </motion.nav>
  );
};

const Hero = () => {
  return (
    <div className="relative pt-24 pb-12 px-6 md:px-12 max-w-[1440px] mx-auto z-10">
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        <div className="md:col-span-7 lg:col-span-8">
          <motion.h1
            className="text-6xl md:text-[5.5rem] lg:text-[7rem] font-serif leading-[0.85] tracking-tight text-[#1a1a1a] mb-12"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.5 }}
          >
            <TextStream text="The Intelligent Keeper for Proactive DeFi Management" delay={1.8} />
          </motion.h1>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2 }}
          >
            <Link href="/dashboard" className="text-[10px] font-mono tracking-widest uppercase border-b border-black/20 pb-1 hover:border-black transition-colors">
              Enter Dashboard &rarr;
            </Link>
          </motion.div>
        </div>

        <div className="md:col-span-5 lg:col-span-4 flex flex-col justify-end space-y-16 pb-8 relative">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 3 }}
            className="absolute top-0 right-0 text-[10px] font-mono tracking-widest uppercase text-right opacity-60 hidden md:block"
          >
            AI that reads the<br/>pulse of data
          </motion.div>

          <div className="relative mt-16">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 2.8 }}
              className="text-sm text-black/70 leading-relaxed max-w-xs"
            >
              AI that detects hidden signals, traces complex data chains, and transforms chaotic information streams into clear, actionable intelligence.
            </motion.div>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 2 }}
              className="absolute -left-24 -top-12 opacity-20 hidden lg:block"
            >
              <svg width="60" height="120" viewBox="0 0 60 120" fill="none" xmlns="http://www.w3.org/2000/svg">
                {[...Array(8)].map((_, i) => (
                  <path key={i} d={`M0 ${10 + i*15} Q 15 ${0 + i*15}, 30 ${10 + i*15} T 60 ${10 + i*15}`} stroke="black" fill="transparent"/>
                ))}
              </svg>
            </motion.div>
          </div>
        </div>
      </div>

      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.8, delay: 1.5 }}
        className="absolute top-[30%] right-[35%] w-12 h-3 bg-[#f5a623] origin-left hidden md:block"
      />
      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ duration: 0.8, delay: 1.7 }}
        className="absolute bottom-[20%] left-[20%] w-16 h-3 bg-[#c2c2a3] origin-left hidden md:block"
      />
    </div>
  );
};

const NetworkSection = () => {
  const [nodes] = useState<{id: number; initialAngle: number; radius: number; speed: number; distance: number; dotRadius: number}[]>(() =>
    Array.from({ length: 50 }).map((_, i) => {
      const initialAngle = (i / 50) * 360;
      const radius = 100 + Math.random() * 250;
      const speed = 0.3 + Math.random() * 1.2;
      const distance = Math.random() > 0.5 ? 80 : -80;
      const dotRadius = 1 + Math.random() * 2;
      return { id: i, initialAngle, radius, speed, distance, dotRadius };
    })
  );

  return (
    <div className="relative w-full h-[700px] bg-[var(--bg-dark)] overflow-hidden flex items-center justify-center border-y border-black/10 mt-24">
      <DarkGridOverlay />

      <svg className="absolute inset-0 w-full h-full z-10" viewBox="-500 -500 1000 1000" preserveAspectRatio="xMidYMid slice">
        <g>
          {nodes.map(node => (
            <motion.g
              key={node.id}
              initial={{ rotate: node.initialAngle }}
              animate={{ rotate: node.initialAngle + 360 }}
              transition={{ duration: 60 / node.speed, repeat: Infinity, ease: "linear" }}
            >
              <motion.line
                x1="0" y1="0"
                stroke="rgba(255,255,255,0.15)"
                strokeWidth="1"
                animate={{ x2: [node.radius, node.radius + node.distance, node.radius] }}
                transition={{ duration: 8 / node.speed, repeat: Infinity, ease: "easeInOut" }}
              />
              <motion.circle
                cy="0"
                r={node.dotRadius}
                fill="rgba(255,255,255,0.5)"
                animate={{ cx: [node.radius, node.radius + node.distance, node.radius] }}
                transition={{ duration: 8 / node.speed, repeat: Infinity, ease: "easeInOut" }}
              />
            </motion.g>
          ))}
        </g>
      </svg>

      <div className="relative z-20 flex items-center justify-center">
        <WavyLogo className="w-32 h-32" color="#dcdcd0" bgColor="#413e35" />
      </div>

      <div className="absolute bottom-24 right-8 md:right-24 max-w-lg z-20">
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
          className="text-white/90 text-2xl md:text-3xl font-serif leading-tight"
        >
          Cerberus continuously monitors information flows, detects hidden signals, and maps complex relationships across fragmented data sources.
        </motion.p>
      </div>
    </div>
  );
};

const Features = () => {
  const features = [
    {
      title: "Signal Detection",
      desc: "Cerberus identifies meaningful signals within massive streams of unstructured data, filtering noise to reveal what truly matters.",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6 text-white" stroke="currentColor" strokeWidth="2">
          <path d="M8 4v16M16 4v16M4 12l16-4" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )
    },
    {
      title: "Connection Mapping",
      desc: "Our AI traces hidden relationships across datasets, uncovering chains, dependencies, and invisible links.",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6 text-white" stroke="currentColor" strokeWidth="2">
          <circle cx="18" cy="6" r="3" />
          <circle cx="6" cy="18" r="3" />
          <circle cx="6" cy="6" r="3" />
          <line x1="8.12" y1="8.12" x2="15.88" y2="15.88" />
          <line x1="8.12" y1="15.88" x2="15.88" y2="8.12" />
        </svg>
      )
    },
    {
      title: "Pattern Intelligence",
      desc: "Cerberus continuously analyzes data dynamics to detect emerging patterns, anomalies, and behavioral shifts.",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6 text-white" stroke="currentColor" strokeWidth="2">
          <rect x="4" y="4" width="6" height="6" fill="currentColor" />
          <rect x="14" y="4" width="6" height="6" fill="currentColor" />
          <rect x="4" y="14" width="6" height="6" fill="currentColor" />
        </svg>
      )
    },
    {
      title: "Real-Time Awareness",
      desc: "Stay ahead with continuous monitoring that delivers insights as signals evolve, not after the fact.",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6 text-white" stroke="currentColor" strokeWidth="2">
          <path d="M2 12 Q 7 2, 12 12 T 22 12" strokeLinecap="round" strokeLinejoin="round"/>
          <path d="M2 16 Q 7 6, 12 16 T 22 16" strokeLinecap="round" strokeLinejoin="round" opacity="0.5"/>
        </svg>
      )
    }
  ];

  return (
    <div className="py-24 px-6 md:px-12 max-w-[1440px] mx-auto relative z-10 border-t border-black/10">
      <div className="absolute top-0 right-[20%] w-32 h-32 opacity-20 pointer-events-none">
        <svg width="100%" height="100%" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
          {[...Array(6)].map((_, i) => (
            <path key={i} d={`M0 ${10 + i*15} Q 25 ${0 + i*15}, 50 ${10 + i*15} T 100 ${10 + i*15}`} stroke="black" fill="transparent" strokeWidth="1"/>
          ))}
        </svg>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-24">
        <div>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl md:text-6xl font-serif tracking-tight leading-[1.1]"
          >
            Built to understand complex information systems
          </motion.h2>
        </div>
        <div className="flex items-end">
          <motion.p
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-sm text-black/70 leading-relaxed max-w-md"
          >
            Every digital system has a pulse. Signals flow continuously, creating patterns, connections, and subtle shifts that reveal how information truly behaves. Cerberus listens to this pulse in real time, translating complex data movements into clear insight that helps you understand what is happening beneath the surface.
          </motion.p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-8 gap-y-16">
        {features.map((f, i) => (
          <div key={i} className="relative">
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              whileInView={{ scale: 1, opacity: 1 }}
              viewport={{ once: true }}
              transition={{
                type: "spring",
                stiffness: 200,
                damping: 20,
                delay: i * 0.15
              }}
              className="w-12 h-12 bg-[#ff5a1f] flex items-center justify-center mb-6 shadow-lg"
            >
              {f.icon}
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 + i * 0.15 }}
            >
              <h3 className="text-xl font-serif mb-3">{f.title}</h3>
              <p className="text-sm text-black/70 leading-relaxed">{f.desc}</p>
            </motion.div>

            <div className="absolute -left-4 top-0 w-[1px] h-full bg-black/5 hidden md:block" />
          </div>
        ))}
      </div>
    </div>
  );
};

const Footer = () => (
  <footer className="py-12 px-6 md:px-12 border-t border-black/10 max-w-[1440px] mx-auto relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
    <div className="flex items-center gap-3">
      <WavyLogo className="w-8 h-8" color="#1a1a1a" bgColor="var(--bg-light)" />
      <span className="font-serif text-xl tracking-tight">Cerberus</span>
    </div>
    <div className="flex gap-8 text-[10px] font-mono tracking-widest uppercase">
      <a href="#" className="hover:text-[#ff5a1f] transition-colors">Built on Hedera</a>
      <a href="#" className="hover:text-[#ff5a1f] transition-colors">Powered by Cerberus</a>
      <a href="#" className="hover:text-[#ff5a1f] transition-colors">GitHub</a>
      <a href="#" className="hover:text-[#ff5a1f] transition-colors">Docs</a>
    </div>
  </footer>
);

export default function LandingPage() {
  return (
    <div className="min-h-screen relative selection:bg-[#ff5a1f] selection:text-white bg-[var(--bg-light)] text-[#1a1a1a]">
      <GridOverlay />
      <Navbar />
      <Hero />
      <NetworkSection />
      <Features />
      <Footer />
    </div>
  );
}
