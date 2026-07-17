import { Header } from "@/components/layout/header"
import { Footer } from "@/components/layout/footer"
import { Hero } from "@/components/sections/hero"
import { Features } from "@/components/sections/features"
import { ProductTour } from "@/components/sections/product-tour"
import { Pricing } from "@/components/sections/pricing"
import { CTA } from "@/components/sections/cta"

export default function Home() {
  return (
    <div className="landing-root">
      <Header />
      <main>
        <Hero />
        <ProductTour />
        <Features />
        <Pricing />
        <CTA />
      </main>
      <Footer />
    </div>
  )
}
