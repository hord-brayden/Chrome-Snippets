/* unixTimePopup.js — zero‑dependency, auto‑running Chrome snippet */
(function () {
  /*───────────────────────────────────────────────────────────*/
  /* Helpers                                                   */
  /*───────────────────────────────────────────────────────────*/
  const pad = n => String(n).padStart(2, '0');
  const now = new Date();
  const todayISO =
    `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const timeISO =
    `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  const browserTZ =
    Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

  /* If a prior popup exists, nuke it first */
  const prior = document.getElementById('unix-time-popup');
  if (prior) prior.remove();

  /*───────────────────────────────────────────────────────────*/
  /* Overlay (faded background)                                */
  /*───────────────────────────────────────────────────────────*/
  const overlay = document.createElement('div');
  overlay.id = 'unix-time-popup';
  overlay.style.cssText = `
    position:fixed; inset:0;
    background:rgba(0,0,0,.45);
    z-index:2147483647;        /* practically unbeatable */
    display:flex; align-items:center; justify-content:center;
  `;

  /*───────────────────────────────────────────────────────────*/
  /* Modal container                                           */
  /*───────────────────────────────────────────────────────────*/
  const modal = document.createElement('div');
  modal.style.cssText = `
    position:relative; background:#fff; min-width:320px;
    padding:24px 28px 30px; border-radius:10px;
    box-shadow:0 8px 32px rgba(0,0,0,.25);
    font-family:Arial,Helvetica,sans-serif; text-align:center;
  `;

  /* Close (✕) button */
  const xBtn = document.createElement('div');
  xBtn.textContent = '✕';
  xBtn.title = 'Close';
  xBtn.style.cssText = `
    position:absolute; top:8px; left:12px; cursor:pointer;
    font-size:16px; font-weight:bold; line-height:1;
  `;
  xBtn.onclick = () => overlay.remove();

  /* Date input */
  const dateLabel = document.createElement('label');
  dateLabel.textContent = 'Date';
  dateLabel.style.display = 'block';
  dateLabel.style.marginTop = '10px';

  const dateInput = document.createElement('input');
  dateInput.type = 'date';
  dateInput.value = todayISO;
  dateInput.style.marginTop = '6px';

  /* Time input */
  const timeLabel = document.createElement('label');
  timeLabel.textContent = 'Time (HH:mm:ss)';
  timeLabel.style.display = 'block';
  timeLabel.style.marginTop = '14px';

  const timeInput = document.createElement('input');
  timeInput.type = 'time';
  timeInput.step = '1';
  timeInput.value = timeISO;
  timeInput.style.marginTop = '6px';

  /* Time‑zone select */
  const tzLabel = document.createElement('label');
  tzLabel.textContent = 'Time zone';
  tzLabel.style.display = 'block';
  tzLabel.style.marginTop = '14px';

  const tzSelect = document.createElement('select');
  tzSelect.style.marginTop = '6px';
  /* Build the option list using the native Intl time‑zone catalog */
  (Intl.supportedValuesOf ? Intl.supportedValuesOf('timeZone') : [])
    .forEach(tz => {
      const op = document.createElement('option');
      op.value = tz;
      op.textContent = tz;
      tzSelect.appendChild(op);
    });
  /* If supportedValuesOf is missing (older browser), add common zones */
  if (!tzSelect.options.length) {
    ['UTC','America/New_York','America/Chicago','America/Denver',
     'America/Los_Angeles','Europe/London','Europe/Berlin','Asia/Tokyo']
      .forEach(tz => {
        const op = document.createElement('option');
        op.value = tz; op.textContent = tz;
        tzSelect.appendChild(op);
      });
  }
  tzSelect.value = browserTZ;

  /* Convert + Copy buttons */
  const btnRow = document.createElement('div');
  btnRow.style.marginTop = '22px';

  const convertBtn = document.createElement('button');
  convertBtn.textContent = 'Convert';
  convertBtn.style.marginRight = '12px';

  const copyBtn = document.createElement('button');
  copyBtn.textContent = 'Copy';
  copyBtn.disabled = true;

  /* Output paragraph */
  const output = document.createElement('p');
  output.style.cssText =
    'margin-top:20px;font-weight:bold;word-break:break-all;';

  /*───────────────────────────────────────────────────────────*/
  /* Conversion logic (pure JS, no libs)                       */
  /*───────────────────────────────────────────────────────────*/
  function zonedDateToUnix(dateStr, timeStr, zone) {
    /* Build an ISO string in the chosen zone by cheating with locale */
    const [y,m,d] = dateStr.split('-').map(Number);
    const [hh,mm,ss] = timeStr.split(':').map(Number);
    /* Create a date in the target zone offset, using the trick of
       formatting to that zone and then parsing back as if it were UTC. */
    const fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: zone,
      hour12: false,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
    const parts = fmt.formatToParts(new Date(Date.UTC(y,m-1,d,hh,mm,ss)));
    const map = Object.fromEntries(parts.map(p => [p.type, p.value]));
    const isoLike = `${map.year}-${map.month}-${map.day}T${map.hour}:${map.minute}:${map.second}Z`;
    return Math.floor(Date.parse(isoLike) / 1000);
  }

  convertBtn.onclick = () => {
    const unix = zonedDateToUnix(dateInput.value, timeInput.value, tzSelect.value);
    output.textContent = `Unix time: ${unix}`;
    copyBtn.disabled = false;
    copyBtn.dataset.val = unix;
  };

  copyBtn.onclick = async e => {
    try {
      await navigator.clipboard.writeText(e.target.dataset.val);
      copyBtn.textContent = 'Copied!';
      setTimeout(() => (copyBtn.textContent = 'Copy'), 1500);
    } catch {
      alert('Clipboard write failed — copy manually:\n' + e.target.dataset.val);
    }
  };

  /*───────────────────────────────────────────────────────────*/
  /* Assemble DOM & inject                                     */
  /*───────────────────────────────────────────────────────────*/
  btnRow.append(convertBtn, copyBtn);
  modal.append(
    xBtn,
    dateLabel, dateInput,
    timeLabel, timeInput,
    tzLabel, tzSelect,
    btnRow, output
  );
  overlay.appendChild(modal);

  /* Put overlay at the very top of <body> so nothing eclipses it */
  document.body.prepend(overlay);
})();
