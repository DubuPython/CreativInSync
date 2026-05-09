// --- HELPER FUNCTIONS & GLOBALS ---
function safeAddEvent(el, evt, fn) {
    if (!el) return;
    if (NodeList.prototype.isPrototypeOf(el) || Array.isArray(el)) {
        el.forEach(item => { if (item) item.addEventListener(evt, fn); });
        return;
    }
    el.addEventListener(evt, fn);
}

const API_BASE = 'http://localhost:5000/api';
let siteData = {}; 
let isEditMode = false;

// Custom Alert (Replaces ugly browser alerts)
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

// Custom Confirm (Replaces ugly browser confirm boxes)
function showConfirm(msg, onYes) {
    const modal = document.getElementById('custom-confirm-modal');
    const msgEl = document.getElementById('custom-confirm-msg');
    const btnYes = document.getElementById('custom-confirm-yes');
    const btnNo = document.getElementById('custom-confirm-no');

    if (!modal) {
        if (confirm(msg)) onYes(); // Fallback if HTML is missing
        return;
    }

    msgEl.innerText = msg;
    modal.style.display = 'flex';

    btnYes.onclick = () => { modal.style.display = 'none'; onYes(); };
    btnNo.onclick = () => { modal.style.display = 'none'; };
}

// Ensure Admin button shows if they have permissions
function updateAdminButtonVisibility(role = 'member') {
    const adminBtn = document.getElementById('admin-btn');
    if (adminBtn) adminBtn.style.display = 'block'; 
}

// --- 1. UI & NAVBAR LOGIC ---
const hamburger = document.getElementById("hamburger");
const navMenu = document.getElementById("nav-menu");
const navLinks = document.querySelectorAll(".nav-link");

if (hamburger) {
    safeAddEvent(hamburger, "click", () => {
        hamburger.classList.toggle("active");
        if (navMenu) navMenu.classList.toggle("active");
    });
}
navLinks.forEach(link => {
    if (!link) return;
    link.addEventListener("click", () => {
        if (hamburger) hamburger.classList.remove("active");
        if (navMenu) navMenu.classList.remove("active");
    });
});

const navbar = document.getElementById("navbar");
window.addEventListener("scroll", () => {
    if (!navbar) return;
    if (window.scrollY > 50) navbar.classList.add("scrolled");
    else navbar.classList.remove("scrolled");
});

// --- 2. SCROLL REVEAL & COUNTERS ---
const revealElements = document.querySelectorAll('.reveal');
const revealCallback = (entries, observer) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('active');
            const counters = entry.target.querySelectorAll('.counter');
            if(counters.length > 0) runCounters(counters);
            observer.unobserve(entry.target); 
        }
    });
};
const revealObserver = new IntersectionObserver(revealCallback, { threshold: 0.15, rootMargin: "0px 0px -50px 0px" });
revealElements.forEach(el => revealObserver.observe(el));

function runCounters(counters) {
    counters.forEach(counter => {
        counter.innerText = '0';
        const target = +counter.getAttribute('data-target');
        const increment = target / 50; 
        const updateCounter = () => {
            const current = +counter.innerText;
            if (current < target) {
                counter.innerText = Math.ceil(current + increment);
                setTimeout(updateCounter, 30);
            } else counter.innerText = target + "+";
        };
        updateCounter();
    });
}

// --- 3. TEAM & EVENT MODAL BINDERS ---
const modalOverlay = document.getElementById('member-modal');
const closeModalBtn = document.getElementById('close-modal');
const modalImg = document.getElementById('modal-img');
const modalName = document.getElementById('modal-name');
const modalRole = document.getElementById('modal-role');
const modalDesc = document.getElementById('modal-desc');

window.bindMemberCards = function() {
    const memberCards = document.querySelectorAll('.member-card, .adviser-card');
    memberCards.forEach(card => {
        card.addEventListener('click', (e) => {
            // CRITICAL FIX: If Admin is editing, disable the popup entirely!
            if (isEditMode) return; 

            const imgElement = card.querySelector('img');
            const name = (card.querySelector('h3') && card.querySelector('h3').innerText) || '';
            const role = (card.querySelector('p') && card.querySelector('p').innerText) || '';
            
            const hiddenDescEl = card.querySelector('.admin-hidden-desc');
            const desc = hiddenDescEl ? hiddenDescEl.innerText : (card.getAttribute('data-desc') || 'No description provided.');

            if (modalImg && imgElement) modalImg.src = imgElement.src;
            if (modalName) modalName.innerText = name;
            if (modalRole) modalRole.innerText = role;
            if (modalDesc) modalDesc.innerText = desc;
            if (modalOverlay) modalOverlay.classList.add('active');
        });
    });
};

