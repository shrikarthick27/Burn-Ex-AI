/**
 * Burn-Ex AI — Main App
 * Visual design: Stitch export (stitch_burn_ex_calorie_tracking_interface)
 * All color tokens, typography scale, glass-panel system, and component
 * structure match the Stitch HTML exports exactly.
 * Functionality (MediaPipe pose, calorie prediction, DB) is fully preserved.
 */

import React, { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import "./index.css";

// ── Exercise Config ────────────────────────────────────────────────────────
const EXERCISE_JOINT_MAP = {
  squat:       [23, 25, 27],
  pushup:      [11, 13, 15],
  pullup:      [11, 13, 15],
  russiantwist:[11, 23, 25],
  jumpingjack: [23, 11, 13],
  march:       [23, 25, 27],
  burpee:      [23, 25, 27],
};
const MET_VALUES   = { squat: 3.5, pushup: 8.0, pullup: 8.0, russiantwist: 5.0, jumpingjack: 8.0, march: 3.5, burpee: 10.0 };
const EXERCISE_LABELS = { squat: "Squats", pushup: "Push-Ups", pullup: "Pull-Ups", russiantwist: "Russian Twists", jumpingjack: "Jumping Jacks", march: "Marching", burpee: "Burpees" };

// ── The Ember companion ────────────────────────────────────────────────────
const AVATARS = [
  { level: 1, name: "Novice Recruit",  rank: "Novice",   minSessions: 0,  img: "/ember_stage1.png", glowColor: "rgba(150,150,150,0.3)" },
  { level: 2, name: "Rising Initiate", rank: "Initiate", minSessions: 3,  img: "/ember_stage2.png", glowColor: "rgba(99,247,255,0.35)" },
  { level: 3, name: "Shadow Striker",  rank: "Elite",    minSessions: 6,  img: "/ember_stage3.png", glowColor: "rgba(99,247,255,0.5)" },
  { level: 4, name: "Apex Champion",   rank: "Apex",     minSessions: 10, img: "/ember_stage3.png", glowColor: "rgba(99,247,255,0.7)" },
];

// ── Design tokens (CSS var wrappers for inline styles) ────────────────────
const C = {
  bg:           "var(--c-background)",
  surface:      "var(--c-surface)",
  sc:           "var(--c-surface-container)",
  scHigh:       "var(--c-surface-container-high)",
  scHighest:    "var(--c-surface-container-highest)",
  onSurface:    "var(--c-on-surface)",
  onVariant:    "var(--c-on-surface-variant)",
  primary:      "var(--c-primary-fixed)",          // #63f7ff in dark
  primaryDim:   "var(--c-primary-fixed-dim)",      // #00dce5
  primaryCont:  "var(--c-primary-container)",       // #00f5ff
  onPrimary:    "var(--c-on-primary-fixed)",        // #002021
  secondary:    "var(--c-secondary-container)",     // #ff571a orange
  secondaryTxt: "var(--c-secondary)",              // #ffb59e warm
  amber:        "var(--c-tertiary-fixed-dim)",      // #e7c427
  outline:      "var(--c-outline-variant)",
  error:        "var(--c-error)",
};

// ── Reusable Components ────────────────────────────────────────────────────

function MatIcon({ name, fill = false, className = "", style = {} }) {
  return (
    <span
      className={`material-symbols-outlined ${fill ? "icon-fill" : ""} ${className}`}
      style={style}
    >
      {name}
    </span>
  );
}

function ConfidenceChip({ label }) {
  const cfg = {
    High:   { bg: C.primaryCont,  text: C.onPrimary,    icon: "trending_up" },
    Medium: { bg: C.amber,        text: "#221b00",       icon: "analytics" },
    Low:    { bg: C.scHighest,    text: C.onVariant,     icon: "warning" },
  };
  const c = cfg[label] || cfg.Low;
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-label-caps"
      style={{ fontSize: 10, background: c.bg, color: c.text }}
    >
      <MatIcon name={c.icon} className="text-xs" style={{ fontSize: 14 }} />
      {label} Confidence
    </span>
  );
}

function GlassPanel({ children, className = "", style = {}, onClick }) {
  return (
    <div className={`glass-panel rounded-xl ${className}`} style={style} onClick={onClick}>
      {children}
    </div>
  );
}

