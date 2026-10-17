
"use strict";

// ==========================================
// KONFIGURASI ESP32
// ==========================================

const ESP32_IP = "192.168.100.87";

// ==========================================
// ENDPOINT LED DAN FAN
// ==========================================

const ENDPOINTS = {
    dapur: "/dapur",
    tamu: "/tamu",
    makan: "/makan",
    toilet: "/toilet",

    fanOn: "/fan/on",
    fanOff: "/fan/off",
    fanStatus: "/fan/status"
};

// ==========================================
// GAMBAR LED
// ==========================================

const LED_ON_IMAGE =
    "./assets/Pixel Art Red LED Glow.png";

const LED_OFF_IMAGE =
    "./assets/Off-State Pixel LED Sprite.png";

// ==========================================
// GAMBAR FAN
// ==========================================

// Kipas mati: aset nomor 5
const FAN_OFF_IMAGE =
    "./assets/Pixel-Art Blue Table Fan.png";

// Kipas menyala: aset nomor 7
const FAN_ON_IMAGE =
    "./assets/Spinning Blue Pixel Fan.png";

// ==========================================
// ELEMENT HTML
// ==========================================

const connectionStatus =
    document.getElementById("connectionStatus");

const ledCards =
    document.querySelectorAll(".led-card");

const fanButton =
    document.getElementById("fanButton");

const fanImage =
    document.getElementById("fanImage");

// ==========================================
// STATUS KONEKSI
// ==========================================

function tampilkanStatus(pesan) {
    if (connectionStatus) {
        connectionStatus.textContent = pesan;
    }
}

// ==========================================
// REQUEST KE ESP32
// ==========================================

async function kirimPerintah(endpoint, method = "POST") {

    const controller = new AbortController();

    const timeout = setTimeout(() => {
        controller.abort();
    }, 5000);

    try {

        const response = await fetch(
            `http://${ESP32_IP}${endpoint}`,
            {
                method: method,
                signal: controller.signal
            }
        );

        if (!response.ok) {
            throw new Error(
                `HTTP Error: ${response.status}`
            );
        }

        const hasil = (await response.text()).trim();

        if (hasil !== "ON" && hasil !== "OFF") {
            throw new Error(
                `Respons ESP32 tidak valid: ${hasil}`
            );
        }

        return hasil;

    } finally {
        clearTimeout(timeout);
    }
}

// ==========================================
// UPDATE TAMPILAN LED
// ==========================================

function updateLedUI(card, status) {

    const button =
        card.querySelector(".toggle");

    const image =
        card.querySelector(".led-image");

    const isOn = status === "ON";

    // Gambar LED
    if (image) {
        image.src = isOn
            ? LED_ON_IMAGE
            : LED_OFF_IMAGE;

        image.alt = isOn
            ? "LED menyala"
            : "LED mati";
    }

    // Tombol LED
    if (button) {

        button.textContent = isOn
            ? "TURN OFF"
            : "TURN ON";

        button.style.backgroundColor = isOn
            ? "red"
            : "#5795f5";

        button.dataset.state = status;
    }

    // Status kartu
    card.dataset.state = status;
}

// ==========================================
// KONTROL LED
// ==========================================

async function kontrolLed(card, button) {

    const endpoint = button.dataset.endpoint;

    if (!endpoint) {
        tampilkanStatus(
            "Endpoint LED belum ditentukan."
        );
        return;
    }

    if (button.disabled) return;

    button.disabled = true;

    const room = card.dataset.room || "ruangan";

    tampilkanStatus(
        `Mengirim perintah LED ${room}...`
    );

    try {

        const status = await kirimPerintah(endpoint);

        updateLedUI(card, status);

        tampilkanStatus(
            `Lampu ${room} ${
                status === "ON"
                    ? "menyala."
                    : "mati."
            }`
        );

    } catch (error) {

        console.error("Gagal mengontrol LED:", error);

        tampilkanStatus(
            `Gagal mengontrol lampu ${room}. Periksa ESP32.`
        );

        alert(
            "LED gagal dikontrol.\n" +
            "Pastikan ESP32 menyala, IP benar, " +
            "dan laptop terhubung ke Wi-Fi yang sama."
        );

    } finally {
        button.disabled = false;
    }
}