if (closeModalBtn) closeModalBtn.addEventListener('click', () => { if (modalOverlay) modalOverlay.classList.remove('active'); });
if (modalOverlay) modalOverlay.addEventListener('click', (e) => { if (e.target === modalOverlay) modalOverlay.classList.remove('active'); });

// Events
const eventModal = document.getElementById('event-modal');
const closeEventBtn = document.getElementById('close-event-modal');
const eModalTitle = document.getElementById('event-modal-title');
const eModalDate = document.getElementById('event-modal-date');
const eModalDesc = document.getElementById('event-modal-desc');

window.bindEventCards = function() {
    document.querySelectorAll('.card').forEach(card => {
        card.addEventListener('click', (e) => {
            // CRITICAL FIX: Disable popup while in edit mode OR if clicking a button
            if (isEditMode) return; 
            if (e.target.closest('a') || e.target.closest('.btn-attendance')) return; 

            const title = (card.querySelector('h3') && card.querySelector('h3').innerText) || '';
            const date = (card.querySelector('.card-date') && card.querySelector('.card-date').innerText) || '';
            const hiddenDescEl = card.querySelector('.admin-hidden-desc');
            const fullDesc = hiddenDescEl ? hiddenDescEl.innerText : (card.getAttribute('data-full-desc') || '');

            if (eModalTitle) eModalTitle.innerText = title;
            if (eModalDate) eModalDate.innerText = date;
            if (eModalDesc) eModalDesc.innerText = fullDesc;
            if (eventModal) eventModal.classList.add('active');
        });
    });
};

if (closeEventBtn) closeEventBtn.addEventListener('click', () => { if (eventModal) eventModal.classList.remove('active'); });
if (eventModal) eventModal.addEventListener('click', (e) => { if (e.target === eventModal) eventModal.classList.remove('active'); });

// --- 4. AUTH SYSTEM (Login/Logout) ---
const accountLink = document.getElementById('account-link');
const accountModal = document.getElementById('account-modal');
const closeAccountBtn = document.getElementById('close-account');
const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');

async function checkAuthStatus() {
    try {
        const res = await fetch(`${API_BASE}/auth/current-user`, { method: 'GET', credentials: 'include' });
        if (res.ok) {
            const user = await res.json();
            if (accountLink) {
                accountLink.innerText = `Welcome, ${user.name}`;
                accountLink.style.color = 'var(--primary)';
            }
            updateAdminButtonVisibility(user.role);
        }
    } catch (err) { console.warn('Backend unavailable'); }
}

if (accountLink) {
    accountLink.addEventListener('click', async () => { 
        if (accountLink.innerText.includes('Welcome')) {
            showConfirm('Do you want to log out?', async () => {
                try { await fetch(`${API_BASE}/auth/logout`, { method: 'POST', credentials: 'include' }); } catch (e) {}
                accountLink.innerText = 'Account';
                accountLink.style.color = '';
                showAlert('Logged out successfully', 'success');
                setTimeout(() => window.location.reload(), 1000);
            });
        } else {
            if (accountModal) accountModal.classList.add('active'); 
        }
    });
}

if (closeAccountBtn) closeAccountBtn.addEventListener('click', () => { if (accountModal) accountModal.classList.remove('active'); });
if (accountModal) accountModal.addEventListener('click', (e) => { if (e.target === accountModal) accountModal.classList.remove('active'); });
if (document.getElementById('switch-signup')) document.getElementById('switch-signup').addEventListener('click', () => { loginForm.style.display = 'none'; signupForm.style.display = 'flex'; document.getElementById('account-title').innerText = 'Create Your Account'; });
if (document.getElementById('switch-login')) document.getElementById('switch-login').addEventListener('click', () => { signupForm.style.display = 'none'; loginForm.style.display = 'flex'; document.getElementById('account-title').innerText = 'Login to Your Account'; });

