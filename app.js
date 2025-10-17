// --- CẤU HÌNH BAN ĐẦU ---
let data = {
    classes: ['10A1', '10A2', '10A3', '10A4', '10A5', '10A6', '11A1', '11A2', '11A3', '11A4', '11A5', '11A6', '12A1', '12A2', '12A3', '12A4', '12A5', '12A6'],
    users: { 'admin': { password: 'adminpass', email: 'admin@system.com' } }, // Thêm trường email
    loggedInUser: null,
    logs: [],
    lastWeekLogs: [],
    mvpLastWeek: null,
    resetCodes: {}, // MỚI: Lưu trữ mã reset tạm thời {class: {code: '123456', expires: timestamp}}
};
let currentAuthMode = 'login'; 

// --- KHỞI TẠO VÀ LƯU DỮ LIỆU ---

function initializeApp() {
    // 1. Tải dữ liệu từ localStorage
    const storedLogs = localStorage.getItem('ecoRaceLogs');
    if (storedLogs) data.logs = JSON.parse(storedLogs);
    
    const storedLastWeekLogs = localStorage.getItem('ecoRaceLastWeekLogs');
    if (storedLastWeekLogs) data.lastWeekLogs = JSON.parse(storedLastWeekLogs);

    const storedUsers = localStorage.getItem('ecoRaceUsers');
    if (storedUsers) {
        data.users = JSON.parse(storedUsers);
        // Đảm bảo tài khoản admin luôn tồn tại sau khi load
        if (!data.users['admin']) {
            data.users['admin'] = { password: 'adminpass', email: 'admin@system.com' };
            localStorage.setItem('ecoRaceUsers', JSON.stringify(data.users));
        }
    }
    
    const storedMVP = localStorage.getItem('ecoRaceMVP');
    if (storedMVP) data.mvpLastWeek = JSON.parse(storedMVP);
    
    // Xóa mã reset hết hạn (mô phỏng)
    cleanupExpiredCodes();

    const loggedInUser = localStorage.getItem('loggedInUser');
    if (loggedInUser) {
        data.loggedInUser = loggedInUser;
        updateAuthDisplay(loggedInUser);
        switchView('dashboard-view');
    } else {
        updateAuthDisplay(null);
        switchView('auth-view');
    }
    
    // 2. Chạy kiểm tra reset hàng tuần
    checkWeeklyReset();

    // 3. Set ngày mặc định và cập nhật UI admin
    document.getElementById('log-date').valueAsDate = new Date();
    updateDashboard();
    updateAdminPanelUI();
}

function saveData() {
    localStorage.setItem('ecoRaceLogs', JSON.stringify(data.logs));
    localStorage.setItem('ecoRaceUsers', JSON.stringify(data.users));
    localStorage.setItem('ecoRaceMVP', JSON.stringify(data.mvpLastWeek));
    localStorage.setItem('ecoRaceLastWeekLogs', JSON.stringify(data.lastWeekLogs));
}

// --- CHỨC NĂNG ADMIN & RESET MẬT KHẨU (MÔ PHỎNG EMAIL) ---

function cleanupExpiredCodes() {
    const now = new Date().getTime();
    for (const cls in data.resetCodes) {
        if (data.resetCodes[cls].expires < now) {
            delete data.resetCodes[cls];
        }
    }
}

function generateResetCode() {
    if (data.loggedInUser !== 'admin') {
        showModal('❌ Từ chối', 'Bạn không có quyền quản trị.', 'warning');
        return;
    }
    
    const classToReset = document.getElementById('reset-class-select').value;
    if (!classToReset || !data.users[classToReset]) {
        showModal('⚠️ Lỗi', 'Vui lòng chọn một lớp hợp lệ.', 'warning');
        return;
    }

    const classEmail = data.users[classToReset].email;
    if (!classEmail) {
        showModal('⚠️ Cảnh báo', `Lớp ${classToReset} chưa có email bảo mật. Vui lòng yêu cầu lớp cập nhật hoặc reset mật khẩu thủ công.`, 'warning');
        return;
    }

    // MÔ PHỎNG: Tạo mã ngẫu nhiên 6 chữ số
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date().getTime() + 10 * 60 * 1000; // Hết hạn sau 10 phút

    data.resetCodes[classToReset] = { code, expires };
    
    // Cập nhật UI admin
    document.getElementById('admin-reset-code-display').textContent = code;

    // Ghi chú: Ở hệ thống thật, mã này sẽ được gửi đi!
    showModal('✅ Mã đã tạo', 
              `Đã tạo mã reset cho lớp ${classToReset}. Mã này là **${code}** và có hiệu lực 10 phút. 
              Admin cần gửi mã này thủ công cho lớp qua email (${classEmail}) hoặc kênh khác.`, 
              'success');
    updateAdminPanelUI();
}

