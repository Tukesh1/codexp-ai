import { Hero } from '@/components/sections/hero'
import { Features } from '@/components/sections/features'
import { Testimonials } from '@/components/sections/testimonials'
import { Pricing } from '@/components/sections/pricing'
import { CTA } from '@/components/sections/cta'
import { Footer } from '@/components/layout/footer'
import { Header } from '@/components/layout/header'
export default function Home() {
  return (
    <div className="min-h-screen bg-[#0D0C0D]">
      <Header />
      <main>
        
        <Hero />
        <Features />
        <Testimonials />
        <Pricing />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}
