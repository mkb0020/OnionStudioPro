// src/ui/OpeningAnimation.jsx
import { useState, useEffect, useRef } from "react";

const VIRTUAL_W = 1920;
const VIRTUAL_H = 1080;

// Color palette from your brand
const COLORS = ['#c4b5fd', '#830cde', '#00ffff', '#58e84c'];

class ExplosionSprite {
  constructor(x, y, spriteSheet, frameWidth, frameHeight, totalFrames, scale = 1, frameDuration = 1) {
    this.x = x;
    this.y = y;
    this.spriteSheet = spriteSheet;
    this.frameWidth = frameWidth;
    this.frameHeight = frameHeight;
    this.totalFrames = totalFrames;
    this.currentFrame = 0;
    this.scale = scale;
    this.frameCounter = 0;
    this.frameDuration = frameDuration;
    this.isPlaying = true;
  }

  update() {
    if (this.isPlaying) {
      this.frameCounter++;
      if (this.frameCounter >= this.frameDuration) {
        this.frameCounter = 0;
        this.currentFrame++;
        if (this.currentFrame >= this.totalFrames) {
          this.isPlaying = false;
        }
      }
    }
  }

  draw(ctx, x, y) {
    if (!this.isPlaying || !this.spriteSheet || !this.spriteSheet.complete) return;

    ctx.save();
    const frameX = this.currentFrame * this.frameWidth;

    ctx.shadowBlur = 30;
    ctx.shadowColor = '#c4b5fd';

    ctx.drawImage(
      this.spriteSheet,
      frameX, 0, this.frameWidth, this.frameHeight,
      x - (this.frameWidth * this.scale) / 2,
      y - (this.frameHeight * this.scale) / 2,
      this.frameWidth * this.scale,
      this.frameHeight * this.scale
    );
    ctx.restore();
  }
}

