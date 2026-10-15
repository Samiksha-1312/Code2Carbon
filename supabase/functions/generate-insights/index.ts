// Supabase Edge Function: generate-insights
// Secure server-side environmental insights generation powered by Google Gemini API
// API Key is retrieved from Supabase Environment Secrets (GEMINI_API_KEY) - never exposed to the client

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({
          error: "GEMINI_API_KEY is not configured in Supabase Secrets.",
          isConfigured: false,
        }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { assessment } = await req.json();
    if (!assessment) {
      return new Response(
        JSON.stringify({ error: "Missing assessment data payload." }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Build structured prompt for Gemini
    const systemPrompt = `You are a certified Lead Carbon Auditor (ISO 14064-1 & GHG Protocol Corporate Standard) conducting an institutional carbon footprint assessment.
Analyze the provided institutional greenhouse gas assessment data with rigorous technical and scientific fidelity.
DO NOT fabricate unrecorded emission categories or assume unmeasured categories are zero.
Base all interpretations, hotspot analysis, and recommendations strictly on the provided quantitative data.
The quantitative calculations are authoritative; your task is to provide formal, high-level academic explanation, interpretation, and targeted engineering recommendations.`;

    const userPrompt = `Analyze this institutional greenhouse gas assessment and produce structured JSON environmental insights.

INSTITUTIONAL METADATA:
- Institution Name: ${assessment.institution.name}
- Campus Location: ${assessment.institution.address}
- Campus Built-up Area: ${assessment.institution.builtUpSqm} m²
- Total Population: ${assessment.institution.population} (${assessment.institution.students} students, ${assessment.institution.faculty} faculty & staff)
- Reporting Period: ${assessment.institution.reportPeriodText} (${assessment.institution.reportingYear})

CALCULATED EMISSIONS & OFFSETS (AUTHORITATIVE DETERMINISTIC DATA):
- Scope 1 (Direct Emissions): ${assessment.scopes.scope1Kg.toFixed(2)} kg CO₂e (${assessment.scopes.scope1Tons.toFixed(2)} t CO₂e, ${assessment.scopes.scope1Pct.toFixed(1)}% of total)
- Scope 2 (Purchased Electricity): ${assessment.scopes.scope2Kg.toFixed(2)} kg CO₂e (${assessment.scopes.scope2Tons.toFixed(2)} t CO₂e, ${assessment.scopes.scope2Pct.toFixed(1)}% of total)
- Scope 3 (Indirect Activities): ${assessment.scopes.scope3Kg.toFixed(2)} kg CO₂e (${assessment.scopes.scope3Tons.toFixed(2)} t CO₂e, ${assessment.scopes.scope3Pct.toFixed(1)}% of total)
- Gross Institutional Emissions: ${assessment.grossEmissionsKg.toFixed(2)} kg CO₂e (${assessment.grossEmissionsTons.toFixed(2)} t CO₂e)
- Total Offsets Generated: ${assessment.totalOffsetsKg.toFixed(2)} kg CO₂e (${assessment.totalOffsetsTons.toFixed(2)} t CO₂e)
  * Solar Generation Avoided: ${assessment.offsetsBreakdown.solarKg.toFixed(2)} kg CO₂e (${assessment.offsetsBreakdown.solarPct.toFixed(1)}%)
  * Vegetative / Tree Sequestration: ${assessment.offsetsBreakdown.treesKg.toFixed(2)} kg CO₂e (${assessment.offsetsBreakdown.treesPct.toFixed(1)}%)
  * Waste Recycling Offset: ${assessment.offsetsBreakdown.wasteKg.toFixed(2)} kg CO₂e
- Net Operational Carbon Footprint: ${assessment.netEmissionsKg.toFixed(2)} kg CO₂e (${assessment.netEmissionsTons.toFixed(2)} t CO₂e)
- Per-Capita Carbon Intensity: ${assessment.intensity.perCapitaKg.toFixed(2)} kg CO₂e/person/year
- Area Carbon Intensity: ${assessment.intensity.perSqmKg.toFixed(2)} kg CO₂e/m²/year

RECORDED ACTIVITIES & EMISSION SOURCES:
${JSON.stringify(assessment.sources, null, 2)}

HOTSPOTS RANKING:
${JSON.stringify(assessment.hotspots, null, 2)}

Return a valid JSON object matching the following structure:
{
  "executiveSummary": "Formal academic executive summary (2-3 paragraphs) analyzing the overall footprint, primary drivers, net balance, and strategic priorities.",
  "institutionalAnalysis": "Institutional profile analysis contextualizing the campus scale, population density, operational profile, and geographic setting.",
  "scope1Interpretation": "In-depth interpretation of Scope 1 direct combustion (LPG kitchens, DG, fleet) explaining the operational causes.",
  "scope2Interpretation": "In-depth interpretation of Scope 2 grid electricity consumption and renewable penetration.",
  "scope3Interpretation": "In-depth interpretation of Scope 3 indirect activities (transit, paper, supply chain).",
  "hotspotAnalysis": "Detailed analytical breakdown of the top emission hotspots, explaining why they dominate.",
  "internalComparisonAnalysis": "Comparison of internal source drivers and per-capita / per-area intensities against typical educational profiles, noting specific data nuances.",
  "standardsDiscussion": "Formal discussion of the assessment results against ISO 14064-1:2018 principles (relevance, completeness, consistency, accuracy, transparency).",
  "recommendations": [
    {
      "source": "Name of emission source addressed",
      "evidence": "Evidence and metric from current assessment",
      "action": "Recommended technical or engineering intervention",
      "priority": "High | Medium | Low",
      "timeframe": "Short-term (0-6 mo) | Medium-term (6-18 mo) | Long-term (1-3 yr)",
      "kpi": "Measurable KPI indicator",
      "reductionPotential": "Estimated reduction or expected direction of impact"
    }
  ],
  "conclusion": "Formal academic concluding statement summarizing findings, operational trajectory towards Net Zero, and verification sign-off."
}`;

    // Call Google Gemini REST API
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const geminiRes = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.2,
        },
      }),
    });

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error("Gemini API error:", errText);
      return new Response(
        JSON.stringify({
          error: `Gemini API returned error: ${geminiRes.statusText}`,
          details: errText,
        }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const geminiData = await geminiRes.json();
    const candidateText =
      geminiData.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!candidateText) {
      return new Response(
        JSON.stringify({ error: "Gemini did not return any candidate content." }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    let parsedInsights;
    try {
      parsedInsights = JSON.parse(candidateText);
    } catch (_jsonErr) {
      // If wrapped in markdown blocks
      const cleanJson = candidateText.replace(/^```json\s*/i, "").replace(/\s*```$/, "").trim();
      parsedInsights = JSON.parse(cleanJson);
    }

    return new Response(
      JSON.stringify({
        success: true,
        isAIGenerated: true,
        modelName: "Google Gemini 1.5 Flash via Supabase Edge Function",
        insights: parsedInsights,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Internal Edge Function error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal Edge Function exception occurred.",
        message: error.message,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
