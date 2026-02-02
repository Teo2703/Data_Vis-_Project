let globalData = [];
let selectedCountries = [];
let allCountries = [];

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
  const selector4 = document.getElementById("country-selector-4");
  const selector6 = document.getElementById("country-selector-6");

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
// Chart init
// =====================
function initializeCharts() {
  createChart1();
  createChart2();
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
    d.co2 > 0
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
    .domain([0, d3.max(filteredData, d => d.co2) * 1.1])
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
    .y(d => y(d.co2))
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
      .attr("cy", d => y(d.co2))
      .attr("r", 0)
      .attr("fill", color)
      .on("mouseover", function (event, d) {
        d3.select(this).attr("r", 5);
        showTooltip(event, `<strong>${country}</strong><br/>Year: ${d.year}<br/>CO₂: ${d.co2.toFixed(1)} Mt`);
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
      .filter(d => d.year === year && d.country !== "World" && d.co2_per_capita > 0)
      .sort((a, b) => b.co2_per_capita - a.co2_per_capita)
      .slice(0, 15);

    svg.selectAll("*").remove();

    if (yearData.length === 0) return;

    const x = d3.scaleLinear()
      .domain([0, d3.max(yearData, d => d.co2_per_capita) * 1.1])
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
      .attr("width", d => x(d.co2_per_capita))
      .attr("height", y.bandwidth())
      .attr("fill", d => getCountryColor(d.country))
      .attr("rx", 4)
      .style("opacity", 0.9)
      .on("mouseover", function (event, d) {
        d3.select(this).style("opacity", 1);
        showTooltip(event,
          `<strong>${d.country}</strong><br/>Per Capita: ${d.co2_per_capita.toFixed(2)} t/person<br/>Total: ${d.co2.toFixed(1)} Mt`
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
// Chart 3: GDP vs CO₂ Bubble Chart 
// =====================
function createChart3() {
  const margin = { top: 20, right: 40, bottom: 60, left: 80 };
  const container = document.getElementById("chart3");

  const svgRoot = d3.select(container)
    .append("svg");

  const g = svgRoot.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  function formatTrillions(v) {
    const t = v / 1e12;
    // show 1 decimal only when below 1T
    return `$${t.toFixed(v < 1e12 ? 1 : 0)}T`;
  }

  function formatBillions(v) {
  // Divide by 1e9 (1,000,000,000) for Billions
  const b = v / 1e9;
  
  // Show 1 decimal place only when the value is below 1 Billion
  // Otherwise, round to the nearest whole number
  return `$${b.toFixed(v < 1e9 ? 1 : 0)}B`;
}

  function buildPowerOf10Ticks(scale) {
    const [minV, maxV] = scale.domain();
    const minPow = Math.floor(Math.log10(minV));
    const maxPow = Math.ceil(Math.log10(maxV));
    return d3.range(minPow, maxPow + 1).map(p => Math.pow(10, p));
  }

  function update() {
    // Clear only the plot group (keep the same SVG)
    g.selectAll("*").remove();

    const year = +document.getElementById("year-slider-3").value;
    document.getElementById("year-display-3").textContent = year;

    const yearData = globalData
      .filter(d => d.year === year && d.country !== "World" && d.gdp > 0 && d.co2 > 0);

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

    // ---- scales ----
    const x = d3.scaleLog()
      .domain(d3.extent(yearData, d => d.gdp))
      .range([0, width])
      .nice();

    const y = d3.scaleLinear()
      .domain([0, d3.max(yearData, d => d.co2) * 1.1])
      .range([height, 0]);

    const size = d3.scaleSqrt()
      .domain([0, d3.max(yearData, d => d.population)])
      .range([3, 30]);

    // ---- grid ----
    g.append("g")
      .attr("class", "grid")
      .call(d3.axisLeft(y).tickSize(-width).tickFormat(""));

    // ---- bubbles ----
    g.selectAll(".bubble")
      .data(yearData, d => d.country) // key by country (stable binding)
      .enter()
      .append("circle")
      .attr("class", "bubble")
      .attr("cx", d => x(d.gdp))
      .attr("cy", d => y(d.co2))
      .attr("r", d => size(d.population))
      .attr("fill", d => getCountryColor(d.country)) // ✅ consistent by country
      .attr("opacity", 0.7)
      .attr("stroke", "#fff")
      .attr("stroke-width", 1)
      .on("mouseover", function (event, d) {
        d3.select(this).attr("opacity", 1).attr("stroke-width", 2);
        showTooltip(event, `
          <strong>${d.country}</strong><br/>
          GDP: ${formatBillions(d.gdp)}<br/>
          CO₂: ${d.co2.toFixed(1)} Mt<br/>
          Population: ${(d.population / 1e6).toFixed(0)}M
        `);
      })
      .on("mouseout", function () {
        d3.select(this).attr("opacity", 0.7).attr("stroke-width", 1);
        hideTooltip();
      });

    // ---- axes (dynamic but fixed-style log ticks) ----
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

    // ---- labels ----
    g.append("text")
      .attr("x", width / 2)
      .attr("y", height + 45)
      .attr("text-anchor", "middle")
      .style("font-family", "DM Mono, monospace")
      .style("font-size", "0.75rem")
      .style("fill", "var(--text-secondary)")
      .text("GDP (Trillion USD, log scale)");

    g.append("text")
      .attr("transform", "rotate(-90)")
      .attr("x", -height / 2)
      .attr("y", -60)
      .attr("text-anchor", "middle")
      .style("font-family", "DM Mono, monospace")
      .style("font-size", "0.75rem")
      .style("fill", "var(--text-secondary)")
      .text("CO₂ Emissions (Mt)");
  }

  // Wire slider
  document.getElementById("year-slider-3").addEventListener("input", update);

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
// Chart 5: Dumbbell
// =====================
function createChart5() {
  const margin = { top: 20, right: 40, bottom: 50, left: 140 };
  const width = document.getElementById("chart5").clientWidth - margin.left - margin.right;
  const height = 500 - margin.top - margin.bottom;

  const svg = d3.select("#chart5")
    .append("svg")
    .attr("width", width + margin.left + margin.right)
    .attr("height", height + margin.top + margin.bottom)
    .append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  function update() {
    const year = +document.getElementById("year-slider-5").value;
    document.getElementById("year-display-5").textContent = year;

    const yearData = globalData
      .filter(d => d.year === year && d.country !== "World" && d.co2 > 0 && d.co2_including_luc > 0)
      .sort((a, b) => b.co2_including_luc - a.co2_including_luc)
      .slice(0, 12);

    svg.selectAll("*").remove();
    if (yearData.length === 0) return;

    const x = d3.scaleLinear()
      .domain([0, d3.max(yearData, d => d.co2_including_luc) * 1.1])
      .range([0, width]);

    const y = d3.scaleBand()
      .domain(yearData.map(d => d.country))
      .range([0, height])
      .padding(0.3);

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

    svg.append("g").attr("class", "axis").call(d3.axisLeft(y));
    svg.append("g").attr("class", "axis").attr("transform", `translate(0,${height})`).call(d3.axisBottom(x));
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
