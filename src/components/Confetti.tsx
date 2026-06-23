import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";

interface Particle {
  id: string;
  startX: number;
  startY: number;
  destX: number;
  destY: number;
  rotateZ: number;
  color: string;
  size: number;
  shape: "circle" | "square" | "triangle";
  scale: number;
}

interface ConfettiProps {
  trigger: boolean;
  onComplete: () => void;
}

const COLORS = [
  "#6366F1", // Indigo
  "#10B981", // Emerald
  "#F59E0B", // Amber
  "#EC4899", // Pink
  "#8B5CF6", // Purple
  "#EF4444", // Red
  "#06B6D4", // Cyan
  "#3B82F6"  // Blue
];

const SHAPES: ("circle" | "square" | "triangle")[] = ["circle", "square", "triangle"];

export default function Confetti({ trigger, onComplete }: ConfettiProps) {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    if (trigger) {
      const width = window.innerWidth;
      const height = window.innerHeight;

      // 80 particles total: 40 from the left, 40 from the right
      const leftCannon: Particle[] = Array.from({ length: 40 }).map((_, i) => {
        const id = `left-${Date.now()}-${i}`;
        const color = COLORS[Math.floor(Math.random() * COLORS.length)];
        const shape = SHAPES[Math.floor(Math.random() * SHAPES.length)];
        const size = Math.random() * 10 + 6; // 6px to 16px
        const scale = Math.random() * 0.4 + 0.8;

        return {
          id,
          startX: width * 0.05,
          startY: height * 0.85,
          destX: width * 0.15 + Math.random() * (width * 0.45), // Shoot towards center
          destY: -height * 0.4 - Math.random() * (height * 0.45), // Shoot up
          rotateZ: 360 + Math.random() * 720,
          color,
          size,
          shape,
          scale
        };
      });

      const rightCannon: Particle[] = Array.from({ length: 40 }).map((_, i) => {
        const id = `right-${Date.now()}-${i}`;
        const color = COLORS[Math.floor(Math.random() * COLORS.length)];
        const shape = SHAPES[Math.floor(Math.random() * SHAPES.length)];
        const size = Math.random() * 10 + 6;
        const scale = Math.random() * 0.4 + 0.8;

        return {
          id,
          startX: width * 0.95,
          startY: height * 0.85,
          destX: -width * 0.15 - Math.random() * (width * 0.45), // Shoot towards center
          destY: -height * 0.4 - Math.random() * (height * 0.45), // Shoot up
          rotateZ: -360 - Math.random() * 720,
          color,
          size,
          shape,
          scale
        };
      });

      setParticles([...leftCannon, ...rightCannon]);

      const timer = setTimeout(() => {
        setParticles([]);
        onComplete();
      }, 4000);

      return () => clearTimeout(timer);
    }
  }, [trigger, onComplete]);

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      <AnimatePresence>
        {particles.map((p) => {
          return (
            <motion.div
              key={p.id}
              initial={{
                opacity: 1,
                x: p.startX,
                y: p.startY,
                scale: p.scale,
                rotate: 0
              }}
              animate={{
                opacity: [1, 1, 0.9, 0],
                x: p.startX + p.destX,
                // Parabole physics simulation using keyframes (flies up, arcs down with gravity)
                y: [
                  p.startY,
                  p.startY + p.destY * 0.6,
                  p.startY + p.destY,
                  p.startY + p.destY + window.innerHeight * 0.3
                ],
                scale: [p.scale, p.scale * 1.1, p.scale * 0.8, 0],
                rotate: p.rotateZ
              }}
              exit={{ opacity: 0 }}
              transition={{
                duration: 2.2 + Math.random() * 1.3,
                ease: "easeOut"
              }}
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                width: p.size,
                height: p.size,
                backgroundColor: p.shape !== "triangle" ? p.color : "transparent",
                borderRadius: p.shape === "circle" ? "50%" : p.shape === "square" ? "2px" : "0",
                borderLeft: p.shape === "triangle" ? `${p.size / 2}px solid transparent` : "none",
                borderRight: p.shape === "triangle" ? `${p.size / 2}px solid transparent` : "none",
                borderBottom: p.shape === "triangle" ? `${p.size}px solid ${p.color}` : "none"
              }}
            />
          );
        })}
      </AnimatePresence>
    </div>
  );
}
