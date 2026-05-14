let port;
let writer;

let settings = [200, 200, 200, 200, 200, 200, 200, 200, 200];

const BUTTON_CLICK_EVENT = document.getElementById("connection");
const BUTTON_CLICK_EVENT_DISC = document.getElementById("disconnection");
const BUTTON_CLICK_EVENT_send = document.getElementById("sendButton");
const BUTTON_CLICK_EVENT_request = document.getElementById("requestButton");
const BUTTON_CLICK_EVENT_save = document.getElementById("saveButton");

const situation_alert = document.getElementById("situation");

let reader;
situation_alert.textContent = "Not connected";

const status_dot = document.getElementById("status-dot");
function setDot(state) {
  status_dot.className = "status-dot" + (state ? " is-" + state : "");
}

BUTTON_CLICK_EVENT.addEventListener("click", async () => {
  try {
    if (port && port.readable) {
      console.log("Closing existing port...");
      if (writer) writer.releaseLock();
      if (reader) reader.releaseLock();
      await port.close();
    }

    setDot("connecting");
    situation_alert.textContent = "Selecting...";

    port = await navigator.serial.requestPort();
    await port.open({ baudRate: 115200 });

    writer = port.writable.getWriter();
    reader = port.readable.getReader();

    setDot("connected");
    situation_alert.textContent = "RP2040 connected";
    console.log("Port connected successfully!");

    const data = new TextEncoder().encode("Hello, Serial!\n");
    await writer.write(data);
    console.log("Data sent: Hello, Serial!");
  } catch (error) {
    setDot("error");
    situation_alert.textContent = "Connection failed";
    console.error("Error:", error);
  }
});

window.addEventListener("beforeunload", async () => {
  if (writer) writer.releaseLock();
  if (reader) reader.releaseLock();
  if (port) await port.close();
});

BUTTON_CLICK_EVENT_DISC.addEventListener("click", async () => {
  if (writer) writer.releaseLock();
  if (reader) reader.releaseLock();
  if (port) await port.close();
  setDot(null);
  situation_alert.textContent = "Disconnected";
});

BUTTON_CLICK_EVENT_send.addEventListener("click", async () => {
  try {
    await writer.write(new TextEncoder().encode("1002\n"));
    setDot("loading");
    situation_alert.textContent = "Sending...";
    for (let i = 0; i < 9; i++) {
      await new Promise(resolve => setTimeout(resolve, 100));
      const data = `${i}:${settings[i]}`;
      await writer.write(new TextEncoder().encode(data));
    }
    setDot("connected");
    situation_alert.textContent = "Sent";
  } catch (error) {
    setDot("error");
    console.error("Error in send:", error);
  }
});

BUTTON_CLICK_EVENT_request.addEventListener("click", async () => {
  try {
    await writer.write(new TextEncoder().encode("1000\n"));
    setDot("loading");
    situation_alert.textContent = "Receiving...";

    for (let i = 0; i <= 8; i++) {
      let isMatched = false;

      while (!isMatched) {
        const data = await reader.read();
        const decodedData = new TextDecoder().decode(data.value);

        const parts = decodedData.trim().split(":");
        if (parts.length === 2) {
          const [index, value] = parts;
          const textElement = document.getElementById(`text${i}`);
          const volumeSlider = document.getElementById(`volumeSlider${i}`);

          settings[i] = value;
          volumeSlider.value = settings[i];
          textElement.textContent = settings[i];

          isMatched = true;
        } else {
          console.warn(`Invalid data format received: ${decodedData}`);
        }
      }
    }
    setDot("connected");
    situation_alert.textContent = "Done";
  } catch (error) {
    setDot("error");
    console.error("Error in request:", error);
  }
});

BUTTON_CLICK_EVENT_save.addEventListener("click", async () => {
  await writer.write(new TextEncoder().encode("1001\n"));
  console.log("1001_saved");
  setDot("connected");
  situation_alert.textContent = "Saved";
});

for (let i = 0; i <= 8; i++) {
  const textElement = document.getElementById(`text${i}`);
  const volumeSlider = document.getElementById(`volumeSlider${i}`);

  volumeSlider.addEventListener("input", () => {
    const volume = volumeSlider.value;
    textElement.textContent = volume;
    settings[i] = volumeSlider.value;
  });
}

for (let i = 0; i <= 8; i++) {
  const textElement = document.getElementById(`text${i}`);
  const volumeSlider = document.getElementById(`volumeSlider${i}`);

  document.addEventListener("DOMContentLoaded", () => {
    const volume = volumeSlider.value;
    textElement.textContent = volume;
    settings[i] = volumeSlider.value;
  });
}
