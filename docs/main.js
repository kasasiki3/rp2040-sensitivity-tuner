let port;
let writer;
let reader;
let isOperating = false;

let settings = new Array(9).fill(0);

const btnConnect    = document.getElementById("connection");
const btnDisconnect = document.getElementById("disconnection");
const btnSend       = document.getElementById("sendButton");
const btnRequest    = document.getElementById("requestButton");
const btnSave       = document.getElementById("saveButton");
const situationEl   = document.getElementById("situation");
const statusDot     = document.getElementById("status-dot");

function setDot(state) {
  statusDot.className = "status-dot" + (state ? " is-" + state : "");
}

function isConnected() {
  return writer != null;
}

// Initialize settings and text from HTML slider defaults
for (let i = 0; i <= 8; i++) {
  const textEl = document.getElementById(`text${i}`);
  const slider = document.getElementById(`volumeSlider${i}`);
  settings[i] = parseInt(slider.value);
  textEl.textContent = slider.value;

  slider.addEventListener("input", () => {
    textEl.textContent = slider.value;
    settings[i] = parseInt(slider.value);
  });
}

situationEl.textContent = "Not connected";

btnConnect.addEventListener("click", async () => {
  try {
    if (port && port.readable) {
      if (writer) { writer.releaseLock(); writer = null; }
      if (reader) { reader.releaseLock(); reader = null; }
      await port.close();
    }

    setDot("connecting");
    situationEl.textContent = "Selecting...";

    port = await navigator.serial.requestPort();
    await port.open({ baudRate: 115200 });

    writer = port.writable.getWriter();
    reader = port.readable.getReader();

    setDot("connected");
    situationEl.textContent = "RP2040 connected";
  } catch (error) {
    setDot("error");
    situationEl.textContent = "Connection failed";
    writer = null;
    reader = null;
    console.error("Connect error:", error);
  }
});

btnDisconnect.addEventListener("click", async () => {
  if (writer) { writer.releaseLock(); writer = null; }
  if (reader) { reader.releaseLock(); reader = null; }
  if (port) { await port.close(); port = null; }
  setDot(null);
  situationEl.textContent = "Disconnected";
});

window.addEventListener("beforeunload", () => {
  if (writer) writer.releaseLock();
  if (reader) reader.releaseLock();
  if (port) port.close();
});

function readWithTimeout(ms) {
  return Promise.race([
    reader.read(),
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Read timeout")), ms)
    ),
  ]);
}

btnSend.addEventListener("click", async () => {
  if (!isConnected()) { situationEl.textContent = "Not connected"; return; }
  if (isOperating) return;
  isOperating = true;
  try {
    await writer.write(new TextEncoder().encode("1002\n"));
    setDot("loading");
    situationEl.textContent = "Sending...";
    for (let i = 0; i < 9; i++) {
      await new Promise(resolve => setTimeout(resolve, 100));
      await writer.write(new TextEncoder().encode(`${i}:${settings[i]}`));
    }
    setDot("connected");
    situationEl.textContent = "Sent";
  } catch (error) {
    setDot("error");
    situationEl.textContent = "Send failed";
    console.error("Send error:", error);
  } finally {
    isOperating = false;
  }
});

btnRequest.addEventListener("click", async () => {
  if (!isConnected()) { situationEl.textContent = "Not connected"; return; }
  if (isOperating) return;
  isOperating = true;
  try {
    await writer.write(new TextEncoder().encode("1000\n"));
    setDot("loading");
    situationEl.textContent = "Receiving...";

    let buf = "";
    let received = 0;

    while (received < 9) {
      const { value, done } = await readWithTimeout(3000);
      if (done) break;
      buf += new TextDecoder().decode(value);
      const lines = buf.split("\n");
      buf = lines.pop(); // keep incomplete trailing chunk

      for (const line of lines) {
        const parts = line.trim().split(":");
        if (parts.length !== 2) continue;
        const idx = parseInt(parts[0]);
        const val = parseInt(parts[1]);
        if (isNaN(idx) || isNaN(val) || idx < 0 || idx > 8) continue;
        settings[idx] = val;
        document.getElementById(`volumeSlider${idx}`).value = val;
        document.getElementById(`text${idx}`).textContent = val;
        received++;
      }
    }

    setDot("connected");
    situationEl.textContent = "Done";
  } catch (error) {
    setDot("error");
    situationEl.textContent = error.message === "Read timeout" ? "Timeout" : "Request failed";
    console.error("Request error:", error);
  } finally {
    isOperating = false;
  }
});

btnSave.addEventListener("click", async () => {
  if (!isConnected()) { situationEl.textContent = "Not connected"; return; }
  if (isOperating) return;
  try {
    await writer.write(new TextEncoder().encode("1001\n"));
    setDot("connected");
    situationEl.textContent = "Saved";
  } catch (error) {
    setDot("error");
    situationEl.textContent = "Save failed";
    console.error("Save error:", error);
  }
});
