// 全域變數來儲存地圖和標記
let map;
let allMarkers = [];
let plantListElement;
let allData = [];

document.addEventListener("DOMContentLoaded", function() {
    // 取得 HTML 元素
    const searchInput = document.getElementById("search-input");
    plantListElement = document.getElementById("plant-list");

    // 🚩 初始化地圖
    // 調整台灣中心點及縮放級別以包含所有離島
    map = L.map("map").setView([23.5, 121], 8); 
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    // 🚩 載入 JSON 資料
    loadPlantData();

    // 🚩 綁定搜尋事件
    searchInput.addEventListener("keyup", filterData);
});

/**
 * 載入 JSON 檔案並建立標記、清單和篩選選項
 */
async function loadPlantData() {
    try {
        const response = await fetch('places_with_gps.json');
        allData = await response.json();
        
        if (!Array.isArray(allData) || allData.length === 0) {
            console.error('❌ JSON 檔案格式錯誤或為空。');
            return;
        }

        console.log(`✅ 成功載入 ${allData.length} 筆植物地點資料。`);
        
        // 自動生成篩選選項
        generateFilters(allData);

        // 首次載入所有資料
        renderData(allData);

    } catch (error) {
        console.error('❌ 載入 places_with_gps.json 失敗:', error);
    }
}

/**
 * 根據所有資料動態生成篩選 checkbox
 * @param {Array} data - 原始地點資料陣列
 */
function generateFilters(data) {
    const filterContainer = document.getElementById('filter-container');
    const uniquePlants = [...new Set(data.map(item => item.plant))].sort();

    filterContainer.innerHTML = ''; // 清除舊的篩選選項
    uniquePlants.forEach(plant => {
        const label = document.createElement('label');
        label.className = 'filter-option';
        label.innerHTML = `
            <input type="checkbox" class="plant-filter" value="${plant}"> ${plant}
        `;
        filterContainer.appendChild(label);
    });

    // 綁定篩選事件
    filterContainer.querySelectorAll(".plant-filter").forEach(input => {
        input.addEventListener("change", filterData);
    });
}

/**
 * 根據資料建立地圖標記和清單
 * @param {Array} data - 要渲染的地點資料陣列
 */
function renderData(data) {
    // 清除舊的標記和清單
    allMarkers.forEach(marker => map.removeLayer(marker));
    allMarkers = [];
    plantListElement.innerHTML = '';

    data.forEach(item => {
        if (item.lat && item.lng) {
            createMarker(item);
            createListItem(item);
        }
    });
}

/**
 * 根據單筆資料建立地圖標記
 * @param {object} item - 包含地點資訊的物件
 */
function createMarker(item) {
    const lat = parseFloat(item.lat);
    const lng = parseFloat(item.lng);
    const marker = L.marker([lat, lng]).addTo(map);

    // 綁定 Popup
    marker.bindPopup(`
        <div class="popup-content">
            <h3 class="popup-title">${item.name}</h3>
            <p><strong>植物名:</strong> ${item.plant}</p>
            <p><strong>地址:</strong> ${item.address}</p>
            <p><strong>GPS:</strong> ${lat.toFixed(5)}, ${lng.toFixed(5)}</p>
        </div>
    `);

    // 儲存標記供後續篩選使用
    marker.data = item;
    allMarkers.push(marker);
}

/**
 * 根據單筆資料建立側邊欄清單項目
 * @param {object} item - 包含地點資訊的物件
 */
function createListItem(item) {
    const listItem = document.createElement('div');
    listItem.className = 'plant-item';
    listItem.innerHTML = `
        <div class="plant-info">
            <h3>${item.name}</h3>
            <p>植物名: ${item.plant}</p>
            <p>地址: ${item.address}</p>
        </div>
    `;

    // 點擊清單項目時，移動地圖並打開標記的彈出視窗
    listItem.addEventListener('click', () => {
        map.flyTo([item.lat, item.lng], 15, { duration: 1.5 });
        // 找到對應的標記並打開彈出視窗
        const targetMarker = allMarkers.find(marker => 
            marker.data.lat === item.lat && marker.data.lng === item.lng
        );
        if (targetMarker) {
            targetMarker.openPopup();
        }
    });

    plantListElement.appendChild(listItem);
}

/**
 * 根據搜尋和篩選條件過濾資料並重新渲染
 */
function filterData() {
    const searchText = document.getElementById("search-input").value.toLowerCase();
    const selectedPlants = Array.from(document.querySelectorAll(".plant-filter:checked"))
                               .map(input => input.value);
    
    const filteredData = allData.filter(item => {
        // 檢查搜尋條件
        const matchesSearch = item.name.toLowerCase().includes(searchText) ||
                              item.plant.toLowerCase().includes(searchText) ||
                              item.address.toLowerCase().includes(searchText);

        // 檢查篩選條件
        const matchesFilter = selectedPlants.length === 0 || selectedPlants.includes(item.plant);

        return matchesSearch && matchesFilter;
    });

    renderData(filteredData);
}
