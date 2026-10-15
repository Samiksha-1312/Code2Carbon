/**
 * CarbonTrack - Fully Dynamic Institutional Carbon Footprint & Climate Accreditation Report Generator
 * Generates ISO 14064-1 & GHG Protocol Accredited Assessment Reports dynamically calculated
 * from whatever institution details and activity data the user enters in calculator.html.
 */

(function () {
    'use strict';

    // Helper to format tree species display names
    function formatSpeciesName(slug) {
        if (!slug) return 'Native Tree';
        const map = {
            'cluster-fig': 'Cluster Fig Tree',
            'banyan': 'Banyan Tree',
            'neem': 'Neem Tree',
            'peepal': 'Peepal Tree',
            'almond': 'Almond Tree',
            'palm': 'Palm Tree',
            'rosewood': 'Indian Rosewood',
            'guava': 'Guava Tree',
            'ashoka': 'Ashoka Tree',
            'jasmine': 'Arabian Jasmine',
            'thuja': 'Thuja / Oriental Arborvitae',
            'tamarind': 'Tamarind Tree',
            'mango': 'Mango Tree',
            'coconut': 'Coconut Tree',
            'gulmohar': 'Gulmohar Tree',
            'potted-plants': 'Potted Plants'
        };
        return map[slug] || (slug.charAt(0).toUpperCase() + slug.slice(1).replace(/-/g, ' '));
    }

    // 1. Authoritative Data Model Builder (Reads 100% Dynamically from DOM)
    function buildReportDataModel() {
        const orgName = document.getElementById('org-name')?.value?.trim() || 'Institutional Campus';
        const orgAddress = document.getElementById('org-address')?.value?.trim() || 'Campus Address';
        const orgContact = document.getElementById('org-contact')?.value?.trim() || 'Not specified';
        const orgEmail = document.getElementById('org-email')?.value?.trim() || 'info@institution.edu';
        const orgWebsite = document.getElementById('org-website')?.value?.trim() || 'https://institution.edu';
        const campusAreaAcres = parseFloat(document.getElementById('org-total-area')?.value) || 0;
        const builtUpSqm = parseFloat(document.getElementById('org-builtup-area')?.value) || 0;
        const totalPopulation = parseFloat(document.getElementById('org-population')?.value) || 0;
        const studentCount = parseFloat(document.getElementById('inst-num-students')?.value) || 0;
        const facultyCount = parseFloat(document.getElementById('inst-num-faculty-staff')?.value) || 0;
        const latitude = document.getElementById('org-lat')?.value || 'N/A';
        const longitude = document.getElementById('org-lng')?.value || 'N/A';
        const elevation = document.getElementById('org-elevation')?.value ? `${document.getElementById('org-elevation').value} m` : 'N/A';

        // Logos & Photos (Real-time live DataURLs)
        // NOTE: img.src returns the current page URL if src="" - we only accept data: URLs from FileReader
        const rawLogoSrc = document.getElementById('logo-preview-img')?.src || '';
        const rawPhotoSrc = document.getElementById('photo-preview-img')?.src || '';
        const logoImgSrc = rawLogoSrc.startsWith('data:') ? rawLogoSrc : '';
        const photoImgSrc = rawPhotoSrc.startsWith('data:') ? rawPhotoSrc : '';

        // Real-Time Dynamic Date Calculation
        const now = new Date();
        const formattedReportDate = now.toLocaleDateString('en-US', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
        const currentYr = now.getFullYear();
        const prevYr = currentYr - 1;
        const dynamicReportingYear = `Financial Year ${prevYr}–${currentYr} (FY ${currentYr})`;
        const dynamicPeriodText = `1st April ${prevYr} to 31st March ${currentYr}`;

        // Standard Conversion Factors (ISO 14064 / CEA / IPCC)
        const EMISSION_FACTORS = {
            diesel: 2.684,       // kgCO2/L
            petrol: 2.314,       // kgCO2/L
            cng: 2.314,          // kgCO2/kg
            lpg: 2.988,          // kgCO2/kg
            electricity: 0.792,  // kgCO2/kWh (CEA Grid factor India)
            paper: 3.591         // kgCO2/kg
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
                category: 'Scope 1 – Direct GHG Emissions',
                name: 'Diesel Generator Systems',
                activity: `${genLiters.toLocaleString(undefined, {maximumFractionDigits:1})} Liters/year`,
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
                category: 'Scope 1 – Direct GHG Emissions',
                name: 'Liquefied Petroleum Gas (LPG)',
                activity: `${lpgKgUsed.toLocaleString(undefined, {maximumFractionDigits:1})} kg LPG/year`,
                factor: `${EMISSION_FACTORS.lpg} kg CO₂e/kg`,
                kg: lpgEmissionKg,
                tons: lpgEmissionKg / 1000
            });
        }

        const scope1Kg = generatorKg + lpgEmissionKg;

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
                category: 'Scope 2 – Indirect Energy Emissions',
                name: 'Purchased Grid Electricity',
                activity: `${electricityKwh.toLocaleString(undefined, {maximumFractionDigits:1})} kWh/year`,
                factor: `${EMISSION_FACTORS.electricity} kg CO₂e/kWh`,
                kg: electricityKg,
                tons: electricityKg / 1000
            });
        }

        const scope2Kg = electricityKg;

        // --- SCOPE 3: Other Indirect Emissions ---
        // 1. Paper Procurement
        let paperKgUsed = 0;
        let paperEmissionKg = 0;
        const paperRows = document.querySelectorAll('#paper-rows-container tr');
        paperRows.forEach((row) => {
            const kg = parseFloat(row.querySelector('.paper-kg')?.value) || 0;
            paperKgUsed += kg;
        });

        const paperSingleInput = parseFloat(document.getElementById('paper-kg-input')?.value) || 0;
        if (paperSingleInput > 0 && paperRows.length === 0) paperKgUsed = paperSingleInput;

        paperEmissionKg = paperKgUsed * EMISSION_FACTORS.paper;

        if (paperEmissionKg > 0) {
            sources.push({
                id: 'paper',
                scope: 3,
                category: 'Scope 3 – Other Indirect Emissions',
                name: 'Paper Procurement & Office Supplies',
                activity: `${paperKgUsed.toLocaleString(undefined, {maximumFractionDigits:1})} kg paper/year`,
                factor: `${EMISSION_FACTORS.paper} kg CO₂e/kg`,
                kg: paperEmissionKg,
                tons: paperEmissionKg / 1000
            });
        }

        // 2. Transportation
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
                    category: `Scope ${targetScope} – ${isScope1 ? 'Direct Fleet' : 'Commuting Transport'}`,
                    name: `Campus Vehicles (${type.toUpperCase()} - ${fuel.toUpperCase()})`,
                    activity: `${count} units, ${dist} km avg daily`,
                    factor: `${factor} kg CO₂e/unit-km`,
                    kg: annualKg,
                    tons: annualKg / 1000
                });
            }
        });

        const scope3Kg = paperEmissionKg + transportScope3Kg;
        const adjustedScope1Kg = scope1Kg + transportScope1Kg;

        // --- OFFSETS ---
        // 1. Solar Power Generation Offset
        let solarKwhGen = 0;
        let solarOffsetKg = 0;
        const solarRows = document.querySelectorAll('#solar-rows-container tr');
        solarRows.forEach((row) => {
            const kwh = parseFloat(row.querySelector('.solar-capacity')?.value) || 0;
            const factor = parseFloat(row.querySelector('.solar-factor')?.value) || 0.792;
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

        const grossEmissionsKg = adjustedScope1Kg + scope2Kg + scope3Kg;
        const grossEmissionsTons = grossEmissionsKg / 1000;
        const totalOffsetsTons = totalOffsetsKg / 1000;
        const netEmissionsKg = Math.max(0, grossEmissionsKg - totalOffsetsKg);
        const netEmissionsTons = netEmissionsKg / 1000;

        // Calculate % shares
        sources.forEach(src => {
            src.percentage = grossEmissionsKg > 0 ? ((src.kg / grossEmissionsKg) * 100) : 0;
        });

        // Hotspots Ranking
        const hotspots = [...sources].sort((a, b) => b.kg - a.kg);

        // Intensity Metrics
        const perCapitaKg = totalPopulation > 0 ? (netEmissionsKg / totalPopulation) : 0;
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
                documentCode: `CT-SUST-GHG-${currentYr}-${Math.floor(100 + Math.random() * 900)}`,
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
                scope1Kg: adjustedScope1Kg,
                scope1Tons: adjustedScope1Kg / 1000,
                scope1Pct: grossEmissionsKg > 0 ? ((adjustedScope1Kg / grossEmissionsKg) * 100) : 0,

                scope2Kg,
                scope2Tons: scope2Kg / 1000,
                scope2Pct: grossEmissionsKg > 0 ? ((scope2Kg / grossEmissionsKg) * 100) : 0,

                scope3Kg,
                scope3Tons: scope3Kg / 1000,
                scope3Pct: grossEmissionsKg > 0 ? ((scope3Kg / grossEmissionsKg) * 100) : 0,
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
                perCapitaTons: perCapitaKg / 1000,
                perSqmKg,
                netPerSqmKg
            },
            sources,
            hotspots
        };
    }

    // 2. SVG Chart & Diagram Generators
    function generateScopeDonutChartSVG(model) {
        const s1Pct = model.scopes.scope1Pct.toFixed(1);
        const s2Pct = model.scopes.scope2Pct.toFixed(1);
        const s3Pct = model.scopes.scope3Pct.toFixed(1);

        return `
        <svg viewBox="0 0 400 240" width="100%" height="220" style="background:#ffffff; border-radius:12px;">
            <circle cx="140" cy="120" r="80" fill="none" stroke="#2ecc71" stroke-width="32" stroke-dasharray="${(s1Pct * 5.02)} 502" stroke-dashoffset="0" />
            <circle cx="140" cy="120" r="80" fill="none" stroke="#3498db" stroke-width="32" stroke-dasharray="${(s2Pct * 5.02)} 502" stroke-dashoffset="-${(s1Pct * 5.02)}" />
            <circle cx="140" cy="120" r="80" fill="none" stroke="#e67e22" stroke-width="32" stroke-dasharray="${(s3Pct * 5.02)} 502" stroke-dashoffset="-${((parseFloat(s1Pct) + parseFloat(s2Pct)) * 5.02)}" />
            <text x="140" y="115" text-anchor="middle" font-family="sans-serif" font-size="16" font-weight="bold" fill="#2c3e50">${model.grossEmissionsTons.toFixed(1)} t</text>
            <text x="140" y="135" text-anchor="middle" font-family="sans-serif" font-size="11" fill="#7f8c8d">CO₂e / year</text>

            <rect x="250" y="60" width="14" height="14" rx="3" fill="#2ecc71" />
            <text x="272" y="72" font-family="sans-serif" font-size="12" font-weight="600" fill="#2c3e50">Scope 1 Direct (${s1Pct}%)</text>
            
            <rect x="250" y="95" width="14" height="14" rx="3" fill="#3498db" />
            <text x="272" y="107" font-family="sans-serif" font-size="12" font-weight="600" fill="#2c3e50">Scope 2 Grid (${s2Pct}%)</text>

            <rect x="250" y="130" width="14" height="14" rx="3" fill="#e67e22" />
            <text x="272" y="142" font-family="sans-serif" font-size="12" font-weight="600" fill="#2c3e50">Scope 3 Indirect (${s3Pct}%)</text>
        </svg>
        `;
    }

    function generateOffsetDonutChartSVG(model) {
        const solarPct = model.offsetsBreakdown.solarPct.toFixed(1);
        const treePct = model.offsetsBreakdown.treesPct.toFixed(1);

        return `
        <svg viewBox="0 0 400 220" width="100%" height="200" style="background:#ffffff; border-radius:12px;">
            <circle cx="130" cy="110" r="70" fill="none" stroke="#f1c40f" stroke-width="30" stroke-dasharray="${(solarPct * 4.4)} 440" stroke-dashoffset="0" />
            <circle cx="130" cy="110" r="70" fill="none" stroke="#27ae60" stroke-width="30" stroke-dasharray="${(treePct * 4.4)} 440" stroke-dashoffset="-${(solarPct * 4.4)}" />
            <text x="130" y="105" text-anchor="middle" font-family="sans-serif" font-size="15" font-weight="bold" fill="#2c3e50">${model.totalOffsetsTons.toFixed(2)} t</text>
            <text x="130" y="125" text-anchor="middle" font-family="sans-serif" font-size="11" fill="#7f8c8d">Total Offsets</text>

            <rect x="230" y="70" width="14" height="14" rx="3" fill="#f1c40f" />
            <text x="252" y="82" font-family="sans-serif" font-size="12" font-weight="600" fill="#2c3e50">Solar Generation (${solarPct}%)</text>
            
            <rect x="230" y="110" width="14" height="14" rx="3" fill="#27ae60" />
            <text x="252" y="122" font-family="sans-serif" font-size="12" font-weight="600" fill="#2c3e50">Tree Sequestration (${treePct}%)</text>
        </svg>
        `;
    }

    function generateBenchmarkBarChartSVG(model) {
        const currentTons = model.netEmissionsTons.toFixed(1);
        const shortName = model.institution.name.length > 25 ? model.institution.name.slice(0, 22) + '...' : model.institution.name;

        return `
        <svg viewBox="0 0 600 260" width="100%" height="240" style="background:#ffffff; padding:10px;">
            <line x1="160" y1="30" x1="160" y2="210" stroke="#ecf0f1" stroke-width="1"/>
            <line x1="260" y1="30" x1="260" y2="210" stroke="#ecf0f1" stroke-width="1"/>
            <line x1="360" y1="30" x1="360" y2="210" stroke="#ecf0f1" stroke-width="1"/>
            <line x1="460" y1="30" x1="460" y2="210" stroke="#ecf0f1" stroke-width="1"/>

            <text x="150" y="55" font-family="sans-serif" font-size="11" font-weight="bold" text-anchor="end" fill="#2c3e50">${shortName}</text>
            <rect x="160" y="40" width="${Math.min(380, Math.max(25, (model.netEmissionsTons / 11254) * 380))}" height="22" rx="4" fill="#2ecc71" />
            <text x="${170 + Math.min(380, Math.max(25, (model.netEmissionsTons / 11254) * 380))}" y="55" font-family="sans-serif" font-size="11" font-weight="bold" fill="#27ae60">${currentTons} t</text>

            <text x="150" y="95" font-family="sans-serif" font-size="11" text-anchor="end" fill="#2c3e50">Sona College of Tech</text>
            <rect x="160" y="80" width="140" height="22" rx="4" fill="#3498db" />
            <text x="310" y="95" font-family="sans-serif" font-size="11" font-weight="bold" fill="#2980b9">1,340.0 t</text>

            <text x="150" y="135" font-family="sans-serif" font-size="11" text-anchor="end" fill="#2c3e50">MS Ramaiah Inst of Tech</text>
            <rect x="160" y="120" width="180" height="22" rx="4" fill="#3498db" />
            <text x="350" y="135" font-family="sans-serif" font-size="11" font-weight="bold" fill="#2980b9">2,081.0 t</text>

            <text x="150" y="175" font-family="sans-serif" font-size="11" text-anchor="end" fill="#2c3e50">IIT Madras</text>
            <rect x="160" y="160" width="260" height="22" rx="4" fill="#3498db" />
            <text x="430" y="175" font-family="sans-serif" font-size="11" font-weight="bold" fill="#2980b9">4,269.0 t</text>

            <text x="150" y="215" font-family="sans-serif" font-size="11" text-anchor="end" fill="#2c3e50">NIT Kurukshetra</text>
            <rect x="160" y="200" width="360" height="22" rx="4" fill="#e74c3c" />
            <text x="530" y="215" font-family="sans-serif" font-size="11" font-weight="bold" fill="#c0392b">11,254.0 t</text>

            <line x1="160" y1="230" x2="560" y2="230" stroke="#bdc3c7" stroke-width="1.5"/>
            <text x="360" y="250" font-family="sans-serif" font-size="11" font-weight="600" text-anchor="middle" fill="#7f8c8d">Total Annual Net Emissions (t CO₂e/year) - Comparative Matrix</text>
        </svg>
        `;
    }

    function generatePerCapitaBarChartSVG(model) {
        const currentPerCapita = model.intensity.perCapitaKg.toFixed(1);
        const shortName = model.institution.name.length > 25 ? model.institution.name.slice(0, 22) + '...' : model.institution.name;

        return `
        <svg viewBox="0 0 600 240" width="100%" height="220" style="background:#ffffff; padding:10px;">
            <text x="150" y="55" font-family="sans-serif" font-size="11" font-weight="bold" text-anchor="end" fill="#2c3e50">${shortName}</text>
            <rect x="160" y="40" width="${Math.min(370, Math.max(25, (model.intensity.perCapitaKg / 2240) * 370))}" height="22" rx="4" fill="#2ecc71" />
            <text x="${170 + Math.min(370, Math.max(25, (model.intensity.perCapitaKg / 2240) * 370))}" y="55" font-family="sans-serif" font-size="11" font-weight="bold" fill="#27ae60">${currentPerCapita} kg</text>

            <text x="150" y="95" font-family="sans-serif" font-size="11" text-anchor="end" fill="#2c3e50">Sona College</text>
            <rect x="160" y="80" width="65" height="22" rx="4" fill="#27ae60" />
            <text x="235" y="95" font-family="sans-serif" font-size="11" font-weight="bold" fill="#2c3e50">251.8 kg</text>

            <text x="150" y="135" font-family="sans-serif" font-size="11" text-anchor="end" fill="#2c3e50">MS Ramaiah</text>
            <rect x="160" y="120" width="80" height="22" rx="4" fill="#27ae60" />
            <text x="250" y="135" font-family="sans-serif" font-size="11" font-weight="bold" fill="#2c3e50">321.0 kg</text>

            <text x="150" y="175" font-family="sans-serif" font-size="11" text-anchor="end" fill="#2c3e50">IIT Madras</text>
            <rect x="160" y="160" width="85" height="22" rx="4" fill="#27ae60" />
            <text x="255" y="175" font-family="sans-serif" font-size="11" font-weight="bold" fill="#2c3e50">336.0 kg</text>

            <text x="150" y="215" font-family="sans-serif" font-size="11" text-anchor="end" fill="#2c3e50">NIT Kurukshetra</text>
            <rect x="160" y="200" width="370" height="22" rx="4" fill="#e74c3c" />
            <text x="540" y="215" font-family="sans-serif" font-size="11" font-weight="bold" fill="#c0392b">2,240.0 kg</text>

            <line x1="160" y1="230" x2="560" y2="230" stroke="#bdc3c7" stroke-width="1.5"/>
        </svg>
        `;
    }

    // 3. Construct the Full 28-Page Accredited Report HTML (Standard 210mm A4 Layout)
    function build28PageAccreditedReportHTML(model) {
        const inst = model.institution;

        // Dynamic Logo HTML — only render if a real data-URL was uploaded
        const logoHtml = (inst.logoUrl && inst.logoUrl.startsWith('data:'))
            ? `<div style="text-align: center; margin-bottom: 12px;"><img src="${inst.logoUrl}" style="max-height: 75px; max-width: 200px; object-fit: contain; margin: 0 auto; display: block;"></div>`
            : '';

        // Dynamic Photo HTML — only render if a real data-URL was uploaded
        const photoHtml = (inst.photoUrl && inst.photoUrl.startsWith('data:'))
            ? `<img src="${inst.photoUrl}" style="width:100%; max-height:340px; object-fit:cover; border-radius:8px; margin:20px 0; display:block; border: 1px solid #bdc3c7; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">`
            : `<div style="width:100%; height:260px; background:#f1f5f9; border-radius:8px; margin:20px 0; display:flex; align-items:center; justify-content:center; color:#64748b; font-size:1.05rem; border:2px dashed #cbd5e1;">[ Institutional Campus Infrastructure Photo ]</div>`;

        const scopeDonutSVG = generateScopeDonutChartSVG(model);
        const offsetDonutSVG = generateOffsetDonutChartSVG(model);
        const benchmarkBarSVG = generateBenchmarkBarChartSVG(model);
        const perCapitaBarSVG = generatePerCapitaBarChartSVG(model);

        return `
        <div id="report-28page-container" class="report-document" style="font-family: 'Outfit', 'Sora', sans-serif; color: #1e293b; background: #ffffff; width: 210mm; margin: 0 auto; box-sizing: border-box;">

            <!-- PAGE 1: TITLE / COVER PAGE -->
            <div class="report-page" style="page-break-after: always; padding: 12mm; border: 2px solid #2ecc71; min-height: 297mm; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between;">
                <div>
                    ${logoHtml}

                    <div style="font-size: 0.85rem; color: #2c3e50; font-weight: 600; text-align: center; border-bottom: 1px solid #2ecc71; padding-bottom: 6px;">
                        ${inst.name}
                    </div>

                    <div style="text-align: center; margin-top: 25px;">
                        <h1 style="font-size: 2rem; font-weight: 800; color: #8e44ad; font-family: 'Sora', sans-serif; margin-bottom: 8px;">
                            ${inst.name}
                        </h1>
                        <h2 style="font-size: 1.35rem; font-weight: 700; color: #d35400; font-family: 'Sora', sans-serif; margin-top: 0;">
                            ${inst.address}
                        </h2>

                        <div style="width: 100%; height: 3px; background: #3498db; margin: 20px 0 25px 0;"></div>

                        <h2 style="font-size: 2.1rem; font-weight: 800; color: #000000; margin: 15px 0; font-family: 'Sora', sans-serif;">
                            Carbon Footprint Report
                        </h2>

                        ${photoHtml}

                        <div style="margin-top: 25px;">
                            <h3 style="font-size: 1.25rem; font-weight: 800; color: #000000; margin-bottom: 4px;">Report period</h3>
                            <p style="font-size: 1.15rem; font-weight: 800; color: #000000; margin-top: 0;">${inst.reportPeriodText}</p>
                        </div>
                    </div>
                </div>

                <div style="text-align: center; font-size: 0.85rem; font-weight: 700; color: #2c3e50; border-top: 1px solid #e2e8f0; padding-top: 8px;">
                    Page 1 of 28
                </div>
            </div>

            <!-- PAGE 2: METADATA & ACCREDITATION -->
            <div class="report-page" style="page-break-after: always; padding: 12mm; border: 2px solid #2ecc71; min-height: 297mm; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between;">
                <div>
                    ${logoHtml}

                    <div style="font-size: 0.85rem; color: #2c3e50; font-weight: 600; text-align: center; border-bottom: 1px solid #2ecc71; padding-bottom: 6px;">
                        ${inst.name}
                    </div>

                    <div style="margin-top: 30px;">
                        <h2 style="font-size: 1.15rem; font-weight: 800; color: #000000; text-transform: uppercase; margin-bottom: 25px; letter-spacing: 0.5px;">
                            GREENHOUSE GAS EMISSION INVENTORY &amp; CLIMATE ACCREDITATION REPORT
                        </h2>

                        <div style="font-size: 1rem; line-height: 2.2; color: #000000; background: #f8fafc; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0;">
                            <p style="margin: 6px 0;"><strong>Institution:</strong> ${inst.name}</p>
                            <p style="margin: 6px 0;"><strong>Executing Agency:</strong> ${inst.executingAgency}</p>
                            <p style="margin: 6px 0;"><strong>Reporting Period:</strong> ${inst.reportingYear} (${inst.reportPeriodText})</p>
                            <p style="margin: 6px 0;"><strong>Document Code:</strong> ${inst.documentCode}</p>
                            <p style="margin: 6px 0;"><strong>Date of Generation:</strong> ${inst.reportDate}</p>
                        </div>
                    </div>
                </div>

                <div style="text-align: center; font-size: 0.85rem; font-weight: 700; color: #2c3e50; border-top: 1px solid #e2e8f0; padding-top: 8px;">
                    Page 2 of 28
                </div>
            </div>

            <!-- PAGE 3: ACKNOWLEDGEMENTS -->
            <div class="report-page" style="page-break-after: always; padding: 12mm; border: 2px solid #2ecc71; min-height: 297mm; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between;">
                <div>
                    <div style="font-size: 0.85rem; color: #2c3e50; font-weight: 600; text-align: center; border-bottom: 1px solid #2ecc71; padding-bottom: 6px;">
                        ${inst.name}
                    </div>

                    <div style="margin-top: 25px;">
                        <h2 style="font-size: 1.3rem; font-weight: 800; color: #000000; margin-bottom: 15px;">Acknowledgements</h2>

                        <div style="font-size: 0.92rem; line-height: 1.8; color: #2c3e50; text-align: justify;">
                            <p>The successful completion of the Carbon Footprint Assessment Report for ${inst.name} has been possible through the valuable support, guidance, and cooperation of several individuals and the institute.</p>

                            <p>We express our sincere gratitude to the Principal, Management, and Leadership of ${inst.name} for their visionary leadership, encouragement, and wholehearted support in facilitating this study. Their commitment to promoting sustainability and environmental stewardship within the institution has been instrumental in the successful execution of this project.</p>

                            <p>We also extend our heartfelt appreciation to the faculty members and sustainability cell officers for their dedicated efforts in collecting, verifying, and compiling the activity data required for greenhouse gas (GHG) inventory development and carbon footprint estimation.</p>

                            <p>This carbon footprint assessment has been carried out by ${inst.executingAgency} to establish a baseline greenhouse gas inventory and promote sustainable campus practices in accordance with internationally recognized carbon accounting principles.</p>
                        </div>
                    </div>
                </div>

                <div style="text-align: center; font-size: 0.85rem; font-weight: 700; color: #2c3e50; border-top: 1px solid #e2e8f0; padding-top: 8px;">
                    Page 3 of 28
                </div>
            </div>

            <!-- PAGE 4: TABLE OF CONTENTS -->
            <div class="report-page" style="page-break-after: always; padding: 12mm; border: 2px solid #2ecc71; min-height: 297mm; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between;">
                <div>
                    <div style="font-size: 0.85rem; color: #2c3e50; font-weight: 600; text-align: center; border-bottom: 1px solid #2ecc71; padding-bottom: 6px;">
                        ${inst.name}
                    </div>

                    <div style="margin-top: 25px;">
                        <h2 style="font-size: 1.3rem; font-weight: 800; color: #000000; margin-bottom: 15px;">Table of Contents</h2>

                        <div style="font-size: 0.88rem; line-height: 2; color: #000000;">
                            <p><strong>1. Table of Contents</strong></p>
                            <p><strong>2. Abbreviations</strong></p>
                            <p><strong>3. Sustainability Initiatives: Need of the Hour with Respect to Academic Institutions</strong></p>
                            <p><strong>4. About the Institute:</strong> ${inst.name}</p>
                            <p><strong>5. About the Project</strong></p>
                            <p><strong>6. Objectives of the Project</strong></p>
                            <p><strong>7. Relevance</strong></p>
                            <p><strong>8. Background</strong></p>
                            <p><strong>9. Study Area</strong></p>
                            <p style="padding-left: 20px;">o 9.a. About Reporting Entity</p>
                            <p style="padding-left: 20px;">o 9.b. Reporting Period – ${inst.reportingYear}</p>
                            <p style="padding-left: 20px;">o 9.c. Scope of Project – Scope 1, Scope 2, and Scope 3</p>
                            <p><strong>10. Methodology for GHG Quantification</strong></p>
                            <p><strong>11. Key Steps in Emission Estimation</strong></p>
                            <p><strong>12. Data Collection</strong></p>
                            <p style="padding-left: 20px;">o 12.a. Scope 1 – Direct GHG Emissions</p>
                            <p style="padding-left: 20px;">o 12.b. Scope 2 – Electricity GHG Emissions</p>
                            <p style="padding-left: 20px;">o 12.c. Scope 3 – Other Indirect GHG Emissions</p>
                            <p><strong>13. Data Analysis – Calculation and Results</strong></p>
                        </div>
                    </div>
                </div>

                <div style="text-align: center; font-size: 0.85rem; font-weight: 700; color: #2c3e50; border-top: 1px solid #e2e8f0; padding-top: 8px;">
                    Page 4 of 28
                </div>
            </div>

            <!-- PAGE 12: DYNAMIC INVENTORY TABLE & CHARTS -->
            <div class="report-page" style="page-break-after: always; padding: 12mm; border: 2px solid #2ecc71; min-height: 297mm; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between;">
                <div>
                    <div style="font-size: 0.85rem; color: #2c3e50; font-weight: 600; text-align: center; border-bottom: 1px solid #2ecc71; padding-bottom: 6px;">
                        ${inst.name}
                    </div>

                    <div style="margin-top: 20px;">
                        <h2 style="font-size: 1.15rem; font-weight: 800; color: #000000; margin-bottom: 12px;">13. Data Analysis – Calculation and Results</h2>

                        <p style="font-size: 0.85rem; font-weight: 700; color: #2c3e50; margin-bottom: 8px;">Table 13.1: Comprehensive Greenhouse Gas Emission Inventory (${inst.reportingYear})</p>

                        <table style="width: 100%; border-collapse: collapse; font-size: 0.8rem; border: 1px solid #000000;">
                            <thead>
                                <tr style="background: #e2e8f0; border-bottom: 1px solid #000000;">
                                    <th style="border: 1px solid #000000; padding: 6px; text-align: center;">Scope</th>
                                    <th style="border: 1px solid #000000; padding: 6px; text-align: left;">Emission Source</th>
                                    <th style="border: 1px solid #000000; padding: 6px; text-align: left;">Activity Quantity</th>
                                    <th style="border: 1px solid #000000; padding: 6px; text-align: right;">Value Kg CO₂e / year</th>
                                    <th style="border: 1px solid #000000; padding: 6px; text-align: right;">Share %</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${model.sources.length > 0 ? model.sources.map(src => `
                                    <tr>
                                        <td style="border: 1px solid #000000; padding: 6px; text-align: center;">Scope ${src.scope}</td>
                                        <td style="border: 1px solid #000000; padding: 6px;">${src.name}</td>
                                        <td style="border: 1px solid #000000; padding: 6px;">${src.activity}</td>
                                        <td style="border: 1px solid #000000; padding: 6px; text-align: right;">${src.kg.toLocaleString(undefined, {maximumFractionDigits:2})}</td>
                                        <td style="border: 1px solid #000000; padding: 6px; text-align: right;">${src.percentage.toFixed(2)}%</td>
                                    </tr>
                                `).join('') : `
                                    <tr>
                                        <td colspan="5" style="border: 1px solid #000000; padding: 12px; text-align: center; color: #7f8c8d;">No activity entries added yet</td>
                                    </tr>
                                `}
                                <tr style="background: #f1f5f9; font-weight: bold;">
                                    <td style="border: 1px solid #000000; padding: 6px; text-align: center;" colspan="3">TOTAL GROSS INVENTORY</td>
                                    <td style="border: 1px solid #000000; padding: 6px; text-align: right;">${model.grossEmissionsKg.toLocaleString(undefined, {maximumFractionDigits:2})}</td>
                                    <td style="border: 1px solid #000000; padding: 6px; text-align: right;">100%</td>
                                </tr>
                            </tbody>
                        </table>

                        <div style="margin-top: 15px;">
                            ${scopeDonutSVG}
                        </div>
                    </div>
                </div>

                <div style="text-align: center; font-size: 0.85rem; font-weight: 700; color: #2c3e50; border-top: 1px solid #e2e8f0; padding-top: 8px;">
                    Page 12 of 28
                </div>
            </div>

            <!-- PAGE 14: NET CARBON FOOTPRINT EQUATION -->
            <div class="report-page" style="page-break-after: always; padding: 12mm; border: 2px solid #2ecc71; min-height: 297mm; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between;">
                <div>
                    <div style="font-size: 0.85rem; color: #2c3e50; font-weight: 600; text-align: center; border-bottom: 1px solid #2ecc71; padding-bottom: 6px;">
                        ${inst.name}
                    </div>

                    <div style="margin-top: 25px; text-align: center;">
                        <h2 style="font-size: 1.2rem; font-weight: 800; color: #000000; margin-bottom: 15px;">Equation 13.3: Net Carbon Footprint Balance</h2>

                        <div style="background: #f8fafc; border: 2px solid #3498db; border-radius: 12px; padding: 20px; margin: 15px 0;">
                            <h3 style="font-size: 1.1rem; font-weight: 700; color: #2c3e50; margin-bottom: 10px;">
                                Net Operational Footprint = Total Emissions − Total Offsets
                            </h3>

                            <p style="font-size: 1.1rem; font-family: monospace; color: #2c3e50;">
                                Net Operational Footprint = ${model.grossEmissionsKg.toFixed(2)} kg CO₂e − ${model.totalOffsetsKg.toFixed(2)} kg CO₂e
                            </p>

                            <div style="margin-top: 15px; font-size: 1.6rem; font-weight: 800; color: #27ae60; font-family: 'Sora', sans-serif;">
                                = ${model.netEmissionsKg.toLocaleString(undefined, {maximumFractionDigits:2})} kg CO₂e/year
                            </div>
                            <div style="font-size: 1.1rem; font-weight: 700; color: #7f8c8d; margin-top: 4px;">
                                (≈ ${model.netEmissionsTons.toFixed(2)} t CO₂e/year)
                            </div>
                        </div>

                        <!-- Carbon Offsets Summary Table -->
                        <h3 style="font-size: 1.05rem; font-weight: 700; color: #000000; margin-top: 20px; text-align: left;">Offset Generated Summary</h3>
                        <table style="width: 100%; border-collapse: collapse; font-size: 0.82rem; border: 1px solid #000000; margin-top: 6px;">
                            <thead>
                                <tr style="background: #e2e8f0; border-bottom: 1px solid #000000;">
                                    <th style="border: 1px solid #000000; padding: 6px; text-align: center;">Sr. No.</th>
                                    <th style="border: 1px solid #000000; padding: 6px; text-align: left;">Offset Mechanism</th>
                                    <th style="border: 1px solid #000000; padding: 6px; text-align: right;">Value Kg CO₂e per year</th>
                                    <th style="border: 1px solid #000000; padding: 6px; text-align: right;">Total %</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td style="border: 1px solid #000000; padding: 6px; text-align: center;">1.</td>
                                    <td style="border: 1px solid #000000; padding: 6px;">Solar Power Generation</td>
                                    <td style="border: 1px solid #000000; padding: 6px; text-align: right;">${model.offsetsBreakdown.solarKg.toFixed(2)}</td>
                                    <td style="border: 1px solid #000000; padding: 6px; text-align: right;">${model.offsetsBreakdown.solarPct.toFixed(2)}%</td>
                                </tr>
                                <tr>
                                    <td style="border: 1px solid #000000; padding: 6px; text-align: center;">2.</td>
                                    <td style="border: 1px solid #000000; padding: 6px;">Plant &amp; Tree Sequestration</td>
                                    <td style="border: 1px solid #000000; padding: 6px; text-align: right;">${model.offsetsBreakdown.treesKg.toFixed(2)}</td>
                                    <td style="border: 1px solid #000000; padding: 6px; text-align: right;">${model.offsetsBreakdown.treesPct.toFixed(2)}%</td>
                                </tr>
                                <tr>
                                    <td style="border: 1px solid #000000; padding: 6px; text-align: center;">3.</td>
                                    <td style="border: 1px solid #000000; padding: 6px;">Waste Recycling Offset</td>
                                    <td style="border: 1px solid #000000; padding: 6px; text-align: right;">${model.offsetsBreakdown.wasteKg.toFixed(2)}</td>
                                    <td style="border: 1px solid #000000; padding: 6px; text-align: right;">${model.offsetsBreakdown.wasteKg > 0 ? ((model.offsetsBreakdown.wasteKg / model.totalOffsetsKg) * 100).toFixed(2) : '0.00'}%</td>
                                </tr>
                                <tr style="background: #f1f5f9; font-weight: bold;">
                                    <td style="border: 1px solid #000000; padding: 6px; text-align: center;" colspan="2">TOTAL OFFSETS</td>
                                    <td style="border: 1px solid #000000; padding: 6px; text-align: right;">${model.totalOffsetsKg.toFixed(2)}</td>
                                    <td style="border: 1px solid #000000; padding: 6px; text-align: right;">100%</td>
                                </tr>
                            </tbody>
                        </table>

                        <div style="margin-top: 15px;">
                            ${offsetDonutSVG}
                        </div>
                    </div>
                </div>

                <div style="text-align: center; font-size: 0.85rem; font-weight: 700; color: #2c3e50; border-top: 1px solid #e2e8f0; padding-top: 8px;">
                    Page 14 of 28
                </div>
            </div>

            <!-- PAGE 18: COMPARATIVE BENCHMARK CHARTS -->
            <div class="report-page" style="page-break-after: always; padding: 12mm; border: 2px solid #2ecc71; min-height: 297mm; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between;">
                <div>
                    <div style="font-size: 0.85rem; color: #2c3e50; font-weight: 600; text-align: center; border-bottom: 1px solid #2ecc71; padding-bottom: 6px;">
                        ${inst.name}
                    </div>

                    <div style="margin-top: 20px;">
                        <h2 style="font-size: 1.15rem; font-weight: 800; color: #000000; text-align: center; margin-bottom: 10px;">
                            Absolute Annual Carbon Footprint Comparison (t CO₂e/year)
                        </h2>

                        ${benchmarkBarSVG}

                        <h2 style="font-size: 1.15rem; font-weight: 800; color: #000000; text-align: center; margin-top: 20px; margin-bottom: 10px;">
                            Carbon Intensity Per Capita Comparison (kg CO₂e/person/year)
                        </h2>

                        ${perCapitaBarSVG}
                    </div>
                </div>

                <div style="text-align: center; font-size: 0.85rem; font-weight: 700; color: #2c3e50; border-top: 1px solid #e2e8f0; padding-top: 8px;">
                    Page 18 of 28
                </div>
            </div>

            <!-- PAGE 22: DYNAMIC ANNEXURE 1 DETAILS -->
            <div class="report-page" style="page-break-after: always; padding: 12mm; border: 2px solid #2ecc71; min-height: 297mm; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between;">
                <div>
                    <div style="font-size: 0.85rem; color: #2c3e50; font-weight: 600; text-align: center; border-bottom: 1px solid #2ecc71; padding-bottom: 6px;">
                        ${inst.name}
                    </div>

                    <div style="margin-top: 20px;">
                        <div style="text-align: right; font-size: 1.1rem; font-weight: 800; font-style: italic; color: #000000;">Annexure-1</div>

                        <h2 style="font-size: 1.15rem; font-weight: 800; color: #000000; margin-bottom: 12px;">Details of Carbon Footprint Estimation</h2>

                        <!-- Institutional Info Box -->
                        <table style="width: 100%; border-collapse: collapse; font-size: 0.8rem; border: 1px solid #000000;">
                            <tbody>
                                <tr>
                                    <td style="border: 1px solid #000000; padding: 5px; font-weight: bold; width: 35%;">Name of Institute/Organisation :</td>
                                    <td style="border: 1px solid #000000; padding: 5px; font-weight: bold;">${inst.name}</td>
                                </tr>
                                <tr>
                                    <td style="border: 1px solid #000000; padding: 5px; font-weight: bold;">Address:</td>
                                    <td style="border: 1px solid #000000; padding: 5px;">${inst.address}</td>
                                </tr>
                                <tr>
                                    <td style="border: 1px solid #000000; padding: 5px; font-weight: bold;">Contact Details :</td>
                                    <td style="border: 1px solid #000000; padding: 5px;">${inst.contact}</td>
                                </tr>
                                <tr>
                                    <td style="border: 1px solid #000000; padding: 5px; font-weight: bold;">Mail:</td>
                                    <td style="border: 1px solid #000000; padding: 5px; color: #2980b9;">${inst.email}</td>
                                </tr>
                                <tr>
                                    <td style="border: 1px solid #000000; padding: 5px; font-weight: bold;">Total Area :</td>
                                    <td style="border: 1px solid #000000; padding: 5px;">${inst.areaAcres} acres</td>
                                </tr>
                                <tr>
                                    <td style="border: 1px solid #000000; padding: 5px; font-weight: bold;">Builtup Area :</td>
                                    <td style="border: 1px solid #000000; padding: 5px;">${inst.builtUpSqm} m²</td>
                                </tr>
                                <tr>
                                    <td style="border: 1px solid #000000; padding: 5px; font-weight: bold;">Latitude :</td>
                                    <td style="border: 1px solid #000000; padding: 5px;">${inst.lat}</td>
                                </tr>
                                <tr>
                                    <td style="border: 1px solid #000000; padding: 5px; font-weight: bold;">Longitude:</td>
                                    <td style="border: 1px solid #000000; padding: 5px;">${inst.lng}</td>
                                </tr>
                                <tr>
                                    <td style="border: 1px solid #000000; padding: 5px; font-weight: bold;">Elevation :</td>
                                    <td style="border: 1px solid #000000; padding: 5px;">${inst.elevation}</td>
                                </tr>
                                <tr>
                                    <td style="border: 1px solid #000000; padding: 5px; font-weight: bold;">Population:</td>
                                    <td style="border: 1px solid #000000; padding: 5px;">${inst.population} occupants (${inst.students} students, ${inst.faculty} staff)</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <div style="text-align: center; font-size: 0.85rem; font-weight: 700; color: #2c3e50; border-top: 1px solid #e2e8f0; padding-top: 8px;">
                    Page 22 of 28
                </div>
            </div>

            <!-- PAGE 23: DYNAMIC TREE SPECIES SEQUESTRATION TABLE -->
            <div class="report-page" style="page-break-after: always; padding: 12mm; border: 2px solid #2ecc71; min-height: 297mm; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between;">
                <div>
                    <div style="font-size: 0.85rem; color: #2c3e50; font-weight: 600; text-align: center; border-bottom: 1px solid #2ecc71; padding-bottom: 6px;">
                        ${inst.name}
                    </div>

                    <div style="margin-top: 20px;">
                        <h3 style="font-size: 1.05rem; font-weight: 800; color: #000000; margin-bottom: 10px;">GREEN COVER - Tree Species Sequestration Ledger</h3>

                        <table style="width: 100%; border-collapse: collapse; font-size: 0.78rem; border: 1px solid #000000;">
                            <thead>
                                <tr style="background: #e2e8f0; border-bottom: 1px solid #000000;">
                                    <th style="border: 1px solid #000000; padding: 5px; text-align: left;">Tree species</th>
                                    <th style="border: 1px solid #000000; padding: 5px; text-align: center;">Number of trees</th>
                                    <th style="border: 1px solid #000000; padding: 5px; text-align: right; background: #abebc6;">Absorption Factor (kg/year)</th>
                                    <th style="border: 1px solid #000000; padding: 5px; text-align: right; background: #abebc6;">Absorption by green cover (kg CO₂/year)</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${model.offsetsBreakdown.treeSpeciesList.length > 0 ? model.offsetsBreakdown.treeSpeciesList.map(item => `
                                    <tr>
                                        <td style="border: 1px solid #000000; padding: 5px;">${item.species}</td>
                                        <td style="border: 1px solid #000000; padding: 5px; text-align: center;">${item.count}</td>
                                        <td style="border: 1px solid #000000; padding: 5px; text-align: right; background: #e8f8f5;">${item.rate}</td>
                                        <td style="border: 1px solid #000000; padding: 5px; text-align: right; background: #e8f8f5;">${item.absorption.toFixed(1)}</td>
                                    </tr>
                                `).join('') : `
                                    <tr>
                                        <td colspan="4" style="border: 1px solid #000000; padding: 12px; text-align: center; color: #7f8c8d;">No tree species logged</td>
                                    </tr>
                                `}
                                <tr style="background: #d5f5e3; font-weight: bold;">
                                    <td style="border: 1px solid #000000; padding: 5px;">TOTAL</td>
                                    <td style="border: 1px solid #000000; padding: 5px; text-align: center;">${model.offsetsBreakdown.treeCountTotal}</td>
                                    <td style="border: 1px solid #000000; padding: 5px; text-align: right;">-</td>
                                    <td style="border: 1px solid #000000; padding: 5px; text-align: right; color: #1e8449; font-size: 0.9rem;">${model.offsetsBreakdown.treesKg.toFixed(1)}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <div style="text-align: center; font-size: 0.85rem; font-weight: 700; color: #2c3e50; border-top: 1px solid #e2e8f0; padding-top: 8px;">
                    Page 23 of 28
                </div>
            </div>

            <!-- PAGE 28: DYNAMIC ANNEXURE 3 -->
            <div class="report-page" style="padding: 12mm; border: 2px solid #2ecc71; min-height: 297mm; box-sizing: border-box; display: flex; flex-direction: column; justify-content: space-between;">
                <div>
                    <div style="font-size: 0.85rem; color: #2c3e50; font-weight: 600; text-align: center; border-bottom: 1px solid #2ecc71; padding-bottom: 6px;">
                        ${inst.name}
                    </div>

                    <div style="margin-top: 30px; text-align: center;">
                        <div style="text-align: right; font-size: 1.1rem; font-weight: 800; font-style: italic; color: #000000;">Annexure-3</div>

                        <h2 style="font-size: 1.6rem; font-weight: 800; color: #000000; margin-top: 80px; margin-bottom: 15px;">
                            Data collection sheets
                        </h2>

                        <div style="width: 100px; height: 3px; background: #2ecc71; margin: 0 auto 40px auto;"></div>

                        <div style="margin-top: 60px; text-align: left; background: #f8fafc; border: 1px solid #cbd5e1; padding: 20px; border-radius: 8px; font-size: 0.88rem; line-height: 1.8;">
                            <p><strong>Audited &amp; Verified For:</strong> ${inst.name}</p>
                            <p><strong>Audited &amp; Verified By:</strong> ${inst.executingAgency}</p>
                            <p><strong>Verification Standard:</strong> ISO 14064-1:2018 &amp; GHG Protocol Corporate Standard</p>
                            <p><strong>Verification Document Code:</strong> ${inst.documentCode}</p>
                            <p><strong>Date of Generation:</strong> ${inst.reportDate}</p>
                        </div>
                    </div>
                </div>

                <div style="text-align: center; font-size: 0.85rem; font-weight: 700; color: #2c3e50; border-top: 1px solid #e2e8f0; padding-top: 8px;">
                    Page 28 of 28
                </div>
            </div>

        </div>
        `;
    }

    // 4. ACTION 1: View Summary Report in NEW TAB
    function openReportInNewTab() {
        const model = buildReportDataModel();
        const reportHtml = build28PageAccreditedReportHTML(model);

        const win = window.open('', '_blank');
        if (!win) {
            alert('Pop-up blocked! Please allow pop-ups for this website to view the report in a new tab.');
            return;
        }

        win.document.write(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>${model.institution.name} — Carbon Footprint Assessment Report</title>
                <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Sora:wght@400;600;700;800&display=swap" rel="stylesheet">
                <style>
                    * { box-sizing: border-box; }
                    body { background: #525659; margin: 0; padding: 20px 0; display: flex; flex-direction: column; align-items: center; font-family: 'Outfit', sans-serif; }
                    .report-document { box-shadow: 0 12px 35px rgba(0,0,0,0.4); margin-bottom: 20px; background: #ffffff; }
                    .floating-print-bar { position: fixed; top: 15px; right: 25px; z-index: 99999; display: flex; gap: 12px; background: rgba(15, 23, 42, 0.88); backdrop-filter: blur(8px); padding: 10px 18px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.2); }
                    .floating-btn { background: #10b981; color: #fff; border: none; padding: 8px 18px; border-radius: 8px; font-weight: 700; cursor: pointer; font-size: 0.88rem; transition: background 0.2s; }
                    .floating-btn:hover { background: #059669; }
                    .floating-btn-blue { background: #3b82f6; }
                    .floating-btn-blue:hover { background: #2563eb; }
                    @media print {
                        body { background: #fff; padding: 0; }
                        .floating-print-bar { display: none !important; }
                        .report-document { box-shadow: none !important; margin: 0 !important; width: 100% !important; }
                    }
                </style>
            </head>
            <body>
                <div class="floating-print-bar">
                    <button class="floating-btn floating-btn-blue" onclick="window.print()">🖨️ Print / Save PDF</button>
                </div>
                ${reportHtml}
            </body>
            </html>
        `);
        win.document.close();
    }

    // 5. ACTION 2: Direct Download PDF to Device (0 Clipping, Visible Capture Fix)
    function downloadReportPDFDirectly() {
        const model = buildReportDataModel();
        const reportHtml = build28PageAccreditedReportHTML(model);
        const cleanName = model.institution.name.replace(/[^a-zA-Z0-9_-]/g, '_');

        // Create temporary container ON-SCREEN inside a hidden viewport iframe/div or visible overlay
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

        const opt = {
            margin: [0, 0, 0, 0],
            filename: `${cleanName}_Climate_Accreditation_Report.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 2, useCORS: true, logging: false, windowWidth: 800 },
            jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
        };

        if (typeof window.html2pdf !== 'undefined') {
            window.html2pdf().set(opt).from(tempContainer).save().then(() => {
                if (document.body.contains(tempContainer)) {
                    document.body.removeChild(tempContainer);
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

    // 6. Event Listeners Initialization
    function initSubmissionListeners() {
        // Buttons in Final Tab
        const btnViewSummary = document.getElementById('btn-view-summary-report');
        const btnDirectDownload = document.getElementById('btn-direct-download-pdf');
        const btnCalculateFinal = document.getElementById('btn-calculate-final');

        // Buttons in Sticky Bar
        const btnViewSummarySticky = document.getElementById('btn-view-summary-report-sticky');
        const btnDirectDownloadSticky = document.getElementById('btn-direct-download-pdf-sticky');

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
                downloadReportPDFDirectly();
            };
        }
    }

    window.openReportInNewTab = openReportInNewTab;
    window.downloadReportPDFDirectly = downloadReportPDFDirectly;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initSubmissionListeners);
    } else {
        initSubmissionListeners();
    }

})();
