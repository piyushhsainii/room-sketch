import BenchStrip from "@/components/landing/BenchStrip";
import Capabilities from "@/components/landing/Capabilities";
import ComparisonStrip from "@/components/landing/ComparisonStrip";
import FinalCta from "@/components/landing/FinalCta";
import Footer from "@/components/landing/Footer";
import Hero from "@/components/landing/Hero";
import HowItWorks from "@/components/landing/HowItWorks";
import Nav from "@/components/landing/Nav";
import Pricing from "@/components/landing/Pricing";
import ScrollReveal from "@/components/landing/ScrollReveal";

export default function Home() {
  return (
    <main>
      <ScrollReveal />
      <Nav />
      <Hero />
      <BenchStrip />
      <HowItWorks />
      <Capabilities />
      <ComparisonStrip />
      <Pricing />
      <FinalCta />
      <Footer />
    </main>
  );
}