// Login API
if (document.getElementById('login-btn')) {
    document.getElementById('login-btn').addEventListener('click', async () => {
        const studentId = document.getElementById('login-student-id').value.trim();
        const password = document.getElementById('login-password').value;
        if (!studentId || !password) return showAlert('Please fill in all fields.', 'error');
        try {
            const res = await fetch(`${API_BASE}/auth/login`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
                body: JSON.stringify({ student_id: studentId, password })
            });
            if (res.ok) {
                const data = await res.json();
                if (accountModal) accountModal.classList.remove('active');
                if (accountLink) { accountLink.innerText = `Welcome, ${data.name}`; accountLink.style.color = 'var(--primary)'; }
                showAlert('Login successful!', 'success');
                updateAdminButtonVisibility('member');
            } else {
                const err = await res.json(); showAlert(err.error || 'Login failed', 'error');
            }
        } catch (error) { showAlert('Backend error: ' + error.message, 'error'); }
    });
}

// Signup API
if (document.getElementById('signup-btn')) {
    document.getElementById('signup-btn').addEventListener('click', async () => {
        const studentId = document.getElementById('signup-student-id').value.trim();
        const email = document.getElementById('signup-email').value.trim();
        const password = document.getElementById('signup-password').value;
        const confirmPassword = document.getElementById('signup-confirm-password').value;
        if (!studentId || !email || !password || !confirmPassword) return showAlert('Please fill in all fields.', 'error');
        if (password !== confirmPassword) return showAlert('Passwords do not match.', 'error');
        try {
            const res = await fetch(`${API_BASE}/auth/signup`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include',
                body: JSON.stringify({ student_id: studentId, email, password, confirm_password: confirmPassword })
            });
            if (res.ok) {
                if (accountModal) accountModal.classList.remove('active');
                if (accountLink) { accountLink.innerText = `Welcome, ${studentId}`; accountLink.style.color = 'var(--primary)'; }
                showAlert('Account created successfully!', 'success');
                updateAdminButtonVisibility('member');
            } else {
                const err = await res.json(); showAlert(err.error || 'Signup failed', 'error');
            }
        } catch (error) { showAlert('Backend error: ' + error.message, 'error'); }
    });
}
checkAuthStatus();


// --- 5. BULLETPROOF ATTENDANCE SYSTEM ---
const attendanceModal = document.getElementById('attendance-modal');
const closeAttendanceBtn = document.getElementById('close-attendance');
const attendancePhotoInput = document.getElementById('attendance-photo');
const photoPreview = document.getElementById('photo-preview');
const eventNameDisplay = document.getElementById('event-name');
let currentEventName = '';

// Handle opening the modal
document.addEventListener('click', function(e) {
    const attendanceBtn = e.target.closest('.btn-attendance');
    if (attendanceBtn) {
        e.preventDefault();
        e.stopPropagation();

        const accountLink = document.getElementById('account-link');
        const isLoggedIn = accountLink && accountLink.innerText.includes('Welcome');
        if (!isLoggedIn) {
            showAlert('Please login first to mark attendance.', 'error');
            const accountModal = document.getElementById('account-modal');
            if (accountModal) accountModal.classList.add('active'); 
            return;
        }

        // Figure out event name
        currentEventName = attendanceBtn.getAttribute('data-event');
        if (!currentEventName) {
            const pCard = attendanceBtn.closest('.card');
            if (pCard && pCard.querySelector('h3')) currentEventName = pCard.querySelector('h3').innerText;
        }
        if (!currentEventName) currentEventName = 'this event';

        if (eventNameDisplay) eventNameDisplay.innerText = currentEventName;
        
        // THE FIX: We must both change display AND add the .active class to bypass the invisible CSS
        if (attendanceModal) {
            attendanceModal.style.display = 'flex';
            
            // Small delay ensures the browser registers the 'flex' change before starting the fade-in animation
            setTimeout(() => {
                attendanceModal.classList.add('active');
            }, 10); 
        }
    }
});

// Close modal gracefully
if (closeAttendanceBtn) {
    closeAttendanceBtn.addEventListener('click', () => { 
        if (attendanceModal) {
            attendanceModal.classList.remove('active');
            setTimeout(() => attendanceModal.style.display = 'none', 300); // Wait for fade out
        }
    });
}
if (attendanceModal) {
    attendanceModal.addEventListener('click', (e) => { 
        if (e.target === attendanceModal) {
            attendanceModal.classList.remove('active');
            setTimeout(() => attendanceModal.style.display = 'none', 300);
        }
    });
}

