import React from "react"
import { motion } from "framer-motion"

export interface AnimationProps {
  children: React.ReactNode
  className?: string
  delay?: number
  id?: string
}

// 1. Page Transition
// Used to wrap entire page views in AppLayout.tsx
export function PageTransition({ children, className = "", id }: AnimationProps) {
  return (
    <motion.div
      key={id}
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className={`w-full h-full ${className}`}
    >
      {children}
    </motion.div>
  )
}

// 2. Subtle Fade In
// Useful for staggering lists or appearing elements
export function FadeIn({ children, className = "", delay = 0 }: AnimationProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4, delay, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// 3. Subtle Slide Up
// Useful for cards or dashboard blocks
export function SlideUp({ children, className = "", delay = 0 }: AnimationProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: "easeOut" }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// 4. Motion Card Wrapper
// Wraps a standard Card or div with a subtle lift on hover
export function MotionCard({ children, className = "" }: AnimationProps) {
  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.01 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// 5. Stagger Container
// Use this as a parent wrapper, and put child motion elements inside it
// to automatically stagger their entrance
export function StaggerContainer({ children, className = "", delay = 0.1 }: AnimationProps) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: {
            staggerChildren: delay
          }
        }
      }}
      className={className}
    >
      {children}
    </motion.div>
  )
}
