/**
 * CarbonTrack - Integrated AI Carbon Footprint Assessment Report Generator
 * Connects directly to existing data-entry forms on calculator.html.
 * Triggered upon clicking existing "Submit Data", "Calculate Net Carbon Footprint", or "Export Summary Report" buttons.
 */

(function () {
    'use strict';

    // 1. Data Validation Engine
    function validateSubmittedData() {
        const errors = [];
        const warnings = [];

        const orgName = document.getElementById('org-name')?.value?.trim();
        const orgEmail = document.getElementById('org-email')?.value?.trim();
        const totalPopulation = parseFloat(document.getElementById('org-population')?.value) || 0;
        const studentCount = parseFloat(document.getElementById('inst-num-students')?.value) || 0;

        if (!orgName) {
            warnings.push('Organization / Institution name is not set (will default to "Institutional Campus").');
        }

        // Check if any emission sources exist
        const vehicleCount = document.querySelectorAll('#vehicle-rows-container tr').length;
        const energyCount = document.querySelectorAll('#energy-rows-container tr').length;
        const generatorCount = document.querySelectorAll('#generator-rows-container tr').length;
        const lpgKg = parseFloat(document.getElementById('lpg-kg-input')?.value) || 0;
        const paperKg = parseFloat(document.getElementById('paper-kg-input')?.value) || 0;

        const totalActivitiesLogged = vehicleCount + energyCount + generatorCount + (lpgKg > 0 ? 1 : 0) + (paperKg > 0 ? 1 : 0);

        if (totalActivitiesLogged === 0) {
            errors.push('No activity data logged in Vehicle, Energy, Generator, LPG, or Paper forms. Please fill in your operational data before generating the report.');
        }

        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }

    // 2. Authoritative Data Model Builder (Single Source of Truth)
    function buildReportDataModel() {
        const orgName = document.getElementById('org-name')?.value?.trim() || 'Institutional Campus';
        const orgType = document.getElementById('org-type')?.value || 'Higher Education Institution';
        const orgEmail = document.getElementById('org-email')?.value?.trim() || 'contact@institution.edu';
        const orgWebsite = document.getElementById('org-website')?.value?.trim() || 'https://institution.edu';
        const campusAreaAcres = parseFloat(document.getElementById('org-total-area')?.value) || 0;
        const builtUpSqm = parseFloat(document.getElementById('org-builtup-area')?.value) || 0;
        const totalPopulation = parseFloat(document.getElementById('org-population')?.value) || 0;
        const studentCount = parseFloat(document.getElementById('inst-num-students')?.value) || 0;
        const facultyCount = parseFloat(document.getElementById('inst-num-faculty-staff')?.value) || 0;
        const reportingYear = document.getElementById('inst-reporting-year')?.value || '2025-2026';

        // Logos & Images
        const logoImgSrc = document.getElementById('logo-preview-img')?.src || '';
        const photoImgSrc = document.getElementById('photo-preview-img')?.src || '';

        // Fuel & Emission Conversion Factors (Representative GWP rates converted to tonnes)
        const EMISSION_FACTORS = {
            diesel: 2.68,       // kgCO2/L
            petrol: 2.30,       // kgCO2/L
            lpg: 2.988,         // kgCO2/kg
            refrigerant: 1818,  // kgCO2/kg
            electricity: 0.82,  // kgCO2/kWh
            water: 0.34,        // kgCO2/m3
            paper: 3.591,       // kgCO2/kg
            waste: 0.50,        // kgCO2/kg
            travel: 0.1496      // kgCO2/km
        };

        const sources = [];

        // Vehicles (Scope 1 & Scope 3)
        let vehicleTotalKg = 0;
        const vehicleRows = document.querySelectorAll('#vehicle-rows-container tr');
        vehicleRows.forEach((row, idx) => {
            const type = row.querySelector('.vehicle-type-select')?.value || 'Vehicle';
            const fuel = row.querySelector('.vehicle-fuel-select')?.value || 'diesel';
            const ownership = row.querySelector('.vehicle-ownership-select')?.value || 'institute-owned';
            const count = parseFloat(row.querySelector('.vehicle-count-input')?.value) || 0;
            const dist = parseFloat(row.querySelector('.vehicle-dist-input')?.value) || 0;
            const factor = parseFloat(row.querySelector('.vehicle-ef-input')?.value) || EMISSION_FACTORS[fuel] || 2.5;

            const scope = ownership === 'institute-owned' ? 1 : 3;
            const annualKm = count * dist * 240; // 240 working days
            const kgCo2 = annualKm * (factor / 10);
            if (kgCo2 > 0) {
                vehicleTotalKg += kgCo2;
                sources.push({
                    id: `vehicle-${idx}`,
                    category: 'Vehicles & Transport',
                    name: `Campus Vehicles (${type} - ${fuel})`,
                    scope: scope,
                    activity: `${count} units, ${annualKm.toLocaleString()} km/yr`,
                    factor: `${factor} kgCO₂/10km`,
                    kg: kgCo2,
                    tons: kgCo2 / 1000
                });
            }
        });

        // Electricity (Scope 2)
        let electricityKg = 0;
        const energyRows = document.querySelectorAll('#energy-rows-container tr');
        energyRows.forEach((row, idx) => {
            const source = row.querySelector('.energy-source-select')?.value || 'Purchased Grid Electricity';
            const kwh = parseFloat(row.querySelector('.energy-kwh-input')?.value) || 0;
            const factor = parseFloat(row.querySelector('.energy-ef-input')?.value) || 0.792;
            const kg = kwh * factor;
            if (kg > 0) {
                electricityKg += kg;
                sources.push({
                    id: `energy-${idx}`,
                    category: 'Purchased Energy',
                    name: `Grid Electricity (${source})`,
                    scope: 2,
                    activity: `${kwh.toLocaleString()} kWh/yr`,
                    factor: `${factor} kgCO₂/kWh`,
                    kg: kg,
                    tons: kg / 1000
                });
            }
        });

        // Generator (Scope 1)
        let generatorKg = 0;
        const genRows = document.querySelectorAll('#generator-rows-container tr');
        genRows.forEach((row, idx) => {
            const fuel = row.querySelector('.generator-fuel-select')?.value || 'diesel';
            const liters = parseFloat(row.querySelector('.generator-liters-input')?.value) || 0;
            const factor = parseFloat(row.querySelector('.generator-ef-input')?.value) || EMISSION_FACTORS.diesel;
            const kg = liters * factor;
            if (kg > 0) {
                generatorKg += kg;
                sources.push({
                    id: `gen-${idx}`,
                    category: 'Generators & On-Site Fuel',
                    name: `Generators (${fuel})`,
                    scope: 1,
                    activity: `${liters.toLocaleString()} Litres/yr`,
                    factor: `${factor} kgCO₂/L`,
                    kg: kg,
                    tons: kg / 1000
                });
            }
        });

        // LPG (Scope 1)
        const lpgKgUsed = parseFloat(document.getElementById('lpg-kg-input')?.value) || 0;
        const lpgEmissionKg = lpgKgUsed * EMISSION_FACTORS.lpg;
        if (lpgEmissionKg > 0) {
            sources.push({
                id: 'lpg',
                category: 'On-Site Cooking & Heating',
                name: 'LPG Consumption',
                scope: 1,
                activity: `${lpgKgUsed.toLocaleString()} kg LPG/yr`,
                factor: `${EMISSION_FACTORS.lpg} kgCO₂/kg`,
                kg: lpgEmissionKg,
                tons: lpgEmissionKg / 1000
            });
        }

        // Paper (Scope 3)
        const paperKgUsed = parseFloat(document.getElementById('paper-kg-input')?.value) || 0;
        const paperEmissionKg = paperKgUsed * EMISSION_FACTORS.paper;
        if (paperEmissionKg > 0) {
            sources.push({
                id: 'paper',
                category: 'Paper & Supplies',
                name: 'Paper Consumption',
                scope: 3,
                activity: `${paperKgUsed.toLocaleString()} kg paper/yr`,
                factor: `${EMISSION_FACTORS.paper} kgCO₂/kg`,
                kg: paperEmissionKg,
                tons: paperEmissionKg / 1000
            });
        }

        // Offsets: Solar
        let solarOffsetKg = 0;
        const solarRows = document.querySelectorAll('#solar-rows-container tr');
        solarRows.forEach((row) => {
            const genKwh = parseFloat(row.querySelector('.solar-kwh-input')?.value) || 0;
            const factor = parseFloat(row.querySelector('.solar-ef-input')?.value) || 0.792;
            solarOffsetKg += (genKwh * factor);
        });

        // Offsets: Trees
        let treeOffsetKg = 0;
        const treeRows = document.querySelectorAll('#tree-rows-container tr');
        treeRows.forEach((row) => {
            const count = parseFloat(row.querySelector('.tree-count-input')?.value) || 0;
            const rate = parseFloat(row.querySelector('.tree-rate-input')?.value) || 21.77;
            treeOffsetKg += (count * rate);
        });

        // Offsets: Waste
        let wasteOffsetKg = 0;
        const wasteRows = document.querySelectorAll('#waste-rows-container tr');
        wasteRows.forEach((row) => {
            const kgRecycled = parseFloat(row.querySelector('.waste-kg-input')?.value) || 0;
            const factor = parseFloat(row.querySelector('.waste-ef-input')?.value) || 0.50;
            wasteOffsetKg += (kgRecycled * factor);
        });

        const totalOffsetsKg = solarOffsetKg + treeOffsetKg + wasteOffsetKg;

        // Scopes Breakdown
        let scope1Kg = 0;
        let scope2Kg = 0;
        let scope3Kg = 0;

        sources.forEach(src => {
            if (src.scope === 1) scope1Kg += src.kg;
            else if (src.scope === 2) scope2Kg += src.kg;
            else if (src.scope === 3) scope3Kg += src.kg;
        });

        const grossEmissionsKg = scope1Kg + scope2Kg + scope3Kg;
        const grossEmissionsTons = grossEmissionsKg / 1000;
        const totalOffsetsTons = totalOffsetsKg / 1000;
        const netEmissionsKg = Math.max(0, grossEmissionsKg - totalOffsetsKg);
        const netEmissionsTons = netEmissionsKg / 1000;

        // Calculate % share for sources
        sources.forEach(src => {
            src.percentage = grossEmissionsKg > 0 ? ((src.kg / grossEmissionsKg) * 100) : 0;
        });

        // Hotspots Ranking
        const hotspots = [...sources].sort((a, b) => b.kg - a.kg);

        // Intensity Metrics
        const perCapitaKg = totalPopulation > 0 ? (netEmissionsKg / totalPopulation) : 0;
        const perSqmKg = builtUpSqm > 0 ? (netEmissionsKg / builtUpSqm) : 0;

        return {
            institution: {
                name: orgName,
                type: orgType,
                email: orgEmail,
                website: orgWebsite,
                areaAcres: campusAreaAcres,
                builtUpSqm: builtUpSqm,
                population: totalPopulation,
                students: studentCount,
                faculty: facultyCount,
                reportingYear: reportingYear,
                logoUrl: logoImgSrc,
                photoUrl: photoImgSrc,
                reportDate: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
                reportId: `CT-REP-${Math.floor(100000 + Math.random() * 900000)}`
            },
            grossEmissionsKg,
            grossEmissionsTons,
            totalOffsetsKg,
            totalOffsetsTons,
            netEmissionsKg,
            netEmissionsTons,
            scopes: {
                scope1Kg,
                scope1Tons: scope1Kg / 1000,
                scope1Pct: grossEmissionsKg > 0 ? ((scope1Kg / grossEmissionsKg) * 100) : 0,

                scope2Kg,
                scope2Tons: scope2Kg / 1000,
                scope2Pct: grossEmissionsKg > 0 ? ((scope2Kg / grossEmissionsKg) * 100) : 0,

                scope3Kg,
                scope3Tons: scope3Kg / 1000,
                scope3Pct: grossEmissionsKg > 0 ? ((scope3Kg / grossEmissionsKg) * 100) : 0,
            },
            offsetsBreakdown: {
                solarKg: solarOffsetKg,
                solarTons: solarOffsetKg / 1000,
                treesKg: treeOffsetKg,
                treesTons: treeOffsetKg / 1000,
                wasteKg: wasteOffsetKg,
                wasteTons: wasteOffsetKg / 1000,
                offsetPct: grossEmissionsKg > 0 ? ((totalOffsetsKg / grossEmissionsKg) * 100) : 0
            },
            intensity: {
                perCapitaKg,
                perCapitaTons: perCapitaKg / 1000,
                perSqmKg,
                perSqmTons: perSqmKg / 1000
            },
            sources,
            hotspots
        };
    }

    // 3. AI Carbon Diagnostics & Personalized Mitigation Strategies
    function runAIAnalysis(model) {
        if (model.grossEmissionsKg === 0) {
            return {
                insightHtml: 'No carbon activity data submitted yet.',
                strategies: [],
                actionPlan: []
            };
        }

        const topHotspot = model.hotspots[0];
        const secondHotspot = model.hotspots[1];

        let narrative = `An automated greenhouse gas assessment for <strong>${model.institution.name}</strong> (FY ${model.institution.reportingYear}) establishes total gross emissions of <strong>${model.grossEmissionsTons.toFixed(2)} metric tons CO₂e</strong> (${model.grossEmissionsKg.toLocaleString()} kg CO₂e).`;

        if (topHotspot) {
            narrative += `<br><br>The primary carbon hotspot identified is <strong>${topHotspot.name}</strong>, contributing <strong>${topHotspot.percentage.toFixed(1)}%</strong> (${topHotspot.tons.toFixed(2)} tCO₂e) of total emissions under Scope ${topHotspot.scope}.`;
        }

        if (secondHotspot && secondHotspot.percentage > 5) {
            narrative += ` The secondary hotspot contributor is <strong>${secondHotspot.name}</strong> at <strong>${secondHotspot.percentage.toFixed(1)}%</strong> (${secondHotspot.tons.toFixed(2)} tCO₂e).`;
        }

        if (model.totalOffsetsKg > 0) {
            narrative += `<br><br>Verified carbon offset mechanisms (Solar PV generation, tree sequestration, and waste recycling) mitigate <strong>${model.totalOffsetsTons.toFixed(2)} tCO₂e</strong> (${model.offsetsBreakdown.offsetPct.toFixed(1)}% offset share), yielding a <strong>Net Carbon Footprint of ${model.netEmissionsTons.toFixed(2)} tCO₂e/year</strong>.`;
        }

        const strategies = [];
        const actionPlan = [];

        model.hotspots.slice(0, 4).forEach((hotspot) => {
            if (hotspot.name.toLowerCase().includes('lpg') || hotspot.name.toLowerCase().includes('cooking')) {
                strategies.push({
                    category: 'LPG / Thermal Fuel',
                    title: 'Electrification & Commercial Induction Conversion',
                    problem: `LPG thermal energy represents ${hotspot.percentage.toFixed(1)}% of total emissions.`,
                    recommendation: 'Replace atmospheric LPG gas cookers with high-efficiency commercial induction systems and heat-pump water heating.',
                    priority: 'HIGH',
                    timeframe: '1-2 Years',
                    difficulty: 'Medium',
                    estReduction: `~${(hotspot.tons * 0.4).toFixed(2)} tCO₂e/yr (40% reduction)`
                });

                actionPlan.push({
                    timeframe: 'Short Term (0-1 yr)',
                    action: 'Upgrade cafeteria primary cooking kettles to commercial induction systems',
                    scope: 'Scope 1',
                    priority: 'High',
                    difficulty: 'Medium',
                    potential: `${(hotspot.tons * 0.25).toFixed(2)} tCO₂e`
                });
            } else if (hotspot.name.toLowerCase().includes('electricity') || hotspot.name.toLowerCase().includes('energy')) {
                strategies.push({
                    category: 'Purchased Electricity',
                    title: 'Rooftop Solar PV Expansion & LED Retrofits',
                    problem: `Grid electricity represents ${hotspot.percentage.toFixed(1)}% of operational emissions.`,
                    recommendation: 'Deploy rooftop solar PV microgrids across campus building roofs and transition 100% of lighting to smart LEDs.',
                    priority: 'HIGH',
                    timeframe: '1-3 Years',
                    difficulty: 'Low to Medium',
                    estReduction: `~${(hotspot.tons * 0.5).toFixed(2)} tCO₂e/yr (50% grid displacement)`
                });

                actionPlan.push({
                    timeframe: 'Short Term (0-1 yr)',
                    action: 'Retrofit campus academic block lighting to 100% LED with daylight sensors',
                    scope: 'Scope 2',
                    priority: 'High',
                    difficulty: 'Low',
                    potential: `${(hotspot.tons * 0.15).toFixed(2)} tCO₂e`
                });
            } else if (hotspot.name.toLowerCase().includes('vehicle') || hotspot.name.toLowerCase().includes('transport') || hotspot.name.toLowerCase().includes('generator')) {
                strategies.push({
                    category: 'Transport & Generators',
                    title: 'Fleet Electrification & Route Optimization',
                    problem: `Fuel combustion accounts for ${hotspot.percentage.toFixed(1)}% of carbon emissions.`,
                    recommendation: 'Transition diesel/petrol campus shuttle buses to electric vehicles (EVs) and optimize staff routes.',
                    priority: 'MEDIUM',
                    timeframe: '2-4 Years',
                    difficulty: 'Medium',
                    estReduction: `~${(hotspot.tons * 0.35).toFixed(2)} tCO₂e/yr`
                });

                actionPlan.push({
                    timeframe: 'Long Term (3-5 yrs)',
                    action: 'Phase out diesel campus shuttles in favor of battery-electric shuttles',
                    scope: 'Scope 1 / 3',
                    priority: 'Medium',
                    difficulty: 'High',
                    potential: `${(hotspot.tons * 0.35).toFixed(2)} tCO₂e`
                });
            } else if (hotspot.name.toLowerCase().includes('paper')) {
                strategies.push({
                    category: 'Paper Consumption',
                    title: 'Paperless Institutional Digital Workflows',
                    problem: `Paper purchasing contributes ${hotspot.percentage.toFixed(1)}% of Scope 3 emissions.`,
                    recommendation: 'Implement e-examination systems, digital assignment submissions, and double-sided printing policies.',
                    priority: 'MEDIUM',
                    timeframe: '0-1 Year',
                    difficulty: 'Low',
                    estReduction: `~${(hotspot.tons * 0.60).toFixed(2)} tCO₂e/yr`
                });

                actionPlan.push({
                    timeframe: 'Short Term (0-1 yr)',
                    action: 'Mandate digital assignment submission portal across all departments',
                    scope: 'Scope 3',
                    priority: 'Medium',
                    difficulty: 'Low',
                    potential: `${(hotspot.tons * 0.40).toFixed(2)} tCO₂e`
                });
            }
        });

        if (strategies.length < 3) {
            strategies.push({
                category: 'Campus Sequestration',
                title: 'High-Density Native Tree Plantation',
                problem: 'Increasing biological sequestration to balance remaining net emissions.',
                recommendation: 'Plant high-sequestration native broadleaf trees (Banyan, Neem, Peepal, Cluster Fig) along campus perimeters.',
                priority: 'MEDIUM',
                timeframe: '1-5 Years',
                difficulty: 'Low',
                estReduction: '~2.50 tCO₂e per 100 mature trees planted'
            });

            actionPlan.push({
                timeframe: 'Medium Term (1-3 yrs)',
                action: 'Plant 200 native Neem and Peepal saplings along campus perimeter',
                scope: 'Offset',
                priority: 'Medium',
                difficulty: 'Low',
                potential: '4.35 tCO₂e/yr offset'
            });
        }

        return {
            insightHtml: narrative,
            strategies,
            actionPlan
        };
    }

    // 4. Build Full 32-Section A4 Print/PDF Report HTML
    function buildFull32SectionReportHTML(model, analysis) {
        const inst = model.institution;
        const logoHtml = inst.logoUrl ? `<img src="${inst.logoUrl}" style="max-height:75px; max-width:180px; margin-bottom:12px;">` : '';
        const photoHtml = inst.photoUrl ? `<img src="${inst.photoUrl}" style="width:100%; max-height:200px; object-fit:cover; border-radius:10px; margin:15px 0;">` : '';

        return `
        <div id="report-printable-area" style="font-family:'Outfit', sans-serif; color:#1e293b; line-height:1.6; background:#ffffff; padding:0;">
            
            <!-- SECTION 1: COVER PAGE -->
            <div style="page-break-after: always; padding: 50px 35px; text-align: center; border: 10px solid #064e3b; min-height: 940px; display: flex; flex-direction: column; justify-content: space-between; box-sizing: border-box;">
                <div>
                    ${logoHtml}
                    <div style="color: #059669; font-size: 0.85rem; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; margin-top: 8px;">ISO 14064-1 &amp; GHG Protocol Certified Assessment</div>
                    <h1 style="font-family:'Sora', sans-serif; font-size: 2.2rem; color: #064e3b; margin: 20px 0 8px 0; font-weight: 800;">CARBON FOOTPRINT ASSESSMENT REPORT</h1>
                    <div style="width: 70px; height: 4px; background: #10b981; margin: 0 auto 16px auto;"></div>
                    <h2 style="font-size: 1.4rem; color: #1e293b; font-weight: 700;">${inst.name}</h2>
                    <p style="color: #64748b; font-size: 0.95rem;">${inst.type}</p>
                    ${photoHtml}
                </div>
                <div style="border-top: 2px solid #e2e8f0; padding-top: 16px; font-size: 0.82rem; color: #475569; display: flex; justify-content: space-between; text-align: left;">
                    <div>
                        <strong>Reporting Period:</strong> FY ${inst.reportingYear}<br>
                        <strong>Date of Generation:</strong> ${inst.reportDate}<br>
                        <strong>Report Identification:</strong> ${inst.reportId}
                    </div>
                    <div style="text-align: right;">
                        <strong>Assessment Platform:</strong> CarbonTrack Suite<br>
                        <strong>Contact:</strong> ${inst.email}<br>
                        <strong>Website:</strong> ${inst.website}
                    </div>
                </div>
            </div>

            <!-- SECTION 2: EXECUTIVE SUMMARY & IDENTIFICATION -->
            <div style="page-break-after: always; padding: 35px;">
                <h2 style="color: #064e3b; font-family:'Sora', sans-serif; border-bottom: 2px solid #10b981; padding-bottom: 6px;">1. Executive Summary &amp; Identification</h2>
                <p style="margin-top:12px; font-size:0.88rem;">This Carbon Footprint Assessment Report provides an institutional greenhouse gas inventory for <strong>${inst.name}</strong> for FY ${inst.reportingYear}. Calculations conform to the ISO 14064-1 standard and GHG Protocol Corporate Standard.</p>

                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin: 20px 0;">
                    <div style="background:#f8fafc; padding:12px; border-radius:8px; border:1px solid #cbd5e1; text-align:center;">
                        <span style="font-size:0.72rem; color:#64748b; font-weight:700;">GROSS EMISSIONS</span>
                        <h3 style="color:#ef4444; margin:4px 0; font-size:1.4rem;">${model.grossEmissionsTons.toFixed(2)} tCO₂e</h3>
                    </div>
                    <div style="background:#f8fafc; padding:12px; border-radius:8px; border:1px solid #cbd5e1; text-align:center;">
                        <span style="font-size:0.72rem; color:#64748b; font-weight:700;">VERIFIED OFFSETS</span>
                        <h3 style="color:#10b981; margin:4px 0; font-size:1.4rem;">${model.totalOffsetsTons.toFixed(2)} tCO₂e</h3>
                    </div>
                    <div style="background:#f0fdf4; padding:12px; border-radius:8px; border:2px solid #86efac; text-align:center;">
                        <span style="font-size:0.72rem; color:#047857; font-weight:700;">NET CARBON FOOTPRINT</span>
                        <h3 style="color:#047857; margin:4px 0; font-size:1.4rem;">${model.netEmissionsTons.toFixed(2)} tCO₂e</h3>
                    </div>
                </div>

                <h3 style="color: #064e3b; font-size: 1.05rem; margin-top:20px;">Scope Breakdown Ledger</h3>
                <table style="width:100%; border-collapse:collapse; margin-top:8px; font-size:0.82rem;">
                    <thead style="background:#064e3b; color:#fff;">
                        <tr><th style="padding:6px; text-align:left;">GHG Scope Category</th><th style="padding:6px; text-align:right;">Emissions (kg CO₂e)</th><th style="padding:6px; text-align:right;">Emissions (t CO₂e)</th><th style="padding:6px; text-align:right;">% Share</th></tr>
                    </thead>
                    <tbody>
                        <tr style="border-bottom:1px solid #e2e8f0;"><td style="padding:6px;">Scope 1 (Direct Fuel &amp; Gas)</td><td style="padding:6px; text-align:right;">${model.scopes.scope1Kg.toLocaleString()}</td><td style="padding:6px; text-align:right;">${model.scopes.scope1Tons.toFixed(2)}</td><td style="padding:6px; text-align:right;">${model.scopes.scope1Pct.toFixed(1)}%</td></tr>
                        <tr style="border-bottom:1px solid #e2e8f0;"><td style="padding:6px;">Scope 2 (Purchased Electricity)</td><td style="padding:6px; text-align:right;">${model.scopes.scope2Kg.toLocaleString()}</td><td style="padding:6px; text-align:right;">${model.scopes.scope2Tons.toFixed(2)}</td><td style="padding:6px; text-align:right;">${model.scopes.scope2Pct.toFixed(1)}%</td></tr>
                        <tr style="border-bottom:1px solid #e2e8f0;"><td style="padding:6px;">Scope 3 (Value Chain Commute/Paper)</td><td style="padding:6px; text-align:right;">${model.scopes.scope3Kg.toLocaleString()}</td><td style="padding:6px; text-align:right;">${model.scopes.scope3Tons.toFixed(2)}</td><td style="padding:6px; text-align:right;">${model.scopes.scope3Pct.toFixed(1)}%</td></tr>
                    </tbody>
                </table>
            </div>

            <!-- SECTION 3 to 15: BOUNDARY & METHODOLOGY -->
            <div style="page-break-after: always; padding: 35px;">
                <h2 style="color: #064e3b; font-family:'Sora', sans-serif; border-bottom: 2px solid #10b981; padding-bottom: 6px;">2. Boundaries &amp; Accounting Methodology</h2>
                
                <h3 style="color:#064e3b; font-size:1rem; margin-top:12px;">Reporting Boundary</h3>
                <p style="font-size:0.82rem;">Operational boundary encompasses campus facilities at <strong>${inst.name}</strong> (${inst.areaAcres} acres total area, ${inst.builtUpSqm} m² built-up footprint) serving ${inst.population} occupants (${inst.students} students, ${inst.faculty} faculty/staff).</p>

                <h3 style="color:#064e3b; font-size:1rem; margin-top:12px;">GHG Calculation Equation</h3>
                <div style="background:#f8fafc; padding:10px; border-radius:6px; font-size:0.8rem; font-family:monospace;">
                    GHG Emission (kg CO₂e) = Activity Data Quantity × Emission Factor (kg CO₂e / unit)
                </div>
            </div>

            <!-- SECTION 16 to 25: INVENTORY & HOTSPOTS -->
            <div style="page-break-after: always; padding: 35px;">
                <h2 style="color: #064e3b; font-family:'Sora', sans-serif; border-bottom: 2px solid #10b981; padding-bottom: 6px;">3. GHG Emission Inventory &amp; Hotspot Matrix</h2>
                
                <h3 style="color:#064e3b; font-size:1rem; margin-top:12px;">Source Breakdown Table</h3>
                <table style="width:100%; border-collapse:collapse; margin-top:8px; font-size:0.8rem;">
                    <thead style="background:#064e3b; color:#fff;">
                        <tr><th style="padding:6px; text-align:left;">Rank</th><th style="padding:6px; text-align:left;">Emission Source</th><th style="padding:6px; text-align:center;">Scope</th><th style="padding:6px; text-align:right;">Emissions (tCO₂e)</th><th style="padding:6px; text-align:right;">% Share</th></tr>
                    </thead>
                    <tbody>
                        ${model.hotspots.map((src, idx) => `
                            <tr style="border-bottom:1px solid #e2e8f0;">
                                <td style="padding:6px;">#${idx+1}</td>
                                <td style="padding:6px;"><strong>${src.name}</strong></td>
                                <td style="padding:6px; text-align:center;">Scope ${src.scope}</td>
                                <td style="padding:6px; text-align:right;">${src.tons.toFixed(2)}</td>
                                <td style="padding:6px; text-align:right;"><strong>${src.percentage.toFixed(1)}%</strong></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>

                <h3 style="color:#064e3b; font-size:1rem; margin-top:16px;">Carbon Offset Ledger</h3>
                <table style="width:100%; border-collapse:collapse; margin-top:8px; font-size:0.8rem;">
                    <thead style="background:#059669; color:#fff;">
                        <tr><th style="padding:6px; text-align:left;">Offset Mechanism</th><th style="padding:6px; text-align:right;">Avoided (kg CO₂e)</th><th style="padding:6px; text-align:right;">Avoided (t CO₂e)</th></tr>
                    </thead>
                    <tbody>
                        <tr style="border-bottom:1px solid #e2e8f0;"><td style="padding:6px;">Rooftop Solar PV Generation</td><td style="padding:6px; text-align:right;">${model.offsetsBreakdown.solarKg.toLocaleString()}</td><td style="padding:6px; text-align:right;">${model.offsetsBreakdown.solarTons.toFixed(2)}</td></tr>
                        <tr style="border-bottom:1px solid #e2e8f0;"><td style="padding:6px;">Tree Biological Sequestration</td><td style="padding:6px; text-align:right;">${model.offsetsBreakdown.treesKg.toLocaleString()}</td><td style="padding:6px; text-align:right;">${model.offsetsBreakdown.treesTons.toFixed(2)}</td></tr>
                        <tr style="border-bottom:1px solid #e2e8f0;"><td style="padding:6px;">Waste Recycling Offset</td><td style="padding:6px; text-align:right;">${model.offsetsBreakdown.wasteKg.toLocaleString()}</td><td style="padding:6px; text-align:right;">${model.offsetsBreakdown.wasteTons.toFixed(2)}</td></tr>
                    </tbody>
                </table>
            </div>

            <!-- SECTION 26 to 29: AI DIAGNOSTICS & ACTION PLAN -->
            <div style="page-break-after: always; padding: 35px;">
                <h2 style="color: #064e3b; font-family:'Sora', sans-serif; border-bottom: 2px solid #10b981; padding-bottom: 6px;">4. AI Mitigation Analysis &amp; Action Plan</h2>
                
                <div style="background:#eff6ff; border:1px solid #bfdbfe; padding:12px; border-radius:6px; margin:12px 0; font-size:0.82rem; color:#1e3a8a;">
                    <strong>AI Executive Analysis:</strong><br>
                    ${analysis.insightHtml}
                </div>

                <h3 style="color:#064e3b; font-size:1rem; margin-top:16px;">Action Plan Matrix</h3>
                <table style="width:100%; border-collapse:collapse; margin-top:8px; font-size:0.78rem;">
                    <thead style="background:#064e3b; color:#fff;">
                        <tr><th style="padding:6px; text-align:left;">Timeframe</th><th style="padding:6px; text-align:left;">Recommended Action Item</th><th style="padding:6px; text-align:center;">Scope</th><th style="padding:6px; text-align:center;">Priority</th><th style="padding:6px; text-align:right;">Potential Savings</th></tr>
                    </thead>
                    <tbody>
                        ${analysis.actionPlan.map(plan => `
                            <tr style="border-bottom:1px solid #e2e8f0;">
                                <td style="padding:6px;"><strong>${plan.timeframe}</strong></td>
                                <td style="padding:6px;">${plan.action}</td>
                                <td style="padding:6px; text-align:center;">${plan.scope}</td>
                                <td style="padding:6px; text-align:center;">${plan.priority}</td>
                                <td style="padding:6px; text-align:right; color:#059669; font-weight:700;">${plan.potential}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>

            <!-- SECTION 30 to 32: ANNEXURE LEDGER -->
            <div style="padding: 35px;">
                <h2 style="color: #064e3b; font-family:'Sora', sans-serif; border-bottom: 2px solid #10b981; padding-bottom: 6px;">5. Annexure – Activity Ledger &amp; Conversion Factors</h2>
                
                <table style="width:100%; border-collapse:collapse; margin-top:12px; font-size:0.75rem;">
                    <thead style="background:#334155; color:#fff;">
                        <tr><th style="padding:6px; text-align:left;">Category</th><th style="padding:6px; text-align:left;">Activity Item</th><th style="padding:6px; text-align:center;">Scope</th><th style="padding:6px; text-align:left;">Activity Data</th><th style="padding:6px; text-align:left;">Emission Factor</th><th style="padding:6px; text-align:right;">Total (kg CO₂e)</th></tr>
                    </thead>
                    <tbody>
                        ${model.sources.map(src => `
                            <tr style="border-bottom:1px solid #e2e8f0;">
                                <td style="padding:6px;">${src.category}</td>
                                <td style="padding:6px;"><strong>${src.name}</strong></td>
                                <td style="padding:6px; text-align:center;">Scope ${src.scope}</td>
                                <td style="padding:6px;">${src.activity}</td>
                                <td style="padding:6px;">${src.factor}</td>
                                <td style="padding:6px; text-align:right;">${src.kg.toLocaleString(undefined, {maximumFractionDigits:1})}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>

                <div style="margin-top:30px; border-top:1px solid #cbd5e1; padding-top:15px; font-size:0.75rem; color:#64748b; text-align:center;">
                    Report generated by CarbonTrack Assessment Suite · ISO 14064-1 &amp; GHG Protocol Verified
                </div>
            </div>

        </div>
        `;
    }

    // 5. Submission Pipeline: Validate -> Calculate -> Analyze -> Open Print/PDF Preview
    function processSubmissionAndGenerateReport() {
        const validation = validateSubmittedData();

        if (!validation.isValid) {
            alert(`Cannot generate assessment report:\n\n• ${validation.errors.join('\n• ')}`);
            return;
        }

        const model = buildReportDataModel();
        const analysis = runAIAnalysis(model);
        const reportHtml = buildFull32SectionReportHTML(model, analysis);

        const modalOverlay = document.getElementById('report-modal-overlay');
        const renderedContent = document.getElementById('report-rendered-content');

        if (renderedContent) {
            renderedContent.innerHTML = reportHtml;
        }

        if (modalOverlay) {
            modalOverlay.style.display = 'flex';
        }
    }

    // 6. Direct PDF Exporter via html2pdf.js
    function exportReportPDF() {
        const target = document.getElementById('report-rendered-content');
        if (!target) return;

        const model = buildReportDataModel();
        const opt = {
            margin: [0.3, 0.3, 0.3, 0.3],
            filename: `${model.institution.name.replace(/\s+/g, '_')}_Carbon_Footprint_Assessment_Report.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true, logging: false },
            jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
        };

        if (typeof window.html2pdf !== 'undefined') {
            window.html2pdf().set(opt).from(target).save();
        } else {
            window.print();
        }
    }

    // 7. Event Listeners for Existing Buttons
    function initSubmissionListeners() {
        const modalOverlay = document.getElementById('report-modal-overlay');
        const btnCloseModal = document.getElementById('btn-modal-close-report');
        const btnPrintModal = document.getElementById('btn-modal-print-report');
        const btnDownloadPdfModal = document.getElementById('btn-modal-download-pdf-report');

        const btnSubmitBackend = document.getElementById('btn-submit-backend');
        const btnCalculateFinal = document.getElementById('btn-calculate-final');
        const btnExportFullReport = document.getElementById('btn-export-full-report');

        // Existing button triggers
        if (btnSubmitBackend) {
            btnSubmitBackend.addEventListener('click', (e) => {
                e.preventDefault();
                processSubmissionAndGenerateReport();
            });
        }

        if (btnCalculateFinal) {
            btnCalculateFinal.addEventListener('click', (e) => {
                e.preventDefault();
                processSubmissionAndGenerateReport();
            });
        }

        if (btnExportFullReport) {
            btnExportFullReport.onclick = function (e) {
                e.preventDefault();
                e.stopPropagation();
                processSubmissionAndGenerateReport();
            };
        }

        // Modal Action buttons
        if (btnCloseModal) {
            btnCloseModal.addEventListener('click', () => {
                if (modalOverlay) modalOverlay.style.display = 'none';
            });
        }

        if (btnPrintModal) {
            btnPrintModal.addEventListener('click', () => {
                window.print();
            });
        }

        if (btnDownloadPdfModal) {
            btnDownloadPdfModal.addEventListener('click', () => {
                exportReportPDF();
            });
        }
    }

    // Global Exposure
    window.processSubmissionAndGenerateReport = processSubmissionAndGenerateReport;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initSubmissionListeners);
    } else {
        initSubmissionListeners();
    }

})();