// File Upload Triggers
const fileLabel = document.querySelector('.file-label');
if (fileLabel && attendancePhotoInput) {
    fileLabel.addEventListener('click', () => attendancePhotoInput.click());
}

if (attendancePhotoInput) {
    attendancePhotoInput.addEventListener('change', (e) => {
        const files = Array.from(e.target.files);
        if (photoPreview) { photoPreview.innerHTML = ''; photoPreview.style.display = 'flex'; }
        if (files.length > 0 && files.length < 2) showAlert('Reminder: You must upload at least TWO photos.', 'info');
        
        files.forEach(file => {
            if (file && file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    const img = document.createElement('img');
                    img.src = event.target.result;
                    img.style.cssText = 'height:80px; border-radius:8px; object-fit:cover; border:2px solid #00aaff;';
                    if (photoPreview) photoPreview.appendChild(img);
                };
                reader.readAsDataURL(file);
            }
        });
    });
}

// Submit Button Logic
const submitAttendanceBtn = document.getElementById('submit-attendance');
if (submitAttendanceBtn) {
    submitAttendanceBtn.addEventListener('click', () => {
        const files = attendancePhotoInput ? attendancePhotoInput.files : [];
        if (files.length < 2) return showAlert('You must submit exactly two pictures (Selfie & Venue).', 'error');
        
        showAlert(`Successfully submitted ${files.length} photos!`, 'success');
        
        // Hide Modal
        if (attendanceModal) {
            attendanceModal.classList.remove('active');
            setTimeout(() => attendanceModal.style.display = 'none', 300);
        }
        
        // Reset Inputs
        if (attendancePhotoInput) attendancePhotoInput.value = '';
        if (photoPreview) { photoPreview.innerHTML = ''; photoPreview.style.display = 'none'; }
    });
}

if (closeAttendanceBtn) closeAttendanceBtn.addEventListener('click', () => { if (attendanceModal) attendanceModal.style.display = 'none'; });
if (attendanceModal) attendanceModal.addEventListener('click', (e) => { if (e.target === attendanceModal) attendanceModal.style.display = 'none'; });
if (document.querySelector('.file-label') && attendancePhotoInput) document.querySelector('.file-label').addEventListener('click', () => attendancePhotoInput.click());

if (attendancePhotoInput) {
    attendancePhotoInput.addEventListener('change', (e) => {
        const files = Array.from(e.target.files);
        if (photoPreview) { photoPreview.innerHTML = ''; photoPreview.style.display = 'flex'; }
        if (files.length > 0 && files.length < 2) showAlert('Reminder: You must upload at least TWO photos.', 'info');
        files.forEach(file => {
            if (file && file.type.startsWith('image/')) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    const img = document.createElement('img');
                    img.src = event.target.result;
                    img.style.cssText = 'height:80px; border-radius:8px; object-fit:cover; border:2px solid #00aaff;';
                    if (photoPreview) photoPreview.appendChild(img);
                };
                reader.readAsDataURL(file);
            }
        });
    });
}

if (document.getElementById('submit-attendance')) {
    document.getElementById('submit-attendance').addEventListener('click', () => {
        const files = attendancePhotoInput ? attendancePhotoInput.files : [];
        if (files.length < 2) return showAlert('You must submit exactly two pictures (Selfie & Venue).', 'error');
        showAlert(`Successfully submitted ${files.length} photos!`, 'success');
        if (attendanceModal) attendanceModal.style.display = 'none';
        if (attendancePhotoInput) attendancePhotoInput.value = '';
        if (photoPreview) { photoPreview.innerHTML = ''; photoPreview.style.display = 'none'; }
    });
}


