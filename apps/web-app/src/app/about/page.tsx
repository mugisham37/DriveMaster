import React from "react";
import { Metadata } from "next";
import Link from "next/link";
import { Layout } from "@/components/layout/Layout";
import { AboutNav } from "@/components/about";
import { GraphicalIcon } from "@/components/common/GraphicalIcon";

export const metadata: Metadata = {
  title: "About Exercism - Free Coding Practice & Mentorship",
  description:
    "Learn about Exercism's mission to provide free, high-quality programming education through practice exercises and mentorship.",
};

export default function AboutPage() {
  return (
    <Layout>
      <div className="bg-white">
        <AboutNav activeTab="about" />

        {/* Mission Section - Image 3 */}
        <section className="relative bg-white py-32 overflow-hidden">
          {/* Subtle hexagon background pattern */}
          <div className="absolute inset-0 opacity-3">
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23CBD5E0' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
              }}
            />
          </div>

          {/* Decorative shapes */}
          <div
            className="absolute top-20 left-20 w-10 h-10 bg-yellow-400 opacity-60"
            style={{ transform: "rotate(45deg)" }}
          />
          <div
            className="absolute top-32 right-24 w-12 h-12 opacity-40"
            style={{
              background:
                "repeating-linear-gradient(45deg, #1A1A2E, #1A1A2E 2px, transparent 2px, transparent 8px)",
            }}
          />
          <div
            className="absolute left-16 top-1/2 w-9 h-9 bg-teal-400 opacity-60"
            style={{ transform: "rotate(45deg)" }}
          />
          <div
            className="absolute right-20 top-2/3 w-11 h-11 opacity-40"
            style={{
              background:
                "radial-gradient(circle, #7C3AED 1px, transparent 1px)",
              backgroundSize: "8px 8px",
            }}
          />
          <div
            className="absolute bottom-32 right-16 w-12 h-12 bg-yellow-400 opacity-60"
            style={{ transform: "rotate(45deg)" }}
          />

          <div className="relative max-w-4xl mx-auto px-8 text-center">
            {/* Logo */}
            <div className="mb-7">
              <GraphicalIcon
                icon="exercism-face"
                width={130}
                height={130}
                className="mx-auto"
              />
            </div>

            {/* Heading */}
            <h1
              className="text-6xl font-extrabold mb-4"
              style={{ color: "#1A1A2E" }}
            >
              Exercism
            </h1>

            {/* Decorative zigzag line */}
            <div className="flex justify-center mb-11">
              <svg width="70" height="3" viewBox="0 0 70 3" fill="none">
                <path
                  d="M0 1.5L7 0L14 3L21 0L28 3L35 0L42 3L49 0L56 3L63 0L70 1.5"
                  stroke="#1A1A2E"
                  strokeWidth="2"
                  fill="none"
                />
              </svg>
            </div>

            {/* Mission Statement */}
            <p
              className="text-26 leading-relaxed mb-11 max-w-3xl mx-auto"
              style={{
                color: "#1A1A2E",
                lineHeight: "1.5",
              }}
            >
              We&apos;re building a place where anyone can learn and master
              programming for free, without ever feeling lost or stupid.
            </p>

            {/* CTA Button */}
            <Link
              href="/donate"
              className="inline-flex items-center px-9 py-4 text-lg font-semibold text-white rounded-lg shadow-lg transition-all duration-200 hover:shadow-xl hover:scale-105"
              style={{
                background: "linear-gradient(135deg, #7C3AED 0%, #6B21A8 100%)",
                boxShadow: "0 4px 12px rgba(124, 58, 237, 0.3)",
              }}
            >
              Donate to Exercism
              <span className="ml-2">→</span>
            </Link>
          </div>
        </section>

        {/* Purpose Section - Image 1 Top */}
        <section
          className="relative"
          style={{
            background: "#E8F1F8",
            borderLeft: "4px solid #6B46C1",
          }}
        >
          <div className="max-w-7xl mx-auto px-24 py-20">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-16 items-center">
              {/* Left Column - Text Content */}
              <div className="lg:col-span-3">
                <div className="mb-6">
                  <GraphicalIcon icon="target-sparkle" width={52} height={52} />
                </div>

                <h2
                  className="text-5xl font-bold mb-6"
                  style={{ color: "#1A1A2E" }}
                >
                  Purpose
                </h2>

                <p
                  className="text-lg leading-relaxed max-w-2xl"
                  style={{
                    color: "#4A5568",
                    lineHeight: "1.7",
                  }}
                >
                  We&apos;re here to help everyone get really good at
                  programming, regardless of their background. We want to share
                  our love of programming, and help people upskill as part of
                  their upward social mobility.
                </p>
              </div>

              {/* Right Column - Illustration */}
              <div className="lg:col-span-2 flex justify-center">
                <div className="relative">
                  {/* Circular glow background */}
                  <div className="absolute inset-0 bg-gradient-radial from-blue-200/30 to-transparent rounded-full transform scale-150" />

                  {/* Person coding illustration placeholder */}
                  <div className="relative w-70 h-70 bg-gradient-to-br from-purple-100 to-blue-100 rounded-2xl flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-6xl mb-2">👩🏽‍💻</div>
                      <div className="flex justify-center space-x-2 text-sm">
                        <span className="px-2 py-1 bg-green-500 text-white rounded text-xs">
                          Node
                        </span>
                        <span className="px-2 py-1 bg-yellow-500 text-white rounded text-xs">
                          JS
                        </span>
                        <span className="px-2 py-1 bg-blue-500 text-white rounded text-xs">
                          CSS
                        </span>
                        <span className="px-2 py-1 bg-orange-500 text-white rounded text-xs">
                          HTML
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Three Cards Section - Image 1 Bottom */}
        <section className="py-20 bg-white">
          <div className="max-w-7xl mx-auto px-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-7">
              {/* Card 1 - ATTAIN MASTERY */}
              <div className="bg-white border border-gray-200 rounded-lg p-11 text-center">
                <div className="w-11 h-11 border-2 border-gray-900 rounded flex items-center justify-center mx-auto mb-5 text-xl font-semibold">
                  1
                </div>
                <h3
                  className="text-sm font-bold uppercase tracking-wider mb-4"
                  style={{
                    color: "#1A1A2E",
                    letterSpacing: "1.5px",
                  }}
                >
                  ATTAIN MASTERY
                </h3>
                <p
                  className="text-base leading-relaxed"
                  style={{
                    color: "#4A5568",
                    lineHeight: "1.6",
                  }}
                >
                  We want people to experience the joy of programming — the deep
                  satisfaction from being a fluent programmer.
                </p>
              </div>

              {/* Card 2 - HAVE FUN */}
              <div className="bg-white border border-gray-200 rounded-lg p-11 text-center">
                <div className="w-11 h-11 border-2 border-gray-900 rounded flex items-center justify-center mx-auto mb-5 text-xl font-semibold">
                  2
                </div>
                <h3
                  className="text-sm font-bold uppercase tracking-wider mb-4"
                  style={{
                    color: "#1A1A2E",
                    letterSpacing: "1.5px",
                  }}
                >
                  HAVE FUN
                </h3>
                <p
                  className="text-base leading-relaxed"
                  style={{
                    color: "#4A5568",
                    lineHeight: "1.6",
                  }}
                >
                  Developing programming skills should be empowering and fun,
                  not competitive, frustrating or stressful.
                </p>
              </div>

              {/* Card 3 - SOCIAL MOBILITY */}
              <div className="bg-white border border-gray-200 rounded-lg p-11 text-center">
                <div className="w-11 h-11 border-2 border-gray-900 rounded flex items-center justify-center mx-auto mb-5 text-xl font-semibold">
                  3
                </div>
                <h3
                  className="text-sm font-bold uppercase tracking-wider mb-4"
                  style={{
                    color: "#1A1A2E",
                    letterSpacing: "1.5px",
                  }}
                >
                  SOCIAL MOBILITY
                </h3>
                <p
                  className="text-base leading-relaxed"
                  style={{
                    color: "#4A5568",
                    lineHeight: "1.6",
                  }}
                >
                  We want everyone, especially the economically deprived, to
                  achieve upward mobility through learning to code.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Principles Section - Image 2 */}
        <section className="py-25 bg-white">
          <div className="max-w-4xl mx-auto px-8">
            {/* Header */}
            <div className="text-center mb-14">
              <div className="mb-4">
                <GraphicalIcon
                  icon="pencil-edit"
                  width={52}
                  height={52}
                  className="mx-auto"
                />
              </div>

              <h2
                className="text-5xl font-bold mb-4"
                style={{ color: "#1A1A2E" }}
              >
                Principles
              </h2>

              {/* Decorative zigzag line */}
              <div className="flex justify-center mb-14">
                <svg width="70" height="3" viewBox="0 0 70 3" fill="none">
                  <path
                    d="M0 1.5L7 0L14 3L21 0L28 3L35 0L42 3L49 0L56 3L63 0L70 1.5"
                    stroke="#1A1A2E"
                    strokeWidth="2"
                    fill="none"
                  />
                </svg>
              </div>
            </div>

            {/* Principles List */}
            <div className="space-y-9">
              <div className="flex items-start">
                <div className="flex-shrink-0 mr-6">
                  <div
                    className="w-11 h-11 border-2 rounded-full flex items-center justify-center"
                    style={{ borderColor: "#7C3AED" }}
                  >
                    <span className="text-lg" style={{ color: "#7C3AED" }}>
                      →
                    </span>
                  </div>
                </div>
                <p
                  className="text-lg leading-relaxed"
                  style={{
                    color: "#4A5568",
                    lineHeight: "1.6",
                  }}
                >
                  Exercism should be enjoyable, challenging and valuable.
                </p>
              </div>

              <div className="flex items-start">
                <div className="flex-shrink-0 mr-6">
                  <div
                    className="w-11 h-11 border-2 rounded-full flex items-center justify-center"
                    style={{ borderColor: "#7C3AED" }}
                  >
                    <span className="text-lg" style={{ color: "#7C3AED" }}>
                      →
                    </span>
                  </div>
                </div>
                <p
                  className="text-lg leading-relaxed"
                  style={{
                    color: "#4A5568",
                    lineHeight: "1.6",
                  }}
                >
                  Exercism should encourage a growth-mindset, clear and
                  empathetic communication, and emphasize the value in learning
                  together.
                </p>
              </div>

              <div className="flex items-start">
                <div className="flex-shrink-0 mr-6">
                  <div
                    className="w-11 h-11 border-2 rounded-full flex items-center justify-center"
                    style={{ borderColor: "#7C3AED" }}
                  >
                    <span className="text-lg" style={{ color: "#7C3AED" }}>
                      →
                    </span>
                  </div>
                </div>
                <p
                  className="text-lg leading-relaxed"
                  style={{
                    color: "#4A5568",
                    lineHeight: "1.6",
                  }}
                >
                  Exercism should feel safe and nurturing.
                </p>
              </div>

              <div className="flex items-start">
                <div className="flex-shrink-0 mr-6">
                  <div
                    className="w-11 h-11 border-2 rounded-full flex items-center justify-center"
                    style={{ borderColor: "#7C3AED" }}
                  >
                    <span className="text-lg" style={{ color: "#7C3AED" }}>
                      →
                    </span>
                  </div>
                </div>
                <p
                  className="text-lg leading-relaxed"
                  style={{
                    color: "#4A5568",
                    lineHeight: "1.6",
                  }}
                >
                  Exercism focusses on the learning journey, not the
                  destination. The process and enjoyment of learning is more
                  important than absolute factual correctness.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </Layout>
  );
}
