// --- 1. CORE CONFIGURATION & GLOBALS ---
// Ensure this matches your Render URL exactly without a trailing slash
const API_BASE = 'https://creativinsync.onrender.com/api'; 
let siteData = {}; 
let isEditMode = false;

// Fix for the "undefined" error - Hoisted to the top
function updateAdminButtonVisibility(role = 'member') {
    const adminBtn = document.getElementById('admin-btn');
    if (adminBtn) {
        // Technically only admins see this, but we'll show it for dev purposes
        adminBtn.style.display = 'block'; 
    }
}

// Custom Alert System
function showAlert(msg, type = 'info') {
    const alertBox = document.getElementById('custom-alert');
    const alertMsg = document.getElementById('custom-alert-message');
    const alertIcon = document.getElementById('custom-alert-icon');
    if (!alertBox || !alertMsg) return;

    alertMsg.innerText = msg;
    alertIcon.innerText = type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️';
    alertBox.className = `custom-alert active ${type}`;

    setTimeout(() => { alertBox.classList.remove('active'); }, 3000);
}

// Custom Confirmation UI
function showConfirm(msg, onYes) {
    const modal = document.getElementById('custom-confirm-modal');
    const msgEl = document.getElementById('custom-confirm-msg');
    const btnYes = document.getElementById('custom-confirm-yes');
    const btnNo = document.getElementById('custom-confirm-no');

    if (!modal) { if (confirm(msg)) onYes(); return; }
    msgEl.innerText = msg;
    modal.style.display = 'flex';
    
    btnYes.onclick = () => { modal.style.display = 'none'; onYes(); };
    btnNo.onclick = () => { modal.style.display = 'none'; };
}

// --- 2. THE RENDERING ENGINE (applyToDOM) ---
// This builds your website dynamically from the MongoDB data
window.applyToDOM = function(data) {
    // A. Update Counters
    const counters = document.querySelectorAll('.counter');
    if(data.counters && counters.length >= 3) {
        counters[0].setAttribute('data-target', data.counters[0].value || 0);
        counters[1].setAttribute('data-target', data.counters[1].value || 0);
        counters[2].setAttribute('data-target', data.counters[2].value || 0);
    }

    // B. Render Org Chart (Team)
    const topRow = document.querySelector('.top-row');
    const middleRow = document.querySelector('.middle-row');
    if (topRow) topRow.innerHTML = '';
    if (middleRow) middleRow.innerHTML = '';

    data.team?.forEach(m => {
        const cardHTML = `
            <div class="member-card">
                <div class="admin-hidden-desc">${m.desc || ''}</div>
                <img src="${m.img}" alt="${m.name}" loading="lazy">
                <h3>${m.name}</h3>
                <p>${m.role}</p>
            </div>`;
        if (m.location === 'top-row') topRow?.insertAdjacentHTML('beforeend', cardHTML);
        else middleRow?.insertAdjacentHTML('beforeend', cardHTML);
    });

    // C. Render Advisers
    const advGrid = document.querySelector('.advisers-grid');
    if (advGrid) {
        advGrid.innerHTML = '';
        data.advisers?.forEach(a => {
            advGrid.insertAdjacentHTML('beforeend', `
                <div class="member-card adviser-card">
                    <div class="admin-hidden-desc">${a.desc || ''}</div>
                    <img src="${a.img}" alt="${a.name}">
                    <h3>${a.name}</h3>
                    <p>${a.role}</p>
                </div>`);
        });
    }

    // D. Render Events
    const eventList = document.getElementById('events-modal-list');
    if (eventList) {
        eventList.innerHTML = '';
        data.events?.forEach(e => {
            eventList.insertAdjacentHTML('beforeend', `
                <div class="card">
                    <div class="admin-hidden-desc">${e.full || ''}</div>
                    <div class="card-date">${e.date}</div>
                    <h3>${e.title}</h3>
                    <p>${e.short}</p>
                    <button class="btn-attendance" data-event="${e.title}">Mark Attendance</button>
                </div>`);
        });
    }

    // E. Render Perks
    const perksGrid = document.querySelector('.perks-grid');
    if (perksGrid && data.perks) {
        perksGrid.innerHTML = '';
        data.perks.forEach(p => {
            perksGrid.insertAdjacentHTML('beforeend', `
                <div class="perk-card">
                    <div class="perk-icon">${p.icon}</div>
                    <h4>${p.title}</h4>
                    <p>${p.desc}</p>
                </div>`);
        });
    }

    // Bind listeners to the newly created elements
    window.bindMemberCards();
    window.bindEventCards();
};