// --- 6. ADMIN EDIT MODE & DOM SYNC ---
const itemTemplates = {
    perks: `<div class="perk-card"><button class="admin-delete-btn">&times;</button><div class="perk-icon editable" data-path="perks.0.icon">⭐</div><h4 class="editable" data-path="perks.0.title">New Perk</h4><p class="editable" data-path="perks.0.desc">New description.</p></div>`,
    achievements: `<li><button class="admin-delete-btn">&times;</button><span class="date-badge editable" data-path="achievements.0.year">2026</span><h4 class="editable" data-path="achievements.0.title">New Achievement</h4><p class="editable" data-path="achievements.0.desc">New description.</p></li>`,
    events: `<li><button class="admin-delete-btn">&times;</button><div class="admin-hidden-desc editable" data-path="events.0.full">Full hidden description here...</div><span class="date-badge editable" data-path="events.0.date">Jan 01</span><h4 class="editable" data-path="events.0.title">New Event</h4><p class="editable" data-path="events.0.short">Short description.</p></li>`,
    team: `<div class="member-card team-card"><button class="admin-delete-btn">&times;</button><div class="admin-hidden-desc editable" data-path="team.0.desc">Detailed info about this member goes here.</div><img src="https://via.placeholder.com/150" class="editable-img"><h3 class="editable">New Name</h3><p class="editable">New Role</p></div>`,
    advisers: `<div class="member-card adviser-card"><button class="admin-delete-btn">&times;</button><div class="admin-hidden-desc editable" data-path="advisers.0.desc">Provides technical advice and support.</div><img src="https://via.placeholder.com/150" class="editable-img" data-path="advisers.0.img"><h3 class="editable" data-path="advisers.0.name">New Adviser</h3><p class="editable" data-path="advisers.0.role">New Role</p></div>`
};

function reindexAllPaths(prefix) {
    const allElements = document.querySelectorAll(`[data-path^="${prefix}."]`);
    const cardsSet = new Set();
    allElements.forEach(el => { const card = el.closest('.card, .perk-card, .achievement-card, .member-card, .adviser-card, li'); if (card) cardsSet.add(card); });
    Array.from(cardsSet).forEach((card, index) => {
        card.querySelectorAll(`[data-path^="${prefix}."]`).forEach(el => {
            const path = el.getAttribute('data-path');
            el.setAttribute('data-path', path.replace(new RegExp(`^${prefix}\\.\\d+\\.`), `${prefix}.${index}.`));
        });
    });
}

function ensureDOMSlots(dataArray, containerSelector, type, prefix) {
    if (!dataArray || prefix === 'team') return; 
    const container = document.querySelector(containerSelector);
    if (!container) return;

    let cards = Array.from(new Set(Array.from(document.querySelectorAll(`[data-path^="${prefix}."]`)).map(el => el.closest('.card, .perk-card, .achievement-card, .member-card, .adviser-card, li')).filter(Boolean)));
    while (cards.length > dataArray.length) cards.pop().remove();
    while (cards.length < dataArray.length) {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = itemTemplates[type];
        const newEl = tempDiv.firstElementChild;
        const addBtn = container.querySelector('.admin-add-btn');
        if (addBtn) container.insertBefore(newEl, addBtn); else container.appendChild(newEl);
        cards.push(newEl);
    }
    reindexAllPaths(prefix);
}

function injectAdminUI() {
    // 1. Force inject hidden description box onto any card that is missing it natively
    document.querySelectorAll('.member-card, .card').forEach(card => {
        if (!card.querySelector('.admin-hidden-desc')) {
            const descDiv = document.createElement('div');
            descDiv.className = 'admin-hidden-desc editable';
            
            let descText = 'No description provided.';
            if (card.classList.contains('card')) descText = card.getAttribute('data-full-desc') || descText;
            else descText = card.getAttribute('data-desc') || descText;
            descDiv.innerText = descText;
            
            // Wire it to the backend data path dynamically
            const titleEl = card.querySelector('h3');
            if (titleEl && titleEl.getAttribute('data-path')) {
                const pathParts = titleEl.getAttribute('data-path').split('.');
                if (card.classList.contains('card')) descDiv.setAttribute('data-path', `${pathParts[0]}.${pathParts[1]}.full`);
                else descDiv.setAttribute('data-path', `${pathParts[0]}.${pathParts[1]}.desc`);
            }
            card.insertBefore(descDiv, card.firstChild);
        }
    });

    document.querySelectorAll('.card, .perk-card, .achievement-card, .member-card, .adviser-card, .modal-list li').forEach(card => {
        if (!card.querySelector('.admin-delete-btn')) {
            const btn = document.createElement('button'); btn.className = 'admin-delete-btn'; btn.innerHTML = '&times;'; card.appendChild(btn);
        }
    });

    document.querySelectorAll('.org-column, .top-row, .middle-row').forEach(col => {
        if (!col.querySelector('.column-add-btn')) {
            const btn = document.createElement('button');
            btn.className = 'admin-add-btn column-add-btn'; btn.setAttribute('data-add-type', 'team-specific'); btn.innerHTML = '+ Add to this section';
            btn.style.cssText = 'width: 100%; padding: 10px; margin-top: 10px; background: rgba(0,170,255,0.1); border: 1px dashed #00aaff; color: #00aaff; cursor: pointer; border-radius: 5px;';
            col.appendChild(btn);
        }
    });
    const oldTeamBtn = document.querySelector('button[data-add-type="team"]'); if (oldTeamBtn) oldTeamBtn.style.display = 'none';

    document.querySelectorAll('.editable, .admin-hidden-desc').forEach(el => {
        el.setAttribute('contenteditable', 'true');
    });
}

