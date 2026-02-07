let globalData = [];
let selectedCountries = [];
let allCountries = [];
let emissionType = 'production'; // 'production' or 'consumption'
let chart3ViewMode = 'bubble'; // 'bubble' or 'path'

// Consistent colors by country across all charts
let colorByCountry = d3.scaleOrdinal(d3.schemeTableau10);
const getCountryColor = (country) => colorByCountry(country);

// Tooltip
function showTooltip(event, html) {
  const tooltip = d3.select("#tooltip");
  tooltip.html(html)
    .style("left", (event.pageX + 15) + "px")
    .style("top", (event.pageY - 15) + "px")
    .classed("visible", true);
}
function hideTooltip() {
  d3.select("#tooltip").classed("visible", false);
}

// Load CSV automatically (must be served via Live Server / Express)
d3.csv("greenhouse_emission_co2.csv", d => ({
  country: d.country,
  year: +d.year,
  iso_code: d.iso_code,
  population: +d.population || 0,
  gdp: +d.gdp || 0,
  co2: +d.co2 || 0,
  co2_per_capita: +d.co2_per_capita || 0,
  consumption_co2: +d.consumption_co2 || 0,
  consumption_co2_per_capita: +d.consumption_co2_per_capita || 0,
  coal_co2: +d.coal_co2 || 0,
  oil_co2: +d.oil_co2 || 0,
  gas_co2: +d.gas_co2 || 0,
  cement_co2: +d.cement_co2 || 0,
  flaring_co2: +d.flaring_co2 || 0,
  other_industry_co2: +d.other_industry_co2 || 0,
  co2_including_luc: +d.co2_including_luc || 0,
  land_use_change_co2: +d.land_use_change_co2 || 0,
  methane: +d.methane || 0,
  nitrous_oxide: +d.nitrous_oxide || 0,
  total_ghg: +d.total_ghg || 0
})).then(data => {
  globalData = data;

  allCountries = [...new Set(globalData.map(d => d.country))].sort();
  colorByCountry.domain(allCountries);

  const years = globalData.map(d => d.year).filter(y => Number.isFinite(y));
  const minYear = d3.min(years);
  const maxYear = d3.max(years);

  // Default selection
  const defaultCountries = ["United States", "China", "India", "Germany", "United Kingdom"];
  selectedCountries = defaultCountries.filter(c => allCountries.includes(c));
  if (selectedCountries.length === 0 && allCountries.length > 0) {
    selectedCountries = allCountries.slice(0, 5);
  }

  setupYearControls(minYear, maxYear);
  initializeCountryPicker();
  populateCountrySelectors();
  initializeToggle();
  initializeCharts();

  window.addEventListener("resize", () => {
    // recreate charts on resize
    d3.select("#chart1").selectAll("*").remove();
    d3.select("#chart2").selectAll("*").remove();
    d3.select("#chart3").selectAll("*").remove();
    d3.select("#chart4").selectAll("*").remove();
    d3.select("#chart5").selectAll("*").remove();
    d3.select("#chart6").selectAll("*").remove();
    initializeCharts();
  });
}).catch(err => {
  console.error(err);
  // Dashboard stays visible; errors are in console
});

// =====================
// Controls setup
// =====================
function setupYearControls(minYear, maxYear) {
  const yearFrom = document.getElementById("yearFrom");
  const yearTo = document.getElementById("yearTo");

  yearFrom.min = minYear; yearFrom.max = maxYear;
  yearTo.min = minYear; yearTo.max = maxYear;

  yearFrom.value = Math.max(minYear, maxYear - 24);
  yearTo.value = maxYear;

  const s2 = document.getElementById("year-slider-2");
  const s3 = document.getElementById("year-slider-3");
  const s5 = document.getElementById("year-slider-5");

  [s2, s3, s5].forEach(s => {
    s.min = minYear;
    s.max = maxYear;
    s.value = maxYear;
  });

  document.getElementById("year-display-2").textContent = s2.value;
  document.getElementById("year-display-3").textContent = s3.value;
  document.getElementById("year-display-5").textContent = s5.value;

  // Chart 3 trace year controls
  const traceFrom = document.getElementById("trace-year-from");
  const traceTo = document.getElementById("trace-year-to");
  traceFrom.min = minYear; traceFrom.max = maxYear;
  traceTo.min = minYear; traceTo.max = maxYear;
  traceFrom.value = Math.max(minYear, maxYear - 20);
  traceTo.value = maxYear;
}

// =====================
// Country picker
// =====================
function initializeCountryPicker() {
  const selected = document.getElementById("countryPickerSelected");
  const dropdown = document.getElementById("countryPickerDropdown");
  const search = document.getElementById("countrySearch");

  selected.addEventListener("click", (e) => {
    e.stopPropagation();
    dropdown.classList.toggle("active");
  });

  document.addEventListener("click", () => dropdown.classList.remove("active"));
  dropdown.addEventListener("click", (e) => e.stopPropagation());

  search.addEventListener("input", () => {
    renderCountryOptions(search.value.toLowerCase());
  });

  renderCountryOptions();
  updateSelectedDisplay();
}

