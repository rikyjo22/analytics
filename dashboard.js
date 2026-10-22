(() => {
  'use strict';

  // Paste the deployed Apps Script web app URL here after deployment.
  const ENDPOINT = 'https://script.google.com/macros/s/AKfycbzVC4JyD1zlcZpUjjqiXbQdY1PnaX_ogMTK0Tm3Z359V9J1ChcoLTeG5LPxOvBfd6mcaQ/exec';
  const status = document.getElementById('dashboard-status');

  function showBars(targetId, values, formatter = (key) => key) {
    const target = document.getElementById(targetId);
    target.replaceChildren();
    const entries = Object.entries(values || {}).sort((a, b) => b[1] - a[1]).slice(0, 14);
    if (!entries.length) {
      const empty = document.createElement('p');
      empty.className = 'empty';
      empty.textContent = 'Belum ada data.';
      target.append(empty);
      return;
    }
    const max = Math.max(...entries.map(([, value]) => Number(value) || 0), 1);
    entries.forEach(([label, value]) => {
      const row = document.createElement('div');
      row.className = 'bar-row';
      const name = document.createElement('span');
      name.className = 'bar-label';
      name.textContent = formatter(label);
      const track = document.createElement('span');
      track.className = 'bar-track';
      const fill = document.createElement('span');
      fill.className = 'bar-fill';
      fill.style.width = `${Math.max(3, (Number(value) / max) * 100)}%`;
      track.append(fill);
      const count = document.createElement('span');
      count.className = 'bar-value';
      count.textContent = String(value);
      row.append(name, track, count);
      target.append(row);
    });
  }

  function renderVisitorDetails(data) {
    const details = data.visitorDetails || {};
    document.getElementById('detail-unique-total').textContent = String(data.uniqueVisitors || 0);
    document.getElementById('detail-returning').textContent = String(details.returningVisitors || 0);
    document.getElementById('detail-one-session').textContent = String(details.oneSessionVisitors || 0);
    showBars('detail-city-list', details.byCity, (key) => key);
    showBars('detail-language-list', details.byLanguage, (key) => key);
    showBars('detail-timezone-list', details.byTimeZone, (key) => key);
    showBars('detail-platform-list', details.byPlatform, (key) => key);
    const userList = document.getElementById('active-user-list');
    userList.replaceChildren();
    const people = data.people || [];
    document.getElementById('active-user-count').textContent = `${people.length} pengunjung`;
    if (!people.length) {
      const empty = document.createElement('p');
      empty.className = 'empty';
      empty.textContent = 'Belum ada pengunjung bernama dengan aktivitas pada periode ini.';
      userList.append(empty);
    } else {
      const eventLabels = {
        page_view: 'Membuka halaman',
        collection_open: 'Membuka koleksi',
        song_create_form_open: 'Membuka form lagu baru',
        song_save_submit: 'Mengirim form lagu',
        schedule_create: 'Membuat jadwal',
        profile_save: 'Menyimpan profil',
        location_share: 'Membagikan kota perkiraan'
      };
      const formatTime = (value) => {
        if (!value) return 'Waktu tidak diketahui';
        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? 'Waktu tidak diketahui' : new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
      };

      people.forEach((person) => {
        const row = document.createElement('details');
        row.className = 'person-item';
        const summary = document.createElement('summary');
        const name = document.createElement('strong');
        name.textContent = person.userName;
        const expandLabel = document.createElement('span');
        expandLabel.className = 'person-summary-meta';
        expandLabel.textContent = `${person.activityCount} activity`;
        summary.append(name, expandLabel);

        const profile = document.createElement('dl');
        profile.className = 'person-profile';
        const profileFields = [
          ['Kota', person.city], ['Negara', person.country], ['Bahasa', person.language],
          ['Browser', person.browser], ['Zona waktu', person.timeZone], ['Platform', person.platform],
          ['Sesi pada periode ini', person.sessionCount]
        ];
        profileFields.forEach(([label, value]) => {
          const term = document.createElement('dt');
          term.textContent = label;
          const description = document.createElement('dd');
          description.textContent = value === 0 ? '0' : String(value || 'Tidak tersedia');
          profile.append(term, description);
        });

        const activityDetails = document.createElement('details');
        activityDetails.className = 'person-activities';
        const activitySummary = document.createElement('summary');
        activitySummary.textContent = `Semua activity (${person.activityCount || 0})`;
        const activityList = document.createElement('ol');
        activityList.className = 'person-activity-list';
        (person.events || []).forEach((item) => {
          const activityItem = document.createElement('li');
          const activityTitle = document.createElement('strong');
          activityTitle.textContent = eventLabels[item.event] || String(item.event || 'Activity');
          const activityTime = document.createElement('time');
          activityTime.textContent = formatTime(item.occurredAt);
          const activityContext = document.createElement('span');
          activityContext.className = 'person-activity-context';
          activityContext.textContent = [item.collection, item.action, item.page].filter(Boolean).join(' · ');
          activityItem.append(activityTitle, activityTime);
          if (activityContext.textContent) activityItem.append(activityContext);
          activityList.append(activityItem);
        });
        activityDetails.append(activitySummary, activityList);
        row.append(summary, profile, activityDetails);
        userList.append(row);
      });
    }
  }

  function renderDashboard(data) {
    document.getElementById('total-events').textContent = String(data.totalEvents || 0);
    document.getElementById('unique-visitors').textContent = String(data.uniqueVisitors || 0);
    document.getElementById('page-views').textContent = String((data.byEvent || {}).page_view || 0);
    showBars('event-list', data.byEvent, (key) => key.replaceAll('_', ' '));
    showBars('day-list', data.byDay, (key) => key);
    showBars('collection-list', data.byCollection, (key) => key.replaceAll('_', ' '));
    showBars('page-list', data.byPage, (key) => key || '/');
    renderVisitorDetails(data);
    status.textContent = 'Data analytics berhasil diperbarui.';
  };

  const detailsDialog = document.getElementById('visitor-details-dialog');
  document.getElementById('unique-visitors-detail').addEventListener('click', () => detailsDialog.showModal());
  document.getElementById('close-visitor-details').addEventListener('click', () => detailsDialog.close());
  detailsDialog.addEventListener('click', (event) => { if (event.target === detailsDialog) detailsDialog.close(); });

  let requestNumber = 0;
  let activeScript = null;
  let requestTimeout = null;

  function localDateString(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function localDayRange(dateString) {
    const [year, month, day] = dateString.split('-').map(Number);
    const start = new Date(year, month - 1, day);
    const end = new Date(year, month - 1, day + 1);
    return { from: start.toISOString(), to: new Date(end.getTime() - 1).toISOString() };
  }

  function getSelectedRange() {
    const preset = document.getElementById('date-filter-preset').value;
    const today = new Date();
    const todayString = localDateString(today);
    if (preset === 'all') return { label: 'Menampilkan semua data' };
    if (preset === 'today') return { ...localDayRange(todayString), label: `Hari ini · ${todayString}` };
    if (preset === 'date') {
      const date = document.getElementById('single-date').value;
      return date ? { ...localDayRange(date), label: `Tanggal ${date}` } : null;
    }
    if (preset === 'range') {
      const fromDate = document.getElementById('from-date').value;
      const toDate = document.getElementById('to-date').value;
      if (!fromDate || !toDate || fromDate > toDate) return null;
      return { ...localDayRange(fromDate), to: localDayRange(toDate).to, label: `${fromDate} – ${toDate}` };
    }
    if (preset === 'week') {
      const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
      return { ...localDayRange(localDateString(monday)), to: today.toISOString(), label: `Minggu ini · ${localDateString(monday)} – ${todayString}` };
    }
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    return { ...localDayRange(localDateString(monthStart)), to: today.toISOString(), label: `Bulan ini · ${localDateString(monthStart)} – ${todayString}` };
  }

  function loadDashboard(range) {
    if (!ENDPOINT) {
      status.textContent = 'Atur URL deployment Apps Script pada dashboard.js untuk memuat data.';
      return;
    }
    if (!range) {
      status.textContent = 'Pilih tanggal yang valid. Tanggal awal harus sebelum atau sama dengan tanggal akhir.';
      return;
    }
    document.getElementById('active-period-label').textContent = range.label;
    status.textContent = 'Memuat analytics…';
    const requestId = ++requestNumber;
    if (activeScript) activeScript.remove();
    if (requestTimeout) window.clearTimeout(requestTimeout);
    const callbackName = `songbookAnalyticsCallback${requestId}`;
    window[callbackName] = (data) => {
      delete window[callbackName];
      if (requestId !== requestNumber) return;
      if (activeScript) activeScript.remove();
      renderDashboard(data);
    };
    const params = new URLSearchParams({ callback: callbackName });
    if (range.from) params.set('from', range.from);
    if (range.to) params.set('to', range.to);
    activeScript = document.createElement('script');
    activeScript.src = `${ENDPOINT}${ENDPOINT.includes('?') ? '&' : '?'}${params.toString()}`;
    activeScript.onerror = () => {
      if (requestId === requestNumber) status.textContent = 'Data tidak dapat dimuat. Periksa URL dan deployment Apps Script.';
      delete window[callbackName];
    };
    document.head.append(activeScript);
    requestTimeout = window.setTimeout(() => {
      if (requestId === requestNumber && status.textContent === 'Memuat analytics…') status.textContent = 'Permintaan timeout. Coba muat ulang halaman.';
      delete window[callbackName];
    }, 15000);
  }

  const presetSelect = document.getElementById('date-filter-preset');
  const singleDateWrap = document.getElementById('single-date-wrap');
  const fromDateWrap = document.getElementById('from-date-wrap');
  const toDateWrap = document.getElementById('to-date-wrap');
  const applyDateFilter = document.getElementById('apply-date-filter');
  const todayString = localDateString(new Date());
  document.getElementById('single-date').value = todayString;
  document.getElementById('from-date').value = todayString;
  document.getElementById('to-date').value = todayString;

  function updateFilterControls(loadQuickPreset = false) {
    const preset = presetSelect.value;
    singleDateWrap.hidden = preset !== 'date';
    fromDateWrap.hidden = preset !== 'range';
    toDateWrap.hidden = preset !== 'range';
    applyDateFilter.hidden = !['date', 'range'].includes(preset);
    if (loadQuickPreset) loadDashboard(getSelectedRange());
  }

  presetSelect.addEventListener('change', () => updateFilterControls(!['date', 'range'].includes(presetSelect.value)));
  applyDateFilter.addEventListener('click', () => loadDashboard(getSelectedRange()));
  loadDashboard(getSelectedRange());

})();
