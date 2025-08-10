// 全域變數來儲存地圖和標記
let map;
let allMarkers = [];
let plantListElement;

document.addEventListener("DOMContentLoaded", function() {
    // 取得 HTML 元素
    const searchInput = document.getElementById("search-input");
    const filterInputs = document.querySelectorAll(".plant-filter");
    plantListElement = document.getElementById("plant-list");

    // 🚩 初始化地圖
    map = L.map("map").setView([23.6, 120.9], 8); // 台灣中心點
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    // 🚩 載入 JSON 資料
    loadPlantData();

    // 🚩 綁定搜尋和篩選事件
    searchInput.addEventListener("keyup", filterMarkers);
    filterInputs.forEach(input => input.addEventListener("change", filterMarkers));
});

/**
 * 載入 JSON 檔案並建立標記和清單
 */
async function loadPlantData() {
    try {
        const response = await fetch('places_with_gps.json');
        const data = await response.json();
        
        if (!Array.isArray(data) || data.length === 0) {
            console.error('❌ JSON 檔案格式錯誤或為空。');
            return;
        }

        console.log(`✅ 成功載入 ${data.length} 筆植物地點資料。`);
        data.forEach(item => {
            if (item.lat && item.lng) {
                createMarker(item);
                createListItem(item);
            }
        });

    } catch (error) {
        console.error('❌ 載入 places_with_gps.json 失敗:', error);
    }
}

/**
 * 根據資料建立地圖標記
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
 * 根據資料建立側邊欄清單項目
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
        const targetMarker = allMarkers.find(marker => 
            marker.data.lat === item.lat && marker.data.lng === item.lng
        );
        if (targetMarker) {
            map.flyTo([item.lat, item.lng], 15, { duration: 1.5 });
            targetMarker.openPopup();
        }
    });

    // 儲存 DOM 元素，以便後續篩選時隱藏/顯示
    listItem.data = item;
    plantListElement.appendChild(listItem);
}

/**
 * 根據搜尋和篩選條件過濾地圖標記和清單
 */
function filterMarkers() {
    const searchText = document.getElementById("search-input").value.toLowerCase();
    const selectedPlants = Array.from(document.querySelectorAll(".plant-filter:checked"))
                               .map(input => input.value);

    // 過濾標記和清單
    allMarkers.forEach(marker => {
        const item = marker.data;
        const matchesSearch = item.name.toLowerCase().includes(searchText) ||
                              item.plant.toLowerCase().includes(searchText) ||
                              item.address.toLowerCase().includes(searchText);

        const matchesFilter = selectedPlants.length === 0 || selectedPlants.includes(item.plant);
        
        const isVisible = matchesSearch && matchesFilter;

        // 控制標記顯示
        if (isVisible) {
            marker.addTo(map);
        } else {
            map.removeLayer(marker);
        }

        // 控制清單項目顯示
        const listItem = plantListElement.querySelector(`.plant-item[data-id="${item.lat}-${item.lng}"]`);
        if (listItem) {
            listItem.style.display = isVisible ? 'block' : 'none';
        }
    });
}