function renderCountryOptions(searchTerm = "") {
  const optionsContainer = document.getElementById("countryOptions");
  optionsContainer.innerHTML = "";

  const filtered = allCountries.filter(country =>
    country.toLowerCase().includes(searchTerm)
  );

  filtered.forEach(country => {
    const option = document.createElement("div");
    option.className = "country-picker-option";
    if (selectedCountries.includes(country)) option.classList.add("selected");

    option.innerHTML = `
      <div class="country-picker-checkbox"></div>
      <span>${country}</span>
    `;

    option.addEventListener("click", () => toggleCountry(country));
    optionsContainer.appendChild(option);
  });
}

function toggleCountry(country) {
  const index = selectedCountries.indexOf(country);
  if (index > -1) selectedCountries.splice(index, 1);
  else selectedCountries.push(country);

  updateSelectedDisplay();
  renderCountryOptions(document.getElementById("countrySearch").value.toLowerCase());
  updateChart1();
}

function updateSelectedDisplay() {
  const selected = document.getElementById("countryPickerSelected");
  selected.innerHTML = "";

  if (selectedCountries.length === 0) {
    selected.innerHTML = '<span class="country-picker-placeholder">Click to select countries...</span>';
    return;
  }

  selectedCountries.forEach(country => {
    const tag = document.createElement("div");
    tag.className = "country-tag";
    tag.innerHTML = `
      <span>${country}</span>
      <span class="country-tag-remove">×</span>
    `;
    tag.querySelector(".country-tag-remove").addEventListener("click", (e) => {
      e.stopPropagation();
      toggleCountry(country);
    });
    selected.appendChild(tag);
  });
}

function populateCountrySelectors() {
  const selector3 = document.getElementById("country-selector-3");
  const selector4 = document.getElementById("country-selector-4");
  const selector6 = document.getElementById("country-selector-6");

  // Multi-select for Chart 3 (path tracing)
  selector3.innerHTML = "";
  const defaultTraceCountries = ["United States", "China", "Sweden", "India", "Germany"];
  allCountries.forEach(country => {
    if (country === "World") return;
    const option = document.createElement("option");
    option.value = country;
    option.textContent = country;
    if (defaultTraceCountries.includes(country)) {
      option.selected = true;
    }
    selector3.appendChild(option);
  });

  [selector4, selector6].forEach(selector => {
    selector.innerHTML = "";
    allCountries.forEach(country => {
      const option = document.createElement("option");
      option.value = country;
      option.textContent = country;
      selector.appendChild(option);
    });

    selector.value = allCountries.includes("World") ? "World" : allCountries[0];
  });
}

// =====================
// Toggle for Production/Consumption
// =====================
function initializeToggle() {
  document.getElementById('btn-production').addEventListener('click', () => {
    emissionType = 'production';
    updateToggleState();
    refreshChartsForToggle();
  });

  document.getElementById('btn-consumption').addEventListener('click', () => {
    emissionType = 'consumption';
    updateToggleState();
    refreshChartsForToggle();
  });
}

function updateToggleState() {
  document.querySelectorAll('.toggle-btn').forEach(btn => btn.classList.remove('active'));
  const activeBtn = emissionType === 'production' ? 'btn-production' : 'btn-consumption';
  document.getElementById(activeBtn).classList.add('active');
  
  const description = emissionType === 'production' 
    ? 'Showing emissions from domestic production (territorial emissions)'
    : 'Showing emissions from goods consumed (imports included, exports excluded)';
  document.getElementById('toggle-description').textContent = description;
}

function refreshChartsForToggle() {
  updateChart1();
  createChart2();
  createChart3();
}

// Helper to get the correct CO2 value based on emission type
function getCO2Value(d) {
  return emissionType === 'production' ? d.co2 : d.consumption_co2;
}

function getCO2PerCapitaValue(d) {
  return emissionType === 'production' ? d.co2_per_capita : d.consumption_co2_per_capita;
}

// =====================
// Chart 3 View Toggle
// =====================
function initializeChart3Toggle() {
  document.getElementById('btn-bubble-view').addEventListener('click', () => {
    chart3ViewMode = 'bubble';
    updateChart3ViewToggle();
    createChart3();
  });

  document.getElementById('btn-path-view').addEventListener('click', () => {
    chart3ViewMode = 'path';
    updateChart3ViewToggle();
    createChart3();
  });
}

function updateChart3ViewToggle() {
  const bubbleBtn = document.getElementById('btn-bubble-view');
  const pathBtn = document.getElementById('btn-path-view');
  const bubbleControls = document.getElementById('bubble-controls');
  const pathControls = document.getElementById('path-controls');
  const description = document.getElementById('chart3-description');

  if (chart3ViewMode === 'bubble') {
    bubbleBtn.classList.add('active');
    pathBtn.classList.remove('active');
    bubbleControls.style.display = 'flex';
    pathControls.style.display = 'none';
    description.textContent = 'Explore the relationship between GDP and CO₂ emissions (bubble size = population)';
  } else {
    bubbleBtn.classList.remove('active');
    pathBtn.classList.add('active');
    bubbleControls.style.display = 'none';
    pathControls.style.display = 'flex';
    description.textContent = 'Trace countries\' paths over time to see if they decoupled economic growth from emissions';
  }
}

