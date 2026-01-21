let waitingQueue = [];
let lateQueue = [];
let now = null;
let pid = 1;
let totalServedCount = 0;

const $ = id => document.getElementById(id);

// Persistence
function save() {
  localStorage.setItem("hms_data", JSON.stringify({
    waitingQueue,
    lateQueue,
    pid,
    totalServedCount,
    now: now ? { ...now } : null
  }));
}

function load() {
  const data = JSON.parse(localStorage.getItem("hms_data"));
  if (data) {
    waitingQueue = data.waitingQueue || [];
    lateQueue = data.lateQueue || [];
    pid = data.pid || 1;
    totalServedCount = data.totalServedCount || 0;
    now = data.now || null;
  }
}
load();

// Update time
function updateTime() {
  $("arrival").value = new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit"
  });
}
updateTime();
setInterval(updateTime, 1000);

// Navbar Toggling
document.querySelectorAll(".nav-btn").forEach(btn => {
  btn.onclick = () => {
    // Update buttons
    document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    // Update sections
    const target = btn.getAttribute("data-section");
    document.querySelectorAll(".content-section").forEach(sec => {
      sec.classList.add("hidden");
    });
    $(target).classList.remove("hidden");
  };
});

// Add patient
$("btnAdd").onclick = () => {
  const name = $("name").value.trim();
  const severity = Number($("severity").value);
  const burst = Number($("burst").value);

  if (!name) {
    return Swal.fire({
      icon: 'error',
      title: 'Missing Name',
      text: 'Please enter the patient name.',
      confirmButtonColor: '#1E3A8A'
    });
  }

  waitingQueue.push({
    id: pid++,
    name,
    severity,
    burst,
    arrival: new Date(),
    status: "WAITING"
  });

  $("name").value = "";
  render();
  save();

  Swal.fire({
    icon: 'success',
    title: 'Patient Added',
    text: `${name} has been added to the queue.`,
    timer: 2000,
    showConfirmButton: false,
    toast: true,
    position: 'top-end'
  });
};

// Pick next patient
function pickNext() {
  const algo = $("algo").value;
  if (waitingQueue.length === 0) return null;

  if (algo === "FCFS") {
    waitingQueue.sort((a, b) => a.arrival - b.arrival);
  }
  else if (algo === "PRIORITY") {
    waitingQueue.sort((a, b) => b.severity - a.severity || a.arrival - b.arrival);
  }
  else if (algo === "SJF") {
    waitingQueue.sort((a, b) => a.burst - b.burst || a.arrival - b.arrival);
  }

  return waitingQueue.shift();
}

// Call next
$("btnCallNext").onclick = () => {
  if (now) {
    return Swal.fire({
      icon: 'warning',
      title: 'Patient in Treatment',
      text: 'Please finish with the current patient first.',
      confirmButtonColor: '#1E3A8A'
    });
  }

  now = pickNext();
  if (now) {
    now.status = "CALLED";
    Swal.fire({
      icon: 'info',
      title: 'Next Patient Called',
      text: `Now serving ${now.name}.`,
      timer: 2000,
      showConfirmButton: false,
      toast: true,
      position: 'top-end'
    });
  } else {
    Swal.fire({
      icon: 'info',
      title: 'Queue Empty',
      text: 'There are no patients waiting in the queue.',
      confirmButtonColor: '#1E3A8A'
    });
  }
  render();
  save();
};

// No-show (Page Replacement)
$("btnNoShow").onclick = () => {
  if (!now) return;

  const name = now.name;
  now.status = "SKIPPED";
  lateQueue.push({ ...now, note: "No-show" });
  now = null;

  Swal.fire({
    icon: 'warning',
    title: 'Marked No-Show',
    text: `${name} moved to Late Queue.`,
    timer: 2000,
    showConfirmButton: false,
    toast: true,
    position: 'top-end'
  });

  $("btnCallNext").click();
  save();
};

// Late patient returns selective
window.returnPatient = (index) => {
  const p = lateQueue.splice(index, 1)[0];
  p.status = "RETURNED";
  p.arrival = new Date(); // Re-enters based on Current Time for scheduling
  waitingQueue.push(p);
  render();
  save();

  Swal.fire({
    icon: 'success',
    title: 'Patient Returned',
    text: `${p.name} is back in the waiting queue.`,
    timer: 2000,
    showConfirmButton: false,
    toast: true,
    position: 'top-end'
  });
};

