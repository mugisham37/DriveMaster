import { Layout } from "@/components/layout/Layout";
import { LandingHero, LanguageExploration } from "@/components/landing";

export default function Home() {
  return (
    <Layout>
      <LandingHero />
      <LanguageExploration />
    </Layout>
  );
}