// =====================
// Chart init
// =====================
function initializeCharts() {
  createChart1();
  createChart2();
  initializeChart3Toggle();
  createChart3();
  createChart4();
  createChart5();
  createChart6();

  document.getElementById("yearFrom").addEventListener("change", updateChart1);
  document.getElementById("yearTo").addEventListener("change", updateChart1);
}

// =====================
// Chart 1: CO₂ Trend
// =====================
function createChart1() {
  const margin = { top: 20, right: 120, bottom: 50, left: 80 };
  const width = document.getElementById("chart1").clientWidth - margin.left - margin.right;
  const height = 400 - margin.top - margin.bottom;

  d3.select("#chart1").selectAll("*").remove();

  const svg = d3.select("#chart1")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  createChart1.svg = svg;
  createChart1.dimensions = { width, height, margin };

  updateChart1();
}

function updateChart1() {
  if (!createChart1.svg) return;

  const svg = createChart1.svg;
  const { width, height } = createChart1.dimensions;

  const yearFrom = +document.getElementById("yearFrom").value;
  const yearTo = +document.getElementById("yearTo").value;

  if (yearFrom > yearTo) {
    document.getElementById("yearFrom").value = yearTo;
    return;
  }

  const filteredData = globalData.filter(d =>
    selectedCountries.includes(d.country) &&
    d.year >= yearFrom && d.year <= yearTo &&
    getCO2Value(d) > 0
  );

  svg.selectAll("*").remove();

  if (filteredData.length === 0) {
    svg.append("text")
      .attr("x", width / 2)
      .attr("y", height / 2)
      .attr("text-anchor", "middle")
      .style("font-family", "DM Mono, monospace")
      .style("fill", "var(--text-secondary)")
      .text("No data available for selected criteria");
    return;
  }

  const x = d3.scaleLinear().domain([yearFrom, yearTo]).range([0, width]);
  const y = d3.scaleLinear()
    .domain([0, d3.max(filteredData, d => getCO2Value(d)) * 1.1])
    .range([height, 0]);

  svg.append("g")
    .attr("class", "grid")
    .call(d3.axisLeft(y).tickSize(-width).tickFormat(""));

  svg.append("g")
    .attr("class", "axis")
    .attr("transform", `translate(0,${height})`)
    .call(d3.axisBottom(x).tickFormat(d3.format("d")));

  svg.append("g")
    .attr("class", "axis")
    .call(d3.axisLeft(y).tickFormat(d => d.toFixed(0)));

  const line = d3.line()
    .x(d => x(d.year))
    .y(d => y(getCO2Value(d)))
    .curve(d3.curveMonotoneX);

  selectedCountries.forEach((country) => {
    const countryData = filteredData
      .filter(d => d.country === country)
      .sort((a, b) => a.year - b.year);

    if (countryData.length === 0) return;

    const color = getCountryColor(country);

    svg.append("path")
      .datum(countryData)
      .attr("class", "line")
      .attr("d", line)
      .attr("stroke", color)
      .on("mouseover", (event) => showTooltip(event, `<strong>${country}</strong>`))
      .on("mouseout", hideTooltip);

    svg.selectAll(`.point-${country.replace(/\s+/g, "-")}`)
      .data(countryData)
      .enter()
      .append("circle")
      .attr("cx", d => x(d.year))
      .attr("cy", d => y(getCO2Value(d)))
      .attr("r", 0)
      .attr("fill", color)
      .on("mouseover", function (event, d) {
        d3.select(this).attr("r", 5);
        const emissionLabel = emissionType === 'production' ? 'Production CO₂' : 'Consumption CO₂';
        showTooltip(event, `<strong>${country}</strong><br/>Year: ${d.year}<br/>${emissionLabel}: ${getCO2Value(d).toFixed(1)} Mt`);
      })
      .on("mouseout", function () {
        d3.select(this).attr("r", 0);
        hideTooltip();
      });
  });

  // Labels
  svg.append("text")
    .attr("x", width / 2)
    .attr("y", height + 40)
    .attr("text-anchor", "middle")
    .style("font-family", "DM Mono, monospace")
    .style("font-size", "0.75rem")
    .style("fill", "var(--text-secondary)")
    .text("Year");

  svg.append("text")
    .attr("transform", "rotate(-90)")
    .attr("x", -height / 2)
    .attr("y", -60)
    .attr("text-anchor", "middle")
    .style("font-family", "DM Mono, monospace")
    .style("font-size", "0.75rem")
    .style("fill", "var(--text-secondary)")
    .text("CO₂ Emissions (Mt)");

  // Legend (consistent by country)
  const legend = d3.select("#legend1");
  legend.selectAll("*").remove();
  selectedCountries.forEach((country) => {
    const item = legend.append("div").attr("class", "legend-item");
    item.append("div").attr("class", "legend-color").style("background", getCountryColor(country));
    item.append("span").attr("class", "legend-label").text(country);
  });
}