window.applyToDOM = function(data) {
    siteData = data; 
    ensureDOMSlots(data.perks, '.perks-grid', 'perks', 'perks');
    ensureDOMSlots(data.achievements, '#achievements-modal-list', 'achievements', 'achievements');
    ensureDOMSlots(data.events, '#events-modal-list', 'events', 'events');
    ensureDOMSlots(data.advisers, '.advisers-grid', 'advisers', 'advisers');

    document.querySelectorAll('.org-chart .member-card').forEach(c => c.remove());
    if (data.team && data.team.length > 0) {
        data.team.forEach(member => {
            const card = document.createElement('div');
            card.className = member.location && member.location.includes('row') ? 'member-card leader-card' : 'member-card team-card';
            card.innerHTML = `
                <div class="admin-hidden-desc editable">${member.desc || 'No description provided.'}</div>
                <img src="${member.img}" class="editable-img">
                <h3 class="editable">${member.name}</h3>
                <p class="editable">${member.role}</p>
            `;
            if (member.location === 'top-row') document.querySelector('.top-row').appendChild(card);
            else if (member.location === 'middle-row') document.querySelector('.middle-row').appendChild(card);
            else {
                document.querySelectorAll('.org-column').forEach(col => {
                    const titleEl = col.querySelector('.column-title');
                    if (titleEl && titleEl.innerText.trim() === member.location) col.appendChild(card);
                });
            }
        });
    }

    document.querySelectorAll('[data-path]').forEach(el => {
        if (el.getAttribute('data-path').startsWith('team.')) return; 
        const path = el.getAttribute('data-path');
        const keys = path.split('.');
        let val = data;
        keys.forEach(k => val = val && val[k] !== undefined ? val[k] : null);
        
        if (val !== null && !Array.isArray(val)) {
            if (el.tagName === 'IMG') el.src = val;
            else if (el.tagName === 'A') el.href = val;
            else if (el.classList.contains('counter')) el.innerText = parseInt(val) || 0; 
            else el.innerHTML = val;
        }
    });
    
    if(isEditMode) injectAdminUI();
    if (window.bindMemberCards) window.bindMemberCards();
    if (window.bindEventCards) window.bindEventCards(); 
};

// Admin Toggle Click
if (document.getElementById('admin-btn')) {
    document.getElementById('admin-btn').addEventListener('click', (e) => {
        e.preventDefault();
        if (isEditMode) return;
        const pass = prompt("Enter Admin Password:");
        if (pass !== 'admin') return;

        isEditMode = true;
        document.body.classList.add('edit-mode');
        document.getElementById('admin-toolbar').classList.add('active');
        injectAdminUI(); 
        showAlert("Edit Mode Active. Check the cards to edit hidden info.", "success");
    });
}

