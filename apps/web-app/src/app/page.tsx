import { Layout } from "@/components/layout/Layout";
import {
  LandingHero,
  ExerciseShowcase,
  LanguageExploration,
} from "@/components/landing";

export default function Home() {
  return (
    <Layout>
      <LandingHero />
      <LanguageExploration />
      <ExerciseShowcase />
    </Layout>
  );
}
