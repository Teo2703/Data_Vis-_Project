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
  if (typeof updateChart2 === "function") updateChart2();
  createChart3();
}

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

  const legend = d3.select("#legend1");
  legend.selectAll("*").remove();
  selectedCountries.forEach((country) => {
    const item = legend.append("div").attr("class", "legend-item");
    item.append("div").attr("class", "legend-color").style("background", getCountryColor(country));
    item.append("span").attr("class", "legend-label").text(country);
  });
}

// =====================
// Chart 2: Per-capita rank (fixed)
// =====================
let chart2Ctx = null;
function createChart2() {
  const margin = { top: 20, right: 40, bottom: 50, left: 140 };
  const width = document.getElementById("chart2").clientWidth - margin.left - margin.right;
  const height = 500 - margin.top - margin.bottom;

  d3.select("#chart2").selectAll("*").remove();

  const svg = d3.select("#chart2")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const yAxisG = svg.append("g").attr("class", "axis y-axis");
  const xAxisG = svg.append("g").attr("class", "axis x-axis")
    .attr("transform", `translate(0,${height})`);

  svg.append("text")
    .attr("x", width / 2)
    .attr("y", height + 40)
    .attr("text-anchor", "middle")
    .style("font-family", "DM Mono, monospace")
    .style("font-size", "0.75rem")
    .style("fill", "var(--text-secondary)")
    .text("CO₂ per Capita (tonnes/person)");

  chart2Ctx = { svg, width, height, xAxisG, yAxisG };

  updateChart2();

  document.getElementById("year-slider-2").oninput = () => updateChart2();
}

function updateChart2() {
  if (!chart2Ctx) return;

  const { svg, width, height, xAxisG, yAxisG } = chart2Ctx;

  const year = +document.getElementById("year-slider-2").value;
  document.getElementById("year-display-2").textContent = year;

  const yearData = globalData
    .filter(d => d.year === year && d.country !== "World" && getCO2PerCapitaValue(d) > 0)
    .sort((a, b) => getCO2PerCapitaValue(b) - getCO2PerCapitaValue(a))
    .slice(0, 15);

  if (yearData.length === 0) {
    svg.selectAll("rect.bar").remove();
    return;
  }

  const x = d3.scaleLinear()
    .domain([0, d3.max(yearData, d => getCO2PerCapitaValue(d)) * 1.1])
    .range([0, width]);

  const y = d3.scaleBand()
    .domain(yearData.map(d => d.country))
    .range([0, height])
    .padding(0.2);

  const bars = svg.selectAll("rect.bar")
    .data(yearData, d => d.country);

  bars.exit().remove();

  bars
    .transition().duration(250)
    .attr("x", 0)
    .attr("y", d => y(d.country))
    .attr("width", d => x(getCO2PerCapitaValue(d)))
    .attr("height", y.bandwidth());

  bars.enter()
    .append("rect")
    .attr("class", "bar")
    .attr("x", 0)
    .attr("y", d => y(d.country))
    .attr("height", y.bandwidth())
    .attr("width", 0)
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
    })
    .transition().duration(250)
    .attr("width", d => x(getCO2PerCapitaValue(d)));

  yAxisG.call(d3.axisLeft(y));
  xAxisG.call(d3.axisBottom(x));
}

// (rest of your file stays the same from Chart 3 onwards)