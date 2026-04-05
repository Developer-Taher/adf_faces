// ==========================================
//  VIN Decoder - NHTSA Free API
// ==========================================

const NHTSA_URL = 'https://vpic.nhtsa.dot.gov/api/vehicles/decodevin/';

// Update char count
document.getElementById('vinInput').addEventListener('input', function () {
  const val = this.value.toUpperCase().replace(/[^A-HJ-NPR-Z0-9]/g, '');
  this.value = val;
  document.getElementById('charCount').textContent = `${val.length}/17`;
  if (val.length === 17) {
    document.getElementById('charCount').style.color = '#6ee7b7';
  } else {
    document.getElementById('charCount').style.color = '#64748b';
  }
});

// Enter key
document.getElementById('vinInput').addEventListener('keydown', function (e) {
  if (e.key === 'Enter') decodeVIN();
});

function setSample(vin) {
  document.getElementById('vinInput').value = vin;
  document.getElementById('charCount').textContent = `${vin.length}/17`;
  document.getElementById('charCount').style.color = '#6ee7b7';
}

async function decodeVIN() {
  const vin = document.getElementById('vinInput').value.trim().toUpperCase();
  const errorCard = document.getElementById('errorCard');
  const results = document.getElementById('results');

  // Hide previous
  errorCard.classList.add('hidden');
  results.classList.add('hidden');

  // Validate
  if (!vin) {
    showError('الرجاء إدخال رقم الهيكل (VIN)');
    return;
  }
  if (vin.length !== 17) {
    showError(`رقم الهيكل يجب أن يكون 17 خانة — أنت أدخلت ${vin.length} خانة فقط`);
    return;
  }
  if (/[IOQ]/.test(vin)) {
    showError('رقم الهيكل لا يحتوي على الحروف I أو O أو Q');
    return;
  }

  // Loading state
  setLoading(true);

  try {
    const res = await fetch(`${NHTSA_URL}${vin}?format=json`);
    if (!res.ok) throw new Error('فشل الاتصال بالخادم');
    const data = await res.json();
    const items = data.Results;

    // Check for errors
    const errorCode = getValue(items, 'Error Code');
    if (errorCode && errorCode !== '0') {
      const errText = getValue(items, 'Error Text') || 'رقم الهيكل غير صحيح أو غير موجود في قاعدة البيانات';
      showError(`خطأ: ${errText}`);
      return;
    }

    const make = getValue(items, 'Make');
    const model = getValue(items, 'Model');
    if (!make && !model) {
      showError('لم يتم العثور على معلومات لهذا الرقم. تأكد من صحة رقم الهيكل.');
      return;
    }

    renderResults(items, vin);

  } catch (err) {
    showError('حدث خطأ في الاتصال. تأكد من اتصال الإنترنت وحاول مجدداً.');
    console.error(err);
  } finally {
    setLoading(false);
  }
}

function getValue(items, variableName) {
  const item = items.find(i => i.Variable === variableName);
  return item && item.Value && item.Value !== 'Not Applicable' && item.Value !== 'null' ? item.Value : null;
}