// =====================
// Chart 2: Per-capita rank
// =====================
function createChart2() {
  const margin = { top: 20, right: 40, bottom: 50, left: 140 };
  const width = document.getElementById("chart2").clientWidth - margin.left - margin.right;
  const height = 500 - margin.top - margin.bottom;

  // FIXED: Clear existing chart before creating new one
  d3.select("#chart2").selectAll("*").remove();

  const svg = d3.select("#chart2")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  function update() {
    const year = +document.getElementById("year-slider-2").value;
    document.getElementById("year-display-2").textContent = year;

    const yearData = globalData
      .filter(d => d.year === year && d.country !== "World" && getCO2PerCapitaValue(d) > 0)
      .sort((a, b) => getCO2PerCapitaValue(b) - getCO2PerCapitaValue(a))
      .slice(0, 15);

    svg.selectAll("*").remove();

    if (yearData.length === 0) return;

    const x = d3.scaleLinear()
      .domain([0, d3.max(yearData, d => getCO2PerCapitaValue(d)) * 1.1])
      .range([0, width]);

    const y = d3.scaleBand()
      .domain(yearData.map(d => d.country))
      .range([0, height])
      .padding(0.2);

    svg.selectAll(".bar")
      .data(yearData)
      .enter()
      .append("rect")
      .attr("x", 0)
      .attr("y", d => y(d.country))
      .attr("width", d => x(getCO2PerCapitaValue(d)))
      .attr("height", y.bandwidth())
      .attr("fill", d => getCountryColor(d.country))
      .attr("rx", 4)
      .style("opacity", 0.9)
      .on("mouseover", function (event, d) {
        d3.select(this).style("opacity", 1);
        const emissionLabel = emissionType === 'production' ? 'Production' : 'Consumption';
        showTooltip(event,
          `<strong>${d.country}</strong><br/>${emissionLabel} Per Capita: ${getCO2PerCapitaValue(d).toFixed(2)} t/person<br/>Total: ${getCO2Value(d).toFixed(1)} Mt`
        );
      })
      .on("mouseout", function () {
        d3.select(this).style("opacity", 0.9);
        hideTooltip();
      });

    svg.append("g").attr("class", "axis").call(d3.axisLeft(y));
    svg.append("g").attr("class", "axis").attr("transform", `translate(0,${height})`).call(d3.axisBottom(x));

    svg.append("text")
      .attr("x", width / 2)
      .attr("y", height + 40)
      .attr("text-anchor", "middle")
      .style("font-family", "DM Mono, monospace")
      .style("font-size", "0.75rem")
      .style("fill", "var(--text-secondary)")
      .text("CO₂ per Capita (tonnes/person)");
  }

  document.getElementById("year-slider-2").addEventListener("input", update);
  update();
}


// =====================
// Chart 3: Economic Growth vs Emissions (Dual View)
// =====================
function createChart3() {
  if (chart3ViewMode === 'bubble') {
    createChart3Bubble();
  } else {
    createChart3PathTracing();
  }
}

