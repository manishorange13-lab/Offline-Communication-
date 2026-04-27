/**
 * Offline Connect - Dashboard Logic
 * Hybrid Network (Mesh + Satellite) Simulation
 */

document.addEventListener('DOMContentLoaded', () => {
    // --- Auth Logic ---
    const authWrapper = document.getElementById('auth-wrapper');
    const loginScreen = document.getElementById('login-screen');
    const signupScreen = document.getElementById('signup-screen');
    const mainApp = document.getElementById('main-app');
    
    const goToSignup = document.getElementById('go-to-signup');
    const goToLogin = document.getElementById('go-to-login');
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    const logoutBtn = document.getElementById('logout-btn');
    
    // Auth Transitions
    goToSignup.addEventListener('click', (e) => {
        e.preventDefault();
        loginScreen.classList.remove('active-auth');
        setTimeout(() => signupScreen.classList.add('active-auth'), 200);
    });

    goToLogin.addEventListener('click', (e) => {
        e.preventDefault();
        signupScreen.classList.remove('active-auth');
        setTimeout(() => loginScreen.classList.add('active-auth'), 200);
    });

    // Backend Integration
    const API_URL = 'http://localhost:8000';
    let socket = null;
    let currentUser = null;

    function initSocket() {
        socket = io(API_URL);
        socket.on('connect', () => console.log('Connected to server'));
        socket.on('receive_message', (data) => {
            appendMessage(data.text, data.network_type, data.sender, false);
        });
        socket.on('receive_sos', (data) => {
            showToast(`EMERGENCY SOS from ${data.sender}!`, 'fa-radiation', 'error');
            document.body.style.boxShadow = 'inset 0 0 100px rgba(239, 68, 68, 0.8)';
            setTimeout(() => { document.body.style.boxShadow = 'none'; }, 2000);
        });
    }

    function enterApp(deviceId) {
        currentUser = deviceId;
        document.getElementById('display-user-name').textContent = deviceId;
        initSocket();
        
        authWrapper.style.opacity = '0';
        setTimeout(() => {
            authWrapper.style.display = 'none';
            mainApp.style.display = 'flex';
            setTimeout(() => {
                mainApp.style.opacity = '1';
                showToast('Device Authenticated', 'fa-shield-halved', 'success');
            }, 50);
        }, 500);
    }

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const deviceId = loginForm.querySelector('input[type="text"]').value;
        const passkey = loginForm.querySelector('input[type="password"]').value;
        try {
            const res = await fetch(`${API_URL}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ deviceId, passkey })
            });
            const data = await res.json();
            if (res.ok) enterApp(deviceId);
            else showToast(data.error, 'fa-circle-xmark', 'error');
        } catch (err) { showToast('Server offline', 'fa-triangle-exclamation', 'error'); }
    });

    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const deviceId = signupForm.querySelector('input[type="text"]').value;
        const passkey = signupForm.querySelector('input[type="password"]').value;
        try {
            const res = await fetch(`${API_URL}/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ deviceId, passkey })
            });
            const data = await res.json();
            if (res.ok) enterApp(deviceId);
            else showToast(data.error, 'fa-circle-xmark', 'error');
        } catch (err) { showToast('Server offline', 'fa-triangle-exclamation', 'error'); }
    });

    // Logout
    logoutBtn.addEventListener('click', () => {
        mainApp.style.opacity = '0';
        setTimeout(() => {
            mainApp.style.display = 'none';
            authWrapper.style.display = 'flex';
            setTimeout(() => {
                authWrapper.style.opacity = '1';
                loginScreen.classList.add('active-auth');
                signupScreen.classList.remove('active-auth');
                loginForm.reset();
                signupForm.reset();
            }, 50);
        }, 500);
    });


    // --- Main Dashboard Logic ---
    let state = {
        networkType: 'mesh', // 'mesh' | 'sat'
        autoSwitch: true,
        meshConnected: true
    };

    // DOM Elements
    const navItems = document.querySelectorAll('.nav-item:not(.logout-item), .nav-trigger');
    const screens = document.querySelectorAll('.screen');
    const toast = document.getElementById('toast');
    
    // Sidebar Status
    const sidebarStatusIcon = document.querySelector('#sidebar-status .status-indicator');
    const sidebarStatusText = document.querySelector('#sidebar-status span');
    
    // Dashboard Elements
    const dashMeshStatus = document.getElementById('dash-mesh-status');
    const dashSatStatus = document.getElementById('dash-sat-status');
    const dashMeshBadge = document.getElementById('dash-mesh-badge');
    const dashSatBadge = document.getElementById('dash-sat-badge');
    
    // Network Manager Elements
    const autoSwitchToggle = document.getElementById('auto-switch-toggle');
    const forceMeshFailBtn = document.getElementById('force-mesh-fail');
    const meshDetailCard = document.getElementById('mesh-detail-card');
    const satDetailCard = document.getElementById('sat-detail-card');
    
    // Chat Elements
    const chatInput = document.getElementById('chat-input');
    const sendMsgBtn = document.getElementById('send-msg-btn');
    const chatMessages = document.getElementById('chat-messages');

    // SOS Elements
    const sendSosBtn = document.getElementById('send-sos-btn');
    const sosRouteRadios = document.getElementsByName('sos-route');
    
    // Location Elements
    const sendLocBtn = document.getElementById('send-loc-btn');

    // Navigation Router
    function navigateTo(targetId) {
        // Update active nav item
        document.querySelectorAll('.nav-item').forEach(item => {
            if(!item.classList.contains('logout-item')) {
                item.classList.remove('active');
                if(item.dataset.target === targetId) {
                    item.classList.add('active');
                }
            }
        });

        // Update screens
        screens.forEach(screen => {
            screen.classList.remove('active');
            if(screen.id === targetId) {
                screen.classList.add('active');
            }
        });
    }

    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            const target = e.currentTarget.dataset.target;
            if(target) navigateTo(target);
        });
    });

    // Toast Notification
    function showToast(message, icon = 'fa-info-circle', type = 'info') {
        const color = type === 'success' ? 'var(--color-mesh)' : 
                      type === 'warning' ? 'var(--color-transition)' : 
                      type === 'error' ? 'var(--color-emergency)' : 'var(--color-brand)';
        
        toast.innerHTML = `<i class="fa-solid ${icon}" style="color: ${color}"></i> ${message}`;
        toast.classList.add('show');
        
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }

    // Network State Machine
    function updateNetworkUI() {
        if (state.networkType === 'mesh') {
            // Sidebar
            sidebarStatusIcon.className = 'status-indicator mesh-active';
            sidebarStatusText.textContent = 'Mesh Network';
            
            // Dashboard
            dashMeshStatus.classList.replace('standby-row', 'active-row');
            dashSatStatus.classList.replace('active-row', 'standby-row');
            dashMeshBadge.textContent = 'Primary';
            dashSatBadge.textContent = 'Backup';
            
            // Network Manager
            meshDetailCard.classList.replace('standby-detail', 'active-detail');
            satDetailCard.classList.replace('active-detail', 'standby-detail');
            document.getElementById('mesh-status-text').textContent = 'Connected';
            document.getElementById('mesh-status-text').className = 'status-text text-green';
            document.getElementById('sat-status-text').textContent = 'Standby';
            document.getElementById('sat-status-text').className = 'status-text text-gray';
            document.getElementById('sat-usage').textContent = 'Emergency Only';
            
        } else {
            // Satellite Active
            // Sidebar
            sidebarStatusIcon.className = 'status-indicator sat-active';
            sidebarStatusText.textContent = 'Satellite Network';
            
            // Dashboard
            dashMeshStatus.classList.replace('active-row', 'standby-row');
            dashSatStatus.classList.replace('standby-row', 'active-row');
            dashMeshBadge.textContent = 'Disconnected';
            dashSatBadge.textContent = 'Primary (Active)';
            
            // Network Manager
            meshDetailCard.classList.replace('active-detail', 'standby-detail');
            satDetailCard.classList.replace('standby-detail', 'active-detail');
            document.getElementById('mesh-status-text').textContent = 'Disconnected';
            document.getElementById('mesh-status-text').className = 'status-text text-emergency';
            document.getElementById('sat-status-text').textContent = 'Active Connection';
            document.getElementById('sat-status-text').className = 'status-text text-purple';
            document.getElementById('sat-usage').textContent = 'Primary Data Link';
        }
    }

    // Interactions
    autoSwitchToggle.addEventListener('change', (e) => {
        state.autoSwitch = e.target.checked;
        if(state.autoSwitch && !state.meshConnected) {
            state.networkType = 'sat';
        } else if (state.autoSwitch && state.meshConnected) {
            state.networkType = 'mesh';
        }
        updateNetworkUI();
        showToast(`Auto Switching ${state.autoSwitch ? 'Enabled' : 'Disabled'}`, 'fa-microchip');
    });

    forceMeshFailBtn.addEventListener('click', () => {
        if (state.meshConnected) {
            // Simulate Failure
            state.meshConnected = false;
            forceMeshFailBtn.textContent = 'Restore Mesh Network';
            forceMeshFailBtn.classList.add('btn-primary');
            forceMeshFailBtn.classList.remove('btn-outline');
            
            // Update signal bars
            document.querySelectorAll('#mesh-signal .bar').forEach(b => b.className = 'bar empty');
            document.getElementById('mesh-device-count').textContent = '0 Nearby';
            document.getElementById('dash-mesh-desc').textContent = 'Connection Lost';

            showToast('Mesh Network Failed!', 'fa-triangle-exclamation', 'error');

            if (state.autoSwitch) {
                setTimeout(() => {
                    showToast('Auto-switching to Satellite...', 'fa-satellite', 'warning');
                    setTimeout(() => {
                        state.networkType = 'sat';
                        updateNetworkUI();
                        showToast('Connected to Satellite', 'fa-satellite-dish', 'success');
                    }, 1500);
                }, 1000);
            } else {
                updateNetworkUI();
            }

        } else {
            // Restore
            state.meshConnected = true;
            forceMeshFailBtn.textContent = 'Simulate Mesh Failure';
            forceMeshFailBtn.classList.remove('btn-primary');
            forceMeshFailBtn.classList.add('btn-outline');
            
            // Update signal bars
            const bars = document.querySelectorAll('#mesh-signal .bar');
            for(let i=0; i<4; i++) bars[i].className = 'bar active';
            document.getElementById('mesh-device-count').textContent = '3 Nearby';
            document.getElementById('dash-mesh-desc').textContent = '3 Nodes Nearby';

            showToast('Mesh Network Restored', 'fa-circle-nodes', 'success');
            
            if (state.autoSwitch) {
                setTimeout(() => {
                    state.networkType = 'mesh';
                    updateNetworkUI();
                    showToast('Switched back to Mesh (Fastest)', 'fa-bolt', 'info');
                }, 1000);
            }
        }
    });

    // Chat Logic
    function appendMessage(text, network_type, senderName, isSent) {
        const now = new Date();
        const timeStr = now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        
        let metaHtml = '';
        if(network_type === 'mesh') {
            metaHtml = `${timeStr} <i class="fa-solid fa-check-double text-green"></i> via Mesh`;
        } else {
            metaHtml = `${timeStr} <i class="fa-solid fa-satellite-dish text-purple"></i> via Satellite`;
        }

        const msgDiv = document.createElement('div');
        msgDiv.className = `message ${isSent ? 'sent' : 'received'}`;
        msgDiv.innerHTML = `
            ${!isSent ? `<small style="display:block; color:var(--color-brand); margin-bottom:5px; font-weight:bold;">${senderName}</small>` : ''}
            <p>${text}</p>
            <span class="meta">${metaHtml}</span>
        `;
        
        chatMessages.appendChild(msgDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function sendMessage() {
        const text = chatInput.value.trim();
        if(!text) return;
        
        const network_type = state.networkType;
        appendMessage(text, network_type, currentUser, true);
        chatInput.value = '';
        
        if (socket) {
            socket.emit('chat_message', {
                sender: currentUser,
                text: text,
                network_type: network_type
            });
        }
    }

    sendMsgBtn.addEventListener('click', sendMessage);
    chatInput.addEventListener('keypress', (e) => {
        if(e.key === 'Enter') sendMessage();
    });

    // SOS Radio Styles
    sosRouteRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            document.querySelectorAll('.sos-radio .radio-option').forEach(opt => opt.classList.remove('active-option'));
            e.target.closest('.radio-option').classList.add('active-option');
        });
    });

    sendSosBtn.addEventListener('click', () => {
        const mode = document.querySelector('input[name="sos-route"]:checked').value;
        let routeMsg = mode === 'auto' ? 'Auto Routing' : mode === 'mesh' ? 'Mesh Network' : 'Satellite Link';
        
        showToast(`SOS Alert Broadcasted via ${routeMsg}!`, 'fa-triangle-exclamation', 'error');
        
        if (socket) {
            socket.emit('sos_alert', {
                sender: currentUser,
                route: mode
            });
        }

        // Add visual pulse effect
        document.body.style.boxShadow = 'inset 0 0 100px rgba(239, 68, 68, 0.5)';
        setTimeout(() => {
            document.body.style.boxShadow = 'none';
        }, 1000);
    });

    sendLocBtn.addEventListener('click', () => {
        showToast('Precise location sent securely.', 'fa-map-location-dot', 'success');
    });

    // Map Logic
    let map = null;
    let userMarker = null;

    function initMap() {
        if (map) return; // Already initialized

        // Initialize map centered roughly (default)
        map = L.map('map').setView([34.0522, -118.2437], 13);
        
        // Dark mode map tiles (CartoDB Dark Matter)
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
            subdomains: 'abcd',
            maxZoom: 20
        }).addTo(map);

        // Try to get real location
        if (navigator.geolocation) {
            document.getElementById('live-coords').innerHTML = '<i class="fa-solid fa-satellite fa-spin"></i> Acquiring GPS...';
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    const lat = pos.coords.latitude;
                    const lon = pos.coords.longitude;
                    
                    // Update map
                    map.setView([lat, lon], 15);
                    
                    // Create a custom icon
                    const customIcon = L.divIcon({
                        className: 'custom-map-marker',
                        html: '<i class="fa-solid fa-location-crosshairs fa-2x text-brand glow-icon"></i>',
                        iconSize: [30, 30],
                        iconAnchor: [15, 15]
                    });

                    userMarker = L.marker([lat, lon], {icon: customIcon}).addTo(map)
                        .bindPopup('<b>You are here</b><br>Device Node')
                        .openPopup();

                    document.getElementById('live-coords').innerHTML = `${lat.toFixed(4)}° N, ${lon.toFixed(4)}° E`;
                    showToast('GPS Lock Acquired', 'fa-satellite', 'success');
                },
                (err) => {
                    document.getElementById('live-coords').innerHTML = 'GPS Signal Lost';
                    showToast('Could not acquire location', 'fa-triangle-exclamation', 'warning');
                },
                { enableHighAccuracy: true, timeout: 10000 }
            );
        }
    }

    // Initialize map when Location Share tab is clicked
    document.querySelector('.nav-item[data-target="location"]').addEventListener('click', () => {
        setTimeout(initMap, 200); // Give CSS transition time to render before drawing map
    });

    // Initialize
    updateNetworkUI();
});
