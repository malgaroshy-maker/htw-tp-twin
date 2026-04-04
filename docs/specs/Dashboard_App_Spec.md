# Dashboard App Specification

## 1. Purpose

This document defines the web dashboard application for the tray packer digital twin project.

The dashboard is the main modern app layer for:
- machine monitoring
- control interaction
- recipe view
- fault visibility
- analytics
- AI assistant access
- training scenario control

---

## 2. Product Role

The dashboard should feel like:
- a modern industrial monitoring app
- a simulator control interface
- a digital twin operations panel
- a demo-ready portfolio app

It is not just a raw developer panel.

---

## 3. Recommended Tech Direction

Recommended first implementation:
- React frontend
- simple backend/API or shared state bridge
- WebSocket or polling for live status
- modular page/panel structure

---

## 4. Main Dashboard Views

1. Overview
2. Control
3. Faults
4. Production
5. Recipes
6. Diagnostics
7. Training
8. AI Assistant panel

These should align with the HMI specifications.

---

## 5. Core Dashboard Features

The dashboard should support:
- live machine state display
- counters and grouped count
- fault banners
- command buttons
- recipe selection
- diagnostics visibility
- session summaries
- AI interaction

---

## 6. Minimum V1 Dashboard

The first version should include:
- overview page
- Start / Stop / Reset controls
- machine state badge
- recipe display
- good/reject counters
- active fault display
- simple AI summary panel or action

---

## 7. UX Guidance

The dashboard should:
- use a dark industrial visual style
- keep status colors consistent with the HMI spec
- prioritize clarity over feature overload
- feel polished enough for demos and portfolio use

---

## 8. AI Integration

The dashboard should include an AI panel or entry point for:
- explain current fault
- summarize session
- answer log questions
- compare recipe performance

---

## 9. Final Guidance

The dashboard is the modern face of the project.

The key rule is:
**it should make the simulation feel like a real industrial software product, not just a debug UI.**
