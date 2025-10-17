// --- CẤU HÌNH BAN ĐẦU ---
let data = {
    classes: ['10A1', '10A2', '10A3', '10A4', '10A5', '10A6', '11A1', '11A2', '11A3', '11A4', '11A5', '11A6', '12A1', '12A2', '12A3', '12A4', '12A5', '12A6'],
    logs: [],
    lastWeekLogs: [],
    mvpLastWeek: null,
};

// --- KHỞI TẠO VÀ LƯU DỮ LIỆU ---

function initializeApp() {
    // Tải dữ liệu từ localStorage
    const storedLogs = localStorage.getItem('ecoRaceLogs');
    if (storedLogs) data.logs = JSON.parse(storedLogs);
    
    const storedLastWeekLogs = localStorage.getItem('ecoRaceLastWeekLogs');
    if (storedLastWeekLogs) data.lastWeekLogs = JSON.parse(storedLastWeekLogs);
    
    const storedMVP = localStorage.getItem('ecoRaceMVP');
    if (storedMVP) data.mvpLastWeek = JSON.parse(storedMVP);

    // Chạy kiểm tra reset hàng tuần
    checkWeeklyReset();

    // Set ngày mặc định và cập nhật UI
    document.getElementById('log-date').valueAsDate = new Date();
    updateDashboard();
    
    // Hiển thị view mặc định
    switchView('input-view');
}

function saveData() {
    localStorage.setItem('ecoRaceLogs', JSON.stringify(data.logs));
    localStorage.setItem('ecoRaceMVP', JSON.stringify(data.mvpLastWeek));
    localStorage.setItem('ecoRaceLastWeekLogs', JSON.stringify(data.lastWeekLogs));
}

// --- RESET HÀNG TUẦN ---

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

// --- LOGIC ỨNG DỤNG CHÍNH ---

function switchView(viewId) {
    document.querySelectorAll('.app-view').forEach(v => v.classList.add('hidden'));
    document.getElementById(viewId).classList.remove('hidden');
    
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('bg-green-700', 'text-white');
        btn.classList.add('bg-gray-200', 'text-gray-700');
    });
    
    let activeBtn = document.querySelector(`.tab-btn[onclick*="'${viewId}'"]`);

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
    const classVal = document.getElementById('class-select').value;
    
    if (!classVal) {
        showModal('⚠️ Lỗi', 'Vui lòng chọn lớp trước khi ghi nhận dữ liệu.', 'warning');
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
}

function showModal(title, message, type) {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-message').innerHTML = message;
    
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
            days: [0, 0, 0, 0, 0, 0, 0]
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
                            <span>Video đã gửi</span>
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
                </div>
            </div>
        `;
    });
    
    document.getElementById('media-gallery').innerHTML = galleryHTML;
}

// Initialize app
window.addEventListener('load', initializeApp);