(() => {
  'use strict';

  // Paste the deployed Apps Script web app URL here after deployment.
  const ENDPOINT = 'https://script.google.com/macros/s/AKfycbwVdFQjy-ze_9o33IJpwH6QwArRwiPcTv1ZDeN0pEhibKBCU1jIS-3NEelscOEdNt8YpA/exec';
  const themeToggle = document.getElementById('theme-toggle');
  const themeStorageKey = 'psallo-analytics-theme';
  function setTheme(theme, save = true) {
    const isDark = theme === 'dark';
    document.documentElement.dataset.theme = isDark ? 'dark' : 'light';
    themeToggle.setAttribute('aria-label', isDark ? 'Aktifkan light mode' : 'Aktifkan dark mode');
    themeToggle.title = isDark ? 'Aktifkan light mode' : 'Aktifkan dark mode';
    themeToggle.querySelector('span').textContent = isDark ? 'Light mode' : 'Dark mode';
    document.querySelector('meta[name="theme-color"]').content = isDark ? '#17211b' : '#f5f7f4';
    if (save) {
      try { localStorage.setItem(themeStorageKey, isDark ? 'dark' : 'light'); }
      catch (error) { /* Theme still works for this page view when storage is unavailable. */ }
    }
  }
  let preferredTheme = 'light';
  try { preferredTheme = localStorage.getItem(themeStorageKey) || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'); }
  catch (error) { preferredTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'; }
  setTheme(preferredTheme, false);
  themeToggle.addEventListener('click', () => setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'));
  const status = document.getElementById('dashboard-status');
  const removeVisitorDialog = document.getElementById('remove-visitor-dialog');
  const removeVisitorStatus = document.getElementById('remove-visitor-status');
  const removeVisitorButton = document.getElementById('confirm-remove-visitor');
  let pendingVisitorRemoval = null;
  let pendingRemovalVerification = null;
  let activeRange = null;

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
    document.getElementById('detail-unique-total').textContent = String(data.namedVisitors || 0);
    document.getElementById('detail-returning').textContent = String(details.returningVisitors || 0);
    document.getElementById('detail-one-session').textContent = String(details.oneSessionVisitors || 0);
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
      const activityDescription = (item) => {
        const schedule = item.scheduleName ? ` “${item.scheduleName}”` : '';
        const song = item.songTitle ? ` “${item.songTitle}”` : '';
        switch (item.event) {
          case 'schedule_create_success': return `Berhasil membuat jadwal${schedule}`;
          case 'schedule_rename_success': return `Berhasil mengubah nama jadwal dari “${item.previousName || 'Tanpa nama'}” menjadi${schedule}`;
          case 'schedule_share_success': return `Berhasil membagikan jadwal${schedule}`;
          case 'schedule_pull_success': return `Berhasil menarik jadwal${schedule}`;
          case 'song_create_success': return `Berhasil menambah lagu${song}`;
          case 'song_edit_success': return `Berhasil mengubah lagu${song}`;
          case 'song_add_to_schedule_success': {
            const categoryLabels = { PS: 'Psallo', NR: 'Nyanyian Rohani', SP: 'Tambahan', ZR: 'Zangkoor', KMR: 'Kaum Muda', SM: 'Sekolah Minggu', OTH: 'Other' };
            const category = categoryLabels[item.songCategory] || item.songCategory;
            const book = [category, item.songNumber ? `nomor ${item.songNumber}` : ''].filter(Boolean).join(' ');
            return `Berhasil memasukkan ${book ? `${book} ` : ''}${song || 'lagu'} ke jadwal${schedule}`;
          }
          default: return 'Aktivitas berhasil';
        }
      };
      const formatTime = (value) => {
        if (!value) return 'Waktu tidak diketahui';
        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? 'Waktu tidak diketahui' : new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
      };

      people.forEach((person, index) => {
        const row = document.createElement('article');
        row.className = 'person-item';
        const summary = document.createElement('div');
        summary.className = 'person-item-heading';
        const toggle = document.createElement('button');
        toggle.type = 'button';
        toggle.className = 'person-item-toggle';
        toggle.setAttribute('aria-expanded', 'false');
        toggle.setAttribute('aria-controls', `visitor-profile-${index}`);
        const name = document.createElement('strong');
        name.textContent = person.userName;
        const expandLabel = document.createElement('span');
        expandLabel.className = 'person-summary-meta';
        expandLabel.textContent = `${person.activityCount} activity`;
        const removeButton = document.createElement('button');
        removeButton.className = 'remove-visitor-trigger';
        removeButton.type = 'button';
        removeButton.textContent = 'Remove';
        removeButton.setAttribute('aria-label', `Remove data ${person.userName}`);
        removeButton.disabled = !person.visitorId;
        removeButton.title = person.visitorId ? 'Hapus semua data pengunjung ini' : 'Perbarui deployment Apps Script untuk mengaktifkan penghapusan';
        removeButton.addEventListener('click', (event) => {
          event.preventDefault();
          event.stopPropagation();
          if (!person.visitorId) return;
          pendingVisitorRemoval = { visitorId: person.visitorId, userName: person.userName };
          document.getElementById('remove-visitor-name').textContent = person.userName;
          removeVisitorStatus.textContent = '';
          removeVisitorDialog.showModal();
        });
        toggle.append(name, expandLabel);
        summary.append(toggle, removeButton);
        const profileContent = document.createElement('div');
        profileContent.id = `visitor-profile-${index}`;
        profileContent.className = 'person-item-content';
        profileContent.hidden = true;
        toggle.addEventListener('click', () => {
          const isOpen = toggle.getAttribute('aria-expanded') !== 'true';
          toggle.setAttribute('aria-expanded', String(isOpen));
          profileContent.hidden = !isOpen;
          row.classList.toggle('is-open', isOpen);
        });

        const profile = document.createElement('dl');
        profile.className = 'person-profile';
        const profileFields = [
          ['Bahasa', person.language],
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
          activityTitle.textContent = activityDescription(item);
          const activityTime = document.createElement('time');
          activityTime.textContent = formatTime(item.occurredAt);
          const activityContext = document.createElement('span');
          activityContext.className = 'person-activity-context';
          activityContext.textContent = [item.songTitle && item.event !== 'song_create_success' && item.event !== 'song_edit_success' ? `Lagu: ${item.songTitle}` : '', item.songCategory, item.songNumber].filter(Boolean).join(' · ');
          activityItem.append(activityTitle, activityTime);
          if (activityContext.textContent) activityItem.append(activityContext);
          activityList.append(activityItem);
        });
        if (!person.events?.length) {
          const visitOnly = document.createElement('li');
          visitOnly.className = 'empty';
          visitOnly.textContent = 'Kunjungan halaman tercatat; belum ada aktivitas lain.';
          activityList.append(visitOnly);
        }
        activityDetails.append(activitySummary, activityList);
        profileContent.append(profile, activityDetails);
        row.append(summary, profileContent);
        userList.append(row);
      });
    }
  }

  function renderVisitorTrend(data, preset) {
    const panel = document.getElementById('visitor-trend-panel');
    const chart = document.getElementById('visitor-trend-chart');
    const empty = document.getElementById('visitor-trend-empty');
    const visible = preset === 'week' || preset === 'month';
    panel.hidden = !visible;
    if (!visible) return;

    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    if (preset === 'week') firstDay.setDate(firstDay.getDate() - ((firstDay.getDay() + 6) % 7));
    else firstDay.setDate(1);
    const days = [];
    for (const day = new Date(firstDay); day <= today; day.setDate(day.getDate() + 1)) days.push(localDateString(day));
    const counts = data.uniqueVisitorsByDay || {};
    const values = days.map((date) => Number(counts[date]) || 0);
    const hasVisitors = values.some((value) => value > 0);
    chart.replaceChildren();
    chart.hidden = !hasVisitors;
    empty.hidden = hasVisitors;
    document.getElementById('visitor-trend-title').textContent = preset === 'week' ? 'Pengunjung minggu ini' : 'Pengunjung bulan ini';
    if (!hasVisitors) return;

    const ns = 'http://www.w3.org/2000/svg';
    const add = (tag, attrs, parent = chart) => {
      const node = document.createElementNS(ns, tag);
      Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, String(value)));
      parent.append(node);
      return node;
    };
    const width = 820, height = 300, left = 48, right = 18, top = 18, bottom = 42;
    const plotWidth = width - left - right, plotHeight = height - top - bottom;
    const maxValue = Math.max(...values, 1);
    const chartMax = Math.max(4, Math.ceil(maxValue / 4) * 4);
    for (let tick = 0; tick <= 4; tick += 1) {
      const value = chartMax * (4 - tick) / 4;
      const y = top + (plotHeight * tick / 4);
      add('line', { x1: left, y1: y, x2: width - right, y2: y, class: 'trend-grid-line' });
      const label = add('text', { x: left - 10, y: y + 4, 'text-anchor': 'end', class: 'trend-axis-label' });
      label.textContent = String(value);
    }
    const points = values.map((value, index) => ({
      x: days.length === 1 ? left + plotWidth / 2 : left + plotWidth * index / (days.length - 1),
      y: top + plotHeight * (1 - value / chartMax), value, date: days[index]
    }));
    add('polyline', { points: points.map((point) => `${point.x},${point.y}`).join(' '), class: 'trend-line' });
    points.forEach((point, index) => {
      add('circle', { cx: point.x, cy: point.y, r: 4, class: 'trend-point' });
      const markerTitle = add('title', {}, chart.lastElementChild);
      markerTitle.textContent = `${point.date}: ${point.value} pengunjung`;
      if (days.length <= 7 || index === 0 || index === days.length - 1 || index % 5 === 0) {
        const date = new Date(`${point.date}T12:00:00`);
        const label = add('text', { x: point.x, y: height - 14, 'text-anchor': 'middle', class: 'trend-axis-label' });
        label.textContent = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short' }).format(date);
      }
    });
  }

  function renderDashboard(data, range) {
    if (data && data.error) {
      status.textContent = pendingRemovalVerification
        ? `Data ${pendingRemovalVerification.userName} belum berhasil dihapus.`
        : 'Data tidak dapat dimuat. Periksa URL dan deployment Apps Script.';
      pendingRemovalVerification = null;
      return;
    }
    document.getElementById('unique-visitors').textContent = String(data.namedVisitors || 0);
    document.getElementById('unique-visitors-label').textContent = 'Pengunjung dikenali';
    renderVisitorTrend(data, range.preset);
    renderVisitorDetails(data);
    document.getElementById('anonymous-visitors').textContent = String(data.anonymousVisitors || 0);
    if (pendingRemovalVerification) {
      const stillPresent = (data.people || []).some((person) => person.visitorId === pendingRemovalVerification.visitorId);
      status.textContent = stillPresent
        ? `Data ${pendingRemovalVerification.userName} belum berhasil dihapus.`
        : `Data ${pendingRemovalVerification.userName} berhasil dihapus.`;
      pendingRemovalVerification = null;
    } else status.textContent = '';
  };

  async function removeSelectedVisitor() {
    if (!pendingVisitorRemoval || !pendingVisitorRemoval.visitorId) return;
    const visitor = pendingVisitorRemoval;
    removeVisitorButton.disabled = true;
    removeVisitorStatus.textContent = 'Menghapus semua data pengunjung…';
    try {
      await fetch(ENDPOINT, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action: 'remove_visitor', visitorId: visitor.visitorId }),
        keepalive: true
      });
      pendingRemovalVerification = visitor;
      pendingVisitorRemoval = null;
      removeVisitorDialog.close();
      loadDashboard(activeRange || getSelectedRange());
    } catch (error) {
      removeVisitorStatus.textContent = 'Data tidak dapat dihapus. Periksa koneksi lalu coba lagi.';
      removeVisitorButton.disabled = false;
    }
  }

  const detailsDialog = document.getElementById('visitor-details-dialog');
  document.getElementById('cancel-remove-visitor').addEventListener('click', () => {
    pendingVisitorRemoval = null;
    removeVisitorDialog.close();
  });
  removeVisitorDialog.addEventListener('click', (event) => { if (event.target === removeVisitorDialog) removeVisitorDialog.close(); });
  removeVisitorDialog.addEventListener('close', () => { pendingVisitorRemoval = null; removeVisitorButton.disabled = false; });
  removeVisitorButton.addEventListener('click', removeSelectedVisitor);
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
    if (preset === 'all') return { preset, label: 'Menampilkan semua data' };
    if (preset === 'today') return { ...localDayRange(todayString), preset, label: `Hari ini · ${todayString}` };
    if (preset === 'date') {
      const date = document.getElementById('single-date').value;
      return date ? { ...localDayRange(date), preset, label: `Tanggal ${date}` } : null;
    }
    if (preset === 'range') {
      const fromDate = document.getElementById('from-date').value;
      const toDate = document.getElementById('to-date').value;
      if (!fromDate || !toDate || fromDate > toDate) return null;
      return { ...localDayRange(fromDate), to: localDayRange(toDate).to, preset, label: `${fromDate} – ${toDate}` };
    }
    if (preset === 'week') {
      const monday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
      return { ...localDayRange(localDateString(monday)), to: today.toISOString(), preset, label: `Minggu ini · ${localDateString(monday)} – ${todayString}` };
    }
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    return { ...localDayRange(localDateString(monthStart)), to: today.toISOString(), preset, label: `Bulan ini · ${localDateString(monthStart)} – ${todayString}` };
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
    activeRange = range;
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
      renderDashboard(data, range);
    };
    const params = new URLSearchParams({ callback: callbackName });
    if (range.from) params.set('from', range.from);
    if (range.to) params.set('to', range.to);
    params.set('timeZone', Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');
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
  document.getElementById('reload-dashboard').addEventListener('click', (event) => {
    event.preventDefault();
    const selectedRange = getSelectedRange();
    loadDashboard(selectedRange || activeRange);
  });
  applyDateFilter.addEventListener('click', () => loadDashboard(getSelectedRange()));
  loadDashboard(getSelectedRange());

})();