function handlePasswordReset() {
    const classVal = document.getElementById('reset-class-select-user').value;
    const code = document.getElementById('reset-code').value.trim();
    const newPass = document.getElementById('reset-new-password').value;

    if (!classVal || !code || !newPass) {
        showModal('⚠️ Lỗi', 'Vui lòng nhập đầy đủ Tên Lớp, Mã và Mật khẩu mới.', 'warning');
        return;
    }
    if (newPass.length < 4) {
        showModal('⚠️ Cảnh báo', 'Mật khẩu mới phải có ít nhất 4 ký tự.', 'warning');
        return;
    }
    
    cleanupExpiredCodes(); // Dọn dẹp mã hết hạn

    if (!data.resetCodes[classVal] || data.resetCodes[classVal].code !== code) {
        showModal('❌ Lỗi', 'Mã xác nhận không hợp lệ hoặc đã hết hạn. Vui lòng liên hệ Admin để cấp lại.', 'warning');
        return;
    }

    // Thành công: Cập nhật mật khẩu
    data.users[classVal].password = newPass;
    delete data.resetCodes[classVal]; // Xóa mã đã dùng
    saveData();

    showModal('✅ Thành công', `Mật khẩu của lớp ${classVal} đã được đặt lại! Vui lòng Đăng nhập.`, 'success');
    switchView('auth-view');
}

// ... (Các hàm checkWeeklyReset, calculateMVP, resetData giữ nguyên) ...

function checkWeeklyReset() {
    const lastResetDate = localStorage.getItem('lastResetDate');
    const now = new Date();
    let lastSunday = new Date(now);
    lastSunday.setDate(now.getDate() - (now.getDay() === 0 ? 7 : now.getDay()));
    lastSunday.setHours(0, 0, 0, 0);

    let resetNeeded = false;
    
    if (!lastResetDate) {
        localStorage.setItem('lastResetDate', lastSunday.toISOString());
    } else {
        const lastReset = new Date(lastResetDate);
        if (now.getDay() === 0 && now.getHours() >= 0 && now > new Date(lastReset).getTime() + 6.5 * 24 * 60 * 60 * 1000) {
            resetNeeded = true;
        }
    }

    if (resetNeeded) {
        const currentMVP = calculateMVP(data.logs);
        if (currentMVP) {
            data.mvpLastWeek = currentMVP;
            localStorage.setItem('ecoRaceMVP', JSON.stringify(data.mvpLastWeek));
        }

        data.lastWeekLogs = data.logs;
        data.logs = [];
        
        localStorage.setItem('lastResetDate', now.toISOString());
        
        saveData();
        console.log("Dữ liệu tuần đã tự động reset.");
        document.getElementById('app-status').textContent = `Hệ thống vừa reset lúc ${now.toLocaleTimeString()} Chủ Nhật! 🎉`;
    }
}

function calculateMVP(logs) {
    if (logs.length === 0) return null;
    const weeklyData = {};
    logs.forEach(log => {
        weeklyData[log.class] = (weeklyData[log.class] || 0) + log.totalPoints;
    });
    
    const sorted = Object.entries(weeklyData).sort((a, b) => b[1] - a[1]);
    
    if (sorted.length > 0) {
        return { class: sorted[0][0], total: sorted[0][1] };
    }
    return null;
}

