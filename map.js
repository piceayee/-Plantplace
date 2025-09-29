// 全域變數來儲存地圖和標記
let map;
let allMarkers = [];
let plantListElement;
let allData = [];
let markersCluster;
let cityFiltersElement;
let currentCityFilter = null;

document.addEventListener("DOMContentLoaded", function() {
    // 取得 HTML 元素
    const searchInput = document.getElementById("search-input");
    const sidebar = document.getElementById("sidebar");
    const toggleButton = document.getElementById("toggle-sidebar");
    plantListElement = document.getElementById("plant-list");
    const mapTitle = document.getElementById("map-title");
    cityFiltersElement = document.getElementById("city-filters");

    // 🚩 初始化地圖
    const initialView = { center: [23.5, 121], zoom: 8 };
    map = L.map("map", {
        zoomControl: false, // 隱藏預設的縮放控制
        smoothZoom: true, // 新增：平滑縮放
        smoothZoomDelay: 100, // 新增：平滑縮放延遲
        zoomAnimation: true, // 新增：啟用縮放動畫
        fadeAnimation: true, // 新增：啟用淡入淡出動畫
        markerZoomAnimation: true // 新增：啟用標記縮放動畫
    }).setView(initialView.center, initialView.zoom);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; OpenStreetMap contributors',
        // 新增：禁用 Leaflet 自身的縮放動畫，交由瀏覽器處理
        // 這會讓縮放更順暢，特別是在高解析度螢幕上
        useCache: true
    }).addTo(map);

    // 初始化標記聚集圖層
    markersCluster = L.markerClusterGroup();
    map.addLayer(markersCluster);

    // 🚩 載入 JSON 資料
    loadPlantData();

    // 🚩 綁定事件
    searchInput.addEventListener("keyup", filterData);

    // 點擊標題校正地圖
    mapTitle.addEventListener("click", () => {
        map.flyTo(initialView.center, initialView.zoom, { duration: 0.5 });
    });
    
    // 側邊欄切換功能
    toggleButton.addEventListener("click", () => {
        if (window.innerWidth <= 768) {
            // 手機版使用完全滑入/滑出
            sidebar.classList.toggle("expanded");
            sidebar.classList.toggle("collapsed");
        } else {
            // 桌面版使用寬度收合
            sidebar.classList.toggle("collapsed");
        }
    });

    // 視窗大小改變時，調整側邊欄狀態
    window.addEventListener('resize', () => {
        if (window.innerWidth > 768) {
            sidebar.classList.remove("expanded", "collapsed");
        } else {
            sidebar.classList.add("collapsed");
            sidebar.classList.remove("expanded");
        }
    });
});

/**
 * 載入 JSON 檔案並建立標記、清單
 */
async function loadPlantData() {
    try {
        const response = await fetch(`places_with_gps.json?t=${new Date().getTime()}`);
        allData = await response.json();
        
        if (!Array.isArray(allData) || allData.length === 0) {
            console.error('❌ JSON 檔案格式錯誤或為空。');
            renderData([]);
            return;
        }

        console.log(`✅ 成功載入 ${allData.length} 筆植物地點資料。`);
        
        // 依照縣市排序
        allData.sort((a, b) => {
            const cityA = getCityFromAddress(a.address) || '';
            const cityB = getCityFromAddress(b.address) || '';
            return cityA.localeCompare(cityB, 'zh-TW', {sensitivity: 'base'});
        });
        
        createCityFilters();
        renderData(allData);

    } catch (error) {
        console.error('❌ 載入 places_with_gps.json 失敗:', error);
    }
}

/**
 * 從地址字串中提取縣市名稱
 * @param {string} address - 地點地址
 * @returns {string} 縣市名稱
 */
function getCityFromAddress(address) {
    if (!address) return '';
    const cityMatch = address.match(/^(臺北市|新北市|桃園市|臺中市|臺南市|高雄市|基隆市|新竹市|嘉義市|新竹縣|苗栗縣|彰化縣|南投縣|雲林縣|嘉義縣|屏東縣|宜蘭縣|花蓮縣|臺東縣|澎湖縣|金門縣|連江縣)/);
    return cityMatch ? cityMatch[0] : '其他';
}

/**
 * 建立縣市篩選器按鈕
 */
function createCityFilters() {
    const cities = [...new Set(allData.map(item => getCityFromAddress(item.address)))].sort();
    
    const header = document.createElement('div');
    header.className = 'filter-header';
    header.innerHTML = `<span>縣市篩選</span><span id="filter-toggle-icon">▼</span>`;
    header.addEventListener('click', () => {
        const container = document.getElementById('filter-button-container');
        container.classList.toggle('expanded');
        const icon = document.getElementById('filter-toggle-icon');
        icon.innerHTML = container.classList.contains('expanded') ? '▲' : '▼';
    });
    cityFiltersElement.appendChild(header);

    const buttonContainer = document.createElement('div');
    buttonContainer.id = 'filter-button-container';
    buttonContainer.className = 'filter-button-container';
    cityFiltersElement.appendChild(buttonContainer);

    // 建立所有縣市按鈕
    const allButton = document.createElement('button');
    allButton.textContent = '全部';
    allButton.className = 'filter-button active';
    allButton.dataset.city = 'all';
    buttonContainer.appendChild(allButton);

    allButton.addEventListener('click', () => {
        currentCityFilter = null;
        filterData();
        updateFilterButtons(allButton);
    });

    cities.forEach(city => {
        const button = document.createElement('button');
        button.textContent = city;
        button.className = 'filter-button';
        button.dataset.city = city;
        buttonContainer.appendChild(button);

        button.addEventListener('click', () => {
            currentCityFilter = city;
            filterData();
            updateFilterButtons(button);
        });
    });
}