// Treatment complete
$("btnComplete").onclick = () => {
  if (!now) return;

  const name = now.name;
  now.status = "DONE";
  now = null;
  totalServedCount++;

  Swal.fire({
    icon: 'success',
    title: 'Treatment Complete',
    text: `Finished serving ${name}.`,
    timer: 2000,
    showConfirmButton: false,
    toast: true,
    position: 'top-end'
  });

  $("btnCallNext").click();
  save();
};

// Reset Session
$("btnReset").onclick = () => {
  Swal.fire({
    title: 'Reset Everything?',
    text: "This will clear all queues and statistics!",
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#B91C1C',
    confirmButtonText: 'Yes, reset'
  }).then((result) => {
    if (result.isConfirmed) {
      waitingQueue = [];
      lateQueue = [];
      now = null;
      pid = 1;
      totalServedCount = 0;
      localStorage.removeItem("hms_data");
      render();
      Swal.fire({
        icon: 'success',
        title: 'Reset!',
        text: 'System has been cleared.',
        timer: 2000,
        showConfirmButton: false,
        toast: true,
        position: 'top-end'
      });
    }
  });
};

// Cancel Serving
$("btnCancelServing").onclick = () => {
  if (!now) return;

  Swal.fire({
    title: 'Cancel Appointment?',
    text: `Are you sure you want to cancel ${now.name}'s appointment?`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#B91C1C',
    cancelButtonColor: '#6B7280',
    confirmButtonText: 'Yes, cancel it'
  }).then((result) => {
    if (result.isConfirmed) {
      now = null;
      render();
      Swal.fire({
        icon: 'success',
        title: 'Cancelled',
        text: 'Appointment has been removed.',
        timer: 2000,
        showConfirmButton: false,
        toast: true,
        position: 'top-end'
      });
      $("btnCallNext").click();
      save();
    }
  });
};

// Cancel Waiting
window.cancelWaiting = (index) => {
  const p = waitingQueue[index];
  Swal.fire({
    title: 'Cancel Appointment?',
    text: `Remove ${p.name} from the waiting queue?`,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: '#B91C1C',
    cancelButtonColor: '#6B7280',
    confirmButtonText: 'Yes, cancel it'
  }).then((result) => {
    if (result.isConfirmed) {
      waitingQueue.splice(index, 1);
      render();
      save();
      Swal.fire({
        icon: 'success',
        title: 'Cancelled',
        text: 'Patient removed from queue.',
        timer: 2000,
        showConfirmButton: false,
        toast: true,
        position: 'top-end'
      });
    }
  });
};

// Render UI
function render() {
  $("nowServing").innerHTML = now
    ? `<b>${now.name}</b> | Severity ${now.severity} | ${now.burst} min`
    : "No patient yet";

  // Stats
  $("statTotal").innerText = totalServedCount;
  $("statWaiting").innerText = waitingQueue.length;
  const avg = waitingQueue.length > 0
    ? (waitingQueue.reduce((acc, p) => acc + p.burst, 0) / waitingQueue.length).toFixed(1)
    : 0;
  $("statAvg").innerText = avg + "m";

  $("waitingBody").innerHTML = "";
  waitingQueue.forEach((p, i) => {
    const timeStr = new Date(p.arrival).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    $("waitingBody").innerHTML += `
      <tr>
        <td>${i + 1}</td>
        <td>${p.name}</td>
        <td>${p.severity}</td>
        <td>${p.burst}</td>
        <td>${timeStr}</td>
        <td>${p.status}</td>
        <td><button class="cancel-btn" onclick="cancelWaiting(${i})">Cancel</button></td>
      </tr>`;
  });

  $("lateBody").innerHTML = "";
  lateQueue.forEach((p, i) => {
    const timeStr = new Date(p.arrival).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    $("lateBody").innerHTML += `
      <tr>
        <td>${p.name}</td>
        <td>${p.severity}</td>
        <td>${timeStr}</td>
        <td>${p.note}</td>
        <td><button class="return-btn" onclick="returnPatient(${i})">Return</button></td>
      </tr>`;
  });
}

render();