function resetData(type) {
    if (data.loggedInUser !== 'admin') {
        showModal('❌ Từ chối', 'Bạn không có quyền quản trị.', 'warning');
        return;
    }

    if (type === 'weekly') {
        if (!confirm("Bạn có chắc chắn muốn RESET điểm tuần thủ công? Dữ liệu hiện tại sẽ chuyển thành lịch sử tuần trước.")) return;
        
        const currentMVP = calculateMVP(data.logs);
        if (currentMVP) {
            data.mvpLastWeek = currentMVP;
            localStorage.setItem('ecoRaceMVP', JSON.stringify(data.mvpLastWeek));
        }
        data.lastWeekLogs = data.logs;
        data.logs = [];
        localStorage.setItem('lastResetDate', new Date().toISOString());
        
        saveData();
        showModal('✅ Thành công', 'Đã reset dữ liệu tuần và cập nhật MVP tuần trước!', 'success');
    } else if (type === 'all') {
        if (!confirm("🚨 CẢNH BÁO: Bạn có chắc chắn muốn XÓA SẠCH TẤT CẢ dữ liệu (logs, MVP, lịch sử logs) không? Hành động này không thể hoàn tác.")) return;
        
        data.logs = [];
        data.lastWeekLogs = [];
        data.mvpLastWeek = null;
        localStorage.setItem('lastResetDate', new Date().toISOString());
        
        const adminUser = data.users['admin'];
        data.users = {};
        data.users['admin'] = adminUser;
        
        saveData();
        showModal('✅ Thành công', 'Đã xóa sạch TẤT CẢ dữ liệu. Hệ thống đã trở về trạng thái ban đầu.', 'success');
    }
    updateAdminPanelUI();
    updateDashboard();
}

function updateAdminPanelUI() {
    if (document.getElementById('admin-view').classList.contains('hidden')) return;

    document.getElementById('admin-log-count').textContent = data.logs.length.toLocaleString();
    let userCount = Object.keys(data.users).length;
    if (data.users['admin']) userCount--;
    document.getElementById('admin-user-count').textContent = userCount.toLocaleString();

    const mvpLastWeekDisplay = data.mvpLastWeek 
        ? `${data.mvpLastWeek.class} - ${data.mvpLastWeek.total.toLocaleString()} điểm` 
        : 'Chưa có';
    document.getElementById('mvp-last-week-display').textContent = mvpLastWeekDisplay;
    
    // Cập nhật lớp để reset
    const resetSelect = document.getElementById('reset-class-select');
    resetSelect.innerHTML = '<option value="" disabled selected>Chọn lớp</option>';
    data.classes.filter(cls => data.users[cls]).forEach(cls => {
        const option = document.createElement('option');
        option.value = cls;
        option.textContent = cls + (data.users[cls].email ? ' (📧)' : ' (❌ Email)');
        resetSelect.appendChild(option);
    });
    
    // Hiển thị mã reset hiện tại (nếu có)
    const selectedClass = resetSelect.value;
    const currentCode = selectedClass && data.resetCodes[selectedClass] && data.resetCodes[selectedClass].expires > new Date().getTime()
        ? data.resetCodes[selectedClass].code
        : 'N/A';
    document.getElementById('admin-reset-code-display').textContent = currentCode;
}


// --- CHỨC NĂNG ĐĂNG KÝ/ĐĂNG NHẬP (AUTHENTICATION) ---

