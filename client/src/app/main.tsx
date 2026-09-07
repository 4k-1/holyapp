import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import {App} from './App.tsx'
import { ThemeProvider } from "@/theme/ThemeProvider";
import { ensureParishes } from "@/features/parish/parishApi";

async function boot() {
  try {
    await Promise.race([
      ensureParishes(),
      new Promise((_, reject) => setTimeout(() => reject(new Error("parish preload timeout")), 2000)),
    ]);
  } catch {
    // Parish search stays empty until the API is reachable.
  }

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <ThemeProvider>
      <App />
      </ThemeProvider>
      
    </StrictMode>,
  )
}

void boot();
