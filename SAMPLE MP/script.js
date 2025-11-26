// script.js - interactions, translations, data placeholders
// Updated: weather + 3-day forecast + theme toggle + FULL-WIDTH HERO SLIDESHOW

const STREAMLIT_URL = "https://unseasonable-rain-crop-advisory-system.streamlit.app/";

// ---------------------------
// Translations (multilingual)
// ---------------------------
const translations = {
  en: {
    heroTitle: "KrishiMitra — Weather-Based Crop Advisory",
    heroSub: "Actionable, local advisories for Maharashtra farmers — crop choices, sowing windows and practical tips based on weather & soil.",
    getAdvisory: "Get Crop Advisory",
    predictNow: "Predict Crop Now"
  },
  mr: {
    heroTitle: "कृषिमित्र — हवामान आधारित पिक सल्ला",
    heroSub: "महाराष्ट्र शेतकरींसाठी उपयुक्त सल्ले — पिकांची निवड, पेरणी वेळ आणि माती/हवामान आधारित टिप्स.",
    getAdvisory: "पिक सल्ला मिळवा",
    predictNow: "आता पिक भाकीत करा"
  },
  hi: {
    heroTitle: "कृषिमित्र — मौसम आधारित फसल सलाह",
    heroSub: "महाराष्ट्र के किसानों के लिए व्यावहारिक सलाह — फसल विकल्प, रोपण विंडो और मौसम/मिट्टी पर सुझाव।",
    getAdvisory: "फसल सलाह प्राप्त करें",
    predictNow: "अब फसल अनुमान लगाएँ"
  }
};

