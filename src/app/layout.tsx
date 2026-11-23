import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import RouteProgress from "@/components/RouteProgress";
import { BrandMark } from "@/components/Brand";

export const metadata: Metadata = {
  title: { default: "papr · Ghana's student research, seen", template: "%s · papr" },
  description: "Drop your research. Get it seen. papr is Ghana's open library of final-year projects, theses and papers, free to read, cite and share.",
};

// Runs before the page paints: picks light or dark (saved choice first, then the device setting)
// so the page never flashes the wrong colours.
const themeScript = `(function(){try{var t=localStorage.getItem('papr-theme');if(t!=='light'&&t!=='dark'){t=matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}document.documentElement.dataset.theme=t}catch(e){}})();`;

// The splash loader shows once per browser session, stays at least ~0.9s, and leaves when the page has loaded.
const splashScript = `(function(){var s=document.getElementById('splash');if(!s)return;try{if(sessionStorage.getItem('papr-splash')){s.className='skip';return}sessionStorage.setItem('papr-splash','1')}catch(e){}var t0=Date.now();function done(){setTimeout(function(){s.className='done'},Math.max(0,900-(Date.now()-t0)))}if(document.readyState==='complete')done();else window.addEventListener('load',done)})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body>
        <div id="splash" suppressHydrationWarning aria-hidden="true">
          <div className="inner">
            <div className="logo"><BrandMark size={28} /><b><span>p</span><span>a</span><span>p</span><span>r</span></b></div>
            <div className="track"><i /></div>
          </div>
        </div>
        <script dangerouslySetInnerHTML={{ __html: splashScript }} />
        <Suspense fallback={null}><RouteProgress /></Suspense>
        <Header />
        <main className="wrap">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