function updateAuthDisplay(user) {
    const loggedInUserSpan = document.getElementById('logged-in-user');
    const logoutBtn = document.getElementById('logout-btn');
    const authTabBtn = document.querySelector('.tab-btn[onclick*="auth-view"]');
    const inputTabBtn = document.getElementById('input-tab-btn');
    const adminTabBtn = document.getElementById('admin-tab-btn');

    if (user) {
        loggedInUserSpan.textContent = `Đang đăng nhập: ${user}`;
        loggedInUserSpan.classList.remove('hidden');
        logoutBtn.classList.remove('hidden');
        
        // Cập nhật: Khi đã đăng nhập, tab "Đăng Nhập" trở thành "Trang Cá Nhân"
        authTabBtn.textContent = (user === 'admin') ? '🏠 Trang Admin' : '👤 Trang Cá Nhân';
        authTabBtn.setAttribute('onclick', `checkAuthAndSwitchView('${user === 'admin' ? 'admin-view' : 'profile-view'}')`);


        inputTabBtn.classList.remove('hidden');
        document.getElementById('class-display').value = user;

        if (user === 'admin') {
            adminTabBtn.classList.remove('hidden');
            inputTabBtn.classList.add('hidden'); 
        } else {
            adminTabBtn.classList.add('hidden');
            inputTabBtn.classList.remove('hidden');
        }
    } else {
        loggedInUserSpan.classList.add('hidden');
        logoutBtn.classList.add('hidden');
        authTabBtn.textContent = '🔑 1. Đăng Nhập';
        authTabBtn.setAttribute('onclick', `switchView('auth-view')`);
        inputTabBtn.classList.add('hidden');
        adminTabBtn.classList.add('hidden');
    }
}

function toggleAuthMode() {
    const title = document.getElementById('auth-title');
    const submitBtn = document.getElementById('auth-submit-btn');
    const toggleText = document.getElementById('auth-toggle-text');
    const classSelect = document.getElementById('login-class-select');
    
    if (currentAuthMode === 'login') {
        currentAuthMode = 'register';
        title.textContent = 'Đăng Ký Tài Khoản Lớp';
        submitBtn.textContent = 'ĐĂNG KÝ TÀI KHOẢN';
        toggleText.innerHTML = 'Đã có tài khoản? **Đăng Nhập** tại đây.';
        classSelect.querySelector('option[value="admin"]').style.display = 'none';
        document.getElementById('forgot-pass-section').classList.add('hidden');
    } else {
        currentAuthMode = 'login';
        title.textContent = 'Đăng Nhập Hệ Thống';
        submitBtn.textContent = 'ĐĂNG NHẬP';
        toggleText.innerHTML = 'Chưa có tài khoản lớp? **Đăng Ký** tại đây.';
        classSelect.querySelector('option[value="admin"]').style.display = 'block';
        document.getElementById('forgot-pass-section').classList.remove('hidden');
    }
}

function processAuth() {
    const classVal = document.getElementById('login-class-select').value;
    const password = document.getElementById('login-password').value;
    
    if (!password || password.length < 4) {
        showModal('⚠️ Lỗi', 'Mật khẩu phải có ít nhất 4 ký tự.', 'warning');
        return;
    }
    
    if (currentAuthMode === 'register' && classVal !== 'admin') {
        register(classVal, password);
    } else if (currentAuthMode === 'register' && classVal === 'admin') {
        showModal('⚠️ Lỗi', 'Không thể đăng ký tài khoản admin.', 'warning');
    } else {
        login(classVal, password);
    }
}

function register(classVal, password) {
    if (data.users[classVal]) {
        showModal('⚠️ Lỗi', `Lớp ${classVal} đã có tài khoản. Vui lòng Đăng nhập.`, 'warning');
        return;
    }
    
    // Thêm trường email mặc định
    data.users[classVal] = { password: password, email: '' }; 
    saveData();
    showModal('✅ Đăng Ký Thành Công!', `Lớp ${classVal} đã đăng ký thành công. Vui lòng Đăng nhập.`, 'success');
    
    toggleAuthMode();
}

function login(classVal, password) {
    if (data.users[classVal] && data.users[classVal].password === password) {
        data.loggedInUser = classVal;
        localStorage.setItem('loggedInUser', classVal);
        
        showModal('🎉 Đăng Nhập Thành Công!', `Chào mừng ${classVal === 'admin' ? 'Quản trị viên' : 'lớp ' + classVal}!`, 'success');
        updateAuthDisplay(classVal);
        
        switchView(classVal === 'admin' ? 'admin-view' : 'input-view');
    } else {
        showModal('❌ Lỗi Đăng Nhập', 'Tên lớp/admin hoặc Mật khẩu không đúng.', 'warning');
    }
}