// --- 3. UI & INTERACTION BINDERS ---
const hamburger = document.getElementById("hamburger");
const navMenu = document.getElementById("nav-menu");
if (hamburger) {
    hamburger.addEventListener("click", () => {
        hamburger.classList.toggle("active");
        navMenu?.classList.toggle("active");
    });
}

const navbar = document.getElementById("navbar");
window.addEventListener("scroll", () => {
    if (window.scrollY > 50) navbar?.classList.add("scrolled");
    else navbar?.classList.remove("scrolled");
});

window.bindMemberCards = function() {
    document.querySelectorAll('.member-card').forEach(card => {
        card.addEventListener('click', () => {
            if (isEditMode) return;
            const img = card.querySelector('img').src;
            const name = card.querySelector('h3').innerText;
            const role = card.querySelector('p').innerText;
            const desc = card.querySelector('.admin-hidden-desc').innerText;

            document.getElementById('modal-img').src = img;
            document.getElementById('modal-name').innerText = name;
            document.getElementById('modal-role').innerText = role;
            document.getElementById('modal-desc').innerText = desc;
            document.getElementById('member-modal').classList.add('active');
        });
    });
};

window.bindEventCards = function() {
    document.querySelectorAll('.card').forEach(card => {
        card.addEventListener('click', (e) => {
            if (isEditMode || e.target.closest('.btn-attendance')) return;
            const title = card.querySelector('h3').innerText;
            const desc = card.querySelector('.admin-hidden-desc').innerText;

            document.getElementById('event-modal-title').innerText = title;
            document.getElementById('event-modal-desc').innerText = desc;
            document.getElementById('event-modal').classList.add('active');
        });
    });
};

// --- 4. ATTENDANCE SYSTEM ---
const attModal = document.getElementById('attendance-modal');
const photoInput = document.getElementById('attendance-photo');
const photoPreview = document.getElementById('photo-preview');

document.addEventListener('click', (e) => {
    const btn = e.target.closest('.btn-attendance');
    if (btn) {
        e.preventDefault();
        const acc = document.getElementById('account-link').innerText;
        if (!acc.includes('Welcome')) return showAlert('Please login first!', 'error');

        document.getElementById('event-name').innerText = btn.getAttribute('data-event');
        attModal.style.display = 'flex';
        // The visibility fix
        setTimeout(() => attModal.classList.add('active'), 10);
    }
});

photoInput?.addEventListener('change', (e) => {
    const files = Array.from(e.target.files);
    if (photoPreview) { photoPreview.innerHTML = ''; photoPreview.style.display = 'flex'; }
    files.forEach(file => {
        const reader = new FileReader();
        reader.onload = (ev) => {
            const img = document.createElement('img');
            img.src = ev.target.result;
            img.style.cssText = 'height:60px; border-radius:4px; object-fit:cover; border:1px solid #00aaff;';
            photoPreview.appendChild(img);
        };
        reader.readAsDataURL(file);
    });
});

document.getElementById('submit-attendance')?.addEventListener('click', () => {
    if ((photoInput?.files.length || 0) < 2) return showAlert('Upload 2 photos!', 'error');
    showAlert('Attendance submitted!', 'success');
    attModal.classList.remove('active');
    setTimeout(() => attModal.style.display = 'none', 300);
});

// --- 5. AUTH SYSTEM (LOGIN/LOGOUT) ---
document.getElementById('account-link')?.addEventListener('click', () => {
    const link = document.getElementById('account-link');
    if (link.innerText.includes('Welcome')) {
        showConfirm('Log out?', async () => {
            await fetch(`${API_BASE}/auth/logout`, { method: 'POST', credentials: 'include' });
            window.location.reload();
        });
    } else {
        document.getElementById('account-modal').classList.add('active');
    }
});

document.getElementById('login-btn')?.addEventListener('click', async () => {
    const student_id = document.getElementById('login-student-id').value.trim();
    const password = document.getElementById('login-password').value;
    try {
        const res = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST', headers: {'Content-Type': 'application/json'}, credentials: 'include',
            body: JSON.stringify({ student_id, password })
        });
        if (res.ok) window.location.reload();
        else showAlert('Invalid credentials', 'error');
    } catch(e) { showAlert("Backend connection failed.", "error"); }
});

