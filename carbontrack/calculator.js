/* ==========================================================================
   CarbonTrack Detailed Calculator Script
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {

    // Configure your Supabase Credentials here
    const SUPABASE_URL = "https://ifwnhzjfwluqjhsfykbw.supabase.co";
    const SUPABASE_ANON_KEY = "sb_publishable_dDgGIa04mh20YFU1PbGSsw_M0l6mfjG";

    // Initialize Supabase Client
    let supabase = null;
    if (typeof window.supabase !== 'undefined' && SUPABASE_URL !== "YOUR_SUPABASE_URL" && SUPABASE_ANON_KEY !== "YOUR_SUPABASE_ANON_KEY") {
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
 
    // Default Coefficients configuration
    const VEHICLE_FUEL_FACTORS = {
        petrol: 2.314,
        diesel: 2.684,
        cng: 2.314,
        electric: 0
    };

    const ENERGY_COEFFICIENTS = {
        'purchased-grid': { factor: 0.792, unit: 'kWh' },
        'coal-power': { factor: 1.00, unit: 'kWh' },
        'natural-gas': { factor: 0.45, unit: 'kWh' },
        'solar-power': { factor: 0.00, unit: 'kWh' },
        'wind-power': { factor: 0.00, unit: 'kWh' }
    };

    const LPG_COEFFICIENTS = 2.988; // kgCO2 per kg LPG

    const PAPER_COEFFICIENTS = 3.591; // kgCO2 per kg paper

    const TREE_ABSORPTION = {
        'cluster-fig': 45.0,
        'banyan': 60.0,
        'neem': 52.5,
        'peepal': 50.0,
        'almond': 42.5,
        'palm': 15.0,
        'rosewood': 32.5,
        'guava': 25.0,
        'ashoka': 25.0,
        'jasmine': 2.5,
        'thuja': 25.0,
        'tamarind': 37.5,
        'mango': 62.5,
        'coconut': 60.0,
        'gulmohar': 22.5,
        'potted-plants': 2.5,
        'other': ''
    };

    // Extended database for custom trees
    const OTHER_TREES_DATABASE = {
        'teak': 15.0,
        'oak': 22.0,
        'pine': 18.0,
        'eucalyptus': 25.0,
        'bamboo': 12.0,
        'mahogany': 23.0,
        'maple': 21.0,
        'birch': 16.0,
        'cedar': 15.0,
        'sandalwood': 10.0,
        'ash': 20.0,
        'elm': 22.0,
        'cherry': 14.0,
        'apple': 12.0,
        'jackfruit': 19.0,
        'ficus': 35.0,
        'acacia': 15.0,
        'rose': 0.5,
        'hibiscus': 1.0,
        'bougainvillea': 1.5,
        'cypress': 12.0,
        'fir': 15.0,
        'redwood': 45.0,
        'spruce': 14.0
    };

    const WASTE_COEFFICIENTS = {
        'paper': 1.37,
        'plastic': 1.80,
        'organic': 0.50,
        'metal': 8.50,
        'glass': 0.35,
        'ewaste': 2.20,
        'battery': 1.50,
        'biomedical': 0.20,
        'hazardous': 0.30
    };

    // DOM Elements
    const vehicleContainer = document.getElementById('vehicle-rows-container');
    const energyContainer = document.getElementById('energy-rows-container');
    const generatorContainer = document.getElementById('generator-rows-container');
    const lpgContainer = document.getElementById('lpg-rows-container');
    const paperContainer = document.getElementById('paper-rows-container');
    const treesContainer = document.getElementById('trees-rows-container');
    const solarContainer = document.getElementById('solar-rows-container');
    const wasteContainer = document.getElementById('waste-rows-container');

    const btnAddVehicle = document.getElementById('btn-add-vehicle');
    const btnCalculateVehicles = document.getElementById('btn-calculate-vehicles');
    const vehicleResultsSummary = document.getElementById('vehicle-results-summary');
    const vehicleSumDaySpan = document.getElementById('vehicle-sum-day');
    const vehicleSumMonthSpan = document.getElementById('vehicle-sum-month');
    const vehicleSumYearSpan = document.getElementById('vehicle-sum-year');

    const btnAddEnergy = document.getElementById('btn-add-energy');
    const btnAddGenerator = document.getElementById('btn-add-generator');
    const btnCalculateGenerator = document.getElementById('btn-calculate-generator');
    
    const btnAddLpg = document.getElementById('btn-add-lpg');
    const btnCalculateLpg = document.getElementById('btn-calculate-lpg');
    const lpgResultsSummary = document.getElementById('lpg-results-summary');
    const lpgSumMonthSpan = document.getElementById('lpg-sum-month');
    const lpgSumYearSpan = document.getElementById('lpg-sum-year');

    const btnAddPaper = document.getElementById('btn-add-paper');
    const btnAddTree = document.getElementById('btn-add-tree');
    const btnCalculateTrees = document.getElementById('btn-calculate-trees');
    const treeResultsSummary = document.getElementById('tree-results-summary');
    const treeSumAbsorptionSpan = document.getElementById('tree-sum-absorption');
    
    const btnAddSolar = document.getElementById('btn-add-solar');
    const btnCalculateSolar = document.getElementById('btn-calculate-solar');
    const solarResultsSummary = document.getElementById('solar-results-summary');
    const solarSumOffsetSpan = document.getElementById('solar-sum-offset');

    const btnAddWaste = document.getElementById('btn-add-waste');

    // Institution Details DOM Elements
    const instName = document.getElementById('org-name');
    const instAddress = document.getElementById('org-address');
    const instContact = document.getElementById('org-contact');
    const instEmail = document.getElementById('org-email');
    const instCampusArea = document.getElementById('org-total-area');
    const instBuiltupArea = document.getElementById('org-builtup-area');
    const instTotalPopulation = document.getElementById('org-population');
    const instNumStudents = document.getElementById('inst-num-students');
    const instNumFacultyStaff = document.getElementById('inst-num-faculty-staff');

    // Analytics and Synchronization DOM Elements
    const paperStudentInput = document.getElementById('paper-student-input');
    const paperStudentKgSpan = document.getElementById('paper-student-kg');
    const paperTotalEmissionsSpan = document.getElementById('paper-total-emissions');

    const analyticsPopulationSpan = document.getElementById('analytics-population');
    const analyticsStudentsSpan = document.getElementById('analytics-students');
    const analyticsCampusAreaSpan = document.getElementById('analytics-campus-area');
    const analyticsBuiltupAreaSpan = document.getElementById('analytics-builtup-area');
    const analyticsPerCapitaSpan = document.getElementById('analytics-per-capita');
    const analyticsPerSqmSpan = document.getElementById('analytics-per-sqm');

    // Toast utility (defined in script.js, fallback if not found)
    const showToastMsg = (msg, type = 'success') => {
        if (typeof showToast === 'function') {
            showToast(msg, type);
        } else {
            console.log(`[Toast ${type}]: ${msg}`);
            // Fallback simple toast
            const container = document.getElementById('toast-container');
            if (container) {
                const toast = document.createElement('div');
                toast.className = `toast toast-${type} show`;
                toast.innerHTML = `<span>${msg}</span>`;
                container.appendChild(toast);
                setTimeout(() => {
                    toast.classList.remove('show');
                    setTimeout(() => toast.remove(), 400);
                }, 3000);
            }
        }
    };

    /* ==========================================
       1. Vehicle Table Logic
       ========================================== */
    function createVehicleRow(type = 'car', fuel = 'petrol', count = 1, distance = 0, ownership = 'institute-owned') {
        if (fuel === 'hybrid') fuel = 'petrol';
        const tr = document.createElement('tr');
        const factor = VEHICLE_FUEL_FACTORS[fuel] !== undefined ? VEHICLE_FUEL_FACTORS[fuel] : 0;

        tr.innerHTML = `
            <td>
                <select class="vehicle-type">
                    <option value="car" ${type === 'car' ? 'selected' : ''}>Car</option>
                    <option value="bus" ${type === 'bus' ? 'selected' : ''}>Bus</option>
                    <option value="van" ${type === 'van' ? 'selected' : ''}>Van</option>
                    <option value="bike" ${type === 'bike' ? 'selected' : ''}>Bike</option>
                    <option value="truck" ${type === 'truck' ? 'selected' : ''}>Truck</option>
                    <option value="auto-rickshaw" ${type === 'auto-rickshaw' ? 'selected' : ''}>Auto Rickshaw</option>
                </select>
            </td>
            <td>
                <select class="fuel-type">
                    <option value="petrol" ${fuel === 'petrol' ? 'selected' : ''}>Petrol</option>
                    <option value="diesel" ${fuel === 'diesel' ? 'selected' : ''}>Diesel</option>
                    <option value="cng" ${fuel === 'cng' ? 'selected' : ''}>CNG</option>
                    <option value="electric" ${fuel === 'electric' ? 'selected' : ''}>Electric</option>
                </select>
            </td>
            <td>
                <select class="vehicle-ownership">
                    <option value="institute-owned" ${ownership === 'institute-owned' ? 'selected' : ''}>Institute Owned</option>
                    <option value="staff-owned" ${ownership === 'staff-owned' ? 'selected' : ''}>Staff Owned</option>
                    <option value="student-owned" ${ownership === 'student-owned' ? 'selected' : ''}>Student Owned</option>
                    <option value="other" ${ownership === 'other' ? 'selected' : ''}>Other</option>
                </select>
            </td>
            <td class="row-scope-col vehicle-scope">
                <span class="init-scope-badge scope1">Scope 1</span>
            </td>
            <td><input type="number" class="vehicle-count" value="${count}" min="0"></td>
            <td><input type="number" class="vehicle-distance" value="${distance}" min="0" step="any"></td>
            <td><input type="number" class="vehicle-factor readonly-input" value="${factor.toFixed(3)}" readonly></td>
            <td class="text-em-day vehicle-day">0.00</td>
            <td class="text-em-month vehicle-month">0.00</td>
            <td class="text-em-year vehicle-year">0.00</td>
            <td class="text-em-year-tons vehicle-year-tons">0.000</td>
            <td>
                <button class="btn-delete-row" title="Delete Row">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                </button>
            </td>
        `;

        // Event listener for type, fuel or ownership change
        const selType = tr.querySelector('.vehicle-type');
        const selFuel = tr.querySelector('.fuel-type');
        const selOwnership = tr.querySelector('.vehicle-ownership');
        const inpCount = tr.querySelector('.vehicle-count');
        const inpDist = tr.querySelector('.vehicle-distance');
        const inpFactor = tr.querySelector('.vehicle-factor');

        function updateFactor() {
            const f = selFuel.value;
            const own = selOwnership.value;
            
            const fact = VEHICLE_FUEL_FACTORS[f] !== undefined ? VEHICLE_FUEL_FACTORS[f] : 0;
            inpFactor.value = fact.toFixed(3);
            
            // Update Scope cell dynamically based on ownership and fuel
            const scopeCell = tr.querySelector('.vehicle-scope');
            if (own === 'institute-owned') {
                if (f === 'electric') {
                    scopeCell.innerHTML = `<span class="init-scope-badge scope2">Scope 2</span>`;
                } else {
                    scopeCell.innerHTML = `<span class="init-scope-badge scope1">Scope 1</span>`;
                }
            } else {
                scopeCell.innerHTML = `<span class="init-scope-badge scope3">Scope 3</span>`;
            }
            
            calculateVehicleRow(tr);
        }

        // Clamp negative values to 0 on input
        [inpCount, inpDist].forEach(input => {
            input.addEventListener('input', () => {
                if (parseFloat(input.value) < 0) {
                    input.value = 0;
                    showToastMsg('Negative values are not allowed.', 'error');
                }
            });
        });

        selType.addEventListener('change', updateFactor);
        selFuel.addEventListener('change', updateFactor);
        selOwnership.addEventListener('change', updateFactor);
        inpCount.addEventListener('input', () => calculateVehicleRow(tr));
        inpDist.addEventListener('input', () => calculateVehicleRow(tr));

        tr.querySelector('.btn-delete-row').addEventListener('click', () => {
            tr.remove();
            calculateAll();
            showToastMsg('Vehicle entry deleted.', 'info');
        });

        // Set initial scope state based on ownership and fuel
        if (ownership === 'institute-owned') {
            if (fuel === 'electric') {
                tr.querySelector('.vehicle-scope').innerHTML = `<span class="init-scope-badge scope2">Scope 2</span>`;
            } else {
                tr.querySelector('.vehicle-scope').innerHTML = `<span class="init-scope-badge scope1">Scope 1</span>`;
            }
        } else {
            tr.querySelector('.vehicle-scope').innerHTML = `<span class="init-scope-badge scope3">Scope 3</span>`;
        }

        vehicleContainer.appendChild(tr);
        calculateVehicleRow(tr);
    }

    function calculateVehicleRow(row) {
        const count = Math.max(0, parseFloat(row.querySelector('.vehicle-count').value) || 0);
        const distance = Math.max(0, parseFloat(row.querySelector('.vehicle-distance').value) || 0);
        const factor = Math.max(0, parseFloat(row.querySelector('.vehicle-factor').value) || 0);

        // Daily Emission = Number of Vehicles × Average Distance × Emission Factor × 0.0485
        const dayEm = count * distance * factor * 0.0485;
        // Monthly Emission = Daily Emission × 5 × 4
        const monthEm = dayEm * 5 * 4; 
        // Annual Emission = Monthly Emission × 12
        const yearEm = monthEm * 12; 
        const yearTons = yearEm / 1000;

        row.querySelector('.vehicle-day').textContent = dayEm.toFixed(2);
        row.querySelector('.vehicle-month').textContent = monthEm.toFixed(2);
        row.querySelector('.vehicle-year').textContent = yearEm.toFixed(2);
        row.querySelector('.vehicle-year-tons').textContent = yearTons.toFixed(3);

        if (vehicleResultsSummary && vehicleResultsSummary.style.display === 'block') {
            updateVehicleTotals();
        }
        calculateSummary();
    }

    function updateVehicleTotals() {
        let totalDay = 0;
        let totalMonth = 0;
        let totalYear = 0;

        const vRows = vehicleContainer.querySelectorAll('tr');
        vRows.forEach(row => {
            const dayVal = parseFloat(row.querySelector('.vehicle-day').textContent) || 0;
            const monthVal = parseFloat(row.querySelector('.vehicle-month').textContent) || 0;
            const yearVal = parseFloat(row.querySelector('.vehicle-year').textContent) || 0;
            
            totalDay += dayVal;
            totalMonth += monthVal;
            totalYear += yearVal;
        });

        if (vehicleSumDaySpan) vehicleSumDaySpan.innerHTML = `${totalDay.toFixed(2)} <span style="font-size: 0.9rem; font-weight: 500; color: var(--text-secondary);">kgCO₂/day</span>`;
        if (vehicleSumMonthSpan) vehicleSumMonthSpan.innerHTML = `${totalMonth.toFixed(2)} <span style="font-size: 0.9rem; font-weight: 500; color: var(--text-secondary);">kgCO₂/month</span>`;
        if (vehicleSumYearSpan) vehicleSumYearSpan.innerHTML = `${totalYear.toFixed(2)} <span style="font-size: 0.9rem; font-weight: 500; color: var(--text-secondary);">kgCO₂/yr</span>`;
    }

    /* ==========================================
       2. Energy Table Logic
       ========================================== */
    function createEnergyRow(type = 'purchased-grid', consumption = 0, source = 'Grid utility') {
        const tr = document.createElement('tr');
        const config = ENERGY_COEFFICIENTS[type] || { factor: 0.792, unit: 'kWh' };

        tr.innerHTML = `
            <td>
                <select class="energy-type">
                    <option value="purchased-grid" ${type === 'purchased-grid' ? 'selected' : ''}>Purchased Grid Electricity</option>
                    <option value="coal-power" ${type === 'coal-power' ? 'selected' : ''}>Coal Power</option>
                    <option value="natural-gas" ${type === 'natural-gas' ? 'selected' : ''}>Natural Gas Power</option>
                    <option value="solar-power" ${type === 'solar-power' ? 'selected' : ''}>Solar Generator</option>
                    <option value="wind-power" ${type === 'wind-power' ? 'selected' : ''}>Wind Generator</option>
                </select>
            </td>
            <td>
                <input type="text" class="energy-source" value="${source}">
            </td>
            <td class="row-scope-col energy-scope">
                <span class="init-scope-badge scope2">Scope 2</span>
            </td>
            <td><input type="number" class="energy-consumption" value="${consumption}" min="0" step="any"></td>
            <td><input type="text" class="energy-unit readonly-input" value="${config.unit}" readonly style="width: 70px; text-align: center;"></td>
            <td><input type="number" class="energy-factor readonly-input" value="${config.factor.toFixed(3)}" readonly></td>
            <td class="energy-monthly">0.00</td>
            <td class="energy-annual">0.00</td>
            <td>
                <button class="btn-delete-row" title="Delete Row">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                </button>
            </td>
        `;

        const selType = tr.querySelector('.energy-type');
        const inpSource = tr.querySelector('.energy-source');
        const inpConsumption = tr.querySelector('.energy-consumption');
        const inpFactor = tr.querySelector('.energy-factor');
        const inpUnit = tr.querySelector('.energy-unit');

        function updateEnergyFields() {
            const config = ENERGY_COEFFICIENTS[selType.value] || { factor: 0.792, unit: 'kWh' };
            inpFactor.value = config.factor.toFixed(3);
            inpUnit.value = config.unit;
            
            // Adjust source text defaults
            if (selType.value === 'purchased-grid') inpSource.value = 'Grid utility';
            else if (selType.value === 'solar-power' || selType.value === 'wind-power') inpSource.value = 'Clean renewable';
            else inpSource.value = 'On-site generator';

            // Update Scope badge dynamically
            const scopeCell = tr.querySelector('.energy-scope');
            const val = selType.value;
            if (val === 'solar-power' || val === 'wind-power') {
                scopeCell.innerHTML = `<span class="init-scope-badge offset">Offset</span>`;
            } else {
                scopeCell.innerHTML = `<span class="init-scope-badge scope2">Scope 2</span>`;
            }
            calculateEnergyRow(tr);
        }

        // Clamp negative values
        inpConsumption.addEventListener('input', () => {
            if (parseFloat(inpConsumption.value) < 0) {
                inpConsumption.value = 0;
                showToastMsg('Negative values are not allowed.', 'error');
            }
            calculateEnergyRow(tr);
            calculateSummary();
        });

        selType.addEventListener('change', updateEnergyFields);

        tr.querySelector('.btn-delete-row').addEventListener('click', () => {
            tr.remove();
            calculateSummary();
            showToastMsg('Energy entry deleted.', 'info');
        });

        // Set initial Scope badge
        const scopeCell = tr.querySelector('.energy-scope');
        if (type === 'solar-power' || type === 'wind-power') {
            scopeCell.innerHTML = `<span class="init-scope-badge offset">Offset</span>`;
        } else {
            scopeCell.innerHTML = `<span class="init-scope-badge scope2">Scope 2</span>`;
        }

        energyContainer.appendChild(tr);
        calculateEnergyRow(tr);
    }

    function calculateEnergyRow(row) {
        const cons = Math.max(0, parseFloat(row.querySelector('.energy-consumption').value) || 0);
        const fact = Math.max(0, parseFloat(row.querySelector('.energy-factor').value) || 0);
        
        // Electricity Emission = Consumption × Emission Factor
        const monthly = cons * fact;
        // Annual Emission
        const annual = monthly * 12;

        row.querySelector('.energy-monthly').textContent = monthly.toFixed(2);
        row.querySelector('.energy-annual').textContent = annual.toFixed(2);
    }

    /* ==========================================
       2.5. Diesel Generator Table Logic
       ========================================== */
    function createGeneratorRow(location = 'Admin Block', diesel = 0) {
        const tr = document.createElement('tr');
        const factor = 2.684; // Standard diesel emission factor

        tr.innerHTML = `
            <td>
                <select class="generator-type">
                    <option value="diesel-generator" selected>Diesel Generator</option>
                </select>
            </td>
            <td>
                <input type="text" class="generator-location" value="${location}" placeholder="Enter generator location...">
            </td>
            <td><input type="number" class="generator-diesel" value="${diesel}" min="0" step="any"></td>
            <td><input type="text" class="generator-unit readonly-input" value="Litre" readonly style="width: 100px; text-align: center;"></td>
            <td><input type="number" class="generator-factor readonly-input" value="${factor.toFixed(3)}" readonly></td>
            <td class="generator-monthly">0.00</td>
            <td class="generator-annual">0.00</td>
            <td>
                <button class="btn-delete-row" title="Delete Row">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                </button>
            </td>
        `;

        const inpDiesel = tr.querySelector('.generator-diesel');

        inpDiesel.addEventListener('input', () => {
            if (parseFloat(inpDiesel.value) < 0) {
                inpDiesel.value = 0;
                showToastMsg('Negative values are not allowed.', 'error');
            }
            calculateGeneratorRow(tr);
            calculateSummary();
        });

        tr.querySelector('.btn-delete-row').addEventListener('click', () => {
            tr.remove();
            calculateSummary();
            showToastMsg('Generator entry deleted.', 'info');
        });

        generatorContainer.appendChild(tr);
        calculateGeneratorRow(tr);
    }

    function calculateGeneratorRow(row) {
        const diesel = Math.max(0, parseFloat(row.querySelector('.generator-diesel').value) || 0);
        const factor = 2.684;
        
        // Monthly Activity = Consumption × 2.684
        const monthly = diesel * factor;
        // Annual Emission = Monthly Activity × 12
        const annual = monthly * 12;

        row.querySelector('.generator-monthly').textContent = monthly.toFixed(2);
        row.querySelector('.generator-annual').textContent = annual.toFixed(2);
    }

    /* ==========================================
       3. LPG Table Logic
       ========================================== */
    function createLpgRow(location = 'girls-hostel-mess', cylinders = 0, weight = 14.2, customLocation = '') {
        const tr = document.createElement('tr');
        const factor = LPG_COEFFICIENTS;

        tr.innerHTML = `
            <td>
                <div class="lpg-location-wrapper" style="display: flex; flex-direction: column; gap: 4px;">
                    <select class="lpg-location">
                        <option value="girls-hostel-mess" ${location === 'girls-hostel-mess' ? 'selected' : ''}>Girls Hostel Mess</option>
                        <option value="boys-hostel-mess" ${location === 'boys-hostel-mess' ? 'selected' : ''}>Boys Hostel Mess</option>
                        <option value="canteen" ${location === 'canteen' ? 'selected' : ''}>Canteen</option>
                        <option value="private" ${location === 'private' ? 'selected' : ''}>Private</option>
                        <option value="other" ${location === 'other' ? 'selected' : ''}>Other</option>
                    </select>
                    <input type="text" class="lpg-location-custom" placeholder="Type custom location..." value="${customLocation}" style="${location === 'other' ? 'display: block;' : 'display: none;'} margin-top: 4px;">
                </div>
            </td>
            <td><input type="number" class="lpg-cylinders" value="${cylinders}" min="0"></td>
            <td><input type="number" class="lpg-weight" value="${weight}" min="0" step="any"></td>
            <td><input type="number" class="lpg-factor readonly-input" value="${factor.toFixed(3)}" readonly></td>
            <td class="lpg-monthly">0.00</td>
            <td class="lpg-annual">0.00</td>
            <td>
                <button class="btn-delete-row" title="Delete Row">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                </button>
            </td>
        `;

        const selLocation = tr.querySelector('.lpg-location');
        const inpCustom = tr.querySelector('.lpg-location-custom');
        const inpCylinders = tr.querySelector('.lpg-cylinders');
        const inpWeight = tr.querySelector('.lpg-weight');

        selLocation.addEventListener('change', () => {
            if (selLocation.value === 'other') {
                inpCustom.style.display = 'block';
                inpCustom.focus();
            } else {
                inpCustom.style.display = 'none';
                inpCustom.value = '';
            }
        });

        // Clamp negative values
        [inpCylinders, inpWeight].forEach(input => {
            input.addEventListener('input', () => {
                if (parseFloat(input.value) < 0) {
                    input.value = 0;
                    showToastMsg('Negative values are not allowed.', 'error');
                }
                calculateLpgRow(tr);
                calculateSummary();
            });
        });

        tr.querySelector('.btn-delete-row').addEventListener('click', () => {
            tr.remove();
            calculateSummary();
            showToastMsg('LPG entry deleted.', 'info');
        });

        lpgContainer.appendChild(tr);
        calculateLpgRow(tr);
    }

    function calculateLpgRow(row) {
        const cylinders = Math.max(0, parseFloat(row.querySelector('.lpg-cylinders').value) || 0);
        const weight = Math.max(0, parseFloat(row.querySelector('.lpg-weight').value) || 0);
        const factor = LPG_COEFFICIENTS;

        // Monthly Emission = Number of Cylinders × Cylinder Weight × 2.988
        const monthly = cylinders * weight * factor;
        // Annual Emission = Monthly × 12 × 2.988 (to match Excel sheet formula)
        const annual = monthly * 12 * factor;

        row.querySelector('.lpg-monthly').textContent = monthly.toFixed(2);
        row.querySelector('.lpg-annual').textContent = annual.toFixed(2);

        if (lpgResultsSummary && lpgResultsSummary.style.display === 'block') {
            updateLpgTotals();
        }
    }

    function updateLpgTotals() {
        let totalMonth = 0;
        let totalYear = 0;

        const lRows = lpgContainer.querySelectorAll('tr');
        lRows.forEach(row => {
            const monthVal = parseFloat(row.querySelector('.lpg-monthly').textContent) || 0;
            const yearVal = parseFloat(row.querySelector('.lpg-annual').textContent) || 0;
            
            totalMonth += monthVal;
            totalYear += yearVal;
        });

        if (lpgSumMonthSpan) lpgSumMonthSpan.innerHTML = `${totalMonth.toFixed(2)} <span style="font-size: 0.9rem; font-weight: 500; color: var(--text-secondary);">kgCO₂/month</span>`;
        if (lpgSumYearSpan) lpgSumYearSpan.innerHTML = `${totalYear.toFixed(2)} <span style="font-size: 0.9rem; font-weight: 500; color: var(--text-secondary);">kgCO₂/yr</span>`;
    }

    /* ==========================================
       4. Paper Table Logic
       ========================================== */
    function createPaperRow(purpose = 'Exams', adminConsumption = 0) {
        const tr = document.createElement('tr');
        const factor = PAPER_COEFFICIENTS;

        tr.innerHTML = `
            <td>
                <input type="text" class="paper-purpose" value="${purpose}" placeholder="e.g. Exams, Office, Library...">
            </td>
            <td><input type="number" class="paper-qty" value="${adminConsumption}" min="0" step="any"></td>
            <td>
                <button class="btn-delete-row" title="Delete Row">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                </button>
            </td>
        `;

        const inpQty = tr.querySelector('.paper-qty');

        inpQty.addEventListener('input', () => {
            if (parseFloat(inpQty.value) < 0) {
                inpQty.value = 0;
                showToastMsg('Negative values are not allowed.', 'error');
            }
            calculatePaperRow(tr);
            calculateSummary();
        });

        tr.querySelector('.btn-delete-row').addEventListener('click', () => {
            tr.remove();
            calculateSummary();
            showToastMsg('Paper usage entry deleted.', 'info');
        });

        paperContainer.appendChild(tr);
        calculatePaperRow(tr);
    }

    function calculatePaperRow(row) {
        updatePaperStudentSync();
    }

    function updatePaperStudentSync() {
        const students = Math.max(0, parseInt(instNumStudents ? instNumStudents.value : 0) || 0);
        if (paperStudentInput && parseInt(paperStudentInput.value) !== students) {
            paperStudentInput.value = students;
        }
        
        // Student Consumption = Students * 12 * 125 * 0.0005 = Students * 0.75 kg/yr
        const studentConsumptionKg = students * 12 * 125 * 0.0005;
        if (paperStudentKgSpan) {
            paperStudentKgSpan.textContent = studentConsumptionKg.toFixed(2);
        }

        // Sum other paper consumption rows
        let paperConsumptionSum = 0;
        const pRows = paperContainer.querySelectorAll('tr');
        pRows.forEach(row => {
            paperConsumptionSum += parseFloat(row.querySelector('.paper-qty').value) || 0;
        });

        const totalPaperEm = (studentConsumptionKg + paperConsumptionSum) * PAPER_COEFFICIENTS;
        if (paperTotalEmissionsSpan) {
            paperTotalEmissionsSpan.innerHTML = `${totalPaperEm.toFixed(2)} <span style="font-size: 0.9rem; font-weight: 500;">kgCO₂/yr</span>`;
        }
    }

    if (instNumStudents) {
        instNumStudents.addEventListener('input', () => {
            updatePaperStudentSync();
            calculateSummary();
        });
    }

    if (paperStudentInput) {
        paperStudentInput.addEventListener('input', () => {
            const val = Math.max(0, parseInt(paperStudentInput.value) || 0);
            if (instNumStudents) instNumStudents.value = val;
            updatePaperStudentSync();
            calculateSummary();
        });
    }

    /* ==========================================
       5. Green Cover / Trees Table Logic
       ========================================== */
    function createTreeRow(species = 'neem', count = 0, location = '') {
        const tr = document.createElement('tr');
        const factor = TREE_ABSORPTION[species];

        tr.innerHTML = `
            <td>
                <div class="tree-type-wrapper" style="display: flex; flex-direction: column; gap: 4px;">
                    <select class="tree-species">
                        <option value="cluster-fig" ${species === 'cluster-fig' ? 'selected' : ''}>Cluster Fig Tree</option>
                        <option value="banyan" ${species === 'banyan' ? 'selected' : ''}>Banyan Tree</option>
                        <option value="neem" ${species === 'neem' ? 'selected' : ''}>Neem Tree</option>
                        <option value="peepal" ${species === 'peepal' ? 'selected' : ''}>Peepal Tree</option>
                        <option value="almond" ${species === 'almond' ? 'selected' : ''}>Almond Tree</option>
                        <option value="palm" ${species === 'palm' ? 'selected' : ''}>Palm Tree</option>
                        <option value="rosewood" ${species === 'rosewood' ? 'selected' : ''}>Indian Rosewood</option>
                        <option value="guava" ${species === 'guava' ? 'selected' : ''}>Guava Tree</option>
                        <option value="ashoka" ${species === 'ashoka' ? 'selected' : ''}>Ashoka Tree</option>
                        <option value="jasmine" ${species === 'jasmine' ? 'selected' : ''}>Arabian Jasmine</option>
                        <option value="thuja" ${species === 'thuja' ? 'selected' : ''}>Thuja / Oriental Arborvitae</option>
                        <option value="tamarind" ${species === 'tamarind' ? 'selected' : ''}>Tamarind Tree</option>
                        <option value="mango" ${species === 'mango' ? 'selected' : ''}>Mango Tree</option>
                        <option value="coconut" ${species === 'coconut' ? 'selected' : ''}>Coconut Tree</option>
                        <option value="gulmohar" ${species === 'gulmohar' ? 'selected' : ''}>Gulmohar</option>
                        <option value="potted-plants" ${species === 'potted-plants' ? 'selected' : ''}>Potted Plants</option>
                        <option value="other" ${species === 'other' ? 'selected' : ''}>Other (Custom Tree)</option>
                    </select>
                    <input type="text" class="tree-custom-name" placeholder="Type custom tree species..." style="display: none; margin-top: 4px;">
                </div>
            </td>
            <td>
                <input type="text" class="tree-location" placeholder="Enter tree location..." value="${location}">
            </td>
            <td><input type="number" class="tree-count" value="${count}" min="0"></td>
            <td><input type="number" class="tree-factor readonly-input" value="${factor !== undefined && factor !== '' ? factor.toFixed(1) : ''}" readonly></td>
            <td class="tree-absorption-result">0.00</td>
            <td>
                <button class="btn-delete-row" title="Delete Row">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                </button>
            </td>
        `;

        const selSpecies = tr.querySelector('.tree-species');
        const inpCustomName = tr.querySelector('.tree-custom-name');
        const inpCount = tr.querySelector('.tree-count');
        const inpFactor = tr.querySelector('.tree-factor');

        function updateFactorField() {
            const val = selSpecies.value;
            if (val === 'other') {
                inpCustomName.style.display = 'block';
                inpCustomName.focus();
                inpFactor.value = '';
                inpFactor.removeAttribute('readonly');
                inpFactor.classList.remove('readonly-input');
            } else {
                inpCustomName.style.display = 'none';
                inpCustomName.value = '';
                const baseFactor = TREE_ABSORPTION[val];
                inpFactor.value = baseFactor !== undefined && baseFactor !== '' ? baseFactor.toFixed(1) : '';
                inpFactor.setAttribute('readonly', 'true');
                inpFactor.classList.add('readonly-input');
            }
            calculateTreeRow(tr);
        }

        selSpecies.addEventListener('change', updateFactorField);

        [inpCount, inpFactor].forEach(input => {
            input.addEventListener('input', () => {
                calculateTreeRow(tr);
                calculateSummary();
            });
        });

        tr.querySelector('.btn-delete-row').addEventListener('click', () => {
            tr.remove();
            calculateSummary();
            showToastMsg('Tree entry deleted.', 'info');
        });

        treesContainer.appendChild(tr);
        updateFactorField(); // Initialize fields
    }

    function calculateTreeRow(row) {
        const count = Math.max(0, parseFloat(row.querySelector('.tree-count').value) || 0);
        const factor = Math.max(0, parseFloat(row.querySelector('.tree-factor').value) || 0);
        const result = count * factor;
        row.querySelector('.tree-absorption-result').textContent = result.toFixed(2);

        if (treeResultsSummary && treeResultsSummary.style.display === 'block') {
            updateTreeTotals();
        }
    }

    function updateTreeTotals() {
        let totalOffset = 0;
        const tRows = treesContainer.querySelectorAll('tr');
        tRows.forEach(row => {
            totalOffset += parseFloat(row.querySelector('.tree-absorption-result').textContent) || 0;
        });
        if (treeSumAbsorptionSpan) {
            treeSumAbsorptionSpan.innerHTML = `${totalOffset.toFixed(2)} <span style="font-size: 0.9rem; font-weight: 500; color: var(--text-secondary);">kgCO₂ Absorbed/yr</span>`;
        }
    }

    /* ==========================================
       6. Solar Energy Table Logic
       ========================================== */
    function createSolarRow(location = 'girls-hostel', usage = 'geyser', capacity = 0, customLocation = '', customUsage = '') {
        const tr = document.createElement('tr');
        const factor = 0.792; // Standard Solar offset emission factor

        tr.innerHTML = `
            <td>
                <div class="solar-location-wrapper" style="display: flex; flex-direction: column; gap: 4px;">
                    <select class="solar-location">
                        <option value="canteen" ${location === 'canteen' ? 'selected' : ''}>Canteen</option>
                        <option value="girls-hostel" ${location === 'girls-hostel' ? 'selected' : ''}>Girls Hostel</option>
                        <option value="boys-hostel" ${location === 'boys-hostel' ? 'selected' : ''}>Boys Hostel</option>
                        <option value="main-building" ${location === 'main-building' ? 'selected' : ''}>Main Building</option>
                        <option value="guest-house" ${location === 'guest-house' ? 'selected' : ''}>Guest House</option>
                        <option value="other" ${location === 'other' ? 'selected' : ''}>Other</option>
                    </select>
                    <input type="text" class="solar-location-custom" placeholder="Type custom building..." value="${customLocation}" style="${location === 'other' ? 'display: block;' : 'display: none;'} margin-top: 4px;">
                </div>
            </td>
            <td>
                <div class="solar-usage-wrapper" style="display: flex; flex-direction: column; gap: 4px;">
                    <select class="solar-usage">
                        <option value="geyser" ${usage === 'geyser' ? 'selected' : ''}>Water Heater (Geyser)</option>
                        <option value="lighting" ${usage === 'lighting' ? 'selected' : ''}>Lighting</option>
                        <option value="grid-feed" ${usage === 'grid-feed' ? 'selected' : ''}>Grid Feed-in</option>
                        <option value="lab-power" ${usage === 'lab-power' ? 'selected' : ''}>Lab Power</option>
                        <option value="other" ${usage === 'other' ? 'selected' : ''}>Other</option>
                    </select>
                    <input type="text" class="solar-usage-custom" placeholder="Type custom usage..." value="${customUsage}" style="${usage === 'other' ? 'display: block;' : 'display: none;'} margin-top: 4px;">
                </div>
            </td>
            <td><input type="number" class="solar-capacity" value="${capacity}" min="0"></td>
            <td><input type="number" class="solar-factor readonly-input" value="${factor.toFixed(3)}" readonly></td>
            <td class="solar-result">0.00</td>
            <td>
                <button class="btn-delete-row" title="Delete Row">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                </button>
            </td>
        `;

        const selLocation = tr.querySelector('.solar-location');
        const inpCustomLoc = tr.querySelector('.solar-location-custom');
        const selUsage = tr.querySelector('.solar-usage');
        const inpCustomUse = tr.querySelector('.solar-usage-custom');
        const inpCapacity = tr.querySelector('.solar-capacity');

        selLocation.addEventListener('change', () => {
            if (selLocation.value === 'other') {
                inpCustomLoc.style.display = 'block';
                inpCustomLoc.focus();
            } else {
                inpCustomLoc.style.display = 'none';
                inpCustomLoc.value = '';
            }
        });

        selUsage.addEventListener('change', () => {
            if (selUsage.value === 'other') {
                inpCustomUse.style.display = 'block';
                inpCustomUse.focus();
            } else {
                inpCustomUse.style.display = 'none';
                inpCustomUse.value = '';
            }
        });

        inpCapacity.addEventListener('input', () => {
            calculateSolarRow(tr);
            calculateSummary();
        });

        tr.querySelector('.btn-delete-row').addEventListener('click', () => {
            tr.remove();
            calculateSummary();
            showToastMsg('Solar entry deleted.', 'info');
        });

        solarContainer.appendChild(tr);
        calculateSolarRow(tr);
    }

    function calculateSolarRow(row) {
        const capacity = parseFloat(row.querySelector('.solar-capacity').value) || 0;
        const ef = parseFloat(row.querySelector('.solar-factor').value) || 0.792;
        const result = capacity * ef;
        row.querySelector('.solar-result').textContent = result.toFixed(2);

        if (solarResultsSummary && solarResultsSummary.style.display === 'block') {
            updateSolarTotals();
        }
    }

    function updateSolarTotals() {
        let totalOffset = 0;
        const sRows = solarContainer.querySelectorAll('tr');
        sRows.forEach(row => {
            totalOffset += parseFloat(row.querySelector('.solar-result').textContent) || 0;
        });
        if (solarSumOffsetSpan) {
            solarSumOffsetSpan.innerHTML = `${totalOffset.toFixed(2)} <span style="font-size: 0.9rem; font-weight: 500; color: var(--text-secondary);">kgCO₂ Saved/yr</span>`;
        }
    }

    /* ==========================================
       6b. Waste Management Table Logic
       ========================================== */
    function createWasteRow(material = 'paper', qty = 0, location = '', customMaterial = '') {
        const tr = document.createElement('tr');
        const factor = WASTE_COEFFICIENTS[material] || 0;

        tr.innerHTML = `
            <td>
                <div class="waste-type-wrapper" style="display: flex; flex-direction: column; gap: 4px;">
                    <select class="waste-material">
                        <option value="paper" ${material === 'paper' ? 'selected' : ''}>Paper Recycling</option>
                        <option value="plastic" ${material === 'plastic' ? 'selected' : ''}>Plastic Recycling</option>
                        <option value="organic" ${material === 'organic' ? 'selected' : ''}>Organic Waste (Composting)</option>
                        <option value="metal" ${material === 'metal' ? 'selected' : ''}>Metal Recycling</option>
                        <option value="glass" ${material === 'glass' ? 'selected' : ''}>Glass Recycling</option>
                        <option value="ewaste" ${material === 'ewaste' ? 'selected' : ''}>E-Waste Recycling</option>
                        <option value="battery" ${material === 'battery' ? 'selected' : ''}>Battery Recycling</option>
                        <option value="biomedical" ${material === 'biomedical' ? 'selected' : ''}>Biomedical Waste Treatment</option>
                        <option value="hazardous" ${material === 'hazardous' ? 'selected' : ''}>Hazardous/Chemical Disposal</option>
                        <option value="other" ${material === 'other' ? 'selected' : ''}>Other</option>
                    </select>
                    <input type="text" class="waste-material-custom" placeholder="Type custom material..." value="${customMaterial}" style="${material === 'other' ? 'display: block;' : 'display: none;'} margin-top: 4px;">
                </div>
            </td>
            <td><input type="text" class="waste-location" placeholder="Enter recycling facility..." value="${location}"></td>
            <td><input type="number" class="waste-qty" value="${qty}" min="0"></td>
            <td><input type="number" class="waste-factor readonly-input" value="${factor.toFixed(2)}" readonly></td>
            <td class="waste-result">0.00</td>
            <td>
                <button class="btn-delete-row" title="Delete Row">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                </button>
            </td>
        `;

        const selMaterial = tr.querySelector('.waste-material');
        const inpCustomMat = tr.querySelector('.waste-material-custom');
        const inpQty = tr.querySelector('.waste-qty');
        const inpFactor = tr.querySelector('.waste-factor');

        selMaterial.addEventListener('change', () => {
            if (selMaterial.value === 'other') {
                inpCustomMat.style.display = 'block';
                inpCustomMat.focus();
                inpFactor.value = (0).toFixed(2);
            } else {
                inpCustomMat.style.display = 'none';
                inpCustomMat.value = '';
                inpFactor.value = (WASTE_COEFFICIENTS[selMaterial.value] || 0).toFixed(2);
            }
            calculateWasteRow(tr);
            calculateSummary();
        });

        inpQty.addEventListener('input', () => {
            calculateWasteRow(tr);
            calculateSummary();
        });

        tr.querySelector('.btn-delete-row').addEventListener('click', () => {
            tr.remove();
            calculateSummary();
            showToastMsg('Waste recycling entry deleted.', 'info');
        });

        wasteContainer.appendChild(tr);
        calculateWasteRow(tr);
    }

    function calculateWasteRow(row) {
        const qty = parseFloat(row.querySelector('.waste-qty').value) || 0;
        const factor = parseFloat(row.querySelector('.waste-factor').value) || 0;
        const result = qty * factor;
        row.querySelector('.waste-result').textContent = result.toFixed(2);
    }

    /* ==========================================
       7. Aggregate Calculations
       ========================================== */
    function calculateAll() {
        // Recalculate vehicles
        const vRows = vehicleContainer.querySelectorAll('tr');
        vRows.forEach(row => calculateVehicleRow(row));

        // Recalculate generator
        const gRows = generatorContainer.querySelectorAll('tr');
        gRows.forEach(row => calculateGeneratorRow(row));

        // Recalculate solar
        const sRows = solarContainer.querySelectorAll('tr');
        sRows.forEach(row => calculateSolarRow(row));

        // Recalculate waste
        const wRows = wasteContainer.querySelectorAll('tr');
        wRows.forEach(row => calculateWasteRow(row));

        // Sync paper student values
        updatePaperStudentSync();

        // Sync summary
        calculateSummary();
    }

    // Calculates all forms and updates the sticky bottom summary counters
    function calculateSummary() {
        let grossKg = 0;
        let offsetKg = 0;

        // 1. Vehicle Annual Emissions (tons conversion in summary logic is yearEm / 1000)
        const vRows = vehicleContainer.querySelectorAll('tr');
        vRows.forEach(row => {
            const count = parseFloat(row.querySelector('.vehicle-count').value) || 0;
            const distance = parseFloat(row.querySelector('.vehicle-distance').value) || 0;
            const factor = parseFloat(row.querySelector('.vehicle-factor').value) || 0;
            const dayEm = count * distance * factor * 0.0485;
            const yearEm = dayEm * 5 * 4 * 12;
            grossKg += yearEm;
        });

        // 2. Electricity / Energy Annual Emissions
        const eRows = energyContainer.querySelectorAll('tr');
        eRows.forEach(row => {
            const cons = parseFloat(row.querySelector('.energy-consumption').value) || 0;
            const fact = parseFloat(row.querySelector('.energy-factor').value) || 0;
            grossKg += cons * fact * 12; // Annualize it
        });

        // 3. Generator Annual Emissions
        const gRows = generatorContainer.querySelectorAll('tr');
        gRows.forEach(row => {
            const diesel = parseFloat(row.querySelector('.generator-diesel').value) || 0;
            const fact = parseFloat(row.querySelector('.generator-factor').value) || 2.684;
            grossKg += diesel * fact * 12; // Annualize it
        });

        // 4. LPG Annual Emissions (matching Excel formula multiplying by factor twice)
        const lRows = lpgContainer.querySelectorAll('tr');
        lRows.forEach(row => {
            const cylinders = parseFloat(row.querySelector('.lpg-cylinders').value) || 0;
            const weight = parseFloat(row.querySelector('.lpg-weight').value) || 0;
            const fact = parseFloat(row.querySelector('.lpg-factor').value) || 2.988;
            grossKg += cylinders * weight * fact * 12 * fact;
        });

        // 5. Paper Annual Emissions
        // formula: (no of students * 12 * 125 * 0.0005 + paper consumption) * 3.591
        const students = Math.max(0, parseInt(instNumStudents ? instNumStudents.value : 0) || 0);
        let paperConsumptionSum = 0;
        const pRows = paperContainer.querySelectorAll('tr');
        pRows.forEach(row => {
            paperConsumptionSum += parseFloat(row.querySelector('.paper-qty').value) || 0;
        });
        const paperAnnualSum = (students * 12 * 125 * 0.0005 + paperConsumptionSum) * 3.591;
        grossKg += paperAnnualSum;

        // 6. Solar Panel Annual Offsets
        const sRows = solarContainer.querySelectorAll('tr');
        sRows.forEach(row => {
            const cap = parseFloat(row.querySelector('.solar-capacity').value) || 0;
            const fact = parseFloat(row.querySelector('.solar-factor').value) || 0.792;
            offsetKg += cap * fact; // Already annual offset
        });

        // 7. Tree Annual Absorption Offsets
        const tRows = treesContainer.querySelectorAll('tr');
        tRows.forEach(row => {
            const count = parseFloat(row.querySelector('.tree-count').value) || 0;
            const fact = parseFloat(row.querySelector('.tree-factor').value) || 0;
            offsetKg += count * fact; // Already annual
        });

        // Convert to tonnes
        const grossTons = grossKg / 1000;
        const offsetsTons = offsetKg / 1000;
        const netTons = Math.max(0, grossTons - offsetsTons);

        // Update Sticky Summary UI Counters
        document.getElementById('summary-gross').innerHTML = `${grossTons.toFixed(2)} <span class="stat-unit">tCO₂e/yr</span>`;
        document.getElementById('summary-offsets').innerHTML = `${offsetsTons.toFixed(2)} <span class="stat-unit">tCO₂e/yr</span>`;
        document.getElementById('summary-net').innerHTML = `${netTons.toFixed(2)} <span class="stat-unit">tCO₂e/yr</span>`;

        // Keep Final Tab synced
        calculateFinalFootprint();
    }

    function calculateFinalFootprint() {
        // 1. Vehicles
        let vehicleSum = 0;
        const vRows = vehicleContainer.querySelectorAll('tr');
        vRows.forEach(row => {
            const count = parseFloat(row.querySelector('.vehicle-count').value) || 0;
            const distance = parseFloat(row.querySelector('.vehicle-distance').value) || 0;
            const factor = parseFloat(row.querySelector('.vehicle-factor').value) || 0;
            const dayEm = count * distance * factor * 0.0485;
            const yearEm = dayEm * 5 * 4 * 12;
            vehicleSum += yearEm;
        });

        // 2. Electricity
        let electricitySum = 0;
        const eRows = energyContainer.querySelectorAll('tr');
        eRows.forEach(row => {
            const cons = parseFloat(row.querySelector('.energy-consumption').value) || 0;
            const fact = parseFloat(row.querySelector('.energy-factor').value) || 0;
            electricitySum += cons * fact * 12;
        });

        // 3. Generator
        let generatorSum = 0;
        const gRows = generatorContainer.querySelectorAll('tr');
        gRows.forEach(row => {
            const diesel = parseFloat(row.querySelector('.generator-diesel').value) || 0;
            const fact = parseFloat(row.querySelector('.generator-factor').value) || 2.684;
            generatorSum += diesel * fact * 12;
        });

        // 4. LPG
        let lpgSum = 0;
        const lRows = lpgContainer.querySelectorAll('tr');
        lRows.forEach(row => {
            const cylinders = parseFloat(row.querySelector('.lpg-cylinders').value) || 0;
            const weight = parseFloat(row.querySelector('.lpg-weight').value) || 0;
            const fact = parseFloat(row.querySelector('.lpg-factor').value) || 2.988;
            lpgSum += cylinders * weight * fact * 12 * fact;
        });

        // 5. Paper
        const students = Math.max(0, parseInt(instNumStudents ? instNumStudents.value : 0) || 0);
        const studentConsumptionKg = students * 12 * 125 * 0.0005;
        let paperConsumptionSum = 0;
        const pRows = paperContainer.querySelectorAll('tr');
        pRows.forEach(row => {
            paperConsumptionSum += parseFloat(row.querySelector('.paper-qty').value) || 0;
        });
        const paperSum = (studentConsumptionKg + paperConsumptionSum) * 3.591;

        // 6. Solar Panel Offset
        let solarSum = 0;
        const sRows = solarContainer.querySelectorAll('tr');
        sRows.forEach(row => {
            const cap = parseFloat(row.querySelector('.solar-capacity').value) || 0;
            const fact = parseFloat(row.querySelector('.solar-factor').value) || 0.792;
            solarSum += cap * fact;
        });

        // 7. Trees Absorption Offset
        let treesSum = 0;
        const tRows = treesContainer.querySelectorAll('tr');
        tRows.forEach(row => {
            const count = parseFloat(row.querySelector('.tree-count').value) || 0;
            const fact = parseFloat(row.querySelector('.tree-factor').value) || 0;
            treesSum += count * fact;
        });

        // Update spans in Final Tab
        const elPaper = document.getElementById('final-paper-emission');
        const elLpg = document.getElementById('final-lpg-emission');
        const elElec = document.getElementById('final-electricity-emission');
        const elGen = document.getElementById('final-generator-emission');
        const elVeh = document.getElementById('final-vehicle-emission');
        const elSol = document.getElementById('final-solar-offset');
        const elTrees = document.getElementById('final-trees-offset');

        if (elPaper) elPaper.textContent = `${paperSum.toFixed(2)} kgCO₂/yr`;
        if (elLpg) elLpg.textContent = `${lpgSum.toFixed(2)} kgCO₂/yr`;
        if (elElec) elElec.textContent = `${electricitySum.toFixed(2)} kgCO₂/yr`;
        if (elGen) elGen.textContent = `${generatorSum.toFixed(2)} kgCO₂/yr`;
        if (elVeh) elVeh.textContent = `${vehicleSum.toFixed(2)} kgCO₂/yr`;
        if (elSol) elSol.textContent = `${solarSum.toFixed(2)} kgCO₂/yr`;
        if (elTrees) elTrees.textContent = `${treesSum.toFixed(2)} kgCO₂/yr`;

        // Net Carbon Footprint = (Paper + LPG + Electricity + Generator + Vehicles) - (Solar + Trees)
        const netFootprint = (paperSum + lpgSum + electricitySum + generatorSum + vehicleSum) - (solarSum + treesSum);
        
        const elNet = document.getElementById('final-net-footprint');
        const elNetTons = document.getElementById('final-net-footprint-tons');

        if (elNet) elNet.textContent = `${netFootprint.toFixed(2)} kgCO₂/yr`;
        if (elNetTons) elNetTons.textContent = `(${(netFootprint / 1000).toFixed(3)} tons CO₂/yr)`;

        if (elNet) {
            if (netFootprint > 0) {
                elNet.style.color = '#c0392b'; // red
            } else {
                elNet.style.color = '#27ae60'; // green
            }
        }

        if (typeof window.updateReportDashboardUI === 'function') {
            window.updateReportDashboardUI();
        }
    }

    async function submitDataToBackend() {
        // Collect organizational details
        const orgName = document.getElementById('org-name')?.value || 'Not provided';
        const orgAddress = document.getElementById('org-address')?.value || 'Not provided';
        const orgContact = document.getElementById('org-contact')?.value || 'Not provided';
        const orgEmail = document.getElementById('org-email')?.value || 'Not provided';

        // Collect footprint values
        const paperText = document.getElementById('final-paper-emission')?.textContent || '0.00';
        const lpgText = document.getElementById('final-lpg-emission')?.textContent || '0.00';
        const elecText = document.getElementById('final-electricity-emission')?.textContent || '0.00';
        const genText = document.getElementById('final-generator-emission')?.textContent || '0.00';
        const vehText = document.getElementById('final-vehicle-emission')?.textContent || '0.00';
        const solarText = document.getElementById('final-solar-offset')?.textContent || '0.00';
        const treesText = document.getElementById('final-trees-offset')?.textContent || '0.00';
        const netText = document.getElementById('final-net-footprint')?.textContent || '0.00';

        // Parse float values (matching standard snake_case database schema fields)
        const payload = {
            organization_name: orgName,
            address: orgAddress,
            contact_number: orgContact,
            email: orgEmail,
            student_count: Math.max(0, parseInt(instNumStudents?.value) || 0),
            paper_emissions_kg: parseFloat(paperText) || 0,
            lpg_emissions_kg: parseFloat(lpgText) || 0,
            electricity_emissions_kg: parseFloat(elecText) || 0,
            generator_emissions_kg: parseFloat(genText) || 0,
            vehicle_emissions_kg: parseFloat(vehText) || 0,
            solar_offset_kg: parseFloat(solarText) || 0,
            tree_sink_kg: parseFloat(treesText) || 0,
            net_footprint_kg: parseFloat(netText) || 0
        };

        if (!supabase) {
            showToastMsg('Supabase is not configured! Check SUPABASE_URL and SUPABASE_ANON_KEY at the top of calculator.js.', 'error');
            console.log('Submission Payload:', payload);
            return;
        }

        showToastMsg('Submitting data to Supabase...', 'info');

        try {
            const { data, error } = await supabase
                .from('emissions_submissions')
                .insert([payload]);

            if (error) {
                throw error;
            }

            showToastMsg('Data submitted successfully!', 'success');
        } catch (error) {
            console.error('Error submitting data to Supabase:', error);
            showToastMsg('Failed to submit data. Check console log for details.', 'error');
        }
    }

    /* ==========================================
       7. Button Handlers
       ========================================== */
    btnAddVehicle.addEventListener('click', (e) => {
        e.preventDefault();
        createVehicleRow('car', 'petrol', 1, 0, 'institute-owned');
        showToastMsg('Added new vehicle row.', 'success');
    });

    if (btnCalculateVehicles) {
        btnCalculateVehicles.addEventListener('click', (e) => {
            e.preventDefault();
            updateVehicleTotals();
            if (vehicleResultsSummary) vehicleResultsSummary.style.display = 'block';
            calculateSummary();
            showToastMsg('Vehicle emissions calculated.', 'success');
        });
    }

    btnAddEnergy.addEventListener('click', (e) => {
        e.preventDefault();
        createEnergyRow('purchased-grid', 0);
        showToastMsg('Added new energy consumption row.', 'success');
    });

    btnAddGenerator.addEventListener('click', (e) => {
        e.preventDefault();
        createGeneratorRow('Admin Block', 0);
        showToastMsg('Added new generator consumption row.', 'success');
    });

    if (btnCalculateGenerator) {
        btnCalculateGenerator.addEventListener('click', (e) => {
            e.preventDefault();
            calculateSummary();
            showToastMsg('Generator emissions calculated.', 'success');
        });
    }

    btnAddLpg.addEventListener('click', (e) => {
        e.preventDefault();
        createLpgRow('girls-hostel-mess', 0);
        showToastMsg('Added new LPG weight row.', 'success');
    });

    btnAddPaper.addEventListener('click', (e) => {
        e.preventDefault();
        createPaperRow('standard-a4', 0, 'exams');
        showToastMsg('Added new paper quantity row.', 'success');
    });

    btnAddTree.addEventListener('click', (e) => {
        e.preventDefault();
        createTreeRow('neem', 0, '');
        showToastMsg('Added new tree plantation row.', 'success');
    });

    btnAddSolar.addEventListener('click', (e) => {
        e.preventDefault();
        createSolarRow('girls-hostel', 'geyser', 0);
        showToastMsg('Added new solar installation row.', 'success');
    });

    btnAddWaste.addEventListener('click', (e) => {
        e.preventDefault();
        createWasteRow('paper', 0, '');
        showToastMsg('Added new waste recycling row.', 'success');
    });

    document.getElementById('btn-calculate-energy').addEventListener('click', (e) => {
        e.preventDefault();
        calculateSummary();
        showToastMsg('Energy calculations updated.', 'success');
    });

    document.getElementById('btn-reset-energy').addEventListener('click', (e) => {
        e.preventDefault();
        energyContainer.innerHTML = '';
        createEnergyRow('purchased-grid', 0);
        calculateSummary();
        showToastMsg('Energy inputs reset.', 'info');
    });

    if (btnCalculateLpg) {
        btnCalculateLpg.addEventListener('click', (e) => {
            e.preventDefault();
            updateLpgTotals();
            if (lpgResultsSummary) lpgResultsSummary.style.display = 'block';
            calculateSummary();
            showToastMsg('LPG emissions updated.', 'success');
        });
    }

    document.getElementById('btn-calculate-paper').addEventListener('click', (e) => {
        e.preventDefault();
        calculateSummary();
        showToastMsg('Paper emissions updated.', 'success');
    });

    if (btnCalculateSolar) {
        btnCalculateSolar.addEventListener('click', (e) => {
            e.preventDefault();
            updateSolarTotals();
            if (solarResultsSummary) solarResultsSummary.style.display = 'block';
            calculateAll();
            showToastMsg('Solar clean offsets calculated.', 'success');
        });
    }

    if (btnCalculateTrees) {
        btnCalculateTrees.addEventListener('click', (e) => {
            e.preventDefault();
            updateTreeTotals();
            if (treeResultsSummary) treeResultsSummary.style.display = 'block';
            calculateSummary();
            showToastMsg('Tree absorption offsets calculated.', 'success');
        });
    }

    document.getElementById('btn-calculate-waste').addEventListener('click', (e) => {
        e.preventDefault();
        calculateAll();
        showToastMsg('Waste recycling offsets calculated.', 'success');
    });

    document.getElementById('btn-recalculate-all').addEventListener('click', (e) => {
        e.preventDefault();
        calculateAll();
        showToastMsg('Complete carbon model re-calculated successfully.', 'success');
    });

    const btnCalculateFinal = document.getElementById('btn-calculate-final');
    if (btnCalculateFinal) {
        btnCalculateFinal.addEventListener('click', (e) => {
            e.preventDefault();
            calculateSummary();
            if (typeof window.processSubmissionAndGenerateReport === 'function') {
                window.processSubmissionAndGenerateReport();
            }
        });
    }

    const btnSubmitBackend = document.getElementById('btn-submit-backend');
    if (btnSubmitBackend) {
        btnSubmitBackend.addEventListener('click', (e) => {
            e.preventDefault();
            calculateSummary();
            submitDataToBackend();
            if (typeof window.processSubmissionAndGenerateReport === 'function') {
                window.processSubmissionAndGenerateReport();
            }
        });
    }

    /* ==========================================
       8. Exports System (CSV / Excel)
       ========================================== */
    function downloadCSV(csvContent, filename) {
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', filename);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }

    // Vehicle Table Exports
    function exportVehicleData(format = 'csv') {
        const rows = [['Vehicle Type', 'Fuel Type', 'Count', 'Avg Distance (km)', 'Emission Factor', 'Emission/Day (kg)', 'Emission/Month (kg)', 'Emission/Year (kg)', 'Emission/Year (tons)']];
        const vRows = vehicleContainer.querySelectorAll('tr');

        if (vRows.length === 0) {
            showToastMsg('No vehicle data available to export.', 'error');
            return;
        }

        vRows.forEach(tr => {
            const type = tr.querySelector('.vehicle-type').value;
            const fuel = tr.querySelector('.fuel-type').value;
            const count = tr.querySelector('.vehicle-count').value;
            const dist = tr.querySelector('.vehicle-distance').value;
            const factor = tr.querySelector('.vehicle-factor').value;
            const day = tr.querySelector('.vehicle-day').textContent;
            const month = tr.querySelector('.vehicle-month').textContent;
            const year = tr.querySelector('.vehicle-year').textContent;
            const tons = tr.querySelector('.vehicle-year-tons').textContent;

            rows.push([type, fuel, count, dist, factor, day, month, year, tons]);
        });

        const csvContent = rows.map(e => e.map(val => `"${val}"`).join(',')).join('\n');
        const filename = `Vehicle_Emissions_Report_${new Date().toISOString().slice(0, 10)}.${format}`;
        downloadCSV(csvContent, filename);
        showToastMsg(`Vehicle emissions exported to ${format.toUpperCase()}.`, 'success');
    }

    document.getElementById('btn-export-vehicle-csv').addEventListener('click', (e) => {
        e.preventDefault();
        exportVehicleData('csv');
    });

    document.getElementById('btn-export-vehicle-excel').addEventListener('click', (e) => {
        e.preventDefault();
        exportVehicleData('xls'); // TSV renamed as xls
    });

    // Summary Report Export
    const btnExportFullReport = document.getElementById('btn-export-full-report');
    if (btnExportFullReport) {
        btnExportFullReport.onclick = function (e) {
            e.preventDefault();
            e.stopPropagation();
            calculateSummary();
            if (typeof window.processSubmissionAndGenerateReport === 'function') {
                window.processSubmissionAndGenerateReport();
            } else {
                showToastMsg('Report generator engine is initializing...', 'info');
            }
        };
    }

    /* ==========================================
       9. Initialization
       ========================================== */
    // Insert initial rows on load
    createVehicleRow('car', 'petrol', 1, 10, 'institute-owned');
    createEnergyRow('purchased-grid', 12000);
    createGeneratorRow('Admin Block', 2.5);
    createLpgRow('girls-hostel-mess', 2.5);
    createPaperRow('standard-a4', 15000, 'exams');
    createSolarRow('girls-hostel', 'geyser', 2500);
    createTreeRow('neem', 50, 'Main Garden');
    createWasteRow('paper', 1200, 'Main Admin Office');

    // Initial run
    calculateAll();

    /* ==========================================
       10. Organization Logo & Photo Live Previews
       ========================================== */
    const logoInput = document.getElementById('org-logo-file');
    const logoPlaceholder = document.getElementById('logo-placeholder');
    const logoPreviewBox = document.getElementById('logo-preview-box');
    const logoPreviewImg = document.getElementById('logo-preview-img');
    const btnRemoveLogo = document.getElementById('btn-remove-logo');

    if (logoInput) {
        logoInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    logoPreviewImg.src = event.target.result;
                    logoPlaceholder.style.display = 'none';
                    logoPreviewBox.style.display = 'flex';
                    showToastMsg('Logo uploaded successfully.', 'success');
                };
                reader.readAsDataURL(file);
            }
        });
    }

    if (btnRemoveLogo) {
        btnRemoveLogo.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            logoInput.value = '';
            logoPreviewImg.src = '';
            logoPreviewBox.style.display = 'none';
            logoPlaceholder.style.display = 'flex';
            showToastMsg('Logo removed.', 'info');
        });
    }

    const photoInput = document.getElementById('org-photo-file');
    const photoPlaceholder = document.getElementById('photo-placeholder');
    const photoPreviewBox = document.getElementById('photo-preview-box');
    const photoPreviewImg = document.getElementById('photo-preview-img');
    const btnRemovePhoto = document.getElementById('btn-remove-photo');

    if (photoInput) {
        photoInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    photoPreviewImg.src = event.target.result;
                    photoPlaceholder.style.display = 'none';
                    photoPreviewBox.style.display = 'flex';
                    showToastMsg('College photo uploaded successfully.', 'success');
                };
                reader.readAsDataURL(file);
            }
        });
    }

    if (btnRemovePhoto) {
        btnRemovePhoto.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            photoInput.value = '';
            photoPreviewImg.src = '';
            photoPreviewBox.style.display = 'none';
            photoPlaceholder.style.display = 'flex';
            showToastMsg('College photo removed.', 'info');
        });
    }

    const layoutInput = document.getElementById('org-layout-file');
    const layoutPlaceholder = document.getElementById('layout-placeholder');
    const layoutPreviewBox = document.getElementById('layout-preview-box');
    const layoutFileName = document.getElementById('layout-file-name');
    const btnRemoveLayout = document.getElementById('btn-remove-layout');

    if (layoutInput) {
        layoutInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                layoutFileName.textContent = file.name;
                layoutPlaceholder.style.display = 'none';
                layoutPreviewBox.style.display = 'flex';
                showToastMsg('Layout plan file loaded.', 'success');
            }
        });
    }

    if (btnRemoveLayout) {
        btnRemoveLayout.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            layoutInput.value = '';
            layoutFileName.textContent = '';
            layoutPreviewBox.style.display = 'none';
            layoutPlaceholder.style.display = 'flex';
            showToastMsg('Layout plan removed.', 'info');
        });
    }

    // Electricity Bill Upload Preview
    const elecInput = document.getElementById('electricity-bill-file');
    const elecPlaceholder = document.getElementById('electricity-placeholder');
    const elecPreviewBox = document.getElementById('electricity-preview-box');
    const elecFileName = document.getElementById('electricity-file-name');
    const btnRemoveElec = document.getElementById('btn-remove-electricity');

    if (elecInput) {
        elecInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                elecFileName.textContent = file.name;
                elecPlaceholder.style.display = 'none';
                elecPreviewBox.style.display = 'flex';
                showToastMsg('Electricity bill file loaded.', 'success');
            }
        });
    }

    if (btnRemoveElec) {
        btnRemoveElec.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            elecInput.value = '';
            elecFileName.textContent = '';
            elecPreviewBox.style.display = 'none';
            elecPlaceholder.style.display = 'flex';
            showToastMsg('Electricity bill removed.', 'info');
        });
    }

    // Generator Bill Upload Preview
    const genInput = document.getElementById('generator-bill-file');
    const genPlaceholder = document.getElementById('generator-placeholder');
    const genPreviewBox = document.getElementById('generator-preview-box');
    const genFileName = document.getElementById('generator-file-name');
    const btnRemoveGen = document.getElementById('btn-remove-generator-bill');

    if (genInput) {
        genInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                genFileName.textContent = file.name;
                genPlaceholder.style.display = 'none';
                genPreviewBox.style.display = 'flex';
                showToastMsg('Generator bill file loaded.', 'success');
            }
        });
    }

    if (btnRemoveGen) {
        btnRemoveGen.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            genInput.value = '';
            genFileName.textContent = '';
            genPreviewBox.style.display = 'none';
            genPlaceholder.style.display = 'flex';
            showToastMsg('Generator bill removed.', 'info');
        });
    }

    // Solar Photo Upload Preview
    const solarPhotoInput = document.getElementById('solar-photo-file');
    const solarPlaceholder = document.getElementById('solar-placeholder');
    const solarPreviewBox = document.getElementById('solar-preview-box');
    const solarPreviewImg = document.getElementById('solar-preview-img');
    const btnRemoveSolarPhoto = document.getElementById('btn-remove-solar-photo');

    if (solarPhotoInput) {
        solarPhotoInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    solarPreviewImg.src = event.target.result;
                    solarPlaceholder.style.display = 'none';
                    solarPreviewBox.style.display = 'flex';
                    showToastMsg('Solar photo loaded.', 'success');
                };
                reader.readAsDataURL(file);
            }
        });
    }

    if (btnRemoveSolarPhoto) {
        btnRemoveSolarPhoto.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            solarPhotoInput.value = '';
            solarPreviewImg.src = '';
            solarPreviewBox.style.display = 'none';
            solarPlaceholder.style.display = 'flex';
            showToastMsg('Solar photo removed.', 'info');
        });
    }

    // Trees Photo Upload Preview
    const treesPhotoInput = document.getElementById('trees-photo-file');
    const treesPlaceholder = document.getElementById('trees-placeholder');
    const treesPreviewBox = document.getElementById('trees-preview-box');
    const treesPreviewImg = document.getElementById('trees-preview-img');
    const btnRemoveTreesPhoto = document.getElementById('btn-remove-trees-photo');

    if (treesPhotoInput) {
        treesPhotoInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    treesPreviewImg.src = event.target.result;
                    treesPlaceholder.style.display = 'none';
                    treesPreviewBox.style.display = 'flex';
                    showToastMsg('Trees photo loaded.', 'success');
                };
                reader.readAsDataURL(file);
            }
        });
    }

    if (btnRemoveTreesPhoto) {
        btnRemoveTreesPhoto.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            treesPhotoInput.value = '';
            treesPreviewImg.src = '';
            treesPreviewBox.style.display = 'none';
            treesPlaceholder.style.display = 'flex';
            showToastMsg('Trees photo removed.', 'info');
        });
    }

    /* ==========================================
       11. Calculator Sub-Navigation Logic
       ========================================== */
    const subnavLinks = document.querySelectorAll('.subnav-link');
    const navSections = ['sec-vehicle', 'sec-energy', 'sec-generator', 'sec-lpg', 'sec-paper', 'sec-solar', 'sec-trees', 'sec-waste', 'sec-final'];

    if (subnavLinks.length > 0) {
        let isClickScrolling = false;

        // Smooth scroll trigger
        subnavLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const targetId = link.getAttribute('href');
                const targetSec = document.querySelector(targetId);
                if (targetSec) {
                    isClickScrolling = true;

                    // Update active tab styling immediately on click
                    subnavLinks.forEach(l => l.classList.remove('active'));
                    link.classList.add('active');

                    // Offset for main fixed header (~72px) + sticky subnav bar (~60px) + buffer
                    const offset = 145;
                    const bodyRect = document.body.getBoundingClientRect().top;
                    const elementRect = targetSec.getBoundingClientRect().top;
                    const elementPosition = elementRect - bodyRect;
                    const offsetPosition = elementPosition - offset;

                    window.scrollTo({
                        top: offsetPosition,
                        behavior: 'smooth'
                    });

                    setTimeout(() => {
                        isClickScrolling = false;
                    }, 800);
                }
            });
        });

        // Scrollspy observer to keep active tab constant and synced with scroll position
        const sectionElements = navSections.map(id => document.getElementById(id)).filter(Boolean);
        if ('IntersectionObserver' in window && sectionElements.length > 0) {
            const observerOptions = {
                root: null,
                rootMargin: '-140px 0px -50% 0px',
                threshold: 0.1
            };

            const observer = new IntersectionObserver((entries) => {
                if (isClickScrolling) return;
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const activeId = entry.target.id;
                        subnavLinks.forEach(l => {
                            const href = l.getAttribute('href')?.substring(1);
                            if (href === activeId) {
                                l.classList.add('active');
                                l.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
                            } else {
                                l.classList.remove('active');
                            }
                        });
                    }
                });
            }, observerOptions);

            sectionElements.forEach(sec => observer.observe(sec));
        }
    }
});