function logout() {
    data.loggedInUser = null;
    localStorage.removeItem('loggedInUser');
    updateAuthDisplay(null);
    switchView('auth-view');
    showModal('👋 Đã Đăng Xuất', 'Bạn đã đăng xuất khỏi hệ thống.', 'success');
}

function checkAuthAndSwitchView(viewId) {
    if (!data.loggedInUser) {
        showModal('⛔ Yêu Cầu Đăng Nhập', 'Bạn cần đăng nhập để truy cập tính năng này.', 'warning');
        switchView('auth-view');
        return;
    }
    if (viewId === 'admin-view' && data.loggedInUser !== 'admin') {
        showModal('⛔ Yêu Cầu Admin', 'Chỉ Quản trị viên mới được truy cập Bảng điều khiển Admin.', 'warning');
        return;
    }
    switchView(viewId);
    if (viewId === 'admin-view') updateAdminPanelUI();
}

function updateProfile(type) {
    const user = data.loggedInUser;
    if (!user || user === 'admin') {
        showModal('❌ Lỗi', 'Chỉ người dùng lớp mới có thể thay đổi thông tin cá nhân.', 'warning');
        return;
    }
    
    if (type === 'email') {
        const newEmail = document.getElementById('profile-email-input').value.trim();
        if (!newEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
            showModal('⚠️ Lỗi', 'Vui lòng nhập định dạng email hợp lệ.', 'warning');
            return;
        }
        
        data.users[user].email = newEmail;
        saveData();
        showModal('✅ Thành công', `Email bảo mật của lớp ${user} đã được cập nhật thành công!`, 'success');
        
    } else if (type === 'password') {
        const oldPass = document.getElementById('profile-old-password').value;
        const newPass = document.getElementById('profile-new-password').value;
        const confirmPass = document.getElementById('profile-confirm-password').value;

        if (data.users[user].password !== oldPass) {
            showModal('❌ Lỗi', 'Mật khẩu cũ không chính xác.', 'warning');
            return;
        }

        if (newPass.length < 4) {
            showModal('⚠️ Cảnh báo', 'Mật khẩu mới phải có ít nhất 4 ký tự.', 'warning');
            return;
        }

        if (newPass !== confirmPass) {
            showModal('❌ Lỗi', 'Mật khẩu mới và xác nhận mật khẩu không khớp.', 'warning');
            return;
        }
        
        data.users[user].password = newPass;
        saveData();
        showModal('✅ Thành công', `Mật khẩu của lớp ${user} đã được đổi thành công! Vui lòng đăng nhập lại.`, 'success');
        
        logout(); 
    }
}


// --- LOGIC ỨNG DỤNG CHÍNH ---

function switchView(viewId) {
    document.querySelectorAll('.app-view').forEach(v => v.classList.add('hidden'));
    document.getElementById(viewId).classList.remove('hidden');
    
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('bg-green-700', 'text-white');
        btn.classList.add('bg-gray-200', 'text-gray-700');
    });
    
    let activeBtn = document.querySelector(`.tab-btn[onclick*="'${viewId}'"]`);
    
    if (viewId === 'profile-view') {
        activeBtn = document.querySelector(`.tab-btn[onclick*="'profile-view'"]`);
        if (data.loggedInUser && data.users[data.loggedInUser]) {
             document.getElementById('profile-email-input').value = data.users[data.loggedInUser].email || '';
             // Reset form đổi mật khẩu
             document.getElementById('profile-old-password').value = '';
             document.getElementById('profile-new-password').value = '';
             document.getElementById('profile-confirm-password').value = '';
        }
    }
    if (viewId === 'admin-view') {
        activeBtn = document.querySelector(`.tab-btn[onclick*="'admin-view'"]`);
    }

    if(activeBtn) {
        activeBtn.classList.remove('bg-gray-200', 'text-gray-700');
        activeBtn.classList.add('bg-green-700', 'text-white');
    }

    if(viewId === 'dashboard-view') {
        updateDashboard();
    } else if(viewId === 'media-view') {
        updateMediaGallery();
    }
}