// --- 6. ADMIN EDIT MODE & MASTER SCRAPER ---
function injectAdminUI() {
    document.querySelectorAll('.member-card, .card, .perk-card').forEach(card => {
        card.setAttribute('contenteditable', 'true');
        if (!card.querySelector('.admin-delete-btn')) {
            const del = document.createElement('button');
            del.className = 'admin-delete-btn'; del.innerHTML = '&times;';
            del.onclick = (e) => { e.stopPropagation(); card.remove(); };
            card.appendChild(del);
        }
    });
    document.querySelectorAll('h3, h4, p, .admin-hidden-desc').forEach(el => el.setAttribute('contenteditable', 'true'));
}

document.getElementById('admin-btn')?.addEventListener('click', () => {
    const pass = prompt("Admin Password:");
    if (pass === 'admin') {
        isEditMode = true;
        document.body.classList.add('edit-mode');
        document.getElementById('admin-toolbar').classList.add('active');
        injectAdminUI();
        showAlert("Edit Mode Active", "success");
    }
});

// THE SCRAPER (Sends your edits back to MongoDB)
document.getElementById('toolbar-save')?.addEventListener('click', async () => {
    const btn = document.getElementById('toolbar-save');
    btn.innerText = "Saving...";

    const freshData = {
        counters: [
            { label: "Members", value: document.querySelectorAll('.counter')[0]?.getAttribute('data-target') || 0 },
            { label: "Events", value: document.querySelectorAll('.counter')[1]?.getAttribute('data-target') || 0 },
            { label: "Awards", value: document.querySelectorAll('.counter')[2]?.getAttribute('data-target') || 0 }
        ],
        perks: [],
        team: [],
        advisers: [],
        events: []
    };

    // Scrape Team
    document.querySelectorAll('.org-chart .member-card:not(.adviser-card)').forEach(c => {
        freshData.team.push({
            name: c.querySelector('h3').innerText,
            role: c.querySelector('p').innerText,
            img: c.querySelector('img').src,
            desc: c.querySelector('.admin-hidden-desc').innerText,
            location: c.closest('.top-row') ? 'top-row' : 'middle-row'
        });
    });

    // Scrape Advisers
    document.querySelectorAll('.adviser-card').forEach(c => {
        freshData.advisers.push({
            name: c.querySelector('h3').innerText,
            role: c.querySelector('p').innerText,
            img: c.querySelector('img').src,
            desc: c.querySelector('.admin-hidden-desc').innerText
        });
    });

    // Scrape Events
    document.querySelectorAll('#events-modal-list .card').forEach(c => {
        freshData.events.push({
            title: c.querySelector('h3').innerText,
            short: c.querySelector('p').innerText,
            date: c.querySelector('.card-date').innerText,
            full: c.querySelector('.admin-hidden-desc').innerText
        });
    });

    try {
        const res = await fetch(`${API_BASE}/admin/data`, {
            method: 'POST', headers: {'Content-Type': 'application/json'}, credentials: 'include',
            body: JSON.stringify(freshData)
        });
        if (res.ok) { showAlert("Database Updated!", "success"); window.location.reload(); }
    } catch (e) { showAlert("Save failed. Is Render live?", "error"); }
});

// --- 7. INITIAL BOOTSTRAP ---
(async () => {
    try {
        // 1. Check Auth
        const auth = await fetch(`${API_BASE}/auth/current-user`, { credentials: 'include' });
        if (auth.ok) {
            const user = await auth.json();
            document.getElementById('account-link').innerText = `Welcome, ${user.name}`;
            updateAdminButtonVisibility(user.role);
        }
        // 2. Load Content
        const data = await fetch(`${API_BASE}/admin/data?t=${Date.now()}`, { credentials: 'include' });
        if (data.ok) {
            siteData = await data.json();
            window.applyToDOM(siteData);
        }
    } catch (e) { 
        console.warn("Backend error: Failed to fetch");
        showAlert("Backend error: Failed to fetch data", "error");
    }
})();

// Close buttons logic
document.querySelectorAll('.modal-overlay').forEach(o => {
    o.addEventListener('click', (e) => {
        if(e.target === o || e.target.classList.contains('close-btn')) {
            o.classList.remove('active');
            if(o.id === 'attendance-modal') setTimeout(() => o.style.display = 'none', 300);
        }
    });
});