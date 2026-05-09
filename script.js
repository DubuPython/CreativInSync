// --- 1. CORE GLOBALS & FIXES ---
// Hoisted to the top to fix "updateAdminButtonVisibility is not defined" error
function updateAdminButtonVisibility(role = 'member') {
    const adminBtn = document.getElementById('admin-btn');
    if (adminBtn) {
        // Only show the edit toggle if they are logged in or have permissions
        adminBtn.style.display = (role === 'admin' || role === 'developer') ? 'block' : 'none';
        // For development/testing, we'll keep it block if you want to access it via prompt
        adminBtn.style.display = 'block'; 
    }
}

const API_BASE = 'https://creativinsync.onrender.com/api'; 
let siteData = {}; 
let isEditMode = false;

// Custom Alert UI
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

// Custom Confirm UI (Replaces ugly browser prompt in image_ff981a.png)
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

// --- 2. UI, NAVBAR & SCROLL REVEAL ---
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

const revealElements = document.querySelectorAll('.reveal');
const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('active');
            const counters = entry.target.querySelectorAll('.counter');
            if(counters.length > 0) runCounters(counters);
            observer.unobserve(entry.target); 
        }
    });
}, { threshold: 0.15 });
revealElements.forEach(el => revealObserver.observe(el));

function runCounters(counters) {
    counters.forEach(counter => {
        counter.innerText = '0';
        const target = +counter.getAttribute('data-target') || 0;
        const increment = target / 50; 
        const update = () => {
            const current = +counter.innerText;
            if (current < target) {
                counter.innerText = Math.ceil(current + increment);
                setTimeout(update, 30);
            } else counter.innerText = target + "+";
        };
        update();
    });
}

// --- 3. MODAL HANDLERS (OFFICERS, ADVISERS, EVENTS) ---
window.bindMemberCards = function() {
    document.querySelectorAll('.member-card, .adviser-card').forEach(card => {
        card.addEventListener('click', (e) => {
            if (isEditMode) return; // Don't pop up while editing text

            const img = card.querySelector('img')?.src || '';
            const name = card.querySelector('h3')?.innerText || '';
            const role = card.querySelector('p')?.innerText || '';
            
            // Fix: pull from hidden desc box so edits show up immediately
            const hiddenDescEl = card.querySelector('.admin-hidden-desc');
            const desc = hiddenDescEl ? hiddenDescEl.innerText : (card.getAttribute('data-desc') || 'No description.');

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

            const title = card.querySelector('h3')?.innerText || '';
            const date = card.querySelector('.card-date')?.innerText || '';
            const hiddenDescEl = card.querySelector('.admin-hidden-desc');
            const desc = hiddenDescEl ? hiddenDescEl.innerText : (card.getAttribute('data-full-desc') || '');

            document.getElementById('event-modal-title').innerText = title;
            document.getElementById('event-modal-date').innerText = date;
            document.getElementById('event-modal-desc').innerText = desc;
            document.getElementById('event-modal').classList.add('active');
        });
    });
};

// --- 4. ATTENDANCE SYSTEM (THE VISIBILITY FIX) ---
const attendanceModal = document.getElementById('attendance-modal');
const photoInput = document.getElementById('attendance-photo');
const photoPreview = document.getElementById('photo-preview');

document.addEventListener('click', function(e) {
    const btn = e.target.closest('.btn-attendance');
    if (btn) {
        e.preventDefault(); e.stopPropagation();
        
        const accountLink = document.getElementById('account-link');
        if (!accountLink.innerText.includes('Welcome')) {
            showAlert('Please login to mark attendance.', 'error');
            document.getElementById('account-modal').classList.add('active');
            return;
        }

        const eventName = btn.getAttribute('data-event') || btn.closest('.card')?.querySelector('h3')?.innerText || 'this event';
        document.getElementById('event-name').innerText = eventName;
        
        if (attendanceModal) {
            attendanceModal.style.display = 'flex'; // Trigger display
            setTimeout(() => {
                attendanceModal.classList.add('active'); // Trigger CSS opacity: 1
            }, 10);
        }
    }
});

const closeAllModals = () => {
    document.querySelectorAll('.modal-overlay').forEach(m => {
        m.classList.remove('active');
        if (m.id === 'attendance-modal') setTimeout(() => m.style.display = 'none', 300);
    });
};

document.querySelectorAll('.close-btn, .modal-overlay').forEach(el => {
    el.addEventListener('click', (e) => {
        if (e.target === el || el.classList.contains('close-btn')) closeAllModals();
    });
});

// Photo preview for attendance
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

// --- 5. AUTH SYSTEM (LOGIN/LOGOUT) ---
document.getElementById('account-link')?.addEventListener('click', (e) => {
    const link = e.target;
    if (link.innerText.includes('Welcome')) {
        showConfirm('Do you want to log out?', async () => {
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
            method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
            body: JSON.stringify({ student_id, password })
        });
        if (res.ok) window.location.reload();
        else { const err = await res.json(); showAlert(err.error || 'Login failed', 'error'); }
    } catch(e) { showAlert("Backend error. Check Render status.", "error"); }
});