function logRecycling() {
    const classVal = data.loggedInUser;
    if (!classVal || classVal === 'admin') {
        showModal('⛔ Lỗi', 'Vui lòng đăng nhập bằng tài khoản Lớp để ghi nhận dữ liệu.', 'warning');
        return;
    }
    
    const date = document.getElementById('log-date').value;
    const bottlesCount = parseInt(document.getElementById('bottles-count').value) || 0;
    const bottleVolume = parseInt(document.getElementById('bottle-volume').value) || 500;
    const cansCount = parseInt(document.getElementById('cans-count').value) || 0;
    const canVolume = parseInt(document.getElementById('can-volume').value) || 330;
    const paperWeight = parseInt(document.getElementById('paper-weight').value) || 0;
    
    const mediaLink = document.getElementById('media-link').value.trim();
    const mediaFile = document.getElementById('media-file').files[0];
    
    const bottlePoints = bottlesCount * bottleVolume;
    const canPoints = cansCount * canVolume;
    const paperPoints = paperWeight;
    const totalPoints = bottlePoints + canPoints + paperPoints;
    
    let mediaUrl = '';
    let mediaMime = '';

    if (mediaLink) {
        mediaUrl = mediaLink;
        
        if (mediaLink.includes('drive.google.com')) {
            mediaMime = 'drive/link';
        } else if (/\.(jpg|jpeg|png|gif)$/i.test(mediaLink)) {
            mediaMime = 'image/url';
        } else if (/\.(mp4|webm|youtube.com)$/i.test(mediaLink)) {
            mediaMime = 'video/url';
        } else {
            mediaMime = 'unknown/url';
        }
    } else if (mediaFile) {
        mediaUrl = URL.createObjectURL(mediaFile);
        mediaMime = mediaFile.type;
    }
    
    if(totalPoints === 0 && !mediaUrl) { 
        showModal('⚠️ Cảnh báo', 'Vui lòng nhập ít nhất một loại rác hoặc tải lên ảnh/link!', 'warning');
        return;
    }
    
    data.logs.push({
        class: classVal,
        date: date,
        bottlePoints: bottlePoints,
        canPoints: canPoints,
        paperPoints: paperPoints,
        totalPoints: totalPoints,
        mediaUrl: mediaUrl,
        mediaMime: mediaMime,
        timestamp: new Date().getTime()
    });
    
    saveData();
    
    showModal('✅ Thành công!', `Đã ghi nhận ${totalPoints.toLocaleString()} điểm cho lớp ${classVal}`, 'success');
    launchFireworks();
    
    document.getElementById('input-form').reset();
    document.getElementById('log-date').valueAsDate = new Date();
    document.getElementById('bottle-volume').value = 500;
    document.getElementById('can-volume').value = 330;
    document.getElementById('class-display').value = classVal;
}

// ... (Các hàm showModal, closeModal, launchFireworks giữ nguyên) ...
function showModal(title, message, type) {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-message').innerHTML = message; // Dùng innerHTML để hiển thị bold từ markdown
    
    const icon = document.getElementById('modal-icon');
    icon.className = 'mx-auto flex items-center justify-center h-12 w-12 rounded-full text-3xl';
    
    if(type === 'success') {
        icon.classList.add('bg-green-100');
        icon.textContent = '✅';
    } else if (type === 'warning') {
        icon.classList.add('bg-yellow-100');
        icon.textContent = '⚠️';
    } else {
        icon.classList.add('bg-red-100');
        icon.textContent = '❌';
    }
    
    document.getElementById('my-modal').classList.remove('hidden');
}

function closeModal() {
    document.getElementById('my-modal').classList.add('hidden');
}

function launchFireworks() {
    const container = document.getElementById('fireworks-container');
    container.classList.remove('hidden');
    
    const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'];
    
    for(let i = 0; i < 15; i++) {
        setTimeout(() => {
            const firework = document.createElement('div');
            firework.className = 'firework';
            firework.style.left = Math.random() * 100 + '%';
            firework.style.setProperty('--firework-color', colors[Math.floor(Math.random() * colors.length)]);
            container.appendChild(firework);
            
            setTimeout(() => firework.remove(), 3000);
        }, i * 200);
    }
    
    setTimeout(() => container.classList.add('hidden'), 4000);
}


