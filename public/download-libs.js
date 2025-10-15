import fs from "fs";
import https from "https";
import path from "path";

const libs = [
  // === Bootstrap ===
  {
    url: "https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css",
    file: "libs/bootstrap/bootstrap.min.css",
  },
  {
    url: "https://cdn.jsdelivr.net/npm/bootstrap@5.0.0/dist/js/bootstrap.bundle.min.js",
    file: "libs/bootstrap/bootstrap.bundle.min.js",
  },

  // === ECharts ===
  {
    url: "https://cdn.jsdelivr.net/npm/echarts/dist/echarts.min.js",
    file: "libs/echarts/echarts.min.js",
  },

  // === Flatpickr ===
  {
    url: "https://cdn.jsdelivr.net/npm/flatpickr",
    file: "libs/flatpickr/flatpickr.min.js",
  },
  {
    url: "https://cdn.jsdelivr.net/npm/flatpickr/dist/flatpickr.min.css",
    file: "libs/flatpickr/flatpickr.min.css",
  },

  // === noUiSlider ===
  {
    url: "https://cdnjs.cloudflare.com/ajax/libs/noUiSlider/15.7.0/nouislider.min.js",
    file: "libs/nouislider/nouislider.min.js",
  },
  {
    url: "https://cdnjs.cloudflare.com/ajax/libs/noUiSlider/15.7.0/nouislider.min.css",
    file: "libs/nouislider/nouislider.min.css",
  },

  // === wNumb ===
  {
    url: "https://cdnjs.cloudflare.com/ajax/libs/wnumb/1.2.0/wNumb.min.js",
    file: "libs/wnumb/wNumb.min.js",
  },

  // === Material Icons ===
  // Google Fonts don’t serve raw CSS easily, so we create one manually.
  {
    url: "https://fonts.googleapis.com/icon?family=Material+Icons",
    file: "libs/material-icons/material-icons.css",
  },
];

function downloadFile(url, file) {
  const dir = path.dirname(file);
  fs.mkdirSync(dir, { recursive: true });

  console.log(`⬇️ Downloading ${url}`);
  const fileStream = fs.createWriteStream(file);

  https
    .get(url, (res) => {
      if (res.statusCode === 302 && res.headers.location) {
        // handle redirects manually
        downloadFile(res.headers.location, file);
        return;
      }

      res.pipe(fileStream);
      fileStream.on("finish", () => {
        fileStream.close();
        console.log(`✅ Saved: ${file}`);
      });
    })
    .on("error", (err) => {
      console.error(`❌ Error downloading ${url}: ${err.message}`);
    });
}

// Run all downloads
for (const { url, file } of libs) {
  downloadFile(url, file);
}