// --- 6. ADMIN EDIT MODE & THE MASTER SCRAPER ---
function injectAdminUI() {
    // 1. Inject hidden description boxes for Officers and Advisers
    document.querySelectorAll('.member-card, .adviser-card, .card').forEach(card => {
        if (!card.querySelector('.admin-hidden-desc')) {
            const descDiv = document.createElement('div');
            descDiv.className = 'admin-hidden-desc editable';
            descDiv.innerText = card.getAttribute('data-desc') || card.getAttribute('data-full-desc') || 'No description provided.';
            card.insertBefore(descDiv, card.firstChild);
        }
        // 2. Add Delete Buttons
        if (!card.querySelector('.admin-delete-btn')) {
            const del = document.createElement('button');
            del.className = 'admin-delete-btn'; del.innerHTML = '&times;';
            card.appendChild(del);
        }
    });

    // 3. Make everything editable
    document.querySelectorAll('.editable, .admin-hidden-desc, h3, h4, p, span.date-badge').forEach(el => {
        if (el.closest('.modal-content')) return; // Don't edit modal interiors
        el.setAttribute('contenteditable', 'true');
    });
}

document.getElementById('admin-btn')?.addEventListener('click', (e) => {
    e.preventDefault();
    if (isEditMode) return;
    const pass = prompt("Enter Admin Password:");
    if (pass !== 'admin') return;

    isEditMode = true;
    document.body.classList.add('edit-mode');
    document.getElementById('admin-toolbar').classList.add('active');
    injectAdminUI();
    showAlert("Edit Mode Active.", "success");
});

// THE MASTER DATA SCRAPER (This is what actually saves your work)
document.getElementById('toolbar-save')?.addEventListener('click', async () => {
    const btn = document.getElementById('toolbar-save');
    btn.innerText = "Connecting to MongoDB...";

    const freshData = {
        counters: [
            { label: "Members", value: document.querySelectorAll('.counter')[0]?.getAttribute('data-target') || 0 },
            { label: "Events", value: document.querySelectorAll('.counter')[1]?.getAttribute('data-target') || 0 },
            { label: "Awards", value: document.querySelectorAll('.counter')[2]?.getAttribute('data-target') || 0 }
        ],
        perks: [],
        achievements: [],
        events: [],
        team: [],
        advisers: []
    };

    // Scrape Perks
    document.querySelectorAll('.perk-card').forEach(card => {
        freshData.perks.push({
            icon: card.querySelector('.perk-icon')?.innerText || '⭐',
            title: card.querySelector('h4')?.innerText || 'New Perk',
            desc: card.querySelector('p')?.innerText || 'Description'
        });
    });

    // Scrape Team members from Org Chart
    document.querySelectorAll('.org-chart .member-card').forEach(card => {
        let location = 'top-row';
        if (card.parentElement.classList.contains('middle-row')) location = 'middle-row';
        else if (card.parentElement.classList.contains('org-column')) {
            location = card.parentElement.querySelector('.column-title')?.innerText || 'Column';
        }

        freshData.team.push({
            name: card.querySelector('h3')?.innerText || '',
            role: card.querySelector('p')?.innerText || '',
            img: card.querySelector('img')?.src || '',
            desc: card.querySelector('.admin-hidden-desc')?.innerText || '',
            location: location
        });
    });

    // Scrape Advisers
    document.querySelectorAll('.advisers-grid .member-card').forEach(card => {
        freshData.advisers.push({
            name: card.querySelector('h3')?.innerText || '',
            role: card.querySelector('p')?.innerText || '',
            img: card.querySelector('img')?.src || '',
            desc: card.querySelector('.admin-hidden-desc')?.innerText || ''
        });
    });

    // Scrape Events
    document.querySelectorAll('#events-modal-list .card').forEach(card => {
        freshData.events.push({
            title: card.querySelector('h3')?.innerText || '',
            short: card.querySelector('p')?.innerText || '',
            date: card.querySelector('.card-date')?.innerText || '',
            full: card.querySelector('.admin-hidden-desc')?.innerText || ''
        });
    });

    try {
        const res = await fetch(`${API_BASE}/admin/data`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
            body: JSON.stringify(freshData)
        });
        if (res.ok) {
            showAlert("Live Site Updated!", "success");
            setTimeout(() => window.location.reload(), 1500);
        } else {
            const err = await res.json();
            showAlert(`Save Error: ${err.error}`, 'error');
        }
    } catch (e) { showAlert("Network error. Is Render down?", "error"); }
});

// --- 7. INITIAL BOOTSTRAP ---
(async () => {
    try {
        // 1. Check if user is logged in
        const auth = await fetch(`${API_BASE}/auth/current-user`, { credentials: 'include' });
        if (auth.ok) {
            const user = await auth.json();
            document.getElementById('account-link').innerText = `Welcome, ${user.name}`;
            updateAdminButtonVisibility(user.role);
        }

        // 2. Fetch all site content
        const data = await fetch(`${API_BASE}/admin/data?t=${Date.now()}`, { credentials: 'include' });
        if (data.ok) {
            siteData = await data.json();
            // Apply data to DOM (assuming applyToDOM is global)
            if (window.applyToDOM) window.applyToDOM(siteData);
            
            // Bind everything together
            window.bindMemberCards();
            window.bindEventCards();
        }
    } catch (e) {
        console.error("Backend offline. Interactions will be limited.");
        showAlert("Backend error: Failed to connect to database.", "error");
    }
})();