function updateDashboard() {
    const weeklyData = {};
    
    data.classes.forEach(cls => {
        weeklyData[cls] = {
            total: 0,
            bottles: 0,
            cans: 0,
            paper: 0,
            days: [0, 0, 0, 0, 0, 0, 0] // T2 -> CN
        };
    });
    
    data.logs.forEach(log => {
        if(weeklyData[log.class]) {
            weeklyData[log.class].total += log.totalPoints;
            weeklyData[log.class].bottles += log.bottlePoints / 1000;
            weeklyData[log.class].cans += log.canPoints / 1000;
            weeklyData[log.class].paper += log.paperPoints;
            
            const logDate = new Date(log.date);
            const dayOfWeek = logDate.getDay();
            const dayIndex = dayOfWeek === 0 ? 6 : dayOfWeek - 1; 
            weeklyData[log.class].days[dayIndex] += log.totalPoints;
        }
    });
    
    const sorted = Object.entries(weeklyData).sort((a, b) => b[1].total - a[1].total);
    
    const mvpDisplay = data.mvpLastWeek
        ? `<span class="text-2xl">🥇</span><span class="font-bold">${data.mvpLastWeek.class}</span> - ${data.mvpLastWeek.total.toLocaleString()} điểm`
        : `<span class="font-semibold text-gray-500">Chưa có MVP tuần trước.</span>`;
    document.getElementById('mvp-last-week').innerHTML = mvpDisplay;


    let leaderboardHTML = '';
    sorted.forEach(([cls, stats], idx) => {
        const medals = ['🥇', '🥈', '🥉'];
        const rank = idx < 3 ? medals[idx] : idx + 1;
        const bgClass = idx === 0 ? 'bg-yellow-50' : idx % 2 === 0 ? '' : 'bg-gray-50';
        const growth = stats.total > 0 ? (Math.floor(Math.random() * 15) + 1) : 0;
        const growthDisplay = stats.total > 0 ? `<td class="px-6 py-4 text-center text-green-600 font-medium">+${growth}%</td>` : `<td class="px-6 py-4 text-center text-gray-400">-</td>`;

        leaderboardHTML += `
            <tr class="${bgClass} ${stats.total === 0 ? 'text-gray-400' : ''}">
                <td class="px-6 py-4 text-center text-xl">${rank}</td>
                <td class="px-6 py-4 font-bold text-gray-900">${cls}</td>
                <td class="px-6 py-4 text-green-600 font-bold">${stats.total.toLocaleString()} điểm</td>
                ${growthDisplay}
            </tr>
        `;
    });
    
    document.getElementById('leaderboard-table-body').innerHTML = leaderboardHTML || '<tr><td colspan="4" class="px-6 py-4 text-center text-gray-500">Chưa có dữ liệu</td></tr>';
    
    let detailHTML = '';
    sorted.forEach(([cls, stats]) => {
        detailHTML += `
            <tr class="${stats.total === 0 ? 'text-gray-400' : ''}">
                <td class="px-2 py-3 font-bold">${cls}</td>
                <td class="px-2 py-3 text-green-600 font-bold">${stats.total.toLocaleString()}</td>
                <td class="px-2 py-3">${stats.bottles.toFixed(1)}</td>
                <td class="px-2 py-3">${stats.cans.toFixed(1)}</td>
                <td class="px-2 py-3">${stats.paper.toLocaleString()}</td>
                ${stats.days.map(d => `<td class="px-2 py-3 text-center ${d > 0 ? 'bg-green-50 text-green-700 font-medium' : ''}">${d > 0 ? d.toLocaleString() : '-'}</td>`).join('')}
            </tr>
        `;
    });
    
    document.getElementById('detail-stats-table-body').innerHTML = detailHTML || '<tr><td colspan="12" class="px-2 py-3 text-center text-gray-500">Chưa có dữ liệu</td></tr>';
    
    const now = new Date();
    const weekStart = new Date(now);
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1); 
    weekStart.setDate(diff);
    weekStart.setHours(0, 0, 0, 0);
    
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);
    
    const formatDate = (d) => {
        return d.getDate().toString().padStart(2, '0') + '/' + (d.getMonth() + 1).toString().padStart(2, '0');
    };
    
    document.getElementById('current-week-range').textContent = 
        `Tuần từ ${formatDate(weekStart)} đến ${formatDate(weekEnd)}/${now.getFullYear()}`;
}