// Chart 3 - Bubble View
function createChart3Bubble() {
  const margin = { top: 20, right: 40, bottom: 60, left: 80 };
  const container = document.getElementById("chart3");

  d3.select(container).selectAll("*").remove();

  const svgRoot = d3.select(container).append("svg");
  const g = svgRoot.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  function formatBillions(v) {
    const b = v / 1e9;
    return `$${b.toFixed(v < 1e9 ? 1 : 0)}B`;
  }

  function buildPowerOf10Ticks(scale) {
    const [minV, maxV] = scale.domain();
    const minPow = Math.floor(Math.log10(minV));
    const maxPow = Math.ceil(Math.log10(maxV));
    return d3.range(minPow, maxPow + 1).map(p => Math.pow(10, p));
  }

  function update() {
    g.selectAll("*").remove();

    const year = +document.getElementById("year-slider-3").value;
    document.getElementById("year-display-3").textContent = year;

    const yearData = globalData.filter(d => 
      d.year === year && 
      d.country !== "World" && 
      d.gdp > 0 && 
      getCO2Value(d) > 0 &&
      d.population > 0
    );

    const width = container.clientWidth - margin.left - margin.right;
    const height = 500 - margin.top - margin.bottom;

    svgRoot
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom);

    if (yearData.length === 0) {
      g.append("text")
        .attr("x", width / 2)
        .attr("y", height / 2)
        .attr("text-anchor", "middle")
        .style("font-family", "DM Mono, monospace")
        .style("fill", "var(--text-secondary)")
        .text("No data available for this year");
      return;
    }

    // Scales
    const x = d3.scaleLog()
      .domain(d3.extent(yearData, d => d.gdp))
      .range([0, width])
      .nice();

    const y = d3.scaleLinear()
      .domain([0, d3.max(yearData, d => getCO2Value(d)) * 1.1])
      .range([height, 0]);

    const size = d3.scaleSqrt()
      .domain([0, d3.max(yearData, d => d.population)])
      .range([3, 30]);

    // Grid
    g.append("g")
      .attr("class", "grid")
      .call(d3.axisLeft(y).tickSize(-width).tickFormat(""));

    // Bubbles
    g.selectAll(".bubble")
      .data(yearData, d => d.country)
      .enter()
      .append("circle")
      .attr("class", "bubble")
      .attr("cx", d => x(d.gdp))
      .attr("cy", d => y(getCO2Value(d)))
      .attr("r", d => size(d.population))
      .attr("fill", d => getCountryColor(d.country))
      .attr("opacity", 0.7)
      .attr("stroke", "#fff")
      .attr("stroke-width", 1)
      .on("mouseover", function (event, d) {
        d3.select(this).attr("opacity", 1).attr("stroke-width", 2);
        const emissionLabel = emissionType === 'production' ? 'Production CO₂' : 'Consumption CO₂';
        showTooltip(event, `
          <strong>${d.country}</strong><br/>
          GDP: ${formatBillions(d.gdp)}<br/>
          ${emissionLabel}: ${getCO2Value(d).toFixed(1)} Mt<br/>
          Population: ${(d.population / 1e6).toFixed(0)}M
        `);
      })
      .on("mouseout", function () {
        d3.select(this).attr("opacity", 0.7).attr("stroke-width", 1);
        hideTooltip();
      });

    // Axes
    const logTicks = buildPowerOf10Ticks(x);

    g.append("g")
      .attr("class", "axis")
      .attr("transform", `translate(0,${height})`)
      .call(
        d3.axisBottom(x)
          .tickValues(logTicks)
          .tickFormat(d => formatBillions(d))
          .tickSizeOuter(0)
      );

    g.append("g")
      .attr("class", "axis")
      .call(d3.axisLeft(y).ticks(6).tickSizeOuter(0));

    // Labels
    const emissionLabel = emissionType === 'production' ? 'Production CO₂' : 'Consumption CO₂';

    g.append("text")
      .attr("x", width / 2)
      .attr("y", height + 45)
      .attr("text-anchor", "middle")
      .style("font-family", "DM Mono, monospace")
      .style("font-size", "0.75rem")
      .style("fill", "var(--text-secondary)")
      .text("GDP (log scale)");

    g.append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -height / 2)
      .attr("y", -60)
      .attr("text-anchor", "middle")
      .style("font-family", "DM Mono, monospace")
      .style("font-size", "0.75rem")
      .style("fill", "var(--text-secondary)")
      .text(`${emissionLabel} (Mt)`);
  }

  document.getElementById("year-slider-3").addEventListener("input", update);
  update();
}

