const PRAYER_NAMES = ["Imsak", "Subuh", "Syuruk", "Zohor", "Asar", "Maghrib", "Isyak"];
const audioQueue = [];
const recitationOffsetMin = 10;

let todayPrayerTimes = {};
let currentHijriDate = "";

function updateClock() {
  const now = new Date();
  document.getElementById("current-time").textContent = now.toLocaleTimeString();
  document.getElementById("gregorian-date").textContent = now.toDateString();

  checkAndUpdatePrayerHighlight(now);
  updateNextPrayerTimer(now);
}

function loadCSVandInit() {
  fetch("prayer_times.csv")
    .then(res => res.text())
    .then(csvText => {
      const lines = csvText.trim().split("\n");
      const headers = lines[0].split(",");
      const todayStr = formatDate(new Date()); // match "1-Jan-25"

      for (let i = 1; i < lines.length; i++) {
        const row = lines[i].split(",");
        if (row[0] === todayStr) {
          todayPrayerTimes = {};
          headers.forEach((h, idx) => {
            todayPrayerTimes[h.trim()] = row[idx].trim();
          });
          currentHijriDate = todayPrayerTimes["Date Hijri"];
          document.getElementById("hijri-date").textContent = `Hijri: ${currentHijriDate}`;
          populatePrayerTable(todayPrayerTimes);
          break;
        }
      }

      setInterval(updateClock, 1000);
      updateClock();
    });
}

function formatDate(date) {
  const day = date.getDate();
  const monthNames = ["Jan", "Feb", "Mac", "Apr", "Mei", "Jun", "Jul", "Ogos", "Sep", "Okt", "Nov", "Dis"];
  const month = monthNames[date.getMonth()];
  const year = date.getFullYear().toString().slice(-2);
  return `${day}-${month}-${year}`;
}

function parseTime(str) {
  const [time, modifier] = str.split(" ");
  let [hour, minute] = time.split(":").map(Number);
  if (modifier === "PM" && hour !== 12) hour += 12;
  if (modifier === "AM" && hour === 12) hour = 0;
  return { hour, minute };
}

function getTimeInMs(hour, minute) {
  const now = new Date();
  const time = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute, 0);
  return time.getTime();
}

function populatePrayerTable(data) {
  const tbody = document.querySelector("#prayer-table tbody");
  tbody.innerHTML = "";

  PRAYER_NAMES.forEach(name => {
    const time = data[name];
    const row = document.createElement("tr");
    row.setAttribute("data-prayer", name);
    row.innerHTML = `<td>${name}</td><td>${time}</td>`;
    tbody.appendChild(row);
  });
}

function checkAndUpdatePrayerHighlight(now) {
  let current = null;
  const nowMs = now.getTime();

  PRAYER_NAMES.forEach(name => {
    const { hour, minute } = parseTime(todayPrayerTimes[name]);
    const timeMs = getTimeInMs(hour, minute);
    if (nowMs >= timeMs) current = name;
  });

  const rows = document.querySelectorAll("#prayer-table tbody tr");
  rows.forEach(row => {
    row.classList.remove("current");
    if (row.getAttribute("data-prayer") === current) {
      row.classList.add("current");
    }
  });
}

function updateNextPrayerTimer(now) {
  const nowMs = now.getTime();
  let nextPrayer = null;
  let nextTimeMs = Infinity;

  PRAYER_NAMES.forEach(name => {
    const { hour, minute } = parseTime(todayPrayerTimes[name]);
    const timeMs = getTimeInMs(hour, minute);
    if (timeMs > nowMs && timeMs < nextTimeMs) {
      nextTimeMs = timeMs;
      nextPrayer = name;
    }
  });

  if (!nextPrayer) {
    document.getElementById("next-prayer-timer").textContent = "All prayers done for today.";
    return;
  }

  const diffMs = nextTimeMs - nowMs;
  const mins = Math.floor(diffMs / 60000);
  const secs = Math.floor((diffMs % 60000) / 1000);
  document.getElementById("next-prayer-timer").textContent =
    `Next prayer (${nextPrayer}) in ${mins}m ${secs}s`;

  // Audio triggers
  const reciteTime = nextTimeMs - recitationOffsetMin * 60000;
  if (Math.abs(nowMs - reciteTime) < 1000) {
    playAudio(`${nextPrayer.toLowerCase()}_recite.mp3`);
  }

  if (Math.abs(nowMs - nextTimeMs) < 1000) {
    playAudio(`${nextPrayer.toLowerCase()}_adhan.mp3`);
  }
}

function playAudio(filename) {
  const audio = new Audio(filename);
  audio.play().catch(e => console.error("Audio error:", e));
}

// Start
loadCSVandInit();
