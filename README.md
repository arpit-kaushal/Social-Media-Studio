# Social Media Studio

Create polished, ready-to-post social media carousels from a simple idea.

Built with **Next.js (App Router)**, **React**, **TypeScript**, and **CSS Modules**.

---

## ✨ What it does

Turn a prompt like:

> “Carousel for parents about why kids forget what they learn — explain the forgetting curve — end with spaced repetition”

into a fully designed, editable carousel with copy, visuals, and export-ready slides.

---

## 🚀 Core Features

### 1. Simple Creation Flow
- Enter your idea
- Choose a format:
  - **Post (1:1)**
  - **Story (9:16)**
  - **Carousel**
- Click **Generate**

---

### 2. Studio Experience
- **Left:** Slide editor (text, styling, layout)
- **Right:** Live phone preview

---

### 3. Smart Layouts

#### Carousel
- Hook → Content Slides → CTA  
- Swipeable preview with indicators  

#### Post
- Single square layout (1:1)  

#### Story
- Vertical 9:16 format  
- Story-style progress UI  
- Swipe between slides  

---

### 4. AI + Fallback System
- AI-generated copy (JSON structured)  
- Clean fallback logic if APIs are unavailable  
- Titles are always structured for consistency  

---

### 5. Image Handling
- Multiple image sources combined into candidate lists  
- Automatic fallback if images fail  
- Seamless background rendering per slide  

---

### 6. Full Customization
- Edit:
  - Title & body text  
  - Font & colors  
  - Text size  
  - Vertical alignment (top / center / bottom)  
- Customize background overlays (gradients)  

---

### 7. Export
- Download all slides as high-quality PNGs (2× resolution)  
- Optimized for social media posting  

---

## 🛠️ Getting Started

### Requirements
- Node.js **18.18+** (20+ recommended)

### Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Optional: [http://localhost:3000/status](http://localhost:3000/status) checks external APIs.

### Environment

Copy `.env.example` to **`.env.local` in the project root** (Next.js only loads env files from the root). Set optional keys for AI copy (Gemini / Groq) and stock photos (Pexels / Unsplash).

### Production build

```bash
npm run build
npm run start
```

Use Node **18.18+** (20+ recommended). On hosts like Vercel, add the same variables in the project settings.

**Status page:** In production, upstream error bodies are not echoed from `/api/status` (only short hints). To hide the page entirely, set `STATUS_PAGE_ENABLED=false` in production (returns 404 for `/api/status`).

**Image proxy:** `GET /api/image-proxy` only forwards allowlisted HTTPS image hosts; keep it that way if you deploy publicly.