function renderResults(items, vin) {
  // ---- Car Title ----
  const make = getValue(items, 'Make') || '—';
  const model = getValue(items, 'Model') || '—';
  const year = getValue(items, 'Model Year') || '—';
  const trim = getValue(items, 'Trim') || '';
  const bodyType = getValue(items, 'Body Class') || '';
  const country = getValue(items, 'Plant Country') || '';
  const manufacturer = getValue(items, 'Manufacturer Name') || '';

  document.getElementById('carTitle').textContent = `${year} ${make} ${model} ${trim}`.trim();

  // Badges
  const badgesEl = document.getElementById('carBadges');
  badgesEl.innerHTML = '';
  if (year !== '—') badgesEl.innerHTML += `<span class="badge badge-year">📅 ${year}</span>`;
  if (country) badgesEl.innerHTML += `<span class="badge badge-origin">🌍 ${translateCountry(country)}</span>`;
  if (bodyType) badgesEl.innerHTML += `<span class="badge badge-type">🚗 ${translateBodyType(bodyType)}</span>`;

  // ---- Stats Grid ----
  const engineHP = getValue(items, 'Engine Brake (hp) From');
  const engineCC = getValue(items, 'Displacement (CC)');
  const engineL = getValue(items, 'Displacement (L)');
  const cylinders = getValue(items, 'Engine Number of Cylinders');
  const fuelType = getValue(items, 'Fuel Type - Primary');
  const driveType = getValue(items, 'Drive Type');
  const transmission = getValue(items, 'Transmission Style');
  const seats = getValue(items, 'Seat Rows');
  const doors = getValue(items, 'Doors');
  const plantCity = getValue(items, 'Plant City') || '';
  const plantState = getValue(items, 'Plant State') || '';

  const stats = [
    { icon: '🏎️', value: engineHP ? `${engineHP} HP` : '—', label: 'قوة المحرك' },
    { icon: '⚙️', value: engineCC ? `${parseFloat(engineCC).toFixed(0)} CC` : (engineL ? `${parseFloat(engineL).toFixed(1)} L` : '—'), label: 'حجم المحرك' },
    { icon: '🔢', value: cylinders ? `${cylinders} سلندر` : '—', label: 'عدد الأسطوانات' },
    { icon: '⛽', value: fuelType ? translateFuel(fuelType) : '—', label: 'نوع الوقود' },
    { icon: '🔄', value: driveType ? translateDrive(driveType) : '—', label: 'نظام الدفع' },
    { icon: '🚪', value: doors || '—', label: 'عدد الأبواب' },
    { icon: '🪑', value: seats ? `${seats} صفوف` : '—', label: 'صفوف المقاعد' },
    { icon: '📍', value: country ? translateCountry(country) : '—', label: 'بلد التصنيع' },
  ];

  const statsGrid = document.getElementById('statsGrid');
  statsGrid.innerHTML = stats.map(s => `
    <div class="stat-card">
      <div class="stat-icon">${s.icon}</div>
      <div class="stat-value">${s.value}</div>
      <div class="stat-label">${s.label}</div>
    </div>
  `).join('');

  // ---- Info Sections ----
  const sections = [
    {
      title: '🏭 معلومات الشركة المصنعة',
      rows: [
        ['الشركة المصنعة', make],
        ['المصنع الرسمي', manufacturer],
        ['البلد', country ? translateCountry(country) : null],
        ['المدينة', [plantCity, plantState].filter(Boolean).join(', ') || null],
        ['الموديل', model],
        ['الإصدار (Trim)', trim],
      ]
    },
    {
      title: '🔧 المحرك والأداء',
      rows: [
        ['قوة المحرك (HP)', engineHP],
        ['حجم المحرك (CC)', engineCC ? parseFloat(engineCC).toFixed(0) : null],
        ['حجم المحرك (L)', engineL ? parseFloat(engineL).toFixed(1) : null],
        ['عدد الأسطوانات', cylinders],
        ['نوع الوقود', fuelType ? translateFuel(fuelType) : null],
        ['نظام الوقود', getValue(items, 'Fuel Type - Secondary') ? translateFuel(getValue(items, 'Fuel Type - Secondary')) : null],
        ['نوع المحرك', getValue(items, 'Engine Model')],
        ['ترتيب المحرك', getValue(items, 'Engine Configuration')],
      ]
    },
    {
      title: '🚗 هيكل السيارة',
      rows: [
        ['نوع الهيكل', bodyType ? translateBodyType(bodyType) : null],
        ['عدد الأبواب', doors],
        ['عدد صفوف المقاعد', seats],
        ['نظام الدفع', driveType ? translateDrive(driveType) : null],
        ['ناقل الحركة', transmission ? translateTransmission(transmission) : null],
        ['الوزن الإجمالي', getValue(items, 'GVWR From')],
      ]
    },
    {
      title: '🛡️ الأمان والمعايير',
      rows: [
        ['نظام المكابح', getValue(items, 'Anti-Brake System (ABS)')],
        ['نظام السيطرة الديناميكية', getValue(items, 'Electronic Stability Control (ESC)')],
        ['نظام التحذير من خروج المسار', getValue(items, 'Lane Departure Warning (LDW)')],
        ['وسائد هوائية أمامية', getValue(items, 'Air Bag Locations Front')],
        ['وسائد هوائية جانبية', getValue(items, 'Air Bag Locations Side')],
        ['نظام مراقبة ضغط الإطارات', getValue(items, 'Tire Pressure Monitoring System (TPMS) Type')],
        ['نظام تحذير الاصطدام', getValue(items, 'Forward Collision Warning (FCW)')],
      ]
    },
  ];

  const sectionsEl = document.getElementById('infoSections');
  sectionsEl.innerHTML = sections.map(section => {
    const validRows = section.rows.filter(r => r[1]);
    if (!validRows.length) return '';
    return `
      <div class="info-card">
        <h3>${section.title}</h3>
        ${validRows.map(([k, v]) => `
          <div class="info-row">
            <span class="info-key">${k}</span>
            <span class="info-val">${v}</span>
          </div>
        `).join('')}
      </div>
    `;
  }).join('');

  // ---- VIN Visual Breakdown ----
  const vinVisual = buildVINVisual(vin);
  sectionsEl.innerHTML += `
    <div class="info-card" style="grid-column: 1 / -1;">
      <h3>🔍 تفصيل رقم الهيكل (VIN)</h3>
      ${vinVisual}
    </div>
  `;

  // ---- Full Data Table ----
  const tableWrapper = document.getElementById('fullDataTable');
  const validItems = items.filter(i => i.Value && i.Value !== 'Not Applicable' && i.Value !== 'null' && i.Value !== '0');
  tableWrapper.innerHTML = `
    <table class="data-table">
      ${validItems.map(i => `
        <tr>
          <td>${i.Variable}</td>
          <td>${i.Value}</td>
        </tr>
      `).join('')}
    </table>
  `;

  // Show results
  document.getElementById('results').classList.remove('hidden');
  document.getElementById('results').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function buildVINVisual(vin) {
  const chars = vin.split('').map((c, i) => {
    let cls = '';
    if (i < 3) cls = 'wmi';       // World Manufacturer Identifier
    else if (i < 9) cls = 'vds';   // Vehicle Descriptor Section
    else cls = 'vis';              // Vehicle Identifier Section
    return `<div class="vin-char ${cls}"><span>${c}</span><span class="pos">${i + 1}</span></div>`;
  });

  return `
    <div class="vin-visual">
      <div class="vin-chars">${chars.join('')}</div>
      <div class="vin-legend">
        <div class="legend-item"><div class="legend-dot" style="background:#6366f1"></div> WMI: الشركة المصنعة (1-3)</div>
        <div class="legend-item"><div class="legend-dot" style="background:#10b981"></div> VDS: وصف السيارة (4-9)</div>
        <div class="legend-item"><div class="legend-dot" style="background:#f59e0b"></div> VIS: رقم التسلسل (10-17)</div>
      </div>
    </div>
  `;
}

function toggleTable() {
  const table = document.getElementById('fullDataTable');
  const icon = document.getElementById('toggleIcon');
  table.classList.toggle('open');
  icon.classList.toggle('open');
}

function showError(msg) {
  document.getElementById('errorMsg').textContent = msg;
  document.getElementById('errorCard').classList.remove('hidden');
}

function setLoading(loading) {
  const btn = document.getElementById('searchBtn');
  const btnText = btn.querySelector('.btn-text');
  const loader = document.getElementById('btnLoader');
  if (loading) {
    btnText.classList.add('hidden');
    loader.classList.remove('hidden');
    btn.disabled = true;
  } else {
    btnText.classList.remove('hidden');
    loader.classList.add('hidden');
    btn.disabled = false;
  }
}

// ==========================================
//  Translation Helpers (English → Arabic)
// ==========================================

function translateCountry(country) {
  const map = {
    'UNITED STATES (USA)': '🇺🇸 الولايات المتحدة',
    'UNITED STATES': '🇺🇸 الولايات المتحدة',
    'USA': '🇺🇸 الولايات المتحدة',
    'CANADA': '🇨🇦 كندا',
    'GERMANY': '🇩🇪 ألمانيا',
    'JAPAN': '🇯🇵 اليابان',
    'SOUTH KOREA': '🇰🇷 كوريا الجنوبية',
    'KOREA': '🇰🇷 كوريا',
    'CHINA': '🇨🇳 الصين',
    'UNITED KINGDOM': '🇬🇧 المملكة المتحدة',
    'UK': '🇬🇧 المملكة المتحدة',
    'FRANCE': '🇫🇷 فرنسا',
    'ITALY': '🇮🇹 إيطاليا',
    'SWEDEN': '🇸🇪 السويد',
    'MEXICO': '🇲🇽 المكسيك',
    'AUSTRALIA': '🇦🇺 أستراليا',
    'BRAZIL': '🇧🇷 البرازيل',
    'INDIA': '🇮🇳 الهند',
    'SPAIN': '🇪🇸 إسبانيا',
    'CZECH REPUBLIC': '🇨🇿 التشيك',
    'SLOVAKIA': '🇸🇰 سلوفاكيا',
    'HUNGARY': '🇭🇺 المجر',
    'TURKEY': '🇹🇷 تركيا',
    'SOUTH AFRICA': '🇿🇦 جنوب أفريقيا',
  };
  return map[country?.toUpperCase()] || country;
}

function translateBodyType(body) {
  if (!body) return body;
  const lower = body.toLowerCase();
  if (lower.includes('sedan')) return 'سيدان';
  if (lower.includes('suv') || lower.includes('sport utility')) return 'دفع رباعي (SUV)';
  if (lower.includes('pickup')) return 'بيك أب';
  if (lower.includes('coupe')) return 'كوبيه';
  if (lower.includes('convertible') || lower.includes('cabriolet')) return 'مكشوفة';
  if (lower.includes('hatchback')) return 'هاتشباك';
  if (lower.includes('wagon') || lower.includes('estate')) return 'ستيشن واجن';
  if (lower.includes('van')) return 'فان';
  if (lower.includes('truck')) return 'شاحنة';
  if (lower.includes('minivan')) return 'ميني فان';
  if (lower.includes('crossover')) return 'كروس أوفر';
  if (lower.includes('roadster')) return 'رودستر';
  return body;
}

function translateFuel(fuel) {
  if (!fuel) return fuel;
  const lower = fuel.toLowerCase();
  if (lower.includes('gasoline') || lower.includes('petrol')) return '⛽ بنزين';
  if (lower.includes('diesel')) return '⛽ ديزل';
  if (lower.includes('electric')) return '⚡ كهربائي';
  if (lower.includes('hybrid') && lower.includes('plug')) return '🔌 هجين قابل للشحن';
  if (lower.includes('hybrid')) return '🔋 هجين';
  if (lower.includes('natural gas') || lower.includes('cng')) return '💨 غاز طبيعي';
  if (lower.includes('hydrogen') || lower.includes('fuel cell')) return '💧 هيدروجين';
  if (lower.includes('flex') || lower.includes('ethanol')) return '🌽 إيثانول';
  return fuel;
}

function translateDrive(drive) {
  if (!drive) return drive;
  const lower = drive.toLowerCase();
  if (lower.includes('4wd') || lower.includes('4x4') || lower.includes('four')) return '4×4 دفع رباعي';
  if (lower.includes('awd') || lower.includes('all-wheel') || lower.includes('all wheel')) return 'دفع كل العجلات (AWD)';
  if (lower.includes('fwd') || lower.includes('front')) return 'دفع أمامي (FWD)';
  if (lower.includes('rwd') || lower.includes('rear')) return 'دفع خلفي (RWD)';
  return drive;
}

function translateTransmission(trans) {
  if (!trans) return trans;
  const lower = trans.toLowerCase();
  if (lower.includes('automatic')) return '🔄 أوتوماتيك';
  if (lower.includes('manual') || lower.includes('standard')) return '🖐️ يدوي (عادي)';
  if (lower.includes('cvt')) return '∞ CVT (متغير مستمر)';
  if (lower.includes('dual') || lower.includes('dct') || lower.includes('dsg')) return '⚡ نصف أوتوماتيك (DCT)';
  return trans;
}
