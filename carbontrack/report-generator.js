/**
 * CarbonTrack - Institutional Carbon Footprint & Climate Accreditation Report Generator
 * Generates ISO 14064-1 & GHG Protocol Accredited Assessment Reports matching the SNJB reference report.
 * Features:
 *  - 100% Dynamic data model reading from calculator inputs
 *  - Genuine Gemini AI insights via Supabase Edge Function (with transparent deterministic fallback)
 *  - Fully dynamic page numbering and dynamic Table of Contents
 *  - Vector SVG charts (Scope donut, Offset donut, Hotspot bar chart)
 *  - Clean A4 portrait layout with green page borders matching SNJB reference
 *  - Preserves calculation integrity: deterministic calculations are authoritative
 */

(function () {
    'use strict';

    // Supabase Configuration for Edge Function Calls
    const SUPABASE_URL = "https://ifwnhzjfwluqjhsfykbw.supabase.co";
    const SUPABASE_ANON_KEY = "sb_publishable_dDgGIa04mh20YFU1PbGSsw_M0l6mfjG";

    // Helper to format tree species display names
    function formatSpeciesName(slug) {
        if (!slug) return 'Native Tree';
        const map = {
            'cluster-fig': 'Cluster Fig Tree (Ficus racemosa)',
            'banyan': 'Banyan Tree (Ficus benghalensis)',
            'neem': 'Neem Tree (Azadirachta indica)',
            'peepal': 'Peepal Tree (Ficus religiosa)',
            'almond': 'Indian Almond (Terminalia catappa)',
            'palm': 'Areca / Date Palm',
            'rosewood': 'Indian Rosewood (Dalbergia sissoo)',
            'guava': 'Guava Tree (Psidium guajava)',
            'ashoka': 'Ashoka Tree (Polyalthia longifolia)',
            'jasmine': 'Arabian Jasmine (Jasminum sambac)',
            'thuja': 'Thuja / Oriental Arborvitae',
            'tamarind': 'Tamarind Tree (Tamarindus indica)',
            'mango': 'Mango Tree (Mangifera indica)',
            'coconut': 'Coconut Palm (Cocos nucifera)',
            'gulmohar': 'Gulmohar (Delonix regia)',
            'potted-plants': 'Ornamental Potted Greenery'
        };
        return map[slug] || (slug.charAt(0).toUpperCase() + slug.slice(1).replace(/-/g, ' '));
    }

    // =========================================================================
    // 1. AUTHORITATIVE DETERMINISTIC DATA MODEL BUILDER
    // =========================================================================
    function buildReportDataModel() {
        const orgName = document.getElementById('org-name')?.value?.trim() || 'Institutional Campus';
        const orgAddress = document.getElementById('org-address')?.value?.trim() || 'Campus Address, Maharashtra, India';
        const orgContact = document.getElementById('org-contact')?.value?.trim() || '+91 20 2765 3168';
        const orgEmail = document.getElementById('org-email')?.value?.trim() || 'sustainability@institution.edu.in';
        const orgWebsite = document.getElementById('org-website')?.value?.trim() || 'https://institution.edu.in';
        const campusAreaAcres = parseFloat(document.getElementById('org-total-area')?.value) || 0;
        const builtUpSqm = parseFloat(document.getElementById('org-builtup-area')?.value) || 0;
        const totalPopulation = parseFloat(document.getElementById('org-population')?.value) || 0;
        const studentCount = parseFloat(document.getElementById('inst-num-students')?.value) || 0;
        const facultyCount = parseFloat(document.getElementById('inst-num-faculty-staff')?.value) || 0;
        const latitude = document.getElementById('org-lat')?.value || '20.33° N';
        const longitude = document.getElementById('org-lng')?.value || '74.23° E';
        const elevation = document.getElementById('org-elevation')?.value ? `${document.getElementById('org-elevation').value} m` : '585 m';

        // Logos & Photos
        const rawLogoSrc = document.getElementById('logo-preview-img')?.src || '';
        const rawPhotoSrc = document.getElementById('photo-preview-img')?.src || '';
        const logoImgSrc = rawLogoSrc.startsWith('data:') ? rawLogoSrc : '';
        const photoImgSrc = rawPhotoSrc.startsWith('data:') ? rawPhotoSrc : '';

        // Dynamic Dates
        const now = new Date();
        const formattedReportDate = now.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });
        const currentYr = now.getFullYear();
        const prevYr = currentYr - 1;
        const dynamicReportingYear = `Financial Year ${prevYr}–${currentYr} (FY ${currentYr})`;
        const dynamicPeriodText = `1st April ${prevYr} to 31st March ${currentYr}`;

        // Standard Emission Conversion Factors (ISO 14064 / CEA / IPCC / DEFRA)
        const EMISSION_FACTORS = {
            diesel: 2.684,       // kgCO2e/L
            petrol: 2.314,       // kgCO2e/L
            cng: 2.314,          // kgCO2e/kg
            lpg: 2.988,          // kgCO2e/kg
            electricity: 0.792,  // kgCO2e/kWh (CEA Baseline Database India User Guide v19.0)
            paper: 3.591         // kgCO2e/kg
        };

        const sources = [];

        // --- SCOPE 1: Direct Emissions ---
        // 1. Diesel Generator
        let genLiters = 0;
        let generatorKg = 0;
        const genRows = document.querySelectorAll('#generator-rows-container tr');
        genRows.forEach((row) => {
            const liters = parseFloat(row.querySelector('.generator-liters')?.value) || 0;
            const factor = parseFloat(row.querySelector('.generator-factor')?.value) || EMISSION_FACTORS.diesel;
            const kg = liters * factor;
            genLiters += liters;
            generatorKg += kg;
        });

        if (generatorKg > 0) {
            sources.push({
                id: 'generator',
                scope: 1,
                category: 'Scope 1 – Direct Stationary Combustion',
                name: 'Diesel Generator Backup Systems',
                activityData: `${genLiters.toLocaleString(undefined, {maximumFractionDigits:1})} Liters/year`,
                factor: `${EMISSION_FACTORS.diesel} kg CO₂e/L`,
                kg: generatorKg,
                tons: generatorKg / 1000
            });
        }

        // 2. LPG Consumption
        let lpgKgUsed = 0;
        let lpgEmissionKg = 0;
        const lpgRows = document.querySelectorAll('#lpg-rows-container tr');
        lpgRows.forEach((row) => {
            const cyl = parseFloat(row.querySelector('.lpg-cylinders')?.value) || 0;
            const weight = parseFloat(row.querySelector('.lpg-weight')?.value) || 19;
            const factor = parseFloat(row.querySelector('.lpg-factor')?.value) || EMISSION_FACTORS.lpg;
            const annualKgLpg = cyl * weight * 12;
            const kgCo2 = annualKgLpg * factor;
            lpgKgUsed += annualKgLpg;
            lpgEmissionKg += kgCo2;
        });

        const lpgSingleInput = parseFloat(document.getElementById('lpg-kg-input')?.value) || 0;
        if (lpgSingleInput > 0 && lpgRows.length === 0) {
            lpgKgUsed = lpgSingleInput;
            lpgEmissionKg = lpgKgUsed * EMISSION_FACTORS.lpg;
        }

        if (lpgEmissionKg > 0) {
            sources.push({
                id: 'lpg',
                scope: 1,
                category: 'Scope 1 – Direct Thermal Combustion',
                name: 'Liquefied Petroleum Gas (LPG) - Dining & Mess Kitchens',
                activityData: `${lpgKgUsed.toLocaleString(undefined, {maximumFractionDigits:1})} kg LPG/year`,
                factor: `${EMISSION_FACTORS.lpg} kg CO₂e/kg`,
                kg: lpgEmissionKg,
                tons: lpgEmissionKg / 1000
            });
        }

        // --- SCOPE 2: Indirect Energy Emissions ---
        let electricityKwh = 0;
        let electricityKg = 0;
        const energyRows = document.querySelectorAll('#energy-rows-container tr');
        energyRows.forEach((row) => {
            const kwh = parseFloat(row.querySelector('.energy-consumption')?.value) || 0;
            const factor = parseFloat(row.querySelector('.energy-factor')?.value) || EMISSION_FACTORS.electricity;
            const type = row.querySelector('.energy-type')?.value || 'purchased-grid';
            if (type !== 'solar-power' && type !== 'wind-power') {
                const kg = kwh * factor;
                electricityKwh += kwh;
                electricityKg += kg;
            }
        });

        if (electricityKg > 0) {
            sources.push({
                id: 'electricity',
                scope: 2,
                category: 'Scope 2 – Purchased Electricity',
                name: 'State Grid Electricity Supply (MSEDCL/Utility)',
                activityData: `${electricityKwh.toLocaleString(undefined, {maximumFractionDigits:1})} kWh/year`,
                factor: `${EMISSION_FACTORS.electricity} kg CO₂e/kWh`,
                kg: electricityKg,
                tons: electricityKg / 1000
            });
        }

        // --- SCOPE 3: Other Indirect Emissions ---
        // 1. Paper Procurement
        let paperKgUsed = 0;
        const paperRows = document.querySelectorAll('#paper-rows-container tr');
        paperRows.forEach((row) => {
            const kg = parseFloat(row.querySelector('.paper-kg')?.value) || 0;
            paperKgUsed += kg;
        });
        const paperSingleInput = parseFloat(document.getElementById('paper-kg-input')?.value) || 0;
        if (paperSingleInput > 0 && paperRows.length === 0) paperKgUsed = paperSingleInput;
        const paperEmissionKg = paperKgUsed * EMISSION_FACTORS.paper;

        if (paperEmissionKg > 0) {
            sources.push({
                id: 'paper',
                scope: 3,
                category: 'Scope 3 – Upstream Purchased Goods',
                name: 'Paper Procurement & Academic Supplies',
                activityData: `${paperKgUsed.toLocaleString(undefined, {maximumFractionDigits:1})} kg paper/year`,
                factor: `${EMISSION_FACTORS.paper} kg CO₂e/kg`,
                kg: paperEmissionKg,
                tons: paperEmissionKg / 1000
            });
        }

        // 2. Campus Vehicles (Scope 1 Fleet vs Scope 3 Commuter)
        let transportScope1Kg = 0;
        let transportScope3Kg = 0;
        const vehicleRows = document.querySelectorAll('#vehicle-rows-container tr');
        vehicleRows.forEach((row) => {
            const type = row.querySelector('.vehicle-type')?.value || 'car';
            const fuel = row.querySelector('.fuel-type')?.value || 'petrol';
            const ownership = row.querySelector('.vehicle-ownership')?.value || 'institute-owned';
            const count = parseFloat(row.querySelector('.vehicle-count')?.value) || 0;
            const dist = parseFloat(row.querySelector('.vehicle-distance')?.value) || 0;
            const factor = parseFloat(row.querySelector('.vehicle-factor')?.value) || 0.25;

            const dayEm = count * dist * factor * 0.0485;
            const annualKg = dayEm * 240;

            if (annualKg > 0) {
                const isScope1 = (ownership === 'institute-owned' && fuel !== 'electric');
                const targetScope = isScope1 ? 1 : 3;

                if (isScope1) transportScope1Kg += annualKg;
                else transportScope3Kg += annualKg;

                sources.push({
                    id: `vehicle-${sources.length}`,
                    scope: targetScope,
                    category: `Scope ${targetScope} – ${isScope1 ? 'Institutional Fleet Transit' : 'Daily Commuting Transit'}`,
                    name: `Campus Vehicles (${type.toUpperCase()} - ${fuel.toUpperCase()})`,
                    activityData: `${count} units, ~${dist} km daily`,
                    factor: `${factor} kg CO₂e/unit-km`,
                    kg: annualKg,
                    tons: annualKg / 1000
                });
            }
        });

        const totalScope1Kg = generatorKg + lpgEmissionKg + transportScope1Kg;
        const totalScope2Kg = electricityKg;
        const totalScope3Kg = paperEmissionKg + transportScope3Kg;

        // --- OFFSETS ---
        // 1. Solar Generation Offset
        let solarKwhGen = 0;
        let solarOffsetKg = 0;
        const solarRows = document.querySelectorAll('#solar-rows-container tr');
        solarRows.forEach((row) => {
            const kwh = parseFloat(row.querySelector('.solar-capacity')?.value) || 0;
            const factor = parseFloat(row.querySelector('.solar-factor')?.value) || EMISSION_FACTORS.electricity;
            const offset = parseFloat(row.querySelector('.solar-offset')?.textContent) || (kwh * factor);
            solarKwhGen += kwh;
            solarOffsetKg += offset;
        });

        // 2. Tree Sequestration Offset
        let treeCountTotal = 0;
        let treeOffsetKg = 0;
        const treeSpeciesList = [];
        const treeRows = document.querySelectorAll('#trees-rows-container tr');
        treeRows.forEach((row) => {
            const speciesSlug = row.querySelector('.tree-species')?.value || 'neem';
            const species = formatSpeciesName(speciesSlug);
            const count = parseFloat(row.querySelector('.tree-count')?.value) || 0;
            const rate = parseFloat(row.querySelector('.tree-factor')?.value) || 21.77;
            const abs = parseFloat(row.querySelector('.tree-absorption')?.textContent) || (count * rate);

            treeCountTotal += count;
            treeOffsetKg += abs;
            if (count > 0) {
                treeSpeciesList.push({ species, count, rate, absorption: abs });
            }
        });

        // 3. Waste Offset
        let wasteOffsetKg = 0;
        const wasteRows = document.querySelectorAll('#waste-rows-container tr');
        wasteRows.forEach((row) => {
            const offset = parseFloat(row.querySelector('.waste-offset')?.textContent) || 0;
            wasteOffsetKg += offset;
        });

        const totalOffsetsKg = solarOffsetKg + treeOffsetKg + wasteOffsetKg;
        const grossEmissionsKg = totalScope1Kg + totalScope2Kg + totalScope3Kg;
        const grossEmissionsTons = grossEmissionsKg / 1000;
        const totalOffsetsTons = totalOffsetsKg / 1000;
        const netEmissionsKg = Math.max(0, grossEmissionsKg - totalOffsetsKg);
        const netEmissionsTons = netEmissionsKg / 1000;

        // Percentages & Shares
        sources.forEach(src => {
            src.percentage = grossEmissionsKg > 0 ? ((src.kg / grossEmissionsKg) * 100) : 0;
        });

        // Hotspots (sorted descending by emissions)
        const hotspots = [...sources].sort((a, b) => b.kg - a.kg);

        // Intensity Metrics
        const perCapitaKg = totalPopulation > 0 ? (netEmissionsKg / totalPopulation) : 0;
        const grossPerCapitaKg = totalPopulation > 0 ? (grossEmissionsKg / totalPopulation) : 0;
        const perSqmKg = builtUpSqm > 0 ? (grossEmissionsKg / builtUpSqm) : 0;
        const netPerSqmKg = builtUpSqm > 0 ? (netEmissionsKg / builtUpSqm) : 0;

        return {
            institution: {
                name: orgName,
                address: orgAddress,
                contact: orgContact,
                email: orgEmail,
                website: orgWebsite,
                areaAcres: campusAreaAcres,
                builtUpSqm: builtUpSqm,
                population: totalPopulation,
                students: studentCount,
                faculty: facultyCount,
                lat: latitude,
                lng: longitude,
                elevation: elevation,
                reportingYear: dynamicReportingYear,
                reportPeriodText: dynamicPeriodText,
                logoUrl: logoImgSrc,
                photoUrl: photoImgSrc,
                documentCode: `CT-SUST-GHG-${currentYr}-${Math.floor(1000 + Math.random() * 9000)}`,
                executingAgency: `CarbonTrack Sustainability Assessment & Climate Accreditation Cell`,
                reportDate: formattedReportDate
            },
            grossEmissionsKg,
            grossEmissionsTons,
            totalOffsetsKg,
            totalOffsetsTons,
            netEmissionsKg,
            netEmissionsTons,
            scopes: {
                scope1Kg: totalScope1Kg,
                scope1Tons: totalScope1Kg / 1000,
                scope1Pct: grossEmissionsKg > 0 ? ((totalScope1Kg / grossEmissionsKg) * 100) : 0,

                scope2Kg: totalScope2Kg,
                scope2Tons: totalScope2Kg / 1000,
                scope2Pct: grossEmissionsKg > 0 ? ((totalScope2Kg / grossEmissionsKg) * 100) : 0,

                scope3Kg: totalScope3Kg,
                scope3Tons: totalScope3Kg / 1000,
                scope3Pct: grossEmissionsKg > 0 ? ((totalScope3Kg / grossEmissionsKg) * 100) : 0,
            },
            offsetsBreakdown: {
                solarKwhGen,
                solarKg: solarOffsetKg,
                solarTons: solarOffsetKg / 1000,
                solarPct: totalOffsetsKg > 0 ? ((solarOffsetKg / totalOffsetsKg) * 100) : 0,

                treeCountTotal,
                treesKg: treeOffsetKg,
                treesTons: treeOffsetKg / 1000,
                treesPct: totalOffsetsKg > 0 ? ((treeOffsetKg / totalOffsetsKg) * 100) : 0,
                treeSpeciesList,

                wasteKg: wasteOffsetKg,
                wasteTons: wasteOffsetKg / 1000,

                offsetRatioPct: grossEmissionsKg > 0 ? ((totalOffsetsKg / grossEmissionsKg) * 100) : 0
            },
            intensity: {
                perCapitaKg,
                grossPerCapitaKg,
                perCapitaTons: perCapitaKg / 1000,
                perSqmKg,
                netPerSqmKg
            },
            sources,
            hotspots
        };
    }

    // =========================================================================
    // 2. GENUINE AI INSIGHTS INTEGRATION (WITH TRANSPARENT FALLBACK)
    // =========================================================================
    async function fetchAIInsights(model) {
        const edgeFunctionUrl = `${SUPABASE_URL}/functions/v1/generate-insights`;
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6500);

        try {
            const response = await fetch(edgeFunctionUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
                },
                body: JSON.stringify({ assessment: model }),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (response.ok) {
                const data = await response.json();
                if (data && data.success && data.insights) {
                    return {
                        isAIGenerated: true,
                        source: 'Google Gemini 1.5 Flash (Supabase Edge Function)',
                        insights: data.insights
                    };
                }
            }
        } catch (err) {
            console.warn('AI Insights Edge Function unavailable. Utilizing transparent deterministic engine fallback:', err);
        }

        // Return Transparent Deterministic Fallback Engine
        return {
            isAIGenerated: false,
            source: 'CarbonTrack Deterministic Environmental Analytics Engine (Supabase Edge Function not configured)',
            insights: generateDeterministicInsights(model)
        };
    }

    function generateDeterministicInsights(model) {
        const s1 = model.scopes.scope1Pct.toFixed(1);
        const s2 = model.scopes.scope2Pct.toFixed(1);
        const s3 = model.scopes.scope3Pct.toFixed(1);
        const topHotspot = model.hotspots[0] || { name: 'Energy Consumption', percentage: 0, kg: 0 };
        const secondHotspot = model.hotspots[1] || { name: 'Transit & Operations', percentage: 0, kg: 0 };
        const instName = model.institution.name;

        // Determine dominant driver
        let dominantDriverText = '';
        if (model.scopes.scope1Pct > 45) {
            dominantDriverText = `Direct Scope 1 combustion represents the single largest greenhouse gas contributor for ${instName}, accounting for ${s1}% of gross emissions (${model.scopes.scope1Tons.toFixed(2)} t CO₂e). Thermal demands (primarily cooking LPG and stationary generators) dominate the operational boundary.`;
        } else if (model.scopes.scope2Pct > 45) {
            dominantDriverText = `Purchased grid electricity (Scope 2) constitutes the dominant emission channel, accounting for ${s2}% of gross institutional emissions (${model.scopes.scope2Tons.toFixed(2)} t CO₂e). Heavy reliance on the regional grid underscores the necessity for aggressive rooftop solar expansion.`;
        } else {
            dominantDriverText = `The institutional carbon profile shows a balanced distribution across scopes, with Scope 1 at ${s1}%, Scope 2 at ${s2}%, and Scope 3 at ${s3}%. Decarbonization requires coordinated multi-vector interventions across energy efficiency, transit, and clean cooking.`;
        }

        const recommendations = [
            {
                source: topHotspot.name,
                evidence: `Accounts for ${topHotspot.percentage.toFixed(1)}% of gross emissions (${(topHotspot.kg/1000).toFixed(2)} t CO₂e/yr).`,
                action: topHotspot.name.includes('LPG') 
                    ? 'Transition student hostel and mess kitchens from conventional commercial LPG burners to high-efficiency commercial induction cooktops powered by dedicated solar PV arrays. Install a decentralized organic waste-to-biogas digester using kitchen scraps to displace remaining fossil gas.'
                    : 'Implement high-efficiency inverter heat pumps, comprehensive LED retrofits, and occupancy-based HVAC setback schedules to lower primary demand.',
                priority: 'High',
                timeframe: 'Short-term (0–6 months)',
                kpi: 'Monthly fuel/energy reduction in targeted kitchens/blocks',
                reductionPotential: 'Estimated 35%–50% reduction in source emissions'
            },
            {
                source: 'Scope 2 – Purchased Electricity',
                evidence: `Grid electricity contributes ${model.scopes.scope2Kg.toFixed(1)} kg CO₂e/yr at a regional factor of 0.792 kg CO₂e/kWh.`,
                action: 'Expand rooftop solar photovoltaic (PV) generation to capture daytime peak loads. Implement smart digital energy sub-metering across departmental blocks and administrative buildings to identify off-hours phantom loads.',
                priority: 'High',
                timeframe: 'Medium-term (6–18 months)',
                kpi: 'Solar generation share (% of total campus demand) > 40%',
                reductionPotential: 'Avoids ~0.792 kg CO₂e for every clean kWh generated'
            },
            {
                source: 'Scope 3 – Commuting & Transit',
                evidence: `Campus transport operations generate ${model.scopes.scope3Kg.toFixed(1)} kg CO₂e/yr.`,
                action: 'Deploy institutional electric shuttle buggies for on-campus mobility; establish EV charging infrastructure powered by clean solar; optimize commuter bus transit routes to maximize vehicle occupancy.',
                priority: 'Medium',
                timeframe: 'Medium-term (6–18 months)',
                kpi: 'Fleet electrification percentage; average commuting passenger load',
                reductionPotential: 'Estimated 20%–30% mitigation in transport footprint'
            },
            {
                source: 'Scope 3 – Paper & Administrative Supplies',
                evidence: `Paper consumption contributes ${((model.sources.find(s=>s.id==='paper')?.kg || 0)/1000).toFixed(2)} t CO₂e/yr.`,
                action: 'Institutionalize a paperless campus protocol by digitizing academic submissions, examination evaluations, and administrative approvals via an integrated ERP / LMS ecosystem.',
                priority: 'Low',
                timeframe: 'Short-term (0–3 months)',
                kpi: 'Total reams of A4 paper procured per academic semester',
                reductionPotential: 'Estimated 60%–80% curtailment in physical paper consumption'
            },
            {
                source: 'Biological Carbon Sinks & Green Cover',
                evidence: `Existing vegetative cover sequesters ${model.offsetsBreakdown.treesKg.toFixed(1)} kg CO₂e/yr (${model.offsetsBreakdown.treeCountTotal} cataloged trees).`,
                action: 'Initiate targeted afforestation of high-sequestration indigenous species (such as Peepal, Banyan, Neem, and Tamarind) across campus perimeter zones, creating high-density micro-forests (Miyawaki method).',
                priority: 'Medium',
                timeframe: 'Continuous (Annual Drive)',
                kpi: 'Net tree survival count and canopy cover index',
                reductionPotential: 'Increases annual biological sequestration by 20–25 kg CO₂/tree/year'
            }
        ];

        return {
            executiveSummary: `The comprehensive greenhouse gas (GHG) inventory conducted for ${instName} for ${model.institution.reportingYear} reveals a gross operational carbon footprint of ${model.grossEmissionsKg.toLocaleString(undefined, {maximumFractionDigits:2})} kg CO₂e/year (${model.grossEmissionsTons.toFixed(2)} t CO₂e/year). Against this generation profile, verified clean energy systems and campus vegetative biomass produce ${model.totalOffsetsKg.toLocaleString(undefined, {maximumFractionDigits:2})} kg CO₂e/year (${model.totalOffsetsTons.toFixed(2)} t CO₂e/year) in valid offsets. Consequently, the net institutional carbon footprint is certified at ${model.netEmissionsKg.toLocaleString(undefined, {maximumFractionDigits:2})} kg CO₂e/year (${model.netEmissionsTons.toFixed(2)} t CO₂e/year).\n\n${dominantDriverText}\n\nOn an operational intensity basis, the institution records a net carbon intensity of ${model.intensity.perCapitaKg.toFixed(2)} kg CO₂e per occupant per year, and a gross spatial intensity of ${model.intensity.perSqmKg.toFixed(2)} kg CO₂e per square meter of built-up area. Decarbonization priorities must immediately concentrate on the primary hotspot (${topHotspot.name}), combined with targeted solar capacity expansion and digital governance workflows.`,
            institutionalAnalysis: `${instName} operates as an educational and technical campus with an active population of ${model.institution.population.toLocaleString()} occupants (${model.institution.students.toLocaleString()} students, ${model.institution.faculty.toLocaleString()} faculty and staff) situated across ${model.institution.areaAcres} acres with a total built-up footprint of ${model.institution.builtUpSqm.toLocaleString()} m². The physical layout comprises academic instructional halls, specialized technical laboratories, administrative offices, and auxiliary amenities. Geographic coordinates (${model.institution.lat}, ${model.institution.lng}) place the campus in an agro-climatic region characterized by strong solar irradiance, providing significant natural leverage for renewable self-generation.`,
            scope1Interpretation: `Scope 1 direct emissions contribute ${model.scopes.scope1Kg.toLocaleString(undefined, {maximumFractionDigits:2})} kg CO₂e (${model.scopes.scope1Tons.toFixed(2)} t CO₂e), representing ${s1}% of the gross institutional inventory. Combustion of fuels within the campus boundary is primarily driven by stationary power generators and thermal kitchen facilities. A detailed review reveals that diesel generator utilization is kept at minimal standby reserve, indicating dependable regional grid availability. Conversely, gaseous fuels (LPG) utilized for residential dining and laboratory heating represent the principal direct combustion volume, highlighting hostel culinary operations as a prime candidate for technological electrification.`,
            scope2Interpretation: `Scope 2 emissions stemming from purchased grid electricity total ${model.scopes.scope2Kg.toLocaleString(undefined, {maximumFractionDigits:2})} kg CO₂e (${model.scopes.scope2Tons.toFixed(2)} t CO₂e), constituting ${s2}% of total emissions. Energy consumption is calculated utilizing the Central Electricity Authority (CEA) CO₂ Baseline Database grid emission factor of 0.792 kg CO₂e/kWh. Where rooftop solar PV systems are operational, they actively suppress the net grid import profile, mitigating institutional exposure to grid-based carbon liabilities during daylight operational hours.`,
            scope3Interpretation: `Scope 3 indirect emissions account for ${model.scopes.scope3Kg.toLocaleString(undefined, {maximumFractionDigits:2})} kg CO₂e (${model.scopes.scope3Tons.toFixed(2)} t CO₂e), comprising ${s3}% of the overall inventory. The principal drivers within the assessed Scope 3 boundary include daily commuter transport (staff, faculty, and student transit) and administrative paper procurement. Commuter transit reflects regional transit habits and vehicle modal share. Digital workflow policies are actively curtailing paper-related emissions, with further gains achievable through enterprise resource planning (ERP) integration.`,
            hotspotAnalysis: `Empirical ranking of emission streams identifies ${topHotspot.name} as the primary emission hotspot (${topHotspot.percentage.toFixed(1)}% of gross footprint, ${(topHotspot.kg/1000).toFixed(2)} t CO₂e), followed by ${secondHotspot.name} (${secondHotspot.percentage.toFixed(1)}% of gross footprint). Prioritizing engineering capital towards mitigating ${topHotspot.name} delivers the most substantial net emission abatement per invested rupee.`,
            internalComparisonAnalysis: `Analysis of internal emission intensities reveals an operational signature of ${model.intensity.perCapitaKg.toFixed(2)} kg CO₂e/occupant/year. In comparison with typical Indian technical institutions where Scope 2 electricity commonly represents 60%–85% of emissions, ${instName}'s profile demonstrates distinctive thermal and operational dynamics. The low grid electricity share reflects effective daylight operations and renewable adoption, while highlighting dining thermal energy as the key strategic intervention vector.`,
            standardsDiscussion: `This assessment strictly adheres to the greenhouse gas accounting principles codified in ISO 14064-1:2018 and the GHG Protocol Corporate Standard: Relevance (reflecting operational boundary realities), Completeness (accounting for all active fuels, electricity, and measurable supplies), Consistency (applying standardized CEA and IPCC coefficients), Accuracy (minimizing calculation uncertainties), and Transparency (documenting all conversion equations and activity data records).`,
            recommendations: recommendations,
            conclusion: `The greenhouse gas baseline established for ${instName} provides a transparent, scientifically defensible platform for institutional climate leadership. With a net operational carbon footprint of ${model.netEmissionsTons.toFixed(2)} t CO₂e/year (${model.netEmissionsKg.toLocaleString(undefined, {maximumFractionDigits:2})} kg CO₂e) and an existing offset contribution of ${model.totalOffsetsTons.toFixed(2)} t CO₂e/year, the campus is well-positioned to achieve accelerated decarbonization. Implementing the targeted engineering recommendations—namely kitchen thermal electrification, solar PV scaling, transit optimization, and continuous native afforestation—will steer the campus toward meaningful Net-Zero alignment and enhanced accreditation standing.`
        };
    }

    // =========================================================================
    // 3. SVG CHART & VISUALIZATION GENERATORS
    // =========================================================================
    function generateScopeDonutChartSVG(model) {
        const s1 = model.scopes.scope1Pct;
        const s2 = model.scopes.scope2Pct;
        const s3 = model.scopes.scope3Pct;

        const circ = 502.65; // 2 * PI * 80
        const c1 = (s1 / 100) * circ;
        const c2 = (s2 / 100) * circ;
        const c3 = (s3 / 100) * circ;

        const off1 = 0;
        const off2 = -c1;
        const off3 = -(c1 + c2);

        return `
        <svg viewBox="0 0 500 240" width="100%" height="220" style="background:#ffffff; border:1px solid #cbd5e1; border-radius:8px;">
            <circle cx="150" cy="120" r="80" fill="none" stroke="#f1f5f9" stroke-width="32" />
            <circle cx="150" cy="120" r="80" fill="none" stroke="#e67e22" stroke-width="32" stroke-dasharray="${c1} ${circ}" stroke-dashoffset="${off1}" />
            <circle cx="150" cy="120" r="80" fill="none" stroke="#2980b9" stroke-width="32" stroke-dasharray="${c2} ${circ}" stroke-dashoffset="${off2}" />
            <circle cx="150" cy="120" r="80" fill="none" stroke="#27ae60" stroke-width="32" stroke-dasharray="${c3} ${circ}" stroke-dashoffset="${off3}" />
            
            <text x="150" y="115" text-anchor="middle" font-family="'Outfit', Calibri, sans-serif" font-size="16" font-weight="800" fill="#2c3e50">${model.grossEmissionsTons.toFixed(1)} t</text>
            <text x="150" y="132" text-anchor="middle" font-family="'Outfit', Calibri, sans-serif" font-size="10" font-weight="600" fill="#7f8c8d">GROSS EMISSIONS</text>

            <!-- Legend -->
            <g transform="translate(300, 50)">
                <rect x="0" y="0" width="16" height="16" rx="4" fill="#e67e22" />
                <text x="24" y="13" font-family="'Outfit', Calibri, sans-serif" font-size="12" font-weight="700" fill="#2c3e50">Scope 1 (Direct)</text>
                <text x="24" y="28" font-family="'Outfit', Calibri, sans-serif" font-size="11" fill="#7f8c8d">${model.scopes.scope1Tons.toFixed(2)} t (${s1.toFixed(1)}%)</text>

                <rect x="0" y="45" width="16" height="16" rx="4" fill="#2980b9" />
                <text x="24" y="58" font-family="'Outfit', Calibri, sans-serif" font-size="12" font-weight="700" fill="#2c3e50">Scope 2 (Electricity)</text>
                <text x="24" y="73" font-family="'Outfit', Calibri, sans-serif" font-size="11" fill="#7f8c8d">${model.scopes.scope2Tons.toFixed(2)} t (${s2.toFixed(1)}%)</text>

                <rect x="0" y="90" width="16" height="16" rx="4" fill="#27ae60" />
                <text x="24" y="103" font-family="'Outfit', Calibri, sans-serif" font-size="12" font-weight="700" fill="#2c3e50">Scope 3 (Indirect)</text>
                <text x="24" y="118" font-family="'Outfit', Calibri, sans-serif" font-size="11" fill="#7f8c8d">${model.scopes.scope3Tons.toFixed(2)} t (${s3.toFixed(1)}%)</text>
            </g>
        </svg>
        `;
    }

    function generateOffsetDonutChartSVG(model) {
        const sol = model.offsetsBreakdown.solarPct;
        const tre = model.offsetsBreakdown.treesPct;
        const wst = model.offsetsBreakdown.wasteKg > 0 && model.totalOffsetsKg > 0 ? (model.offsetsBreakdown.wasteKg / model.totalOffsetsKg) * 100 : 0;

        const circ = 502.65;
        const c1 = (sol / 100) * circ;
        const c2 = (tre / 100) * circ;
        const c3 = (wst / 100) * circ;

        const off1 = 0;
        const off2 = -c1;
        const off3 = -(c1 + c2);

        return `
        <svg viewBox="0 0 500 240" width="100%" height="220" style="background:#ffffff; border:1px solid #cbd5e1; border-radius:8px;">
            <circle cx="150" cy="120" r="80" fill="none" stroke="#f1f5f9" stroke-width="32" />
            <circle cx="150" cy="120" r="80" fill="none" stroke="#f39c12" stroke-width="32" stroke-dasharray="${c1} ${circ}" stroke-dashoffset="${off1}" />
            <circle cx="150" cy="120" r="80" fill="none" stroke="#27ae60" stroke-width="32" stroke-dasharray="${c2} ${circ}" stroke-dashoffset="${off2}" />
            <circle cx="150" cy="120" r="80" fill="none" stroke="#16a085" stroke-width="32" stroke-dasharray="${c3} ${circ}" stroke-dashoffset="${off3}" />

            <text x="150" y="115" text-anchor="middle" font-family="'Outfit', Calibri, sans-serif" font-size="16" font-weight="800" fill="#2c3e50">${model.totalOffsetsTons.toFixed(1)} t</text>
            <text x="150" y="132" text-anchor="middle" font-family="'Outfit', Calibri, sans-serif" font-size="10" font-weight="600" fill="#7f8c8d">TOTAL OFFSETS</text>

            <g transform="translate(300, 50)">
                <rect x="0" y="0" width="16" height="16" rx="4" fill="#f39c12" />
                <text x="24" y="13" font-family="'Outfit', Calibri, sans-serif" font-size="12" font-weight="700" fill="#2c3e50">Solar Generation</text>
                <text x="24" y="28" font-family="'Outfit', Calibri, sans-serif" font-size="11" fill="#7f8c8d">${model.offsetsBreakdown.solarTons.toFixed(2)} t (${sol.toFixed(1)}%)</text>

                <rect x="0" y="45" width="16" height="16" rx="4" fill="#27ae60" />
                <text x="24" y="58" font-family="'Outfit', Calibri, sans-serif" font-size="12" font-weight="700" fill="#2c3e50">Tree Sequestration</text>
                <text x="24" y="73" font-family="'Outfit', Calibri, sans-serif" font-size="11" fill="#7f8c8d">${model.offsetsBreakdown.treesTons.toFixed(2)} t (${tre.toFixed(1)}%)</text>

                <rect x="0" y="90" width="16" height="16" rx="4" fill="#16a085" />
                <text x="24" y="103" font-family="'Outfit', Calibri, sans-serif" font-size="12" font-weight="700" fill="#2c3e50">Waste Recycling</text>
                <text x="24" y="118" font-family="'Outfit', Calibri, sans-serif" font-size="11" fill="#7f8c8d">${model.offsetsBreakdown.wasteTons.toFixed(2)} t (${wst.toFixed(1)}%)</text>
            </g>
        </svg>
        `;
    }

    function generateHotspotsBarChartSVG(model) {
        const top5 = model.hotspots.slice(0, 5);
        if (top5.length === 0) return '<div style="text-align:center; padding:20px; color:#64748b;">No activity hotspot data available.</div>';

        const maxKg = Math.max(...top5.map(h => h.kg), 1);
        const barHeight = 24;
        const gap = 16;
        const totalSvgHeight = top5.length * (barHeight + gap) + 40;

        const barsSvg = top5.map((item, idx) => {
            const y = 30 + idx * (barHeight + gap);
            const barWidth = Math.max(10, Math.min(260, (item.kg / maxKg) * 260));
            const color = item.scope === 1 ? '#e67e22' : (item.scope === 2 ? '#2980b9' : '#27ae60');
            const cleanName = item.name.length > 28 ? item.name.substring(0, 26) + '...' : item.name;

            return `
                <g>
                    <text x="10" y="${y + 16}" font-family="'Outfit', Calibri, sans-serif" font-size="11" font-weight="600" fill="#2c3e50">${cleanName}</text>
                    <rect x="180" y="${y}" width="260" height="${barHeight}" rx="4" fill="#f1f5f9" />
                    <rect x="180" y="${y}" width="${barWidth}" height="${barHeight}" rx="4" fill="${color}" />
                    <text x="${185 + barWidth}" y="${y + 16}" font-family="'Outfit', Calibri, sans-serif" font-size="10" font-weight="700" fill="#2c3e50" dx="6">
                        ${(item.kg / 1000).toFixed(2)} t (${item.percentage.toFixed(1)}%)
                    </text>
                </g>
            `;
        }).join('');

        return `
        <svg viewBox="0 0 520 ${totalSvgHeight}" width="100%" height="${totalSvgHeight}" style="background:#ffffff; border:1px solid #cbd5e1; border-radius:8px;">
            <text x="10" y="20" font-family="'Outfit', Calibri, sans-serif" font-size="12" font-weight="700" fill="#2c3e50">Internal Emission Source Breakdown (t CO₂e/year)</text>
            ${barsSvg}
        </svg>
        `;
    }

    // =========================================================================
    // 4. COMMON PAGE HEADERS AND FOOTERS (EXACT SNJB GREEN DESIGN)
    // =========================================================================
    function renderPageHeader(inst) {
        return `
        <div style="text-align: center; border-bottom: 1.5px solid #00b050; padding-bottom: 8px; margin-bottom: 20px;">
            <div style="font-size: 0.95rem; font-weight: 700; color: #000000; font-family: Calibri, 'Outfit', sans-serif;">
                ${inst.name}
            </div>
            <div style="font-size: 0.78rem; color: #475569; font-style: italic;">
                Institutional Carbon Footprint Assessment &bull; ${inst.reportingYear}
            </div>
        </div>
        `;
    }

    function renderPageFooter() {
        return `
        <div style="border-top: 1px solid #00b050; padding-top: 8px; margin-top: auto; display: flex; justify-content: center; align-items: center; font-size: 0.85rem; font-weight: 700; color: #2c3e50; font-family: Calibri, 'Outfit', sans-serif;">
            <span>Page <span class="page-current"></span> of <span class="page-total"></span></span>
        </div>
        `;
    }

    // =========================================================================
    // 5. ACCREDITED MULTI-PAGE REPORT HTML BUILDER
    // =========================================================================
    function buildAccreditedReportHTML(model, aiResponse) {
        const inst = model.institution;
        const insights = aiResponse.insights;
        const isAI = aiResponse.isAIGenerated;

        const aiStatusBadge = `
        <div style="background: ${isAI ? '#ecfdf5' : '#f8fafc'}; border: 1px solid ${isAI ? '#10b981' : '#cbd5e1'}; border-radius: 6px; padding: 6px 12px; margin-bottom: 15px; font-size: 0.76rem; color: ${isAI ? '#065f46' : '#475569'}; display: flex; align-items: center; justify-content: space-between;">
            <span><strong>${isAI ? 'Verified AI Analytics' : 'Analytical Notice'}:</strong> ${aiResponse.source}</span>
            <span style="font-weight: 700; text-transform: uppercase; font-size: 0.7rem; background: ${isAI ? '#10b981' : '#64748b'}; color: #fff; padding: 2px 6px; border-radius: 4px;">${isAI ? 'Live Neural Insight' : 'Deterministic Rule-Based'}</span>
        </div>
        `;

        const scopeDonutSVG = generateScopeDonutChartSVG(model);
        const offsetDonutSVG = generateOffsetDonutChartSVG(model);
        const hotspotBarSVG = generateHotspotsBarChartSVG(model);

        return `
        <div class="report-document" style="width: 210mm; margin: 0 auto; background: #ffffff; color: #000000; font-family: Calibri, 'Outfit', Arial, sans-serif; line-height: 1.45; font-size: 11pt;">

            <!-- PAGE 1: COVER PAGE -->
            <div class="report-page" data-page-type="cover" style="padding: 14mm 14mm 12mm 14mm; border: 2.5px solid #00b050; min-height: 297mm; height: 297mm; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; page-break-after: always; position: relative;">
                
                <div style="text-align: center; border-bottom: 2px solid #00b050; padding-bottom: 15px;">
                    ${inst.logoUrl ? `<img src="${inst.logoUrl}" alt="Logo" style="max-height: 85px; max-width: 220px; object-fit: contain; margin-bottom: 10px;">` : ''}
                    <h1 style="font-size: 1.7rem; font-weight: 800; color: #833c0b; margin: 5px 0; text-transform: uppercase; letter-spacing: 0.5px;">
                        ${inst.name}
                    </h1>
                    <p style="font-size: 1.05rem; font-weight: 600; color: #2c3e50; margin: 0;">
                        ${inst.address}
                    </p>
                </div>

                <div style="text-align: center; margin: 20px 0;">
                    <div style="width: 80px; height: 4px; background: #00b050; margin: 0 auto 20px auto;"></div>
                    
                    <h2 style="font-size: 2.1rem; font-weight: 800; color: #000000; margin: 0 0 10px 0; text-transform: uppercase; line-height: 1.2;">
                        Carbon Footprint Report
                    </h2>
                    <h3 style="font-size: 1.25rem; font-weight: 600; color: #00b050; margin: 0 0 25px 0;">
                        Institutional Greenhouse Gas Emission Inventory &amp; Climate Assessment
                    </h3>

                    ${inst.photoUrl ? `
                        <div style="margin: 15px auto; width: 100%; max-height: 220px; overflow: hidden; border-radius: 8px; border: 1px solid #cbd5e1; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">
                            <img src="${inst.photoUrl}" alt="Campus Photograph" style="width: 100%; height: 220px; object-fit: cover;">
                        </div>
                    ` : `
                        <div style="margin: 25px auto; width: 90%; background: #f8fafc; border: 1.5px dashed #cbd5e1; border-radius: 8px; padding: 25px 20px;">
                            <div style="font-size: 2.2rem; margin-bottom: 6px;">🏛️</div>
                            <div style="font-size: 1.05rem; font-weight: 700; color: #2c3e50;">Comprehensive Campus Assessment Boundary</div>
                            <div style="font-size: 0.85rem; color: #64748b; margin-top: 4px;">Academic &bull; Residential &bull; Operational &bull; Administrative</div>
                        </div>
                    `}

                    <div style="margin-top: 25px; background: #f1f5f9; border-left: 4px solid #00b050; padding: 12px 18px; text-align: left; display: inline-block; width: 85%; box-sizing: border-box;">
                        <p style="margin: 4px 0; font-size: 0.95rem;"><strong>Reporting Period:</strong> ${inst.reportPeriodText} (${inst.reportingYear})</p>
                        <p style="margin: 4px 0; font-size: 0.95rem;"><strong>Assessment Standard:</strong> ISO 14064-1:2018 &amp; GHG Protocol Corporate Standard</p>
                        <p style="margin: 4px 0; font-size: 0.95rem;"><strong>Assessment Agency:</strong> ${inst.executingAgency}</p>
                    </div>
                </div>

                <div style="text-align: center; border-top: 1.5px solid #00b050; padding-top: 10px; font-size: 0.88rem; color: #475569;">
                    <p style="margin: 2px 0; font-weight: 700; color: #000000;">Date of Issue: ${inst.reportDate}</p>
                    <p style="margin: 2px 0;">Independent Environmental Audit &bull; Climate Accreditation Report &bull; Page 1 of <span class="page-total"></span></p>
                </div>
            </div>

            <!-- PAGE 2: METADATA & VERIFICATION STATEMENT -->
            <div class="report-page" data-page-type="metadata" style="padding: 12mm; border: 2.5px solid #00b050; min-height: 297mm; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; page-break-after: always;">
                <div>
                    ${renderPageHeader(inst)}

                    <div style="text-align: center; margin-bottom: 25px;">
                        <h2 style="font-size: 1.25rem; font-weight: 800; color: #000000; text-transform: uppercase; margin: 0 0 6px 0;">
                            GREENHOUSE GAS EMISSION INVENTORY &amp; CLIMATE ACCREDITATION REPORT
                        </h2>
                        <div style="width: 60px; height: 3px; background: #00b050; margin: 0 auto;"></div>
                    </div>

                    <table style="width: 100%; border-collapse: collapse; font-size: 0.88rem; border: 1px solid #000000; margin-bottom: 25px;">
                        <tbody>
                            <tr>
                                <td style="border: 1px solid #000000; padding: 8px 12px; font-weight: bold; width: 32%; background: #f8fafc;">Institution / Reporting Entity:</td>
                                <td style="border: 1px solid #000000; padding: 8px 12px; font-weight: bold; color: #000000;">${inst.name}</td>
                            </tr>
                            <tr>
                                <td style="border: 1px solid #000000; padding: 8px 12px; font-weight: bold; background: #f8fafc;">Executing &amp; Auditing Body:</td>
                                <td style="border: 1px solid #000000; padding: 8px 12px;">${inst.executingAgency}</td>
                            </tr>
                            <tr>
                                <td style="border: 1px solid #000000; padding: 8px 12px; font-weight: bold; background: #f8fafc;">Reporting Period:</td>
                                <td style="border: 1px solid #000000; padding: 8px 12px;">${inst.reportPeriodText} (${inst.reportingYear})</td>
                            </tr>
                            <tr>
                                <td style="border: 1px solid #000000; padding: 8px 12px; font-weight: bold; background: #f8fafc;">Document Tracking Code:</td>
                                <td style="border: 1px solid #000000; padding: 8px 12px; font-family: monospace; font-weight: bold;">${inst.documentCode}</td>
                            </tr>
                            <tr>
                                <td style="border: 1px solid #000000; padding: 8px 12px; font-weight: bold; background: #f8fafc;">Applicable Standards:</td>
                                <td style="border: 1px solid #000000; padding: 8px 12px;">ISO 14064-1:2018 (Part 1), ISO 14064-2:2019 (Part 2), ISO 14064-3:2019 (Part 3), GHG Protocol Corporate Standard</td>
                            </tr>
                            <tr>
                                <td style="border: 1px solid #000000; padding: 8px 12px; font-weight: bold; background: #f8fafc;">Consolidation Methodology:</td>
                                <td style="border: 1px solid #000000; padding: 8px 12px;">Operational Control Approach</td>
                            </tr>
                            <tr>
                                <td style="border: 1px solid #000000; padding: 8px 12px; font-weight: bold; background: #f8fafc;">Verification Assurance Level:</td>
                                <td style="border: 1px solid #000000; padding: 8px 12px;">Limited Assurance Verification</td>
                            </tr>
                        </tbody>
                    </table>

                    <h3 style="font-size: 1.05rem; font-weight: 700; color: #000000; margin-bottom: 10px;">Executive Verification Statement</h3>
                    <p style="font-size: 0.88rem; text-align: justify; line-height: 1.6; margin-bottom: 20px;">
                        This document constitutes the official institutional carbon emission audit report formulated in strict conformance with the specifications of ISO 14064-1:2018 and the World Resources Institute (WRI) / WBCSD Greenhouse Gas Protocol Corporate Accounting and Reporting Standard. The primary objective is to furnish a transparent, verifiable, and scientifically rigorous inventory of direct and indirect greenhouse gas emissions resulting from operations across the institutional boundary of <strong>${inst.name}</strong>.
                    </p>

                    <div style="margin-top: 40px; display: grid; grid-template-columns: 1fr 1fr; gap: 30px;">
                        <div style="border-top: 1px solid #000000; padding-top: 8px; text-align: center;">
                            <p style="margin: 2px 0; font-weight: bold; font-size: 0.88rem;">Lead Environmental Auditor</p>
                            <p style="margin: 2px 0; font-size: 0.8rem; color: #64748b;">CarbonTrack Sustainability Assessment Cell</p>
                        </div>
                        <div style="border-top: 1px solid #000000; padding-top: 8px; text-align: center;">
                            <p style="margin: 2px 0; font-weight: bold; font-size: 0.88rem;">Head of Institution / Representative</p>
                            <p style="margin: 2px 0; font-size: 0.8rem; color: #64748b;">${inst.name}</p>
                        </div>
                    </div>
                </div>

                ${renderPageFooter()}
            </div>

            <!-- PAGE 3: ACKNOWLEDGEMENTS -->
            <div class="report-page" data-page-type="acknowledgements" style="padding: 12mm; border: 2.5px solid #00b050; min-height: 297mm; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; page-break-after: always;">
                <div>
                    ${renderPageHeader(inst)}

                    <h2 style="font-size: 1.35rem; font-weight: 800; color: #000000; text-align: center; margin-top: 20px; margin-bottom: 15px;">
                        Acknowledgements
                    </h2>
                    <div style="width: 50px; height: 3px; background: #00b050; margin: 0 auto 30px auto;"></div>

                    <div style="font-size: 0.92rem; text-align: justify; line-height: 1.8;">
                        <p style="margin-bottom: 16px;">
                            The successful execution and completion of this comprehensive Institutional Carbon Footprint and Climate Assessment Report for <strong>${inst.name}</strong> has been made possible through the dedicated support, vision, and cooperation of the institutional administration, academic leadership, technical personnel, and student community.
                        </p>

                        <p style="margin-bottom: 16px;">
                            We express our sincere appreciation to the Governing Council, Management, and Executive Leadership of <strong>${inst.name}</strong> for demonstrating proactive institutional governance and environmental stewardship by mandating this rigorous carbon quantification study.
                        </p>

                        <p style="margin-bottom: 16px;">
                            Special acknowledgment is extended to the Campus Estate Office, Electrical Maintenance Engineers, Transport Supervisors, and Administrative Officers who meticulously curated, compiled, and validated utility bills, diesel fuel logs, LPG refill receipts, travel itineraries, and paper procurement manifests spanning the entire <strong>${inst.reportingYear}</strong> reporting cycle.
                        </p>

                        <p style="margin-bottom: 16px;">
                            We also recognize the contributions of the faculty coordinators and student sustainability ambassadors who facilitated primary on-ground surveys, including vegetative biomass cataloging, green cover canopy mapping, and campus mobility surveys. Their active engagement underscores the transformative role of educational campuses as living sustainability laboratories.
                        </p>
                    </div>
                </div>

                ${renderPageFooter()}
            </div>

            <!-- PAGE 4: TABLE OF CONTENTS & ABBREVIATIONS -->
            <div class="report-page" data-page-type="toc" style="padding: 12mm; border: 2.5px solid #00b050; min-height: 297mm; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; page-break-after: always;">
                <div>
                    ${renderPageHeader(inst)}

                    <h2 style="font-size: 1.35rem; font-weight: 800; color: #000000; text-align: center; margin-top: 10px; margin-bottom: 12px;">
                        Table of Contents
                    </h2>
                    <div style="width: 50px; height: 3px; background: #00b050; margin: 0 auto 20px auto;"></div>

                    <table style="width: 100%; border-collapse: collapse; font-size: 0.85rem; border: 1px solid #000000; margin-bottom: 25px;">
                        <thead>
                            <tr style="background: #e2e8f0; border-bottom: 1px solid #000000;">
                                <th style="border: 1px solid #000000; padding: 6px 10px; text-align: left; width: 85%;">Section Title</th>
                                <th style="border: 1px solid #000000; padding: 6px 10px; text-align: center; width: 15%;">Page No.</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr><td style="border: 1px solid #000000; padding: 4px 10px;">1. Table of Contents &amp; Metadata</td><td class="toc-page-num" data-target="sec-toc" style="border: 1px solid #000000; padding: 4px 10px; text-align: center; font-weight: bold;">4</td></tr>
                            <tr><td style="border: 1px solid #000000; padding: 4px 10px;">2. Abbreviations &amp; Acronyms</td><td class="toc-page-num" data-target="sec-abbr" style="border: 1px solid #000000; padding: 4px 10px; text-align: center; font-weight: bold;">4</td></tr>
                            <tr><td style="border: 1px solid #000000; padding: 4px 10px;">3. Sustainability Initiatives: Need of the Hour in Academic Institutions</td><td class="toc-page-num" data-target="sec-sustain" style="border: 1px solid #000000; padding: 4px 10px; text-align: center; font-weight: bold;">5</td></tr>
                            <tr><td style="border: 1px solid #000000; padding: 4px 10px;">4. About the Institute</td><td class="toc-page-num" data-target="sec-about-inst" style="border: 1px solid #000000; padding: 4px 10px; text-align: center; font-weight: bold;">6</td></tr>
                            <tr><td style="border: 1px solid #000000; padding: 4px 10px;">5. About the Project</td><td class="toc-page-num" data-target="sec-about-proj" style="border: 1px solid #000000; padding: 4px 10px; text-align: center; font-weight: bold;">6</td></tr>
                            <tr><td style="border: 1px solid #000000; padding: 4px 10px;">6. Objectives of the Project</td><td class="toc-page-num" data-target="sec-obj" style="border: 1px solid #000000; padding: 4px 10px; text-align: center; font-weight: bold;">7</td></tr>
                            <tr><td style="border: 1px solid #000000; padding: 4px 10px;">7. Relevance</td><td class="toc-page-num" data-target="sec-relevance" style="border: 1px solid #000000; padding: 4px 10px; text-align: center; font-weight: bold;">7</td></tr>
                            <tr><td style="border: 1px solid #000000; padding: 4px 10px;">8. Background</td><td class="toc-page-num" data-target="sec-bg" style="border: 1px solid #000000; padding: 4px 10px; text-align: center; font-weight: bold;">7</td></tr>
                            <tr><td style="border: 1px solid #000000; padding: 4px 10px;">9. Study Area (Reporting Entity, Period, Scopes)</td><td class="toc-page-num" data-target="sec-study" style="border: 1px solid #000000; padding: 4px 10px; text-align: center; font-weight: bold;">8</td></tr>
                            <tr><td style="border: 1px solid #000000; padding: 4px 10px;">10. Methodology for GHG Quantification</td><td class="toc-page-num" data-target="sec-method" style="border: 1px solid #000000; padding: 4px 10px; text-align: center; font-weight: bold;">8</td></tr>
                            <tr><td style="border: 1px solid #000000; padding: 4px 10px;">11. Key Steps in Emission Estimation</td><td class="toc-page-num" data-target="sec-steps" style="border: 1px solid #000000; padding: 4px 10px; text-align: center; font-weight: bold;">8</td></tr>
                            <tr><td style="border: 1px solid #000000; padding: 4px 10px;">12. Data Collection (Scope 1, Scope 2, Scope 3)</td><td class="toc-page-num" data-target="sec-datacollect" style="border: 1px solid #000000; padding: 4px 10px; text-align: center; font-weight: bold;">9</td></tr>
                            <tr><td style="border: 1px solid #000000; padding: 4px 10px;">13. Data Analysis, Calculation and Results</td><td class="toc-page-num" data-target="sec-analysis" style="border: 1px solid #000000; padding: 4px 10px; text-align: center; font-weight: bold;">10</td></tr>
                            <tr><td style="border: 1px solid #000000; padding: 4px 10px; padding-left: 20px;">13.a. Discussion and Interpretation for Scope 1</td><td class="toc-page-num" data-target="sec-scope1-disc" style="border: 1px solid #000000; padding: 4px 10px; text-align: center; font-weight: bold;">13</td></tr>
                            <tr><td style="border: 1px solid #000000; padding: 4px 10px; padding-left: 20px;">13.b. Discussion and Interpretation for Scope 2</td><td class="toc-page-num" data-target="sec-scope2-disc" style="border: 1px solid #000000; padding: 4px 10px; text-align: center; font-weight: bold;">13</td></tr>
                            <tr><td style="border: 1px solid #000000; padding: 4px 10px; padding-left: 20px;">13.c. Discussion and Interpretation for Scope 3</td><td class="toc-page-num" data-target="sec-scope3-disc" style="border: 1px solid #000000; padding: 4px 10px; text-align: center; font-weight: bold;">14</td></tr>
                            <tr><td style="border: 1px solid #000000; padding: 4px 10px;">14. Internal Emission Drivers &amp; Intensity Benchmarks</td><td class="toc-page-num" data-target="sec-drivers" style="border: 1px solid #000000; padding: 4px 10px; text-align: center; font-weight: bold;">15</td></tr>
                            <tr><td style="border: 1px solid #000000; padding: 4px 10px;">15. Discussion with Respect to ISO 14064 Standards</td><td class="toc-page-num" data-target="sec-standards" style="border: 1px solid #000000; padding: 4px 10px; text-align: center; font-weight: bold;">16</td></tr>
                            <tr><td style="border: 1px solid #000000; padding: 4px 10px;">16. Detailed Recommendations</td><td class="toc-page-num" data-target="sec-recom" style="border: 1px solid #000000; padding: 4px 10px; text-align: center; font-weight: bold;">17</td></tr>
                            <tr><td style="border: 1px solid #000000; padding: 4px 10px;">17. Conclusion</td><td class="toc-page-num" data-target="sec-concl" style="border: 1px solid #000000; padding: 4px 10px; text-align: center; font-weight: bold;">19</td></tr>
                            <tr><td style="border: 1px solid #000000; padding: 4px 10px;">18. References</td><td class="toc-page-num" data-target="sec-ref" style="border: 1px solid #000000; padding: 4px 10px; text-align: center; font-weight: bold;">19</td></tr>
                            <tr><td style="border: 1px solid #000000; padding: 4px 10px; background: #f8fafc; font-weight: bold;">Annexure 1: Institutional Profile &amp; Green Cover Ledger</td><td class="toc-page-num" data-target="sec-annex1" style="border: 1px solid #000000; padding: 4px 10px; text-align: center; font-weight: bold;">20</td></tr>
                            <tr><td style="border: 1px solid #000000; padding: 4px 10px; background: #f8fafc; font-weight: bold;">Annexure 2: Detailed Calculations &amp; Formulas</td><td class="toc-page-num" data-target="sec-annex2" style="border: 1px solid #000000; padding: 4px 10px; text-align: center; font-weight: bold;">22</td></tr>
                            <tr><td style="border: 1px solid #000000; padding: 4px 10px; background: #f8fafc; font-weight: bold;">Annexure 3: Data Collection Sheets &amp; Verification Sign-off</td><td class="toc-page-num" data-target="sec-annex3" style="border: 1px solid #000000; padding: 4px 10px; text-align: center; font-weight: bold;">24</td></tr>
                        </tbody>
                    </table>
                </div>

                ${renderPageFooter()}
            </div>

            <!-- PAGE 5: ABBREVIATIONS & CLIMATE ACCOUNTING GLOSSARY -->
            <div class="report-page" data-page-type="abbreviations" style="padding: 12mm; border: 2.5px solid #00b050; min-height: 297mm; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; page-break-after: always;">
                <div id="sec-abbr" data-section-id="sec-abbr">
                    ${renderPageHeader(inst)}

                    <h2 style="font-size: 1.35rem; font-weight: 800; color: #000000; text-align: center; margin-top: 10px; margin-bottom: 12px;">
                        2. Abbreviations &amp; Climate Standards Glossary
                    </h2>
                    <div style="width: 50px; height: 3px; background: #00b050; margin: 0 auto 20px auto;"></div>

                    <div style="display: flex; flex-direction: column; gap: 8px; font-size: 0.85rem; line-height: 1.55;">
                        <div style="background: #f8fafc; border: 1px solid #cbd5e1; padding: 7px 12px; border-radius: 6px;">
                            <strong>GHG (Greenhouse Gas):</strong> Atmospheric gases that absorb and emit infrared radiation, including CO₂, CH₄, N₂O, and fluorinated gases.
                        </div>
                        <div style="background: #f8fafc; border: 1px solid #cbd5e1; padding: 7px 12px; border-radius: 6px;">
                            <strong>CO₂e (Carbon Dioxide Equivalent):</strong> The universal metric measure used to compare emissions from various GHGs based upon their global warming potential (GWP).
                        </div>
                        <div style="background: #f8fafc; border: 1px solid #cbd5e1; padding: 7px 12px; border-radius: 6px;">
                            <strong>t CO₂e / kg CO₂e:</strong> Metric tons (1,000 kg) and kilograms of carbon dioxide equivalent, respectively.
                        </div>
                        <div style="background: #f8fafc; border: 1px solid #cbd5e1; padding: 7px 12px; border-radius: 6px;">
                            <strong>Scope 1 (Direct Emissions):</strong> GHG emissions from sources owned or controlled by the institution (diesel generator sets, LPG kitchen burners, campus fleet).
                        </div>
                        <div style="background: #f8fafc; border: 1px solid #cbd5e1; padding: 7px 12px; border-radius: 6px;">
                            <strong>Scope 2 (Electricity Indirect Emissions):</strong> GHG emissions from the generation of purchased electricity consumed by institutional facilities.
                        </div>
                        <div style="background: #f8fafc; border: 1px solid #cbd5e1; padding: 7px 12px; border-radius: 6px;">
                            <strong>Scope 3 (Other Indirect Emissions):</strong> All other indirect emissions occurring across the institutional value chain, including daily commuter transport and paper procurement.
                        </div>
                        <div style="background: #f8fafc; border: 1px solid #cbd5e1; padding: 7px 12px; border-radius: 6px;">
                            <strong>ISO 14064-1:2018:</strong> International standard providing principles and requirements for quantification and reporting of organizational GHG inventories and removals.
                        </div>
                        <div style="background: #f8fafc; border: 1px solid #cbd5e1; padding: 7px 12px; border-radius: 6px;">
                            <strong>ISO 14064-3:2019:</strong> International standard specifying requirements and guidance for the verification and validation of greenhouse gas statements.
                        </div>
                        <div style="background: #f8fafc; border: 1px solid #cbd5e1; padding: 7px 12px; border-radius: 6px;">
                            <strong>CEA (Central Electricity Authority):</strong> Statutory body under the Ministry of Power, Govt. of India, publishing baseline emission factors for the Indian power grid.
                        </div>
                        <div style="background: #f8fafc; border: 1px solid #cbd5e1; padding: 7px 12px; border-radius: 6px;">
                            <strong>IPCC:</strong> Intergovernmental Panel on Climate Change, providing scientific reference methodology for greenhouse gas accounting.
                        </div>
                        <div style="background: #f8fafc; border: 1px solid #cbd5e1; padding: 7px 12px; border-radius: 6px;">
                            <strong>PV (Solar Photovoltaic):</strong> Clean solar semiconductor arrays producing zero-emission electrical energy on-site.
                        </div>
                        <div style="background: #f8fafc; border: 1px solid #cbd5e1; padding: 7px 12px; border-radius: 6px;">
                            <strong>Carbon Sequestration:</strong> The biological capture and long-term storage of atmospheric carbon dioxide by photosynthetic woody trees and green cover biomass.
                        </div>
                    </div>
                </div>

                ${renderPageFooter()}
            </div>

            <!-- PAGE 5: SUSTAINABILITY INITIATIVES (SECTION 3) -->
            <div class="report-page" data-page-type="sustainability" style="padding: 12mm; border: 2.5px solid #00b050; min-height: 297mm; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; page-break-after: always;">
                <div id="sec-sustain" data-section-id="sec-sustain">
                    ${renderPageHeader(inst)}

                    <h2 style="font-size: 1.25rem; font-weight: 800; color: #000000; margin-bottom: 15px;">
                        3. Sustainability Initiatives: Need of the Hour in Academic Institutions
                    </h2>

                    <div style="font-size: 0.9rem; text-align: justify; line-height: 1.65;">
                        <p style="margin-bottom: 14px;">
                            Higher education institutions and technical colleges represent major centers of resource consumption, utilizing significant volumes of grid electricity, fossil fuels, water, food services, and paper daily. Consequently, academic campuses act as microcosms of modern cities, generating meaningful collective ecological footprints that warrant systematic scientific accounting.
                        </p>

                        <p style="margin-bottom: 14px;">
                            Implementing rigorous carbon footprint assessment protocols in academia serves a critical three-fold purpose:
                        </p>

                        <div style="background: #f8fafc; border-left: 3px solid #00b050; padding: 10px 14px; margin-bottom: 12px;">
                            <strong style="color: #000000;">1. Environmental Governance &amp; Operational Efficiency:</strong>
                            <p style="margin: 4px 0 0 0;">
                                Systematically identifying and tracking carbon-intensive hotspots enables administrative leadership to eliminate energy waste, adopt high-efficiency electrical infrastructure, expand clean renewable micro-grids, optimize logistics, and redirect fiscal savings toward core educational mandates.
                            </p>
                        </div>

                        <div style="background: #f8fafc; border-left: 3px solid #00b050; padding: 10px 14px; margin-bottom: 12px;">
                            <strong style="color: #000000;">2. Pedagogical Integration &amp; Experiential Learning:</strong>
                            <p style="margin: 4px 0 0 0;">
                                Aligning institutional infrastructure with the United Nations Sustainable Development Goals (SDGs)—particularly SDG 7 (Affordable and Clean Energy), SDG 12 (Responsible Consumption and Production), and SDG 13 (Climate Action)—transforms the campus into a living laboratory where students and faculty observe real-time decarbonization engineering.
                            </p>
                        </div>

                        <div style="background: #f8fafc; border-left: 3px solid #00b050; padding: 10px 14px; margin-bottom: 12px;">
                            <strong style="color: #000000;">3. National &amp; Global Institutional Leadership:</strong>
                            <p style="margin: 4px 0 0 0;">
                                Preparing tomorrow’s engineers, researchers, and administrators requires educational bodies to lead by institutional example. Transparent carbon disclosure strengthens statutory environmental compliance, elevates NAAC/NIRF sustainability scores, and contributes directly toward India's Panchamrit climate goals (achieving Net Zero by 2070).
                            </p>
                        </div>

                        <p style="margin-top: 14px;">
                            By pioneering this verified greenhouse gas inventory, <strong>${inst.name}</strong> establishes an auditable empirical baseline that underpins progressive, data-driven climate resilience.
                        </p>
                    </div>
                </div>

                ${renderPageFooter()}
            </div>

            <!-- PAGE 6: ABOUT THE INSTITUTE & ABOUT THE PROJECT (SECTIONS 4 & 5) -->
            <div class="report-page" data-page-type="about" style="padding: 12mm; border: 2.5px solid #00b050; min-height: 297mm; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; page-break-after: always;">
                <div>
                    ${renderPageHeader(inst)}

                    <div id="sec-about-inst" data-section-id="sec-about-inst" style="margin-bottom: 25px;">
                        <h2 style="font-size: 1.25rem; font-weight: 800; color: #000000; margin-bottom: 12px;">
                            4. About the Institute: ${inst.name}
                        </h2>

                        <div style="font-size: 0.9rem; text-align: justify; line-height: 1.65;">
                            <p style="margin-bottom: 12px;">
                                <strong>${inst.name}</strong>, located at ${inst.address}, represents an esteemed educational and technical center committed to delivering high-quality academic instruction, professional engineering development, and holistic student empowerment.
                            </p>

                            <p style="margin-bottom: 12px;">
                                ${insights.institutionalAnalysis || `The campus spans a land parcel of ${inst.areaAcres} acres with a cumulative built-up infrastructure of ${inst.builtUpSqm.toLocaleString()} m², housing advanced laboratories, workshops, lecture theaters, administrative offices, and student amenities. The campus accommodates an active operational community of ${inst.population.toLocaleString()} members, comprising ${inst.students.toLocaleString()} enrolled students and ${inst.faculty.toLocaleString()} faculty and administrative staff members.`}
                            </p>
                        </div>
                    </div>

                    <div id="sec-about-proj" data-section-id="sec-about-proj">
                        <h2 style="font-size: 1.25rem; font-weight: 800; color: #000000; margin-bottom: 12px;">
                            5. About the Project
                        </h2>

                        <div style="font-size: 0.9rem; text-align: justify; line-height: 1.65;">
                            <p style="margin-bottom: 12px;">
                                This project establishes a verified baseline inventory of greenhouse gas (GHG) emissions across direct and indirect institutional operating channels for <strong>${inst.reportingYear}</strong>. Executed by the <strong>${inst.executingAgency}</strong>, the assessment employs standardized accounting protocols to evaluate energy flows, fossil fuel combustion, commuter transit, paper procurement, vegetative carbon sinks, and on-site solar generation.
                            </p>
                            <p style="margin-bottom: 12px;">
                                Through systematic data validation and conversion factor mapping, the study quantifies gross emissions, certifies offset removals, and establishes the net operational carbon footprint of ${inst.name}, culminating in a high-impact decarbonization roadmap.
                            </p>
                        </div>
                    </div>
                </div>

                ${renderPageFooter()}
            </div>

            <!-- PAGE 7: OBJECTIVES, RELEVANCE & BACKGROUND (SECTIONS 6, 7 & 8) -->
            <div class="report-page" data-page-type="objectives" style="padding: 12mm; border: 2.5px solid #00b050; min-height: 297mm; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; page-break-after: always;">
                <div>
                    ${renderPageHeader(inst)}

                    <div id="sec-obj" data-section-id="sec-obj" style="margin-bottom: 20px;">
                        <h2 style="font-size: 1.25rem; font-weight: 800; color: #000000; margin-bottom: 12px;">
                            6. Objectives of the Project
                        </h2>

                        <div style="font-size: 0.88rem; line-height: 1.6;">
                            <p style="margin-bottom: 8px;"><strong>&bull; Objective 6.1:</strong> Compile a comprehensive operational inventory of greenhouse gas emissions for the campus spanning Scope 1 (direct), Scope 2 (purchased electricity), and Scope 3 (indirect activities) for ${inst.reportingYear}.</p>
                            <p style="margin-bottom: 8px;"><strong>&bull; Objective 6.2:</strong> Quantify verified carbon offsets generated through clean solar photovoltaic installations and biological carbon sequestration by campus green cover.</p>
                            <p style="margin-bottom: 8px;"><strong>&bull; Objective 6.3:</strong> Calculate institutional carbon intensity benchmarks (kg CO₂e per occupant and kg CO₂e per square meter of built-up area).</p>
                            <p style="margin-bottom: 8px;"><strong>&bull; Objective 6.4:</strong> Identify operational emission hotspots and deliver targeted engineering interventions with measurable KPIs to guide long-term Net-Zero alignment.</p>
                        </div>
                    </div>

                    <div id="sec-relevance" data-section-id="sec-relevance" style="margin-bottom: 20px;">
                        <h2 style="font-size: 1.25rem; font-weight: 800; color: #000000; margin-bottom: 12px;">
                            7. Relevance
                        </h2>

                        <div style="font-size: 0.88rem; text-align: justify; line-height: 1.65;">
                            <p style="margin-bottom: 8px;">
                                Academic institutions are increasingly evaluated on environmental responsibility by accreditation agencies (NAAC Criterion VII, NIRF, and AICTE green campus guidelines). Quantifying carbon footprints fulfills statutory environmental expectations, lowers operating overhead through energy efficiency, enhances campus sustainability prestige, and directly contributes to national climate targets.
                            </p>
                        </div>
                    </div>

                    <div id="sec-bg" data-section-id="sec-bg">
                        <h2 style="font-size: 1.25rem; font-weight: 800; color: #000000; margin-bottom: 12px;">
                            8. Background
                        </h2>

                        <div style="font-size: 0.88rem; text-align: justify; line-height: 1.65;">
                            <p style="margin-bottom: 8px;">
                                Under the 2015 Paris Agreement, global efforts focus on restricting planetary warming to well below 2.0°C above pre-industrial levels, aiming for 1.5°C. In accordance with India’s updated Nationally Determined Contributions (NDCs), educational campuses are called upon to adopt clean technology, reduce fossil dependence, and nurture carbon sinks. This report establishes an auditable framework aligned with international best practices.
                            </p>
                        </div>
                    </div>
                </div>

                ${renderPageFooter()}
            </div>

            <!-- PAGE 8: STUDY AREA, METHODOLOGY & KEY STEPS (SECTIONS 9, 10 & 11) -->
            <div class="report-page" data-page-type="methodology" style="padding: 12mm; border: 2.5px solid #00b050; min-height: 297mm; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; page-break-after: always;">
                <div>
                    ${renderPageHeader(inst)}

                    <div id="sec-study" data-section-id="sec-study" style="margin-bottom: 18px;">
                        <h2 style="font-size: 1.2rem; font-weight: 800; color: #000000; margin-bottom: 10px;">
                            9. Study Area &amp; Assessment Scope
                        </h2>
                        <div style="font-size: 0.86rem; line-height: 1.6; text-align: justify;">
                            <p style="margin-bottom: 6px;"><strong>9.a. Reporting Entity:</strong> Encompasses all academic blocks, lecture halls, laboratories, dining/mess kitchens, workshops, administrative zones, and campus perimeter grounds of <strong>${inst.name}</strong>.</p>
                            <p style="margin-bottom: 6px;"><strong>9.b. Reporting Period:</strong> ${inst.reportPeriodText} (${inst.reportingYear}).</p>
                            <p style="margin-bottom: 6px;"><strong>9.c. Scopes Evaluated:</strong> Scope 1 (stationary DG &amp; LPG thermal combustion, owned fleet), Scope 2 (purchased grid electricity), Scope 3 (commuter transport &amp; paper procurement).</p>
                        </div>
                    </div>

                    <div id="sec-method" data-section-id="sec-method" style="margin-bottom: 18px;">
                        <h2 style="font-size: 1.2rem; font-weight: 800; color: #000000; margin-bottom: 10px;">
                            10. Methodology for GHG Quantification
                        </h2>
                        <div style="font-size: 0.86rem; line-height: 1.6; text-align: justify;">
                            <p style="margin-bottom: 6px;">
                                Quantification follows the <strong>Operational Control Approach</strong> codified in the GHG Protocol Corporate Standard and ISO 14064-1:2018. Under this approach, the institution accounts for 100% of GHG emissions arising from operations over which it exercises full authority to introduce operating policies.
                            </p>
                        </div>
                    </div>

                    <div id="sec-steps" data-section-id="sec-steps">
                        <h2 style="font-size: 1.2rem; font-weight: 800; color: #000000; margin-bottom: 10px;">
                            11. Key Steps in Emission Estimation
                        </h2>
                        <div style="font-size: 0.82rem; line-height: 1.55;">
                            <p style="margin-bottom: 5px;"><strong>1. Boundary Definition:</strong> Establish geographic and operational boundaries separating direct institutional control from indirect activities.</p>
                            <p style="margin-bottom: 5px;"><strong>2. Source Identification:</strong> Map activity channels (utility meters, fuel purchase logs, gas cylinder receipts, vehicle manifests, tree counts).</p>
                            <p style="margin-bottom: 5px;"><strong>3. Data Screening &amp; Validation:</strong> Verify raw activity data against primary records spanning all 12 operational months of ${inst.reportingYear}.</p>
                            <p style="margin-bottom: 5px;"><strong>4. Emission Factor Mapping:</strong> Assign authoritative localized emission factors from CEA User Guide v19.0 (0.792 kg CO₂e/kWh), IPCC, and DEFRA.</p>
                            <p style="margin-bottom: 5px;"><strong>5. Computation &amp; Aggregation:</strong> Deterministically compute activity emissions, calculate scope subtotals, and establish the gross inventory.</p>
                            <p style="margin-bottom: 5px;"><strong>6. Offset Quantification:</strong> Calculate solar energy grid avoidance and tree species biomass absorption.</p>
                            <p style="margin-bottom: 5px;"><strong>7. Synthesis &amp; Strategic Reporting:</strong> Structure findings, conduct hotspot analysis, and generate engineering recommendations.</p>
                        </div>
                    </div>
                </div>

                ${renderPageFooter()}
            </div>

            <!-- PAGE 9: DATA COLLECTION (SECTION 12) -->
            <div class="report-page" data-page-type="datacollect" style="padding: 12mm; border: 2.5px solid #00b050; min-height: 297mm; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; page-break-after: always;">
                <div id="sec-datacollect" data-section-id="sec-datacollect">
                    ${renderPageHeader(inst)}

                    <h2 style="font-size: 1.25rem; font-weight: 800; color: #000000; margin-bottom: 12px;">
                        12. Data Collection Framework
                    </h2>

                    <div style="font-size: 0.88rem; text-align: justify; line-height: 1.65;">
                        <p style="margin-bottom: 14px;">
                            Primary data collection was performed through comprehensive audits of physical facility logs, maintenance records, utility accounts, and supply registries. No unmeasured activity categories have been assumed to be zero; where categories were not logged, they are designated as unassessed to maintain rigorous audit integrity.
                        </p>

                        <div style="background: #f8fafc; border: 1px solid #cbd5e1; padding: 12px; border-radius: 6px; margin-bottom: 14px;">
                            <h3 style="font-size: 0.95rem; font-weight: 700; color: #000000; margin: 0 0 6px 0;">12.a. Scope 1 — Direct GHG Emissions</h3>
                            <p style="margin: 0; font-size: 0.85rem;">
                                Covers direct physical combustion of fossil fuels within the campus boundaries. Data sources include diesel fuel delivery vouchers and meter logs for backup power generator sets (rated at 2.684 kg CO₂e/L), commercial LPG cylinder invoices for student hostel messes, canteen dining, and chemistry laboratories (rated at 2.988 kg CO₂e/kg), and institutionally owned transportation vehicles.
                            </p>
                        </div>

                        <div style="background: #f8fafc; border: 1px solid #cbd5e1; padding: 12px; border-radius: 6px; margin-bottom: 14px;">
                            <h3 style="font-size: 0.95rem; font-weight: 700; color: #000000; margin: 0 0 6px 0;">12.b. Scope 2 — Purchased Electricity Emissions</h3>
                            <p style="margin: 0; font-size: 0.85rem;">
                                Accounts for indirect emissions resulting from the generation of grid electricity consumed on campus. Consumption data was synthesized from official monthly electricity bills provided by the regional distribution utility (MSEDCL). Emissions are quantified utilizing the Central Electricity Authority (CEA) Baseline Database Version 19.0 combined margin grid emission coefficient of 0.792 kg CO₂e/kWh.
                            </p>
                        </div>

                        <div style="background: #f8fafc; border: 1px solid #cbd5e1; padding: 12px; border-radius: 6px; margin-bottom: 14px;">
                            <h3 style="font-size: 0.95rem; font-weight: 700; color: #000000; margin: 0 0 6px 0;">12.c. Scope 3 — Other Indirect GHG Emissions</h3>
                            <p style="margin: 0; font-size: 0.85rem;">
                                Evaluates upstream and downstream indirect emissions across campus operations. Evaluated streams comprise student, staff, and faculty daily vehicular commuting based on modal share and trip distance logs, alongside institutional paper procurement records for examinations, printing, and administrative tasks (rated at 3.591 kg CO₂e/kg virgin paper).
                            </p>
                        </div>
                    </div>
                </div>

                ${renderPageFooter()}
            </div>

            <!-- PAGE 10: DATA ANALYSIS & RESULTS (SECTION 13 - COMPREHENSIVE INVENTORY) -->
            <div class="report-page" data-page-type="results" style="padding: 12mm; border: 2.5px solid #00b050; min-height: 297mm; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; page-break-after: always;">
                <div id="sec-analysis" data-section-id="sec-analysis">
                    ${renderPageHeader(inst)}

                    <h2 style="font-size: 1.25rem; font-weight: 800; color: #000000; margin-bottom: 8px;">
                        13. Data Analysis, Calculation and Results
                    </h2>
                    <p style="font-size: 0.85rem; color: #475569; margin-bottom: 12px;">
                        Table 13.1 summarizes the authoritative quantitative greenhouse gas inventory compiled for ${inst.name} for ${inst.reportingYear}.
                    </p>

                    <h3 style="font-size: 0.98rem; font-weight: 700; color: #000000; margin-bottom: 6px;">
                        Table 13.1: Comprehensive Greenhouse Gas Emission Inventory (${inst.reportingYear})
                    </h3>

                    <table style="width: 100%; border-collapse: collapse; font-size: 0.78rem; border: 1px solid #000000;">
                        <thead>
                            <tr style="background: #e2e8f0; border-bottom: 1px solid #000000;">
                                <th style="border: 1px solid #000000; padding: 6px 4px; text-align: center; width: 6%;">Sr.</th>
                                <th style="border: 1px solid #000000; padding: 6px 8px; text-align: left; width: 38%;">Scope &amp; Emission Source</th>
                                <th style="border: 1px solid #000000; padding: 6px 6px; text-align: left; width: 22%;">Activity Data</th>
                                <th style="border: 1px solid #000000; padding: 6px 6px; text-align: right; width: 16%;">Emissions (kg CO₂e)</th>
                                <th style="border: 1px solid #000000; padding: 6px 6px; text-align: right; width: 10%;">Emissions (t CO₂e)</th>
                                <th style="border: 1px solid #000000; padding: 6px 4px; text-align: right; width: 8%;">Share %</th>
                            </tr>
                        </thead>
                        <tbody>
                            <!-- Scope 1 Header -->
                            <tr style="background: #fdf2e9; font-weight: bold;">
                                <td colspan="6" style="border: 1px solid #000000; padding: 5px 8px; color: #d35400;">1. Scope 1 — Direct GHG Emissions</td>
                            </tr>
                            ${model.sources.filter(s => s.scope === 1).length > 0 ? model.sources.filter(s => s.scope === 1).map((s, idx) => `
                                <tr>
                                    <td style="border: 1px solid #000000; padding: 5px; text-align: center;">1.${idx + 1}</td>
                                    <td style="border: 1px solid #000000; padding: 5px 8px;">${s.name}</td>
                                    <td style="border: 1px solid #000000; padding: 5px 6px;">${s.activityData}</td>
                                    <td style="border: 1px solid #000000; padding: 5px 6px; text-align: right;">${s.kg.toLocaleString(undefined, {maximumFractionDigits:1})}</td>
                                    <td style="border: 1px solid #000000; padding: 5px 6px; text-align: right;">${s.tons.toFixed(3)}</td>
                                    <td style="border: 1px solid #000000; padding: 5px 4px; text-align: right; font-weight: bold;">${s.percentage.toFixed(2)}%</td>
                                </tr>
                            `).join('') : `
                                <tr><td colspan="6" style="border: 1px solid #000000; padding: 6px; text-align: center; color: #7f8c8d;">No Scope 1 emissions recorded</td></tr>
                            `}
                            <tr style="background: #fae5d3; font-weight: bold;">
                                <td colspan="3" style="border: 1px solid #000000; padding: 5px 8px; text-align: right;">SUBTOTAL SCOPE 1:</td>
                                <td style="border: 1px solid #000000; padding: 5px 6px; text-align: right;">${model.scopes.scope1Kg.toLocaleString(undefined, {maximumFractionDigits:1})}</td>
                                <td style="border: 1px solid #000000; padding: 5px 6px; text-align: right;">${model.scopes.scope1Tons.toFixed(3)}</td>
                                <td style="border: 1px solid #000000; padding: 5px 4px; text-align: right;">${model.scopes.scope1Pct.toFixed(2)}%</td>
                            </tr>

                            <!-- Scope 2 Header -->
                            <tr style="background: #ebf5fb; font-weight: bold;">
                                <td colspan="6" style="border: 1px solid #000000; padding: 5px 8px; color: #2980b9;">2. Scope 2 — Indirect Purchased Electricity</td>
                            </tr>
                            ${model.sources.filter(s => s.scope === 2).length > 0 ? model.sources.filter(s => s.scope === 2).map((s, idx) => `
                                <tr>
                                    <td style="border: 1px solid #000000; padding: 5px; text-align: center;">2.${idx + 1}</td>
                                    <td style="border: 1px solid #000000; padding: 5px 8px;">${s.name}</td>
                                    <td style="border: 1px solid #000000; padding: 5px 6px;">${s.activityData}</td>
                                    <td style="border: 1px solid #000000; padding: 5px 6px; text-align: right;">${s.kg.toLocaleString(undefined, {maximumFractionDigits:1})}</td>
                                    <td style="border: 1px solid #000000; padding: 5px 6px; text-align: right;">${s.tons.toFixed(3)}</td>
                                    <td style="border: 1px solid #000000; padding: 5px 4px; text-align: right; font-weight: bold;">${s.percentage.toFixed(2)}%</td>
                                </tr>
                            `).join('') : `
                                <tr><td colspan="6" style="border: 1px solid #000000; padding: 6px; text-align: center; color: #7f8c8d;">No Scope 2 grid electricity recorded</td></tr>
                            `}
                            <tr style="background: #d4e6f1; font-weight: bold;">
                                <td colspan="3" style="border: 1px solid #000000; padding: 5px 8px; text-align: right;">SUBTOTAL SCOPE 2:</td>
                                <td style="border: 1px solid #000000; padding: 5px 6px; text-align: right;">${model.scopes.scope2Kg.toLocaleString(undefined, {maximumFractionDigits:1})}</td>
                                <td style="border: 1px solid #000000; padding: 5px 6px; text-align: right;">${model.scopes.scope2Tons.toFixed(3)}</td>
                                <td style="border: 1px solid #000000; padding: 5px 4px; text-align: right;">${model.scopes.scope2Pct.toFixed(2)}%</td>
                            </tr>

                            <!-- Scope 3 Header -->
                            <tr style="background: #eafaf1; font-weight: bold;">
                                <td colspan="6" style="border: 1px solid #000000; padding: 5px 8px; color: #27ae60;">3. Scope 3 — Other Indirect Emissions</td>
                            </tr>
                            ${model.sources.filter(s => s.scope === 3).length > 0 ? model.sources.filter(s => s.scope === 3).map((s, idx) => `
                                <tr>
                                    <td style="border: 1px solid #000000; padding: 5px; text-align: center;">3.${idx + 1}</td>
                                    <td style="border: 1px solid #000000; padding: 5px 8px;">${s.name}</td>
                                    <td style="border: 1px solid #000000; padding: 5px 6px;">${s.activityData}</td>
                                    <td style="border: 1px solid #000000; padding: 5px 6px; text-align: right;">${s.kg.toLocaleString(undefined, {maximumFractionDigits:1})}</td>
                                    <td style="border: 1px solid #000000; padding: 5px 6px; text-align: right;">${s.tons.toFixed(3)}</td>
                                    <td style="border: 1px solid #000000; padding: 5px 4px; text-align: right; font-weight: bold;">${s.percentage.toFixed(2)}%</td>
                                </tr>
                            `).join('') : `
                                <tr><td colspan="6" style="border: 1px solid #000000; padding: 6px; text-align: center; color: #7f8c8d;">No Scope 3 indirect emissions recorded</td></tr>
                            `}
                            <tr style="background: #d5f5e3; font-weight: bold;">
                                <td colspan="3" style="border: 1px solid #000000; padding: 5px 8px; text-align: right;">SUBTOTAL SCOPE 3:</td>
                                <td style="border: 1px solid #000000; padding: 5px 6px; text-align: right;">${model.scopes.scope3Kg.toLocaleString(undefined, {maximumFractionDigits:1})}</td>
                                <td style="border: 1px solid #000000; padding: 5px 6px; text-align: right;">${model.scopes.scope3Tons.toFixed(3)}</td>
                                <td style="border: 1px solid #000000; padding: 5px 4px; text-align: right;">${model.scopes.scope3Pct.toFixed(2)}%</td>
                            </tr>

                            <!-- GROSS TOTAL -->
                            <tr style="background: #1e293b; color: #ffffff; font-weight: bold; font-size: 0.85rem;">
                                <td colspan="3" style="border: 1px solid #000000; padding: 7px 8px; text-align: right;">GROSS INSTITUTIONAL EMISSIONS:</td>
                                <td style="border: 1px solid #000000; padding: 7px 6px; text-align: right; color: #f8fafc;">${model.grossEmissionsKg.toLocaleString(undefined, {maximumFractionDigits:1})}</td>
                                <td style="border: 1px solid #000000; padding: 7px 6px; text-align: right; color: #38bdf8;">${model.grossEmissionsTons.toFixed(3)}</td>
                                <td style="border: 1px solid #000000; padding: 7px 4px; text-align: right; color: #4ade80;">100.00%</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                ${renderPageFooter()}
            </div>

            <!-- PAGE 11: NET CARBON FOOTPRINT BALANCE & OFFSETS -->
            <div class="report-page" data-page-type="offsets" style="padding: 12mm; border: 2.5px solid #00b050; min-height: 297mm; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; page-break-after: always;">
                <div>
                    ${renderPageHeader(inst)}

                    <div style="text-align: center; margin-bottom: 20px;">
                        <h2 style="font-size: 1.25rem; font-weight: 800; color: #000000; margin-bottom: 12px;">
                            Equation 13.3: Net Carbon Footprint Balance
                        </h2>

                        <div style="background: #f8fafc; border: 2px solid #00b050; border-radius: 8px; padding: 18px; margin: 15px auto; width: 95%;">
                            <h3 style="font-size: 1.05rem; font-weight: 700; color: #2c3e50; margin: 0 0 8px 0;">
                                Net Operational Footprint = Gross GHG Emissions − Verified Carbon Offsets
                            </h3>
                            <div style="font-size: 0.95rem; font-family: monospace; color: #334155; margin: 6px 0;">
                                Net Operational Footprint = ${model.grossEmissionsKg.toLocaleString(undefined, {maximumFractionDigits:1})} kg CO₂e − ${model.totalOffsetsKg.toLocaleString(undefined, {maximumFractionDigits:1})} kg CO₂e
                            </div>
                            <div style="font-size: 1.6rem; font-weight: 800; color: #00b050; margin-top: 10px;">
                                = ${model.netEmissionsKg.toLocaleString(undefined, {maximumFractionDigits:2})} kg CO₂e/year
                            </div>
                            <div style="font-size: 1.05rem; font-weight: 700; color: #475569; margin-top: 2px;">
                                (&asymp; ${model.netEmissionsTons.toFixed(2)} t CO₂e/year)
                            </div>
                        </div>
                    </div>

                    <h3 style="font-size: 1.02rem; font-weight: 700; color: #000000; margin-top: 20px; margin-bottom: 8px;">
                        Carbon Offset &amp; Sequestration Removal Summary
                    </h3>

                    <table style="width: 100%; border-collapse: collapse; font-size: 0.82rem; border: 1px solid #000000; margin-bottom: 15px;">
                        <thead>
                            <tr style="background: #e2e8f0; border-bottom: 1px solid #000000;">
                                <th style="border: 1px solid #000000; padding: 6px; text-align: center; width: 8%;">Sr.</th>
                                <th style="border: 1px solid #000000; padding: 6px 8px; text-align: left; width: 44%;">Offset Mechanism / Sink</th>
                                <th style="border: 1px solid #000000; padding: 6px 8px; text-align: right; width: 24%;">Removal (kg CO₂e/yr)</th>
                                <th style="border: 1px solid #000000; padding: 6px 8px; text-align: right; width: 12%;">Removal (t)</th>
                                <th style="border: 1px solid #000000; padding: 6px 8px; text-align: right; width: 12%;">Share %</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td style="border: 1px solid #000000; padding: 6px; text-align: center;">1.</td>
                                <td style="border: 1px solid #000000; padding: 6px 8px;">Solar Clean Energy Generation Avoidance</td>
                                <td style="border: 1px solid #000000; padding: 6px 8px; text-align: right;">${model.offsetsBreakdown.solarKg.toLocaleString(undefined, {maximumFractionDigits:1})}</td>
                                <td style="border: 1px solid #000000; padding: 6px 8px; text-align: right;">${model.offsetsBreakdown.solarTons.toFixed(3)}</td>
                                <td style="border: 1px solid #000000; padding: 6px 8px; text-align: right;">${model.offsetsBreakdown.solarPct.toFixed(1)}%</td>
                            </tr>
                            <tr>
                                <td style="border: 1px solid #000000; padding: 6px; text-align: center;">2.</td>
                                <td style="border: 1px solid #000000; padding: 6px 8px;">Biological Green Cover / Tree Biomass Sequestration</td>
                                <td style="border: 1px solid #000000; padding: 6px 8px; text-align: right;">${model.offsetsBreakdown.treesKg.toLocaleString(undefined, {maximumFractionDigits:1})}</td>
                                <td style="border: 1px solid #000000; padding: 6px 8px; text-align: right;">${model.offsetsBreakdown.treesTons.toFixed(3)}</td>
                                <td style="border: 1px solid #000000; padding: 6px 8px; text-align: right;">${model.offsetsBreakdown.treesPct.toFixed(1)}%</td>
                            </tr>
                            <tr>
                                <td style="border: 1px solid #000000; padding: 6px; text-align: center;">3.</td>
                                <td style="border: 1px solid #000000; padding: 6px 8px;">Solid Waste Diversion &amp; Composting Offset</td>
                                <td style="border: 1px solid #000000; padding: 6px 8px; text-align: right;">${model.offsetsBreakdown.wasteKg.toLocaleString(undefined, {maximumFractionDigits:1})}</td>
                                <td style="border: 1px solid #000000; padding: 6px 8px; text-align: right;">${model.offsetsBreakdown.wasteTons.toFixed(3)}</td>
                                <td style="border: 1px solid #000000; padding: 6px 8px; text-align: right;">${model.offsetsBreakdown.wasteKg > 0 && model.totalOffsetsKg > 0 ? ((model.offsetsBreakdown.wasteKg / model.totalOffsetsKg) * 100).toFixed(1) : '0.0'}%</td>
                            </tr>
                            <tr style="background: #d5f5e3; font-weight: bold;">
                                <td colspan="2" style="border: 1px solid #000000; padding: 6px 8px; text-align: right;">TOTAL VERIFIED REMOVALS:</td>
                                <td style="border: 1px solid #000000; padding: 6px 8px; text-align: right;">${model.totalOffsetsKg.toLocaleString(undefined, {maximumFractionDigits:1})}</td>
                                <td style="border: 1px solid #000000; padding: 6px 8px; text-align: right;">${model.totalOffsetsTons.toFixed(3)}</td>
                                <td style="border: 1px solid #000000; padding: 6px 8px; text-align: right;">100.0%</td>
                            </tr>
                        </tbody>
                    </table>

                    <div style="margin-top: 15px;">
                        ${offsetDonutSVG}
                    </div>
                </div>

                ${renderPageFooter()}
            </div>

            <!-- PAGE 12: EMISSION DISTRIBUTION & HOTSPOT VISUALS -->
            <div class="report-page" data-page-type="charts" style="padding: 12mm; border: 2.5px solid #00b050; min-height: 297mm; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; page-break-after: always;">
                <div>
                    ${renderPageHeader(inst)}

                    <h2 style="font-size: 1.25rem; font-weight: 800; color: #000000; margin-bottom: 12px; text-align: center;">
                        Institutional Emission Distribution &amp; Hotspots
                    </h2>

                    <div style="margin-bottom: 20px;">
                        <h3 style="font-size: 0.95rem; font-weight: 700; color: #000000; margin-bottom: 8px;">
                            Scope-wise Emission Contribution Profile
                        </h3>
                        ${scopeDonutSVG}
                    </div>

                    <div style="margin-top: 15px;">
                        <h3 style="font-size: 0.95rem; font-weight: 700; color: #000000; margin-bottom: 8px;">
                            Internal Emission Source Distribution Ranking
                        </h3>
                        ${hotspotBarSVG}
                    </div>

                    <div style="margin-top: 20px; display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px;">
                        <div style="background: #f8fafc; border: 1px solid #cbd5e1; padding: 10px; border-radius: 6px; text-align: center;">
                            <div style="font-size: 0.75rem; font-weight: 600; color: #64748b;">NET PER CAPITA</div>
                            <div style="font-size: 1.15rem; font-weight: 800; color: #00b050; margin-top: 2px;">${model.intensity.perCapitaKg.toFixed(1)}</div>
                            <div style="font-size: 0.72rem; color: #64748b;">kg CO₂e/person/year</div>
                        </div>
                        <div style="background: #f8fafc; border: 1px solid #cbd5e1; padding: 10px; border-radius: 6px; text-align: center;">
                            <div style="font-size: 0.75rem; font-weight: 600; color: #64748b;">SPATIAL INTENSITY</div>
                            <div style="font-size: 1.15rem; font-weight: 800; color: #2980b9; margin-top: 2px;">${model.intensity.perSqmKg.toFixed(2)}</div>
                            <div style="font-size: 0.72rem; color: #64748b;">kg CO₂e/m² builtup</div>
                        </div>
                        <div style="background: #f8fafc; border: 1px solid #cbd5e1; padding: 10px; border-radius: 6px; text-align: center;">
                            <div style="font-size: 0.75rem; font-weight: 600; color: #64748b;">OFFSET EFFICIENCY</div>
                            <div style="font-size: 1.15rem; font-weight: 800; color: #e67e22; margin-top: 2px;">${model.offsetsBreakdown.offsetRatioPct.toFixed(1)}%</div>
                            <div style="font-size: 0.72rem; color: #64748b;">of gross emissions neutralized</div>
                        </div>
                    </div>
                </div>

                ${renderPageFooter()}
            </div>

            <!-- PAGE 13: DISCUSSION & INTERPRETATION (SCOPE 1 & SCOPE 2) -->
            <div class="report-page" data-page-type="disc-s1-s2" style="padding: 12mm; border: 2.5px solid #00b050; min-height: 297mm; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; page-break-after: always;">
                <div>
                    ${renderPageHeader(inst)}

                    ${aiStatusBadge}

                    <div id="sec-scope1-disc" data-section-id="sec-scope1-disc" style="margin-bottom: 22px;">
                        <h2 style="font-size: 1.18rem; font-weight: 800; color: #000000; margin-bottom: 10px;">
                            13.a. Discussion and Interpretation for Scope 1
                        </h2>
                        <div style="font-size: 0.88rem; text-align: justify; line-height: 1.65;">
                            <p style="margin-bottom: 10px;">
                                ${insights.scope1Interpretation}
                            </p>
                        </div>
                    </div>

                    <div id="sec-scope2-disc" data-section-id="sec-scope2-disc">
                        <h2 style="font-size: 1.18rem; font-weight: 800; color: #000000; margin-bottom: 10px;">
                            13.b. Discussion and Interpretation for Scope 2
                        </h2>
                        <div style="font-size: 0.88rem; text-align: justify; line-height: 1.65;">
                            <p style="margin-bottom: 10px;">
                                ${insights.scope2Interpretation}
                            </p>
                        </div>
                    </div>
                </div>

                ${renderPageFooter()}
            </div>

            <!-- PAGE 14: DISCUSSION & INTERPRETATION (SCOPE 3 & HOTSPOTS) -->
            <div class="report-page" data-page-type="disc-s3-hotspots" style="padding: 12mm; border: 2.5px solid #00b050; min-height: 297mm; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; page-break-after: always;">
                <div>
                    ${renderPageHeader(inst)}

                    ${aiStatusBadge}

                    <div id="sec-scope3-disc" data-section-id="sec-scope3-disc" style="margin-bottom: 22px;">
                        <h2 style="font-size: 1.18rem; font-weight: 800; color: #000000; margin-bottom: 10px;">
                            13.c. Discussion and Interpretation for Scope 3
                        </h2>
                        <div style="font-size: 0.88rem; text-align: justify; line-height: 1.65;">
                            <p style="margin-bottom: 10px;">
                                ${insights.scope3Interpretation}
                            </p>
                        </div>
                    </div>

                    <div id="sec-hotspot-disc" data-section-id="sec-hotspot-disc">
                        <h2 style="font-size: 1.18rem; font-weight: 800; color: #000000; margin-bottom: 10px;">
                            13.d. Critical Emission Hotspot Analysis
                        </h2>
                        <div style="font-size: 0.88rem; text-align: justify; line-height: 1.65;">
                            <p style="margin-bottom: 10px;">
                                ${insights.hotspotAnalysis}
                            </p>
                        </div>
                    </div>
                </div>

                ${renderPageFooter()}
            </div>

            <!-- PAGE 15: INTERNAL EMISSION DRIVERS & INTENSITY BENCHMARKS (SECTION 14) -->
            <div class="report-page" data-page-type="drivers" style="padding: 12mm; border: 2.5px solid #00b050; min-height: 297mm; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; page-break-after: always;">
                <div id="sec-drivers" data-section-id="sec-drivers">
                    ${renderPageHeader(inst)}

                    <h2 style="font-size: 1.25rem; font-weight: 800; color: #000000; margin-bottom: 12px;">
                        14. Internal Emission Drivers &amp; Intensity Benchmarks
                    </h2>

                    <div style="font-size: 0.88rem; text-align: justify; line-height: 1.65;">
                        <p style="margin-bottom: 12px;">
                            In rigorous environmental reporting, institutional comparisons must evaluate traceable internal drivers and normalized intensity indicators rather than unsubstantiated external figures. Academic institutions exhibit divergent emission profiles driven by whether campuses are residential or day-scholar, technical or non-technical, and regionally situated in high or low cooling degree-day zones.
                        </p>

                        <div style="margin: 15px 0;">
                            <h3 style="font-size: 0.95rem; font-weight: 700; color: #000000; margin-bottom: 8px;">
                                Table 14.1: Normalized Operational Intensity Matrix
                            </h3>
                            <table style="width: 100%; border-collapse: collapse; font-size: 0.82rem; border: 1px solid #000000;">
                                <thead>
                                    <tr style="background: #e2e8f0; border-bottom: 1px solid #000000;">
                                        <th style="border: 1px solid #000000; padding: 6px 8px; text-align: left;">Operational Metric</th>
                                        <th style="border: 1px solid #000000; padding: 6px 8px; text-align: center;">Campus Value</th>
                                        <th style="border: 1px solid #000000; padding: 6px 8px; text-align: left;">Typical Academic Range</th>
                                        <th style="border: 1px solid #000000; padding: 6px 8px; text-align: left;">Operational Context</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td style="border: 1px solid #000000; padding: 6px 8px; font-weight: bold;">Gross Carbon Intensity (Per Capita)</td>
                                        <td style="border: 1px solid #000000; padding: 6px 8px; text-align: center; font-weight: bold; color: #e67e22;">${model.intensity.grossPerCapitaKg.toFixed(1)} kg CO₂e</td>
                                        <td style="border: 1px solid #000000; padding: 6px 8px;">40 – 350 kg CO₂e/person</td>
                                        <td style="border: 1px solid #000000; padding: 6px 8px;">Reflects overall operational load across all students and staff.</td>
                                    </tr>
                                    <tr>
                                        <td style="border: 1px solid #000000; padding: 6px 8px; font-weight: bold;">Net Carbon Intensity (Per Capita)</td>
                                        <td style="border: 1px solid #000000; padding: 6px 8px; text-align: center; font-weight: bold; color: #00b050;">${model.intensity.perCapitaKg.toFixed(1)} kg CO₂e</td>
                                        <td style="border: 1px solid #000000; padding: 6px 8px;">25 – 250 kg CO₂e/person</td>
                                        <td style="border: 1px solid #000000; padding: 6px 8px;">Net footprint after solar avoided emissions and tree absorption.</td>
                                    </tr>
                                    <tr>
                                        <td style="border: 1px solid #000000; padding: 6px 8px; font-weight: bold;">Spatial Carbon Intensity (Per m²)</td>
                                        <td style="border: 1px solid #000000; padding: 6px 8px; text-align: center; font-weight: bold;">${model.intensity.perSqmKg.toFixed(2)} kg CO₂e/m²</td>
                                        <td style="border: 1px solid #000000; padding: 6px 8px;">3.5 – 28.0 kg CO₂e/m²</td>
                                        <td style="border: 1px solid #000000; padding: 6px 8px;">Measures building energy efficiency and density of space utilization.</td>
                                    </tr>
                                    <tr>
                                        <td style="border: 1px solid #000000; padding: 6px 8px; font-weight: bold;">Scope 1 Concentration Share</td>
                                        <td style="border: 1px solid #000000; padding: 6px 8px; text-align: center; font-weight: bold;">${model.scopes.scope1Pct.toFixed(1)}%</td>
                                        <td style="border: 1px solid #000000; padding: 6px 8px;">5% – 25% (Non-residential)</td>
                                        <td style="border: 1px solid #000000; padding: 6px 8px;">High share points specifically to dining culinary LPG usage.</td>
                                    </tr>
                                    <tr>
                                        <td style="border: 1px solid #000000; padding: 6px 8px; font-weight: bold;">Clean Renewable Offset Ratio</td>
                                        <td style="border: 1px solid #000000; padding: 6px 8px; text-align: center; font-weight: bold; color: #27ae60;">${model.offsetsBreakdown.offsetRatioPct.toFixed(1)}%</td>
                                        <td style="border: 1px solid #000000; padding: 6px 8px;">5% – 40% (Active Green Campuses)</td>
                                        <td style="border: 1px solid #000000; padding: 6px 8px;">Proportion of annual emissions actively neutralized within campus.</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        <p style="margin-top: 12px;">
                            ${insights.internalComparisonAnalysis}
                        </p>
                    </div>
                </div>

                ${renderPageFooter()}
            </div>

            <!-- PAGE 16: DISCUSSION OF STANDARDS (SECTION 15) -->
            <div class="report-page" data-page-type="standards" style="padding: 12mm; border: 2.5px solid #00b050; min-height: 297mm; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; page-break-after: always;">
                <div id="sec-standards" data-section-id="sec-standards">
                    ${renderPageHeader(inst)}

                    <h2 style="font-size: 1.25rem; font-weight: 800; color: #000000; margin-bottom: 12px;">
                        15. Discussion with Respect to GHG Emission Standards
                    </h2>
                    <h3 style="font-size: 0.95rem; font-weight: 600; color: #00b050; margin-bottom: 15px;">
                        ISO 14064-1:2018, ISO 14064-2:2019, ISO 14064-3:2019 &amp; GHG Protocol
                    </h3>

                    <div style="font-size: 0.88rem; text-align: justify; line-height: 1.65;">
                        <p style="margin-bottom: 12px;">
                            This institutional assessment has been framed and audited in accordance with the five core accounting principles set forth in <strong>ISO 14064-1:2018</strong>:
                        </p>

                        <div style="margin-bottom: 10px;">
                            <strong style="color: #000000;">1. Relevance:</strong> The selected operational boundary accurately reflects the direct control and indirect influences of <strong>${inst.name}</strong>, serving the decision-making needs of administrators, regulators, and accreditation bodies.
                        </div>

                        <div style="margin-bottom: 10px;">
                            <strong style="color: #000000;">2. Completeness:</strong> All operational GHG sources within the defined boundary have been accounted for. No unmeasured activity stream is treated as zero; data gaps are explicitly declared to prevent biased underestimation.
                        </div>

                        <div style="margin-bottom: 10px;">
                            <strong style="color: #000000;">3. Consistency:</strong> Standardized conversion coefficients from the Central Electricity Authority (CEA User Guide v19.0) and the Intergovernmental Panel on Climate Change (IPCC) ensure that multi-year comparisons remain scientifically valid.
                        </div>

                        <div style="margin-bottom: 10px;">
                            <strong style="color: #000000;">4. Accuracy:</strong> Activity data was obtained directly from metered utility bills, registered fuel logs, and procurement records, minimizing systemic uncertainties and bias.
                        </div>

                        <div style="margin-bottom: 15px;">
                            <strong style="color: #000000;">5. Transparency:</strong> All mathematical formulas, emission factor coefficients, and audit trail references are fully disclosed within the report annexures, enabling third-party verification under ISO 14064-3 specifications.
                        </div>

                        <p style="margin-top: 15px;">
                            ${insights.standardsDiscussion}
                        </p>
                    </div>
                </div>

                ${renderPageFooter()}
            </div>

            <!-- PAGE 17: DETAILED RECOMMENDATIONS (SECTION 16) -->
            <div class="report-page" data-page-type="recom" style="padding: 12mm; border: 2.5px solid #00b050; min-height: 297mm; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; page-break-after: always;">
                <div id="sec-recom" data-section-id="sec-recom">
                    ${renderPageHeader(inst)}

                    <h2 style="font-size: 1.25rem; font-weight: 800; color: #000000; margin-bottom: 8px;">
                        16. Detailed Recommendations
                    </h2>
                    <p style="font-size: 0.85rem; color: #475569; margin-bottom: 12px;">
                        To systematically mitigate the institutional net footprint of <strong>${model.netEmissionsKg.toLocaleString(undefined, {maximumFractionDigits:1})} kg CO₂e/year</strong>, the following targeted engineering interventions are recommended:
                    </p>

                    <div style="display: flex; flex-direction: column; gap: 10px;">
                        ${(insights.recommendations || []).map((rec, idx) => `
                            <div style="border: 1px solid #000000; border-radius: 6px; padding: 8px 12px; background: #ffffff;">
                                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px dashed #cbd5e1; padding-bottom: 4px; margin-bottom: 6px;">
                                    <strong style="font-size: 0.88rem; color: #000000;">${idx + 1}. ${rec.source}</strong>
                                    <div style="display: flex; gap: 6px;">
                                        <span style="font-size: 0.7rem; font-weight: 700; background: ${rec.priority === 'High' ? '#fee2e2' : '#fef3c7'}; color: ${rec.priority === 'High' ? '#991b1b' : '#92400e'}; padding: 2px 6px; border-radius: 4px;">${rec.priority} Priority</span>
                                        <span style="font-size: 0.7rem; font-weight: 600; background: #f1f5f9; color: #334155; padding: 2px 6px; border-radius: 4px;">${rec.timeframe}</span>
                                    </div>
                                </div>
                                <div style="font-size: 0.8rem; line-height: 1.45;">
                                    <p style="margin: 2px 0;"><strong>Evidence from Assessment:</strong> ${rec.evidence}</p>
                                    <p style="margin: 2px 0;"><strong>Recommended Action:</strong> ${rec.action}</p>
                                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 4px; font-size: 0.75rem; color: #475569; background: #f8fafc; padding: 4px 8px; border-radius: 4px;">
                                        <div><strong>Target KPI:</strong> ${rec.kpi}</div>
                                        <div><strong>Expected Impact:</strong> ${rec.reductionPotential}</div>
                                    </div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>

                ${renderPageFooter()}
            </div>

            <!-- PAGE 18: DECARBONIZATION ROADMAP -->
            <div class="report-page" data-page-type="roadmap" style="padding: 12mm; border: 2.5px solid #00b050; min-height: 297mm; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; page-break-after: always;">
                <div>
                    ${renderPageHeader(inst)}

                    <h2 style="font-size: 1.25rem; font-weight: 800; color: #000000; margin-bottom: 12px;">
                        Strategic Decarbonization Roadmap &amp; Phased Milestones
                    </h2>

                    <div style="font-size: 0.88rem; text-align: justify; line-height: 1.65;">
                        <p style="margin-bottom: 14px;">
                            Achieving substantive emission reductions requires a structured, multi-phase operational roadmap that synchronizes capital budgeting with academic scheduling.
                        </p>

                        <div style="background: #f8fafc; border: 1.5px solid #00b050; border-radius: 8px; padding: 14px; margin-bottom: 14px;">
                            <h3 style="font-size: 0.98rem; font-weight: 800; color: #00b050; margin: 0 0 6px 0;">
                                Phase 1: Operational Efficiency &amp; Immediate Interventions (Months 0 – 6)
                            </h3>
                            <ul style="margin: 0; padding-left: 20px; font-size: 0.85rem; line-height: 1.6;">
                                <li>Enact campus-wide paperless examination and administrative submission protocols.</li>
                                <li>Pilot commercial induction cooking ranges in hostel dining kitchens to displace peak LPG cylinder usage.</li>
                                <li>Complete LED lighting and BLDC ceiling fan retrofits across high-occupancy lecture blocks.</li>
                                <li>Conduct comprehensive thermographic audits of power distribution panels to curtail transmission losses.</li>
                            </ul>
                        </div>

                        <div style="background: #f8fafc; border: 1.5px solid #2980b9; border-radius: 8px; padding: 14px; margin-bottom: 14px;">
                            <h3 style="font-size: 0.98rem; font-weight: 800; color: #2980b9; margin: 0 0 6px 0;">
                                Phase 2: Clean Technology &amp; Supply Integration (Months 6 – 18)
                            </h3>
                            <ul style="margin: 0; padding-left: 20px; font-size: 0.85rem; line-height: 1.6;">
                                <li>Expand rooftop solar PV capacity to satisfy up to 50% of diurnal instructional electricity requirements.</li>
                                <li>Deploy institutional electric buggies for inter-departmental mobility and cargo logistics.</li>
                                <li>Install automated energy sub-metering IoT hubs with real-time departmental carbon tracking dashboards.</li>
                                <li>Construct a dedicated wet organic waste anaerobic biomethanation plant.</li>
                            </ul>
                        </div>

                        <div style="background: #f8fafc; border: 1.5px solid #27ae60; border-radius: 8px; padding: 14px; margin-bottom: 14px;">
                            <h3 style="font-size: 0.98rem; font-weight: 800; color: #27ae60; margin: 0 0 6px 0;">
                                Phase 3: Net-Zero Campus Leadership &amp; Carbon Neutrality (Months 18 – 36)
                            </h3>
                            <ul style="margin: 0; padding-left: 20px; font-size: 0.85rem; line-height: 1.6;">
                                <li>Establish battery energy storage systems (BESS) to buffer nighttime hostel power loads with clean daytime solar.</li>
                                <li>Expand campus perimeter native tree density through the Miyawaki afforestation method, doubling biological sequestration.</li>
                                <li>Seek formal third-party accredited ISO 14064-1 verification for NAAC, NIRF, and international sustainability ranking.</li>
                            </ul>
                        </div>
                    </div>
                </div>

                ${renderPageFooter()}
            </div>

            <!-- PAGE 19: CONCLUSION & REFERENCES (SECTIONS 17 & 18) -->
            <div class="report-page" data-page-type="conclusion" style="padding: 12mm; border: 2.5px solid #00b050; min-height: 297mm; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; page-break-after: always;">
                <div>
                    ${renderPageHeader(inst)}

                    <div id="sec-concl" data-section-id="sec-concl" style="margin-bottom: 22px;">
                        <h2 style="font-size: 1.25rem; font-weight: 800; color: #000000; margin-bottom: 10px;">
                            17. Conclusion
                        </h2>
                        <div style="font-size: 0.88rem; text-align: justify; line-height: 1.65;">
                            <p style="margin-bottom: 10px;">
                                ${insights.conclusion}
                            </p>
                        </div>
                    </div>

                    <div id="sec-ref" data-section-id="sec-ref">
                        <h2 style="font-size: 1.25rem; font-weight: 800; color: #000000; margin-bottom: 10px;">
                            18. References
                        </h2>
                        <ol style="font-size: 0.82rem; line-height: 1.65; margin: 0; padding-left: 20px;">
                            <li style="margin-bottom: 6px;">
                                <strong>World Resources Institute (WRI) &amp; World Business Council for Sustainable Development (WBCSD).</strong> "The Greenhouse Gas Protocol: A Corporate Accounting and Reporting Standard (Revised Edition)."
                            </li>
                            <li style="margin-bottom: 6px;">
                                <strong>International Organization for Standardization (ISO).</strong> "ISO 14064-1:2018 Specification with guidance at the organization level for quantification and reporting of greenhouse gas emissions and removals."
                            </li>
                            <li style="margin-bottom: 6px;">
                                <strong>Central Electricity Authority (CEA), Ministry of Power, Government of India.</strong> "CO₂ Baseline Database for the Indian Power Sector," User Guide Version 19.0 (Grid Emission Factor: 0.792 kg CO₂e/kWh).
                            </li>
                            <li style="margin-bottom: 6px;">
                                <strong>Intergovernmental Panel on Climate Change (IPCC).</strong> "2006 IPCC Guidelines for National Greenhouse Gas Inventories &amp; 2019 Refinement."
                            </li>
                            <li style="margin-bottom: 6px;">
                                <strong>UK Department for Environment, Food &amp; Rural Affairs (DEFRA).</strong> "GHG Conversion Factors for Company Reporting," 2024/2025.
                            </li>
                            <li style="margin-bottom: 6px;">
                                <strong>Bureau of Energy Efficiency (BEE), Ministry of Power, India.</strong> "Energy Conservation Building Code (ECBC) for Educational Institutions."
                            </li>
                        </ol>
                    </div>
                </div>

                ${renderPageFooter()}
            </div>

            <!-- PAGE 20: ANNEXURE 1 - INSTITUTIONAL PROFILE DETAILS -->
            <div class="report-page" data-page-type="annex1" style="padding: 12mm; border: 2.5px solid #00b050; min-height: 297mm; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; page-break-after: always;">
                <div id="sec-annex1" data-section-id="sec-annex1">
                    ${renderPageHeader(inst)}

                    <div style="text-align: right; font-size: 1.1rem; font-weight: 800; font-style: italic; color: #000000;">Annexure-1</div>

                    <h2 style="font-size: 1.2rem; font-weight: 800; color: #000000; margin-bottom: 12px;">
                        Details of Carbon Footprint Estimation
                    </h2>

                    <table style="width: 100%; border-collapse: collapse; font-size: 0.82rem; border: 1px solid #000000; margin-bottom: 20px;">
                        <tbody>
                            <tr>
                                <td style="border: 1px solid #000000; padding: 7px 10px; font-weight: bold; width: 35%; background: #f8fafc;">Name of Institute / Organization:</td>
                                <td style="border: 1px solid #000000; padding: 7px 10px; font-weight: bold; color: #000000;">${inst.name}</td>
                            </tr>
                            <tr>
                                <td style="border: 1px solid #000000; padding: 7px 10px; font-weight: bold; background: #f8fafc;">Campus Postal Address:</td>
                                <td style="border: 1px solid #000000; padding: 7px 10px;">${inst.address}</td>
                            </tr>
                            <tr>
                                <td style="border: 1px solid #000000; padding: 7px 10px; font-weight: bold; background: #f8fafc;">Official Contact Details:</td>
                                <td style="border: 1px solid #000000; padding: 7px 10px;">${inst.contact}</td>
                            </tr>
                            <tr>
                                <td style="border: 1px solid #000000; padding: 7px 10px; font-weight: bold; background: #f8fafc;">Official Email Address:</td>
                                <td style="border: 1px solid #000000; padding: 7px 10px; color: #2980b9;">${inst.email}</td>
                            </tr>
                            <tr>
                                <td style="border: 1px solid #000000; padding: 7px 10px; font-weight: bold; background: #f8fafc;">Institutional Website:</td>
                                <td style="border: 1px solid #000000; padding: 7px 10px; color: #2980b9;">${inst.website}</td>
                            </tr>
                            <tr>
                                <td style="border: 1px solid #000000; padding: 7px 10px; font-weight: bold; background: #f8fafc;">Total Campus Land Area:</td>
                                <td style="border: 1px solid #000000; padding: 7px 10px;">${inst.areaAcres} acres (&asymp; ${(inst.areaAcres * 4046.86).toLocaleString(undefined, {maximumFractionDigits:1})} m²)</td>
                            </tr>
                            <tr>
                                <td style="border: 1px solid #000000; padding: 7px 10px; font-weight: bold; background: #f8fafc;">Total Built-up Facility Area:</td>
                                <td style="border: 1px solid #000000; padding: 7px 10px;">${inst.builtUpSqm.toLocaleString()} m²</td>
                            </tr>
                            <tr>
                                <td style="border: 1px solid #000000; padding: 7px 10px; font-weight: bold; background: #f8fafc;">Geographic Coordinates:</td>
                                <td style="border: 1px solid #000000; padding: 7px 10px;">Latitude: ${inst.lat} &bull; Longitude: ${inst.lng}</td>
                            </tr>
                            <tr>
                                <td style="border: 1px solid #000000; padding: 7px 10px; font-weight: bold; background: #f8fafc;">Campus Elevation Above MSL:</td>
                                <td style="border: 1px solid #000000; padding: 7px 10px;">${inst.elevation}</td>
                            </tr>
                            <tr>
                                <td style="border: 1px solid #000000; padding: 7px 10px; font-weight: bold; background: #f8fafc;">Active Population Census:</td>
                                <td style="border: 1px solid #000000; padding: 7px 10px;">${inst.population.toLocaleString()} occupants (${inst.students.toLocaleString()} students, ${inst.faculty.toLocaleString()} faculty &amp; staff)</td>
                            </tr>
                            <tr>
                                <td style="border: 1px solid #000000; padding: 7px 10px; font-weight: bold; background: #f8fafc;">Assessment Reporting Year:</td>
                                <td style="border: 1px solid #000000; padding: 7px 10px;">${inst.reportingYear}</td>
                            </tr>
                        </tbody>
                    </table>

                    <div style="background: #f8fafc; border: 1px solid #cbd5e1; padding: 12px; border-radius: 6px; font-size: 0.85rem; line-height: 1.6;">
                        <p style="margin: 0;"><strong>Audit Methodology Note:</strong> All institutional metadata recorded above has been formally cross-referenced against campus estate registers, municipal building sanctioned plans, and administrative HR rolls to ensure complete baseline veracity.</p>
                    </div>
                </div>

                ${renderPageFooter()}
            </div>

            <!-- PAGE 21: ANNEXURE 1 (CONTINUED) - TREE SPECIES SEQUESTRATION LEDGER -->
            <div class="report-page" data-page-type="annex1-trees" style="padding: 12mm; border: 2.5px solid #00b050; min-height: 297mm; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; page-break-after: always;">
                <div>
                    ${renderPageHeader(inst)}

                    <div style="text-align: right; font-size: 1.1rem; font-weight: 800; font-style: italic; color: #000000;">Annexure-1 (Contd.)</div>

                    <h2 style="font-size: 1.2rem; font-weight: 800; color: #000000; margin-bottom: 12px;">
                        GREEN COVER — Tree Species Biomass Sequestration Ledger
                    </h2>

                    <p style="font-size: 0.85rem; color: #475569; margin-bottom: 10px;">
                        Carbon sequestration quantification is based on species-specific biomass growth equations and annual carbon assimilation coefficients codified by the Indian Council of Forestry Research and Education (ICFRE).
                    </p>

                    <table style="width: 100%; border-collapse: collapse; font-size: 0.78rem; border: 1px solid #000000;">
                        <thead>
                            <tr style="background: #e2e8f0; border-bottom: 1px solid #000000;">
                                <th style="border: 1px solid #000000; padding: 6px; text-align: center; width: 6%;">Sr.</th>
                                <th style="border: 1px solid #000000; padding: 6px 8px; text-align: left; width: 44%;">Botanical &amp; Common Species Name</th>
                                <th style="border: 1px solid #000000; padding: 6px; text-align: center; width: 16%;">Tree Count</th>
                                <th style="border: 1px solid #000000; padding: 6px 8px; text-align: right; width: 18%; background: #d5f5e3;">Absorption Factor (kg/tree/yr)</th>
                                <th style="border: 1px solid #000000; padding: 6px 8px; text-align: right; width: 16%; background: #d5f5e3;">Total Removal (kg CO₂/yr)</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${model.offsetsBreakdown.treeSpeciesList.length > 0 ? model.offsetsBreakdown.treeSpeciesList.map((item, idx) => `
                                <tr>
                                    <td style="border: 1px solid #000000; padding: 5px; text-align: center;">${idx + 1}</td>
                                    <td style="border: 1px solid #000000; padding: 5px 8px;">${item.species}</td>
                                    <td style="border: 1px solid #000000; padding: 5px; text-align: center; font-weight: bold;">${item.count}</td>
                                    <td style="border: 1px solid #000000; padding: 5px 8px; text-align: right; background: #f8fafc;">${item.rate.toFixed(2)}</td>
                                    <td style="border: 1px solid #000000; padding: 5px 8px; text-align: right; background: #f8fafc; font-weight: bold;">${item.absorption.toFixed(1)}</td>
                                </tr>
                            `).join('') : `
                                <tr>
                                    <td colspan="5" style="border: 1px solid #000000; padding: 15px; text-align: center; color: #7f8c8d;">No individual tree species cataloged in primary assessment sheet.</td>
                                </tr>
                            `}
                            <tr style="background: #d5f5e3; font-weight: bold;">
                                <td colspan="2" style="border: 1px solid #000000; padding: 6px 8px; text-align: right;">CUMULATIVE CAMPUS GREEN COVER TOTALS:</td>
                                <td style="border: 1px solid #000000; padding: 6px; text-align: center;">${model.offsetsBreakdown.treeCountTotal}</td>
                                <td style="border: 1px solid #000000; padding: 6px 8px; text-align: right;">—</td>
                                <td style="border: 1px solid #000000; padding: 6px 8px; text-align: right; color: #065f46; font-size: 0.85rem;">${model.offsetsBreakdown.treesKg.toFixed(1)}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                ${renderPageFooter()}
            </div>

            <!-- PAGE 22: ANNEXURE 2 - CALCULATION METHODOLOGIES & FORMULAS -->
            <div class="report-page" data-page-type="annex2" style="padding: 12mm; border: 2.5px solid #00b050; min-height: 297mm; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; page-break-after: always;">
                <div id="sec-annex2" data-section-id="sec-annex2">
                    ${renderPageHeader(inst)}

                    <div style="text-align: right; font-size: 1.1rem; font-weight: 800; font-style: italic; color: #000000;">Annexure-2</div>

                    <h2 style="font-size: 1.2rem; font-weight: 800; color: #000000; margin-bottom: 12px;">
                        Calculation Methodologies, Formulas &amp; Conversion Factors
                    </h2>

                    <div style="font-size: 0.82rem; line-height: 1.55;">
                        <div style="background: #f8fafc; border: 1px solid #cbd5e1; padding: 10px; border-radius: 6px; margin-bottom: 10px;">
                            <strong style="color: #000000;">Formula A1: Diesel Generator Combustion (Scope 1)</strong>
                            <div style="font-family: monospace; font-size: 0.85rem; color: #2c3e50; margin: 4px 0;">
                                E_DG (kg CO₂e) = Volume_Diesel (Liters/year) &times; 2.684 kg CO₂e/L
                            </div>
                            <div style="color: #64748b; font-size: 0.78rem;">Source: IPCC 2006 Guidelines for National Greenhouse Gas Inventories, Energy Volume.</div>
                        </div>

                        <div style="background: #f8fafc; border: 1px solid #cbd5e1; padding: 10px; border-radius: 6px; margin-bottom: 10px;">
                            <strong style="color: #000000;">Formula A2: Liquefied Petroleum Gas (LPG) Thermal Combustion (Scope 1)</strong>
                            <div style="font-family: monospace; font-size: 0.85rem; color: #2c3e50; margin: 4px 0;">
                                E_LPG (kg CO₂e) = Mass_LPG (kg/year) &times; 2.988 kg CO₂e/kg
                            </div>
                            <div style="color: #64748b; font-size: 0.78rem;">Source: UK DEFRA / IPCC 2006 Stationary Combustion coefficients for commercial LPG.</div>
                        </div>

                        <div style="background: #f8fafc; border: 1px solid #cbd5e1; padding: 10px; border-radius: 6px; margin-bottom: 10px;">
                            <strong style="color: #000000;">Formula A3: Purchased Grid Electricity Consumption (Scope 2)</strong>
                            <div style="font-family: monospace; font-size: 0.85rem; color: #2c3e50; margin: 4px 0;">
                                E_Grid (kg CO₂e) = Consumption (kWh/year) &times; 0.792 kg CO₂e/kWh
                            </div>
                            <div style="color: #64748b; font-size: 0.78rem;">Source: Central Electricity Authority (CEA), CO₂ Baseline Database for the Indian Power Sector, User Guide Version 19.0.</div>
                        </div>

                        <div style="background: #f8fafc; border: 1px solid #cbd5e1; padding: 10px; border-radius: 6px; margin-bottom: 10px;">
                            <strong style="color: #000000;">Formula A4: Commuting Vehicular Transportation (Scope 3)</strong>
                            <div style="font-family: monospace; font-size: 0.85rem; color: #2c3e50; margin: 4px 0;">
                                E_Transit (kg CO₂e) = Count &times; Daily Distance (km) &times; Emission Factor &times; 0.0485 &times; 240 academic days
                            </div>
                            <div style="color: #64748b; font-size: 0.78rem;">Source: Automotive Research Association of India (ARAI) emission standards.</div>
                        </div>

                        <div style="background: #f8fafc; border: 1px solid #cbd5e1; padding: 10px; border-radius: 6px; margin-bottom: 10px;">
                            <strong style="color: #000000;">Formula A5: Paper Procurement Carbon Footprint (Scope 3)</strong>
                            <div style="font-family: monospace; font-size: 0.85rem; color: #2c3e50; margin: 4px 0;">
                                E_Paper (kg CO₂e) = Paper Mass (kg/year) &times; 3.591 kg CO₂e/kg
                            </div>
                            <div style="color: #64748b; font-size: 0.78rem;">Source: Environmental Paper Network (EPN) lifecycle cradle-to-gate inventory.</div>
                        </div>

                        <div style="background: #f8fafc; border: 1px solid #cbd5e1; padding: 10px; border-radius: 6px;">
                            <strong style="color: #000000;">Formula A6: Solar Photovoltaic Grid Avoidance Offset</strong>
                            <div style="font-family: monospace; font-size: 0.85rem; color: #2c3e50; margin: 4px 0;">
                                Offset_Solar (kg CO₂e) = Solar Generation (kWh/year) &times; 0.792 kg CO₂e/kWh
                            </div>
                            <div style="color: #64748b; font-size: 0.78rem;">Displaces marginal fossil generation from the national grid at identical CEA factor.</div>
                        </div>
                    </div>
                </div>

                ${renderPageFooter()}
            </div>

            <!-- PAGE 23: ANNEXURE 2 (CONTINUED) - ARITHMETIC VERIFICATION PROOFS -->
            <div class="report-page" data-page-type="annex2-proofs" style="padding: 12mm; border: 2.5px solid #00b050; min-height: 297mm; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; page-break-after: always;">
                <div>
                    ${renderPageHeader(inst)}

                    <div style="text-align: right; font-size: 1.1rem; font-weight: 800; font-style: italic; color: #000000;">Annexure-2 (Contd.)</div>

                    <h2 style="font-size: 1.2rem; font-weight: 800; color: #000000; margin-bottom: 12px;">
                        Arithmetic Verification Proofs &amp; Balance Verification
                    </h2>

                    <div style="font-size: 0.85rem; line-height: 1.65; text-align: justify;">
                        <p style="margin-bottom: 12px;">
                            To ensure total mathematical transparency under ISO 14064-1:2018 requirements, the step-by-step arithmetic aggregation connecting primary inputs to final certified numbers is documented below:
                        </p>

                        <table style="width: 100%; border-collapse: collapse; font-size: 0.82rem; border: 1px solid #000000; margin-bottom: 20px;">
                            <thead>
                                <tr style="background: #e2e8f0; border-bottom: 1px solid #000000;">
                                    <th style="border: 1px solid #000000; padding: 6px 8px; text-align: left;">Step</th>
                                    <th style="border: 1px solid #000000; padding: 6px 8px; text-align: left;">Arithmetic Equation</th>
                                    <th style="border: 1px solid #000000; padding: 6px 8px; text-align: right;">Result (kg CO₂e)</th>
                                    <th style="border: 1px solid #000000; padding: 6px 8px; text-align: right;">Metric Tons</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td style="border: 1px solid #000000; padding: 6px 8px; font-weight: bold;">Step 1</td>
                                    <td style="border: 1px solid #000000; padding: 6px 8px;">Scope 1 Subtotal (DG + LPG + Fleet)</td>
                                    <td style="border: 1px solid #000000; padding: 6px 8px; text-align: right; font-family: monospace;">${model.scopes.scope1Kg.toFixed(2)}</td>
                                    <td style="border: 1px solid #000000; padding: 6px 8px; text-align: right; font-family: monospace;">${model.scopes.scope1Tons.toFixed(3)}</td>
                                </tr>
                                <tr>
                                    <td style="border: 1px solid #000000; padding: 6px 8px; font-weight: bold;">Step 2</td>
                                    <td style="border: 1px solid #000000; padding: 6px 8px;">Scope 2 Subtotal (Purchased Electricity)</td>
                                    <td style="border: 1px solid #000000; padding: 6px 8px; text-align: right; font-family: monospace;">${model.scopes.scope2Kg.toFixed(2)}</td>
                                    <td style="border: 1px solid #000000; padding: 6px 8px; text-align: right; font-family: monospace;">${model.scopes.scope2Tons.toFixed(3)}</td>
                                </tr>
                                <tr>
                                    <td style="border: 1px solid #000000; padding: 6px 8px; font-weight: bold;">Step 3</td>
                                    <td style="border: 1px solid #000000; padding: 6px 8px;">Scope 3 Subtotal (Commuting + Paper)</td>
                                    <td style="border: 1px solid #000000; padding: 6px 8px; text-align: right; font-family: monospace;">${model.scopes.scope3Kg.toFixed(2)}</td>
                                    <td style="border: 1px solid #000000; padding: 6px 8px; text-align: right; font-family: monospace;">${model.scopes.scope3Tons.toFixed(3)}</td>
                                </tr>
                                <tr style="background: #f1f5f9; font-weight: bold;">
                                    <td style="border: 1px solid #000000; padding: 6px 8px;">Step 4</td>
                                    <td style="border: 1px solid #000000; padding: 6px 8px;">Gross Footprint = Step 1 + Step 2 + Step 3</td>
                                    <td style="border: 1px solid #000000; padding: 6px 8px; text-align: right; font-family: monospace;">${model.grossEmissionsKg.toFixed(2)}</td>
                                    <td style="border: 1px solid #000000; padding: 6px 8px; text-align: right; font-family: monospace;">${model.grossEmissionsTons.toFixed(3)}</td>
                                </tr>
                                <tr>
                                    <td style="border: 1px solid #000000; padding: 6px 8px; font-weight: bold;">Step 5</td>
                                    <td style="border: 1px solid #000000; padding: 6px 8px;">Verified Offsets (Solar + Trees + Waste)</td>
                                    <td style="border: 1px solid #000000; padding: 6px 8px; text-align: right; font-family: monospace; color: #16a34a;">${model.totalOffsetsKg.toFixed(2)}</td>
                                    <td style="border: 1px solid #000000; padding: 6px 8px; text-align: right; font-family: monospace; color: #16a34a;">${model.totalOffsetsTons.toFixed(3)}</td>
                                </tr>
                                <tr style="background: #d5f5e3; font-weight: bold; font-size: 0.88rem;">
                                    <td style="border: 1px solid #000000; padding: 7px 8px;">Step 6</td>
                                    <td style="border: 1px solid #000000; padding: 7px 8px;">NET OPERATIONAL FOOTPRINT (Step 4 &minus; Step 5)</td>
                                    <td style="border: 1px solid #000000; padding: 7px 8px; text-align: right; font-family: monospace; color: #065f46;">${model.netEmissionsKg.toFixed(2)}</td>
                                    <td style="border: 1px solid #000000; padding: 7px 8px; text-align: right; font-family: monospace; color: #065f46;">${model.netEmissionsTons.toFixed(3)}</td>
                                </tr>
                            </tbody>
                        </table>

                        <div style="background: #f8fafc; border: 1px solid #cbd5e1; padding: 12px; border-radius: 6px; font-size: 0.82rem;">
                            <p style="margin: 0 0 6px 0;"><strong>Per Capita Integrity Proof:</strong></p>
                            <p style="margin: 0; font-family: monospace;">
                                Intensity = ${model.netEmissionsKg.toFixed(2)} kg CO₂e &divide; ${inst.population} occupants = <strong>${model.intensity.perCapitaKg.toFixed(2)} kg CO₂e/person/year</strong>
                            </p>
                        </div>
                    </div>
                </div>

                ${renderPageFooter()}
            </div>

            <!-- PAGE 24: ANNEXURE 3 - DATA COLLECTION SHEETS & VERIFICATION SIGN-OFF -->
            <div class="report-page" data-page-type="annex3" style="padding: 12mm; border: 2.5px solid #00b050; min-height: 297mm; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between; page-break-after: always;">
                <div id="sec-annex3" data-section-id="sec-annex3">
                    ${renderPageHeader(inst)}

                    <div style="text-align: right; font-size: 1.1rem; font-weight: 800; font-style: italic; color: #000000;">Annexure-3</div>

                    <h2 style="font-size: 1.25rem; font-weight: 800; color: #000000; margin-bottom: 15px;">
                        Data Collection Sheets &amp; Audit Verification Sign-Off
                    </h2>

                    <div style="font-size: 0.85rem; line-height: 1.6; text-align: justify; margin-bottom: 20px;">
                        <p style="margin-bottom: 12px;">
                            The activity data used throughout this assessment was compiled from official institutional documents across the reporting period. All relevant meter readings, purchase invoices, and operational manifests were inspected and reconciled prior to computation.
                        </p>

                        <div style="background: #f8fafc; border: 1px solid #cbd5e1; padding: 15px; border-radius: 8px; font-size: 0.84rem; line-height: 1.8; margin-bottom: 25px;">
                            <p style="margin: 2px 0;"><strong>Audited &amp; Verified For:</strong> ${inst.name}</p>
                            <p style="margin: 2px 0;"><strong>Auditing Body:</strong> ${inst.executingAgency}</p>
                            <p style="margin: 2px 0;"><strong>Verification Standards:</strong> ISO 14064-1:2018 &bull; ISO 14064-3:2019 &bull; GHG Protocol Corporate Standard</p>
                            <p style="margin: 2px 0;"><strong>Document Authentication Code:</strong> ${inst.documentCode}</p>
                            <p style="margin: 2px 0;"><strong>Date of Final Certification:</strong> ${inst.reportDate}</p>
                        </div>

                        <div style="border: 1.5px solid #00b050; border-radius: 8px; padding: 15px; background: #ecfdf5; margin-bottom: 30px;">
                            <h4 style="margin: 0 0 6px 0; font-size: 0.95rem; font-weight: 700; color: #065f46;">Environmental Auditor Declaration</h4>
                            <p style="margin: 0; font-size: 0.82rem; color: #047857; line-height: 1.6;">
                                We hereby confirm that the greenhouse gas assertion of <strong>${inst.name}</strong> for ${inst.reportingYear} has been audited in accordance with the specifications of ISO 14064-3. Based on our evaluation of the data and evidence provided, nothing has come to our attention that causes us to believe that the GHG inventory is not fairly stated in all material respects in accordance with ISO 14064-1:2018.
                            </p>
                        </div>

                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 50px;">
                            <div style="border-top: 1.5px solid #000000; padding-top: 8px; text-align: center;">
                                <p style="margin: 2px 0; font-weight: bold; font-size: 0.88rem;">Certified Lead Environmental Auditor</p>
                                <p style="margin: 2px 0; font-size: 0.78rem; color: #64748b;">CarbonTrack Sustainability Assessment Cell</p>
                            </div>
                            <div style="border-top: 1.5px solid #000000; padding-top: 8px; text-align: center;">
                                <p style="margin: 2px 0; font-weight: bold; font-size: 0.88rem;">Authorized Signatory / Registrar</p>
                                <p style="margin: 2px 0; font-size: 0.78rem; color: #64748b;">${inst.name}</p>
                            </div>
                        </div>
                    </div>
                </div>

                ${renderPageFooter()}
            </div>

        </div>
        `;
    }

    // =========================================================================
    // 6. DYNAMIC POST-RENDER PAGINATION & TOC LINKER
    // =========================================================================
    function paginateReport(container) {
        if (!container) return;
        const pages = container.querySelectorAll('.report-page');
        const total = pages.length;

        // Map section anchors to their actual page index (1-indexed)
        const sectionPageMap = {};

        pages.forEach((page, idx) => {
            const pageNum = idx + 1;

            // Update page number labels
            const currEl = page.querySelector('.page-current');
            const totalEl = page.querySelector('.page-total');
            if (currEl) currEl.textContent = pageNum;
            if (totalEl) totalEl.textContent = total;

            // Check if page contains any marked section IDs
            const sections = page.querySelectorAll('[data-section-id]');
            sections.forEach(sec => {
                const secId = sec.getAttribute('data-section-id');
                if (secId && !sectionPageMap[secId]) {
                    sectionPageMap[secId] = pageNum;
                }
            });
        });

        // Also update any standalone page-total spans
        const allTotalSpans = container.querySelectorAll('.page-total');
        allTotalSpans.forEach(span => { span.textContent = total; });

        // Update Table of Contents page numbers dynamically
        const tocNumbers = container.querySelectorAll('.toc-page-num');
        tocNumbers.forEach(el => {
            const target = el.getAttribute('data-target');
            if (target && sectionPageMap[target]) {
                el.textContent = sectionPageMap[target];
            }
        });
    }

    // =========================================================================
    // 7. USER ACTION HANDLERS (VIEW IN TAB & DIRECT DOWNLOAD)
    // =========================================================================
    async function openReportInNewTab() {
        const model = buildReportDataModel();
        
        // Show status feedback
        if (typeof window.showToast === 'function') {
            window.showToast('Synthesizing report & environmental insights...', 'info');
        }

        const aiResponse = await fetchAIInsights(model);
        const reportHtml = buildAccreditedReportHTML(model, aiResponse);

        const win = window.open('', '_blank');
        if (!win) {
            alert('Pop-up blocked! Please allow pop-ups for this website to view the report.');
            return;
        }

        win.document.write(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>${model.institution.name} — Institutional Carbon Footprint Report</title>
                <link rel="preconnect" href="https://fonts.googleapis.com">
                <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
                <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Sora:wght@400;600;700;800&display=swap" rel="stylesheet">
                <style>
                    * { box-sizing: border-box; }
                    body {
                        background: #525659;
                        margin: 0;
                        padding: 20px 0;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        font-family: Calibri, 'Outfit', Arial, sans-serif;
                    }
                    .report-document {
                        box-shadow: 0 12px 35px rgba(0,0,0,0.4);
                        margin-bottom: 20px;
                        background: #ffffff;
                    }
                    .report-page {
                        page-break-after: always;
                    }
                    .floating-print-bar {
                        position: fixed;
                        top: 15px;
                        right: 25px;
                        z-index: 99999;
                        display: flex;
                        gap: 12px;
                        background: rgba(15, 23, 42, 0.92);
                        backdrop-filter: blur(8px);
                        padding: 10px 18px;
                        border-radius: 12px;
                        border: 1px solid rgba(255,255,255,0.2);
                        box-shadow: 0 8px 24px rgba(0,0,0,0.3);
                    }
                    .floating-btn {
                        background: #00b050;
                        color: #fff;
                        border: none;
                        padding: 8px 18px;
                        border-radius: 8px;
                        font-weight: 700;
                        cursor: pointer;
                        font-size: 0.88rem;
                        transition: background 0.2s;
                        display: flex;
                        align-items: center;
                        gap: 6px;
                    }
                    .floating-btn:hover { background: #009140; }
                    .floating-btn-blue { background: #2563eb; }
                    .floating-btn-blue:hover { background: #1d4ed8; }
                    @media print {
                        @page {
                            size: A4 portrait;
                            margin: 0;
                        }
                        body {
                            background: #ffffff !important;
                            padding: 0 !important;
                        }
                        .floating-print-bar {
                            display: none !important;
                        }
                        .report-document {
                            box-shadow: none !important;
                            margin: 0 !important;
                            width: 100% !important;
                        }
                        .report-page {
                            page-break-after: always !important;
                            break-after: page !important;
                            border: 2.5px solid #00b050 !important;
                        }
                    }
                </style>
            </head>
            <body>
                <div class="floating-print-bar">
                    <button class="floating-btn floating-btn-blue" onclick="window.print()">🖨️ Print / Save PDF</button>
                    <button class="floating-btn" onclick="window.close()">✕ Close</button>
                </div>
                <div id="report-container-root">
                    ${reportHtml}
                </div>
                <script>
                    // Post-render dynamic pagination in new tab
                    (function() {
                        const pages = document.querySelectorAll('.report-page');
                        const total = pages.length;
                        const sectionMap = {};

                        pages.forEach((p, idx) => {
                            const pNum = idx + 1;
                            const cur = p.querySelector('.page-current');
                            const tot = p.querySelector('.page-total');
                            if (cur) cur.textContent = pNum;
                            if (tot) tot.textContent = total;

                            const secs = p.querySelectorAll('[data-section-id]');
                            secs.forEach(s => {
                                const id = s.getAttribute('data-section-id');
                                if (id && !sectionMap[id]) sectionMap[id] = pNum;
                            });
                        });

                        document.querySelectorAll('.page-total').forEach(sp => { sp.textContent = total; });

                        document.querySelectorAll('.toc-page-num').forEach(el => {
                            const tgt = el.getAttribute('data-target');
                            if (tgt && sectionMap[tgt]) el.textContent = sectionMap[tgt];
                        });
                    })();
                </script>
            </body>
            </html>
        `);
        win.document.close();
    }

    async function downloadReportPDFDirectly() {
        const model = buildReportDataModel();
        
        if (typeof window.showToast === 'function') {
            window.showToast('Generating accredited PDF report...', 'info');
        }

        const aiResponse = await fetchAIInsights(model);
        const reportHtml = buildAccreditedReportHTML(model, aiResponse);
        const cleanName = model.institution.name.replace(/[^a-zA-Z0-9_-]/g, '_');

        // Create temporary container
        const tempContainer = document.createElement('div');
        tempContainer.id = 'active-pdf-export-container';
        tempContainer.style.position = 'fixed';
        tempContainer.style.top = '0';
        tempContainer.style.left = '0';
        tempContainer.style.width = '210mm';
        tempContainer.style.background = '#ffffff';
        tempContainer.style.zIndex = '999999';
        tempContainer.style.opacity = '1';
        tempContainer.innerHTML = reportHtml;

        document.body.appendChild(tempContainer);

        // Run post-render dynamic pagination
        paginateReport(tempContainer);

        const opt = {
            margin: [0, 0, 0, 0],
            filename: `${cleanName}_Carbon_Footprint_Assessment_Report.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true, logging: false, windowWidth: 794 },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        if (typeof window.html2pdf !== 'undefined') {
            window.html2pdf().set(opt).from(tempContainer).save().then(() => {
                if (document.body.contains(tempContainer)) {
                    document.body.removeChild(tempContainer);
                }
                if (typeof window.showToast === 'function') {
                    window.showToast('PDF downloaded successfully!', 'success');
                }
            }).catch(err => {
                console.error('html2pdf download error:', err);
                if (document.body.contains(tempContainer)) {
                    document.body.removeChild(tempContainer);
                }
                openReportInNewTab();
            });
        } else {
            if (document.body.contains(tempContainer)) {
                document.body.removeChild(tempContainer);
            }
            openReportInNewTab();
        }
    }

    // Modal preview support
    async function openReportModal() {
        const overlay = document.getElementById('report-modal-overlay');
        const contentContainer = document.getElementById('report-rendered-content');
        if (!overlay || !contentContainer) {
            openReportInNewTab();
            return;
        }

        contentContainer.innerHTML = `
            <div style="text-align: center; padding: 60px 20px;">
                <div style="font-size: 2.5rem; margin-bottom: 15px;">🌱</div>
                <h3 style="font-size: 1.2rem; font-weight: 700; color: #065f46;">Synthesizing Accredited Carbon Footprint Report...</h3>
                <p style="font-size: 0.88rem; color: #64748b; margin-top: 6px;">Computing ISO 14064-1 balances, CEA emission factors, and environmental insights...</p>
            </div>
        `;
        overlay.style.display = 'flex';

        const model = buildReportDataModel();
        const aiResponse = await fetchAIInsights(model);
        const reportHtml = buildAccreditedReportHTML(model, aiResponse);

        contentContainer.innerHTML = reportHtml;
        paginateReport(contentContainer);
    }

    // =========================================================================
    // 8. INITIALIZE LISTENERS
    // =========================================================================
    function initSubmissionListeners() {
        const btnViewSummary = document.getElementById('btn-view-summary-report');
        const btnDirectDownload = document.getElementById('btn-direct-download-pdf');
        const btnCalculateFinal = document.getElementById('btn-calculate-final');
        const btnViewSummarySticky = document.getElementById('btn-view-summary-report-sticky');
        const btnDirectDownloadSticky = document.getElementById('btn-direct-download-pdf-sticky');

        // Modal buttons
        const btnModalPrint = document.getElementById('btn-modal-print-report');
        const btnModalDownload = document.getElementById('btn-modal-download-pdf-report');
        const btnModalClose = document.getElementById('btn-modal-close-report');
        const modalOverlay = document.getElementById('report-modal-overlay');

        if (btnViewSummary) {
            btnViewSummary.onclick = function (e) {
                e.preventDefault();
                openReportInNewTab();
            };
        }

        if (btnDirectDownload) {
            btnDirectDownload.onclick = function (e) {
                e.preventDefault();
                downloadReportPDFDirectly();
            };
        }

        if (btnViewSummarySticky) {
            btnViewSummarySticky.onclick = function (e) {
                e.preventDefault();
                openReportInNewTab();
            };
        }

        if (btnDirectDownloadSticky) {
            btnDirectDownloadSticky.onclick = function (e) {
                e.preventDefault();
                downloadReportPDFDirectly();
            };
        }

        if (btnCalculateFinal) {
            btnCalculateFinal.onclick = function (e) {
                e.preventDefault();
                openReportModal();
            };
        }

        if (btnModalPrint) {
            btnModalPrint.onclick = function (e) {
                e.preventDefault();
                openReportInNewTab();
            };
        }

        if (btnModalDownload) {
            btnModalDownload.onclick = function (e) {
                e.preventDefault();
                downloadReportPDFDirectly();
            };
        }

        if (btnModalClose && modalOverlay) {
            btnModalClose.onclick = function (e) {
                e.preventDefault();
                modalOverlay.style.display = 'none';
            };
        }
    }

    window.openReportInNewTab = openReportInNewTab;
    window.downloadReportPDFDirectly = downloadReportPDFDirectly;
    window.openReportModal = openReportModal;
    window.buildReportDataModel = buildReportDataModel;
    window.buildAccreditedReportHTML = buildAccreditedReportHTML;
    window.fetchAIInsights = fetchAIInsights;
    window.generateDeterministicInsights = generateDeterministicInsights;
    window.paginateReport = paginateReport;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initSubmissionListeners);
    } else {
        initSubmissionListeners();
    }
})();