// WAIT FOR DOM
document.addEventListener('DOMContentLoaded', () => {

  // ---------- LANGUAGE ----------
  const langSelect = document.getElementById('langSelect');
  langSelect?.addEventListener('change', e => applyLang(e.target.value));
  applyLang('en');

  function applyLang(lang){
    const t = translations[lang] || translations.en;

    document.getElementById('heroTitle').textContent = t.heroTitle;
    document.getElementById('heroSub').textContent = t.heroSub;
    document.getElementById('openAdvisoryBtn').textContent = t.getAdvisory;
    document.getElementById('predictCropBtn').textContent = t.predictNow;
  }

  // ---------- YEAR ----------
  const curYearEl = document.getElementById('curYear');
  if(curYearEl) curYearEl.textContent = new Date().getFullYear();

  // ---------- SOIL DATA ----------
  const soilMap = {
    black: { name: "Black Cotton Soil", crops: ["Cotton","Soybean","Jowar"], tips: "Retains moisture; good for cotton & soybean." },
    lateritic: { name: "Lateritic Soil", crops: ["Cashew","Millets"], tips: "Good drainage; add compost." },
    alluvial: { name: "Alluvial Soil", crops: ["Rice","Wheat"], tips: "Fertile soil; rich in nutrients." },
    red: { name: "Red Soil", crops: ["Maize","Pulses"], tips: "Low moisture; mulching recommended." }
  };

  function renderSoil(zone='black'){
    const s = soilMap[zone];
    document.getElementById('soilOutput').innerHTML = `
      <div class="font-semibold">${s.name}</div>
      <div class="text-sm text-muted mt-1">Suitable crops: ${s.crops.join(', ')}</div>
      <div class="text-sm text-muted mt-2">${s.tips}</div>
    `;
  }
  document.getElementById('soilZone')?.addEventListener('change', e => renderSoil(e.target.value));
  renderSoil('black');

  // ---------- CALENDAR ----------
  const calendar = [
    { month: "June - July", activity: "Kharif sowing (cotton, soybean, jowar)." },
    { month: "Aug - Sep", activity: "Intercultural operations & pest monitoring." },
    { month: "Oct - Nov", activity: "Harvest Kharif; prepare for Rabi." },
    { month: "Dec - Jan", activity: "Rabi maintenance: irrigation & fertilizer." },
    { month: "Feb - Mar", activity: "Rabi harvest; summer field prep." }
  ];

  function renderCalendar(){
    const el = document.getElementById('calendarList');
    el.innerHTML = calendar.map(c => `
      <div class="mb-3 p-3 bg-white rounded border">
        <div class="font-semibold">${c.month}</div>
        <div class="text-sm text-muted mt-1">${c.activity}</div>
      </div>
    `).join('');
  }
  renderCalendar();

  // ---------- WEATHER ----------
  const API_KEY = "5fa406d45112a1093a86b5b417f0bc89";

  function getWeather(lat, lon) {
    fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`)
      .then(r=>r.json())
      .then(data => {
        document.getElementById('tempDisplay').textContent = Math.round(data.main.temp)+"°C";
        document.getElementById('weatherDesc').textContent = data.weather[0].description;
        document.getElementById('locationName').textContent = data.name;
        document.getElementById('weatherIcon').src =
          `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`;
      })
      .catch(()=>console.log("Weather load failed"));
  }

  function getForecast(lat, lon){
    fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`)
      .then(r=>r.json())
      .then(data=>{
        const list = document.getElementById('forecastList');
        list.innerHTML = "";

        const days = data.list.filter(i=>i.dt_txt.includes("12:00:00")).slice(0,3);

        days.forEach(day=>{
          const date = new Date(day.dt*1000);
          const name = date.toLocaleDateString("en-US",{weekday:"short"});

          list.innerHTML += `
            <div class="flex items-center justify-between bg-white p-2 rounded border">
              <div>
                <div class="font-semibold text-accent-green">${name}</div>
                <div class="text-muted text-sm">Temp: ${Math.round(day.main.temp)}°C</div>
                <div class="text-muted text-sm">Rain: ${Math.round(day.pop*100)}%</div>
              </div>
              <img src="https://openweathermap.org/img/wn/${day.weather[0].icon}.png" class="h-10">
            </div>`;
        });
      });
  }

  if(navigator.geolocation){
    navigator.geolocation.getCurrentPosition(pos=>{
      getWeather(pos.coords.latitude, pos.coords.longitude);
      getForecast(pos.coords.latitude, pos.coords.longitude);
    }, ()=>{
      getWeather(18.5204,73.8567);
      getForecast(18.5204,73.8567);
    });
  }

  // ---------- BUTTONS ----------
  document.getElementById('openAdvisoryBtn')?.addEventListener('click', ()=>window.open(STREAMLIT_URL));
  document.getElementById('predictCropBtn')?.addEventListener('click', ()=>window.open(STREAMLIT_URL+"?predict=true"));
  document.getElementById('openInNewTab')?.addEventListener('click', ()=>window.open(STREAMLIT_URL));

  // ---------- THEME ----------
  const themeToggle = document.getElementById('themeToggle');
  const themeIcon = document.getElementById('themeIcon');

  const savedTheme = localStorage.getItem("km_theme");
  if(savedTheme==="dark"){
    document.body.classList.add("dark-mode");
    themeIcon.textContent = "☀️";
  }

  themeToggle?.addEventListener("click", ()=>{
    document.body.classList.toggle("dark-mode");
    const isDark = document.body.classList.contains("dark-mode");
    localStorage.setItem("km_theme", isDark?"dark":"light");
    themeIcon.textContent = isDark?"☀️":"🌙";
  });

  // ------------------------------------------------
  //  TOP HERO SLIDESHOW (auto-play, fixed)
  // ------------------------------------------------
  const heroSlides = document.querySelectorAll(".hero-slide");
  let heroIndex = 0;

  function updateHeroSlide(){
    heroSlides.forEach((s,i)=>s.classList.toggle("active",i===heroIndex));
    heroIndex = (heroIndex+1) % heroSlides.length;
  }

  updateHeroSlide();
  setInterval(updateHeroSlide, 2500);

});
