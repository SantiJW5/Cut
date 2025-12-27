const wInput = document.getElementById("w");
    const hInput = document.getElementById("h");
    const saveBtn = document.getElementById("saveBtn");
    const fileInput = document.getElementById("file");
    const downloadBtn = document.getElementById("downloadBtn");
    const cfgStatus = document.getElementById("cfgStatus");
    const imgStatus = document.getElementById("imgStatus");

    const originalCanvas = document.getElementById("originalCanvas");
    const cropCanvas = document.getElementById("cropCanvas");
    const octx = originalCanvas.getContext("2d");
    const cctx = cropCanvas.getContext("2d");

    let cfg = { w: 512, h: 512, saved: false };
    let loadedImage = null;

    function setCfgStatus(msg, ok = true) {
      cfgStatus.textContent = msg;
      cfgStatus.className = "status " + (ok ? "ok" : "bad");
    }

    function setImgStatus(msg, ok = true) {
      imgStatus.textContent = msg;
      imgStatus.className = "status " + (ok ? "ok" : "bad");
    }

    function clampInt(v, min) {
      const n = Number(v);
      if (!Number.isFinite(n)) return null;
      const i = Math.floor(n);
      return i >= min ? i : null;
    }

    function saveConfig() {
      const w = clampInt(wInput.value, 1);
      const h = clampInt(hInput.value, 1);

      if (!w || !h) {
        cfg.saved = false;
        setCfgStatus("Config inválida. Usa números mayores a 0.", false);
        downloadBtn.disabled = true;
        return;
      }

      cfg.w = w;
      cfg.h = h;
      cfg.saved = true;

      localStorage.setItem("crop_cfg", JSON.stringify({ w, h }));
      setCfgStatus(`Configuración guardada: ${w}px × ${h}px`, true);

      if (loadedImage) {
        renderAll();
      }
    }

    function loadConfigFromStorage() {
      try {
        const raw = localStorage.getItem("crop_cfg");
        if (!raw) return;
        const data = JSON.parse(raw);
        if (data && Number.isFinite(data.w) && Number.isFinite(data.h) && data.w > 0 && data.h > 0) {
          cfg.w = Math.floor(data.w);
          cfg.h = Math.floor(data.h);
          wInput.value = cfg.w;
          hInput.value = cfg.h;
          cfg.saved = true;
          setCfgStatus(`Configuración cargada: ${cfg.w}px × ${cfg.h}px`, true);
        }
      } catch (_) {}
    }

    function drawImageToFitCanvas(ctx, canvas, img) {
      const maxW = 1400;
      const maxH = 900;

      const scale = Math.min(maxW / img.width, maxH / img.height, 1);
      const cw = Math.max(1, Math.floor(img.width * scale));
      const ch = Math.max(1, Math.floor(img.height * scale));

      canvas.width = cw;
      canvas.height = ch;

      ctx.clearRect(0, 0, cw, ch);
      ctx.drawImage(img, 0, 0, cw, ch);
    }

    function cropCenterToCanvas(ctx, canvas, img, cropW, cropH) {
      const realW = img.width;
      const realH = img.height;

      const finalW = Math.min(cropW, realW);
      const finalH = Math.min(cropH, realH);

      const sx = Math.floor((realW - finalW) / 2);
      const sy = Math.floor((realH - finalH) / 2);

      canvas.width = finalW;
      canvas.height = finalH;

      ctx.clearRect(0, 0, finalW, finalH);
      ctx.drawImage(img, sx, sy, finalW, finalH, 0, 0, finalW, finalH);

      return { finalW, finalH };
    }

    function renderAll() {
      if (!loadedImage) return;

      drawImageToFitCanvas(octx, originalCanvas, loadedImage);

      if (!cfg.saved) {
        setImgStatus("Guarda la configuración (ancho/alto) para recortar.", false);
        downloadBtn.disabled = true;
        return;
      }

      const { finalW, finalH } = cropCenterToCanvas(cctx, cropCanvas, loadedImage, cfg.w, cfg.h);
      setImgStatus(`Recorte listo: ${finalW}px × ${finalH}px`, true);

      downloadBtn.disabled = false;
    }

    function handleFile(file) {
      if (!file) return;

      if (!file.type.startsWith("image/")) {
        loadedImage = null;
        downloadBtn.disabled = true;
        setImgStatus("El archivo no es una imagen.", false);
        return;
      }

      const img = new Image();
      img.onload = () => {
        loadedImage = img;
        setImgStatus(`Imagen cargada: ${img.width}px × ${img.height}px`, true);
        renderAll();
      };
      img.onerror = () => {
        loadedImage = null;
        downloadBtn.disabled = true;
        setImgStatus("No se pudo leer la imagen.", false);
      };

      const url = URL.createObjectURL(file);
      img.src = url;
    }

    function downloadJPG() {
      if (!loadedImage || !cfg.saved) return;

      cropCanvas.toBlob((blob) => {
        if (!blob) {
          setImgStatus("No se pudo generar el JPG.", false);
          return;
        }

        const a = document.createElement("a");
        const u = URL.createObjectURL(blob);
        a.href = u;
        a.download = `recorte_${cfg.w}x${cfg.h}.jpg`;
        document.body.appendChild(a);
        a.click();
        a.remove();

        setTimeout(() => URL.revokeObjectURL(u), 500);
      }, "image/jpeg", 0.92);
    }

    saveBtn.addEventListener("click", saveConfig);

    fileInput.addEventListener("change", (e) => {
      const file = e.target.files && e.target.files[0];
      handleFile(file);
    });

    downloadBtn.addEventListener("click", downloadJPG);

    loadConfigFromStorage();
    if (!cfg.saved) setCfgStatus("Config no guardada aún. Define ancho/alto y guarda.", false);