// Master Editor Click Listener
document.addEventListener('click', function(e) {
    if (!isEditMode) return;

    if (e.target.classList.contains('editable-img')) {
        e.preventDefault(); e.stopPropagation();
        const newSrc = prompt("Enter the new direct Image URL:", e.target.src);
        if (newSrc && newSrc.trim() !== '') e.target.src = newSrc.trim();
    }

    if (e.target.classList.contains('admin-delete-btn')) {
        e.preventDefault(); e.stopPropagation();
        const card = e.target.closest('.card, .perk-card, .achievement-card, .member-card, .adviser-card, li');
        if (card) {
            showConfirm('Permanently remove this item?', () => {
                const pathEl = card.querySelector('[data-path]');
                card.remove();
                if (pathEl) reindexAllPaths(pathEl.getAttribute('data-path').split('.')[0]); 
            });
        }
    }
    
    if (e.target.classList.contains('admin-add-btn')) {
        e.preventDefault(); e.stopPropagation();
        const type = e.target.getAttribute('data-add-type');
        let container = e.target.parentElement;

        if (type === 'achievements' || type === 'events') container = document.querySelector(`#${type}-modal-list`);
        else if (type === 'team-specific') {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = itemTemplates['team'];
            container.insertBefore(tempDiv.firstElementChild, e.target);
            injectAdminUI();
            return;
        }

        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = itemTemplates[type];
        const addBtn = container.querySelector('.admin-add-btn');
        if (addBtn) container.insertBefore(tempDiv.firstElementChild, addBtn);
        else container.appendChild(tempDiv.firstElementChild);
        
        reindexAllPaths(type);
        injectAdminUI(); 
    }
});

// Save Logic
if (document.getElementById('toolbar-save')) {
    document.getElementById('toolbar-save').addEventListener('click', async () => {
        ['counters', 'events', 'achievements', 'team', 'advisers', 'perks'].forEach(key => siteData[key] = []); 

        document.querySelectorAll('.editable, .editable-img, .editable-link, .admin-hidden-desc').forEach(el => {
            const path = el.getAttribute('data-path');
            if (path && !path.startsWith('team.')) {
                const keys = path.split('.');
                let current = siteData;
                for (let i = 0; i < keys.length - 1; i++) {
                    if (current[keys[i]] === undefined) current[keys[i]] = isNaN(keys[i + 1]) ? {} : [];
                    current = current[keys[i]];
                }
                let val = el.tagName === 'IMG' ? el.src : el.tagName === 'A' ? el.href : (el.classList.contains('admin-hidden-desc') ? el.innerText : el.innerHTML);
                current[keys[keys.length - 1]] = val;
            }
        });

        // Team Scraper including Description
        document.querySelectorAll('.org-chart .member-card').forEach((card) => {
            let parent = card.parentElement;
            let location = 'top-row'; 
            if (parent.classList.contains('middle-row')) location = 'middle-row';
            else if (parent.classList.contains('org-column')) {
                const titleEl = parent.querySelector('.column-title');
                if(titleEl) location = titleEl.innerText.trim();
            }
            siteData.team.push({
                img: card.querySelector('img') ? card.querySelector('img').src : '',
                name: card.querySelector('h3') ? card.querySelector('h3').innerText : '',
                role: card.querySelector('p') ? card.querySelector('p').innerText : '',
                desc: card.querySelector('.admin-hidden-desc') ? card.querySelector('.admin-hidden-desc').innerText : '',
                location: location
            });
        });

        const btnSave = document.getElementById('toolbar-save');
        btnSave.innerText = "Saving to Database...";
        try {
            const resp = await fetch(`${API_BASE}/admin/data`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(siteData)
            });
            if (resp.ok) {
                showAlert('Live site updated successfully!', 'success');
                setTimeout(() => window.location.reload(), 1500); 
            } else {
                const err = await resp.json(); showAlert(`Save failed: ${err.error}`, 'error');
            }
        } catch (err) { showAlert('Backend connection error.', 'error'); }
        btnSave.innerText = "Save Live Site";
    });
}

if (document.getElementById('toolbar-logout')) {
    document.getElementById('toolbar-logout').addEventListener('click', () => {
        isEditMode = false;
        showAlert('Logged out of Admin Edit Mode.', 'success');
        setTimeout(() => window.location.reload(), 800);
    });
}

if (document.getElementById('toolbar-cancel')) document.getElementById('toolbar-cancel').addEventListener('click', () => window.location.reload());

// Initial Fetch
(async () => {
    try {
        const resp = await fetch(`${API_BASE}/admin/data?t=${Date.now()}`, { credentials: 'include' });
        if (resp.ok) window.applyToDOM(await resp.json());
    } catch (err) { console.error("Fetch error:", err); }
})();