// Bottom nav bar (matches Stitch across all screens)
function BottomNav({ screen, onNav }) {
  const tabs = [
    { id: "home",    icon: "dashboard",     label: "Home" },
    { id: "workout", icon: "fitness_center", label: "Workout" },
    { id: "history", icon: "history",        label: "History" },
    { id: "profile", icon: "person",         label: "Profile" },
  ];
  return (
    <nav
      className="fixed bottom-0 w-full z-50 rounded-t-xl backdrop-blur-xl border-t flex justify-around items-center h-[64px] px-5"
      style={{
        background: `color-mix(in srgb, var(--c-surface-container) 90%, transparent)`,
        borderColor: "rgba(255,255,255,0.08)",
        boxShadow: "0 -4px 20px rgba(0,0,0,0.2)",
      }}
    >
      {tabs.map(t => {
        const active = screen === t.id || (screen === "live" && t.id === "workout") || (screen === "summary" && t.id === "workout");
        return (
          <button
            key={t.id}
            onClick={() => onNav(t.id)}
            className={`flex flex-col items-center gap-0.5 px-4 py-2 rounded-xl transition-all active-scale ${active ? "rounded-xl" : ""}`}
            style={active ? { background: `color-mix(in srgb, var(--c-primary-container) 20%, transparent)`, color: C.primary } : { color: C.onVariant }}
          >
            <MatIcon name={t.icon} fill={active} style={{ fontSize: 24 }} />
            <span className="font-label-caps" style={{ fontSize: 11, lineHeight: 1 }}>{t.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

// Top App Bar
function TopBar({ streak, modelStatus, onThemeToggle, theme }) {
  return (
    <nav
      className="fixed top-0 w-full z-50 backdrop-blur-xl border-b flex items-center justify-between px-5 py-4"
      style={{
        background: `color-mix(in srgb, var(--c-surface) 80%, transparent)`,
        borderColor: "rgba(255,255,255,0.08)",
      }}
    >
      <div className="flex items-center gap-3">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shadow-lg"
          style={{ background: C.primaryCont, boxShadow: `0 4px 16px ${C.primaryCont}44` }}
        >
          <MatIcon name="bolt" fill className="text-xl" style={{ color: C.onPrimary }} />
        </div>
        <span className="font-headline-md" style={{ color: C.primary }}>Burn-Ex AI</span>
      </div>

      <div className="flex items-center gap-2">
        {/* Model status */}
        <div
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border font-label-caps"
          style={{
            fontSize: 10,
            background: modelStatus === "active" ? "rgba(99,247,255,0.1)" : "rgba(255,75,75,0.1)",
            borderColor: modelStatus === "active" ? "rgba(99,247,255,0.3)" : "rgba(255,75,75,0.3)",
            color: modelStatus === "active" ? C.primary : C.error,
          }}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${modelStatus === "active" ? "animate-pulse" : ""}`}
            style={{ background: modelStatus === "active" ? C.primary : C.error,
              boxShadow: modelStatus === "active" ? `0 0 8px ${C.primary}` : "none" }}
          />
          Model: {modelStatus === "active" ? "Active" : "Offline"}
        </div>

        {/* Streak */}
        {streak > 0 && (
          <div
            className="flex items-center gap-1.5 px-3 py-1 rounded-full border font-label-caps"
            style={{ fontSize: 10, background: "rgba(255,87,26,0.15)", borderColor: "rgba(255,87,26,0.3)", color: C.secondaryTxt }}
          >
            <MatIcon name="local_fire_department" fill style={{ fontSize: 16, color: C.secondary }} />
            {streak} Day Streak
          </div>
        )}

        {/* Theme toggle */}
        <button
          onClick={onThemeToggle}
          className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
          style={{ background: C.scHighest, color: C.onVariant }}
          title="Toggle theme"
        >
          <MatIcon name={theme === "dark" ? "light_mode" : "dark_mode"} style={{ fontSize: 18 }} />
        </button>
      </div>
    </nav>
  );
}

// ── Screen: Onboarding ────────────────────────────────────────────────────
function OnboardingScreen({ onComplete }) {
  const [step, setStep] = useState(0); // 0=welcome, 1=privacy, 2=weight
  const [weight, setWeight] = useState(65);

  if (step === 0) return (
    <div className="min-h-screen flex flex-col justify-between px-5 py-12 max-w-lg mx-auto">
      {/* Ambient bg */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full blur-[120px] animate-pulse-slow"
          style={{ background: `rgba(99,247,255,0.08)` }} />
      </div>

      {/* Logo */}
      <div className="flex flex-col items-center gap-4 mt-10">
        <div className="w-16 h-16 rounded-xl flex items-center justify-center shadow-lg"
          style={{ background: C.primaryCont, boxShadow: `0 8px 32px rgba(99,247,255,0.25)` }}>
          <MatIcon name="bolt" fill style={{ fontSize: 36, color: C.onPrimary }} />
        </div>
        <h1 className="font-headline-lg-mobile" style={{ color: C.primary }}>Burn-Ex AI</h1>
      </div>

      {/* Hero */}
      <div className="flex flex-col items-center gap-5 py-10 text-center animate-float">
        <div className="relative">
          <div className="absolute inset-0 rounded-full border-2 animate-pulse" style={{ borderColor: `rgba(99,247,255,0.2)` }} />
          <img src="/ember_stage3.png" alt="The Ember"
            className="w-56 h-56 object-contain"
            style={{ filter: `drop-shadow(0 0 24px rgba(99,247,255,0.35))` }} />
        </div>

        <div className="space-y-2 px-4">
          <h2 className="font-headline-lg-mobile" style={{ color: C.onSurface }}>
            Your Performance,{" "}
            <span style={{ color: C.primary }}>AI Refined.</span>
          </h2>
          <p className="font-body-md" style={{ color: C.onVariant }}>
            Computer-vision calorie estimation that actually sees how you move — not just what exercise you're doing.
          </p>
        </div>

        {/* Floating chips */}
        <div className="flex gap-2 flex-wrap justify-center">
          <GlassPanel className="px-3 py-1.5 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ background: C.primary, boxShadow: `0 0 8px ${C.primary}` }} />
            <span className="font-label-caps" style={{ fontSize: 10, color: C.primary }}>Real-time Analysis</span>
          </GlassPanel>
          <GlassPanel className="px-3 py-1.5 flex items-center gap-1.5">
            <MatIcon name="trending_up" style={{ fontSize: 14, color: C.secondaryTxt }} />
            <span className="font-label-caps" style={{ fontSize: 10, color: C.secondaryTxt }}>On-Device Privacy</span>
          </GlassPanel>
        </div>
      </div>

      {/* CTA */}
      <div className="space-y-3">
        <button
          onClick={() => setStep(1)}
          className="w-full py-4 rounded-xl font-headline-md active-scale"
          style={{ background: C.primaryCont, color: C.onPrimary, boxShadow: `0 10px 30px -5px rgba(99,247,255,0.4)` }}
        >
          Get Started
        </button>
        <p className="font-label-caps text-center" style={{ fontSize: 10, color: C.onVariant }}>
          No account needed · All data stays on your device
        </p>
      </div>
    </div>
  );

  if (step === 1) return (
    <div className="min-h-screen flex flex-col justify-center px-5 py-16 max-w-lg mx-auto gap-6">
      <div className="w-14 h-14 rounded-xl flex items-center justify-center"
        style={{ background: "rgba(99,247,255,0.15)" }}>
        <MatIcon name="shield" fill style={{ fontSize: 28, color: C.primary }} />
      </div>
      <div className="space-y-2">
        <h2 className="font-headline-lg-mobile">Privacy First</h2>
        <p className="font-body-md" style={{ color: C.onVariant }}>
          Your camera feed is processed <strong style={{ color: C.onSurface }}>entirely on this device</strong>. No video is ever uploaded or stored anywhere. Only derived joint angles are saved locally in your session history.
        </p>
      </div>
      <div className="space-y-3">
        {[
          ["videocam_off", "No video upload", "Camera frames never leave your device"],
          ["lock",         "Local storage only", "Session data stays in your browser"],
          ["visibility",   "Transparent processing", "Pose overlay shows exactly what AI sees"],
        ].map(([icon, title, desc]) => (
          <GlassPanel key={title} className="p-4 flex items-start gap-3">
            <MatIcon name={icon} style={{ fontSize: 20, color: C.primary, marginTop: 2 }} />
            <div>
              <p className="font-label-caps" style={{ color: C.onSurface }}>{title}</p>
              <p className="font-body-md" style={{ fontSize: 13, color: C.onVariant, marginTop: 2 }}>{desc}</p>
            </div>
          </GlassPanel>
        ))}
      </div>
      <button onClick={() => setStep(2)} className="w-full py-4 rounded-xl font-headline-md active-scale"
        style={{ background: C.primaryCont, color: C.onPrimary, boxShadow: `0 10px 30px -5px rgba(99,247,255,0.4)` }}>
        I Understand — Continue
      </button>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col justify-center px-5 py-16 max-w-lg mx-auto gap-6">
      <div className="w-14 h-14 rounded-xl flex items-center justify-center"
        style={{ background: "rgba(99,247,255,0.15)" }}>
        <MatIcon name="monitor_weight" fill style={{ fontSize: 28, color: C.primary }} />
      </div>
      <div className="space-y-1">
        <h2 className="font-headline-lg-mobile">Your Body Weight</h2>
        <p className="font-body-md" style={{ color: C.onVariant }}>
          Used only for calorie math. Skipping uses a 70 kg default (reduces accuracy slightly).
        </p>
      </div>
      <GlassPanel className="p-5">
        <label className="font-label-caps block mb-3" style={{ color: C.onVariant }}>Weight (kg)</label>
        <div className="flex items-center gap-4">
          <button onClick={() => setWeight(w => Math.max(30, w - 1))}
            className="w-10 h-10 rounded-full flex items-center justify-center active-scale"
            style={{ background: C.scHighest, color: C.onSurface }}>
            <MatIcon name="remove" />
          </button>
          <span className="font-hero-metric flex-1 text-center" style={{ fontSize: 48, color: C.primary }}>{weight}</span>
          <button onClick={() => setWeight(w => Math.min(200, w + 1))}
            className="w-10 h-10 rounded-full flex items-center justify-center active-scale"
            style={{ background: C.scHighest, color: C.onSurface }}>
            <MatIcon name="add" />
          </button>
        </div>
      </GlassPanel>
      <div className="space-y-3">
        <button onClick={() => onComplete(weight)}
          className="w-full py-4 rounded-xl font-headline-md active-scale"
          style={{ background: C.primaryCont, color: C.onPrimary, boxShadow: `0 10px 30px -5px rgba(99,247,255,0.4)` }}>
          Let's Go
        </button>
        <button onClick={() => onComplete(70)}
          className="w-full py-3 rounded-xl font-label-caps active-scale"
          style={{ background: C.scHighest, color: C.onVariant }}>
          Skip (use default)
        </button>
      </div>
    </div>
  );
}

// ── Screen: Home Dashboard ─────────────────────────────────────────────────
function HomeScreen({ stats, historyList, onStartWorkout, activeAvatar }) {
  const totalToday = historyList
    .filter(s => new Date(s.timestamp).toDateString() === new Date().toDateString())
    .reduce((sum, s) => sum + (s.calories_burned || 0), 0);

  // Build weekly bar chart from history (last 7 days)
  const weekDays = ["MON","TUE","WED","THU","FRI","SAT","SUN"];
  const today = new Date();
  const weekBars = weekDays.map((d, i) => {
    const day = new Date(today);
    day.setDate(today.getDate() - ((today.getDay() + 6) % 7) + i);
    const dayStr = day.toDateString();
    const cal = historyList.filter(s => new Date(s.timestamp).toDateString() === dayStr)
      .reduce((sum, s) => sum + (s.calories_burned || 0), 0);
    const isToday = dayStr === today.toDateString();
    return { label: d, cal, isToday };
  });
  const maxCal = Math.max(1, ...weekBars.map(b => b.cal));
  const lastSession = historyList[0];

  return (
    <div className="pt-[72px] pb-20 px-5 space-y-6 max-w-2xl mx-auto">
      {/* Hero calorie section */}
      <section className="relative flex flex-col items-center justify-center py-8 overflow-hidden">
        {/* Progress ring visual */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-64 h-64 rounded-full" style={{ border: `12px solid rgba(99,247,255,0.08)` }}>
            <div className="w-full h-full rounded-full -rotate-45 blur-[1px]"
              style={{ border: `12px solid`, borderColor: `${C.primary} transparent transparent transparent`, opacity: totalToday > 0 ? 0.7 : 0.2 }} />
          </div>
        </div>

        <div className="relative z-10 text-center animate-float space-y-1">
          <p className="font-label-caps tracking-widest" style={{ color: C.onVariant }}>ESTIMATED BURN TODAY</p>
          <div className="flex items-baseline justify-center gap-2">
            <h1 className="font-hero-metric bloom-text" style={{ color: C.primary }}>
              {Math.round(totalToday) || "0"}
            </h1>
            <span className="font-headline-md" style={{ color: C.onVariant }}>kcal</span>
          </div>
          <div className="flex items-center gap-2 justify-center mt-2">
            <span className="w-2 h-2 rounded-full" style={{ background: C.primary, boxShadow: `0 0 8px ${C.primary}` }} />
            <p className="font-body-md" style={{ color: C.primary }}>
              {stats.total_sessions > 0 ? `${stats.total_sessions} sessions tracked` : "Start your first session"}
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <button
        onClick={onStartWorkout}
        className="w-full py-6 rounded-xl font-headline-md active-scale flex items-center justify-center gap-3 btn-shadow-teal"
        style={{ background: C.primaryCont, color: C.onPrimary }}
      >
        <MatIcon name="play_arrow" fill style={{ fontSize: 28 }} />
        Start Workout
      </button>

      {/* Bento grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* Weekly activity chart */}
        <GlassPanel className="md:col-span-8 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-headline-md">Weekly Activity</h3>
            <span className="font-label-caps px-2 py-1 rounded" style={{ fontSize: 10, background: C.scHighest, color: C.onVariant }}>7D</span>
          </div>
          <div className="h-32 flex items-end justify-between gap-1.5 px-1">
            {weekBars.map(({ label, cal, isToday }) => {
              const pct = cal > 0 ? Math.max(8, (cal / maxCal) * 100) : 8;
              return (
                <div key={label} className="flex flex-col items-center gap-1 flex-1">
                  <div className="w-full rounded-t-sm transition-all duration-700"
                    style={{
                      height: `${pct}%`,
                      minHeight: 6,
                      background: isToday ? C.primary : `rgba(99,247,255,0.18)`,
                      boxShadow: isToday ? `0 0 15px rgba(99,247,255,0.3)` : "none"
                    }} />
                </div>
              );
            })}
          </div>
          <div className="flex justify-between font-label-caps" style={{ fontSize: 10, color: C.onVariant }}>
            {weekBars.map(({ label, isToday }) => (
              <span key={label} style={{ color: isToday ? C.primary : undefined }}>{label}</span>
            ))}
          </div>
        </GlassPanel>

        {/* Last session card */}
        <GlassPanel className="md:col-span-4 p-6 flex flex-col justify-between space-y-4">
          {lastSession ? (
            <>
              <div>
                <h3 className="font-label-caps mb-2" style={{ color: C.onVariant }}>LAST SESSION</h3>
                <h2 className="font-headline-md">{EXERCISE_LABELS[lastSession.exercise_type] || lastSession.exercise_type}</h2>
                <p className="font-body-md" style={{ color: C.onVariant, fontSize: 13 }}>
                  {new Date(lastSession.timestamp).toLocaleString(undefined, { weekday: "short", hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2 rounded-lg" style={{ background: "rgba(255,255,255,0.04)", overflow: "hidden" }}>
                  <p className="font-label-caps" style={{ fontSize: 9, color: C.onVariant }}>DURATION</p>
                  <p className="font-headline-md truncate" style={{ color: C.primary }}>{Math.round(lastSession.duration_seconds)}s</p>
                </div>
                <div className="p-2 rounded-lg" style={{ background: "rgba(255,255,255,0.04)", overflow: "hidden" }}>
                  <p className="font-label-caps" style={{ fontSize: 9, color: C.onVariant }}>CALORIES</p>
                  <p className="font-headline-md truncate" style={{ color: C.primary }}>{Math.round(lastSession.calories_burned)}</p>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full gap-2 text-center py-4">
              <MatIcon name="fitness_center" style={{ fontSize: 32, color: C.onVariant, opacity: 0.4 }} />
              <p className="font-label-caps" style={{ color: C.onVariant }}>No sessions yet</p>
            </div>
          )}
        </GlassPanel>

        {/* Companion card */}
        <GlassPanel className="md:col-span-5 p-6 flex items-center gap-4">
          <div className="relative shrink-0">
            <div className="absolute inset-0 rounded-full blur-xl opacity-20"
              style={{ background: activeAvatar.glowColor }} />
            <img src={activeAvatar.img} alt="The Ember" className="w-20 h-20 object-contain relative z-10"
              style={{ filter: `drop-shadow(0 0 12px ${activeAvatar.glowColor})` }} />
          </div>
          <div>
            <span className="font-label-caps block mb-1" style={{ fontSize: 9, color: C.onVariant }}>THE EMBER · {activeAvatar.rank.toUpperCase()}</span>
            <p className="font-headline-md" style={{ color: C.primary }}>{activeAvatar.name}</p>
            <div className="flex gap-1 mt-2">
              {AVATARS.map(a => (
                <div key={a.level} className="h-1 rounded-full transition-all duration-500"
                  style={{ width: a.level <= activeAvatar.level ? 14 : 8,
                    background: a.level <= activeAvatar.level ? C.primary : C.scHighest }} />
              ))}
            </div>
          </div>
        </GlassPanel>

        {/* AI Insight card */}
        <GlassPanel className="md:col-span-7 p-6 border-l-4 relative overflow-hidden group"
          style={{ borderLeftColor: C.primary }}>
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <MatIcon name="psychology" style={{ fontSize: 60, color: C.primary }} />
          </div>
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg" style={{ background: `rgba(99,247,255,0.15)` }}>
              <MatIcon name="auto_awesome" style={{ color: C.primary }} />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="font-headline-md">AI Coaching Insight</h4>
                <ConfidenceChip label={stats.total_sessions >= 3 ? "High" : "Low"} />
              </div>
              <p className="font-body-md" style={{ color: C.onVariant, fontSize: 14 }}>
                {stats.total_sessions === 0
                  ? "Complete your first session to unlock personalized AI coaching insights based on your movement quality."
                  : stats.total_sessions < 3
                  ? "Early data collected. Keep building your session history for higher-confidence coaching insights."
                  : `You've completed ${stats.total_sessions} tracked sessions. Total estimated burn: ${Math.round(stats.total_calories)} kcal. Consistent form quality is your strongest indicator of calorie accuracy.`}
              </p>
            </div>
          </div>
        </GlassPanel>
      </div>
    </div>
  );
}

// ── Screen: Workout Setup ──────────────────────────────────────────────────
function WorkoutSetupScreen({ exercise, setExercise, weight, setWeight, onStart, onBack, modelStatus }) {
  return (
    <div className="pt-[72px] pb-20 px-5 max-w-lg mx-auto space-y-5">
      <div className="pt-4">
        <button onClick={onBack} className="flex items-center gap-1.5 font-label-caps active-scale mb-6"
          style={{ color: C.onVariant }}>
          <MatIcon name="arrow_back" style={{ fontSize: 20 }} />
          Back
        </button>
        <h2 className="font-headline-lg-mobile">Session Setup</h2>
        <p className="font-body-md" style={{ color: C.onVariant }}>Configure your workout before starting</p>
      </div>

      <GlassPanel className="p-5 space-y-4">
        <div>
          <label className="font-label-caps block mb-2" style={{ color: C.onVariant }}>Exercise</label>
          <select value={exercise} onChange={e => setExercise(e.target.value)}
            className="w-full rounded-xl px-4 py-3 font-body-md outline-none transition-shadow"
            style={{ background: C.scHighest, color: C.onSurface, border: `1px solid ${C.outline}` }}>
            {Object.entries(EXERCISE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <div>
          <label className="font-label-caps block mb-2" style={{ color: C.onVariant }}>Body Weight (kg)</label>
          <div className="flex items-center gap-3">
            <button onClick={() => setWeight(w => Math.max(30, w - 1))}
              className="w-10 h-10 rounded-full flex items-center justify-center active-scale shrink-0"
              style={{ background: C.scHighest, color: C.onSurface }}>
              <MatIcon name="remove" />
            </button>
            <span className="font-hero-metric flex-1 text-center bloom-text" style={{ fontSize: 40, color: C.primary }}>{weight}</span>
            <button onClick={() => setWeight(w => Math.min(200, w + 1))}
              className="w-10 h-10 rounded-full flex items-center justify-center active-scale shrink-0"
              style={{ background: C.scHighest, color: C.onSurface }}>
              <MatIcon name="add" />
            </button>
          </div>
        </div>
      </GlassPanel>

      {/* Camera framing check prompt */}
      <GlassPanel className="p-4 flex items-start gap-3">
        <MatIcon name="videocam" style={{ fontSize: 20, color: C.primary, marginTop: 2 }} />
        <div>
          <p className="font-label-caps" style={{ color: C.primary }}>Camera Framing Tip</p>
          <p className="font-body-md mt-1" style={{ color: C.onVariant, fontSize: 13 }}>
            Step back until your full body is visible. Side-on angle improves joint angle detection and estimate accuracy.
          </p>
        </div>
      </GlassPanel>

      <div className="flex items-center gap-2 px-1">
        <span className="w-2 h-2 rounded-full"
          style={{ background: modelStatus === "active" ? C.primary : C.error,
            boxShadow: modelStatus === "active" ? `0 0 8px ${C.primary}` : "none" }} />
        <span className="font-label-caps" style={{ fontSize: 10, color: modelStatus === "active" ? C.primary : C.error }}>
          {modelStatus === "active" ? "AI model loaded — full estimation active" : "AI model offline — MET fallback will be used"}
        </span>
      </div>

      <button onClick={onStart}
        className="w-full py-5 rounded-xl font-headline-md active-scale flex items-center justify-center gap-3 btn-shadow-teal"
        style={{ background: C.primaryCont, color: C.onPrimary }}>
        <MatIcon name="play_arrow" fill style={{ fontSize: 28 }} />
        Begin Session
      </button>
    </div>
  );
}

// ── Screen: Live Workout ───────────────────────────────────────────────────
function LiveWorkoutScreen({
  exercise, reps, rom, duration, caloriesLow, caloriesHigh, confidence, isFallback,
  avgSpeed, noPoseWarning, showSkeleton, onToggleSkeleton, onStop,
  videoRef, canvasRef,
  mismatchPaused, detectedExercise, detectionConfidence,
  onMismatchSwitch, onMismatchIgnore,
}) {
  const pct = Math.min(100, Math.max(8,
    ((Math.min(1, rom / 80) * 0.5 + Math.min(1, avgSpeed / 0.03) * 0.35 + (reps >= 5 ? 0.15 : reps >= 2 ? 0.07 : 0)) * 100)
  ));
  const mins = Math.floor(duration / 60);
  const secs = Math.floor(duration % 60);
  const timeStr = `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  const detectedLabel = EXERCISE_LABELS[detectedExercise] || detectedExercise;
  const selectedLabel = EXERCISE_LABELS[exercise] || exercise;

  return (
    <div className="fixed inset-0 z-40 overflow-hidden" style={{ background: "#000" }}>
      {/* Camera canvas — full screen */}
      <video ref={videoRef} className="hidden" playsInline muted />
      <canvas ref={canvasRef} width="640" height="480"
        className="absolute inset-0 w-full h-full object-cover" />

      {/* Vignette overlay */}
      <div className="absolute inset-0 camera-vignette pointer-events-none" />

      {/* ── Exercise Mismatch Overlay ── */}
      <AnimatePresence>
        {mismatchPaused && detectedExercise && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center p-6"
            style={{ background: "rgba(0,0,0,0.82)", backdropFilter: "blur(12px)" }}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
              className="w-full max-w-sm rounded-3xl p-6 space-y-5"
              style={{ background: C.sc, border: "2px solid rgba(251,191,36,0.5)", boxShadow: "0 0 60px rgba(251,191,36,0.15)" }}
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center"
                  style={{ background: "rgba(251,191,36,0.15)" }}>
                  <MatIcon name="warning" fill style={{ fontSize: 28, color: "#fbbf24" }} />
                </div>
                <div>
                  <p className="font-headline-md" style={{ fontSize: 16, color: "#fbbf24" }}>Exercise Mismatch</p>
                  <p className="font-label-caps" style={{ fontSize: 10, color: C.onVariant }}>CALORIE ESTIMATION PAUSED</p>
                </div>
              </div>

              <div className="rounded-2xl p-4 space-y-2" style={{ background: C.scHighest }}>
                <div className="flex items-center justify-between">
                  <span className="font-label-caps" style={{ fontSize: 10, color: C.onVariant }}>SELECTED</span>
                  <span className="font-headline-md px-3 py-1 rounded-lg"
                    style={{ fontSize: 14, color: C.onSurface, border: `1px solid ${C.outline}` }}>{selectedLabel}</span>
                </div>
                <div className="flex items-center justify-center">
                  <MatIcon name="swap_vert" style={{ fontSize: 20, color: "#fbbf24" }} />
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-label-caps" style={{ fontSize: 10, color: C.onVariant }}>DETECTED</span>
                  <span className="font-headline-md px-3 py-1 rounded-lg"
                    style={{ fontSize: 14, color: C.primary, border: "1px solid rgba(99,247,255,0.3)", background: "rgba(99,247,255,0.08)" }}>{detectedLabel}</span>
                </div>
                <p className="font-label-caps text-center pt-1" style={{ fontSize: 9, color: C.onVariant }}>
                  {Math.round((detectionConfidence || 0) * 100)}% classifier confidence
                </p>
              </div>

              <p className="font-body-md" style={{ fontSize: 13, color: C.onVariant, lineHeight: 1.6 }}>
                AI detected motion matching <strong style={{ color: C.primary }}>{detectedLabel}</strong>, not {selectedLabel}. Wrong exercise logic = inaccurate calorie estimate.
              </p>

              <div className="space-y-2">
                <button onClick={() => onMismatchSwitch(detectedExercise)}
                  className="w-full py-3.5 rounded-xl font-headline-md active-scale flex items-center justify-center gap-2"
                  style={{ background: C.primaryCont, color: C.onPrimary }}>
                  <MatIcon name="check_circle" fill style={{ fontSize: 20 }} />
                  Switch to {detectedLabel}
                </button>
                <button onClick={onMismatchIgnore}
                  className="w-full py-3 rounded-xl font-label-caps active-scale"
                  style={{ background: C.scHighest, color: C.onVariant }}>
                  Keep {selectedLabel} &amp; Continue
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top bar */}
      <header className="fixed top-0 w-full z-50 flex items-center justify-between px-5 py-4">
        <div className="flex items-center gap-2">
          <button onClick={onStop}
            className="w-10 h-10 flex items-center justify-center rounded-full glass-panel active-scale"
            style={{ color: C.primary }}>
            <MatIcon name="close" />
          </button>
          <GlassPanel className="px-3 py-1.5 rounded-lg">
            <span className="font-label-caps" style={{ fontSize: 10, color: C.primaryDim }}>LIVE SESSION</span>
          </GlassPanel>
        </div>
        <div className="flex items-center gap-2">
          {/* Skeleton toggle */}
          <button onClick={onToggleSkeleton}
            className="glass-panel px-3 py-1.5 rounded-lg font-label-caps active-scale"
            style={{ fontSize: 10, color: showSkeleton ? C.primary : C.onVariant }}>
            Skeleton {showSkeleton ? "On" : "Off"}
          </button>
          {/* Timer */}
          <GlassPanel className="px-4 py-2 rounded-xl flex items-center gap-2">
            <MatIcon name="timer" fill style={{ color: C.amber, fontSize: 20 }} />
            <span className="font-headline-md" style={{ color: C.onSurface, letterSpacing: "-0.02em" }}>{timeStr}</span>
          </GlassPanel>
        </div>
      </header>

      {/* Top metrics row */}
      <main className="relative z-20 h-full flex flex-col justify-between p-5 pt-[80px]">
        <div className="flex justify-between items-start">
          {/* Rep counter */}
          <GlassPanel className="p-5 rounded-2xl flex flex-col items-center justify-center w-28 hero-glow bloom-effect">
            <span className="font-label-caps uppercase mb-1" style={{ fontSize: 9, color: C.onVariant }}>REPS</span>
            <span className="font-hero-metric" style={{ fontSize: 48, color: C.primary }}>{reps}</span>
          </GlassPanel>

          {/* Calorie range + confidence */}
          <div className="flex flex-col gap-2 items-end">
            <GlassPanel className="p-3 rounded-xl flex flex-col items-end min-w-[140px]">
              <span className="font-label-caps uppercase" style={{ fontSize: 9, color: C.onVariant }}>EST. CALORIES</span>
              {duration >= 30 ? (
                <>
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-headline-lg" style={{ color: C.onSurface, fontSize: 22, fontFamily: "Montserrat" }}>
                      {caloriesLow}–{caloriesHigh}
                    </span>
                    <span className="font-label-caps" style={{ fontSize: 9, color: C.onVariant }}>kcal</span>
                  </div>
                  <div className="mt-1"><ConfidenceChip label={confidence} /></div>
                </>
              ) : (
                <span className="font-body-md mt-1" style={{ color: C.onVariant, fontSize: 12 }}>
                  {Math.max(0, 30 - Math.floor(duration))}s until estimate
                </span>
              )}
            </GlassPanel>

            {/* Model / fallback badge */}
            <GlassPanel className="px-2.5 py-1 rounded-lg flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full animate-pulse"
                style={{ background: isFallback ? C.error : C.primary,
                  boxShadow: isFallback ? "none" : `0 0 8px ${C.primary}` }} />
              <span className="font-label-caps" style={{ fontSize: 9, color: isFallback ? C.error : C.primary }}>
                {isFallback ? "MET Fallback" : "Model: Active"}
              </span>
            </GlassPanel>
          </div>
        </div>

        {/* ROM indicator center */}
        <div className="flex justify-center">
          <GlassPanel className="px-6 py-3 rounded-full">
            <p className="font-headline-md text-center" style={{ fontSize: 16, color: C.onSurface }}>
              ROM: <span style={{ color: C.primary }}>{rom.toFixed(0)}°</span>
            </p>
          </GlassPanel>
        </div>

        {/* Bottom: form quality + stop button */}
        <div className="mb-4 flex flex-col gap-4">
          {/* Form quality bar */}
          <GlassPanel className="w-full max-w-md mx-auto p-4 rounded-2xl flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <span className="font-label-caps uppercase" style={{ fontSize: 10, color: C.primaryDim }}>Form Quality</span>
              <span className="font-label-caps" style={{ fontSize: 10, color: C.primary }}>{Math.round(pct)}%</span>
            </div>
            <div className="h-2 w-full rounded-full overflow-hidden" style={{ background: C.scHighest }}>
              <motion.div className="h-full rounded-full progress-glow"
                style={{ background: C.primary }}
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.6, ease: "easeOut" }} />
            </div>
          </GlassPanel>

          {/* Action cluster */}
          <div className="flex justify-center items-center gap-6">
            <button className="w-14 h-14 rounded-full glass-panel flex items-center justify-center active-scale"
              style={{ color: C.onVariant }}>
              <MatIcon name="skip_next" style={{ fontSize: 28 }} />
            </button>
            <button onClick={onStop}
              className="w-20 h-20 rounded-full flex items-center justify-center active-scale"
              style={{ background: C.primaryCont, color: C.onPrimary, boxShadow: `0 0 30px rgba(0,245,255,0.4)` }}>
              <MatIcon name="stop" fill style={{ fontSize: 36 }} />
            </button>
            <button className="w-14 h-14 rounded-full glass-panel flex items-center justify-center active-scale"
              style={{ color: C.onVariant }}>
              <MatIcon name="volume_up" style={{ fontSize: 28 }} />
            </button>
          </div>
        </div>
      </main>

      {/* No-pose warning toast */}
      <AnimatePresence>
        {noPoseWarning && (
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-24 left-5 right-5 z-50 rounded-xl px-4 py-3 flex items-center gap-3"
            style={{ background: "rgba(245,158,11,0.9)", backdropFilter: "blur(8px)", border: "1px solid #d97706", color: "#0f172a" }}>
            <MatIcon name="videocam_off" style={{ fontSize: 20 }} />
            <div>
              <p className="font-headline-md" style={{ fontSize: 14 }}>Full body not visible</p>
              <p className="font-body-md" style={{ fontSize: 12, fontWeight: 400 }}>Step back or adjust lighting for accurate tracking</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Screen: Session Summary (modal over home) ──────────────────────────────
function SessionSummaryScreen({ summary, onDismiss }) {
  if (!summary) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}>

      {/* Ambient blobs */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute -top-20 -right-20 w-96 h-96 rounded-full blur-[120px] animate-pulse-slow"
          style={{ background: "rgba(99,247,255,0.08)" }} />
        <div className="absolute bottom-10 -left-20 w-80 h-80 rounded-full blur-[120px]"
          style={{ background: "rgba(255,87,26,0.05)" }} />
      </div>

      <motion.div
        initial={{ scale: 0.95, y: 20, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.95, y: 20, opacity: 0 }}
        className="relative w-full max-w-sm rounded-3xl overflow-hidden"
        style={{ background: C.sc, border: `1px solid rgba(255,255,255,0.08)`, borderTop: `3px solid ${C.primary}` }}
      >
        <div className="p-6 space-y-5 max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border"
              style={{ background: "rgba(255,87,26,0.15)", borderColor: "rgba(255,87,26,0.3)" }}>
              <MatIcon name="stars" fill style={{ fontSize: 16, color: C.secondaryTxt }} />
              <span className="font-label-caps" style={{ fontSize: 10, color: C.secondaryTxt }}>WORKOUT COMPLETE</span>
            </div>
            <button onClick={onDismiss} className="w-8 h-8 rounded-full flex items-center justify-center"
              style={{ background: C.scHighest, color: C.onVariant }}>
              <MatIcon name="close" style={{ fontSize: 18 }} />
            </button>
          </div>

          <h2 className="font-headline-lg-mobile" style={{ color: C.primary }}>Session Complete!</h2>

          {/* Big calorie ring */}
          <div className="relative flex flex-col items-center justify-center py-2">
            <div className="relative w-48 h-48 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 192 192">
                <circle cx="96" cy="96" r="82" fill="transparent"
                  stroke={C.scHighest} strokeWidth="10" />
                <circle cx="96" cy="96" r="82" fill="transparent"
                  stroke={C.primary} strokeWidth="10" strokeLinecap="round"
                  className="bloom-effect"
                  strokeDasharray={`${2 * Math.PI * 82}`}
                  strokeDashoffset={`${2 * Math.PI * 82 * (1 - Math.min(1, (summary.calories_high || 0) / 600))}`} />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="font-hero-metric bloom-text" style={{ color: C.primary, fontSize: 40 }}>
                  {summary.calories_low}–{summary.calories_high}
                </span>
                <span className="font-label-caps mt-0.5" style={{ fontSize: 9, color: C.onVariant }}>CALORIES BURNED</span>
                <div className="mt-2"><ConfidenceChip label={summary.confidence} /></div>
              </div>
            </div>
          </div>

          {/* Stats bento grid */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { icon: "fitness_center", label: "TOTAL REPS", val: summary.reps, color: C.primary },
              { icon: "timer",          label: "DURATION",   val: `${Math.round(summary.duration)}s`, color: C.amber },
              { icon: "straighten",     label: "RANGE OF MOTION", val: `${summary.rom.toFixed(0)}°`, color: C.secondaryTxt },
            ].map(({ icon, label, val, color }) => (
              <div key={label} className="glass-card p-4 rounded-xl flex flex-col gap-1">
                <MatIcon name={icon} style={{ fontSize: 20, color, marginBottom: 4 }} />
                <span className="font-label-caps" style={{ fontSize: 9, color: C.onVariant }}>{label}</span>
                <span className="font-headline-lg-mobile" style={{ color: C.onSurface, fontSize: 20 }}>{val}</span>
              </div>
            ))}
            {summary.is_fallback && (
              <div className="glass-card p-4 rounded-xl flex flex-col gap-1">
                <MatIcon name="warning" style={{ fontSize: 20, color: C.error, marginBottom: 4 }} />
                <span className="font-label-caps" style={{ fontSize: 9, color: C.onVariant }}>EST. MODE</span>
                <span className="font-label-caps" style={{ fontSize: 11, color: C.error }}>MET Fallback</span>
              </div>
            )}
          </div>

          {/* AI Insight (full width) */}
          <div className="glass-card p-4 rounded-xl border-l-4 relative overflow-hidden"
            style={{ borderLeftColor: C.primary }}>
            <div className="absolute top-0 right-0 p-3 opacity-10">
              <MatIcon name="psychology" style={{ fontSize: 48, color: C.primary }} />
            </div>
            <div className="flex items-center gap-2 mb-2">
              <span className="font-label-caps px-2 py-0.5 rounded"
                style={{ fontSize: 9, background: C.primary, color: C.onPrimary }}>AI COACH INSIGHT</span>
            </div>
            <p className="font-body-md" style={{ color: C.onVariant, fontSize: 13, lineHeight: 1.6 }}>{summary.insight}</p>
          </div>

          {/* Uncertainty driver */}
          {summary.uncertainty_driver && (
            <div className="flex items-start gap-2 px-1">
              <MatIcon name="info" style={{ fontSize: 16, color: C.onVariant, marginTop: 1 }} />
              <p className="font-label-caps" style={{ fontSize: 10, color: C.onVariant }}>{summary.uncertainty_driver}</p>
            </div>
          )}

          {/* Detected exercise note */}
          {summary.detected_exercise && summary.detected_exercise !== summary.selected_exercise && (
            <div className="rounded-xl px-4 py-3 flex items-center gap-3"
              style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.3)" }}>
              <MatIcon name="manage_search" style={{ fontSize: 20, color: "#fbbf24", flexShrink: 0 }} />
              <p className="font-label-caps" style={{ fontSize: 10, color: "#fbbf24", lineHeight: 1.5 }}>
                AI detected <strong>{EXERCISE_LABELS[summary.detected_exercise] || summary.detected_exercise}</strong> but session was logged as <strong>{EXERCISE_LABELS[summary.selected_exercise] || summary.selected_exercise}</strong>. This mismatch has been saved for review.
              </p>
            </div>
          )}

          <button onClick={onDismiss}
            className="w-full py-4 rounded-xl font-headline-md active-scale flex items-center justify-center gap-2 btn-shadow-teal"
            style={{ background: C.primaryCont, color: C.onPrimary }}>
            Done
            <MatIcon name="check_circle" fill style={{ fontSize: 20 }} />
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Screen: History ────────────────────────────────────────────────────────
function HistoryScreen({ historyList, stats, onDelete, deleteConfirm, setDeleteConfirm }) {
  // Confidence quality label based on ROM + reps
  const qualityLabel = (s) => {
    if (!s.reps) return { label: "—", style: { background: C.scHighest, color: C.onVariant } };
    const romScore = (s.range_of_motion || 0) / 80;
    const repScore = s.reps >= 10 ? 1 : s.reps >= 5 ? 0.6 : 0.3;
    const q = (romScore + repScore) / 2;
    if (q >= 0.7) return { label: "A+ FORM", style: { background: C.primaryCont, color: C.onPrimary } };
    if (q >= 0.5) return { label: "B QUALITY", style: { background: C.tertiary, color: C.onPrimary } };
    return       { label: "C+ QUALITY", style: { background: C.scHighest, color: C.onVariant } };
  };

  return (
    <div className="pt-[72px] pb-20 px-5 min-h-screen">
      {/* Header */}
      <section className="mt-4 mb-8">
        <h2 className="font-headline-lg-mobile" style={{ color: C.onSurface }}>Workout History</h2>
        <p className="font-body-md" style={{ color: C.onVariant }}>Your progress analyzed by AI coaching logic.</p>
      </section>

      {/* Stats overview */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <GlassPanel className="p-4 flex flex-col justify-between h-28">
          <span className="font-label-caps" style={{ fontSize: 10, color: C.onVariant }}>TOTAL CALORIES</span>
          <div>
            <span className="font-headline-lg" style={{ color: C.primary, fontSize: 28 }}>
              {stats.total_calories > 1000 ? `${(stats.total_calories / 1000).toFixed(1)}k` : Math.round(stats.total_calories)}
            </span>
            <span className="block font-label-caps" style={{ fontSize: 10, color: C.primaryDim }}>
              {stats.total_sessions} sessions
            </span>
          </div>
        </GlassPanel>
        <GlassPanel className="p-4 flex flex-col justify-between h-28">
          <span className="font-label-caps" style={{ fontSize: 10, color: C.onVariant }}>BEST STREAK</span>
          <div>
            <span className="font-headline-lg" style={{ color: C.secondary, fontSize: 28 }}>
              {stats.max_streak || stats.current_streak || 0}
            </span>
            <span className="block font-label-caps" style={{ fontSize: 10, color: C.secondaryTxt }}>days</span>
          </div>
        </GlassPanel>
      </div>

      {/* List */}
      <div className="space-y-3">
        {historyList.length === 0 ? (
          <div>
            <p className="font-label-caps mb-3" style={{ fontSize: 10, color: C.onVariant }}>
              No workouts yet. Here's what your data will look like:
            </p>
            {/* Sample card */}
            <GlassPanel className="p-4 rounded-xl opacity-50 pointer-events-none">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-headline-md" style={{ color: C.onSurface, fontSize: 16 }}>Squats</span>
                    <span className="px-2 py-0.5 rounded-full font-label-caps"
                      style={{ fontSize: 9, background: C.primaryCont, color: C.onPrimary }}>A+ FORM</span>
                  </div>
                  <p style={{ color: C.onVariant, fontSize: 12 }}>Today, 08:30 AM · 90s</p>
                </div>
                <div className="text-right">
                  <span className="font-headline-md" style={{ color: C.primary, fontSize: 16 }}>42–50</span>
                  <p style={{ color: C.onVariant, fontSize: 10 }}>KCAL RANGE</p>
                </div>
              </div>
            </GlassPanel>
          </div>
        ) : (
          historyList.map((s) => {
            const { label, style } = qualityLabel(s);
            return (
              <GlassPanel key={s.id} className="p-4 rounded-xl active-scale cursor-pointer">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-headline-md" style={{ color: C.onSurface, fontSize: 16 }}>
                        {EXERCISE_LABELS[s.exercise_type] || s.exercise_type}
                      </span>
                      <span className="px-2 py-0.5 rounded-full font-label-caps" style={{ fontSize: 9, ...style }}>{label}</span>
                      {s.detected_exercise && s.detected_exercise !== s.exercise_type && (
                        <span className="px-2 py-0.5 rounded-full font-label-caps flex items-center gap-1"
                          style={{ fontSize: 9, background: "rgba(251,191,36,0.12)", color: "#fbbf24", border: "1px solid rgba(251,191,36,0.3)" }}>
                          <MatIcon name="warning" style={{ fontSize: 11 }} />
                          Mismatch
                        </span>
                      )}
                    </div>
                    <p style={{ color: C.onVariant, fontSize: 12 }}>
                      {new Date(s.timestamp).toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      {` · ${s.duration_seconds}s`}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="font-headline-md" style={{ color: C.primary, fontSize: 16 }}>~{s.calories_burned}</span>
                    <p className="font-label-caps" style={{ fontSize: 10, color: C.onVariant }}>KCAL</p>
                  </div>
                </div>
                {/* Sparkline placeholder */}
                <div className="h-8 w-full">
                  <svg className="w-full h-full overflow-visible" viewBox="0 0 100 20">
                    <path className="sparkline" stroke={C.primary} fill="none" strokeWidth="1.5"
                      d={`M0,${10 + Math.sin(s.id * 1.3) * 8} Q25,${10 - Math.sin(s.id * 2.1) * 8} 50,${10 + Math.cos(s.id * 1.7) * 6} T100,${10 - Math.sin(s.id * 0.9) * 7}`} />
                  </svg>
                </div>
              </GlassPanel>
            );
          })
        )}

        {/* AI Insight card */}
        {historyList.length > 0 && (
          <GlassPanel className="p-4 rounded-xl relative overflow-hidden group">
            <div className="absolute -right-8 -top-8 w-24 h-24 blur-3xl group-hover:opacity-100 transition-all opacity-60"
              style={{ background: `rgba(99,247,255,0.1)` }} />
            <div className="flex items-center gap-2 mb-2">
              <MatIcon name="psychology" style={{ fontSize: 20, color: C.primary }} />
              <span className="font-label-caps" style={{ fontSize: 10, color: C.primary }}>SMART COACH INSIGHT</span>
            </div>
            <p className="font-body-md mb-3" style={{ color: C.onSurface, fontSize: 14 }}>
              {historyList.length < 3
                ? "Build up more sessions to unlock pattern-based coaching insights."
                : `You've logged ${historyList.length} sessions. Most consistent exercise: ${EXERCISE_LABELS[historyList[0].exercise_type]}.`}
            </p>
          </GlassPanel>
        )}

        {/* Delete data */}
        {historyList.length > 0 && (
          <button
            onClick={() => { if (!deleteConfirm) { setDeleteConfirm(true); } else { onDelete(); } }}
            className="w-full py-3 rounded-xl font-label-caps active-scale transition-all"
            style={{
              background: deleteConfirm ? "rgba(255,75,75,0.15)" : C.scHighest,
              color: deleteConfirm ? C.error : C.onVariant,
              border: `1px solid ${deleteConfirm ? "rgba(255,75,75,0.3)" : "transparent"}`
            }}>
            {deleteConfirm ? "⚠ Confirm — Delete All Session Data?" : "Clear All Data"}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Screen: Profile ────────────────────────────────────────────────────────
function ProfileScreen({ stats, weight, setWeight, theme, onThemeToggle }) {
  return (
    <div className="pt-[72px] pb-20 px-5 min-h-screen">
      <section className="mt-4 mb-6">
        <h2 className="font-headline-lg-mobile">Profile & Settings</h2>
        <p className="font-body-md" style={{ color: C.onVariant }}>Manage your preferences and data.</p>
      </section>

      <div className="space-y-4">
        {/* Stats summary */}
        <GlassPanel className="p-5 space-y-4">
          <h3 className="font-headline-md" style={{ fontSize: 16 }}>Your Progress</h3>
          <div className="grid grid-cols-3 gap-3">
            {[
              ["Sessions", stats.total_sessions],
              ["Streak", `${stats.current_streak}d`],
              ["Calories", Math.round(stats.total_calories)],
            ].map(([label, val]) => (
              <div key={label} className="text-center p-3 rounded-xl" style={{ background: C.scHighest }}>
                <span className="font-label-caps block" style={{ fontSize: 9, color: C.onVariant }}>{label.toUpperCase()}</span>
                <span className="font-headline-md" style={{ color: C.primary, fontSize: 18 }}>{val}</span>
              </div>
            ))}
          </div>
        </GlassPanel>

        {/* Body weight */}
        <GlassPanel className="p-5 space-y-3">
          <h3 className="font-headline-md" style={{ fontSize: 16 }}>Body Weight</h3>
          <p className="font-body-md" style={{ color: C.onVariant, fontSize: 13 }}>Used for calorie estimation. More accurate = better estimates.</p>
          <div className="flex items-center gap-4">
            <button onClick={() => setWeight(w => Math.max(30, w - 1))}
              className="w-10 h-10 rounded-full flex items-center justify-center active-scale"
              style={{ background: C.scHighest, color: C.onSurface }}>
              <MatIcon name="remove" />
            </button>
            <span className="flex-1 text-center font-hero-metric" style={{ fontSize: 36, color: C.primary }}>{weight} kg</span>
            <button onClick={() => setWeight(w => Math.min(200, w + 1))}
              className="w-10 h-10 rounded-full flex items-center justify-center active-scale"
              style={{ background: C.scHighest, color: C.onSurface }}>
              <MatIcon name="add" />
            </button>
          </div>
        </GlassPanel>

        {/* Appearance */}
        <GlassPanel className="p-5 flex items-center justify-between">
          <div>
            <h3 className="font-headline-md" style={{ fontSize: 16 }}>Theme</h3>
            <p className="font-label-caps" style={{ fontSize: 10, color: C.onVariant }}>{theme === "dark" ? "Dark Mode" : "Light Mode"}</p>
          </div>
          <button onClick={onThemeToggle}
            className="px-4 py-2 rounded-xl font-label-caps active-scale flex items-center gap-2"
            style={{ background: C.scHighest, color: C.onSurface }}>
            <MatIcon name={theme === "dark" ? "light_mode" : "dark_mode"} style={{ fontSize: 18 }} />
            {theme === "dark" ? "Switch Light" : "Switch Dark"}
          </button>
        </GlassPanel>

        {/* Privacy notice */}
        <GlassPanel className="p-4 flex items-start gap-3">
          <MatIcon name="shield" style={{ fontSize: 20, color: C.primary, marginTop: 2 }} />
          <div>
            <p className="font-label-caps" style={{ color: C.primary }}>Privacy</p>
            <p className="font-body-md mt-1" style={{ color: C.onVariant, fontSize: 13 }}>
              Video processed on-device only. No frames uploaded or stored. Only derived joint angles saved locally.
            </p>
          </div>
        </GlassPanel>
      </div>
    </div>
  );
}

// ── Main App ───────────────────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen]         = useState("onboarding"); // onboarding | home | workout | live | summary | history | profile
  const [theme, setTheme]           = useState("dark");
  const [exercise, setExercise]     = useState("squat");
  const [weight, setWeight]         = useState(65);
  const [showSkeleton, setShowSkeleton] = useState(true);
  const [isActive, setIsActive]     = useState(false);
  const [noPoseWarning, setNoPoseWarning] = useState(false);

  // Live session state
  const [reps, setReps]             = useState(0);
  const [avgSpeed, setAvgSpeed]     = useState(0.0);
  const [rom, setRom]               = useState(0.0);
  const [duration, setDuration]     = useState(0.0);
  const [calories, setCalories]     = useState(0.0);
  const [caloriesLow, setCaloriesLow]   = useState(0.0);
  const [caloriesHigh, setCaloriesHigh] = useState(0.0);
  const [confidence, setConfidence] = useState("Low");
  const [isFallback, setIsFallback] = useState(false);
  const [detectedExercise, setDetectedExercise] = useState(null);
  const [detectionConfidence, setDetectionConfidence] = useState(0);
  const [mismatchPaused, setMismatchPaused] = useState(false);
  const mismatchPausedRef = useRef(false);
  useEffect(() => { mismatchPausedRef.current = mismatchPaused; }, [mismatchPaused]);

  // Stats + history
  const [stats, setStats] = useState({ total_sessions: 0, total_calories: 0, total_reps: 0, current_streak: 0, max_streak: 0 });
  const [historyList, setHistoryList] = useState([]);
  const [modelStatus, setModelStatus] = useState("checking");
  const [sessionSummary, setSessionSummary] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  // Refs
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const poseRef = useRef(null);
  const cameraRef = useRef(null);
  const anglesRef = useRef([]);
  const wristPositionsRef = useRef([]);
  const elbowAnglesRef = useRef([]);   // Shoulder-Elbow-Wrist: 11-13-15
  const kneeAnglesRef  = useRef([]);   // Hip-Knee-Ankle: 23-25-27
  const torsoAnglesRef = useRef([]);   // Shoulder-Hip-Knee: 11-23-25
  const durationRef = useRef(0.0);
  const lastTimeRef = useRef(0);
  const consecutiveLostFramesRef = useRef(0);
  const trackingQualityRef = useRef(1.0);
  const recentFramesRef = useRef([]);
  const showSkeletonRef = useRef(true);

  // Keep showSkeletonRef in sync
  useEffect(() => { showSkeletonRef.current = showSkeleton; }, [showSkeleton]);

  // Theme application
  useEffect(() => {
    document.documentElement.classList.remove("dark", "light");
    document.documentElement.classList.add(theme);
  }, [theme]);

  // Bootstrap
  useEffect(() => {
    fetchStats(); fetchHistory(); fetchModelStatus();
  }, []);

  const fetchModelStatus = async () => {
    try { const r = await fetch("http://localhost:5000/api/model-status"); if (r.ok) { const d = await r.json(); setModelStatus(d.status); } else setModelStatus("offline"); } catch { setModelStatus("offline"); }
  };
  const fetchStats = async () => {
    try { const r = await fetch("http://localhost:5000/api/stats"); if (r.ok) setStats(await r.json()); } catch { }
  };
  const fetchHistory = async () => {
    try { const r = await fetch("http://localhost:5000/api/history"); if (r.ok) setHistoryList(await r.json()); } catch { }
  };
  const handleDeleteData = async () => {
    try { await fetch("http://localhost:5000/api/sessions", { method: "DELETE" }); fetchStats(); fetchHistory(); setDeleteConfirm(false); } catch { setDeleteConfirm(false); }
  };

  // ── Angle math ─────────────────────────────────────────────────────────
  const calculateAngle = (a, b, c) => {
    const ba = [a.x - b.x, a.y - b.y], bc = [c.x - b.x, c.y - b.y];
    const cosine = (ba[0]*bc[0]+ba[1]*bc[1]) / (Math.hypot(...ba)*Math.hypot(...bc)+1e-8);
    return Math.acos(Math.max(-1,Math.min(1,cosine))) * (180/Math.PI);
  };
  const calculateReps = (angles, w=5) => {
    if (angles.length < w*2) return 0;
    const sm = [];
    for (let i=0; i<=angles.length-w; i++) sm.push(angles.slice(i,i+w).reduce((s,v)=>s+v,0)/w);
    const mid = (Math.max(...sm)+Math.min(...sm))/2;
    let c=0, above=sm[0]>mid;
    for (let i=1;i<sm.length;i++) { const n=sm[i]>mid; if(n!==above){c++;above=n;} }
    return Math.floor(c/2);
  };
  const calculateAvgSpeed = (pos, fps) => {
    if (pos.length<2) return 0;
    const diffs = pos.slice(1).map((p,i)=>Math.hypot(p[0]-pos[i][0],p[1]-pos[i][1]));
    return (diffs.reduce((s,d)=>s+d,0)/diffs.length)*fps;
  };

  // ── MediaPipe setup ─────────────────────────────────────────────────────
  const isActiveRef = useRef(false);
  const exerciseRef = useRef("squat");
  useEffect(() => { isActiveRef.current = isActive; }, [isActive]);
  useEffect(() => { exerciseRef.current = exercise; }, [exercise]);

  useEffect(() => {
    if (!window.Pose) return;
    const pose = new window.Pose({ locateFile: f => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${f}` });
    pose.setOptions({ modelComplexity: 1, smoothLandmarks: true, enableSegmentation: false, minDetectionConfidence: 0.5, minTrackingConfidence: 0.5 });
    pose.onResults(onPoseResults);
    poseRef.current = pose;
    return () => stopCamera();
  }, []);

  const startCamera = async () => {
    if (cameraRef.current || !videoRef.current || !poseRef.current) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
      videoRef.current.srcObject = stream;
      videoRef.current.play();
      cameraRef.current = new window.Camera(videoRef.current, {
        onFrame: async () => { if (videoRef.current) await poseRef.current.send({ image: videoRef.current }); },
        width: 640, height: 480,
      });
      cameraRef.current.start();
    } catch (e) { console.error("Camera error", e); }
  };
  const stopCamera = () => {
    cameraRef.current?.stop(); cameraRef.current = null;
    videoRef.current?.srcObject?.getTracks().forEach(t => t.stop());
    if (videoRef.current) videoRef.current.srcObject = null;
  };

  const onPoseResults = (results) => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);

    if (!results.poseLandmarks) {
      consecutiveLostFramesRef.current++;
      recentFramesRef.current.push(0);
      if (recentFramesRef.current.length > 30) recentFramesRef.current.shift();
      if (consecutiveLostFramesRef.current > 15) setNoPoseWarning(true);
      return;
    }
    consecutiveLostFramesRef.current = 0;
    setNoPoseWarning(false);
    recentFramesRef.current.push(1);
    if (recentFramesRef.current.length > 30) recentFramesRef.current.shift();
    trackingQualityRef.current = recentFramesRef.current.reduce((s,v)=>s+v,0)/Math.max(1,recentFramesRef.current.length);

    const lm = results.poseLandmarks;
    if (showSkeletonRef.current) drawSkeleton(ctx, lm, canvas);

    // Track both left and right sides to avoid occlusion issues
    const vis = (p) => p && p.visibility > 0.4;
    const ang = (i,j,k) => (vis(lm[i])&&vis(lm[j])&&vis(lm[k])) ? calculateAngle(lm[i],lm[j],lm[k]) : null;
    
    // Elbows: Left(11,13,15), Right(12,14,16)
    const eL = ang(11,13,15), eR = ang(12,14,16);
    if (eL || eR) elbowAnglesRef.current.push(eL || eR);
    
    // Knees: Left(23,25,27), Right(24,26,28)
    const kL = ang(23,25,27), kR = ang(24,26,28);
    if (kL || kR) kneeAnglesRef.current.push(kL || kR);

    // Torso: Left(11,23,25), Right(12,24,26)
    const tL = ang(11,23,25), tR = ang(12,24,26);
    if (tL || tR) torsoAnglesRef.current.push(tL || tR);

    // Cap to last 300 frames (~10s at 30fps) to avoid stale signal
    if (elbowAnglesRef.current.length > 300) elbowAnglesRef.current.shift();
    if (kneeAnglesRef.current.length  > 300) kneeAnglesRef.current.shift();
    if (torsoAnglesRef.current.length > 300) torsoAnglesRef.current.shift();

    if (isActiveRef.current) {
      const now = performance.now();
      // Only tick duration if not mismatch-paused
      if (!mismatchPausedRef.current) {
        if (lastTimeRef.current > 0) { durationRef.current += (now - lastTimeRef.current)/1000; setDuration(Number(durationRef.current.toFixed(1))); }
        lastTimeRef.current = now;
      } else {
        lastTimeRef.current = now; // keep reference fresh so there's no jump when resumed
      }
      const [i0,i1,i2] = EXERCISE_JOINT_MAP[exerciseRef.current];
      const p1=lm[i0],p2=lm[i1],p3=lm[i2];
      if (p1&&p2&&p3&&p1.visibility>0.5&&p2.visibility>0.5&&p3.visibility>0.5) {
        anglesRef.current.push(calculateAngle(p1,p2,p3));
        wristPositionsRef.current.push([p2.x,p2.y]);
        setReps(calculateReps(anglesRef.current));
        const a=anglesRef.current;
        if(a.length) setRom(Number((Math.max(...a)-Math.min(...a)).toFixed(2)));
        setAvgSpeed(Number(calculateAvgSpeed(wristPositionsRef.current,30).toFixed(4)));
      }
    }
  };

  const drawSkeleton = (ctx, lm, canvas) => {
    ctx.strokeStyle = "#63f7ff";
    ctx.lineWidth = 2.5;
    ctx.fillStyle = "#63f7ff";
    const connections = [[11,13],[13,15],[12,14],[14,16],[11,12],[23,24],[11,23],[12,24],[23,25],[25,27],[24,26],[26,28]];
    connections.forEach(([i,j]) => {
      const a=lm[i],b=lm[j];
      if(a&&b&&a.visibility>0.5&&b.visibility>0.5){
        ctx.beginPath();
        ctx.moveTo(a.x*canvas.width,a.y*canvas.height);
        ctx.lineTo(b.x*canvas.width,b.y*canvas.height);
        ctx.stroke();
      }
    });
    lm.forEach(l => {
      if(l.visibility>0.5){
        ctx.beginPath();
        ctx.arc(l.x*canvas.width,l.y*canvas.height,4,0,2*Math.PI);
        ctx.fill();
      }
    });
  };

  // Helper to compute ROM from angle array
  const romOf = (arr) => arr.length > 1 ? Math.max(...arr) - Math.min(...arr) : 0;

  // Instant exercise mismatch detection in frontend (runs continuously)
  useEffect(() => {
    let iv = null;
    if (isActive) {
      iv = setInterval(async () => {
        const elbowRom = romOf(elbowAnglesRef.current);
        const kneeRom  = romOf(kneeAnglesRef.current);
        const torsoRom = romOf(torsoAnglesRef.current);
        const totalRom = elbowRom + kneeRom + torsoRom + 1e-6;

        let detected = null;
        let conf = 0;

        if (totalRom > 15.0) {
          const kneeFrac = kneeRom / totalRom;
          if (kneeRom >= 40) { // lowered from 55 for easier detection
            detected = "squat";
            conf = Math.min(0.95, 0.6 + (kneeRom - 40) / 100);
          } else if (elbowRom >= 100 && kneeFrac < 0.25) { // lowered from 130
            detected = "pullup";
            conf = Math.min(0.95, 0.6 + (elbowRom - 100) / 100);
          } else if (torsoRom >= 30 && kneeRom < 50) {
            detected = "russiantwist";
            conf = Math.min(0.90, 0.55 + (torsoRom - 30) / 80);
          } else if (elbowRom >= 30 && kneeFrac < 0.4) { // lowered from 40
            detected = "pushup";
            conf = Math.min(0.90, 0.5 + (elbowRom - 30) / 120);
          }
        }

        // Only trigger mismatch if confidence is high enough and it doesn't match selection
        if (detected && conf >= 0.45 && detected !== exercise) {
          setDetectedExercise(detected);
          setDetectionConfidence(conf);
          setMismatchPaused(true);
        }

        // Live calorie update (only after 30s)
        if (duration >= 30 && !mismatchPausedRef.current) {
          try {
            const r = await fetch("http://localhost:5000/api/predict", {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                exercise_type: exercise,
                reps, avg_speed: avgSpeed, range_of_motion: rom,
                duration_seconds: duration, weight_kg: weight,
                tracking_quality: trackingQualityRef.current
              }),
            });
            if (r.ok) {
              const d = await r.json();
              setCalories(d.calories); setCaloriesLow(d.calories_low??d.calories); setCaloriesHigh(d.calories_high??d.calories);
              setConfidence(d.confidence??"Low"); setIsFallback(d.is_fallback||false);
            }
          } catch { }
        }
      }, 1000); // Check every second!
    }
    return () => clearInterval(iv);
  }, [isActive, duration, reps, avgSpeed, rom, weight, exercise]);

  const generateInsight = (sessionReps, sessionRom, sessionSpeed, sessionDuration, conf) => {
    if (sessionReps < 2) return "Very few reps detected — make sure your full body is visible to the camera next time.";
    if (sessionRom < 20) return `Your ${EXERCISE_LABELS[exercise] || exercise} range of motion was narrow (${sessionRom.toFixed(0)}°). Deeper reps = more calorie burn and a tighter estimate.`;
    if (sessionRom >= 70) return `Excellent range of motion (${sessionRom.toFixed(0)}°)! Full-depth reps maximize calorie efficiency — keep it consistent.`;
    if (conf === "Low") return "Tracking confidence was low this session. Try a side-on camera angle for better joint visibility.";
    if (sessionDuration < 30) return "Short session — estimates become more accurate after 30+ seconds of consistent movement.";
    return `Great session! ${sessionReps} reps tracked at ${sessionRom.toFixed(0)}° ROM. Consistent pacing produces your most reliable calorie estimates.`;
  };

  const handleStartSession = async () => {
    setIsActive(true);
    setReps(0); setAvgSpeed(0); setRom(0); setDuration(0); setCalories(0);
    setCaloriesLow(0); setCaloriesHigh(0); setConfidence("Low"); setIsFallback(false);
    setDetectedExercise(null); setDetectionConfidence(0); setMismatchPaused(false);
    anglesRef.current=[]; wristPositionsRef.current=[];
    elbowAnglesRef.current=[]; kneeAnglesRef.current=[]; torsoAnglesRef.current=[];
    durationRef.current=0; lastTimeRef.current=performance.now();
    consecutiveLostFramesRef.current=0; setNoPoseWarning(false); recentFramesRef.current=[];
    setScreen("live");
  };

  // Start camera automatically when entering live screen
  useEffect(() => {
    if (screen === "live") {
      startCamera();
    }
  }, [screen]);

  const handleStopSession = async () => {
    setIsActive(false);
    let fLow=caloriesLow,fHigh=caloriesHigh,fConf=confidence,fFallback=isFallback;
    let fCal=calories,fDriver="";

    if (durationRef.current < 30) {
      const met=MET_VALUES[exercise], mid=Number((met*weight*(durationRef.current/3600)).toFixed(2));
      fCal=mid; fLow=Number((mid*0.75).toFixed(2)); fHigh=Number((mid*1.25).toFixed(2));
      fConf="Low"; fFallback=true; fDriver="Short session — MET formula used as fallback";
    } else {
      try {
        const r = await fetch("http://localhost:5000/api/predict", {
          method:"POST", headers:{"Content-Type":"application/json"},
          body: JSON.stringify({ reps, avg_speed: avgSpeed, range_of_motion: rom, duration_seconds: durationRef.current, weight_kg: weight, tracking_quality: trackingQualityRef.current }),
        });
        if (r.ok) {
          const d = await r.json();
          fCal=d.calories; fLow=d.calories_low??d.calories; fHigh=d.calories_high??d.calories;
          fConf=d.confidence??"Low"; fFallback=d.is_fallback||false; fDriver=d.uncertainty_driver||"";
        }
      } catch { }
    }

    const insight = generateInsight(reps, rom, avgSpeed, durationRef.current, fConf);
    const finalDetected = detectedExercise;
    setSessionSummary({ calories_low: fLow, calories_high: fHigh, confidence: fConf, reps, rom, duration: durationRef.current, insight, is_fallback: fFallback, uncertainty_driver: fDriver, detected_exercise: finalDetected, selected_exercise: exercise });

    try {
      const sr = await fetch("http://localhost:5000/api/session", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ exercise_type: exercise, reps, avg_speed: avgSpeed, range_of_motion: rom, duration_seconds: durationRef.current, weight_kg: weight, calories_burned: fCal, detected_exercise: finalDetected }),
      });
      if (sr.ok) {
        confetti({ particleCount: 100, spread: 70, origin: { y: 0.65 }, colors: ["#63f7ff","#00f5ff","#ffffff","#ffb59e"] });
        fetchStats(); fetchHistory();
      }
    } catch { }

    setScreen("summary");
  };

  const handleNav = (tab) => {
    if (tab === "workout") { setScreen("workout"); return; }
    if (tab === "history") { setScreen("history"); setDeleteConfirm(false); return; }
    if (tab === "profile") { setScreen("profile"); return; }
    setScreen("home");
  };

  const activeAvatar = AVATARS.find((a,i) => i===AVATARS.length-1 || stats.total_sessions<AVATARS[i+1].minSessions) || AVATARS[0];
  const showBottomNav = !["onboarding","live"].includes(screen);

  return (
    <div className={theme} style={{ minHeight: "100vh" }}>
      {/* Top Bar — hidden on live/onboarding */}
      {!["onboarding","live"].includes(screen) && (
        <TopBar
          streak={stats.current_streak}
          modelStatus={modelStatus}
          theme={theme}
          onThemeToggle={() => setTheme(t => t === "dark" ? "light" : "dark")}
        />
      )}

      {/* Screen routing */}
      {screen === "onboarding" && (
        <OnboardingScreen onComplete={(w) => { setWeight(w); setScreen("home"); }} />
      )}

      {screen === "home" && (
        <HomeScreen stats={stats} historyList={historyList} activeAvatar={activeAvatar}
          onStartWorkout={() => setScreen("workout")} />
      )}

      {screen === "workout" && (
        <WorkoutSetupScreen
          exercise={exercise} setExercise={setExercise}
          weight={weight} setWeight={setWeight}
          onStart={handleStartSession}
          onBack={() => setScreen("home")}
          modelStatus={modelStatus}
        />
      )}

      {screen === "live" && (
        <LiveWorkoutScreen
          exercise={exercise} reps={reps} rom={rom} duration={duration}
          caloriesLow={caloriesLow} caloriesHigh={caloriesHigh}
          confidence={confidence} isFallback={isFallback} avgSpeed={avgSpeed}
          noPoseWarning={noPoseWarning} showSkeleton={showSkeleton}
          onToggleSkeleton={() => setShowSkeleton(s => !s)}
          onStop={handleStopSession}
          videoRef={videoRef} canvasRef={canvasRef}
          mismatchPaused={mismatchPaused}
          detectedExercise={detectedExercise}
          detectionConfidence={detectionConfidence}
          onMismatchSwitch={(ex) => { 
            setExercise(ex);
            anglesRef.current=[];
            wristPositionsRef.current=[];
            setReps(0);
            setRom(0);
            setMismatchPaused(false); 
          }}
          onMismatchIgnore={() => setMismatchPaused(false)}
        />
      )}

      {screen === "summary" && (
        <>
          {/* Render home behind */}
          <HomeScreen stats={stats} historyList={historyList} activeAvatar={activeAvatar}
            onStartWorkout={() => setScreen("workout")} />
          <AnimatePresence>
            {sessionSummary && (
              <SessionSummaryScreen summary={sessionSummary} onDismiss={() => { setSessionSummary(null); setScreen("home"); }} />
            )}
          </AnimatePresence>
        </>
      )}

      {screen === "history" && (
        <HistoryScreen historyList={historyList} stats={stats}
          onDelete={handleDeleteData} deleteConfirm={deleteConfirm} setDeleteConfirm={setDeleteConfirm} />
      )}

      {screen === "profile" && (
        <ProfileScreen stats={stats} weight={weight} setWeight={setWeight}
          theme={theme} onThemeToggle={() => setTheme(t => t === "dark" ? "light" : "dark")} />
      )}

      {/* Bottom Nav */}
      {showBottomNav && (
        <BottomNav screen={screen === "summary" ? "home" : screen} onNav={handleNav} />
      )}

      {/* Privacy footer — visible on non-live screens */}
      {!["onboarding","live"].includes(screen) && (
        <div className="fixed bottom-[64px] left-0 right-0 flex items-center justify-center gap-1.5 py-1.5 pointer-events-none"
          style={{ background: `color-mix(in srgb, var(--c-background) 90%, transparent)`, borderTop: `1px solid rgba(255,255,255,0.04)` }}>
          <MatIcon name="shield" style={{ fontSize: 12, color: "var(--c-on-surface-variant)", opacity: 0.5 }} />
          <p className="font-label-caps" style={{ fontSize: 9, color: "var(--c-on-surface-variant)", opacity: 0.5 }}>
            Video processed on-device · No frames uploaded or stored
          </p>
        </div>
      )}
    </div>
  );
}