// Chart 3 - Path Tracing View
function createChart3PathTracing() {
  const margin = { top: 40, right: 150, bottom: 60, left: 80 };
  const container = document.getElementById("chart3");

  d3.select(container).selectAll("*").remove();

  const svgRoot = d3.select(container).append("svg");
  const g = svgRoot.append("g").attr("transform", `translate(${margin.left},${margin.top})`);

  function formatBillions(v) {
    const b = v / 1e9;
    return `$${b.toFixed(v < 1e9 ? 1 : 0)}B`;
  }

  function buildPowerOf10Ticks(scale) {
    const [minV, maxV] = scale.domain();
    const minPow = Math.floor(Math.log10(minV));
    const maxPow = Math.ceil(Math.log10(maxV));
    return d3.range(minPow, maxPow + 1).map(p => Math.pow(10, p));
  }

  function update() {
    g.selectAll("*").remove();

    const selectedCountries = Array.from(
      document.getElementById('country-selector-3').selectedOptions
    ).map(opt => opt.value);

    const yearFrom = +document.getElementById("trace-year-from").value;
    const yearTo = +document.getElementById("trace-year-to").value;

    if (selectedCountries.length === 0) {
      g.append("text")
        .attr("x", 200)
        .attr("y", 200)
        .attr("text-anchor", "middle")
        .style("font-family", "DM Mono, monospace")
        .style("fill", "var(--text-secondary)")
        .text("Please select at least one country");
      return;
    }

    const traceData = globalData.filter(d => 
      selectedCountries.includes(d.country) &&
      d.year >= yearFrom && d.year <= yearTo &&
      d.gdp > 0 && getCO2Value(d) > 0
    );

    if (traceData.length === 0) {
      g.append("text")
        .attr("x", 200)
        .attr("y", 200)
        .attr("text-anchor", "middle")
        .style("font-family", "DM Mono, monospace")
        .style("fill", "var(--text-secondary)")
        .text("No data available for selected criteria");
      return;
    }

    const width = container.clientWidth - margin.left - margin.right;
    const height = 500 - margin.top - margin.bottom;

    svgRoot
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom);

    // Group data by country
    const dataByCountry = d3.group(traceData, d => d.country);

    // Scales
    const x = d3.scaleLog()
      .domain(d3.extent(traceData, d => d.gdp))
      .range([0, width])
      .nice();

    const y = d3.scaleLinear()
      .domain([0, d3.max(traceData, d => getCO2Value(d)) * 1.1])
      .range([height, 0]);

    // Grid
    g.append("g")
      .attr("class", "grid")
      .call(d3.axisLeft(y).tickSize(-width).tickFormat(""));

    // Line generator
    const line = d3.line()
      .x(d => x(d.gdp))
      .y(d => y(getCO2Value(d)))
      .curve(d3.curveLinear);

    // Draw paths for each country
    dataByCountry.forEach((countryData, country) => {
      const sorted = countryData.sort((a, b) => a.year - b.year);
      const color = getCountryColor(country);

      // Path
      g.append("path")
        .datum(sorted)
        .attr("class", "trace-path")
        .attr("d", line)
        .attr("stroke", color)
        .attr("stroke-width", 2.5)
        .attr("fill", "none")
        .attr("opacity", 0.8)
        .on("mouseover", function() {
          d3.select(this).attr("stroke-width", 4).attr("opacity", 1);
        })
        .on("mouseout", function() {
          d3.select(this).attr("stroke-width", 2.5).attr("opacity", 0.8);
        });

      // Points at each year
      g.selectAll(`.point-${country.replace(/\s+/g, "-")}`)
        .data(sorted)
        .enter()
        .append("circle")
        .attr("cx", d => x(d.gdp))
        .attr("cy", d => y(getCO2Value(d)))
        .attr("r", 4)
        .attr("fill", color)
        .attr("stroke", "#fff")
        .attr("stroke-width", 1.5)
        .on("mouseover", function(event, d) {
          d3.select(this).attr("r", 7);
          const idx = sorted.indexOf(d);
          const prev = idx > 0 ? sorted[idx - 1] : null;
          
          let tooltip = `<strong>${country} (${d.year})</strong><br/>
            GDP: ${formatBillions(d.gdp)}<br/>
            CO₂: ${getCO2Value(d).toFixed(1)} Mt`;
          
          if (prev) {
            const gdpChange = ((d.gdp - prev.gdp) / prev.gdp * 100).toFixed(1);
            const co2Change = ((getCO2Value(d) - getCO2Value(prev)) / getCO2Value(prev) * 100).toFixed(1);
            tooltip += `<br/>GDP Change: ${gdpChange > 0 ? '+' : ''}${gdpChange}%`;
            tooltip += `<br/>CO₂ Change: ${co2Change > 0 ? '+' : ''}${co2Change}%`;
          }
          
          showTooltip(event, tooltip);
        })
        .on("mouseout", function() {
          d3.select(this).attr("r", 4);
          hideTooltip();
        });

      // Start label
      const first = sorted[0];
      g.append("text")
        .attr("x", x(first.gdp) + 10)
        .attr("y", y(getCO2Value(first)) - 5)
        .text(`${country} (${first.year})`)
        .attr("fill", color)
        .style("font-size", "0.65rem")
        .style("font-family", "DM Mono, monospace")
        .style("font-weight", "600");

      // End marker with arrow
      const last = sorted[sorted.length - 1];
      g.append("circle")
        .attr("cx", x(last.gdp))
        .attr("cy", y(getCO2Value(last)))
        .attr("r", 6)
        .attr("fill", color)
        .attr("stroke", "#fff")
        .attr("stroke-width", 2);

      g.append("text")
        .attr("x", x(last.gdp) + 10)
        .attr("y", y(getCO2Value(last)) + 4)
        .text(`${last.year}`)
        .attr("fill", color)
        .style("font-size", "0.7rem")
        .style("font-family", "DM Mono, monospace")
        .style("font-weight", "700");
    });

    // Axes
    const logTicks = buildPowerOf10Ticks(x);

    g.append("g")
      .attr("class", "axis")
      .attr("transform", `translate(0,${height})`)
      .call(
        d3.axisBottom(x)
          .tickValues(logTicks)
          .tickFormat(d => formatBillions(d))
          .tickSizeOuter(0)
      );

    g.append("g")
      .attr("class", "axis")
      .call(d3.axisLeft(y).ticks(6).tickSizeOuter(0));

    // Labels
    const emissionLabel = emissionType === 'production' ? 'Production CO₂' : 'Consumption CO₂';
    
    g.append("text")
      .attr("x", width / 2)
      .attr("y", height + 45)
      .attr("text-anchor", "middle")
      .style("font-family", "DM Mono, monospace")
      .style("font-size", "0.75rem")
      .style("fill", "var(--text-secondary)")
      .text("GDP (log scale)");

    g.append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -height / 2)
      .attr("y", -60)
      .attr("text-anchor", "middle")
      .style("font-family", "DM Mono, monospace")
      .style("font-size", "0.75rem")
      .style("fill", "var(--text-secondary)")
      .text(`${emissionLabel} (Mt)`);
  }

  // Wire controls
  document.getElementById("country-selector-3").addEventListener("change", update);
  document.getElementById("trace-year-from").addEventListener("change", update);
  document.getElementById("trace-year-to").addEventListener("change", update);

  // Initial render
  update();
}