class Particle {
  constructor(x, y, vx, vy, size, color, life, isBig = false) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.size = size;
    this.color = color;
    this.life = life;
    this.maxLife = life;
    this.isBig = isBig;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vx *= 0.96;
    this.vy *= 0.96;
    this.life--;
  }

  draw(ctx) {
    const alpha = Math.max(0, this.life / this.maxLife);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.shadowBlur = this.isBig ? 25 : 15;
    ctx.shadowColor = this.color;

    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();

    if (this.isBig) {
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size * 0.6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

const OpeningAnimation = ({ onComplete, logoPath = "/images/logo.png", explosionPath = "/images/explosion.png" }) => {
  const [isVisible, setIsVisible] = useState(true);
  const canvasRef = useRef(null);
  const logoRef = useRef(null);
  const textRef = useRef(null);
  const animationFrameRef = useRef(null);
  const startTimeRef = useRef(null);
  
  const particlesRef = useRef([]);
  const explosionsRef = useRef([]);
  const explosionSpriteRef = useRef(null);
  const [assetsLoaded, setAssetsLoaded] = useState(false);

  // Faster timing - total animation ~1 second
  const FADE_START = 200;
  const FADE_DURATION = 400;
  const TOTAL_DURATION = 800;

  const createExplosionEffect = (centerX, centerY) => {
    // Single centered explosion sprite
    if (explosionSpriteRef.current && explosionSpriteRef.current.complete) {
      const mainExplosion = new ExplosionSprite(
        centerX, centerY,
        explosionSpriteRef.current,
        100, 100, 8, 3.5, 1
      );
      explosionsRef.current.push(mainExplosion);
    }

    // Fast colorful particles
    for (let i = 0; i < 150; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 18 + 12;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      const size = Math.random() * 6 + 2;
      const color = COLORS[Math.floor(Math.random() * COLORS.length)];
      const life = 25 + Math.random() * 20;
      particlesRef.current.push(new Particle(centerX, centerY, vx, vy, size, color, life));
    }

    // Big glowing particles
    for (let i = 0; i < 30; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 15 + 10;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      const size = Math.random() * 15 + 8;
      const color = COLORS[Math.floor(Math.random() * COLORS.length)];
      const life = 20 + Math.random() * 25;
      particlesRef.current.push(new Particle(centerX, centerY, vx, vy, size, color, life, true));
    }

    // Fast shockwave burst
    for (let i = 0; i < 60; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 25 + 15;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed;
      const size = Math.random() * 4 + 1;
      const color = '#ffffff';
      const life = 15 + Math.random() * 15;
      particlesRef.current.push(new Particle(centerX, centerY, vx, vy, size, color, life, false));
    }
  };

  const animate = () => {
    if (!startTimeRef.current) {
      animationFrameRef.current = requestAnimationFrame(animate);
      return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    const elapsed = Date.now() - startTimeRef.current;

    // Clear canvas with fade trail
    ctx.fillStyle = 'rgba(10, 10, 10, 0.25)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Update and draw particles
    for (let i = particlesRef.current.length - 1; i >= 0; i--) {
      const p = particlesRef.current[i];
      p.update();
      p.draw(ctx);
      if (p.life <= 0) particlesRef.current.splice(i, 1);
    }

    // Update and draw sprite explosion
    for (let i = explosionsRef.current.length - 1; i >= 0; i--) {
      const e = explosionsRef.current[i];
      e.update();
      e.draw(ctx, canvas.width / 2, canvas.height / 2 - 45);
      if (!e.isPlaying) explosionsRef.current.splice(i, 1);
    }

    // Logo + text fade-in + particle attraction
    if (elapsed > FADE_START) {
      const progress = Math.min(1, (elapsed - FADE_START) / FADE_DURATION);
      if (logoRef.current) logoRef.current.style.opacity = progress;
      if (textRef.current) textRef.current.style.opacity = progress;

      const targetX = canvas.width / 2;
      const targetY = canvas.height / 2 - 45;

      // Attract colored particles to logo
      particlesRef.current.forEach(p => {
        if (p.life > 8 && p.color !== '#ffffff') {
          const dx = targetX - p.x;
          const dy = targetY - p.y;
          const dist = Math.hypot(dx, dy) || 1;
          const force = 0.25;
          p.vx += (dx / dist) * force;
          p.vy += (dy / dist) * force;
        }
      });
    }

    // Continue or complete
    if (elapsed < TOTAL_DURATION || particlesRef.current.length > 0 || explosionsRef.current.length > 0) {
      animationFrameRef.current = requestAnimationFrame(animate);
    } else {
      // Animation complete - ensure final state
      if (logoRef.current) logoRef.current.style.opacity = '1';
      if (textRef.current) textRef.current.style.opacity = '1';
      
      // Fade out the animation container
      setTimeout(() => {
        setIsVisible(false);
        setTimeout(() => {
          if (onComplete) onComplete();
        }, 500);
      }, 100);
    }
  };

  const startAnimation = () => {
    if (!assetsLoaded) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    // Reset states
    particlesRef.current = [];
    explosionsRef.current = [];
    startTimeRef.current = Date.now();

    // Reset logo and text opacity
    if (logoRef.current) logoRef.current.style.opacity = '0';
    if (textRef.current) textRef.current.style.opacity = '0';

    // Create explosion at center
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2 - 45;
    createExplosionEffect(centerX, centerY);

    // Start animation loop
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    animate();
  };

  // Load assets
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.width = VIRTUAL_W;
      canvas.height = VIRTUAL_H;
    }

    let loadedCount = 0;
    const totalAssets = 2;

    const assetLoaded = () => {
      loadedCount++;
      if (loadedCount === totalAssets) {
        setAssetsLoaded(true);
      }
    };

    // Load explosion sprite
    explosionSpriteRef.current = new Image();
    explosionSpriteRef.current.onload = assetLoaded;
    explosionSpriteRef.current.onerror = () => {
      console.warn('Failed to load explosion sprite, continuing with particles only');
      assetLoaded();
    };
    explosionSpriteRef.current.src = explosionPath;

    // Logo is already in the DOM, just check if it loads
    if (logoRef.current && logoRef.current.complete) {
      assetLoaded();
    } else if (logoRef.current) {
      logoRef.current.onload = assetLoaded;
      logoRef.current.onerror = () => {
        console.warn('Failed to load logo, continuing anyway');
        assetLoaded();
      };
    } else {
      assetLoaded();
    }
  }, [logoPath, explosionPath]);

  // Start animation when assets are loaded
  useEffect(() => {
    if (assetsLoaded) {
      startAnimation();
    }
  }, [assetsLoaded]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  if (!isVisible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 9999,
        background: '#0a0a0a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          background: '#0a0a0a',
        }}
      />
      
      <div
        style={{
          position: 'relative',
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
        }}
      >
        <img
          ref={logoRef}
          src={logoPath}
          alt="Onion Studio Pro Logo"
          style={{
            width: '250px',
            height: '250px',
            opacity: 0,
            transition: 'opacity 0.3s ease-in-out',
            filter: 'drop-shadow(0 0 30px rgba(196, 181, 253, 0.6))',
          }}
        />
        <div
          ref={textRef}
          style={{
            marginTop: '20px',
            fontSize: '2.8rem',
            fontWeight: 700,
            color: '#c4b5fd',
            textShadow: '0 0 25px rgba(196, 181, 253, 0.9), 0 0 40px rgba(131, 12, 222, 0.6)',
            opacity: 0,
            transition: 'opacity 0.3s ease-in-out',
            letterSpacing: '3px',
            fontFamily: "'Roboto', sans-serif",
          }}
        >
          Onion Studio Pro
        </div>
      </div>
    </div>
  );
};

export default OpeningAnimation;