// ==========================================
// PASANG EVENT LED
// ==========================================

const endpointMap = {
    "Dapur": ENDPOINTS.dapur,
    "Ruang Tamu": ENDPOINTS.tamu,
    "Ruang Makan": ENDPOINTS.makan,
    "Toilet": ENDPOINTS.toilet
};

ledCards.forEach((card) => {

    const button =
        card.querySelector(".toggle");

    if (!button) return;

    const room = card.dataset.room;

    // Tentukan endpoint berdasarkan nama ruangan
    if (!button.dataset.endpoint) {
        button.dataset.endpoint =
            endpointMap[room] || "";
    }

    // Event tombol LED
    button.addEventListener("click", () => {
        kontrolLed(card, button);
    });
});

// ==========================================
// UPDATE TAMPILAN FAN
// ==========================================

function updateFanUI(status) {

    const isOn = status === "ON";

    // Ganti gambar kipas
    if (fanImage) {

        fanImage.src = isOn
            ? FAN_ON_IMAGE
            : FAN_OFF_IMAGE;

        fanImage.alt = isOn
            ? "Kipas menyala"
            : "Kipas mati";
    }

    // Ganti tombol kipas
    if (fanButton) {

        fanButton.textContent = isOn
            ? "TURN OFF FAN"
            : "TURN ON FAN";

        fanButton.style.backgroundColor = isOn
            ? "red"
            : "#5795f5";

        fanButton.dataset.state = status;
    }
}

// ==========================================
// KONTROL FAN
// ==========================================

async function kontrolFan() {

    if (!fanButton || fanButton.disabled) {
        return;
    }

    fanButton.disabled = true;

    // Status terakhir kipas
    const isCurrentlyOn =
        fanButton.dataset.state === "ON";

    // Pilih endpoint sesuai status
    const endpoint = isCurrentlyOn
        ? ENDPOINTS.fanOff
        : ENDPOINTS.fanOn;

    tampilkanStatus(
        isCurrentlyOn
            ? "Mematikan kipas..."
            : "Menyalakan kipas..."
    );

    try {

        const status = await kirimPerintah(endpoint);

        updateFanUI(status);

        tampilkanStatus(
            status === "ON"
                ? "Kipas menyala."
                : "Kipas mati."
        );

    } catch (error) {

        console.error("Gagal mengontrol fan:", error);

        tampilkanStatus(
            "Kipas gagal dikontrol. Periksa ESP32."
        );

        alert(
            "Kipas gagal dikontrol.\n" +
            "Pastikan endpoint /fan/on dan /fan/off " +
            "tersedia di ESP32."
        );

    } finally {
        fanButton.disabled = false;
    }
}

// ==========================================
// PASANG EVENT FAN
// ==========================================

if (fanButton) {

    fanButton.addEventListener(
        "click",
        kontrolFan
    );
}

// ==========================================
// SINKRONISASI STATUS LED
// ==========================================

async function sinkronisasiLED() {

    for (const card of ledCards) {

        const button =
            card.querySelector(".toggle");

        if (!button || !button.dataset.endpoint) {
            continue;
        }

        try {

            const status = await kirimPerintah(
                button.dataset.endpoint,
                "GET"
            );

            updateLedUI(card, status);

        } catch (error) {

            console.error(
                "Gagal membaca status LED:",
                error
            );
        }
    }
}

// ==========================================
// SINKRONISASI STATUS FAN
// ==========================================

async function sinkronisasiFan() {

    if (!fanButton) return;

    try {

        const status = await kirimPerintah(
            ENDPOINTS.fanStatus,
            "GET"
        );

        updateFanUI(status);

    } catch (error) {

        console.error(
            "Gagal membaca status fan:",
            error
        );
    }
}

// ==========================================
// JALANKAN SINKRONISASI
// ==========================================

async function mulaiCUYLABS() {

    tampilkanStatus(
        "Menghubungkan halaman CUYLABS ke ESP32..."
    );

    await Promise.all([
        sinkronisasiLED(),
        sinkronisasiFan()
    ]);

    tampilkanStatus(
        "Halaman CUYLABS siap digunakan."
    );
}

mulaiCUYLABS();