// =====================
// Chart 4: Stacked area
// =====================
function createChart4() {
  const margin = { top: 20, right: 40, bottom: 50, left: 80 };
  const width = document.getElementById("chart4").clientWidth - margin.left - margin.right;
  const height = 400 - margin.top - margin.bottom;

  const svg = d3.select("#chart4")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const sources = ["coal_co2", "oil_co2", "gas_co2", "cement_co2", "flaring_co2", "other_industry_co2"];
  const sourceLabels = {
    coal_co2: "Coal",
    oil_co2: "Oil",
    gas_co2: "Gas",
    cement_co2: "Cement",
    flaring_co2: "Flaring",
    other_industry_co2: "Other Industry"
  };

  const sourceColors = d3.scaleOrdinal()
    .domain(sources)
    .range(["#2d3436", "#ff6b35", "#4ecdc4", "#95a5a6", "#f39c12", "#9b59b6"]);

  function update() {
    const country = document.getElementById("country-selector-4").value;
    const countryData = globalData.filter(d => d.country === country).sort((a, b) => a.year - b.year);

    svg.selectAll("*").remove();
    if (countryData.length === 0) return;

    const x = d3.scaleLinear().domain(d3.extent(countryData, d => d.year)).range([0, width]);

    const stack = d3.stack().keys(sources);
    const series = stack(countryData);

    const y = d3.scaleLinear()
      .domain([0, d3.max(series, layer => d3.max(layer, d => d[1])) * 1.1])
      .range([height, 0]);

    const area = d3.area()
      .x(d => x(d.data.year))
      .y0(d => y(d[0]))
      .y1(d => y(d[1]))
      .curve(d3.curveMonotoneX);

    svg.append("g").attr("class", "grid")
      .call(d3.axisLeft(y).tickSize(-width).tickFormat(""));

    svg.selectAll(".area")
      .data(series)
      .enter()
      .append("path")
      .attr("d", area)
      .attr("fill", d => sourceColors(d.key))
      .attr("opacity", 0.8)
      .on("mouseover", (event, d) => showTooltip(event, `<strong>${sourceLabels[d.key]}</strong>`))
      .on("mouseout", hideTooltip);

    svg.append("g").attr("class", "axis").attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x).tickFormat(d3.format("d")));
    svg.append("g").attr("class", "axis").call(d3.axisLeft(y));

    const legend = d3.select("#legend4");
    legend.selectAll("*").remove();
    sources.forEach(source => {
      const item = legend.append("div").attr("class", "legend-item");
      item.append("div").attr("class", "legend-color").style("background", sourceColors(source));
      item.append("span").attr("class", "legend-label").text(sourceLabels[source]);
    });
  }

  document.getElementById("country-selector-4").addEventListener("change", update);
  update();
}

// =====================
// Chart 5: Dumbbell - Continents and Income Groups
// =====================
function createChart5() {
  const margin = { top: 20, right: 40, bottom: 60, left: 200 };
  const width = document.getElementById("chart5").clientWidth - margin.left - margin.right;
  const height = 500 - margin.top - margin.bottom;

  const svg = d3.select("#chart5")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  // Define continents and income groups to display
  const groupLabels = [
    "Africa",
    "Asia",
    "Europe",
    "North America",
    "South America",
    "Oceania",
    "High-income countries",
    "Upper-middle-income countries",
    "Lower-middle-income countries",
    "Low-income countries"
  ];

  function update() {
    const year = +document.getElementById("year-slider-5").value;
    document.getElementById("year-display-5").textContent = year;

    const yearData = globalData
      .filter(d => 
        d.year === year && 
        groupLabels.includes(d.country) &&
        d.co2 > 0 && 
        d.co2_including_luc > 0
      )
      .sort((a, b) => b.co2_including_luc - a.co2_including_luc);

    svg.selectAll("*").remove();

    if (yearData.length === 0) {
      svg.append("text")
        .attr("x", width / 2)
        .attr("y", height / 2)
        .attr("text-anchor", "middle")
        .style("font-family", "DM Mono, monospace")
        .style("fill", "var(--text-secondary)")
        .text("No data available for continents and income groups in this year");
      return;
    }

    const x = d3.scaleLinear()
      .domain([0, d3.max(yearData, d => d.co2_including_luc) * 1.1])
      .range([0, width]);

    const y = d3.scaleBand()
      .domain(yearData.map(d => d.country))
      .range([0, height])
      .padding(0.3);

    // Lines connecting the dumbbells
    svg.selectAll(".link")
      .data(yearData)
      .enter()
      .append("line")
      .attr("x1", d => x(d.co2))
      .attr("x2", d => x(d.co2_including_luc))
      .attr("y1", d => y(d.country) + y.bandwidth() / 2)
      .attr("y2", d => y(d.country) + y.bandwidth() / 2)
      .attr("stroke", "#4ecdc4")
      .attr("stroke-width", 2);

    // Circles excluding LUC
    svg.selectAll(".circle-exclude")
      .data(yearData)
      .enter()
      .append("circle")
      .attr("cx", d => x(d.co2))
      .attr("cy", d => y(d.country) + y.bandwidth() / 2)
      .attr("r", 6)
      .attr("fill", "#ff6b35")
      .on("mouseover", (event, d) =>
        showTooltip(event, `<strong>${d.country}</strong><br/>Excluding LUC: ${d.co2.toFixed(1)} Mt`)
      )
      .on("mouseout", hideTooltip);

    // Circles including LUC
    svg.selectAll(".circle-include")
      .data(yearData)
      .enter()
      .append("circle")
      .attr("cx", d => x(d.co2_including_luc))
      .attr("cy", d => y(d.country) + y.bandwidth() / 2)
      .attr("r", 6)
      .attr("fill", "#4ecdc4")
      .on("mouseover", (event, d) =>
        showTooltip(event,
          `<strong>${d.country}</strong><br/>Including LUC: ${d.co2_including_luc.toFixed(1)} Mt<br/>Difference: +${(d.co2_including_luc - d.co2).toFixed(1)} Mt`
        )
      )
      .on("mouseout", hideTooltip);

    // Y-axis (left) - countries/regions
    svg.append("g")
      .attr("class", "axis")
      .call(d3.axisLeft(y))
      .selectAll("text")
      .style("font-size", "0.68rem")
      .style("text-anchor", "end");

    // X-axis (bottom) - emissions with reduced tick density
    svg.append("g")
      .attr("class", "axis")
      .attr("transform", `translate(0,${height})`)
      .call(
        d3.axisBottom(x)
          .ticks(5)
          .tickFormat(d => {
            if (d >= 1000) return (d / 1000).toFixed(0) + "k";
            return d.toFixed(0);
          })
      );

    // X-axis label
    svg.append("text")
      .attr("x", width / 2)
      .attr("y", height + 45)
      .attr("text-anchor", "middle")
      .style("font-family", "DM Mono, monospace")
      .style("font-size", "0.75rem")
      .style("fill", "var(--text-secondary)")
      .text("CO₂ Emissions (Mt)");

    // Mini legend
    const legendY = -15;
    svg.append("circle")
      .attr("cx", width - 200)
      .attr("cy", legendY)
      .attr("r", 5)
      .attr("fill", "#ff6b35");
    svg.append("text")
      .attr("x", width - 188)
      .attr("y", legendY + 4)
      .style("font-family", "DM Mono, monospace")
      .style("font-size", "0.7rem")
      .style("fill", "var(--text-secondary)")
      .text("Excluding LUC");

    svg.append("circle")
      .attr("cx", width - 90)
      .attr("cy", legendY)
      .attr("r", 5)
      .attr("fill", "#4ecdc4");
    svg.append("text")
      .attr("x", width - 78)
      .attr("y", legendY + 4)
      .style("font-family", "DM Mono, monospace")
      .style("font-size", "0.7rem")
      .style("fill", "var(--text-secondary)")
      .text("Including LUC");
  }

  document.getElementById("year-slider-5").addEventListener("input", update);
  update();
}