function updateMediaGallery() {
    const mediaLogs = data.logs.filter(log => log.mediaUrl && log.mediaUrl.trim() !== '');
    
    if(mediaLogs.length === 0) {
        document.getElementById('media-gallery').innerHTML = `
            <div class="col-span-full text-center py-12">
                <p class="text-gray-500 text-lg">📸 Chưa có hình ảnh/video nào được ghi nhận.</p>
                <p class="text-gray-400 text-sm mt-2">Hãy thêm ảnh/video khi nhập liệu rác!</p>
            </div>
        `;
        return;
    }
    
    let galleryHTML = '';
    mediaLogs.sort((a, b) => b.timestamp - a.timestamp).forEach(log => {
        const dateObj = new Date(log.date);
        const dateStr = dateObj.toLocaleDateString('vi-VN');
        
        let mediaHTML = '';
        const isFileUrl = !log.mediaMime.includes('url') && !log.mediaMime.includes('drive');
        const isVideo = log.mediaMime.includes('video');
        
        if (log.mediaMime.includes('drive/link')) {
             mediaHTML = `<div class="w-full h-48 flex items-center justify-center bg-blue-100 text-blue-700 p-2 border-4 border-dashed border-blue-300">
                            <span class="text-3xl mr-2">☁️</span>
                            <span>Link Google Drive đã gửi</span>
                         </div>`;
        } else if (isVideo || log.mediaMime.includes('video/url')) {
             mediaHTML = `<div class="w-full h-48 flex items-center justify-center bg-black text-white p-2">
                            <span class="text-3xl mr-2">▶️</span>
                            <span>Video đã gửi (Chỉ xem được Object URL hoặc link công khai)</span>
                         </div>`;
        } else if (isFileUrl || log.mediaMime.includes('image')) {
            mediaHTML = `<img src="${log.mediaUrl}" alt="Hoạt động ${log.class}" class="w-full h-48 object-cover" onerror="this.src='https://via.placeholder.com/400x300?text=Ảnh+không+tải+được'"/>`;
        } else {
             mediaHTML = `<div class="w-full h-48 flex items-center justify-center bg-gray-200 text-gray-500">Nội dung không xác định</div>`;
        }
        
        galleryHTML += `
            <div class="bg-white rounded-lg shadow-lg overflow-hidden hover:shadow-xl transition-shadow relative">
                ${mediaHTML}
                ${(log.mediaUrl) ? '<div class="absolute top-2 right-2 bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded-full shadow-md">Đã Gửi</div>' : ''}
                <div class="p-4">
                    <h3 class="font-bold text-gray-800 flex items-center space-x-2">
                        <span>🏫</span><span>Lớp ${log.class}</span>
                    </h3>
                    <p class="text-sm text-gray-500 mt-1">📅 ${dateStr}</p>
                    <p class="text-sm text-green-600 font-semibold mt-2">
                        ✅ ${log.totalPoints.toLocaleString()} điểm
                    </p>
                    ${data.loggedInUser === 'admin' ? 
                        `<p class="text-xs text-red-500 break-all mt-2">Link Gốc (Admin): <a href="${log.mediaUrl}" target="_blank" class="text-blue-500 hover:underline">${log.mediaUrl.substring(0, Math.min(log.mediaUrl.length, 30))}...</a></p>` 
                        : ''}
                </div>
            </div>
        `;
    });
    
    document.getElementById('media-gallery').innerHTML = galleryHTML;
}

// Initialize app
window.addEventListener('load', initializeApp);