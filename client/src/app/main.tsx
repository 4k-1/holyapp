import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import {App} from './App.tsx'
import { ThemeProvider } from "@/theme/ThemeProvider";
import { loadCertificateTestMode } from "@/lib/certificateMode";

// Asked up front so a certificate printed in the first seconds already carries its test-copy mark.
void loadCertificateTestMode();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
    
  </StrictMode>,
)