// =====================
// Chart 6: GHG lines
// =====================
function createChart6() {
  const margin = { top: 20, right: 120, bottom: 50, left: 80 };
  const width = document.getElementById("chart6").clientWidth - margin.left - margin.right;
  const height = 400 - margin.top - margin.bottom;

  const svg = d3.select("#chart6")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const gases = ["methane", "nitrous_oxide", "total_ghg"];
  const gasLabels = {
    methane: "Methane (CH₄)",
    nitrous_oxide: "Nitrous Oxide (N₂O)",
    total_ghg: "Total GHG"
  };

  const gasColors = d3.scaleOrdinal()
    .domain(gases)
    .range(["#ff6b35", "#4ecdc4", "#f7fff7"]);

  function update() {
    const country = document.getElementById("country-selector-6").value;
    const countryData = globalData
      .filter(d => d.country === country && (d.methane > 0 || d.nitrous_oxide > 0 || d.total_ghg > 0))
      .sort((a, b) => a.year - b.year);

    svg.selectAll("*").remove();
    if (countryData.length === 0) return;

    const x = d3.scaleLinear().domain(d3.extent(countryData, d => d.year)).range([0, width]);
    const y = d3.scaleLinear()
      .domain([0, d3.max(countryData, d => Math.max(d.methane, d.nitrous_oxide, d.total_ghg)) * 1.1])
      .range([height, 0]);

    svg.append("g").attr("class", "grid")
      .call(d3.axisLeft(y).tickSize(-width).tickFormat(""));

    const line = d3.line()
      .x(d => x(d.year))
      .curve(d3.curveMonotoneX);

    gases.forEach(gas => {
      line.y(d => y(d[gas]));
      svg.append("path")
        .datum(countryData)
        .attr("class", "line")
        .attr("d", line)
        .attr("stroke", gasColors(gas))
        .on("mouseover", (event) => showTooltip(event, `<strong>${gasLabels[gas]}</strong>`))
        .on("mouseout", hideTooltip);
    });

    svg.append("g").attr("class", "axis").attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(x).tickFormat(d3.format("d")));
    svg.append("g").attr("class", "axis").call(d3.axisLeft(y));

    const legend = d3.select("#legend6");
    legend.selectAll("*").remove();
    gases.forEach(gas => {
      const item = legend.append("div").attr("class", "legend-item");
      item.append("div").attr("class", "legend-color").style("background", gasColors(gas));
      item.append("span").attr("class", "legend-label").text(gasLabels[gas]);
    });
  }

  document.getElementById("country-selector-6").addEventListener("change", update);
  update();
}