function updateFilterButtons(activeButton) {
    document.querySelectorAll('.filter-button').forEach(btn => {
        btn.classList.remove('active');
    });
    activeButton.classList.add('active');
}

/**
 * 根據資料建立地圖標記和清單
 * @param {Array} data - 要渲染的地點資料陣列
 */
function renderData(data) {
    markersCluster.clearLayers();
    allMarkers = [];
    plantListElement.innerHTML = '';

    const listByCity = {};
    data.forEach(item => {
        const city = getCityFromAddress(item.address);
        if (!listByCity[city]) {
            listByCity[city] = [];
        }
        listByCity[city].push(item);
    });

    // 依縣市標題渲染列表
    Object.keys(listByCity).sort().forEach(city => {
        const cityHeader = document.createElement('h2');
        cityHeader.className = 'city-header';
        cityHeader.textContent = city;
        plantListElement.appendChild(cityHeader);
        
        listByCity[city].forEach(item => {
            if (item.lat && item.lng) {
                const marker = createMarker(item);
                markersCluster.addLayer(marker);
                createListItem(item);
            }
        });
    });
}

/**
 * 根據單筆資料建立地圖標記
 * @param {object} item - 包含地點資訊的物件
 */
function createMarker(item) {
    const lat = parseFloat(item.lat);
    const lng = parseFloat(item.lng);
    const marker = L.marker([lat, lng]);

    const gpsLink = `<a href="https://www.google.com/maps/search/?api=1&query=${lat},${lng}" target="_blank">${lat.toFixed(5)}, ${lng.toFixed(5)}</a>`;

    marker.bindPopup(`
        <div class="popup-content">
            <p class="popup-title">${item.name || '未名'}</p>
            <p><strong>植物名:</strong> ${item.plant || '無'}</p>
            <p><strong>地址:</strong> ${item.address || '無'}</p>
            <p><strong>GPS:</strong> ${gpsLink}</p>
            ${item.story ? `<p><strong>故事:</strong> ${item.story}</p>` : ''}
        </div>
    `);

    marker.data = item;
    allMarkers.push(marker);
    return marker;
}

/**
 * 根據單筆資料建立側邊欄清單項目
 * @param {object} item - 包含地點資訊的物件
 */
function createListItem(item) {
    const listItem = document.createElement('div');
    listItem.className = 'plant-item';

    if (!item.name) {
        console.warn('⚠️ 發現一筆名稱遺失的資料。此資料物件為:', item);
    }

    const storySummary = item.story ? `故事: ${item.story.substring(0, 30)}...` : '';

    listItem.innerHTML = `
        <div class="plant-info">
            <h3>${item.name || '未名'}</h3>
            <p>植物名: ${item.plant || '無'}</p>
            <p>地址: ${item.address || '無'}</p>
            ${storySummary ? `<p class="story-summary">${storySummary}</p>` : ''}
        </div>
    `;

    listItem.addEventListener('click', () => {
        map.flyTo([item.lat, item.lng], 15, { duration: 1.5 });
        const targetMarker = allMarkers.find(marker => 
            marker.data.lat === item.lat && marker.data.lng === item.lng
        );
        if (targetMarker) {
            targetMarker.openPopup();
        }
        if (window.innerWidth <= 768) {
            const sidebar = document.getElementById("sidebar");
            if (sidebar.classList.contains("expanded")) {
                sidebar.classList.remove("expanded");
                sidebar.classList.add("collapsed");
            }
        }
    });

    plantListElement.appendChild(listItem);
}

/**
 * 根據搜尋條件過濾資料並重新渲染
 */
function filterData() {
    const searchText = document.getElementById("search-input").value.toLowerCase();
    
    const filteredData = allData.filter(item => {
        const name = item.name ? item.name.toLowerCase() : '';
        const plant = item.plant ? item.plant.toLowerCase() : '';
        const address = item.address ? item.address.toLowerCase() : '';
        const story = item.story ? item.story.toLowerCase() : '';

        const matchesSearch = name.includes(searchText) || plant.includes(searchText) || address.includes(searchText) || story.includes(searchText);
        const matchesCity = !currentCityFilter || getCityFromAddress(item.address) === currentCityFilter;

        return matchesSearch && matchesCity;
    });

    renderData(filteredData);
}
